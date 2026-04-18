const NAV = [
  { href: '/dashboard.html', icon: 'layout-dashboard', label: 'Dashboard' },
  { href: '/users.html', icon: 'users', label: 'Users' },
  { href: '/templates.html', icon: 'file-text', label: 'Templates' },
  { href: '/campaign.html', icon: 'send', label: 'Campaign' },
  { href: '/logs.html', icon: 'history', label: 'Logs' },
  { href: '/settings.html', icon: 'settings', label: 'Settings' },
];

const PAGE_TITLES = {
  '/dashboard.html': 'Dashboard',
  '/users.html': 'Users',
  '/templates.html': 'Email Templates',
  '/campaign.html': 'Campaign',
  '/logs.html': 'Email Logs',
  '/settings.html': 'Settings',
};

function initLayout() {
  if (!localStorage.getItem('adminToken')) {
    window.location.href = '/login.html';
    return;
  }

  const path = window.location.pathname;

  const navHTML = NAV.map(n => `
    <a href="${n.href}" class="nav-link ${path === n.href ? 'active' : ''}">
      <i data-lucide="${n.icon}" style="width:16px;height:16px;flex-shrink:0"></i>
      ${n.label}
    </a>`).join('');

  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.innerHTML = `
      <div class="sidebar-logo">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="background:var(--gold-dim);border-radius:10px;padding:8px;display:flex;box-shadow:0 0 15px rgba(250,204,21,0.1)">
            <i data-lucide="hexagon" style="width:20px;height:20px;color:var(--gold)"></i>
          </div>
          <div style="display:flex;flex-direction:column">
            <span style="font-size:1.4rem;font-weight:800;color:#fff;line-height:1">Design<span style="color:var(--gold)">Hive</span></span>
            <span style="font-size:0.68rem;color:var(--text-muted);letter-spacing:0.08em;margin-top:2px;font-weight:600">ADMIN CONSOLE</span>
          </div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="label-upper mb-2" style="padding-left:4px">Menu</div>
        ${navHTML}
      </nav>
      <div class="sidebar-footer">
        <button class="nav-link logout" onclick="logout()">
          <i data-lucide="log-out" style="width:16px;height:16px;flex-shrink:0"></i>
          Sign Out
        </button>
      </div>`;
  }

  const topbar = document.getElementById('topbar');
  if (topbar) {
    topbar.innerHTML = `
      <span class="page-title">${PAGE_TITLES[path] || 'DesignHive Admin'}</span>
      <span class="admin-badge">ADMIN</span>`;
  }

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function logout() {
  localStorage.removeItem('adminToken');
  window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', initLayout);
