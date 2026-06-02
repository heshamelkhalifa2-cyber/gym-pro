// src/lib/utils.js
// Utility functions

// Format date for display
function formatDate(dateStr, lang = 'en') {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date)) return '-';
  return date.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

// Format time
function formatTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// Format currency
function formatCurrency(amount, currency = 'SAR') {
  return `${Number(amount || 0).toFixed(2)} ${currency}`;
}

// Calculate subscription end date
function calcEndDate(startDate, type) {
  const start = new Date(startDate);
  const end = new Date(start);
  switch (type) {
    case 'monthly':   end.setMonth(end.getMonth() + 1); break;
    case 'quarterly': end.setMonth(end.getMonth() + 3); break;
    case 'yearly':    end.setFullYear(end.getFullYear() + 1); break;
  }
  return end.toISOString().split('T')[0];
}

// Days remaining
function daysRemaining(endDate) {
  const end = new Date(endDate);
  const now = new Date();
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff;
}

// Show toast notification
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Show confirm dialog
function showConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="modal confirm-modal">
        <div class="modal-body" style="text-align:center">
          <div style="font-size:2.5rem;margin-bottom:1rem">⚠️</div>
          <p style="font-size:1.1rem;margin-bottom:1.5rem">${message}</p>
          <div style="display:flex;gap:1rem;justify-content:center">
            <button class="btn btn-danger confirm-yes">حذف</button>
            <button class="btn btn-secondary confirm-no">إلغاء</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('.confirm-yes').onclick = () => { overlay.remove(); resolve(true); };
    overlay.querySelector('.confirm-no').onclick = () => { overlay.remove(); resolve(false); };
    overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } };
  });
}

// Truncate text
function truncate(str, n = 30) {
  return str && str.length > n ? str.substring(0, n) + '...' : str;
}

// Today's date string
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// Generate short member ID display
function shortId(uuid) {
  return uuid ? '#' + uuid.split('-')[0].toUpperCase() : '';
}

export {
  formatDate, formatTime, formatCurrency,
  calcEndDate, daysRemaining,
  showToast, showConfirm,
  truncate, todayStr, shortId
};
