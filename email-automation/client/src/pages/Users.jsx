import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import { Users as UsersIcon, X, Send, Paperclip, Trash2, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

DataTable.use(DT);

// ─── Send Email Modal ─────────────────────────────────────────────────────────
const SendEmailModal = ({ user, onClose }) => {
  const [subject, setSubject]   = useState('');
  const [body, setBody]         = useState('');
  const [files, setFiles]       = useState([]);
  const [sending, setSending]   = useState(false);
  const fileInputRef            = useRef(null);

  const handleFileChange = (e) => {
    const picked = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...picked]);
    e.target.value = '';
  };

  const removeFile = (index) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result.split(',')[1]); // strip data-URI prefix
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSend = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and message body are required.');
      return;
    }

    setSending(true);
    try {
      const attachments = await Promise.all(
        files.map(async (f) => ({
          name:     f.name,
          mimeType: f.type || 'application/octet-stream',
          data:     await toBase64(f),
        }))
      );

      await api.post('/email/send-direct', {
        to:   user.email,
        subject: subject.trim(),
        body: body.replace(/\n/g, '<br>'),
        attachments,
      });

      toast.success(`Email sent to ${user.email}`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send email.');
    } finally {
      setSending(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ background: 'rgba(0,0,0,0.7)', zIndex: 1050, backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="glass-card border-opacity-10 w-100 overflow-hidden"
        style={{ maxWidth: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between p-4 border-bottom border-white border-opacity-5">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-gold bg-opacity-10 p-2 rounded-3 text-gold" style={{ filter: 'drop-shadow(0 0 5px rgba(250,204,21,0.2))' }}>
              <Mail size={20} />
            </div>
            <div>
              <h6 className="fw-bold m-0 text-white">Send Email</h6>
              <p className="text-secondary m-0 opacity-60" style={{ fontSize: '0.78rem' }}>{user.email}</p>
            </div>
          </div>
          <button
            className="btn p-2 border-0"
            style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px' }}
            onClick={onClose}
          >
            <X size={16} className="text-secondary" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSend} style={{ overflowY: 'auto', flex: 1 }}>
          <div className="p-4 d-flex flex-column gap-4">
            {/* To (read-only) */}
            <div>
              <label className="form-label small fw-bold text-secondary text-uppercase mb-2 ps-1" style={{ letterSpacing: '0.08em' }}>
                To
              </label>
              <input
                type="text"
                className="form-control border border-white border-opacity-5 py-3 shadow-none text-secondary rounded-3 px-3"
                style={{ background: '#0F172A', cursor: 'default' }}
                value={user.name ? `${user.name} <${user.email}>` : user.email}
                readOnly
              />
            </div>

            {/* Subject */}
            <div>
              <label className="form-label small fw-bold text-secondary text-uppercase mb-2 ps-1" style={{ letterSpacing: '0.08em' }}>
                Subject <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control border border-white border-opacity-5 py-3 shadow-none text-white rounded-3 px-3"
                style={{ background: '#0F172A' }}
                placeholder="Email subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            {/* Body */}
            <div>
              <label className="form-label small fw-bold text-secondary text-uppercase mb-2 ps-1" style={{ letterSpacing: '0.08em' }}>
                Message <span className="text-danger">*</span>
              </label>
              <textarea
                className="form-control border border-white border-opacity-5 shadow-none text-white rounded-3 px-3 py-3"
                style={{ background: '#0F172A', minHeight: '180px', resize: 'vertical' }}
                placeholder="Write your message here..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>

            {/* Attachments */}
            <div>
              <label className="form-label small fw-bold text-secondary text-uppercase mb-2 ps-1" style={{ letterSpacing: '0.08em' }}>
                Attachments
              </label>

              <input
                type="file"
                ref={fileInputRef}
                multiple
                className="d-none"
                onChange={handleFileChange}
              />

              <button
                type="button"
                className="btn border border-white border-opacity-10 d-flex align-items-center gap-2 px-4 py-2 fw-semibold"
                style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', fontSize: '0.82rem', color: '#9CA3AF' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip size={15} />
                Attach Files
              </button>

              {files.length > 0 && (
                <div className="d-flex flex-column gap-2 mt-3">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="d-flex align-items-center justify-content-between px-3 py-2 rounded-3 border border-white border-opacity-5"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      <div className="d-flex align-items-center gap-2 overflow-hidden">
                        <Paperclip size={14} className="text-gold flex-shrink-0 opacity-70" />
                        <span className="text-white small text-truncate">{f.name}</span>
                        <span className="text-secondary opacity-50 flex-shrink-0" style={{ fontSize: '0.72rem' }}>
                          {formatBytes(f.size)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn p-1 border-0 ms-2 flex-shrink-0"
                        style={{ background: 'transparent' }}
                        onClick={() => removeFile(i)}
                      >
                        <Trash2 size={14} className="text-danger opacity-70" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="d-flex justify-content-end gap-3 px-4 pb-4">
            <button
              type="button"
              className="btn border border-white border-opacity-10 px-4 py-2 fw-bold text-white"
              style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }}
              onClick={onClose}
              disabled={sending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary px-5 py-2 fw-bold border-0 d-flex align-items-center gap-2"
              style={{ borderRadius: '12px', boxShadow: '0 0 20px rgba(250,204,21,0.2)' }}
              disabled={sending}
            >
              {sending
                ? <><span className="spinner-border spinner-border-sm" /> Sending...</>
                : <><Send size={16} /> Send Email</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── Users Page ───────────────────────────────────────────────────────────────
const Users = () => {
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const tableContainerRef             = useRef(null);

  useEffect(() => {
    api.get('/users')
      .then((res) => setUsers(res.data))
      .catch(() => toast.error('Failed to load users.'))
      .finally(() => setTimeout(() => setLoading(false), 300));
  }, []);

  // Event delegation — DataTable renders to DOM directly so we can't use React onClick
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const handleClick = (e) => {
      const btn = e.target.closest('[data-action="send-email"]');
      if (!btn) return;
      setSelectedUser({ email: btn.dataset.email, name: btn.dataset.name });
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [loading]); // re-attach after table renders

  const columns = [
    {
      title: 'Name',
      data: 'name',
      className: 'fw-bold py-4 text-white ps-4 border-white border-opacity-5',
    },
    {
      title: 'Email',
      data: 'email',
      render: (data) => `<span class="text-gold fw-medium">${data}</span>`,
      className: 'py-4 border-white border-opacity-5',
    },
    {
      title: 'Joined',
      data: 'created_at',
      render: (data) => new Date(data).toLocaleDateString([], { dateStyle: 'medium' }),
      className: 'text-secondary small py-4 border-white border-opacity-5',
    },
    {
      title: 'Status',
      data: null,
      render: () =>
        '<span class="badge bg-gold bg-opacity-10 text-gold border border-gold border-opacity-20 px-3 py-2 rounded-pill small fw-bold">ACTIVE</span>',
      className: 'py-4 text-center border-white border-opacity-5',
    },
    {
      title: 'Action',
      data: null,
      orderable: false,
      render: (data, type, row) => `
        <button
          class="btn btn-sm d-inline-flex align-items-center gap-1 px-3 py-2 fw-semibold send-email-btn"
          data-action="send-email"
          data-email="${row.email}"
          data-name="${(row.name || '').replace(/"/g, '&quot;')}"
          style="background:rgba(250,204,21,0.08);border:1px solid rgba(250,204,21,0.2);border-radius:10px;color:#FACC15;font-size:0.78rem;white-space:nowrap;"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          Send Email
        </button>
      `,
      className: 'py-4 text-center border-white border-opacity-5',
    },
  ];

  if (loading) {
    return (
      <div className="animate-pulse p-2">
        <div className="skeleton bg-card rounded-3 mb-5" style={{ width: '220px', height: '40px' }} />
        <div className="glass-card p-4">
          <div className="bg-section w-100 rounded-4" style={{ height: '450px' }} />
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-5 mt-n1">
        <h2 className="fw-bold m-0 text-white">Users</h2>
        <p className="text-secondary small m-0 opacity-75">
          {users.length} registered user{users.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="glass-card p-0 overflow-hidden border-opacity-5">
        <div className="card-body p-4 pt-2" ref={tableContainerRef}>
          <DataTable
            data={users}
            columns={columns}
            options={{
              pageLength: 10,
              responsive: true,
              dom: '<"d-flex justify-content-between align-items-center mb-4 pb-2"f>rt<"d-flex justify-content-between align-items-center mt-4 pt-2 border-top border-white border-opacity-5"ip>',
              language: {
                search: '',
                searchPlaceholder: 'Search users...',
                info: 'Showing _START_ to _END_ of _TOTAL_ users',
                lengthMenu: '_MENU_ per page',
              },
            }}
            className="table align-middle"
          />
        </div>
      </div>

      {/* Send Email Modal */}
      <AnimatePresence>
        {selectedUser && (
          <SendEmailModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
          />
        )}
      </AnimatePresence>

      <style>{`
        .bg-darker { background-color: #0F172A; }
        .dataTables_filter input {
          background: #0F172A !important;
          border: 1px solid rgba(255,255,255,0.05) !important;
          color: white !important;
          border-radius: 10px !important;
          padding: 8px 15px !important;
          font-size: 0.85rem !important;
          width: 300px !important;
        }
        .dataTables_info, .dataTables_paginate {
          color: #9CA3AF !important;
          font-size: 0.8rem !important;
        }
        .paginate_button { background: transparent !important; border: none !important; color: #9CA3AF !important; }
        .paginate_button.current { background: #FACC15 !important; color: #000 !important; border-radius: 8px !important; }
        .send-email-btn:hover { background: rgba(250,204,21,0.15) !important; }
      `}</style>
    </motion.div>
  );
};

export default Users;
