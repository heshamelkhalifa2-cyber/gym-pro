// src/app.js
// Main application controller

// ============================================
// IMPORTS
// ============================================
import {
  SUPPORTED_LANGS, LANG_NAMES, LANG_FLAGS,
  setLanguage, t, getCurrentLang, isRTL, initI18n
} from './lib/i18n.js';

import {
  formatDate, formatTime, formatCurrency,
  calcEndDate, daysRemaining,
  showToast, showConfirm, shortId, todayStr
} from './lib/utils.js';

// ============================================
// SUPABASE SETUP
// ============================================
const SUPABASE_URL = window.ENV?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY || '';

let supabase = null;
let currentUser = null;
let allMembers = []; // cache

function initSupabase() {
  if (!SUPABASE_URL || SUPABASE_URL === '__SUPABASE_URL__') {
    console.warn('⚠️ Supabase not configured. Running in demo mode.');
    return null;
  }
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ============================================
// DEMO DATA (when Supabase not configured)
// ============================================
let demoMembers = [
  { id: 'demo-1', name: 'أحمد الراشدي', phone: '+966501234567', email: 'ahmed@example.com', subscription_type: 'monthly', subscription_start: '2025-05-01', subscription_end: '2025-06-01', status: 'active', notes: '' },
  { id: 'demo-2', name: 'محمد حسن', phone: '+966507654321', email: '', subscription_type: 'quarterly', subscription_start: '2025-03-01', subscription_end: '2025-06-01', status: 'active', notes: '' },
  { id: 'demo-3', name: 'Sara Reyes', phone: '+639171234567', email: 'sara@example.com', subscription_type: 'yearly', subscription_start: '2025-01-01', subscription_end: '2025-12-31', status: 'active', notes: '' },
  { id: 'demo-4', name: 'Raj Kumar', phone: '+919876543210', email: '', subscription_type: 'monthly', subscription_start: '2025-04-01', subscription_end: '2025-05-01', status: 'expired', notes: '' },
];
let demoPayments = [
  { id: 'p1', member_id: 'demo-1', amount: 150, payment_date: '2025-05-01', notes: 'اشتراك شهر مايو', members: { name: 'أحمد الراشدي', phone: '+966501234567' } },
  { id: 'p2', member_id: 'demo-2', amount: 400, payment_date: '2025-03-01', notes: 'اشتراك 3 شهور', members: { name: 'محمد حسن', phone: '+966507654321' } },
  { id: 'p3', member_id: 'demo-3', amount: 1200, payment_date: '2025-01-01', notes: 'Yearly subscription', members: { name: 'Sara Reyes', phone: '+639171234567' } },
];
let demoCheckins = [];

const DEMO_MODE = !SUPABASE_URL || SUPABASE_URL === '__SUPABASE_URL__';

// ============================================
// DATA LAYER (wraps Supabase OR demo)
// ============================================
async function dbGetMembers(filters = {}) {
  if (DEMO_MODE) {
    let result = [...demoMembers];
    if (filters.status && filters.status !== 'all') result = result.filter(m => m.status === filters.status);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(m => m.name.toLowerCase().includes(s) || m.phone.includes(s));
    }
    return result;
  }
  let q = supabase.from('members').select('*').order('created_at', { ascending: false });
  if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
  if (filters.search) q = q.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

async function dbCreateMember(data) {
  if (DEMO_MODE) {
    const newM = { ...data, id: 'demo-' + Date.now(), status: new Date(data.subscription_end) < new Date() ? 'expired' : 'active' };
    demoMembers.unshift(newM);
    return newM;
  }
  const { data: d, error } = await supabase.from('members').insert([data]).select().single();
  if (error) throw error;
  return d;
}

async function dbUpdateMember(id, data) {
  if (DEMO_MODE) {
    const idx = demoMembers.findIndex(m => m.id === id);
    if (idx === -1) throw new Error('Not found');
    const updated = { ...demoMembers[idx], ...data, status: new Date(data.subscription_end) < new Date() ? 'expired' : 'active' };
    demoMembers[idx] = updated;
    return updated;
  }
  const { data: d, error } = await supabase.from('members').update(data).eq('id', id).select().single();
  if (error) throw error;
  return d;
}

async function dbDeleteMember(id) {
  if (DEMO_MODE) {
    demoMembers = demoMembers.filter(m => m.id !== id);
    demoPayments = demoPayments.filter(p => p.member_id !== id);
    demoCheckins = demoCheckins.filter(c => c.member_id !== id);
    return;
  }
  const { error } = await supabase.from('members').delete().eq('id', id);
  if (error) throw error;
}

async function dbGetPayments() {
  if (DEMO_MODE) return [...demoPayments].sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
  const { data, error } = await supabase.from('payments').select('*, members(name, phone)').order('payment_date', { ascending: false });
  if (error) throw error;
  return data;
}

async function dbCreatePayment(data) {
  if (DEMO_MODE) {
    const member = demoMembers.find(m => m.id === data.member_id);
    const newP = { ...data, id: 'p' + Date.now(), members: { name: member?.name || '?', phone: member?.phone || '' } };
    demoPayments.unshift(newP);
    return newP;
  }
  const { data: d, error } = await supabase.from('payments').insert([data]).select().single();
  if (error) throw error;
  return d;
}

async function dbDeletePayment(id) {
  if (DEMO_MODE) { demoPayments = demoPayments.filter(p => p.id !== id); return; }
  const { error } = await supabase.from('payments').delete().eq('id', id);
  if (error) throw error;
}

async function dbGetTodayCheckins() {
  if (DEMO_MODE) {
    const today = todayStr();
    return demoCheckins.filter(c => c.date === today)
      .map(c => ({ ...c, members: { name: demoMembers.find(m => m.id === c.member_id)?.name || '?', phone: '' } }));
  }
  const today = todayStr();
  const { data, error } = await supabase.from('checkins').select('*, members(name, phone)').eq('date', today).order('checkin_time', { ascending: false });
  if (error) throw error;
  return data;
}

async function dbCheckin(memberId) {
  if (DEMO_MODE) {
    const today = todayStr();
    const alreadyIn = demoCheckins.find(c => c.member_id === memberId && c.date === today);
    if (alreadyIn) return { already: true };
    const newC = { id: 'c' + Date.now(), member_id: memberId, date: today, checkin_time: new Date().toISOString() };
    demoCheckins.unshift(newC);
    return { checkin: newC };
  }
  const today = todayStr();
  const { data: existing } = await supabase.from('checkins').select('id').eq('member_id', memberId).eq('date', today);
  if (existing && existing.length > 0) return { already: true };
  const { data, error } = await supabase.from('checkins').insert([{ member_id: memberId }]).select().single();
  if (error) throw error;
  return { checkin: data };
}

async function dbFindMember(query) {
  const q = query.trim();
  if (DEMO_MODE) {
    return demoMembers.find(m => m.phone === q || m.id === q || m.phone.replace(/\s/g,'') === q.replace(/\s/g,'')) || null;
  }
  const { data, error } = await supabase.from('members').select('*').or(`phone.eq.${q},id.eq.${q}`).single();
  if (error) return null;
  return data;
}

async function dbGetStats() {
  if (DEMO_MODE) {
    const today = todayStr();
    const in7Days = new Date(); in7Days.setDate(in7Days.getDate() + 7);
    const in7Str = in7Days.toISOString().split('T')[0];
    const totalRevenue = demoPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const expiringSoon = demoMembers.filter(m => m.status === 'active' && m.subscription_end >= today && m.subscription_end <= in7Str);
    const todayCount = demoCheckins.filter(c => c.date === today).length;
    return {
      totalMembers: demoMembers.length,
      activeMembers: demoMembers.filter(m => m.status === 'active').length,
      expiredMembers: demoMembers.filter(m => m.status === 'expired').length,
      totalRevenue,
      expiringSoon,
      todayCheckins: todayCount
    };
  }
  const today = todayStr();
  const in7Days = new Date(); in7Days.setDate(in7Days.getDate() + 7);
  const in7Str = in7Days.toISOString().split('T')[0];
  const [mRes, pRes, expRes, ciRes] = await Promise.all([
    supabase.from('members').select('id,status'),
    supabase.from('payments').select('amount'),
    supabase.from('members').select('id,name,phone,subscription_end').eq('status','active').gte('subscription_end', today).lte('subscription_end', in7Str),
    supabase.from('checkins').select('id').eq('date', today)
  ]);
  const members = mRes.data || [];
  const payments = pRes.data || [];
  return {
    totalMembers: members.length,
    activeMembers: members.filter(m => m.status === 'active').length,
    expiredMembers: members.filter(m => m.status === 'expired').length,
    totalRevenue: payments.reduce((s, p) => s + Number(p.amount || 0), 0),
    expiringSoon: expRes.data || [],
    todayCheckins: (ciRes.data || []).length
  };
}

// ============================================
// UI HELPERS
// ============================================
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
}

