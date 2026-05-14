let templates = [];
let users = [];
let displayedUsers = [];     // subset shown in table (all users, or segment result)
let activeSegment = null;    // { label, count } when a segment is applied, null otherwise
let segRule = 'all';
let segDays = 30;
let segFromDate = '';
let segToDate = '';
let segPreviewCount = null;

let selectedTemplateId = null;
const selectedUserIds = new Set();

let scheduledCampaigns = [];

const grid = document.getElementById('campaign-grid');
const sendButton = document.getElementById('send-campaign-btn');
const resultsCard = document.getElementById('results-card');

window.selectTemplate = selectTemplate;
window.toggleUserRow = toggleUserRow;
window.toggleAllUsers = toggleAllUsers;
window.updateSegRule = updateSegRule;
window.previewSegment = previewSegment;
window.applySegment = applySegment;
window.clearSegment = clearSegment;
window.openScheduleModal = openScheduleModal;
window.closeScheduleModal = closeScheduleModal;
window.submitSchedule = submitSchedule;
window.loadScheduledCampaigns = loadScheduledCampaigns;
window.cancelScheduledCampaign = cancelScheduledCampaign;

document.getElementById('dismiss-results-btn').addEventListener('click', dismissResults);
sendButton.addEventListener('click', sendCampaign);

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const [loadedTemplates, loadedUsers] = await Promise.all([
      api.get('/templates'),
      api.get('/users')
    ]);

    templates = loadedTemplates;
    users = loadedUsers;
    displayedUsers = users;

    const preselected = new URLSearchParams(window.location.search).get('template');
    if (preselected && templates.some(item => item.id === preselected)) {
      selectedTemplateId = preselected;
    }

    renderCampaignUI();
    loadScheduledCampaigns(); // non-blocking background load
  } catch (error) {
    Toast.error(error.response?.data?.detail || error.message || 'Failed to load campaign.');
  }
});

