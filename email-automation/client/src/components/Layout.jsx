import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users as UsersIcon,
  FileText,
  Send,
  History,
  Calendar,
  Eye,
  Settings,
  BarChart3,
  LogOut,
  Mail,
  Bell,
  Search,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  const menuItems = [
    { path: '/admin', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { path: '/admin/users', icon: <UsersIcon size={18} />, label: 'Users' },
    { path: '/admin/templates', icon: <FileText size={18} />, label: 'Templates' },
    { path: '/admin/campaign', icon: <Send size={18} />, label: 'Campaigns' },
    { path: '/admin/logs', icon: <History size={18} />, label: 'Audit Logs' },
    { path: '/admin/scheduled', icon: <Calendar size={18} />, label: 'Scheduler' },
    { path: '/admin/test-preview', icon: <Eye size={18} />, label: 'Simulator' },
    { path: '/admin/settings', icon: <Settings size={18} />, label: 'Settings' }
  ];

  return (
    <div className="container-fluid p-0 overflow-hidden vh-100 bg-deep d-flex text-secondary">
      {/* Sidebar */}
      <div className="bg-section d-flex flex-column flex-shrink-0 border-end border-white border-opacity-5" style={{ width: '240px', transition: '0.3s' }}>
        <div className="p-4 mb-2 d-flex align-items-center justify-content-center">
          <img src="/logo.png" alt="Design Hive" style={{ maxHeight: '80px', objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(250, 204, 21, 0.4))' }} />
        </div>

        <div className="px-3 py-2 flex-grow-1 overflow-auto custom-scrollbar">
          <small className="text-uppercase text-muted fw-bold ls-wider ps-2 mb-3 d-block" style={{ fontSize: '0.6rem' }}>Admin Console</small>
          <ul className="nav nav-pills flex-column mb-auto gap-1">
            {menuItems.map((item) => (
              <li className="nav-item" key={item.path}>
                <Link
                  to={item.path}
                  className={`nav-link d-flex align-items-center gap-3 px-3 py-2 fw-medium border-0 transition-all ${location.pathname === item.path ? 'active bg-gold text-black shadow-gold' : 'text-secondary hover-bg-white-5'}`}
                  style={{ borderRadius: '12px', fontSize: '0.85rem' }}
                >
                  <span className={location.pathname === item.path ? 'text-black' : 'text-gold'}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 mt-auto border-top border-white border-opacity-5">
          <button
            onClick={handleLogout}
            className="nav-link d-flex align-items-center gap-3 px-3 py-2 fw-medium text-danger border-0 w-100 text-start hover-bg-danger-10 rounded-3 small"
            style={{ background: 'transparent' }}
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow-1 d-flex flex-column overflow-hidden">
        {/* Topbar */}
        <header className="px-4 py-3 d-flex align-items-center justify-content-between border-bottom border-white border-opacity-5 glass-effect z-3">
          <div className="d-flex align-items-center gap-3 w-50">
            <div className="d-flex align-items-center bg-card rounded-3 border border-white border-opacity-10 px-3 py-1" style={{ maxWidth: '350px', flex: 1, transition: '0.2s', focusWithin: { borderColor: '#FACC15' } }}>
              <Search size={16} className="text-muted me-2" />
              <input
                type="text"
                className="bg-transparent border-0 text-white small w-100 placeholder-muted"
                placeholder="Search resources..."
                style={{ outline: 'none', boxShadow: 'none' }}
              />
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div className="text-gold fw-bold text-center small ls-wide border px-3 py-1 rounded-pill" style={{ backgroundColor: 'rgba(250, 204, 21, 0.05)', borderColor: 'rgba(250, 204, 21, 0.2)' }}>
              AI CORE v3.0
            </div>
            <div className="vr mx-2 bg-secondary opacity-20" style={{ height: '24px' }}></div>
            <div className="bg-card border border-white border-opacity-5 rounded-circle p-2 text-muted glow-hover cursor-pointer position-relative">
              <Bell size={18} color="#9CA3AF" />
              <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-white border-2 rounded-circle"></span>
            </div>
            <div className="bg-card border border-white border-opacity-5 rounded-circle p-2 text-muted glow-hover cursor-pointer">
              <User size={18} color="#9CA3AF" />
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-grow-1 overflow-auto p-4 p-xl-5 bg-deep custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <style>{`
        .bg-deep { background-color: #0A0A0F; }
        .bg-section { background-color: #161A23; }
        .bg-card { background-color: #11131A; }
        .glass-effect { background: rgba(10, 10, 15, 0.8); backdrop-filter: blur(10px); }
        .hover-bg-white-5:hover { background-color: rgba(255,255,255,0.05); color: #fff; }
        .hover-bg-danger-10:hover { background-color: rgba(220,53,69,0.1); }
        .transition-all { transition: all 0.25s ease-out; }
        .letter-spacing--1 { letter-spacing: -0.05em; }
        .shadow-gold { box-shadow: 0 0 15px var(--accent-glow); }
        .glow-hover:hover { box-shadow: 0 0 15px var(--accent-glow); border-color: var(--accent-yellow); }
        .cursor-pointer { cursor: pointer; }
        .ls-wide { letter-spacing: 0.05em; }
      `}</style>
    </div>
  );
};

export default Layout;
