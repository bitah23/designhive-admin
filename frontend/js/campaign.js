let templates = [];
let users = [];
let selectedTemplateId = null;
let selectedUserIds = new Set();

document.addEventListener('DOMContentLoaded', async () => {
  try {
    [templates, users] = await Promise.all([api.get('/templates'), api.get('/users')]);
    renderCampaignUI();
  } catch (err) {
    Toast.error(err.response?.data?.detail || err.message);
  }
});

function renderCampaignUI() {
  const grid = document.getElementById('campaign-grid');

  // 7.2 Template Selection — gold left-border + checkmark when selected
  const templateItems = templates.length === 0
    ? `<p style="color:var(--text-muted);font-size:0.85rem;padding:12px 0">No templates found. <a href="/templates.html" style="color:var(--gold)">Create one first.</a></p>`
    : templates.map(t => {
      const sel = selectedTemplateId === t.id;
      return `<div class="template-option ${sel ? 'selected' : ''}" onclick="selectTemplate('${esc(t.id)}')"
                     style="${sel ? 'border-left:3px solid var(--gold)' : 'border-left:3px solid transparent'}">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div class="t-name">${esc(t.title)}</div>
            ${sel ? `<i data-lucide="check-circle" style="width:14px;height:14px;flex-shrink:0;color:var(--gold)"></i>` : ''}
          </div>
          <div class="t-sub">${esc(t.subject)}</div>
        </div>`;
    }).join('');

  const allChecked = users.length > 0 && selectedUserIds.size === users.length;
  const someChecked = selectedUserIds.size > 0 && selectedUserIds.size < users.length;

  // 7.2 Recipients — row-click toggle, header checkbox with indeterminate state
  const userRows = users.map(u => {
    const checked = selectedUserIds.has(u.id);
    return `<tr style="${checked ? 'background:var(--bg-hover)' : ''}" onclick="toggleUserRow('${esc(u.id)}')" style="cursor:pointer">
      <td style="width:40px;text-align:center">
        <input type="checkbox" class="user-check" data-id="${esc(u.id)}"
          ${checked ? 'checked' : ''}
          onclick="event.stopPropagation();toggleUserRow('${esc(u.id)}')"
          style="width:15px;height:15px;accent-color:var(--gold);cursor:pointer">
      </td>
      <td class="bold">${esc(u.name || '—')}</td>
      <td style="color:var(--text-gold)">${esc(u.email)}</td>
    </tr>`;
  }).join('');

  const badgeStyle = selectedUserIds.size > 0 ? 'badge-gold' : '';
  const badgeText = `${selectedUserIds.size} selected`;

  grid.innerHTML = `
    <div class="card" style="padding:18px;display:flex;flex-direction:column">
      <div class="label-upper mb-3">1 · Select Template</div>
      <div style="overflow-y:auto;max-height:400px;flex:1">${templateItems}</div>
    </div>
    <div class="card" style="padding:18px">
      <div class="flex-between mb-3">
        <span class="label-upper">2 · Select Recipients</span>
        <span class="badge ${badgeStyle}" id="recipient-badge">${badgeText}</span>
      </div>
      <div style="overflow-y:auto;max-height:400px">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th style="padding:8px 10px;width:40px;border-bottom:1px solid var(--border)">
                <input type="checkbox" id="select-all-cb" ${allChecked ? 'checked' : ''}
                  onchange="toggleAll(this.checked)"
                  style="width:15px;height:15px;accent-color:var(--gold);cursor:pointer">
              </th>
              <th style="padding:8px 10px;font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;color:var(--text-muted);border-bottom:1px solid var(--border);text-align:left">Name</th>
              <th style="padding:8px 10px;font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;color:var(--text-muted);border-bottom:1px solid var(--border);text-align:left">Email</th>
            </tr>
          </thead>
          <tbody>${userRows}</tbody>
        </table>
      </div>
    </div>`;

  // Set indeterminate state for header checkbox
  const masterCb = document.getElementById('select-all-cb');
  if (masterCb) masterCb.indeterminate = someChecked;

  updateSendBtn();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function selectTemplate(id) {
  selectedTemplateId = selectedTemplateId === id ? null : id; // toggle same = deselect
  renderCampaignUI();
}

function toggleUserRow(id) {
  selectedUserIds.has(id) ? selectedUserIds.delete(id) : selectedUserIds.add(id);
  renderCampaignUI();
}

function toggleAll(checked) {
  checked ? users.forEach(u => selectedUserIds.add(u.id)) : selectedUserIds.clear();
  renderCampaignUI();
}

function updateSendBtn() {
  const btn = document.getElementById('send-campaign-btn');
  const n = selectedUserIds.size;
  const canSend = selectedTemplateId && n > 0;
  btn.disabled = false; // always enabled — validation is in sendCampaign()
  document.getElementById('send-label').textContent =
    n > 0 ? `Send to ${n} user${n !== 1 ? 's' : ''}` : 'Send Campaign';
}

async function sendCampaign() {
  // 7.2 Validation toasts
  if (!selectedTemplateId) { Toast.warn('Please select a template first.'); return; }
  if (selectedUserIds.size === 0) { Toast.warn('Please select at least one recipient.'); return; }

  const t = templates.find(x => x.id === selectedTemplateId);
  const n = selectedUserIds.size;

  // 7.2 SweetAlert2 confirm with template name
  const result = await Swal.fire({
    title: 'Send Campaign?',
    text: `Send "${t?.title}" to ${n} user${n !== 1 ? 's' : ''}?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes, Send',
    confirmButtonColor: '#FACC15',
    cancelButtonColor: '#374151',
    background: '#11131A',
    color: '#fff',
  });
  if (!result.isConfirmed) return;

  const btn = document.getElementById('send-campaign-btn');
  const grid = document.getElementById('campaign-grid');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Sending...';
  grid.style.pointerEvents = 'none'; // lock panels

  try {
    const { results } = await api.post('/email/send', {
      template_id: selectedTemplateId,
      user_ids: [...selectedUserIds],
    });

    const sent = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;

    failed === 0
      ? Toast.success(`${sent} email${sent !== 1 ? 's' : ''} sent successfully`)
      : Toast.info(`${sent} sent, ${failed} failed`);

    // 7.2 Results panel
    document.getElementById('res-sent').textContent = sent;
    document.getElementById('res-failed').textContent = failed;
    document.getElementById('res-rows').innerHTML = results.map(r => `
      <div class="flex-between" style="padding:6px 12px;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:8px;cursor:default">
        <span style="color:#fff;font-size:0.85rem">${esc(r.email)}</span>
        <div class="flex-center gap-2">
          ${r.error ? `<span style="color:var(--danger);font-size:0.75rem">${esc(r.error)}</span>` : ''}
          <span class="badge ${r.status === 'sent' ? 'badge-green' : 'badge-red'}" style="font-size:0.65rem">
            ${r.status.toUpperCase()}
          </span>
        </div>
      </div>`).join('');

    document.getElementById('results-card').style.display = '';
    if (typeof lucide !== 'undefined') lucide.createIcons();

  } catch (err) {
    Toast.error(err.response?.data?.detail || err.message);
  } finally {
    grid.style.pointerEvents = '';
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="send" style="width:16px;height:16px"></i> <span id="send-label">${selectedUserIds.size > 0 ? `Send to ${selectedUserIds.size} user${selectedUserIds.size !== 1 ? 's' : ''}` : 'Send Campaign'}</span>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// Dismiss results and reset selections
function dismissResults() {
  document.getElementById('results-card').style.display = 'none';
  selectedTemplateId = null;
  selectedUserIds.clear();
  renderCampaignUI();
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
