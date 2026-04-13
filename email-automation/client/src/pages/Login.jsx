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
    <div className="d-flex align-items-center justify-content-center min-vh-100 p-3 position-relative overflow-hidden bg-deep">
      {/* Cinematic Background Glows */}
      <div className="position-absolute top-0 start-0 w-100 h-100 pointer-events-none">
        <div className="position-absolute top-0 start-50 translate-middle bg-gold opacity-10 blur-3xl rounded-circle" style={{ width: '600px', height: '600px' }}></div>
        <div className="position-absolute bottom-0 start-0 bg-gold opacity-5 blur-3xl rounded-circle" style={{ width: '400px', height: '400px', transform: 'translate(-20%, 20%)' }}></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="glass-card w-100 z-1 border-opacity-10 shadow-2xl overflow-hidden" 
        style={{ maxWidth: '440px' }}
      >
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-5">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="bg-gold d-inline-block p-3 rounded-4 shadow-gold mb-4"
            >
              <ShieldCheck className="text-black" size={32} />
            </motion.div>
            <h3 className="fw-bold text-white mb-2 ls-tight">AI Identity Hub</h3>
            <p className="text-secondary small opacity-75">Secure Gate for DesignHive Administration</p>
          </div>

          {error && (
            <motion.div 
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="alert bg-danger bg-opacity-10 text-danger border border-danger border-opacity-20 small text-center mb-4 py-2.5 rounded-3 fw-medium"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="form-label small fw-bold text-secondary text-uppercase ls-wider">Access ID</label>
              <div className="input-group glass-bg rounded-3 border border-white border-opacity-10 px-1 overflow-hidden transition-all focus-within-gold" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="input-group-text bg-transparent border-0 px-3">
                  <Mail size={18} className="text-gold" />
                </span>
                <input 
                  type="email" 
                  className="form-control form-control-lg bg-transparent border-0 shadow-none text-white fs-6 ps-2 py-3" 
                  placeholder="admin@designhiveai.com.au"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="form-label small fw-bold text-secondary text-uppercase ls-wider">Authority Key</label>
              <div className="input-group glass-bg rounded-3 border border-white border-opacity-10 px-1 overflow-hidden transition-all focus-within-gold" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="input-group-text bg-transparent border-0 px-3">
                  <Lock size={18} className="text-gold" />
                </span>
                <input 
                  type="password" 
                  className="form-control form-control-lg bg-transparent border-0 shadow-none text-white fs-6 ps-2 py-3" 
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-lg w-100 py-3 fw-bold shadow-gold border-0 d-flex align-items-center justify-content-center gap-2 transition-all"
              disabled={loading}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm" role="status"></span>
              ) : (
                <>
                  Initialize System <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
             <p className="text-muted small mb-0 opacity-40 ls-widest">ENCRYPTED PORTAL v3.0</p>
          </div>
        </div>
      </motion.div>

      <style>{`
        .bg-deep { background-color: #0A0A0F; }
        .bg-gold { background-color: #FACC15; }
        .text-gold { color: #FACC15; }
        .shadow-gold { box-shadow: 0 0 25px rgba(250, 204, 21, 0.2); }
        .blur-3xl { filter: blur(64px); }
        .ls-wider { letter-spacing: 0.1em; }
        .ls-widest { letter-spacing: 0.2em; }
        .focus-within-gold { focus-within: border-color: #FACC15 !important; }
        .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        .transition-all { transition: all 0.3s ease; }
        .input-group:focus-within { border-color: #FACC15 !important; box-shadow: 0 0 10px rgba(250, 204, 21, 0.1); }
      `}</style>
    </div>
  );
};

export default Login;
