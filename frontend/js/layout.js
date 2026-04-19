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
      <span class="admin-badge">Admin</span>
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

function showWelcomeMessage() {
  try {
    const showWelcome = localStorage.getItem('showWelcome');
    if (showWelcome !== 'true') return;

    const admin = getCurrentAdmin();
    let adminName = 'Admin';
    
    if (admin) {
      const namePart = admin.email || admin.sub || admin.id || '';
      if (namePart && typeof namePart === 'string' && namePart.includes('@')) {
        adminName = namePart.split('@')[0].split(/[._-]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
      } else if (namePart) {
        adminName = namePart;
      }
    }

    const overlay = document.createElement('div');
    overlay.className = 'welcome-overlay';
    overlay.innerHTML = `
      <div class="welcome-card">
        <div class="welcome-icon-wrap">
          <i data-lucide="sparkles" style="width:48px;height:48px"></i>
        </div>
        <h1 class="welcome-title">Welcome Back, ${adminName}!</h1>
        <p class="welcome-subtitle">Mission control is fully operational. We've prepared everything for your next campaign.</p>
        <div class="flex-center" style="justify-content:center">
          <button class="btn btn-primary welcome-action-btn" id="welcome-dismiss">
            <span>Enter Dashboard</span>
            <i data-lucide="arrow-right" style="width:18px;height:18px"></i>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons({
        nameAttr: 'data-lucide'
      });
    }

    setTimeout(() => {
      overlay.classList.add('active');
    }, 400);

    const dismissBtn = document.getElementById('welcome-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        overlay.classList.remove('active');
        setTimeout(() => {
          overlay.remove();
          localStorage.removeItem('showWelcome');
        }, 800);
      });
    }
  } catch (err) {
    console.error('Welcome message error:', err);
  }
}

window.DesignHiveLayout = {
  getCurrentAdmin
};

function init() {
  initLayout();
  showWelcomeMessage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
