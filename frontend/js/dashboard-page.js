document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  loadSuggestions();
  document.getElementById('refresh-suggestions-btn')?.addEventListener('click', () => loadSuggestions(true));
});

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

async function loadSuggestions(forceRefresh = false) {
  const card = document.getElementById('suggestions-card');
  const list = document.getElementById('suggestions-list');
  const countEl = document.getElementById('suggestions-count');
  const refreshBtn = document.getElementById('refresh-suggestions-btn');

  if (!card || !list) return;

  if (forceRefresh && refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i data-lucide="loader-2" style="width:13px;height:13px"></i> Loading…';
    redrawIcons();
  }

  try {
    const url = forceRefresh ? '/agents/suggestions?refresh=true' : '/agents/suggestions';
    const data = await api.get(url);
    const suggestions = data.suggestions || [];

    if (!suggestions.length) {
      card.style.display = 'none';
      return;
    }

    card.style.display = '';
    if (countEl) countEl.textContent = `${suggestions.length} insight${suggestions.length !== 1 ? 's' : ''}${data.cached ? ' · cached' : ''}`;

    list.innerHTML = suggestions.map((s, i) => {
      const icon = {
        timing:       'clock',
        audience:     'users',
        'reengagement': 're-engagement',
        'reengagement': 'user-x',
        template:     'file-text',
        general:      'lightbulb',
      }[s.type] || 'lightbulb';

      const typeIcons = {
        timing:        'clock',
        audience:      'users',
        'reengagement':'user-x',
        template:      'file-text',
        general:       'lightbulb',
      };

      const actionBtn = s.suggested_action
        ? `<button class="btn btn-outline btn-sm" onclick="applySuggestion(${i})" data-idx="${i}">Apply</button>`
        : '';

      const confidencePct = Math.round((s.confidence || 0) * 100);

      return `
        <div class="suggestion-item" style="
          display:flex;align-items:flex-start;gap:14px;
          padding:14px 16px;border-radius:8px;
          background:var(--bg-card-alt);border:1px solid var(--border);
        ">
          <div style="
            width:32px;height:32px;border-radius:8px;flex-shrink:0;
            background:var(--gold-dim);display:flex;align-items:center;justify-content:center;margin-top:1px;
          ">
            <i data-lucide="${typeIcons[s.type] || 'lightbulb'}" style="width:15px;height:15px;color:var(--gold)"></i>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:4px">${escapeHtml(s.type)}</div>
            <div style="color:var(--text-primary);font-size:14px;line-height:1.5">${escapeHtml(s.message)}</div>
            <div style="margin-top:8px;display:flex;align-items:center;gap:10px">
              <span style="font-size:12px;color:var(--text-muted)">Confidence: ${confidencePct}%</span>
              ${actionBtn}
            </div>
          </div>
        </div>
      `;
    }).join('');

    window._suggestions = suggestions;
    redrawIcons();
  } catch (err) {
    // Silently skip — suggestions are non-critical
    console.warn('Suggestions failed:', err);
  } finally {
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = '<i data-lucide="refresh-cw" style="width:13px;height:13px"></i> Refresh';
      redrawIcons();
    }
  }
}

async function applySuggestion(idx) {
  const s = (window._suggestions || [])[idx];
  if (!s || !s.suggested_action) return;

  const action = s.suggested_action;

  if (action.agent === 'reengagement') {
    try {
      await api.post('/agents/reengagement/run', {});
      Toast.success('Re-engagement agent triggered successfully.');
    } catch (err) {
      Toast.error(err?.response?.data?.detail || 'Failed to run re-engagement agent.');
    }
    return;
  }

  if (action.agent === 'failure_recovery') {
    try {
      await api.post('/agents/failure-recovery/run', {});
      Toast.success('Failure recovery agent triggered successfully.');
    } catch (err) {
      Toast.error(err?.response?.data?.detail || 'Failed to run failure recovery.');
    }
    return;
  }

  if (action.segment && action.template_id) {
    window.location.href = `/campaign.html?template=${encodeURIComponent(action.template_id)}&segment=${encodeURIComponent(action.segment)}`;
    return;
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
