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
  // if (!localStorage.getItem('adminToken')) {
  //   window.location.href = '/login.html';
  //   return;
  // }

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
        <div class="brand">Design<span>Hive</span></div>
        <div class="sub">Admin Panel</div>
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