function subTypeLabel(type) {
  const map = { monthly: t('members.monthly'), quarterly: t('members.quarterly'), yearly: t('members.yearly') };
  return map[type] || type;
}

// ============================================
// DASHBOARD PAGE
// ============================================
async function loadDashboard() {
  try {
    const stats = await dbGetStats();

    document.getElementById('stat-total').textContent = stats.totalMembers;
    document.getElementById('stat-active').textContent = stats.activeMembers;
    document.getElementById('stat-expired').textContent = stats.expiredMembers;
    document.getElementById('stat-revenue').textContent = formatCurrency(stats.totalRevenue);
    document.getElementById('checkin-count-badge').textContent = stats.todayCheckins;

    // Expiring Soon
    const expiringEl = document.getElementById('expiring-soon-list');
    if (stats.expiringSoon.length === 0) {
      expiringEl.innerHTML = `<div class="empty-state" style="padding:2rem"><div class="empty-icon">🎉</div><div class="empty-title">لا توجد اشتراكات تنتهي قريباً</div></div>`;
    } else {
      expiringEl.innerHTML = stats.expiringSoon.map(m => {
        const days = daysRemaining(m.subscription_end);
        return `
          <div class="expiry-item">
            <div style="display:flex;align-items:center;gap:0.75rem">
              <div class="member-avatar" style="background:var(--warning-light);color:var(--warning);border-color:rgba(245,158,11,0.3)">${getInitials(m.name)}</div>
              <div>
                <div style="font-weight:600;font-size:0.9rem">${m.name}</div>
                <div style="font-size:0.75rem;color:var(--text-muted)">${m.phone}</div>
              </div>
            </div>
            <div class="badge badge-warning">${days} ${days === 1 ? 'يوم' : 'أيام'}</div>
          </div>`;
      }).join('');
    }

    // Today's Checkins
    const checkins = await dbGetTodayCheckins();
    const checkinsEl = document.getElementById('recent-checkins-list');
    if (checkins.length === 0) {
      checkinsEl.innerHTML = `<div class="empty-state" style="padding:2rem"><div class="empty-icon">🏃</div><div class="empty-title">${t('dashboard.no_checkins')}</div></div>`;
    } else {
      checkinsEl.innerHTML = checkins.slice(0, 8).map(c => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.65rem 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:0.75rem">
            <div class="member-avatar">${getInitials(c.members?.name)}</div>
            <div>
              <div style="font-weight:600;font-size:0.875rem">${c.members?.name || '?'}</div>
              <div style="font-size:0.72rem;color:var(--text-muted)">${c.members?.phone || ''}</div>
            </div>
          </div>
          <div style="font-family:var(--font-mono);font-size:0.8rem;color:var(--text-muted)">${formatTime(c.checkin_time)}</div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Dashboard error:', err);
    showToast('خطأ في تحميل البيانات', 'error');
  }
}

// ============================================
// MEMBERS PAGE
// ============================================
async function loadMembers() {
  const search = document.getElementById('member-search').value;
  const status = document.getElementById('member-filter').value;
  const tbody = document.getElementById('members-tbody');
  tbody.innerHTML = '<tr><td colspan="6"><div class="loading-center"><div class="spinner"></div></div></td></tr>';

  try {
    const members = await dbGetMembers({ search, status });
    allMembers = await dbGetMembers({});

    if (members.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">${t('members.no_members')}</div></div></td></tr>`;
      return;
    }

    tbody.innerHTML = members.map(m => {
      const days = daysRemaining(m.subscription_end);
      const isExpired = m.status === 'expired';
      const isExpiringSoon = !isExpired && days <= 7;
      return `
        <tr>
          <td>
            <div class="member-cell">
              <div class="member-avatar">${getInitials(m.name)}</div>
              <div>
                <div class="member-name">${m.name}</div>
                <div class="member-id">${shortId(m.id)}</div>
              </div>
            </div>
          </td>
          <td><span class="mono">${m.phone}</span></td>
          <td><span class="badge badge-info">${subTypeLabel(m.subscription_type)}</span></td>
          <td>
            <div style="display:flex;align-items:center;gap:0.5rem">
              <span>${formatDate(m.subscription_end)}</span>
              ${isExpiringSoon ? `<span class="badge badge-warning">${days}d</span>` : ''}
            </div>
          </td>
          <td>
            <span class="badge ${isExpired ? 'badge-danger' : 'badge-success'}">
              ${isExpired ? t('members.expired') : t('members.active')}
            </span>
          </td>
          <td>
            <div style="display:flex;gap:0.5rem">
              <button class="btn btn-sm btn-secondary edit-member-btn" data-id="${m.id}" title="تعديل">✏️</button>
              <button class="btn btn-sm btn-danger delete-member-btn" data-id="${m.id}" title="حذف">🗑️</button>
            </div>
          </td>
        </tr>`;
    }).join('');

    // Bind edit/delete
    document.querySelectorAll('.edit-member-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditMember(btn.dataset.id));
    });
    document.querySelectorAll('.delete-member-btn').forEach(btn => {
      btn.addEventListener('click', () => confirmDeleteMember(btn.dataset.id));
    });

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-title">خطأ في تحميل البيانات</div></div></td></tr>`;
  }
}

function openAddMember() {
  document.getElementById('member-id').value = '';
  document.getElementById('member-name').value = '';
  document.getElementById('member-phone').value = '';
  document.getElementById('member-email').value = '';
  document.getElementById('member-sub-type').value = 'monthly';
  document.getElementById('member-start-date').value = todayStr();
  document.getElementById('member-end-date').value = calcEndDate(todayStr(), 'monthly');
  document.getElementById('member-notes').value = '';
  document.getElementById('member-modal-title').textContent = t('members.add_member');
  openModal('member-modal');
}

function openEditMember(id) {
  const member = allMembers.find(m => m.id === id);
  if (!member) return;
  document.getElementById('member-id').value = member.id;
  document.getElementById('member-name').value = member.name;
  document.getElementById('member-phone').value = member.phone;
  document.getElementById('member-email').value = member.email || '';
  document.getElementById('member-sub-type').value = member.subscription_type;
  document.getElementById('member-start-date').value = member.subscription_start;
  document.getElementById('member-end-date').value = member.subscription_end;
  document.getElementById('member-notes').value = member.notes || '';
  document.getElementById('member-modal-title').textContent = t('members.edit_member');
  openModal('member-modal');
}

async function saveMember() {
  const id = document.getElementById('member-id').value;
  const name = document.getElementById('member-name').value.trim();
  const phone = document.getElementById('member-phone').value.trim();
  const email = document.getElementById('member-email').value.trim();
  const subType = document.getElementById('member-sub-type').value;
  const startDate = document.getElementById('member-start-date').value;
  const endDate = document.getElementById('member-end-date').value;
  const notes = document.getElementById('member-notes').value.trim();

  if (!name || !phone || !startDate) {
    showToast('يرجى ملء الحقول المطلوبة', 'error');
    return;
  }

  const saveBtn = document.getElementById('save-member-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = t('common.loading');

  try {
    const data = { name, phone, email, subscription_type: subType, subscription_start: startDate, subscription_end: endDate, notes };
    if (id) {
      await dbUpdateMember(id, data);
      showToast('تم تحديث العضو بنجاح ✅');
    } else {
      await dbCreateMember(data);
      showToast('تم إضافة العضو بنجاح ✅');
    }
    closeModal('member-modal');
    loadMembers();
  } catch (err) {
    showToast('خطأ: ' + (err.message || 'فشل الحفظ'), 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = t('common.save');
  }
}

async function confirmDeleteMember(id) {
  const confirmed = await showConfirm(t('members.confirm_delete'));
  if (!confirmed) return;
  try {
    await dbDeleteMember(id);
    showToast('تم حذف العضو');
    loadMembers();
  } catch (err) {
    showToast('خطأ في الحذف', 'error');
  }
}

// ============================================
// CHECK-IN PAGE
// ============================================
async function loadCheckinPage() {
  await refreshTodayCheckins();
}

async function refreshTodayCheckins() {
  const checkins = await dbGetTodayCheckins();
  document.getElementById('today-count').textContent = checkins.length;

  const list = document.getElementById('today-checkins-list');
  if (checkins.length === 0) {
    list.innerHTML = `<div class="empty-state" style="padding:2rem"><div class="empty-icon">🏃</div><div class="empty-title">${t('dashboard.no_checkins')}</div></div>`;
    return;
  }
  list.innerHTML = checkins.map((c, i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0.65rem 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:0.75rem">
        <div style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-muted);width:24px">${i + 1}</div>
        <div class="member-avatar">${getInitials(c.members?.name)}</div>
        <div>
          <div style="font-weight:600;font-size:0.875rem">${c.members?.name || '?'}</div>
          <div style="font-size:0.72rem;color:var(--text-muted)">${c.members?.phone || ''}</div>
        </div>
      </div>
      <div style="font-family:var(--font-mono);font-size:0.8rem;color:var(--text-secondary)">${formatTime(c.checkin_time)}</div>
    </div>
  `).join('');
}

async function performCheckin() {
  const query = document.getElementById('checkin-search').value.trim();
  if (!query) { showToast('أدخل رقم الهاتف أو ID', 'error'); return; }

  const btn = document.getElementById('checkin-btn');
  btn.disabled = true;

  const resultEl = document.getElementById('checkin-result');
  const statusEl = document.getElementById('checkin-status-msg');

  try {
    const member = await dbFindMember(query);

    if (!member) {
      resultEl.classList.add('visible');
      document.getElementById('checkin-avatar').textContent = '?';
      document.getElementById('checkin-name').textContent = t('checkin.member_not_found');
      document.getElementById('checkin-phone').textContent = '';
      statusEl.innerHTML = `<span style="color:var(--danger)">❌ ${t('checkin.member_not_found')}</span>`;
      showToast(t('checkin.member_not_found'), 'error');
      return;
    }

    // Show member info
    document.getElementById('checkin-avatar').textContent = getInitials(member.name);
    document.getElementById('checkin-name').textContent = member.name;
    document.getElementById('checkin-phone').textContent = member.phone;
    resultEl.classList.add('visible');

    // Warn if expired
    if (member.status === 'expired') {
      statusEl.innerHTML = `<span style="color:var(--warning)">⚠️ ${t('checkin.expired_warning')}</span>`;
    }

    const result = await dbCheckin(member.id);

    if (result.already) {
      statusEl.innerHTML = `<span style="color:var(--info)">ℹ️ ${t('checkin.already_checked')}</span>`;
      showToast(t('checkin.already_checked'), 'info');
    } else {
      statusEl.innerHTML = `<span style="color:var(--success)">✅ ${t('checkin.checkin_success')} — ${formatTime(new Date().toISOString())}</span>`;
      showToast(t('checkin.checkin_success'));
      await refreshTodayCheckins();
    }

    document.getElementById('checkin-search').value = '';
  } catch (err) {
    showToast('خطأ: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

// ============================================
// PAYMENTS PAGE
// ============================================
async function loadPayments() {
  const search = document.getElementById('payment-search').value.toLowerCase();
  const tbody = document.getElementById('payments-tbody');
  tbody.innerHTML = '<tr><td colspan="5"><div class="loading-center"><div class="spinner"></div></div></td></tr>';

  try {
    let payments = await dbGetPayments();
    if (search) {
      payments = payments.filter(p =>
        p.members?.name?.toLowerCase().includes(search) ||
        (p.notes || '').toLowerCase().includes(search)
      );
    }

    const total = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    document.getElementById('payments-total').textContent = formatCurrency(total);

    if (payments.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">💰</div><div class="empty-title">${t('payments.no_payments')}</div></div></td></tr>`;
      return;
    }

    tbody.innerHTML = payments.map(p => `
      <tr>
        <td>
          <div class="member-cell">
            <div class="member-avatar">${getInitials(p.members?.name)}</div>
            <div>
              <div class="member-name">${p.members?.name || '?'}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${p.members?.phone || ''}</div>
            </div>
          </div>
        </td>
        <td><span class="mono" style="color:var(--success);font-weight:700">${formatCurrency(p.amount)}</span></td>
        <td>${formatDate(p.payment_date)}</td>
        <td style="color:var(--text-secondary)">${p.notes || '-'}</td>
        <td>
          <button class="btn btn-sm btn-danger delete-payment-btn" data-id="${p.id}" title="حذف">🗑️</button>
        </td>
      </tr>
    `).join('');

    document.querySelectorAll('.delete-payment-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const confirmed = await showConfirm('هل تريد حذف هذه الدفعة؟');
        if (!confirmed) return;
        try {
          await dbDeletePayment(btn.dataset.id);
          showToast('تم حذف الدفعة');
          loadPayments();
        } catch (e) {
          showToast('خطأ في الحذف', 'error');
        }
      });
    });

  } catch (err) {
    console.error(err);
  }
}

