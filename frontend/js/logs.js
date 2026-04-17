let allLogs = [];

document.addEventListener('DOMContentLoaded', () => fetchLogs(false));

async function fetchLogs(showRefresh = false) {
  if (showRefresh) {
    const icon = document.getElementById('refresh-icon');
    if (icon) { icon.style.animation = 'spin 0.7s linear infinite'; }
    document.getElementById('refresh-btn').disabled = true;
  }

  try {
    allLogs = await api.get('/logs');
    document.getElementById('sent-count').textContent   = allLogs.filter(l => l.status === 'sent').length;
    document.getElementById('failed-count').textContent = allLogs.filter(l => l.status === 'failed').length;
    applyFilters();
  } catch (err) {
    Toast.error(err.message);
  } finally {
    if (showRefresh) {
      const icon = document.getElementById('refresh-icon');
      if (icon) { icon.style.animation = ''; }
      document.getElementById('refresh-btn').disabled = false;
    }
  }
}

function applyFilters() {
  const status = document.getElementById('status-filter').value;
  const date   = document.getElementById('date-filter').value;

  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  const filtered = allLogs.filter(l => {
    if (status !== 'all' && l.status !== status) return false;
    if (date === 'today') return new Date(l.timestamp) >= today;
    if (date === 'yesterday') { const d = new Date(l.timestamp); return d >= yesterday && d < today; }
    return true;
  });

  renderTable(filtered);
}

function renderTable(logs) {
  const rows = logs.length === 0
    ? `<tr><td colspan="5" class="empty-state">No logs match your filters.</td></tr>`
    : logs.map(l => `
        <tr>
          <td class="bold" style="padding-left:20px">${esc(l.user_email)}</td>
          <td class="text-sub">${esc(l.email_templates?.title || '—')}</td>
          <td><span class="badge ${l.status === 'sent' ? 'badge-gold' : 'badge-red'}">${l.status.toUpperCase()}</span></td>
          <td class="text-muted" style="white-space:nowrap">${fmt(l.timestamp)}</td>
          <td style="color:var(--danger);font-size:0.75rem;max-width:180px">
            <span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.error_message || '—')}</span>
          </td>
        </tr>`).join('');

  document.getElementById('logs-card').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="padding-left:20px">Email</th>
            <th>Template</th>
            <th>Status</th>
            <th>Time</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function fmt(ts) {
  return new Date(ts).toLocaleString('en-AU', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
