document.addEventListener('DOMContentLoaded', async () => {
  try {
    const [templates, logs, users] = await Promise.all([
      api.get('/templates'),
      api.get('/logs'),
      api.get('/users'),
    ]);

    const sent   = logs.filter(l => l.status === 'sent').length;
    const failed = logs.filter(l => l.status === 'failed').length;

    const CARDS = [
      { label: 'Emails Sent',   value: sent,             icon: 'mail',          color: 'var(--gold)' },
      { label: 'Templates',     value: templates.length, icon: 'file-text',      color: '#60a5fa' },
      { label: 'Total Users',   value: users.length,     icon: 'users',          color: '#a78bfa' },
      { label: 'Failed Emails', value: failed,           icon: 'alert-circle',   color: 'var(--danger)' },
    ];

    document.getElementById('stat-cards').innerHTML = CARDS.map(c => `
      <div class="card stat-card">
        <div class="stat-label">
          <i data-lucide="${c.icon}" style="width:15px;height:15px;color:${c.color}"></i>
          ${c.label}
        </div>
        <div class="stat-value">${c.value.toLocaleString()}</div>
      </div>`).join('');

    const rows = templates.length === 0
      ? `<tr><td colspan="3" class="empty-state">No templates yet.</td></tr>`
      : templates.map(t => `
          <tr>
            <td class="bold">${esc(t.title)}</td>
            <td>${esc(t.subject)}</td>
            <td class="text-muted">${fmtDate(t.created_at)}</td>
          </tr>`).join('');

    document.getElementById('templates-table-wrap').innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Subject</th><th>Created</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();

  } catch (err) {
    Toast.error(err.message);
  }
});

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
