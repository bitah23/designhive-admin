let templates = [];
let users = [];
let selectedTemplateId = null;
let selectedUserIds = new Set();

document.addEventListener('DOMContentLoaded', async () => {
  try {
    [templates, users] = await Promise.all([api.get('/templates'), api.get('/users')]);
    renderCampaignUI();
  } catch (err) {
    Toast.error(err.message);
  }
});

function renderCampaignUI() {
  const grid = document.getElementById('campaign-grid');

  const templateItems = templates.length === 0
    ? `<p style="color:var(--text-muted);font-size:0.85rem">No templates found. Create one first.</p>`
    : templates.map(t => `
        <div class="template-option ${selectedTemplateId === t.id ? 'selected' : ''}"
             onclick="selectTemplate('${esc(t.id)}')">
          <div class="t-name">${esc(t.title)}</div>
          <div class="t-sub">${esc(t.subject)}</div>
        </div>`).join('');

  const userRows = users.map(u => `
    <tr>
      <td style="width:40px">
        <input type="checkbox" class="user-check" data-id="${esc(u.id)}"
          ${selectedUserIds.has(u.id) ? 'checked' : ''}
          onchange="toggleUser('${esc(u.id)}', this.checked)"
          style="width:15px;height:15px;accent-color:var(--gold);cursor:pointer">
      </td>
      <td class="bold">${esc(u.name || '—')}</td>
      <td class="gold">${esc(u.email)}</td>
    </tr>`).join('');

  const allChecked = users.length > 0 && selectedUserIds.size === users.length;

  grid.innerHTML = `
    <div class="card" style="padding:18px;display:flex;flex-direction:column;gap:0">
      <div class="label-upper mb-3">1 · Select Template</div>
      <div style="overflow-y:auto;max-height:400px">${templateItems}</div>
    </div>
    <div class="card" style="padding:18px">
      <div class="flex-between mb-3">
        <span class="label-upper">2 · Select Recipients</span>
        <span class="badge badge-gold">${selectedUserIds.size} selected</span>
      </div>
      <div style="overflow-y:auto;max-height:400px">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th style="padding:8px 10px;text-align:left;font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;color:var(--text-muted);border-bottom:1px solid var(--border);width:40px">
                <input type="checkbox" ${allChecked ? 'checked' : ''} onchange="toggleAll(this.checked)"
                  style="width:15px;height:15px;accent-color:var(--gold);cursor:pointer">
              </th>
              <th style="padding:8px 10px;text-align:left;font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;color:var(--text-muted);border-bottom:1px solid var(--border)">Name</th>
              <th style="padding:8px 10px;text-align:left;font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;color:var(--text-muted);border-bottom:1px solid var(--border)">Email</th>
            </tr>
          </thead>
          <tbody>${userRows}</tbody>
        </table>
      </div>
    </div>`;

  updateSendBtn();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function selectTemplate(id) {
  selectedTemplateId = id;
  renderCampaignUI();
}

function toggleUser(id, checked) {
  checked ? selectedUserIds.add(id) : selectedUserIds.delete(id);
  updateSendBtn();
  document.querySelector('.badge-gold').textContent = `${selectedUserIds.size} selected`;
  const allChecked = users.length > 0 && selectedUserIds.size === users.length;
  const masterCb = document.querySelector('thead input[type=checkbox]');
  if (masterCb) masterCb.checked = allChecked;
}

function toggleAll(checked) {
  checked ? users.forEach(u => selectedUserIds.add(u.id)) : selectedUserIds.clear();
  renderCampaignUI();
}

function updateSendBtn() {
  const btn = document.getElementById('send-campaign-btn');
  const canSend = selectedTemplateId && selectedUserIds.size > 0;
  btn.disabled = !canSend;
  const n = selectedUserIds.size;
  document.getElementById('send-label').textContent =
    canSend ? `Send to ${n} user${n !== 1 ? 's' : ''}` : 'Send Campaign';
}

async function sendCampaign() {
  const t = templates.find(x => x.id === selectedTemplateId);
  const result = await Swal.fire({
    title: 'Send Campaign?',
    text: `This will send "${t?.title}" to ${selectedUserIds.size} user(s).`,
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
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Sending...';

  try {
    const { results } = await api.post('/email/send', {
      template_id: selectedTemplateId,
      user_ids: [...selectedUserIds],
    });

    const sent   = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;

    failed === 0 ? Toast.success(`${sent} email(s) sent successfully`) : Toast.info(`${sent} sent, ${failed} failed`);

    document.getElementById('res-sent').textContent   = sent;
    document.getElementById('res-failed').textContent = failed;
    document.getElementById('res-rows').innerHTML = results.map(r => `
      <div class="flex-between" style="padding:6px 12px;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:8px">
        <span style="color:#fff;font-size:0.85rem">${esc(r.email)}</span>
        <div class="flex-center gap-2">
          ${r.error ? `<span style="color:var(--danger);font-size:0.75rem">${esc(r.error)}</span>` : ''}
          <i data-lucide="${r.status === 'sent' ? 'check-circle' : 'x-circle'}" style="width:15px;height:15px;color:${r.status === 'sent' ? 'var(--gold)' : 'var(--danger)'}"></i>
        </div>
      </div>`).join('');

    document.getElementById('results-card').style.display = '';
    if (typeof lucide !== 'undefined') lucide.createIcons();

  } catch (err) {
    Toast.error(err.message);
  } finally {
    btn.disabled = false;
    updateSendBtn();
    btn.innerHTML = `<i data-lucide="send" style="width:16px;height:16px"></i> <span id="send-label">${selectedUserIds.size > 0 ? `Send to ${selectedUserIds.size} user${selectedUserIds.size !== 1 ? 's' : ''}` : 'Send Campaign'}</span>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
