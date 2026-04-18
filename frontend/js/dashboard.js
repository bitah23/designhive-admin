document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 4.2 Parallel fetch
    const [templates, logs, users] = await Promise.all([
      api.get('/templates'),
      api.get('/logs'),
      api.get('/users'),
    ]);

    const sent   = logs.filter(l => l.status === 'sent').length;
    const failed = logs.filter(l => l.status === 'failed').length;

    // 4.3 Stat cards
    const cards = [
      { label: 'Emails Sent',   value: sent,             icon: 'mail',      delta: '+2 this week',             deltaClass: 'delta-positive' },
      { label: 'Templates',     value: templates.length, icon: 'file-text', delta: '--',                        deltaClass: 'delta-neutral' },
      { label: 'Total Users',   value: users.length,     icon: 'users',     delta: '+1 this week',              deltaClass: 'delta-positive' },
      { label: 'Failed Emails', value: failed,           icon: 'x-circle',  delta: failed > 0 ? `${failed} need review` : '--', deltaClass: failed > 0 ? 'delta-negative' : 'delta-neutral' },
    ];

    document.getElementById('stat-cards').innerHTML = cards.map(card => `
      <div class="card stat-card dashboard-stat-card">
        <div class="stat-icon-wrap">
          <div class="stat-icon-circle">
            <i data-lucide="${card.icon}" style="width:18px;height:18px"></i>
          </div>
        </div>
        <div class="stat-label">${card.label}</div>
        <div class="stat-value ${card.label === 'Failed Emails' && card.value > 0 ? 'stat-value-danger' : ''}">${card.value.toLocaleString()}</div>
        <div class="stat-delta ${card.deltaClass}">${card.delta}</div>
      </div>`).join('');

    // 4.4 Templates table
    const tableHTML = templates.length === 0
      ? `<div class="dashboard-empty-state">
          <div class="dashboard-empty-icon"><i data-lucide="file-text" style="width:28px;height:28px"></i></div>
          <p style="color:var(--text-muted);margin-bottom:16px">No templates yet. Create your first template.</p>
          <a href="/templates.html" class="btn btn-outline">Create Template</a>
        </div>`
      : `<div class="table-wrap">
          <table class="dashboard-table">
            <thead>
              <tr>
                <th>NAME</th>
                <th>SUBJECT</th>
                <th>CREATED</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              ${templates.map(t => `
                <tr>
                  <td class="bold">${esc(t.title)}</td>
                  <td>${esc(t.subject)}</td>
                  <td class="text-muted">${fmtDate(t.created_at)}</td>
                  <td><a href="/campaign.html" class="btn btn-ghost btn-sm">Use in Campaign</a></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;

    document.getElementById('templates-table-wrap').innerHTML = tableHTML;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (err) {
    Toast.error(err.response?.data?.detail || err.message || 'Failed to load dashboard');
  }
});

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
