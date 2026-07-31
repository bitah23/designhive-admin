/**
 * App shell: sidebar, topbar, command palette, and the welcome overlay.
 *
 * Every authenticated page ships an empty `#sidebar` / `#topbar` and this file
 * fills them in, so navigation lives in exactly one place.
 */

// Grouping the seven destinations makes the sidebar scannable instead of a flat
// list, and gives each item a home when new pages are added.
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard.html', icon: 'layout-dashboard', label: 'Dashboard' },
    ],
  },
  {
    label: 'Messaging',
    items: [
      { href: '/templates.html', icon: 'file-text', label: 'Templates' },
      { href: '/campaign.html', icon: 'send', label: 'Campaign' },
      { href: '/users.html', icon: 'users', label: 'Users' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/agents.html', icon: 'bot', label: 'Agents' },
      { href: '/logs.html', icon: 'history', label: 'Logs' },
      { href: '/settings.html', icon: 'settings', label: 'Settings' },
    ],
  },
];

const NAV_ITEMS = NAV_GROUPS.flatMap(group => group.items);

const PAGE_META = {
  '/dashboard.html': { title: 'Dashboard', subtitle: 'System-wide campaign health and recent template activity' },
  '/users.html': { title: 'Users', subtitle: 'Search recipients and send direct outreach' },
  '/templates.html': { title: 'Email Templates', subtitle: 'Create, preview, edit, and remove reusable email content' },
  '/campaign.html': { title: 'Campaign', subtitle: 'Choose one template and a recipient segment, then send' },
  '/agents.html': { title: 'Agents', subtitle: 'Monitor, trigger, and manage the automated agents' },
  '/logs.html': { title: 'Email Logs', subtitle: 'Inspect send history, statuses, timestamps, and errors' },
  '/settings.html': { title: 'Settings', subtitle: 'Manage admins and update account security' },
};

const SIDEBAR_KEY = 'sidebarCollapsed';
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || '');

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

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

