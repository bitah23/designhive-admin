import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Send, Users, FileText, CheckCircle2, AlertCircle, Loader2, FlaskConical, Play, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const Skeleton = ({ width, height, className }) => (
  <div className={`bg-light animate-pulse ${className}`} style={{ width, height, borderRadius: '8px' }}></div>
);

const Campaign = () => {
  const [templates, setTemplates] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [results, setResults] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templatesRes, usersRes] = await Promise.all([
          api.get('/templates'),
          api.get('/users'),
        ]);
        setTemplates(templatesRes.data);
        setUsers(usersRes.data);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setTimeout(() => setLoading(false), 200);
      }
    };
    fetchData();
  }, []);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUsers(users.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleUserSelect = (id) => {
    setSelectedUsers(prev => 
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const handleSend = async (isTest = false) => {
    if (!selectedTemplate || (!isTest && selectedUsers.length === 0)) {
      toast.error('Identify target matrix and recipient cluster.');
      return;
    }

    const recipientCount = isTest ? 1 : selectedUsers.length;
    const result = await Swal.fire({
      title: 'Initialize Broadcast?',
      text: `Confirm synchronization for ${recipientCount} identified node(s).`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#FACC15',
      cancelButtonColor: '#161A23',
      confirmButtonText: 'Yes, Launch Payload',
      background: '#11131A',
      color: '#fff'
    });

    if (!result.isConfirmed) {
      return;
    }

    setSending(true);
    setSentCount(0);
    setResults(null);

    const progressInterval = setInterval(() => {
      setSentCount(prev => prev < selectedUsers.length ? prev + 1 : prev);
    }, 100);

    try {
      const response = await api.post('/email/send', {
        templateId: selectedTemplate,
        userIds: isTest ? [users[0].id] : selectedUsers
      });
      clearInterval(progressInterval);
      setSentCount(selectedUsers.length);
      setResults(response.data.results);
      const successCount = response.data.results.filter(r => r.status === 'sent').length;
      const failCount = response.data.results.filter(r => r.status === 'failed').length;
      if (failCount === 0) {
        toast.success(`Broadcasting complete. ${successCount} signals delivered.`);
      } else {
        toast(`Trace partial: ${successCount} successful, ${failCount} blocked.`, { icon: '⚠️' });
      }
    } catch (err) {
      clearInterval(progressInterval);
      toast.error(`Dispatch Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse p-2">
        <div className="skeleton bg-card rounded-3 mb-5" style={{ width: '220px', height: '40px' }}></div>
        <div className="row g-4">
           <div className="col-lg-4"><div className="glass-card p-4 h-100" style={{ height: '300px' }}></div></div>
           <div className="col-lg-8"><div className="glass-card p-4 h-100" style={{ height: '400px' }}></div></div>
        </div>
      </div>
    );
  }

  const progressPercentage = selectedUsers.length > 0 ? (sentCount / selectedUsers.length) * 100 : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="d-flex justify-content-between align-items-end mb-5 mt-n1">
         <div>
            <h2 className="fw-bold m-0 text-white ls-tight">Neural Broadcast Engine</h2>
            <p className="text-secondary small m-0 opacity-75">Define scope, select intelligence matrix, and initialize transmission.</p>
         </div>
         <button 
           className="btn btn-darker border border-white border-opacity-5 d-flex align-items-center gap-2 px-4 py-2.5 fw-bold text-secondary hover-bg-white-5"
           onClick={() => handleSend(true)}
           disabled={sending || !selectedTemplate}
         >
            <FlaskConical size={18} className="text-gold" /> SIMULATE SIGNAL
         </button>
      </div>

      <div className="row g-4 mb-5">
        <div className="col-lg-4">
          <div className="glass-card border-opacity-5 h-100">
            <div className="card-body p-4">
              <h6 className="fw-bold mb-4 text-secondary text-uppercase ls-wider" style={{ fontSize: '0.65rem' }}>1. Intelligence Matrix</h6>
              <div className="d-flex flex-column gap-2 overflow-auto custom-scrollbar" style={{ maxHeight: '500px' }}>
                {templates.map(t => (
                  <button
                    key={t.id}
                    className={`nav-link text-start p-3 transition-all border-0 position-relative overflow-hidden ${selectedTemplate === t.id ? 'bg-gold text-black shadow-gold' : 'text-secondary hover-bg-white-5 bg-card bg-opacity-30'}`}
                    style={{ borderRadius: '14px' }}
                    onClick={() => setSelectedTemplate(t.id)}
                  >
                    <div className="fw-bold small ls-tight">{t.title}</div>
                    <div className={`x-small mt-1 opacity-60 text-truncate`}>{t.subject}</div>
                    {selectedTemplate === t.id && (
                       <div className="position-absolute top-50 start-0 translate-middle bg-white opacity-20 blur-xl rounded-circle" style={{ width: '40px', height: '40px' }}></div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="glass-card border-opacity-5 h-100 p-1">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h6 className="fw-bold m-0 text-secondary text-uppercase ls-wider" style={{ fontSize: '0.65rem' }}>2. Recipient Cluster</h6>
                <div className="badge bg-gold bg-opacity-10 text-gold border border-gold border-opacity-20 pt-1.5 px-3 rounded-pill ls-wide">{selectedUsers.length} TARGET NODES</div>
              </div>

              <div className="table-responsive bg-transparent mb-3 custom-scrollbar" style={{ maxHeight: '420px' }}>
                <table className="table align-middle">
                  <thead className="sticky-top bg-section">
                    <tr>
                      <th width="60" className="ps-4 text-center border-white border-opacity-5">
                        <input 
                          type="checkbox" className="form-check-input bg-darker border-white border-opacity-10 cursor-pointer shadow-none" 
                          onChange={handleSelectAll}
                          checked={selectedUsers.length === users.length && users.length > 0}
                        />
                      </th>
                      <th className="text-secondary opacity-50 small fw-bold text-uppercase ls-wider border-white border-opacity-5 py-3">Identity</th>
                      <th className="text-secondary opacity-50 small fw-bold text-uppercase ls-wider border-white border-opacity-5 py-3">Neural Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr 
                         key={u.id} 
                         className={`transition-all ${selectedUsers.includes(u.id) ? 'bg-gold bg-opacity-5' : 'hover-bg-white-5'}`}
                         onClick={() => handleUserSelect(u.id)}
                         style={{ cursor: 'pointer' }}
                      >
                        <td className="ps-4 text-center border-white border-opacity-5">
                          <input 
                            type="checkbox" className="form-check-input bg-darker border-white border-opacity-10 shadow-none" 
                            checked={selectedUsers.includes(u.id)}
                            onChange={(e) => { e.stopPropagation(); handleUserSelect(u.id); }}
                          />
                        </td>
                        <td className="fw-bold text-white border-white border-opacity-5 py-3 small">{u.name}</td>
                        <td className="text-gold opacity-80 border-white border-opacity-5 py-3 small">{u.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {sending && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-4 p-4 glass-card border-gold border-opacity-20 text-white shadow-gold overflow-hidden position-relative"
              >
                <div className="d-flex justify-content-between align-items-center mb-3 position-relative z-2">
                   <div className="d-flex align-items-center gap-3">
                      <Loader2 size={20} className="animate-spin text-gold" />
                      <span className="fw-bold small ls-tight">BROADCASTING PAYLOAD...</span>
                   </div>
                   <span className="small text-gold fw-bold">{sentCount} / {selectedUsers.length} INITIALIZED</span>
                </div>
                <div className="progress bg-white bg-opacity-5 position-relative z-2" style={{ height: '6px', borderRadius: '10px' }}>
                  <motion.div 
                    className="progress-bar bg-gold shadow-gold" 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
                <div className="position-absolute top-50 start-0 translate-middle bg-gold opacity-5 blur-3xl rounded-circle" style={{ width: '150px', height: '150px' }}></div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-5 d-flex justify-content-between align-items-center">
             <div className="text-secondary small opacity-50 d-flex align-items-center gap-2">
                <Info size={14} className="text-gold" /> Estimated Cycle: ~{Math.ceil(selectedUsers.length / 5)}s
             </div>
             <button 
              className="btn btn-primary d-flex align-items-center gap-3 px-5 py-3 fw-bold shadow-gold border-0"
              style={{ borderRadius: '14px' }}
              disabled={sending || !selectedTemplate || selectedUsers.length === 0}
              onClick={() => handleSend(false)}
            >
              <Send size={20} /> INITIALIZE BROADCAST
            </button>
          </div>
        </div>
      </div>

      {/* Recap Dashboard */}
      <AnimatePresence>
        {results && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-card border-gold border-opacity-10 overflow-hidden shadow-2xl position-relative" 
            style={{ borderRadius: '28px' }}
          >
            <div className="card-body p-5 position-relative z-2">
              <div className="d-flex align-items-center gap-4 mb-5 pb-4 border-bottom border-white border-opacity-5">
                 <div className="bg-gold p-3 rounded-circle shadow-gold text-black"><CheckCircle2 size={36} /></div>
                 <div>
                    <h3 className="fw-bold mb-1 text-white ls-tight">Transaction Complete</h3>
                    <p className="text-secondary small m-0 opacity-75">All identified nodes have been processed by the Signal Core.</p>
                 </div>
              </div>
              <div className="row g-4">
                 <div className="col-sm-6">
                    <div className="p-4 bg-gold bg-opacity-10 rounded-5 border border-gold border-opacity-20 text-center glow-gold-soft">
                       <h2 className="fw-bold text-gold display-5 mb-0 ls-tight">{results.filter(r => r.status === 'sent').length}</h2>
                       <small className="fw-bold text-gold text-uppercase ls-wider opacity-75">Delivered Signals</small>
                    </div>
                 </div>
                 <div className="col-sm-6">
                    <div className="p-4 bg-danger bg-opacity-10 rounded-5 border border-danger border-opacity-20 text-center">
                       <h2 className="fw-bold text-danger display-5 mb-0 ls-tight">{results.filter(r => r.status === 'failed').length}</h2>
                       <small className="fw-bold text-danger text-uppercase ls-wider opacity-75">Intercepted Nodes</small>
                    </div>
                 </div>
              </div>
              <div className="mt-5 text-center">
                 <button className="btn btn-darker border border-white border-opacity-5 px-4 py-2 fw-bold text-secondary rounded-3 hover-bg-white-5" onClick={() => setResults(null)}>DIMISS TRACE</button>
              </div>
            </div>
            <div className="position-absolute top-0 end-0 bg-gold opacity-5 blur-3xl rounded-circle" style={{ width: '300px', height: '300px', transform: 'translate(30%, -30%)' }}></div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`
        .bg-darker { background-color: #0F172A; }
        .hover-bg-white-5:hover { background-color: rgba(255,255,255,0.05); color: #fff; }
        .hover-bg-danger-10:hover { background-color: rgba(220,53,69,0.1); }
        .x-small { font-size: 0.75rem; }
        .ls-wider { letter-spacing: 0.1em; }
        .blur-xl { filter: blur(24px); }
        .glow-gold-soft { filter: drop-shadow(0 0 5px rgba(250, 204, 21, 0.2)); }
        .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        .animate-spin { animation: spin 1.5s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
};

export default Campaign;
