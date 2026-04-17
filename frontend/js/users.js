let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
let selectedUser = null;
const PER_PAGE = 10;
const attachedFiles = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadUsers();
  document.getElementById('search').addEventListener('input', e => {
    filterUsers(e.target.value);
  });
  document.getElementById('file-input').addEventListener('change', handleFileAdd);
  document.getElementById('email-form').addEventListener('submit', sendEmail);
});

async function loadUsers() {
  try {
    allUsers = await api.get('/users');
    document.getElementById('user-count').textContent =
      `${allUsers.length} registered user${allUsers.length !== 1 ? 's' : ''}`;
    filterUsers('');
  } catch (err) {
    Toast.error(err.message);
    document.getElementById('users-card').innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

function filterUsers(q) {
  const lower = q.toLowerCase();
  filteredUsers = q
    ? allUsers.filter(u => (u.name||'').toLowerCase().includes(lower) || (u.email||'').toLowerCase().includes(lower))
    : [...allUsers];
  currentPage = 1;
  renderTable();
}

function renderTable() {
  const total = filteredUsers.length;
  const totalPages = Math.ceil(total / PER_PAGE) || 1;
  const start = (currentPage - 1) * PER_PAGE;
  const page = filteredUsers.slice(start, start + PER_PAGE);

  const rows = page.length === 0
    ? `<tr><td colspan="4" class="empty-state">No users found.</td></tr>`
    : page.map(u => `
        <tr>
          <td class="bold" style="padding-left:20px">${esc(u.name || '—')}</td>
          <td class="gold">${esc(u.email)}</td>
          <td class="text-muted">${fmtDate(u.created_at)}</td>
          <td style="text-align:center">
            <button class="btn btn-secondary btn-sm" onclick="openEmailModal(${JSON.stringify(JSON.stringify(u))})">
              <i data-lucide="mail" style="width:12px;height:12px"></i> Send Email
            </button>
          </td>
        </tr>`).join('');

  const paginationHTML = totalPages > 1 ? `
    <div class="pagination">
      <span>Showing ${start + 1}–${Math.min(start + PER_PAGE, total)} of ${total}</span>
      <div class="flex gap-2">
        <button class="btn btn-secondary btn-sm" onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>Prev</button>
        <button class="btn btn-secondary btn-sm" onclick="changePage(1)"  ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
      </div>
    </div>` : '';

  document.getElementById('users-card').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="padding-left:20px">Name</th>
            <th>Email</th>
            <th>Joined</th>
            <th style="text-align:center">Action</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${paginationHTML}`;

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function changePage(dir) {
  const totalPages = Math.ceil(filteredUsers.length / PER_PAGE) || 1;
  currentPage = Math.max(1, Math.min(totalPages, currentPage + dir));
  renderTable();
}

function openEmailModal(userJson) {
  selectedUser = JSON.parse(userJson);
  document.getElementById('modal-recipient').textContent =
    (selectedUser.name ? `${selectedUser.name} — ` : '') + selectedUser.email;
  document.getElementById('email-subject').value = '';
  document.getElementById('email-body').value = '';
  document.getElementById('file-list').innerHTML = '';
  attachedFiles.length = 0;
  document.getElementById('email-modal').classList.remove('hidden');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeEmailModal() {
  document.getElementById('email-modal').classList.add('hidden');
  selectedUser = null;
}

function handleFileAdd(e) {
  for (const file of e.target.files) attachedFiles.push(file);
  e.target.value = '';
  renderFileList();
}

function renderFileList() {
  document.getElementById('file-list').innerHTML = attachedFiles.map((f, i) => `
    <div class="flex-between" style="padding:6px 10px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px">
      <span style="font-size:0.78rem;color:var(--text-sub)">${esc(f.name)} <span class="text-muted">(${fmtBytes(f.size)})</span></span>
      <button type="button" class="btn-icon" style="padding:3px" onclick="removeFile(${i})">
        <i data-lucide="x" style="width:13px;height:13px"></i>
      </button>
    </div>`).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function removeFile(i) {
  attachedFiles.splice(i, 1);
  renderFileList();
}

async function sendEmail(e) {
  e.preventDefault();
  if (!selectedUser) return;
  const btn = document.getElementById('send-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const attachments = await Promise.all(attachedFiles.map(async f => ({
      name: f.name,
      mime_type: f.type || 'application/octet-stream',
      data: await toBase64(f),
    })));

    await api.post('/email/send-direct', {
      to: selectedUser.email,
      subject: document.getElementById('email-subject').value,
      body: document.getElementById('email-body').value.replace(/\n/g, '<br>'),
      attachments,
    });

    Toast.success(`Email sent to ${selectedUser.email}`);
    closeEmailModal();
  } catch (err) {
    Toast.error(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="send" style="width:14px;height:14px"></i> Send';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

function toBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtBytes(b) {
  return b < 1024 ? `${b}B` : b < 1048576 ? `${(b/1024).toFixed(1)}KB` : `${(b/1048576).toFixed(1)}MB`;
}
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
