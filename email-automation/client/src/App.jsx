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
  <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
    <div className="text-center">
      <div className="spinner-grow text-primary" role="status" style={{ width: '3rem', height: '3rem' }}></div>
      <p className="mt-3 fw-bold text-primary opacity-75 small ls-wide">INITIALIZING FLOW...</p>
    </div>
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
            borderRadius: '12px',
            background: '#333',
            color: '#fff',
            fontWeight: 'bold',
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