/** Best-effort display name from the JWT — "jane.doe@x.com" becomes "Jane Doe". */
function adminDisplayName(admin) {
  const identity = admin?.email || admin?.sub || admin?.id || '';
  if (typeof identity !== 'string' || !identity) return 'Admin';
  if (!identity.includes('@')) return identity;
  return identity
    .split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

function renderSidebar(path) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const groupsHTML = NAV_GROUPS.map(group => `
    <div class="nav-group">
      <div class="nav-group-label">${group.label}</div>
      ${group.items.map(item => {
        const active = path === item.href;
        return `
          <a href="${item.href}" class="nav-link${active ? ' active' : ''}"
             ${active ? 'aria-current="page"' : ''} data-tooltip="${item.label}">
            <i data-lucide="${item.icon}" style="width:16px;height:16px;flex-shrink:0"></i>
            <span class="nav-link-label">${item.label}</span>
          </a>`;
      }).join('')}
    </div>`).join('');

  const admin = getCurrentAdmin();
  const name = adminDisplayName(admin);

  // Glyph and wordmark sit side by side as one lockup: the hexagon on the left,
  // the wordmark and its caption stacked to its right and sharing a baseline
  // grid. The wordmark asset carries no hexagon of its own, so the mark appears
  // exactly once. The collapse control lives in the topbar so nothing competes
  // with the lockup for horizontal space.
  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <a href="/dashboard.html" class="sidebar-logo-link" aria-label="DesignHive Admin — dashboard">
        <img class="brand-glyph" src="/assets/brand/logo-glyph.png" alt="">
        <span class="brand-text">
          <img class="brand-wordmark" src="/assets/brand/logo-wordmark.png" alt="Design Hive">
          <span class="brand-caption">Admin Console</span>
        </span>
      </a>
    </div>

    <nav class="sidebar-nav" aria-label="Primary">
      ${groupsHTML}
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-user" data-tooltip="${escapeHtml(name)}">
        <span class="sidebar-avatar" aria-hidden="true">${escapeHtml(name.charAt(0).toUpperCase())}</span>
        <span class="sidebar-user-copy">
          <span class="sidebar-user-name">${escapeHtml(name)}</span>
          <span class="sidebar-user-role">Administrator</span>
        </span>
      </div>
      <button class="nav-link logout" type="button" onclick="logout()" data-tooltip="Sign out">
        <i data-lucide="log-out" style="width:16px;height:16px;flex-shrink:0"></i>
        <span class="nav-link-label">Sign Out</span>
      </button>
    </div>
  `;
}

function renderTopbar(meta) {
  const topbar = document.getElementById('topbar');
  if (!topbar) return;

  topbar.innerHTML = `
    <div class="topbar-left">
      <button class="mobile-menu-btn" id="mobile-toggle" aria-label="Open navigation" aria-expanded="false">
        <i data-lucide="menu" style="width:20px;height:20px"></i>
      </button>
      <button type="button" class="sidebar-collapse-btn" id="sidebar-collapse"
              aria-label="Toggle sidebar" title="Toggle sidebar">
        <i data-lucide="panel-left" style="width:17px;height:17px"></i>
      </button>
      <div class="page-title-group">
        <h1 class="page-title">${meta.title}</h1>
        <p class="page-subtitle">${meta.subtitle}</p>
      </div>
    </div>
    <div class="topbar-right">
      <button type="button" class="command-trigger" id="command-trigger"
              aria-label="Open command palette">
        <i data-lucide="search" style="width:14px;height:14px"></i>
        <span class="command-trigger-text">Jump to…</span>
        <kbd>${isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>
      <span class="admin-badge">Admin</span>
    </div>
  `;
}

function initSidebarBehaviour() {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('mobile-toggle');
  const collapseBtn = document.getElementById('sidebar-collapse');

  // Desktop: a persisted rail mode that trades labels for content width.
  if (localStorage.getItem(SIDEBAR_KEY) === 'true') {
    document.body.classList.add('sidebar-collapsed');
  }
  collapseBtn?.addEventListener('click', () => {
    const collapsed = document.body.classList.toggle('sidebar-collapsed');
    localStorage.setItem(SIDEBAR_KEY, String(collapsed));
  });

  // Mobile: off-canvas drawer with a backdrop.
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }

  const closeDrawer = () => {
    document.body.classList.remove('sidebar-open');
    toggleBtn?.setAttribute('aria-expanded', 'false');
  };

  toggleBtn?.addEventListener('click', () => {
    const open = document.body.classList.toggle('sidebar-open');
    toggleBtn.setAttribute('aria-expanded', String(open));
  });

  overlay.addEventListener('click', closeDrawer);
  sidebar?.addEventListener('click', event => {
    if (event.target.closest('.nav-link')) closeDrawer();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeDrawer();
  });
}

// ---------------------------------------------------------------------------
// Command palette — ⌘K / Ctrl+K
// ---------------------------------------------------------------------------

const COMMAND_ACTIONS = [
  { label: 'New template', hint: 'Templates', icon: 'plus', href: '/templates.html?new=1' },
  { label: 'Send a campaign', hint: 'Campaign', icon: 'send', href: '/campaign.html' },
  { label: 'Review failed sends', hint: 'Logs', icon: 'alert-circle', href: '/logs.html?status=failed' },
  { label: 'Add an admin', hint: 'Settings', icon: 'user-plus', href: '/settings.html' },
  { label: 'Sign out', hint: 'Session', icon: 'log-out', action: logout },
];

function initCommandPalette() {
  const commands = [
    ...NAV_ITEMS.map(item => ({
      label: item.label,
      hint: 'Go to page',
      icon: item.icon,
      href: item.href,
    })),
    ...COMMAND_ACTIONS,
  ];

  const palette = document.createElement('div');
  palette.className = 'command-palette';
  palette.hidden = true;
  palette.innerHTML = `
    <div class="command-backdrop" data-command-close></div>
    <div class="command-box" role="dialog" aria-modal="true" aria-label="Command palette">
      <div class="command-input-row">
        <i data-lucide="search" style="width:16px;height:16px;color:var(--text-muted)"></i>
        <input type="text" id="command-input" placeholder="Search pages and actions…"
               autocomplete="off" spellcheck="false" aria-label="Search pages and actions">
        <kbd>Esc</kbd>
      </div>
      <ul class="command-results" id="command-results" role="listbox"></ul>
    </div>
  `;
  document.body.appendChild(palette);

  const input = palette.querySelector('#command-input');
  const results = palette.querySelector('#command-results');
  let matches = commands;
  let cursor = 0;

  function render() {
    if (!matches.length) {
      results.innerHTML = '<li class="command-empty">No matches</li>';
      return;
    }
    results.innerHTML = matches.map((cmd, index) => `
      <li class="command-item${index === cursor ? ' selected' : ''}"
          role="option" aria-selected="${index === cursor}" data-index="${index}">
        <i data-lucide="${cmd.icon}" style="width:15px;height:15px"></i>
        <span class="command-label">${escapeHtml(cmd.label)}</span>
        <span class="command-hint">${escapeHtml(cmd.hint)}</span>
      </li>`).join('');
    lucide.createIcons({ root: results });
  }

  function filter(query) {
    const needle = query.trim().toLowerCase();
    matches = needle
      ? commands.filter(cmd => `${cmd.label} ${cmd.hint}`.toLowerCase().includes(needle))
      : commands;
    cursor = 0;
    render();
  }

  function run(cmd) {
    if (!cmd) return;
    close();
    if (cmd.action) cmd.action();
    else window.location.href = cmd.href;
  }

  function open() {
    palette.hidden = false;
    input.value = '';
    filter('');
    input.focus();
  }

  function close() {
    palette.hidden = true;
  }

  input.addEventListener('input', () => filter(input.value));

  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      cursor = (cursor + 1) % Math.max(matches.length, 1);
      render();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      cursor = (cursor - 1 + matches.length) % Math.max(matches.length, 1);
      render();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(matches[cursor]);
    } else if (event.key === 'Escape') {
      close();
    }
  });

  results.addEventListener('click', event => {
    const item = event.target.closest('.command-item');
    if (item) run(matches[Number(item.dataset.index)]);
  });

  palette.querySelector('[data-command-close]').addEventListener('click', close);
  document.getElementById('command-trigger')?.addEventListener('click', open);

  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      palette.hidden ? open() : close();
    }
  });
}

// ---------------------------------------------------------------------------
// Post-login welcome
// ---------------------------------------------------------------------------

function showWelcomeMessage() {
  if (localStorage.getItem('showWelcome') !== 'true') return;

  const name = adminDisplayName(getCurrentAdmin());
  const overlay = document.createElement('div');
  overlay.className = 'welcome-overlay';
  overlay.innerHTML = `
    <div class="welcome-card" role="dialog" aria-modal="true" aria-label="Welcome">
      <div class="welcome-icon-wrap">
        <i data-lucide="sparkles" style="width:44px;height:44px"></i>
      </div>
      <h2 class="welcome-title">Welcome back, ${escapeHtml(name)}</h2>
      <p class="welcome-subtitle">
        Mission control is ready. Press
        <kbd>${isMac ? '⌘' : 'Ctrl'} K</kbd> at any time to jump straight to a page or action.
      </p>
      <button class="btn btn-primary welcome-action-btn" id="welcome-dismiss">
        <span>Enter dashboard</span>
        <i data-lucide="arrow-right" style="width:18px;height:18px"></i>
      </button>
    </div>
  `;

  document.body.appendChild(overlay);
  lucide.createIcons({ root: overlay });

  const dismiss = () => {
    overlay.classList.remove('active');
    localStorage.removeItem('showWelcome');
    setTimeout(() => overlay.remove(), 400);
  };

  requestAnimationFrame(() => overlay.classList.add('active'));
  overlay.querySelector('#welcome-dismiss').addEventListener('click', dismiss);
  overlay.addEventListener('click', event => {
    if (event.target === overlay) dismiss();
  });
  document.addEventListener('keydown', function onEsc(event) {
    if (event.key === 'Escape') {
      dismiss();
      document.removeEventListener('keydown', onEsc);
    }
  }, { once: false });
}

// ---------------------------------------------------------------------------

function initLayout() {
  const path = window.location.pathname;
  const meta = PAGE_META[path] || { title: 'DesignHive Admin', subtitle: 'Admin tools' };

  document.title = `${meta.title} · DesignHive Admin`;

  renderSidebar(path);
  renderTopbar(meta);
  initSidebarBehaviour();
  initCommandPalette();
  lucide.createIcons();
}

window.DesignHiveLayout = { getCurrentAdmin, adminDisplayName, NAV_ITEMS };

function init() {
  initLayout();
  showWelcomeMessage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
