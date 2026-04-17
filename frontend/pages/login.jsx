import { useState } from 'react';
import { useRouter } from 'next/router';
import { Mail, Lock, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('adminToken', data.token);
      router.replace('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="glass-card p-5" style={{ width: '100%', maxWidth: '420px' }}>

        {/* Header */}
        <div className="text-center mb-5">
          <h3 className="fw-bold text-white mb-1">
            Design<span className="text-gold">Hive</span>
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sign in to your admin panel</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="mb-4">
            <label className="label-upper d-block mb-2">Email</label>
            <div className="input-icon-wrap">
              <div className="icon-slot"><Mail size={15} className="text-gold" /></div>
              <input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-5">
            <label className="label-upper d-block mb-2">Password</label>
            <div className="input-icon-wrap">
              <div className="icon-slot"><Lock size={15} className="text-gold" /></div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary w-100 py-3 d-flex align-items-center justify-content-center gap-2"
            style={{ borderRadius: '12px', fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading
              ? <span className="spinner-border spinner-border-sm" />
              : <><LogIn size={17} /> Sign In</>}
          </button>
        </form>
      </div>
    </div>
  );
}
