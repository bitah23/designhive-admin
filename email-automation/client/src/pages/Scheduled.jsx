import React from 'react';
import { Calendar, Clock, Plus, Info } from 'lucide-react';
import { motion } from 'framer-motion';

const Scheduled = () => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="d-flex justify-content-between align-items-end mb-5 mt-n1">
         <div>
            <h2 className="fw-bold m-0 text-white ls-tight">Temporal Scheduler</h2>
            <p className="text-secondary small m-0 opacity-75">Queue and coordinate future communication relays across timelines.</p>
         </div>
         <button className="btn btn-primary px-4 py-2.5 fw-bold shadow-gold d-flex align-items-center gap-2 border-0 opacity-50 cursor-not-allowed">
           <Plus size={18} /> NEW SEQUENCE
         </button>
      </div>

      <div className="glass-card border-opacity-5 p-5 text-center overflow-hidden position-relative" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
         <div className="position-absolute top-50 start-50 translate-middle bg-gold opacity-5 blur-3xl rounded-circle" style={{ width: '300px', height: '300px' }}></div>
         
         <div className="bg-gold bg-opacity-10 d-inline-block p-4 rounded-circle mb-4 shadow-gold position-relative z-2">
            <Calendar size={48} className="text-gold" />
         </div>
         <h3 className="fw-bold text-white mb-3 position-relative z-2 ls-tight">Scheduling Core: Hibernating</h3>
         <p className="text-secondary mx-auto mb-5 position-relative z-2 opacity-75" style={{ maxWidth: '500px' }}>
            The background worker for CRON-based temporal scheduling is currently in the "Future-State" phase. 
            Active intelligence nodes (Templates, Audience) remain available for immediate dispatch.
         </p>
         
         <div className="alert bg-gold bg-opacity-5 border border-gold border-opacity-10 d-inline-flex align-items-center gap-3 mx-auto small py-3 px-4 rounded-4 position-relative z-2 shadow-sm">
            <Info size={18} className="text-gold" />
            <span className="text-gold fw-medium ls-tight">IMPLEMENTATION STATUS: <code>node-cron</code> INTEGRATION PENDING CORE APPROVAL.</span>
         </div>
      </div>
      <style>{`
        .shadow-gold { box-shadow: 0 0 20px rgba(250, 204, 21, 0.1); }
        .blur-3xl { filter: blur(64px); }
      `}</style>
    </motion.div>
  );
};

export default Scheduled;