async function openAddPayment() {
  // Load members into select
  const members = await dbGetMembers({});
  allMembers = members;
  const sel = document.getElementById('payment-member-id');
  sel.innerHTML = '<option value="">-- اختر عضو --</option>' +
    members.map(m => `<option value="${m.id}">${m.name} (${m.phone})</option>`).join('');
  document.getElementById('payment-amount').value = '';
  document.getElementById('payment-date').value = todayStr();
  document.getElementById('payment-notes').value = '';
  openModal('payment-modal');
}

async function savePayment() {
  const memberId = document.getElementById('payment-member-id').value;
  const amount = document.getElementById('payment-amount').value;
  const date = document.getElementById('payment-date').value;
  const notes = document.getElementById('payment-notes').value.trim();

  if (!memberId || !amount || !date) {
    showToast('يرجى ملء الحقول المطلوبة', 'error');
    return;
  }

  const btn = document.getElementById('save-payment-btn');
  btn.disabled = true;

  try {
    await dbCreatePayment({ member_id: memberId, amount: parseFloat(amount), payment_date: date, notes });
    showToast('تم تسجيل الدفعة ✅');
    closeModal('payment-modal');
    loadPayments();
  } catch (err) {
    showToast('خطأ: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

// ============================================
// ROUTING
// ============================================
const PAGE_TITLES = {
  dashboard: 'nav.dashboard',
  members: 'nav.members',
  checkin: 'nav.checkin',
  payments: 'nav.payments'
};

function navigateTo(page) {
  // Update nav items
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // Update pages
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  // Update header title
  document.getElementById('header-title').textContent = t(PAGE_TITLES[page] || page);

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('visible');

  // Load page data
  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'members': loadMembers(); break;
    case 'checkin': loadCheckinPage(); break;
    case 'payments': loadPayments(); break;
  }
}

// ============================================
// AUTH
// ============================================
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  errorEl.style.display = 'none';

  if (!email || !password) {
    errorEl.textContent = 'يرجى ملء جميع الحقول';
    errorEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = t('auth.logging_in');

  try {
    if (DEMO_MODE) {
      // Demo login - accept any credentials
      currentUser = { email };
      showApp(email);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    currentUser = data.user;
    showApp(data.user.email);
  } catch (err) {
    errorEl.textContent = 'بيانات الدخول غير صحيحة';
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = t('auth.login_btn');
  }
}

function showApp(email) {
  document.getElementById('login-page').classList.remove('active');
  document.getElementById('app').style.display = 'flex';
  document.getElementById('user-email').textContent = email || 'admin';
  navigateTo('dashboard');
}

async function handleLogout() {
  try {
    if (!DEMO_MODE) await supabase.auth.signOut();
  } catch (e) {}
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-page').classList.add('active');
  currentUser = null;
}

// ============================================
// LANGUAGE SYSTEM
// ============================================
const LANG_DATA = {
  ar: { flag: '🇸🇦', name: 'العربية' },
  en: { flag: '🇺🇸', name: 'English' },
  tl: { flag: '🇵🇭', name: 'Tagalog' },
  hi: { flag: '🇮🇳', name: 'हिंदी' }
};

async function changeLang(lang) {
  await setLanguage(lang);
  updateLangUI(lang);
  applyTranslations();
  // Reload current page
  const activePage = document.querySelector('.nav-item.active[data-page]')?.dataset?.page || 'dashboard';
  navigateTo(activePage);
}

function updateLangUI(lang) {
  const data = LANG_DATA[lang];
  document.getElementById('current-lang-flag').textContent = data.flag;
  document.getElementById('current-lang-name').textContent = data.name;

  document.querySelectorAll('.lang-option').forEach(el => {
    el.classList.toggle('current', el.dataset.lang === lang);
  });
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
}

// ============================================
// AUTO-CALC END DATE
// ============================================
function setupEndDateCalc() {
  const startInput = document.getElementById('member-start-date');
  const typeInput = document.getElementById('member-sub-type');
  const endInput = document.getElementById('member-end-date');

  function update() {
    if (startInput.value && typeInput.value) {
      endInput.value = calcEndDate(startInput.value, typeInput.value);
    }
  }

  startInput.addEventListener('change', update);
  typeInput.addEventListener('change', update);
}

// ============================================
// DEMO MODE BANNER
// ============================================
function showDemoBanner() {
  if (!DEMO_MODE) return;
  const banner = document.createElement('div');
  banner.style.cssText = `
    position:fixed; top:0; left:0; right:0; z-index:9999;
    background:linear-gradient(135deg, #FF6B35, #E55A25);
    color:white; text-align:center; padding:0.5rem;
    font-size:0.8rem; font-weight:600; letter-spacing:0.02em;
  `;
  banner.textContent = '🎮 وضع التجريب — لا يوجد Supabase مكوّن — البيانات مؤقتة فقط';
  document.body.appendChild(banner);
  document.body.style.paddingTop = '36px';
}

// ============================================
// INIT
// ============================================
async function init() {
  // Init Supabase
  supabase = initSupabase();

  // Init i18n
  await initI18n();
  applyTranslations();

  const lang = getCurrentLang();
  updateLangUI(lang);

  // Check session
  if (!DEMO_MODE && supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      currentUser = session.user;
      showApp(session.user.email);
    }
  }

  showDemoBanner();
  setupEndDateCalc();
  bindEvents();
}

function bindEvents() {
  // Login
  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // Nav
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.page));
  });

  // Mobile menu
  document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('visible');
  });
  document.getElementById('sidebar-overlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('visible');
  });

  // Language
  document.getElementById('lang-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('lang-dropdown').classList.toggle('open');
  });
  document.querySelectorAll('.lang-option').forEach(el => {
    el.addEventListener('click', () => {
      document.getElementById('lang-dropdown').classList.remove('open');
      changeLang(el.dataset.lang);
    });
  });
  document.addEventListener('click', () => {
    document.getElementById('lang-dropdown').classList.remove('open');
  });

  // Members
  document.getElementById('add-member-btn').addEventListener('click', openAddMember);
  document.getElementById('save-member-btn').addEventListener('click', saveMember);
  document.getElementById('member-search').addEventListener('input', loadMembers);
  document.getElementById('member-filter').addEventListener('change', loadMembers);

  // Payments
  document.getElementById('add-payment-btn').addEventListener('click', openAddPayment);
  document.getElementById('save-payment-btn').addEventListener('click', savePayment);
  document.getElementById('payment-search').addEventListener('input', loadPayments);

  // Check-in
  document.getElementById('checkin-btn').addEventListener('click', performCheckin);
  document.getElementById('checkin-search').addEventListener('keydown', e => {
    if (e.key === 'Enter') performCheckin();
  });

  // Modal close buttons
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });
}

// Start app
init();
