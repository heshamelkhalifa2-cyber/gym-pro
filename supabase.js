// src/lib/supabase.js
// Supabase client initialization

const SUPABASE_URL = window.ENV?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY || '';

// Initialize Supabase client
// Using the CDN version loaded in index.html
let supabase;

function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase credentials missing. Check your .env configuration.');
    return null;
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabase;
}

// ============================================
// AUTH
// ============================================
async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ============================================
// MEMBERS
// ============================================
async function getMembers(filters = {}) {
  let query = supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function getMemberById(id) {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

async function getMemberByPhone(phone) {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('phone', phone)
    .single();
  if (error) return null;
  return data;
}

async function createMember(memberData) {
  const { data, error } = await supabase
    .from('members')
    .insert([memberData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateMember(id, memberData) {
  const { data, error } = await supabase
    .from('members')
    .update(memberData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteMember(id) {
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ============================================
// PAYMENTS
// ============================================
async function getPayments(memberId = null) {
  let query = supabase
    .from('payments')
    .select(`*, members(name, phone)`)
    .order('payment_date', { ascending: false });

  if (memberId) {
    query = query.eq('member_id', memberId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function createPayment(paymentData) {
  const { data, error } = await supabase
    .from('payments')
    .insert([paymentData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deletePayment(id) {
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ============================================
// CHECKINS
// ============================================
async function getTodayCheckins() {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('checkins')
    .select(`*, members(name, phone)`)
    .eq('date', today)
    .order('checkin_time', { ascending: false });
  if (error) throw error;
  return data;
}

async function checkIfCheckedInToday(memberId) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('checkins')
    .select('id')
    .eq('member_id', memberId)
    .eq('date', today);
  if (error) throw error;
  return data && data.length > 0;
}

async function createCheckin(memberId) {
  const { data, error } = await supabase
    .from('checkins')
    .insert([{ member_id: memberId }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// DASHBOARD STATS
// ============================================
async function getDashboardStats() {
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
  const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0];

  const [membersRes, paymentsRes, expiringSoonRes, todayCheckinsRes] = await Promise.all([
    supabase.from('members').select('id, status'),
    supabase.from('payments').select('amount'),
    supabase.from('members').select('id, name, phone, subscription_end')
      .gte('subscription_end', today)
      .lte('subscription_end', sevenDaysStr)
      .eq('status', 'active'),
    supabase.from('checkins').select('id').eq('date', today)
  ]);

  const members = membersRes.data || [];
  const payments = paymentsRes.data || [];
  const expiringSoon = expiringSoonRes.data || [];
  const todayCheckins = todayCheckinsRes.data || [];

  return {
    totalMembers: members.length,
    activeMembers: members.filter(m => m.status === 'active').length,
    expiredMembers: members.filter(m => m.status === 'expired').length,
    totalRevenue: payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
    expiringSoon,
    todayCheckins: todayCheckins.length
  };
}

export {
  initSupabase,
  signIn, signOut, getSession,
  getMembers, getMemberById, getMemberByPhone, createMember, updateMember, deleteMember,
  getPayments, createPayment, deletePayment,
  getTodayCheckins, checkIfCheckedInToday, createCheckin,
  getDashboardStats
};
