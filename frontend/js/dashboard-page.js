document.addEventListener('DOMContentLoaded', () => {
  initDashChat();
  loadDashboard();
  loadDraftNotifications();
  loadSuggestions();
  document.getElementById('refresh-suggestions-btn')
    ?.addEventListener('click', () => loadSuggestions(true));
});

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD CHAT
   ═══════════════════════════════════════════════════════════════ */
function initDashChat() {
  const input   = document.getElementById('dash-chat-input');
  const sendBtn = document.getElementById('dash-chat-send');

  input?.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
  });

  sendBtn?.addEventListener('click', sendChatMessage);
}

function appendChatMsg(text, role) {
  const messages = document.getElementById('dash-chat-messages');
  const wrap = document.createElement('div');
  wrap.className = `dm dm--${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'dm-bubble';
  bubble.textContent = text;
  wrap.appendChild(bubble);
  messages.appendChild(wrap);
  messages.scrollTop = messages.scrollHeight;
  return bubble;
}

async function sendChatMessage() {
  const input   = document.getElementById('dash-chat-input');
  const sendBtn = document.getElementById('dash-chat-send');
  const text    = input.value.trim();
  if (!text) return;

  input.value = '';
  input.style.height = 'auto';
  sendBtn.disabled = true;

  appendChatMsg(text, 'user');
  const thinking = appendChatMsg('Thinking…', 'thinking');

  try {
    const data = await api.post('/agents/chat', { message: text });
    thinking.parentElement.remove();
    appendChatMsg(data.reply || 'Done.', 'ai');
    // If a draft was saved, refresh notifications
    if (data.action_taken?.tool === 'save_template') {
      await loadDraftNotifications();
    }
  } catch (err) {
    thinking.parentElement.remove();
    appendChatMsg(err?.response?.data?.detail || 'Something went wrong. Try again.', 'ai');
  } finally {
    sendBtn.disabled = false;
    input.focus();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD STATS + TEMPLATES
   ═══════════════════════════════════════════════════════════════ */
async function loadDashboard() {
  try {
    const [templates, logs, users] = await Promise.all([
      api.get('/templates'),
      api.get('/logs'),
      api.get('/users')
    ]);

    const sent   = logs.filter(l => l.status === 'sent').length;
    const failed = logs.filter(l => l.status === 'failed').length;

    renderStatCards([
      { label: 'Emails Sent',   value: sent,             icon: 'mail',     delta: sent   ? `+${sent} lifetime`   : '--', deltaClass: sent   ? 'delta-positive' : 'delta-neutral' },
      { label: 'Failed Emails', value: failed,           icon: 'x-circle', delta: failed ? `${failed} need review` : '--', deltaClass: failed ? 'delta-negative' : 'delta-neutral', danger: failed > 0 },
      { label: 'Templates',     value: templates.length, icon: 'file-text',delta: templates.length ? `${templates.length} ready` : '--', deltaClass: templates.length ? 'delta-positive' : 'delta-neutral' },
      { label: 'Total Users',   value: users.length,     icon: 'users',    delta: users.length   ? `${users.length} audience` : '--', deltaClass: users.length   ? 'delta-positive' : 'delta-neutral' },
    ]);

    renderTemplateTable(templates);
  } catch (err) {
    Toast.error(err.response?.data?.detail || err.message || 'Failed to load dashboard.');
  }
}

/* ═══════════════════════════════════════════════════════════════
   DRAFT NOTIFICATIONS
   ═══════════════════════════════════════════════════════════════ */
async function loadDraftNotifications() {
  const container = document.getElementById('draft-notifications');
  if (!container) return;
  try {
    const allTemplates = await api.get('/templates');
    const drafts = allTemplates.filter(t => t.status === 'draft');
    if (!drafts.length) { container.style.display = 'none'; return; }

    container.style.display = 'block';
    container.innerHTML = `
      <div style="background:rgba(255,159,28,0.07);border:1px solid rgba(255,159,28,0.28);
                  border-radius:12px;padding:14px 18px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <i data-lucide="bell" style="width:14px;height:14px;color:var(--gold)"></i>
          <span style="font-weight:700;font-size:13px;color:var(--text-primary)">
            ${drafts.length} draft template${drafts.length > 1 ? 's' : ''} awaiting approval
          </span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${drafts.map(t => `
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;
                        background:var(--bg-card);border:1px solid var(--border);
                        border-radius:8px;padding:10px 14px">
              <div style="min-width:0">
                <span style="font-weight:600;font-size:13px;color:var(--text-primary)">${escapeHtml(t.title)}</span>
                <span style="font-size:12px;color:var(--text-muted);margin-left:8px">${escapeHtml(t.subject)}</span>
              </div>
              <div style="display:flex;gap:7px;flex-shrink:0">
                <a href="/templates.html" class="btn btn-outline btn-sm" style="font-size:12px">
                  <i data-lucide="eye" style="width:12px;height:12px"></i> View
                </a>
                <button class="btn btn-primary btn-sm" style="font-size:12px"
                        onclick="approveTemplate('${escapeHtml(t.id)}', this)">
                  <i data-lucide="check" style="width:12px;height:12px"></i> Approve &amp; Send
                </button>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (err) {
    console.warn('Draft notifications error:', err);
  }
}

async function approveTemplate(templateId, btnEl) {
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Sending…'; }
  try {
    await api.post(`/templates/${templateId}/approve`, {});
    Toast.success('Template approved — campaign is being sent!');
    await Promise.all([loadDraftNotifications(), loadDashboard()]);
  } catch (err) {
    Toast.error(err?.response?.data?.detail || 'Approval failed.');
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = '<i data-lucide="check" style="width:12px;height:12px"></i> Approve &amp; Send';
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  }
}

/* ═══════════════════════════════════════════════════════════════
   AI SUGGESTIONS  (compact list)
   ═══════════════════════════════════════════════════════════════ */
async function loadSuggestions(forceRefresh = false) {
  const section   = document.getElementById('suggestions-section');
  const list      = document.getElementById('suggestions-list');
  const countEl   = document.getElementById('suggestions-count');
  const refreshBtn = document.getElementById('refresh-suggestions-btn');
  if (!section || !list) return;

  if (forceRefresh && refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Loading…';
  }

  try {
    const url  = forceRefresh ? '/agents/suggestions?refresh=true' : '/agents/suggestions';
    const data = await api.get(url);
    const suggestions = data.suggestions || [];

    if (!suggestions.length) { section.style.display = 'none'; return; }

    section.style.display = 'block';
    if (countEl) countEl.textContent = data.cached ? '· cached' : '';

    window._suggestions = suggestions;

    list.innerHTML = suggestions.map((s, i) => {
      const actionBtn = s.suggested_action
        ? `<button class="sugg-apply" onclick="applySuggestion(${i})">Apply</button>`
        : '';
      return `
        <div class="sugg-row">
          <span class="sugg-type">${escapeHtml(s.type)}</span>
          <span class="sugg-msg">${escapeHtml(s.message)}</span>
          ${actionBtn}
        </div>`;
    }).join('');
  } catch (err) {
    console.warn('Suggestions failed:', err);
  } finally {
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = '<i data-lucide="refresh-cw" style="width:12px;height:12px"></i> Refresh';
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  }
}

async function applySuggestion(idx) {
  const s = (window._suggestions || [])[idx];
  if (!s?.suggested_action) return;
  const action = s.suggested_action;

  if (action.agent === 'reengagement') {
    try { await api.post('/agents/reengagement/run', {}); Toast.success('Re-engagement agent triggered.'); }
    catch (err) { Toast.error(err?.response?.data?.detail || 'Failed.'); }
    return;
  }
  if (action.agent === 'failure_recovery') {
    try { await api.post('/agents/failure-recovery/run', {}); Toast.success('Failure recovery triggered.'); }
    catch (err) { Toast.error(err?.response?.data?.detail || 'Failed.'); }
    return;
  }
  if (action.segment && action.template_id) {
    window.location.href = `/campaign.html?template=${encodeURIComponent(action.template_id)}&segment=${encodeURIComponent(action.segment)}`;
  }
}

/* ═══════════════════════════════════════════════════════════════
   RENDER HELPERS
   ═══════════════════════════════════════════════════════════════ */
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
  if (typeof lucide !== 'undefined') lucide.createIcons();
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
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  target.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>NAME</th>
            <th>SUBJECT</th>
            <th>STATUS</th>
            <th>CREATED</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          ${templates.map(t => {
            const isDraft = t.status === 'draft';
            const badge = isDraft
              ? `<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;
                             background:rgba(255,159,28,.15);color:var(--gold);
                             border:1px solid rgba(255,159,28,.3)">Draft</span>`
              : `<span style="font-size:10px;color:var(--text-muted)">Approved</span>`;
            return `
            <tr>
              <td class="bold">${escapeHtml(t.title)}</td>
              <td>${escapeHtml(t.subject)}</td>
              <td>${badge}</td>
              <td class="text-muted">${formatDate(t.created_at)}</td>
              <td>
                ${isDraft
                  ? `<button class="btn btn-primary btn-sm" style="font-size:12px"
                             onclick="approveTemplate('${escapeHtml(t.id)}', this)">
                       Approve &amp; Send
                     </button>`
                  : `<a href="/campaign.html?template=${encodeURIComponent(t.id)}" class="btn btn-ghost btn-sm">
                       Use in Campaign
                     </a>`
                }
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
