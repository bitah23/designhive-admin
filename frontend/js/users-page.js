let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
let selectedUser = null;
let searchTimer = null;
const PER_PAGE = 10;
const attachedFiles = [];

const usersCard = document.getElementById('users-card');
const searchInput = document.getElementById('search');
const emailModal = document.getElementById('email-modal');
const emailForm = document.getElementById('email-form');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const sendButton = document.getElementById('send-btn');

window.openEmailModal = openEmailModal;
window.changeUsersPage = changePage;
window.removeAttachment = removeAttachment;

searchInput.addEventListener('input', event => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => filterUsers(event.target.value), 300);
});

document.getElementById('attach-files-btn').addEventListener('click', () => fileInput.click());
document.getElementById('close-email-modal').addEventListener('click', closeEmailModal);
document.getElementById('cancel-email-btn').addEventListener('click', closeEmailModal);
fileInput.addEventListener('change', handleFileAdd);
emailForm.addEventListener('submit', sendEmail);

document.addEventListener('DOMContentLoaded', async () => {
  await loadUsers();
  redrawIcons();
});

async function loadUsers() {
  try {
    allUsers = await api.get('/users');
    document.getElementById('user-count').textContent = `${allUsers.length} registered user${allUsers.length === 1 ? '' : 's'}`;
    filterUsers(searchInput.value || '');
  } catch (error) {
    const message = error.response?.data?.detail || error.message || 'Failed to load users.';
    Toast.error(message);
    usersCard.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i data-lucide="users" style="width:24px;height:24px"></i></div><p>${escapeHtml(message)}</p></div>`;
    redrawIcons();
  }
}

function filterUsers(query) {
  const value = query.trim().toLowerCase();
  filteredUsers = value
    ? allUsers.filter(user => (user.name || '').toLowerCase().includes(value) || (user.email || '').toLowerCase().includes(value))
    : [...allUsers];

  currentPage = 1;
  renderUsers();
}

function renderUsers() {
  const total = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const start = (currentPage - 1) * PER_PAGE;
  const pageUsers = filteredUsers.slice(start, start + PER_PAGE);
  const rangeStart = total ? start + 1 : 0;
  const rangeEnd = total ? Math.min(start + PER_PAGE, total) : 0;

  usersCard.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>NAME</th>
            <th>EMAIL</th>
            <th>JOINED</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          ${pageUsers.length ? pageUsers.map(user => `
            <tr>
              <td class="bold">${escapeHtml(user.name || '--')}</td>
              <td class="text-gold">${escapeHtml(user.email)}</td>
              <td class="text-muted">${formatDate(user.created_at)}</td>
              <td>
                <button type="button" class="btn btn-outline btn-sm" onclick="openEmailModal('${escapeAttr(user.id)}')">
                  <i data-lucide="mail" style="width:12px;height:12px"></i>
                  Send Email
                </button>
              </td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="4">
                <div class="empty-state" style="padding:28px 12px">
                  <div class="empty-state-icon"><i data-lucide="search-x" style="width:22px;height:22px"></i></div>
                  <p style="margin:0">${allUsers.length ? 'No users match your search.' : 'No users registered yet.'}</p>
                </div>
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
    <div class="pagination">
      <span>Showing ${rangeStart}-${rangeEnd} of ${total} users</span>
      <div class="flex gap-2">
        <button type="button" class="btn btn-outline btn-sm" onclick="changeUsersPage(-1)" ${currentPage === 1 ? 'disabled' : ''}>Prev</button>
        <button type="button" class="btn btn-outline btn-sm" onclick="changeUsersPage(1)" ${currentPage >= totalPages || total === 0 ? 'disabled' : ''}>Next</button>
      </div>
    </div>
  `;

  redrawIcons();
}

function changePage(step) {
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PER_PAGE));
  currentPage = Math.min(totalPages, Math.max(1, currentPage + step));
  renderUsers();
}

function openEmailModal(userId) {
  selectedUser = allUsers.find(user => user.id === userId) || null;
  if (!selectedUser) return;

  document.getElementById('email-modal-title').textContent = `Send Email to ${selectedUser.name || selectedUser.email}`;
  document.getElementById('modal-recipient').textContent = `${selectedUser.name || 'Recipient'} - ${selectedUser.email}`;
  emailForm.reset();
  attachedFiles.length = 0;
  renderFileList();
  emailModal.classList.remove('hidden');
  redrawIcons();
}

function closeEmailModal() {
  emailModal.classList.add('hidden');
  selectedUser = null;
}

function handleFileAdd(event) {
  Array.from(event.target.files || []).forEach(file => {
    if (file.size > 5 * 1024 * 1024) {
      Toast.error(`${file.name} exceeds the 5MB limit.`);
      return;
    }
    attachedFiles.push(file);
  });

  event.target.value = '';
  renderFileList();
}

function renderFileList() {
  fileList.innerHTML = attachedFiles.map((file, index) => `
    <div class="card" style="padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:none">
      <div>
        <div style="color:var(--text-primary);font-weight:600">${escapeHtml(file.name)}</div>
        <div class="text-muted" style="font-size:12px">${formatFileSize(file.size)}</div>
      </div>
      <button type="button" class="btn-icon" onclick="removeAttachment(${index})" aria-label="Remove attachment">
        <i data-lucide="x" style="width:14px;height:14px"></i>
      </button>
    </div>
  `).join('');
  redrawIcons();
}

function removeAttachment(index) {
  attachedFiles.splice(index, 1);
  renderFileList();
}

async function sendEmail(event) {
  event.preventDefault();
  if (!selectedUser) return;

  sendButton.disabled = true;
  sendButton.innerHTML = '<span class="spinner"></span><span>Sending...</span>';

  try {
    const attachments = await Promise.all(attachedFiles.map(async file => ({
      name: file.name,
      mime_type: file.type || 'application/octet-stream',
      data: await toBase64(file)
    })));

    await api.post('/email/send-direct', {
      to: selectedUser.email,
      subject: document.getElementById('email-subject').value.trim(),
      body: document.getElementById('email-body').value.replace(/\n/g, '<br>'),
      attachments: attachments.length ? attachments : undefined
    });

    Toast.success(`Email sent to ${selectedUser.name || selectedUser.email}.`);
    closeEmailModal();
  } catch (error) {
    Toast.error(error.response?.data?.detail || error.message || 'Failed to send email.');
  } finally {
    sendButton.disabled = false;
    sendButton.innerHTML = '<i data-lucide="send" style="width:14px;height:14px"></i><span>Send Email</span>';
    redrawIcons();
  }
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function formatFileSize(value) {
  if (value < 1024) return `${value} B`;
  if (value < 1048576) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1048576).toFixed(1)} MB`;
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
