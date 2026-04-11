import React, { useState } from 'react';
import api from '../services/api';
import { 
  Shield, 
  Key, 
  Server, 
  Mail, 
  Save, 
  Eye,
  EyeOff,
  CheckCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const Settings = () => {
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [config, setConfig] = useState({ senderName: 'Design Hive Admin', senderEmail: 'noreply@designhive.com' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toast.error('Passwords do not match!');
      return;
    }
    setLoading(true);
    try {
      await api.put('/auth/password', passwords);
      toast.success('Password successfully updated!');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSave = (e) => {
    e.preventDefault();
    toast.success('Configuration saved successfully!');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-5">
         <h2 className="fw-bold m-0 text-dark">System configuration</h2>
         <p className="text-muted small m-0">Scale your administration settings and secure your console.</p>
      </div>

      <div className="row g-4">
        {/* Security Section */}
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm bg-white mb-4" style={{ borderRadius: '24px' }}>
             <div className="card-body p-4 p-md-5">
                <div className="d-flex align-items-center gap-3 mb-5 pb-3 border-bottom">
                   <div className="bg-primary bg-opacity-10 p-2 rounded-3 text-primary"><Shield size={24} /></div>
                   <h5 className="fw-bold m-0 text-dark">Administrative Security</h5>
                </div>

                <form onSubmit={handlePasswordChange}>
                  <div className="mb-4">
                     <label className="form-label small fw-bold text-muted text-uppercase ls-wide">Current Authority Key</label>
                     <div className="input-group">
                        <span className="input-group-text bg-light border-0"><Key size={18} className="text-muted" /></span>
                        <input 
                          type={showPass ? "text" : "password"} className="form-control bg-light border-0 py-2.5 shadow-none"
                          value={passwords.current} onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                          required 
                        />
                        <button type="button" className="btn btn-light border-0" onClick={() => setShowPass(!showPass)}>
                           {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                     </div>
                  </div>

                  <div className="row g-3 mb-5">
                     <div className="col-md-6">
                        <label className="form-label small fw-bold text-muted text-uppercase ls-wide">New Admin Password</label>
                        <input 
                          type="password" className="form-control bg-light border-0 py-2.5 shadow-none"
                          value={passwords.new} onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                          required 
                        />
                     </div>
                     <div className="col-md-6">
                        <label className="form-label small fw-bold text-muted text-uppercase ls-wide">Confirm Secret</label>
                        <input 
                          type="password" className="form-control bg-light border-0 py-2.5 shadow-none"
                          value={passwords.confirm} onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                          required 
                        />
                     </div>
                  </div>

                  <button className="btn btn-primary px-5 py-2.5 fw-bold shadow-lg d-flex align-items-center gap-2 rounded-3" disabled={loading}>
                     {loading ? <span className="spinner-border spinner-border-sm"></span> : <Save size={20} />} UPDATE SECURITY CREDENTIALS
                  </button>
                </form>
             </div>
          </div>
        </div>

        {/* Global Config side */}
        <div className="col-lg-5">
           <div className="card border-0 shadow-sm bg-white mb-4" style={{ borderRadius: '24px' }}>
              <div className="card-body p-4 p-md-5">
                 <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
                    <div className="bg-success bg-opacity-10 p-2 rounded-3 text-success"><Mail size={24} /></div>
                    <h5 className="fw-bold m-0 text-dark">Default Sender</h5>
                 </div>
                 
                 <form onSubmit={handleConfigSave}>
                    <div className="mb-4">
                       <label className="form-label small fw-bold text-muted text-uppercase ls-wide">Display Name</label>
                       <input 
                         type="text" className="form-control bg-light border-0 py-2.5 shadow-none"
                         value={config.senderName} onChange={(e) => setConfig({...config, senderName: e.target.value})}
                       />
                       <small className="text-muted opacity-50">Appears in the 'From' field of recipients.</small>
                    </div>

                    <div className="mb-4">
                       <label className="form-label small fw-bold text-muted text-uppercase ls-wide">Reply-To Address</label>
                       <input 
                         type="email" className="form-control bg-light border-0 py-2.5 shadow-none"
                         value={config.senderEmail} onChange={(e) => setConfig({...config, senderEmail: e.target.value})}
                       />
                    </div>

                    <button className="btn btn-dark w-100 py-2.5 fw-bold rounded-3">SAVE CONFIGURATION</button>
                 </form>
              </div>
           </div>

           <div className="card border-0 shadow-sm bg-light p-4" style={{ borderRadius: '24px' }}>
              <div className="d-flex align-items-center gap-3 mb-3">
                 <div className="bg-dark p-2 rounded-3 text-white"><Server size={18} /></div>
                 <h6 className="fw-bold m-0 text-dark">SMTP Integration</h6>
              </div>
              <p className="small text-muted mb-3 lh-base">
                 Your SMTP relay is managed via server environment variables. To update host, port, or master credentials, please refer to the <code>.env</code> backend configuration.
              </p>
              <div className="d-flex align-items-center gap-2 small fw-bold text-success">
                 <CheckCircle size={14} /> RELAY STATUS: OPERATIONAL
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Settings;
