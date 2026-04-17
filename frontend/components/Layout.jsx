import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard, Users, FileText, Send, History, Settings, LogOut,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/users',     icon: Users,           label: 'Users' },
  { href: '/templates', icon: FileText,         label: 'Templates' },
  { href: '/campaign',  icon: Send,             label: 'Campaign' },
  { href: '/logs',      icon: History,          label: 'Logs' },
  { href: '/settings',  icon: Settings,         label: 'Settings' },
];

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/users':     'Users',
  '/templates': 'Email Templates',
  '/campaign':  'Campaign',
  '/logs':      'Email Logs',
  '/settings':  'Settings',
};

export default function Layout({ children }) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    router.replace('/login');
  };

  return (
    <div className="app-shell">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <p className="fw-bold text-white mb-0" style={{ fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
            Design<span className="text-gold">Hive</span>
          </p>
          <p className="mb-0" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Admin Panel
          </p>
        </div>

        <nav className="sidebar-nav">
          <p className="label-upper mb-2 ps-2">Menu</p>
          {NAV.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${router.pathname === href ? 'active' : ''}`}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-link logout" onClick={handleLogout}>
            <LogOut size={17} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Area ───────────────────────────────────────── */}
      <div className="main-area">
        <header className="topbar d-flex align-items-center justify-content-between">
          <h6 className="fw-bold text-white mb-0">
            {PAGE_TITLES[router.pathname] || 'DesignHive Admin'}
          </h6>
          <span
            className="fw-bold"
            style={{ fontSize: '0.7rem', color: 'var(--gold)', border: '1px solid rgba(250,204,21,0.2)', background: 'rgba(250,204,21,0.05)', padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.06em' }}
          >
            ADMIN
          </span>
        </header>

        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
