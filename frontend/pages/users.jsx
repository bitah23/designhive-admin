import { useState, useEffect, useRef } from 'react';
import { Search, Mail, X, Paperclip, Trash2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

// ── Send Email Modal ────────────────────────────────────────────────
function SendEmailModal({ user, onClose }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);

  const toBase64 = file => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const attachments = await Promise.all(
        files.map(async f => ({ name: f.name, mime_type: f.type || 'application/octet-stream', data: await toBase64(f) }))
      );
      await api.post('/email/send-direct', {
        to: user.email,
        subject,
        body: body.replace(/\n/g, '<br>'),
        attachments,
      });
      toast.success(`Email sent to ${user.email}`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const fmtBytes = b => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 580, maxHeight: '90vh' }}>
        <div className="modal-header-bar">
          <div className="d-flex align-items-center gap-3">
            <div style={{ background: 'var(--gold-dim)', borderRadius: 10, padding: 8 }}>
              <Mail size={18} className="text-gold" />
            </div>
            <div>
              <p className="fw-bold text-white mb-0" style={{ fontSize: '0.95rem' }}>Send Email</p>
              <p className="mb-0" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{user.name ? `${user.name} — ` : ''}{user.email}</p>
            </div>
          </div>
          <button className="btn-icon-close" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSend}>
          <div className="modal-body-pad d-flex flex-column gap-4">
            {/* Subject */}
            <div>
              <label className="label-upper d-block mb-2">Subject *</label>
              <input
                className="form-control py-2"
                placeholder="Email subject"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                required
              />
            </div>

            {/* Body */}
            <div>
              <label className="label-upper d-block mb-2">Message *</label>
              <textarea
                className="form-control"
                rows={6}
                placeholder="Write your message here..."
                value={body}
                onChange={e => setBody(e.target.value)}
                required
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Attachments */}
            <div>
              <label className="label-upper d-block mb-2">Attachments</label>
              <input type="file" ref={fileRef} multiple className="d-none" onChange={e => { setFiles(p => [...p, ...e.target.files]); e.target.value = ''; }} />
              <button type="button" className="btn-secondary-dark d-flex align-items-center gap-2" style={{ fontSize: '0.82rem' }} onClick={() => fileRef.current?.click()}>
                <Paperclip size={14} /> Attach Files
              </button>
              {files.length > 0 && (
                <div className="d-flex flex-column gap-2 mt-3">
                  {files.map((f, i) => (
                    <div key={i} className="d-flex align-items-center justify-content-between px-3 py-2 rounded-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                      <div className="d-flex align-items-center gap-2 overflow-hidden">
                        <Paperclip size={13} className="text-gold flex-shrink-0" />
                        <span className="text-white small text-truncate">{f.name}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', flexShrink: 0 }}>{fmtBytes(f.size)}</span>
                      </div>
                      <button type="button" className="btn-icon-close ms-2" onClick={() => setFiles(p => p.filter((_, j) => j !== i))}><Trash2 size={13} className="text-danger" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer-bar">
            <button type="button" className="btn-secondary-dark" onClick={onClose} disabled={sending}>Cancel</button>
            <button type="submit" className="btn btn-primary d-flex align-items-center gap-2 px-4" style={{ borderRadius: 10 }} disabled={sending}>
              {sending ? <span className="spinner-border spinner-border-sm" /> : <><Send size={15} /> Send</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Users Page ──────────────────────────────────────────────────────
export default function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  useEffect(() => {
    api.get('/users')
      .then(r => setUsers(r.data))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSearch = (v) => { setSearch(v); setPage(1); };

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold text-white mb-1">Users</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            {loading ? '...' : `${users.length} registered user${users.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="input-icon-wrap" style={{ width: 280 }}>
          <div className="icon-slot"><Search size={15} style={{ color: 'var(--text-muted)' }} /></div>
          <input placeholder="Search by name or email..." value={search} onChange={e => handleSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-4 d-flex flex-column gap-3">
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 40 }} />)}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table mb-0">
              <thead>
                <tr>
                  <th className="ps-4">Name</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>No users found.</td></tr>
                ) : paginated.map(u => (
                  <tr key={u.id}>
                    <td className="fw-semibold text-white ps-4">{u.name || '—'}</td>
                    <td className="text-gold">{u.email}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {new Date(u.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="text-center">
                      <button
                        className="d-inline-flex align-items-center gap-1 px-3 py-1 rounded-3"
                        style={{ background: 'var(--gold-dim)', border: '1px solid rgba(250,204,21,0.2)', color: 'var(--gold)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => setSelectedUser(u)}
                      >
                        <Mail size={13} /> Send Email
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
            </span>
            <div className="d-flex gap-2">
              <button className="btn-secondary-dark px-3 py-1" style={{ fontSize: '0.82rem' }} onClick={() => setPage(p => p - 1)} disabled={page === 1}>Prev</button>
              <button className="btn-secondary-dark px-3 py-1" style={{ fontSize: '0.82rem' }} onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next</button>
            </div>
          </div>
        )}
      </div>

      {selectedUser && <SendEmailModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  );
}
