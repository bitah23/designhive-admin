const NAV = [
  { href: '/dashboard.html', icon: 'layout-dashboard', label: 'Dashboard' },
  { href: '/users.html', icon: 'users', label: 'Users' },
  { href: '/templates.html', icon: 'file-text', label: 'Templates' },
  { href: '/campaign.html', icon: 'send', label: 'Campaign' },
  { href: '/logs.html', icon: 'history', label: 'Logs' },
  { href: '/settings.html', icon: 'settings', label: 'Settings' }
];

const PAGE_META = {
  '/dashboard.html': { title: 'Dashboard', subtitle: 'System-wide campaign health and recent template activity' },
  '/users.html': { title: 'Users', subtitle: 'Search recipients and send direct outreach' },
  '/templates.html': { title: 'Email Templates', subtitle: 'Create, preview, edit, and remove reusable email content' },
  '/campaign.html': { title: 'Campaign', subtitle: 'Choose one template and a recipient segment, then send' },
  '/logs.html': { title: 'Email Logs', subtitle: 'Inspect send history, statuses, timestamps, and errors' },
  '/settings.html': { title: 'Settings', subtitle: 'Manage admins and update account security' }
};

function initLayout() {
  const path = window.location.pathname;
  const meta = PAGE_META[path] || { title: 'DesignHive Admin', subtitle: 'Admin tools' };

  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    const navHTML = NAV.map(item => `
      <a href="${item.href}" class="nav-link ${path === item.href ? 'active' : ''}">
        <i data-lucide="${item.icon}" style="width:16px;height:16px;flex-shrink:0"></i>
        <span>${item.label}</span>
      </a>
    `).join('');

    sidebar.innerHTML = `
      <div class="sidebar-logo">
        <a href="/dashboard.html" class="sidebar-logo-link">
          <div class="sidebar-logo-mark">
            <img src="/assets/brand/logo.png" alt="Design Hive logo">
          </div>
          <div class="sidebar-logo-copy">
            <div class="sidebar-logo-title">DesignHive Admin</div>
            <div class="sidebar-logo-subtitle">AI operations</div>
          </div>
        </a>
      </div>
      <nav class="sidebar-nav">
        <div class="label-upper mb-2" style="padding-left:4px">Menu</div>
        ${navHTML}
      </nav>
      <div class="sidebar-footer">
        <button class="nav-link logout" type="button" onclick="logout()">
          <i data-lucide="log-out" style="width:16px;height:16px;flex-shrink:0"></i>
          <span>Sign Out</span>
        </button>
      </div>
    `;
  }

  const topbar = document.getElementById('topbar');
  if (topbar) {
    topbar.innerHTML = `
      <div class="page-title-group">
        <div class="page-title">${meta.title}</div>
        <div class="page-subtitle">${meta.subtitle}</div>
      </div>
      <span class="admin-badge">${localStorage.getItem('designhiveMockMode') === '1' ? 'Mock Mode' : 'Admin'}</span>
    `;
  }

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function logout() {
  localStorage.removeItem('adminToken');
  window.location.href = '/login.html';
}

function getCurrentAdmin() {
  const token = localStorage.getItem('adminToken');
  if (!token) return null;

  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (err) {
    return null;
  }
}

function buildPageUrl(path) {
  const params = new URLSearchParams(window.location.search);
  return localStorage.getItem('designhiveMockMode') === '1' && !params.get('mock') ? `${path}?mock=1` : path;
}

window.DesignHiveLayout = {
  getCurrentAdmin,
  buildPageUrl
};

document.addEventListener('DOMContentLoaded', initLayout);
