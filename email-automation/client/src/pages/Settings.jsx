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
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [config, setConfig] = useState({ senderName: 'Design Hive Admin', senderEmail: 'noreply@designhive.com' });
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const requestPasswordReset = async () => {
    setLoading(true);
    try {
      await api.post('/auth/reset-request');
      toast.success('Reset code dispatched to your email.');
      setOtpSent(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to dispatch reset code.');
    } finally {
      setLoading(false);
    }
  };

  const confirmPasswordReset = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toast.error('Identity mismatch: Secret fragments do not align.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        otp: otp,
        newPassword: passwords.new
      });
      toast.success('Security protocol updated successfully.');
      setPasswords({ new: '', confirm: '' });
      setOtp('');
      setOtpSent(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSave = (e) => {
    e.preventDefault();
    toast.success('Neural configuration stored.');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-5 mt-n1">
         <h2 className="fw-bold m-0 text-white ls-tight">System Configuration</h2>
         <p className="text-secondary small m-0 opacity-75">Scale administrative parameters and fortify console access.</p>
      </div>

      <div className="row g-4">
        {/* Security Section (Password Reset) */}
        <div className="col-lg-7">
          <div className="glass-card border-opacity-5 mb-4 p-1">
             <div className="card-body p-4 p-md-5">
                <div className="d-flex align-items-center gap-3 mb-5 pb-4 border-bottom border-white border-opacity-5">
                   <div className="bg-gold bg-opacity-10 p-2 rounded-3 text-gold shadow-gold"><Shield size={24} /></div>
                   <h5 className="fw-bold m-0 text-white ls-tight">Identity Reset</h5>
                </div>

                {!otpSent ? (
                  <div>
                    <p className="text-secondary small mb-4 opacity-75">
                      Change your administrative password securely. We will send a 6-digit verification code to your registered email address.
                    </p>
                    <button 
                      className="btn btn-darker border border-white border-opacity-10 px-5 py-3 fw-bold text-white hover-bg-white-5 d-flex align-items-center gap-2" 
                      onClick={requestPasswordReset}
                      disabled={loading}
                      style={{ borderRadius: '14px' }}
                    >
                      {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <Mail size={20} />} 
                      REQUEST RESET CODE
                    </button>
                  </div>
                ) : (
                  <form onSubmit={confirmPasswordReset}>
                    <div className="mb-4">
                       <label className="form-label small fw-bold text-secondary text-uppercase ls-wider mb-2 ps-1">Verification Code</label>
                       <div className="input-group glass-bg rounded-3 border border-white border-opacity-5 px-1" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <span className="input-group-text bg-transparent border-0"><Key size={18} className="text-gold opacity-50" /></span>
                          <input 
                            type="text" className="form-control bg-transparent border-0 py-3 shadow-none text-white px-3"
                            value={otp} onChange={(e) => setOtp(e.target.value)}
                            placeholder="Enter 6-digit code" required 
                          />
                       </div>
                    </div>

                    <div className="row g-4 mb-5">
                       <div className="col-md-6">
                          <label className="form-label small fw-bold text-secondary text-uppercase ls-wider mb-2 ps-1">New Access Secret</label>
                          <input 
                            type="password" className="form-control bg-darker border border-white border-opacity-5 py-3 shadow-none text-white rounded-3 px-3"
                            value={passwords.new} onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                            required 
                          />
                       </div>
                       <div className="col-md-6">
                          <label className="form-label small fw-bold text-secondary text-uppercase ls-wider mb-2 ps-1">Confirm Secret</label>
                          <input 
                            type="password" className="form-control bg-darker border border-white border-opacity-5 py-3 shadow-none text-white rounded-3 px-3"
                            value={passwords.confirm} onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                            required 
                          />
                       </div>
                    </div>

                    <div className="d-flex gap-3">
                      <button type="submit" className="btn btn-primary px-5 py-3 fw-bold shadow-gold d-flex align-items-center gap-2 border-0" disabled={loading} style={{ borderRadius: '14px' }}>
                         {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <Save size={20} />} COMMIT SECURITY UPDATE
                      </button>
                      <button type="button" className="btn btn-darker border border-white border-opacity-10 px-4 py-3 fw-bold text-white hover-bg-white-5" onClick={() => setOtpSent(false)} style={{ borderRadius: '14px' }}>
                        CANCEL
                      </button>
                    </div>
                  </form>
                )}
             </div>
          </div>
        </div>

        {/* Global Config side */}
        <div className="col-lg-5">
           <div className="glass-card border-opacity-5 mb-4 p-1">
              <div className="card-body p-4 p-md-5">
                 <div className="d-flex align-items-center gap-3 mb-5 pb-4 border-bottom border-white border-opacity-5">
                    <div className="bg-gold bg-opacity-10 p-2 rounded-3 text-gold shadow-gold"><Mail size={24} /></div>
                    <h5 className="fw-bold m-0 text-white ls-tight">Default Signal Identity</h5>
                 </div>
                 
                 <form onSubmit={handleConfigSave}>
                    <div className="mb-4">
                       <label className="form-label small fw-bold text-secondary text-uppercase ls-wider mb-2 ps-1">Display Alias</label>
                       <input 
                         type="text" className="form-control bg-darker border border-white border-opacity-5 py-3 shadow-none text-white rounded-3 px-3"
                         value={config.senderName} onChange={(e) => setConfig({...config, senderName: e.target.value})}
                       />
                       <small className="text-secondary opacity-40 mt-2 d-block ps-1">Identified as 'From' source in recipient terminals.</small>
                    </div>

                    <div className="mb-5">
                       <label className="form-label small fw-bold text-secondary text-uppercase ls-wider mb-2 ps-1">Return-Path Protocol</label>
                       <input 
                         type="email" className="form-control bg-darker border border-white border-opacity-5 py-3 shadow-none text-white rounded-3 px-3"
                         value={config.senderEmail} onChange={(e) => setConfig({...config, senderEmail: e.target.value})}
                       />
                    </div>

                    <button className="btn btn-darker border border-white border-opacity-10 w-100 py-3 fw-bold text-white hover-bg-white-5" style={{ borderRadius: '14px' }}>STORE CONFIGURATION</button>
                 </form>
              </div>
           </div>

           <div className="glass-card border-gold border-opacity-10 bg-gold bg-opacity-5 p-4 overflow-hidden position-relative">
              <div className="position-absolute top-0 end-0 bg-gold opacity-5 blur-2xl rounded-circle" style={{ width: '100px', height: '100px', transform: 'translate(40%, -40%)' }}></div>
              <div className="d-flex align-items-center gap-3 mb-3 position-relative z-2">
                 <div className="bg-gold p-2 rounded-3 text-black shadow-gold"><Server size={18} /></div>
                 <h6 className="fw-bold m-0 text-white ls-tight">SMTP Relay Integration</h6>
              </div>
              <p className="small text-secondary mb-4 lh-base opacity-75 position-relative z-2">
                 Neural relay parameters are managed via root-level environmental traces. To modify gateway protocols, refer to the <code>.env</code> architecture.
              </p>
              <div className="d-flex align-items-center gap-2 small fw-bold text-gold position-relative z-2 glow-gold-soft">
                 <div className="p-1 bg-gold bg-opacity-20 rounded-circle shadow-gold"><CheckCircle size={14} /></div>
                 SIGNAL STATUS: OPERATIONAL
              </div>
           </div>
        </div>
      </div>
      <style>{`
         .bg-darker { background-color: #0F172A; }
         .hover-bg-white-5:hover { background-color: rgba(255,255,255,0.05); }
         .shadow-gold { filter: drop-shadow(0 0 5px rgba(250, 204, 21, 0.2)); }
         .ls-wider { letter-spacing: 0.1em; }
         .glow-gold-soft { filter: drop-shadow(0 0 8px rgba(250, 204, 21, 0.3)); }
         .blur-2xl { filter: blur(40px); }
      `}</style>
    </motion.div>
  );
};

export default Settings;