function renderCampaignUI() {
  const allChecked = displayedUsers.length > 0 && displayedUsers.every(u => selectedUserIds.has(u.id));
  const someChecked = displayedUsers.some(u => selectedUserIds.has(u.id)) && !allChecked;

  const showDays = segRule === 'new_users' || segRule === 'inactive';
  const showRange = segRule === 'custom_date_range';
  const defaultDays = segRule === 'new_users' ? 7 : 30;

  const segmentPanel = `
    <div style="border-bottom:1px solid var(--border);margin-bottom:12px;padding-bottom:12px">
      <div class="flex-between" style="margin-bottom:10px">
        <span class="label-upper">Smart Segment</span>
        ${activeSegment ? `
          <div style="display:flex;align-items:center;gap:8px">
            <span class="badge badge-gold" style="font-size:11px">${escapeHtml(activeSegment.label)}</span>
            <button type="button" class="btn btn-outline btn-sm" style="padding:2px 10px;font-size:12px" onclick="clearSegment()">Clear</button>
          </div>
        ` : ''}
      </div>
      <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
        <div>
          <div class="label-upper" style="margin-bottom:4px;font-size:10px">Rule</div>
          <select id="seg-rule" onchange="updateSegRule(this.value)"
            style="background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;padding:5px 8px;font-size:13px">
            <option value="all" ${segRule === 'all' ? 'selected' : ''}>All Users</option>
            <option value="new_users" ${segRule === 'new_users' ? 'selected' : ''}>New Users</option>
            <option value="inactive" ${segRule === 'inactive' ? 'selected' : ''}>Inactive</option>
            <option value="never_emailed" ${segRule === 'never_emailed' ? 'selected' : ''}>Never Emailed</option>
            <option value="custom_date_range" ${segRule === 'custom_date_range' ? 'selected' : ''}>Custom Date Range</option>
          </select>
        </div>
        <div id="seg-days-wrap" style="display:${showDays ? '' : 'none'}">
          <div class="label-upper" style="margin-bottom:4px;font-size:10px">Days</div>
          <input type="number" id="seg-days" min="1" value="${segDays || defaultDays}"
            style="width:72px;background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;padding:5px 8px;font-size:13px">
        </div>
        <div id="seg-range-wrap" style="display:${showRange ? '' : 'none'};display:flex;gap:6px">
          <div>
            <div class="label-upper" style="margin-bottom:4px;font-size:10px">From</div>
            <input type="date" id="seg-from-date" value="${segFromDate}"
              style="background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;padding:5px 8px;font-size:13px">
          </div>
          <div>
            <div class="label-upper" style="margin-bottom:4px;font-size:10px">To</div>
            <input type="date" id="seg-to-date" value="${segToDate}"
              style="background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;padding:5px 8px;font-size:13px">
          </div>
        </div>
        <div style="display:flex;gap:6px;padding-bottom:1px">
          <button id="seg-preview-btn" type="button" onclick="previewSegment()" class="btn btn-outline btn-sm" style="font-size:12px">Preview</button>
          <button id="seg-apply-btn" type="button" onclick="applySegment()" class="btn btn-primary btn-sm" style="font-size:12px">Apply</button>
        </div>
      </div>
      ${segPreviewCount !== null ? `
        <div style="margin-top:8px">
          <span class="badge badge-neutral" style="font-size:12px">
            ${segPreviewCount} user${segPreviewCount === 1 ? '' : 's'} match
          </span>
        </div>
      ` : ''}
    </div>
  `;

  grid.innerHTML = `
    <div class="card" style="padding:18px">
      <div class="label-upper mb-3">1. Select Template</div>
      <div style="max-height:420px;overflow:auto">
        ${templates.length ? templates.map(template => {
          const selected = selectedTemplateId === template.id;
          return `
            <div class="template-option ${selected ? 'selected' : ''}" onclick="selectTemplate('${escapeAttr(template.id)}')">
              <div class="flex-between">
                <div class="t-name">${escapeHtml(template.title)}</div>
                ${selected ? '<i data-lucide="check-circle-2" style="width:16px;height:16px;color:var(--gold-strong)"></i>' : ''}
              </div>
              <div class="t-sub">${escapeHtml(template.subject)}</div>
            </div>
          `;
        }).join('') : `
          <div class="empty-state" style="padding:24px 12px">
            <div class="empty-state-icon"><i data-lucide="file-text" style="width:24px;height:24px"></i></div>
            <p style="margin:0 0 14px">No templates yet.</p>
            <a href="/templates.html" class="btn btn-outline btn-sm">Create Template</a>
          </div>
        `}
      </div>
    </div>

    <div class="card" style="padding:18px">
      <div class="flex-between mb-3">
        <span class="label-upper">2. Select Recipients</span>
        <span class="badge ${selectedUserIds.size ? 'badge-gold' : 'badge-neutral'}">${selectedUserIds.size} selected</span>
      </div>
      ${segmentPanel}
      <div class="table-wrap" style="max-height:340px;overflow:auto">
        <table>
          <thead>
            <tr>
              <th style="width:52px">
                <input type="checkbox" id="select-all-users" ${allChecked ? 'checked' : ''} style="accent-color:var(--gold)">
              </th>
              <th>NAME</th>
              <th>EMAIL</th>
            </tr>
          </thead>
          <tbody>
            ${displayedUsers.length ? displayedUsers.map(user => {
              const selected = selectedUserIds.has(user.id);
              return `
                <tr class="${selected ? 'is-selected' : ''}" onclick="toggleUserRow('${escapeAttr(user.id)}')" style="cursor:pointer">
                  <td>
                    <input type="checkbox" ${selected ? 'checked' : ''} onclick="event.stopPropagation();toggleUserRow('${escapeAttr(user.id)}')" style="accent-color:var(--gold)">
                  </td>
                  <td class="bold">${escapeHtml(user.name || '--')}</td>
                  <td>${escapeHtml(user.email)}</td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="3">
                  <div class="empty-state" style="padding:24px 12px">
                    <div class="empty-state-icon"><i data-lucide="users" style="width:24px;height:24px"></i></div>
                    <p style="margin:0">${activeSegment ? 'No users match this segment.' : 'No users registered yet.'}</p>
                  </div>
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const selectAll = document.getElementById('select-all-users');
  if (selectAll) {
    selectAll.indeterminate = someChecked;
    selectAll.addEventListener('change', event => toggleAllUsers(event.target.checked));
  }

  // Keep date range wrapper correct (inline style conflict workaround)
  const rangeWrap = document.getElementById('seg-range-wrap');
  if (rangeWrap) rangeWrap.style.display = showRange ? 'flex' : 'none';

  updateSendButton();
  redrawIcons();
}

// ---------------------------------------------------------------------------
// Smart Segment handlers
// ---------------------------------------------------------------------------

function updateSegRule(rule) {
  segRule = rule;
  segPreviewCount = null;

  const daysWrap = document.getElementById('seg-days-wrap');
  const rangeWrap = document.getElementById('seg-range-wrap');
  const previewArea = document.querySelector('[data-seg-preview]');

  if (daysWrap) daysWrap.style.display = (rule === 'new_users' || rule === 'inactive') ? '' : 'none';
  if (rangeWrap) rangeWrap.style.display = rule === 'custom_date_range' ? 'flex' : 'none';

  // Reset days default when switching rules
  const daysInput = document.getElementById('seg-days');
  if (daysInput) daysInput.value = rule === 'new_users' ? 7 : 30;
}

