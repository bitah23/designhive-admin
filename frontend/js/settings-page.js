let admins = [];
let currentAdminId = null;

const adminList = document.getElementById('admin-list');
const addAdminForm = document.getElementById('add-admin-form');
const addAdminBtn = document.getElementById('add-admin-btn');
const sendOtpBtn = document.getElementById('send-otp-btn');
const passwordStepIdle = document.getElementById('pw-step-idle');
const passwordStepForm = document.getElementById('pw-step-form');
const updatePwBtn = document.getElementById('update-pw-btn');

window.toggleAdmin = toggleAdmin;
window.deleteAdmin = deleteAdmin;
window.sendOtp = sendOtp;
window.confirmReset = confirmReset;
window.cancelReset = cancelReset;
window.togglePwVisibility = toggleResetPasswords;
window.loadAdmins = loadAdmins;

document.getElementById('reset-password-toggle')?.addEventListener('click', toggleResetPasswords);
document.getElementById('cancel-reset-btn')?.addEventListener('click', cancelReset);
addAdminForm?.addEventListener('submit', addAdmin);

document.addEventListener('DOMContentLoaded', async () => {
  currentAdminId = window.DesignHiveLayout?.getCurrentAdmin?.()?.id || null;
  await loadAdmins();
  redrawIcons();
});

async function loadAdmins() {
  try {
    admins = await api.get('/admins');
    renderAdminList();
  } catch (error) {
    Toast.error(error.response?.data?.detail || error.message || 'Failed to load admins.');
  }
}

