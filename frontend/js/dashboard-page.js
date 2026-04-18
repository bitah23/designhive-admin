document.addEventListener('DOMContentLoaded', loadDashboard);

async function loadDashboard() {
  try {
    const [templates, logs, users] = await Promise.all([
      api.get('/templates'),
      api.get('/logs'),
      api.get('/users')
    ]);

    const sent = logs.filter(item => item.status === 'sent').length;
    const failed = logs.filter(item => item.status === 'failed').length;

    renderStatCards([
      { label: 'Emails Sent', value: sent, icon: 'mail', delta: sent ? `+${sent} lifetime` : '--', deltaClass: sent ? 'delta-positive' : 'delta-neutral' },
      { label: 'Failed Emails', value: failed, icon: 'x-circle', delta: failed ? `${failed} need review` : '--', deltaClass: failed ? 'delta-negative' : 'delta-neutral', danger: failed > 0 },
      { label: 'Templates', value: templates.length, icon: 'file-text', delta: templates.length ? `${templates.length} ready` : '--', deltaClass: templates.length ? 'delta-positive' : 'delta-neutral' },
      { label: 'Total Users', value: users.length, icon: 'users', delta: users.length ? `${users.length} audience size` : '--', deltaClass: users.length ? 'delta-positive' : 'delta-neutral' }
    ]);

    renderTemplateTable(templates);
  } catch (error) {
    Toast.error(error.response?.data?.detail || error.message || 'Failed to load dashboard.');
  }
}

function renderStatCards(cards) {
  document.getElementById('stat-cards').innerHTML = cards.map(card => `
    <div class="card dashboard-stat-card">
      <div class="stat-icon-circle">
        <i data-lucide="${card.icon}" style="width:18px;height:18px"></i>
      </div>
      <div class="stat-label">${escapeHtml(card.label)}</div>
      <div class="stat-value ${card.danger ? 'stat-value-danger' : ''}">${Number(card.value).toLocaleString()}</div>
      <div class="stat-delta ${card.deltaClass}">${escapeHtml(card.delta)}</div>
    </div>
  `).join('');

  redrawIcons();
}

function renderTemplateTable(templates) {
  const target = document.getElementById('templates-table-wrap');

  if (!templates.length) {
    target.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i data-lucide="file-text" style="width:24px;height:24px"></i></div>
        <h3 style="margin:0 0 8px;color:var(--text-primary)">No templates yet.</h3>
        <p style="margin:0 0 16px;color:var(--text-muted)">Create your first template.</p>
        <a href="/templates.html" class="btn btn-outline">Create Template</a>
      </div>
    `;
    redrawIcons();
    return;
  }

  target.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>NAME</th>
            <th>SUBJECT</th>
            <th>CREATED</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          ${templates.map(template => `
            <tr>
              <td class="bold">${escapeHtml(template.title)}</td>
              <td>${escapeHtml(template.subject)}</td>
              <td class="text-muted">${formatDate(template.created_at)}</td>
              <td><a href="/campaign.html?template=${encodeURIComponent(template.id)}" class="btn btn-ghost btn-sm">Use in Campaign</a></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function redrawIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}
