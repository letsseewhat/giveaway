'use strict';
const API_BASE = (window.CAMPAIGN_API_URL || '').replace(/\/$/, '');
const loginPanel = document.querySelector('#admin-login-panel');
const dashboard = document.querySelector('#admin-dashboard');
const loginForm = document.querySelector('#admin-login-form');
const loginMessage = document.querySelector('#login-message');
const searchInput = document.querySelector('#entry-search');
const statusFilter = document.querySelector('#status-filter');
const entriesBody = document.querySelector('#entries-body');
const emptyState = document.querySelector('#empty-state');
let entries = [];

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include', ...options,
    headers: { 'X-Requested-With': 'XMLHttpRequest', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'リクエストに失敗しました。');
  return data;
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function render() {
  const query = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  const filtered = entries.filter((entry) =>
    (!query || `${entry.id} ${entry.name} ${entry.email}`.toLowerCase().includes(query)) &&
    (status === 'all' || entry.status === status));
  entriesBody.innerHTML = filtered.map((entry) => `<tr>
    <td><strong>${escapeHtml(entry.id)}</strong></td><td>${escapeHtml(entry.name)}</td>
    <td>${escapeHtml(entry.email)}</td><td>${escapeHtml(entry.prizeLabel)}</td>
    <td><select class="entry-status-select" data-id="${escapeHtml(entry.id)}" aria-label="${escapeHtml(entry.id)} のステータス">
      ${['確認中', '当選', '対象外'].map((value) => `<option ${entry.status === value ? 'selected' : ''}>${value}</option>`).join('')}
    </select></td></tr>`).join('');
  document.querySelector('#total-entries').textContent = entries.length;
  document.querySelector('#pending-entries').textContent = entries.filter((entry) => entry.status === '確認中').length;
  document.querySelector('#selected-entries').textContent = entries.filter((entry) => entry.status === '当選').length;
  document.querySelector('#rejected-entries').textContent = entries.filter((entry) => entry.status === '対象外').length;
  document.querySelector('#total-badge').textContent = entries.length;
  emptyState.hidden = filtered.length !== 0;
}
async function loadEntries() {
  const result = await api('/api/admin/entries');
  entries = result.entries;
  render();
  loginPanel.hidden = true;
  dashboard.hidden = false;
}
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginMessage.textContent = '';
  const form = new FormData(loginForm);
  const button = loginForm.querySelector('button');
  button.disabled = true;
  try {
    await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ username: form.get('username'), password: form.get('password') }) });
    await loadEntries();
  } catch (error) { loginMessage.textContent = error.message; }
  finally { button.disabled = false; }
});
searchInput.addEventListener('input', render);
statusFilter.addEventListener('change', render);
entriesBody.addEventListener('change', async (event) => {
  const select = event.target.closest('.entry-status-select');
  if (!select) return;
  try {
    await api(`/api/admin/entries/${encodeURIComponent(select.dataset.id)}`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) });
    const entry = entries.find((item) => item.id === select.dataset.id);
    if (entry) entry.status = select.value;
    render();
  } catch (error) { window.alert(error.message); }
});
document.querySelector('#admin-logout').addEventListener('click', async () => {
  try { await api('/api/admin/logout', { method: 'POST' }); } finally {
    dashboard.hidden = true;
    loginPanel.hidden = false;
    loginForm.reset();
  }
});

loadEntries().catch((error) => {
  if (error.message !== 'Authentication required.') loginMessage.textContent = error.message;
});
