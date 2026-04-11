import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Mail, Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('adminToken', response.data.token);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 p-3" 
         style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="card border-0 shadow-lg overflow-hidden" 
        style={{ maxWidth: '440px', width: '100%', borderRadius: '24px' }}
      >
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-5">
            <div className="bg-primary d-inline-block p-3 rounded-4 shadow-sm mb-4">
              <ShieldCheck className="text-white" size={32} />
            </div>
            <h3 className="fw-bold text-dark mb-1">Admin Console</h3>
            <p className="text-muted small">Sign in to manage your email ecosystem</p>
          </div>

          {error && (
            <div className="alert alert-danger border-0 small text-center mb-4 py-2" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="form-label small fw-bold text-muted text-uppercase ls-wide">Email Address</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-0 px-3">
                  <Mail size={18} className="text-secondary" />
                </span>
                <input 
                  type="email" 
                  className="form-control form-control-lg bg-light border-0 shadow-sm fs-6" 
                  style={{ borderRadius: '0 12px 12px 0' }}
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="mb-5">
              <div className="d-flex justify-content-between">
                <label className="form-label small fw-bold text-muted text-uppercase ls-wide">Password</label>
              </div>
              <div className="input-group">
                <span className="input-group-text bg-light border-0 px-3">
                  <Lock size={18} className="text-secondary" />
                </span>
                <input 
                  type="password" 
                  className="form-control form-control-lg bg-light border-0 shadow-sm fs-6" 
                  style={{ borderRadius: '0 12px 12px 0' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-lg w-100 py-3 fw-bold shadow-lg border-0 d-flex align-items-center justify-content-center gap-2"
              style={{ borderRadius: '14px' }}
              disabled={loading}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm" role="status"></span>
              ) : (
                <>
                  Enter Dashboard <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
             <p className="text-muted small mb-0 opacity-50">Secure Enterprise Portal v2.0</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};


export default Login;
