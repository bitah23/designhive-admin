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
  User,
  ShieldCheck
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
    { path: '/admin/campaign', icon: <Send size={18} />, label: 'Send Email' },
    { path: '/admin/logs', icon: <History size={18} />, label: 'Email Logs' },
    { path: '/admin/scheduled', icon: <Calendar size={18} />, label: 'Scheduled' },
    { path: '/admin/test-preview', icon: <Eye size={18} />, label: 'Test & Preview' },
    { path: '/admin/settings', icon: <Settings size={18} />, label: 'Settings' },
    { path: '/admin/analytics', icon: <BarChart3 size={18} />, label: 'Analytics' },
  ];

  return (
    <div className="container-fluid p-0 overflow-hidden vh-100 bg-light d-flex">
      {/* Sidebar */}
      <div className="bg-dark d-flex flex-column flex-shrink-0 shadow-lg" style={{ width: '260px', transition: '0.3s' }}>
        <div className="p-4 mb-3 d-flex align-items-center gap-3 border-bottom border-white border-opacity-10">
          <div className="bg-primary p-2 rounded-3 shadow-primary">
            <Mail className="text-white" size={20} />
          </div>
          <span className="fs-5 fw-bold text-white letter-spacing--1">EmailFlow</span>
        </div>

        <div className="px-3 py-2 flex-grow-1 overflow-auto custom-scrollbar">
          <small className="text-uppercase text-muted fw-bold ls-wider ps-2 mb-3 d-block" style={{ fontSize: '0.65rem' }}>Main Console</small>
          <ul className="nav nav-pills flex-column mb-auto gap-1">
            {menuItems.map((item) => (
              <li className="nav-item" key={item.path}>
                <Link 
                  to={item.path} 
                  className={`nav-link d-flex align-items-center gap-3 px-3 py-2 fw-medium border-0 transition-all ${location.pathname === item.path ? 'active bg-primary' : 'text-white text-opacity-70 hover-bg-white-10'}`}
                  style={{ borderRadius: '10px', fontSize: '0.9rem' }}
                >
                  <span className={location.pathname === item.path ? 'text-white' : 'text-primary'}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 mt-auto border-top border-white border-opacity-10">
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
        <header className="bg-white border-bottom px-4 py-3 d-flex align-items-center justify-content-between shadow-sm z-3">
          <div className="d-flex align-items-center gap-3 w-50">
             <div className="input-group input-group-sm bg-light rounded-3 border-0 px-2" style={{ maxWidth: '400px' }}>
                <span className="input-group-text bg-transparent border-0 text-muted">
                  <Search size={16} />
                </span>
                <input type="text" className="form-control bg-transparent border-0 shadow-none ps-0" placeholder="System Search..." />
             </div>
          </div>
          
          <div className="d-flex align-items-center gap-3">
             <div className="bg-primary bg-opacity-10 text-primary fw-bold text-center rounded-3 p-1 px-3 small border border-primary border-opacity-25">
                ADMIN CONSOLE
             </div>
             <div className="vr mx-2 bg-secondary opacity-25" style={{ height: '32px' }}></div>
             <div className="bg-light rounded-circle p-2 text-muted">
                <User size={18} />
             </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-grow-1 overflow-auto p-4 p-lg-5 bg-light-gray custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <style>{`
        .hover-bg-white-10:hover { background-color: rgba(255,255,255,0.08); }
        .hover-bg-danger-10:hover { background-color: rgba(220,53,69,0.1); }
        .transition-all { transition: all 0.2s ease-in-out; }
        .bg-light-gray { background-color: #f8fafc; }
        .letter-spacing--1 { letter-spacing: -0.05em; }
        .shadow-primary { box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.4); }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Layout;