async function previewSegment() {
  const params = buildSegmentParams();
  const btn = document.getElementById('seg-preview-btn');
  if (btn) { btn.disabled = true; btn.textContent = '...'; }

  try {
    const res = await api.post('/agents/segment', { rule: segRule, params, preview_only: true });
    segPreviewCount = res.count;

    // Inject count badge without full re-render
    const existing = document.getElementById('seg-preview-area');
    if (existing) {
      existing.innerHTML = `<span class="badge badge-neutral" style="font-size:12px">
        ${res.count} user${res.count === 1 ? '' : 's'} match
      </span>`;
      existing.style.display = '';
    } else {
      // Fallback: find the segment panel and append
      const panel = document.getElementById('seg-apply-btn')?.closest('div[style*="border-bottom"]');
      if (panel) {
        const div = document.createElement('div');
        div.id = 'seg-preview-area';
        div.style.marginTop = '8px';
        div.innerHTML = `<span class="badge badge-neutral" style="font-size:12px">
          ${res.count} user${res.count === 1 ? '' : 's'} match
        </span>`;
        panel.appendChild(div);
      }
    }
  } catch (err) {
    Toast.error(err.response?.data?.detail || 'Preview failed.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Preview'; }
  }
}

async function applySegment() {
  const params = buildSegmentParams();
  const btn = document.getElementById('seg-apply-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Applying...'; }

  try {
    const res = await api.post('/agents/segment', { rule: segRule, params, preview_only: false });
    displayedUsers = res.users || [];

    selectedUserIds.clear();
    displayedUsers.forEach(u => selectedUserIds.add(u.id));

    segPreviewCount = res.count;
    activeSegment = { label: getSegmentLabel(segRule, params), count: res.count };

    renderCampaignUI();
    Toast.success(`Segment applied — ${res.count} user${res.count === 1 ? '' : 's'} selected.`);
  } catch (err) {
    Toast.error(err.response?.data?.detail || 'Failed to apply segment.');
    if (btn) { btn.disabled = false; btn.textContent = 'Apply'; }
  }
}

function clearSegment() {
  displayedUsers = users;
  activeSegment = null;
  segRule = 'all';
  segDays = 30;
  segFromDate = '';
  segToDate = '';
  segPreviewCount = null;
  selectedUserIds.clear();
  renderCampaignUI();
}

function buildSegmentParams() {
  if (segRule === 'new_users' || segRule === 'inactive') {
    segDays = parseInt(document.getElementById('seg-days')?.value) || (segRule === 'new_users' ? 7 : 30);
    return { days: segDays };
  }
  if (segRule === 'custom_date_range') {
    segFromDate = document.getElementById('seg-from-date')?.value || '';
    segToDate = document.getElementById('seg-to-date')?.value || '';
    return { from_date: segFromDate, to_date: segToDate };
  }
  return {};
}

function getSegmentLabel(rule, params) {
  const map = {
    all: 'All Users',
    new_users: `New Users (${params.days || 7}d)`,
    inactive: `Inactive (${params.days || 30}d)`,
    never_emailed: 'Never Emailed',
    custom_date_range: `${params.from_date || '?'} → ${params.to_date || '?'}`,
  };
  return map[rule] || rule;
}

// ---------------------------------------------------------------------------
// Existing handlers (updated to use displayedUsers)
// ---------------------------------------------------------------------------

function selectTemplate(id) {
  selectedTemplateId = id;
  renderCampaignUI();
}

function toggleUserRow(id) {
  if (selectedUserIds.has(id)) {
    selectedUserIds.delete(id);
  } else {
    selectedUserIds.add(id);
  }
  renderCampaignUI();
}

function toggleAllUsers(checked) {
  selectedUserIds.clear();
  if (checked) {
    displayedUsers.forEach(user => selectedUserIds.add(user.id));
  }
  renderCampaignUI();
}

function updateSendButton() {
  const count = selectedUserIds.size;
  const label = document.getElementById('send-label');
  if (label) {
    label.textContent = count ? `Send to ${count} user${count === 1 ? '' : 's'}` : 'Send Campaign';
  }
}

