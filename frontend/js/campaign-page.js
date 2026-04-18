let templates = [];
let users = [];
let selectedTemplateId = null;
const selectedUserIds = new Set();

const grid = document.getElementById('campaign-grid');
const sendButton = document.getElementById('send-campaign-btn');
const resultsCard = document.getElementById('results-card');

window.selectTemplate = selectTemplate;
window.toggleUserRow = toggleUserRow;
window.toggleAllUsers = toggleAllUsers;

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

    const preselected = new URLSearchParams(window.location.search).get('template');
    if (preselected && templates.some(item => item.id === preselected)) {
      selectedTemplateId = preselected;
    }

    renderCampaignUI();
  } catch (error) {
    Toast.error(error.response?.data?.detail || error.message || 'Failed to load campaign.');
  }
});

function renderCampaignUI() {
  const allChecked = users.length > 0 && selectedUserIds.size === users.length;
  const someChecked = selectedUserIds.size > 0 && selectedUserIds.size < users.length;

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
      <div class="table-wrap" style="max-height:420px;overflow:auto">
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
            ${users.length ? users.map(user => {
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
                    <p style="margin:0">No users registered yet.</p>
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

  updateSendButton();
  redrawIcons();
}

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
    users.forEach(user => selectedUserIds.add(user.id));
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
