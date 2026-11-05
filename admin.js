const storageKey = 'drive-your-dream-entries';
const searchInput = document.querySelector('#entry-search');
const statusFilter = document.querySelector('#status-filter');
const entriesBody = document.querySelector('#entries-body');
const emptyState = document.querySelector('#empty-state');
const totalBadge = document.querySelector('#total-badge');

function getEntries() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || '[]');
  } catch (error) {
    return [];
  }
}

function prizeLabel(value) {
  const labels = {
    suv: 'プレミアム SUV',
    truck: '大型トラック',
    coupe: 'ラグジュアリークーペ'
  };
  return labels[value] || value || '未設定';
}

function renderEntries() {
  const entries = getEntries();
  const filtered = entries.filter((entry) => {
    const query = (searchInput ? searchInput.value.trim().toLowerCase() : '');
    const status = statusFilter ? statusFilter.value : 'all';
    const matchesQuery = !query || (entry.id || '').toLowerCase().includes(query) || (entry.name || '').toLowerCase().includes(query);
    const matchesStatus = status === 'all' || entry.status === status;
    return matchesQuery && matchesStatus;
  });

  if (!entriesBody) return;
  entriesBody.innerHTML = filtered.map((entry) => `
    <tr data-status="${entry.status}">
      <td><strong>${entry.id}</strong></td>
      <td>${entry.name || '未入力'}</td>
      <td>${entry.email || '未入力'}</td>
      <td>${prizeLabel(entry.prize)}</td>
      <td><span class="entry-status ${entry.status === '当選' ? 'selected' : entry.status === '対象外' ? 'rejected' : 'pending'}">${entry.status}</span></td>
    </tr>
  `).join('');

  document.getElementById('total-entries').textContent = String(entries.length);
  document.getElementById('pending-entries').textContent = String(entries.filter((entry) => entry.status === '確認中').length);
  document.getElementById('selected-entries').textContent = String(entries.filter((entry) => entry.status === '当選').length);
  document.getElementById('rejected-entries').textContent = String(entries.filter((entry) => entry.status === '対象外').length);
  if (totalBadge) totalBadge.textContent = String(entries.length);
  if (emptyState) emptyState.hidden = filtered.length > 0;
}

if (searchInput) searchInput.addEventListener('input', renderEntries);
if (statusFilter) statusFilter.addEventListener('change', renderEntries);
renderEntries();