async function sendCampaign() {
  if (!selectedTemplateId) {
    Toast.warn('Please select a template first.');
    return;
  }

  if (!selectedUserIds.size) {
    Toast.warn('Please select at least one recipient.');
    return;
  }

  const template = templates.find(item => item.id === selectedTemplateId);
  const count = selectedUserIds.size;

  const confirmed = await Swal.fire({
    title: 'Send campaign?',
    text: `Send to ${count} user${count === 1 ? '' : 's'} using ${template?.title || 'this template'}?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Send',
    confirmButtonColor: getCssVar('--gold'),
    cancelButtonColor: 'transparent',
    background: getCssVar('--bg-card'),
    color: getCssVar('--text-primary')
  });

  if (!confirmed.isConfirmed) return;

  sendButton.disabled = true;
  sendButton.innerHTML = '<span class="spinner"></span><span>Sending...</span>';
  grid.style.pointerEvents = 'none';

  try {
    const response = await api.post('/email/send', {
      template_id: selectedTemplateId,
      user_ids: [...selectedUserIds]
    });

    const results = response.results || [];
    const sent = results.filter(item => item.status === 'sent').length;
    const failed = results.filter(item => item.status === 'failed').length;

    document.getElementById('res-sent').textContent = sent;
    document.getElementById('res-failed').textContent = failed;
    document.getElementById('res-rows').innerHTML = results.map(item => `
      <div class="card" style="padding:12px 14px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;box-shadow:none">
        <div>
          <div style="color:var(--text-primary);font-weight:600">${escapeHtml(item.email)}</div>
          ${item.error ? `<div class="text-danger" style="font-size:12px;margin-top:4px">${escapeHtml(item.error)}</div>` : ''}
        </div>
        <span class="badge ${item.status === 'sent' ? 'badge-green' : 'badge-red'}">${escapeHtml(item.status.toUpperCase())}</span>
      </div>
    `).join('');

    resultsCard.hidden = false;
    Toast.success(failed ? `${sent} sent, ${failed} failed.` : `Sent to ${sent} user${sent === 1 ? '' : 's'}.`);
  } catch (error) {
    Toast.error(error.response?.data?.detail || error.message || 'Failed to send campaign.');
  } finally {
    grid.style.pointerEvents = '';
    sendButton.disabled = false;
    sendButton.innerHTML = '<i data-lucide="send" style="width:16px;height:16px"></i><span id="send-label"></span>';
    updateSendButton();
    redrawIcons();
  }
}

function dismissResults() {
  selectedTemplateId = null;
  selectedUserIds.clear();
  resultsCard.hidden = true;
  renderCampaignUI();
}

// ---------------------------------------------------------------------------
// Campaign Scheduler
// ---------------------------------------------------------------------------

function openScheduleModal() {
  if (!selectedTemplateId) {
    Toast.warn('Please select a template first.');
    return;
  }

  const template = templates.find(t => t.id === selectedTemplateId);
  const params = buildSegmentParams();
  const segLabel = getSegmentLabel(segRule, params);

  document.getElementById('sched-summary').innerHTML = `
    <div style="background:var(--bg-input);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
      <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">Campaign Details</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;gap:10px">
          <span style="color:var(--text-muted);font-size:13px;width:76px;flex-shrink:0">Template</span>
          <span style="font-weight:600;font-size:13px">${escapeHtml(template?.title || 'Unknown')}</span>
        </div>
        <div style="display:flex;gap:10px">
          <span style="color:var(--text-muted);font-size:13px;width:76px;flex-shrink:0">Segment</span>
          <span style="font-size:13px">${escapeHtml(segLabel)}</span>
        </div>
      </div>
    </div>
  `;

  // Default to 1 hour from now, minimum 1 minute from now
  const soon = new Date();
  soon.setHours(soon.getHours() + 1);
  const minDt = new Date();
  minDt.setMinutes(minDt.getMinutes() + 1);

  const sendAtInput = document.getElementById('sched-send-at');
  sendAtInput.min = minDt.toISOString().slice(0, 16);
  sendAtInput.value = soon.toISOString().slice(0, 16);

  document.getElementById('schedule-modal').classList.remove('hidden');
  redrawIcons();
}

function closeScheduleModal() {
  document.getElementById('schedule-modal').classList.add('hidden');
}

async function submitSchedule() {
  const sendAtVal = document.getElementById('sched-send-at').value;
  if (!sendAtVal) { Toast.error('Please select a send time.'); return; }

  const sendAt = new Date(sendAtVal);
  if (sendAt <= new Date()) { Toast.error('Schedule time must be in the future.'); return; }

  const params = buildSegmentParams();
  const btn = document.getElementById('sched-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Scheduling…';

  try {
    await api.post('/agents/schedule', {
      template_id: selectedTemplateId,
      segment_rule: segRule,
      segment_params: params,
      send_at: sendAt.toISOString(),
    });
    closeScheduleModal();
    Toast.success('Campaign scheduled successfully.');
    await loadScheduledCampaigns();
  } catch (err) {
    Toast.error(err.response?.data?.detail || 'Failed to schedule campaign.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="calendar-clock" style="width:14px;height:14px"></i> Schedule';
    redrawIcons();
  }
}

async function loadScheduledCampaigns() {
  try {
    scheduledCampaigns = await api.get('/agents/schedule');
    renderScheduledCampaigns();
  } catch (err) {
    console.error('Failed to load scheduled campaigns:', err);
  }
}

function renderScheduledCampaigns() {
  const card = document.getElementById('scheduled-campaigns-card');
  const body = document.getElementById('scheduled-campaigns-body');
  if (!card || !body) return;

  if (!scheduledCampaigns.length) {
    card.style.display = 'none';
    return;
  }

  card.style.display = '';

  const statusBadge = status => ({
    pending:   '<span class="badge badge-gold">PENDING</span>',
    running:   '<span class="badge badge-gold">RUNNING</span>',
    sent:      '<span class="badge badge-green">SENT</span>',
    failed:    '<span class="badge badge-red">FAILED</span>',
    cancelled: '<span class="badge badge-neutral">CANCELLED</span>',
  }[status] || `<span class="badge badge-neutral">${escapeHtml(status.toUpperCase())}</span>`);

  body.innerHTML = scheduledCampaigns.map(job => {
    const tmpl = templates.find(t => t.id === job.template_id);
    const tmplName = tmpl?.title || `Template (…${job.template_id.slice(-6)})`;
    const sendAt = new Date(job.send_at).toLocaleString('en-AU', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const segLabel = getSegmentLabel(job.segment_rule, job.segment_params || {});

    let resultHtml = '';
    if (job.result_summary) {
      const s = job.result_summary;
      if (s.sent !== undefined) {
        resultHtml = `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">${s.sent} sent · ${s.failed} failed</div>`;
      } else if (s.error) {
        resultHtml = `<div style="font-size:12px;color:var(--danger);margin-top:4px">${escapeHtml(s.error)}</div>`;
      } else if (s.note) {
        resultHtml = `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">${escapeHtml(s.note)}</div>`;
      }
    }

    const cancelBtn = job.status === 'pending' ? `
      <button type="button" class="btn-icon" title="Cancel campaign"
              onclick="cancelScheduledCampaign('${escapeAttr(job.id)}')">
        <i data-lucide="x-circle" style="width:15px;height:15px;color:var(--danger)"></i>
      </button>
    ` : '';

    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;
                  padding:12px 0;border-bottom:1px solid var(--border)">
        <div style="min-width:0;flex:1">
          <div style="font-weight:600;font-size:14px;margin-bottom:4px">${escapeHtml(tmplName)}</div>
          <div style="font-size:12px;color:var(--text-muted);display:flex;gap:14px;flex-wrap:wrap">
            <span>
              <i data-lucide="calendar" style="width:11px;height:11px;vertical-align:middle;margin-right:3px"></i>
              ${escapeHtml(sendAt)}
            </span>
            <span>
              <i data-lucide="users" style="width:11px;height:11px;vertical-align:middle;margin-right:3px"></i>
              ${escapeHtml(segLabel)}
            </span>
          </div>
          ${resultHtml}
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;padding-top:2px">
          ${statusBadge(job.status)}
          ${cancelBtn}
        </div>
      </div>
    `;
  }).join('');

  // Remove border from last item
  const items = body.querySelectorAll('[style*="border-bottom"]');
  if (items.length) items[items.length - 1].style.borderBottom = 'none';

  redrawIcons();
}

async function cancelScheduledCampaign(id) {
  const confirmed = await Swal.fire({
    title: 'Cancel this campaign?',
    text: 'The scheduled send will not go out.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, cancel it',
    confirmButtonColor: getCssVar('--danger'),
    cancelButtonColor: 'transparent',
    background: getCssVar('--bg-card'),
    color: getCssVar('--text-primary'),
  });
  if (!confirmed.isConfirmed) return;

  try {
    await api.del(`/agents/schedule/${id}`);
    Toast.success('Scheduled campaign cancelled.');
    await loadScheduledCampaigns();
  } catch (err) {
    Toast.error(err.response?.data?.detail || 'Failed to cancel campaign.');
  }
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

function redrawIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}
