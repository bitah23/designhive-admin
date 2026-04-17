let admins = [];
let currentAdminId = null;

document.addEventListener('DOMContentLoaded', () => {
  try {
    const token = localStorage.getItem('adminToken');
    if (token) currentAdminId = JSON.parse(atob(token.split('.')[1])).id;
  } catch {}
  loadAdmins();
  document.getElementById('add-admin-form').addEventListener('submit', addAdmin);
});

async function loadAdmins() {
  try {
    admins = await api.get('/admins');
    renderAdminList();
  } catch (err) {
    Toast.error(err.message);
  }
}

function renderAdminList() {
  if (admins.length === 0) {
    document.getElementById('admin-list').innerHTML = `<p style="color:var(--text-muted);font-size:0.875rem">No admin accounts found.</p>`;
    return;
  }

  document.getElementById('admin-list').innerHTML = admins.map(a => {
    const isSelf   = a.id === currentAdminId;
    const isActive = a.is_active !== false;
    const letter   = (a.name || a.email)[0].toUpperCase();

    return `
      <div class="admin-row">
        <div class="flex-center gap-2">
          <div class="admin-avatar ${isActive ? '' : 'inactive'}">${esc(letter)}</div>
          <div>
            <div style="font-weight:600;color:#fff;font-size:0.875rem">
              ${esc(a.name || '—')}
              ${isSelf ? `<span class="badge badge-gold ms-1" style="font-size:0.62rem;padding:1px 7px">You</span>` : ''}
            </div>
            <div style="font-size:0.78rem;color:var(--text-muted)">${esc(a.email)}</div>
          </div>
        </div>
        <div class="flex-center gap-2">
          <span class="badge ${isActive ? 'badge-green' : 'badge-red'}">${isActive ? 'Active' : 'Inactive'}</span>
          ${!isSelf ? `
            <button class="btn btn-secondary btn-sm" onclick="toggleAdmin('${esc(a.id)}',${isActive})">
              ${isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteAdmin('${esc(a.id)}','${esc(a.email)}')">
              <i data-lucide="trash-2" style="width:13px;height:13px"></i>
            </button>
          ` : ''}
        </div>
      </div>`;
  }).join('');

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function addAdmin(e) {
  e.preventDefault();
  const btn = document.getElementById('add-admin-btn');
  const password = document.getElementById('new-password').value;
  if (password.length < 8) { Toast.error('Password must be at least 8 characters'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const data = await api.post('/admins', {
      name:     document.getElementById('new-name').value.trim() || null,
      email:    document.getElementById('new-email').value.trim(),
      password,
    });
    admins.push(data);
    renderAdminList();
    document.getElementById('add-admin-form').reset();
    Toast.success(`Admin "${data.email}" added`);
  } catch (err) {
    Toast.error(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="user-plus" style="width:15px;height:15px"></i> Add';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

async function toggleAdmin(id, isActive) {
  const action = isActive ? 'deactivate' : 'activate';
  const conf = await Swal.fire({
    title: `${isActive ? 'Deactivate' : 'Activate'} Admin?`,
    icon: 'warning', showCancelButton: true,
    confirmButtonText: `Yes, ${action}`,
    confirmButtonColor: isActive ? '#ef4444' : '#22c55e',
    cancelButtonColor: '#374151', background: '#11131A', color: '#fff',
  });
  if (!conf.isConfirmed) return;

  try {
    const data = await api.patch(`/admins/${id}/toggle`);
    admins = admins.map(a => a.id === data.id ? data : a);
    renderAdminList();
    Toast.success(`Admin ${data.is_active ? 'activated' : 'deactivated'}`);
  } catch (err) {
    Toast.error(err.message);
  }
}

async function deleteAdmin(id, email) {
  const conf = await Swal.fire({
    title: 'Delete Admin?',
    text: `This will permanently delete ${email}.`,
    icon: 'warning', showCancelButton: true,
    confirmButtonText: 'Yes, Delete', confirmButtonColor: '#ef4444',
    cancelButtonColor: '#374151', background: '#11131A', color: '#fff',
  });
  if (!conf.isConfirmed) return;

  try {
    await api.del(`/admins/${id}`);
    admins = admins.filter(a => a.id !== id);
    renderAdminList();
    Toast.success('Admin deleted');
  } catch (err) {
    Toast.error(err.message);
  }
}

async function sendOtp() {
  const btn = document.getElementById('send-otp-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner spinner-light"></span>';
  try {
    await api.post('/auth/reset-request');
    Toast.success('Reset code sent to your email');
    document.getElementById('pw-step-idle').style.display = 'none';
    document.getElementById('pw-step-form').style.display = '';
  } catch (err) {
    Toast.error(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="mail" style="width:15px;height:15px"></i> Send Reset Code';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

async function confirmReset(e) {
  e.preventDefault();
  const newPw    = document.getElementById('new-pw').value;
  const confirmPw = document.getElementById('confirm-pw').value;
  if (newPw !== confirmPw) { Toast.error('Passwords do not match'); return; }

  const btn = document.getElementById('update-pw-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    await api.post('/auth/reset-password', {
      otp: document.getElementById('otp-input').value,
      new_password: newPw,
    });
    Toast.success('Password updated successfully');
    cancelReset();
  } catch (err) {
    Toast.error(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="save" style="width:14px;height:14px"></i> Update Password';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

function cancelReset() {
  document.getElementById('pw-step-form').style.display = 'none';
  document.getElementById('pw-step-idle').style.display = '';
  document.getElementById('pw-step-form').reset();
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
