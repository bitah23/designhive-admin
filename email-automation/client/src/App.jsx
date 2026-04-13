import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Lazy load pages for performance
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Users = lazy(() => import('./pages/Users'));
const Templates = lazy(() => import('./pages/Templates'));
const Campaign = lazy(() => import('./pages/Campaign'));
const Logs = lazy(() => import('./pages/Logs'));
const Scheduled = lazy(() => import('./pages/Scheduled'));
const TestPreview = lazy(() => import('./pages/TestPreview'));
const Settings = lazy(() => import('./pages/Settings'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Layout = lazy(() => import('./components/Layout'));

const LoadingFallback = () => (
  <div className="d-flex align-items-center justify-content-center vh-100 bg-deep overflow-hidden position-relative">
    <div className="position-absolute top-50 start-50 translate-middle bg-gold opacity-10 blur-3xl rounded-circle" style={{ width: '300px', height: '300px' }}></div>
    <div className="text-center position-relative z-2">
      <div className="spinner-grow text-gold" role="status" style={{ width: '4rem', height: '4rem' }}>
         <span className="visually-hidden">Loading...</span>
      </div>
      <p className="mt-4 fw-bold text-gold opacity-80 small ls-wider text-uppercase">Synching Neural Hive...</p>
    </div>
    <style>{`
      .bg-deep { background-color: #0A0A0F; }
      .text-gold { color: #FACC15; }
      .ls-wider { letter-spacing: 0.2em; }
      .blur-3xl { filter: blur(64px); }
    `}</style>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  return token ? children : <Navigate to="/admin/login" />;
};

function App() {
  return (
    <Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '16px',
            background: '#11131A',
            color: '#fff',
            fontWeight: '600',
            border: '1px solid rgba(250, 204, 21, 0.1)',
            padding: '12px 24px',
            fontSize: '0.85rem'
          },
          success: {
            iconTheme: {
              primary: '#FACC15',
              secondary: '#000',
            },
          },
        }}
      />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/admin/login" element={<Login />} />
          
          <Route path="/admin" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="templates" element={<Templates />} />
            <Route path="campaign" element={<Campaign />} />
            <Route path="logs" element={<Logs />} />
            <Route path="scheduled" element={<Scheduled />} />
            <Route path="test-preview" element={<TestPreview />} />
            <Route path="settings" element={<Settings />} />
            <Route path="analytics" element={<Analytics />} />
          </Route>

          <Route path="/" element={<Navigate to="/admin" />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
