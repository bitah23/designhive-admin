import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  Shield,
  Key,
  Mail,
  Save,
  Users,
  UserPlus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

// ─── Password Reset Section ───────────────────────────────────────────────────
const PasswordResetSection = () => {
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const requestReset = async () => {
    setLoading(true);
    try {
      await api.post('/auth/reset-request');
      toast.success('Reset code sent to your email.');
      setOtpSent(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send reset code.');
    } finally {
      setLoading(false);
    }
  };

  const confirmReset = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toast.error('Passwords do not match.');
      return;
    }
    if (passwords.new.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { otp, newPassword: passwords.new });
      toast.success('Password updated successfully.');
      setOtpSent(false);
      setOtp('');
      setPasswords({ new: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card border-opacity-5 p-1">
      <div className="card-body p-4 p-md-5">
        <div className="d-flex align-items-center gap-3 mb-5 pb-4 border-bottom border-white border-opacity-5">
          <div className="bg-gold bg-opacity-10 p-2 rounded-3 text-gold shadow-gold">
            <Shield size={24} />
          </div>
          <h5 className="fw-bold m-0 text-white">Change Password</h5>
        </div>

        {!otpSent ? (
          <div>
            <p className="text-secondary small mb-4 opacity-75">
              A 6-digit verification code will be sent to your registered email address.
            </p>
            <button
              className="btn btn-darker border border-white border-opacity-10 px-5 py-3 fw-bold text-white d-flex align-items-center gap-2"
              onClick={requestReset}
              disabled={loading}
              style={{ borderRadius: '14px' }}
            >
              {loading
                ? <span className="spinner-border spinner-border-sm" />
                : <Mail size={20} />}
              Send Reset Code
            </button>
          </div>
        ) : (
          <form onSubmit={confirmReset}>
            <div className="mb-4">
              <label className="form-label small fw-bold text-secondary text-uppercase ls-wider mb-2 ps-1">
                Verification Code
              </label>
              <div className="input-group glass-bg rounded-3 border border-white border-opacity-5 px-1">
                <span className="input-group-text bg-transparent border-0">
                  <Key size={18} className="text-gold opacity-50" />
                </span>
                <input
                  type="text"
                  className="form-control bg-transparent border-0 py-3 shadow-none text-white px-3"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit code"
                  required
                />
              </div>
            </div>

            <div className="row g-4 mb-5">
              <div className="col-md-6">
                <label className="form-label small fw-bold text-secondary text-uppercase ls-wider mb-2 ps-1">
                  New Password
                </label>
                <div className="input-group rounded-3 border border-white border-opacity-5">
                  <input
                    type={showNew ? 'text' : 'password'}
                    className="form-control bg-darker border-0 py-3 shadow-none text-white px-3"
                    value={passwords.new}
                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-darker border-0"
                    onClick={() => setShowNew((v) => !v)}
                  >
                    {showNew ? <EyeOff size={16} className="text-secondary" /> : <Eye size={16} className="text-secondary" />}
                  </button>
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-bold text-secondary text-uppercase ls-wider mb-2 ps-1">
                  Confirm Password
                </label>
                <div className="input-group rounded-3 border border-white border-opacity-5">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="form-control bg-darker border-0 py-3 shadow-none text-white px-3"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-darker border-0"
                    onClick={() => setShowConfirm((v) => !v)}
                  >
                    {showConfirm ? <EyeOff size={16} className="text-secondary" /> : <Eye size={16} className="text-secondary" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="d-flex gap-3">
              <button
                type="submit"
                className="btn btn-primary px-5 py-3 fw-bold shadow-gold d-flex align-items-center gap-2 border-0"
                disabled={loading}
                style={{ borderRadius: '14px' }}
              >
                {loading ? <span className="spinner-border spinner-border-sm" /> : <Save size={20} />}
                Update Password
              </button>
              <button
                type="button"
                className="btn btn-darker border border-white border-opacity-10 px-4 py-3 fw-bold text-white"
                onClick={() => setOtpSent(false)}
                style={{ borderRadius: '14px' }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ─── Add Admin Form ───────────────────────────────────────────────────────────
const AddAdminForm = ({ onAdded }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/admins', form);
      toast.success(`Admin "${data.email}" added successfully.`);
      setForm({ name: '', email: '', password: '' });
      onAdded(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="row g-3 align-items-end">
        <div className="col-md-3">
          <label className="form-label small fw-bold text-secondary text-uppercase ls-wider mb-2 ps-1">
            Name
          </label>
          <input
            type="text"
            className="form-control bg-darker border border-white border-opacity-5 py-3 shadow-none text-white rounded-3 px-3"
            placeholder="Full name"
            value={form.name}
            onChange={handleChange('name')}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label small fw-bold text-secondary text-uppercase ls-wider mb-2 ps-1">
            Email <span className="text-danger">*</span>
          </label>
          <input
            type="email"
            className="form-control bg-darker border border-white border-opacity-5 py-3 shadow-none text-white rounded-3 px-3"
            placeholder="admin@example.com"
            value={form.email}
            onChange={handleChange('email')}
            required
          />
        </div>
        <div className="col-md-3">
          <label className="form-label small fw-bold text-secondary text-uppercase ls-wider mb-2 ps-1">
            Password <span className="text-danger">*</span>
          </label>
          <div className="input-group rounded-3 border border-white border-opacity-5">
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-control bg-darker border-0 py-3 shadow-none text-white px-3"
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={handleChange('password')}
              required
              minLength={8}
            />
            <button
              type="button"
              className="btn bg-darker border-0 rounded-end-3"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword
                ? <EyeOff size={16} className="text-secondary" />
                : <Eye size={16} className="text-secondary" />}
            </button>
          </div>
        </div>
        <div className="col-md-3">
          <button
            type="submit"
            className="btn btn-primary w-100 py-3 fw-bold d-flex align-items-center justify-content-center gap-2 border-0"
            disabled={loading}
            style={{ borderRadius: '14px' }}
          >
            {loading
              ? <span className="spinner-border spinner-border-sm" />
              : <UserPlus size={18} />}
            Add Admin
          </button>
        </div>
      </div>
    </form>
  );
};

// ─── Admin List ───────────────────────────────────────────────────────────────
const AdminList = ({ admins, currentAdminId, onToggle, onDelete }) => {
  if (admins.length === 0) {
    return (
      <p className="text-secondary small opacity-50 text-center py-3 m-0">
        No admin accounts found.
      </p>
    );
  }

  return (
    <div className="d-flex flex-column gap-2">
      {admins.map((admin) => {
        const isActive = admin.is_active !== false;
        const isSelf = admin.id === currentAdminId;

        return (
          <div
            key={admin.id}
            className="d-flex align-items-center justify-content-between p-3 rounded-3 border border-white border-opacity-5"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="d-flex align-items-center gap-3">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle fw-bold text-uppercase"
                style={{
                  width: 38,
                  height: 38,
                  background: isActive ? 'rgba(250,204,21,0.12)' : 'rgba(255,255,255,0.05)',
                  color: isActive ? '#FACC15' : '#6c757d',
                  fontSize: '0.85rem',
                  flexShrink: 0,
                }}
              >
                {(admin.name || admin.email).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="mb-0 fw-semibold text-white small">
                  {admin.name || '—'}
                  {isSelf && (
                    <span className="ms-2 badge bg-gold bg-opacity-20 text-gold" style={{ fontSize: '0.65rem' }}>
                      You
                    </span>
                  )}
                </p>
                <p className="mb-0 text-secondary opacity-60" style={{ fontSize: '0.78rem' }}>
                  {admin.email}
                </p>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <span
                className={`badge px-2 py-1 ${isActive ? 'bg-success bg-opacity-15 text-success' : 'bg-danger bg-opacity-15 text-danger'}`}
                style={{ fontSize: '0.7rem', borderRadius: '8px' }}
              >
                {isActive ? 'Active' : 'Inactive'}
              </span>

              {!isSelf && (
                <>
                  <button
                    className="btn btn-sm btn-darker border border-white border-opacity-5 d-flex align-items-center gap-1 px-3 py-2"
                    style={{ borderRadius: '10px', fontSize: '0.78rem' }}
                    onClick={() => onToggle(admin)}
                    title={isActive ? 'Deactivate' : 'Activate'}
                  >
                    {isActive
                      ? <ToggleRight size={16} className="text-success" />
                      : <ToggleLeft size={16} className="text-secondary" />}
                    <span className="text-white fw-semibold">{isActive ? 'Deactivate' : 'Activate'}</span>
                  </button>

                  <button
                    className="btn btn-sm btn-darker border border-danger border-opacity-25 d-flex align-items-center gap-1 px-3 py-2"
                    style={{ borderRadius: '10px', fontSize: '0.78rem' }}
                    onClick={() => onDelete(admin)}
                    title="Delete admin"
                  >
                    <Trash2 size={16} className="text-danger" />
                    <span className="text-danger fw-semibold">Delete</span>
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Admin Management Section ─────────────────────────────────────────────────
const AdminManagementSection = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentAdminId, setCurrentAdminId] = useState(null);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admins');
      setAdmins(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load admins.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Decode current admin id from JWT stored in localStorage
    const token = localStorage.getItem('adminToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentAdminId(payload.id);
      } catch {
        // ignore decode errors
      }
    }
    fetchAdmins();
  }, [fetchAdmins]);

  const handleAdded = (newAdmin) => {
    setAdmins((prev) => [...prev, newAdmin]);
  };

  const handleToggle = async (admin) => {
    const isActive = admin.is_active !== false;
    const action = isActive ? 'deactivate' : 'activate';

    const result = await Swal.fire({
      title: `${isActive ? 'Deactivate' : 'Activate'} Admin?`,
      text: `Are you sure you want to ${action} ${admin.email}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Yes, ${action}`,
      background: '#11131A',
      color: '#ffffff',
      confirmButtonColor: isActive ? '#dc3545' : '#198754',
      cancelButtonColor: '#374151',
    });

    if (!result.isConfirmed) return;

    try {
      const { data: updated } = await api.patch(`/admins/${admin.id}/toggle`);
      setAdmins((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      toast.success(`Admin ${updated.is_active ? 'activated' : 'deactivated'} successfully.`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update admin status.');
    }
  };

  const handleDelete = async (admin) => {
    const result = await Swal.fire({
      title: 'Delete Admin Account?',
      text: `This will permanently delete ${admin.email}. This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      background: '#11131A',
      color: '#ffffff',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#374151',
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/admins/${admin.id}`);
      setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
      toast.success('Admin account deleted.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete admin.');
    }
  };

  return (
    <div className="glass-card border-opacity-5 p-1">
      <div className="card-body p-4 p-md-5">
        <div className="d-flex align-items-center justify-content-between gap-3 mb-5 pb-4 border-bottom border-white border-opacity-5">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-gold bg-opacity-10 p-2 rounded-3 text-gold shadow-gold">
              <Users size={24} />
            </div>
            <div>
              <h5 className="fw-bold m-0 text-white">Admin Accounts</h5>
              <p className="text-secondary small m-0 opacity-60">Manage who has access to this dashboard</p>
            </div>
          </div>
          <button
            className="btn btn-darker border border-white border-opacity-10 d-flex align-items-center gap-2 px-3 py-2"
            style={{ borderRadius: '12px', fontSize: '0.82rem' }}
            onClick={fetchAdmins}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin-anim text-gold' : 'text-secondary'} />
            <span className="text-white fw-semibold">Refresh</span>
          </button>
        </div>

        {/* Add new admin */}
        <div className="mb-5 pb-4 border-bottom border-white border-opacity-5">
          <p className="text-secondary small fw-bold text-uppercase ls-wider mb-3 opacity-60">
            Add New Admin
          </p>
          <AddAdminForm onAdded={handleAdded} />
        </div>

        {/* Admin list */}
        <div>
          <p className="text-secondary small fw-bold text-uppercase ls-wider mb-3 opacity-60">
            Existing Admins ({admins.length})
          </p>
          {loading ? (
            <div className="text-center py-4">
              <span className="spinner-border spinner-border-sm text-gold" />
            </div>
          ) : (
            <AdminList
              admins={admins}
              currentAdminId={currentAdminId}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Settings Page ───────────────────────────────────────────────────────
const Settings = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <div className="mb-5 mt-n1">
      <h2 className="fw-bold m-0 text-white">Settings</h2>
      <p className="text-secondary small m-0 opacity-75">
        Manage admin accounts and security preferences.
      </p>
    </div>

    <div className="d-flex flex-column gap-4">
      {/* Admin user management */}
      <AdminManagementSection />

      {/* Password reset */}
      <PasswordResetSection />
    </div>

    <style>{`
      .bg-darker { background-color: #0F172A; }
      .shadow-gold { filter: drop-shadow(0 0 5px rgba(250, 204, 21, 0.2)); }
      .ls-wider { letter-spacing: 0.1em; }
      .glow-gold-soft { filter: drop-shadow(0 0 8px rgba(250, 204, 21, 0.3)); }
      .text-gold { color: #FACC15; }
      .bg-gold { background-color: #FACC15; }
      .btn-darker { background-color: rgba(255,255,255,0.04); }
      .btn-darker:hover { background-color: rgba(255,255,255,0.08); }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .spin-anim { animation: spin 1s linear infinite; }
    `}</style>
  </motion.div>
);

export default Settings;
