import React from 'react';
import { BarChart3, TrendingUp, Users, Mail, ArrowUpRight, ArrowDownRight, Info, Target, PieChart } from 'lucide-react';
import { motion } from 'framer-motion';

const Analytics = () => {
  const cards = [
    { title: 'Open Rate', value: '72.4%', trend: '+4.2%', color: '#6366f1' },
    { title: 'Click Rate', value: '18.9%', trend: '+1.5%', color: '#10b981' },
    { title: 'Delivery Ratio', value: '99.2%', trend: '-0.1%', color: '#0ea5e9' },
    { title: 'Bounce Rate', value: '0.8%', trend: '-0.2%', color: '#f43f5e' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="d-flex justify-content-between align-items-center mb-5">
         <div>
            <h2 className="fw-bold m-0 text-dark ls-tight">Performance Intelligence</h2>
            <p className="text-muted small m-0">Advanced data visualization and engagement tracking.</p>
         </div>
         <button className="btn btn-dark px-4 py-2 fw-bold shadow-sm d-flex align-items-center gap-2 rounded-3 disabled">
           <TrendingUp size={18} /> FUTURE READY
         </button>
      </div>

      <div className="row g-3 mb-5">
        {cards.map((card, idx) => (
          <div className="col-md-6 col-lg-3" key={idx}>
             <div className="card border-0 shadow-sm bg-white p-3 h-100" style={{ borderRadius: '20px' }}>
                <div className="card-body">
                   <div className="d-flex justify-content-between mb-3 align-items-center">
                      <h6 className="text-muted small fw-bold text-uppercase ls-wide m-0" style={{ fontSize: '0.6rem' }}>{card.title}</h6>
                      <span className={`small fw-bold ${card.trend.startsWith('+') ? 'text-success' : 'text-danger'}`} style={{ fontSize: '0.65rem' }}>
                         {card.trend} {card.trend.startsWith('+') ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      </span>
                   </div>
                   <h3 className="fw-bold m-0" style={{ color: card.color }}>{card.value}</h3>
                </div>
             </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
         <div className="col-lg-7">
            <div className="card border-0 shadow-sm bg-white p-4 h-100" style={{ borderRadius: '28px' }}>
               <div className="d-flex justify-content-between mb-4">
                  <h6 className="fw-bold m-0 text-dark d-flex align-items-center gap-2">
                     <Target size={18} className="text-primary" /> Reach Optimization
                  </h6>
                  <small className="text-muted">Last 30 Days</small>
               </div>
               <div className="py-5 text-center my-4 opacity-50">
                  <BarChart3 size={120} className="text-muted mb-3 mx-auto" />
                  <p className="fw-bold m-0 mt-3">Interactive Heatmap Loading...</p>
                  <p className="text-muted small">Instrumentation is coming in the V3 deployment</p>
               </div>
            </div>
         </div>
         <div className="col-lg-5">
            <div className="card border-0 shadow-sm bg-white p-4 h-100" style={{ borderRadius: '28px' }}>
               <h6 className="fw-bold mb-4 text-dark d-flex align-items-center gap-2">
                  <PieChart size={18} className="text-success" /> Segment Analysis
               </h6>
               <div className="d-flex flex-column gap-3 pt-3">
                  {[
                     { label: 'Design Community', value: '45%', color: 'bg-primary' },
                     { label: 'Marketing Hive', value: '30%', color: 'bg-success' },
                     { label: 'Uncategorized', value: '25%', color: 'bg-secondary opacity-50' }
                  ].map((s, i) => (
                     <div key={i}>
                        <div className="d-flex justify-content-between mb-1 small">
                           <span className="fw-bold">{s.label}</span>
                           <span className="text-muted">{s.value}</span>
                        </div>
                        <div className="progress" style={{ height: '6px' }}>
                           <div className={`progress-bar ${s.color}`} style={{ width: s.value }}></div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </motion.div>
  );
};

export default Analytics;
