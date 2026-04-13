import React from 'react';
import { BarChart3, TrendingUp, Users, Mail, ArrowUpRight, ArrowDownRight, Info, Target, PieChart } from 'lucide-react';
import { motion } from 'framer-motion';

const Analytics = () => {
  const cards = [
    { title: 'SIGNAL OPEN RATE', value: '72.4%', trend: '+4.2%', color: '#FACC15' },
    { title: 'RESPONSE VELOCITY', value: '18.9%', trend: '+1.5%', color: '#FACC15' },
    { title: 'DELIVERY FIDELITY', value: '99.2%', trend: '-0.1%', color: '#FACC15' },
    { title: 'BOUNCE FREQUENCY', value: '0.8%', trend: '-0.2%', color: '#f43f5e' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="d-flex justify-content-between align-items-end mb-5 mt-n1">
         <div>
            <h2 className="fw-bold m-0 text-white ls-tight">Data Intelligence</h2>
            <p className="text-secondary small m-0 opacity-75">Advanced neural visualization and transmission tracking.</p>
         </div>
         <button className="btn btn-darker border border-white border-opacity-5 px-4 py-2.5 fw-bold text-secondary d-flex align-items-center gap-2 rounded-3 opacity-50 cursor-not-allowed">
            <TrendingUp size={18} className="text-gold" /> V3_PROXIMITY
         </button>
      </div>

      <div className="row g-4 mb-5">
        {cards.map((card, idx) => (
          <div className="col-md-6 col-lg-3" key={idx}>
             <div className="glass-card border-opacity-5 p-3 h-100 position-relative overflow-hidden group">
                <div className="position-absolute top-0 end-0 bg-gold opacity-5 blur-xl rounded-circle" style={{ width: '60px', height: '60px', transform: 'translate(20%, -20%)' }}></div>
                <div className="card-body position-relative z-2">
                   <div className="d-flex justify-content-between mb-4 align-items-center">
                      <h6 className="text-secondary opacity-50 small fw-bold text-uppercase ls-wider m-0" style={{ fontSize: '0.6rem' }}>{card.title}</h6>
                      <span className={`small fw-bold d-flex align-items-center gap-1 ${card.trend.startsWith('+') ? 'text-gold glow-gold-soft' : 'text-danger'}`} style={{ fontSize: '0.65rem' }}>
                         {card.trend} {card.trend.startsWith('+') ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      </span>
                   </div>
                   <h2 className="fw-bold m-0 ls-tight" style={{ color: card.color }}>{card.value}</h2>
                </div>
             </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
         <div className="col-lg-7">
            <div className="glass-card border-opacity-5 p-4 h-100 overflow-hidden position-relative" style={{ minHeight: '450px' }}>
               <div className="d-flex justify-content-between mb-4 position-relative z-2">
                  <h6 className="fw-bold m-0 text-white d-flex align-items-center gap-2 ls-tight">
                     <Target size={18} className="text-gold" /> Signal Optimization Trace
                  </h6>
                  <small className="text-secondary opacity-40">LAST_30_CYCLE</small>
               </div>
               <div className="py-5 text-center mt-5 mb-4 opacity-75 position-relative z-2">
                  <div className="position-relative d-inline-block">
                     <BarChart3 size={120} className="text-gold opacity-10 mb-3 mx-auto shadow-gold" />
                     <div className="position-absolute top-50 start-50 translate-middle w-100 h-100 border border-gold border-opacity-5 rounded-circle scale-150 blur-xl"></div>
                  </div>
                  <p className="fw-bold text-white m-0 mt-4 ls-tight">INTELLIGENCE HEATMAP OFFLINE</p>
                  <p className="text-secondary small opacity-50 mt-1">Worker instrumentation pending V3 neural deployment.</p>
               </div>
               <div className="position-absolute bottom-0 start-0 w-100 h-50 bg-gradient-gold-transparent opacity-5"></div>
            </div>
         </div>
         <div className="col-lg-5">
            <div className="glass-card border-opacity-5 p-4 h-100 overflow-hidden">
               <h6 className="fw-bold mb-5 text-white d-flex align-items-center gap-2 ls-tight">
                  <PieChart size={18} className="text-gold" /> Sector Identity Analysis
               </h6>
               <div className="d-flex flex-column gap-5 pt-3">
                  {[
                     { label: 'CORE_DESIGN_CELL', value: '45%', color: '#FACC15' },
                     { label: 'MARKETING_HIVE', value: '30%', color: 'rgba(250, 204, 21, 0.6)' },
                     { label: 'UNMAPPED_NODES', value: '25%', color: 'rgba(255, 255, 255, 0.1)' }
                  ].map((s, i) => (
                     <div key={i}>
                        <div className="d-flex justify-content-between mb-2 small ls-tight">
                           <span className="fw-bold text-secondary text-uppercase" style={{ fontSize: '0.7rem' }}>{s.label}</span>
                           <span className="text-gold fw-bold">{s.value}</span>
                        </div>
                        <div className="progress bg-white bg-opacity-5" style={{ height: '5px' }}>
                           <div className="progress-bar shadow-gold" style={{ width: s.value, backgroundColor: s.color }}></div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
      <style>{`
         .bg-darker { background-color: #0F172A; }
         .bg-gradient-gold-transparent { background: linear-gradient(0deg, rgba(250, 204, 21, 0.2) 0%, transparent 100%); }
         .shadow-gold { filter: drop-shadow(0 0 10px rgba(250, 204, 21, 0.1)); }
         .glow-gold-soft { text-shadow: 0 0 10px rgba(250, 204, 21, 0.4); }
         .ls-wider { letter-spacing: 0.1em; }
         .blur-xl { filter: blur(30px); }
      `}</style>
    </motion.div>
  );
};

export default Analytics;
