import React from 'react';
import { Calendar, Clock, Plus, Info } from 'lucide-react';
import { motion } from 'framer-motion';

const Scheduled = () => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="d-flex justify-content-between align-items-center mb-5">
         <div>
            <h2 className="fw-bold m-0 text-dark ls-tight">Scheduled Campaigns</h2>
            <p className="text-muted small m-0">Queue and coordinate future communication relays.</p>
         </div>
         <button className="btn btn-primary px-4 py-2 fw-bold shadow-sm d-flex align-items-center gap-2 rounded-3 disabled">
           <Plus size={18} /> NEW SCHEDULE
         </button>
      </div>

      <div className="card border-0 shadow-sm bg-white p-5 text-center" style={{ borderRadius: '24px' }}>
         <div className="bg-light d-inline-block p-4 rounded-circle mb-4">
            <Calendar size={48} className="text-muted opacity-50" />
         </div>
         <h4 className="fw-bold text-dark mb-2">Scheduling Engine: On Hold</h4>
         <p className="text-muted mx-auto mb-4" style={{ maxWidth: '500px' }}>
            The background worker for CRON-based scheduling is currently in the "Future Ready" phase. 
            You can still define templates and audiences in the active tabs.
         </p>
         
         <div className="alert alert-info d-inline-flex align-items-center gap-2 mx-auto small py-2 px-3" style={{ borderRadius: '12px' }}>
            <Info size={16} />
            <span>Implementation of <code>node-cron</code> or Supabase Edge Functions is pending user request.</span>
         </div>
      </div>
    </motion.div>
  );
};

export default Scheduled;