function renderAdminList() {
  if (!admins.length) {
    adminList.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="users" style="width:24px;height:24px"></i></div><p>No admin accounts found.</p></div>';
    redrawIcons();
    return;
  }

  adminList.innerHTML = admins.map(admin => {
    const isSelf = admin.id === currentAdminId;
    const isActive = admin.is_active !== false;
    return `
      <div class="admin-row">
        <div class="flex-center gap-2">
          <div class="admin-avatar ${isActive ? '' : 'inactive'}">${escapeHtml((admin.name || admin.email || '?').charAt(0).toUpperCase())}</div>
          <div>
            <div class="flex-center gap-2" style="color:var(--text-primary);font-weight:700">
              <span>${escapeHtml(admin.name || '--')}</span>
              ${isSelf ? '<span class="badge badge-gold">You</span>' : ''}
            </div>
            <div class="text-muted" style="font-size:12px">${escapeHtml(admin.email)}</div>
          </div>
        </div>
        <div class="flex-center gap-2" style="flex-wrap:wrap;justify-content:flex-end">
          <span class="badge ${isActive ? 'badge-green' : 'badge-red'}">${isActive ? 'Active' : 'Inactive'}</span>
          ${!isSelf ? `
            <button type="button" class="btn btn-outline btn-sm" onclick="toggleAdmin('${escapeAttr(admin.id)}', ${isActive})">${isActive ? 'Deactivate' : 'Activate'}</button>
            <button type="button" class="btn btn-danger btn-sm" onclick="deleteAdmin('${escapeAttr(admin.id)}', '${escapeAttr(admin.email)}')">Delete</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  redrawIcons();
}

async function addAdmin(event) {
  event.preventDefault();
  const email = document.getElementById('new-email').value.trim();
  const password = document.getElementById('new-password').value;
  const name = document.getElementById('new-name').value.trim() || null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    Toast.error('Enter a valid email address.');
    return;
  }

  if (password.length < 8) {
    Toast.error('Password must be at least 8 characters.');
    return;
  }

  addAdminBtn.disabled = true;
  addAdminBtn.innerHTML = '<span class="spinner"></span><span>Adding...</span>';

  try {
    const created = await api.post('/admins', { email, password, name });
    admins.push(created);
    renderAdminList();
    addAdminForm.reset();
    Toast.success(`Admin ${created.email} added.`);
  } catch (error) {
    Toast.error(error.response?.data?.detail || error.message || 'Failed to add admin.');
  } finally {
    addAdminBtn.disabled = false;
    addAdminBtn.innerHTML = '<i data-lucide="user-plus" style="width:15px;height:15px"></i><span>Add Admin</span>';
    redrawIcons();
  }
}

async function toggleAdmin(id, isActive) {
  const confirmed = await Swal.fire({
    title: `${isActive ? 'Deactivate' : 'Activate'} admin?`,
    text: 'This change applies immediately.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: isActive ? 'Deactivate' : 'Activate',
    confirmButtonColor: isActive ? getCssVar('--danger') : getCssVar('--gold'),
    background: getCssVar('--bg-card'),
    color: getCssVar('--text-primary')
  });

  if (!confirmed.isConfirmed) return;

  try {
    const updated = await api.patch(`/admins/${id}/toggle`);
    admins = admins.map(admin => admin.id === updated.id ? updated : admin);
    renderAdminList();
    Toast.success(`Admin ${updated.is_active ? 'activated' : 'deactivated'}.`);
  } catch (error) {
    Toast.error(error.response?.data?.detail || error.message || 'Failed to update admin.');
  }
}

async function deleteAdmin(id, email) {
  const confirmed = await Swal.fire({
    title: 'Delete admin?',
    text: `Delete ${email}? This cannot be undone.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Delete',
    confirmButtonColor: getCssVar('--danger'),
    background: getCssVar('--bg-card'),
    color: getCssVar('--text-primary')
  });

  if (!confirmed.isConfirmed) return;

  try {
    await api.del(`/admins/${id}`);
    admins = admins.filter(admin => admin.id !== id);
    renderAdminList();
    Toast.success('Admin deleted.');
  } catch (error) {
    Toast.error(error.response?.data?.detail || error.message || 'Failed to delete admin.');
  }
}

async function sendOtp() {
  sendOtpBtn.disabled = true;
  sendOtpBtn.innerHTML = '<span class="spinner spinner-light"></span><span>Sending...</span>';

  try {
    await api.post('/auth/reset-request');
    passwordStepIdle.style.display = 'none';
    passwordStepForm.style.display = '';
    Toast.success('Reset code sent.');
  } catch (error) {
    Toast.error(error.response?.data?.detail || error.message || 'Failed to send reset code.');
  } finally {
    sendOtpBtn.disabled = false;
    sendOtpBtn.innerHTML = '<i data-lucide="mail" style="width:15px;height:15px"></i><span>Send Reset Code</span>';
    redrawIcons();
  }
}

async function confirmReset(event) {
  event.preventDefault();
  const otp = document.getElementById('otp-input').value.trim();
  const password = document.getElementById('new-pw').value;
  const confirmPassword = document.getElementById('confirm-pw').value;

  if (password.length < 8) {
    Toast.error('Password must be at least 8 characters.');
    return;
  }

  if (password !== confirmPassword) {
    Toast.error('Passwords do not match.');
    return;
  }

  updatePwBtn.disabled = true;
  updatePwBtn.innerHTML = '<span class="spinner"></span><span>Updating...</span>';

  try {
    await api.post('/auth/reset-password', {
      otp,
      new_password: password
    });

    Toast.success('Password updated.');
    cancelReset();
  } catch (error) {
    Toast.error(error.response?.data?.detail || error.message || 'Failed to update password.');
  } finally {
    updatePwBtn.disabled = false;
    updatePwBtn.innerHTML = '<i data-lucide="save" style="width:14px;height:14px"></i><span>Update Password</span>';
    redrawIcons();
  }
}

function cancelReset() {
  passwordStepForm.style.display = 'none';
  passwordStepIdle.style.display = '';
  passwordStepForm.reset();
}

function toggleResetPasswords() {
  const fields = [document.getElementById('new-pw'), document.getElementById('confirm-pw')];
  const button = document.getElementById('reset-password-toggle') || document.getElementById('pw-eye-btn');
  const reveal = fields[0].type === 'password';
  fields.forEach(field => { field.type = reveal ? 'text' : 'password'; });
  if (button) {
    button.setAttribute('aria-label', reveal ? 'Hide passwords' : 'Show passwords');
    button.innerHTML = reveal
      ? '<i data-lucide="eye-off" style="width:14px;height:14px"></i>'
      : '<i data-lucide="eye" style="width:14px;height:14px"></i>';
  }
  redrawIcons();
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
