import { useState, useEffect, useCallback } from 'react';
import { Shield, Key, Mail, Save, Users, UserPlus, Trash2, ToggleLeft, ToggleRight, Eye, EyeOff, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import api from '../services/api';

// ── Change Password Section ─────────────────────────────────────────
function ChangePassword() {
  const [step, setStep] = useState('idle'); // idle | sent
  const [otp, setOtp] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const requestOtp = async () => {
    setLoading(true);
    try {
      await api.post('/auth/reset-request');
      toast.success('Reset code sent to your email');
      setStep('sent');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const confirmReset = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    if (newPw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { otp, new_password: newPw });
      toast.success('Password updated successfully');
      setStep('idle'); setOtp(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-4 p-md-5">
      <div className="d-flex align-items-center gap-3 mb-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div style={{ background: 'var(--gold-dim)', borderRadius: 10, padding: 8 }}><Shield size={20} className="text-gold" /></div>
        <h6 className="fw-bold text-white mb-0">Change Password</h6>
      </div>

      {step === 'idle' ? (
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }} className="mb-4">
            A 6-digit verification code will be sent to your registered email address.
          </p>
          <button className="btn-secondary-dark d-flex align-items-center gap-2 px-4 py-2" onClick={requestOtp} disabled={loading}>
            {loading ? <span className="spinner-border spinner-border-sm" /> : <Mail size={16} />}
            Send Reset Code
          </button>
        </div>
      ) : (
        <form onSubmit={confirmReset}>
          <div className="row g-4">
            <div className="col-12">
              <label className="label-upper d-block mb-2">Verification Code</label>
              <div className="input-icon-wrap" style={{ maxWidth: 240 }}>
                <div className="icon-slot"><Key size={14} className="text-gold" /></div>
                <input placeholder="6-digit code" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} required />
              </div>
            </div>
            <div className="col-md-6">
              <label className="label-upper d-block mb-2">New Password</label>
              <div className="input-icon-wrap">
                <input type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters" value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={8} />
                <button type="button" className="icon-slot" style={{ cursor: 'pointer', border: 'none', background: 'transparent' }} onClick={() => setShowPw(v => !v)}>
                  {showPw ? <EyeOff size={14} style={{ color: 'var(--text-muted)' }} /> : <Eye size={14} style={{ color: 'var(--text-muted)' }} />}
                </button>
              </div>
            </div>
            <div className="col-md-6">
              <label className="label-upper d-block mb-2">Confirm Password</label>
              <div className="input-icon-wrap">
                <input type={showPw ? 'text' : 'password'} placeholder="Repeat password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required />
              </div>
            </div>
          </div>
          <div className="d-flex gap-3 mt-4">
            <button type="submit" className="btn btn-primary d-flex align-items-center gap-2 px-4" style={{ borderRadius: 10 }} disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm" /> : <><Save size={15} /> Update Password</>}
            </button>
            <button type="button" className="btn-secondary-dark px-4 py-2" onClick={() => setStep('idle')}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Admin Management Section ────────────────────────────────────────
function AdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentId, setCurrentId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [adding, setAdding] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admins');
      setAdmins(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      try { setCurrentId(JSON.parse(atob(token.split('.')[1])).id); } catch {}
    }
    fetchAdmins();
  }, [fetchAdmins]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setAdding(true);
    try {
      const { data } = await api.post('/admins', form);
      setAdmins(p => [...p, data]);
      setForm({ name: '', email: '', password: '' });
      toast.success(`Admin "${data.email}" added`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add admin');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (admin) => {
    const action = admin.is_active ? 'deactivate' : 'activate';
    const conf = await Swal.fire({
      title: `${admin.is_active ? 'Deactivate' : 'Activate'} Admin?`,
      text: `Are you sure you want to ${action} ${admin.email}?`,
      icon: 'warning', showCancelButton: true,
      confirmButtonText: `Yes, ${action}`,
      confirmButtonColor: admin.is_active ? '#ef4444' : '#22c55e',
      cancelButtonColor: '#374151', background: '#11131A', color: '#fff',
    });
    if (!conf.isConfirmed) return;
    try {
      const { data } = await api.patch(`/admins/${admin.id}/toggle`);
      setAdmins(p => p.map(a => a.id === data.id ? data : a));
      toast.success(`Admin ${data.is_active ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    }
  };

  const handleDelete = async (admin) => {
    const conf = await Swal.fire({
      title: 'Delete Admin?',
      text: `This will permanently delete ${admin.email}.`,
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Yes, Delete', confirmButtonColor: '#ef4444',
      cancelButtonColor: '#374151', background: '#11131A', color: '#fff',
    });
    if (!conf.isConfirmed) return;
    try {
      await api.delete(`/admins/${admin.id}`);
      setAdmins(p => p.filter(a => a.id !== admin.id));
      toast.success('Admin deleted');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    }
  };

  return (
    <div className="glass-card p-4 p-md-5">
      <div className="d-flex align-items-center justify-content-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="d-flex align-items-center gap-3">
          <div style={{ background: 'var(--gold-dim)', borderRadius: 10, padding: 8 }}><Users size={20} className="text-gold" /></div>
          <div>
            <h6 className="fw-bold text-white mb-0">Admin Accounts</h6>
            <p className="mb-0" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Manage who has access to this dashboard</p>
          </div>
        </div>
        <button className="btn-secondary-dark d-flex align-items-center gap-2 px-3 py-2" style={{ fontSize: '0.82rem' }} onClick={fetchAdmins} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'spin text-gold' : ''} /> Refresh
        </button>
      </div>

      {/* Add Admin Form */}
      <div className="mb-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="label-upper mb-3">Add New Admin</p>
        <form onSubmit={handleAdd}>
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="label-upper d-block mb-2">Name</label>
              <input className="form-control py-2" placeholder="Full name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="col-md-3">
              <label className="label-upper d-block mb-2">Email *</label>
              <input type="email" className="form-control py-2" placeholder="admin@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div className="col-md-3">
              <label className="label-upper d-block mb-2">Password *</label>
              <div className="input-icon-wrap">
                <input type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required minLength={8} />
                <button type="button" className="icon-slot" style={{ cursor: 'pointer', border: 'none', background: 'transparent' }} onClick={() => setShowPw(v => !v)}>
                  {showPw ? <EyeOff size={13} style={{ color: 'var(--text-muted)' }} /> : <Eye size={13} style={{ color: 'var(--text-muted)' }} />}
                </button>
              </div>
            </div>
            <div className="col-md-3">
              <button type="submit" className="btn btn-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2" style={{ borderRadius: 10 }} disabled={adding}>
                {adding ? <span className="spinner-border spinner-border-sm" /> : <><UserPlus size={15} /> Add Admin</>}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Admin List */}
      <div>
        <p className="label-upper mb-3">Existing Admins ({admins.length})</p>
        {loading ? (
          <div className="d-flex flex-column gap-2">
            {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 56 }} />)}
          </div>
        ) : admins.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No admin accounts found.</p>
        ) : (
          <div className="d-flex flex-column gap-2">
            {admins.map(a => {
              const isSelf = a.id === currentId;
              const isActive = a.is_active !== false;
              return (
                <div key={a.id} className="d-flex align-items-center justify-content-between px-3 py-3 rounded-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                  <div className="d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center justify-content-center rounded-circle fw-bold" style={{ width: 38, height: 38, background: isActive ? 'var(--gold-dim)' : 'rgba(255,255,255,0.04)', color: isActive ? 'var(--gold)' : 'var(--text-muted)', fontSize: '0.9rem', flexShrink: 0 }}>
                      {(a.name || a.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="fw-semibold text-white mb-0" style={{ fontSize: '0.88rem' }}>
                        {a.name || '—'}
                        {isSelf && <span className="ms-2 badge-sent" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>You</span>}
                      </p>
                      <p className="mb-0" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{a.email}</p>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className={isActive ? 'badge-active' : 'badge-inactive'}>{isActive ? 'Active' : 'Inactive'}</span>
                    {!isSelf && (
                      <>
                        <button className="btn-secondary-dark d-flex align-items-center gap-1 px-3 py-1" style={{ fontSize: '0.8rem' }} onClick={() => handleToggle(a)}>
                          {isActive ? <ToggleRight size={14} style={{ color: '#22c55e' }} /> : <ToggleLeft size={14} style={{ color: 'var(--text-muted)' }} />}
                          {isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button className="btn-secondary-dark d-flex align-items-center gap-1 px-3 py-1" style={{ fontSize: '0.8rem', borderColor: 'rgba(239,68,68,0.25)' }} onClick={() => handleDelete(a)}>
                          <Trash2 size={14} className="text-danger" /><span className="text-danger">Delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Settings Page ───────────────────────────────────────────────────
export default function Settings() {
  return (
    <div className="d-flex flex-column gap-4">
      <AdminManagement />
      <ChangePassword />
    </div>
  );
}
