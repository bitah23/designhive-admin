import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { 
  Users as UsersIcon, 
  FileText, 
  Send, 
  AlertCircle,
  Clock,
  ExternalLink,
  CheckCircle,
  Mail,
  Zap,
  TrendingUp,
  Activity,
  Plus
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { motion } from 'framer-motion';

const Skeleton = ({ width, height, className }) => (
  <div className={`bg-light animate-pulse ${className}`} style={{ width, height, borderRadius: '8px' }}></div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    templates: 0,
    sentTotal: 0,
    sentToday: 0,
    sentWeek: 0,
    failed: 0,
    recentLogs: []
  });
  const [loading, setLoading] = useState(true);

  const chartData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = [];
    if (!stats.allLogs) return [
      { name: 'Mon', sent: 0 },{ name: 'Tue', sent: 0 },{ name: 'Wed', sent: 0 },
      { name: 'Thu', sent: 0 },{ name: 'Fri', sent: 0 },{ name: 'Sat', sent: 0 },{ name: 'Sun', sent: 0 }
    ];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0,0,0,0);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);

      const sentOnDay = stats.allLogs.filter(
        l => l.status === 'sent' && new Date(l.timestamp).getTime() >= d.getTime() && new Date(l.timestamp).getTime() < nextD.getTime()
      ).length;

      data.push({ name: days[d.getDay()], sent: sentOnDay });
    }
    return data;
  }, [stats.allLogs]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, templatesRes, logsRes] = await Promise.all([
          api.get('/users'),
          api.get('/templates'),
          api.get('/logs'),
        ]);

        const logs = logsRes.data;
        const totalSent = logs.filter(l => l.status === 'sent').length;
        const totalFailed = logs.filter(l => l.status === 'failed').length;

        const today = new Date().setHours(0, 0, 0, 0);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime();
        
        const sentToday = logs.filter(l => l.status === 'sent' && new Date(l.timestamp).getTime() >= today).length;
        const sentWeek = logs.filter(l => l.status === 'sent' && new Date(l.timestamp).getTime() >= weekAgo).length;

        setStats({
          users: usersRes.data.length,
          templates: templatesRes.data.length,
          sentTotal: totalSent,
          sentToday,
          sentWeek,
          failed: totalFailed,
          recentLogs: logs.slice(0, 10),
          allLogs: logs
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="d-flex flex-column gap-4 animate-pulse p-2">
        <div className="row g-4 mb-4">
          {[1, 2, 3, 4].map(i => (
            <div className="col-md-3" key={i}>
              <div className="glass-card p-4" style={{ height: '140px' }}><div className="bg-section w-100 h-100 rounded-4"></div></div>
            </div>
          ))}
        </div>
        <div className="row g-4">
           <div className="col-lg-8"><div className="glass-card p-5" style={{ height: '400px' }}></div></div>
           <div className="col-lg-4"><div className="glass-card p-5" style={{ height: '400px' }}></div></div>
        </div>
      </div>
    );
  }

  const cards = [
    { title: 'Total Users', value: stats.users, icon: <UsersIcon size={22} />, color: '#FACC15', trend: 'Synced with Hive', bg: 'rgba(250, 204, 21, 0.1)' },
    { title: 'Sent Today', value: stats.sentToday, icon: <Zap size={22} />, color: '#FACC15', trend: 'Weekly: ' + stats.sentWeek, bg: 'rgba(250, 204, 21, 0.1)' },
    { title: 'Sent Total', value: stats.sentTotal, icon: <Send size={22} />, color: '#FACC15', trend: 'Global Delivery', bg: 'rgba(250, 204, 21, 0.1)' },
    { title: 'Failed Alerts', value: stats.failed, icon: <AlertCircle size={22} />, color: '#F87171', trend: 'Review Required', bg: 'rgba(248, 113, 113, 0.1)' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-5">
      <div className="d-flex justify-content-between align-items-end mb-5 mt-n1">
        <div>
          <h2 className="fw-bold m-0 text-white ls-tight">Operations Hub</h2>
          <p className="text-muted small m-0 ls-wide d-flex align-items-center gap-2">
             <Activity size={14} className="text-gold" /> System Status: Operational • v3.0 Powered By Design Hive
          </p>
        </div>
        <button 
          className="btn btn-primary d-flex align-items-center gap-2 px-4 py-2.5 shadow-gold border-0"
          onClick={() => window.location.href = '/admin/campaign'}
        >
          <Plus size={18} /> Launch Sync
        </button>
      </div>

      <div className="row g-4 mb-5">
        {cards.map((card, idx) => (
          <div className="col-md-6 col-lg-3" key={idx}>
            <div className="glass-card h-100 card-hover overflow-hidden position-relative border-opacity-5 p-1">
               <div className="card-body p-4 position-relative z-2">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="p-3 rounded-4 shadow-gold" style={{ backgroundColor: card.bg, color: card.color }}>
                      {card.icon}
                    </div>
                  </div>
                  <h3 className="fw-bold text-white mb-1 ls-tight">{card.value.toLocaleString()}</h3>
                  <p className="text-secondary small fw-bold text-uppercase mb-2 ls-wider" style={{ fontSize: '0.65rem' }}>{card.title}</p>
                  <div className="text-muted opacity-50" style={{ fontSize: '0.7rem' }}>{card.trend}</div>
               </div>
               <div className="position-absolute top-50 start-0 translate-middle-y bg-gold opacity-5 blur-3xl rounded-circle pointer-events-none" style={{ width: '80px', height: '80px', zIndex: 1 }}></div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="glass-card p-4 p-xl-5 h-100 border-opacity-5">
            <div className="d-flex justify-content-between align-items-center mb-5">
               <div>
                  <h5 className="fw-bold text-white m-0">Transmission Velocity</h5>
                  <p className="text-muted small m-0 opacity-75">Operational flow across 7-day window</p>
               </div>
               <div className="dropdown">
                  <button className="btn btn-darker btn-sm border border-white border-opacity-5 rounded-pill px-3 text-secondary small">7D RANGE</button>
               </div>
            </div>
            <div style={{ width: '100%', height: '350px' }}>
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FACC15" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#FACC15" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#11131A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '15px', backdropFilter: 'blur(10px)' }}
                    itemStyle={{ color: '#FACC15' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sent" 
                    stroke="#FACC15" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="glass-card p-4 p-xl-5 h-100 border-opacity-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
               <h5 className="fw-bold text-white m-0">Live Simulation</h5>
               <small className="badge bg-gold text-black fw-bold pt-1.5 px-3 rounded-pill ls-wide" style={{ fontSize: '0.6rem' }}>SYNCING</small>
            </div>
            <div className="d-flex flex-column gap-3 overflow-auto custom-scrollbar" style={{ maxHeight: '430px' }}>
              {stats.recentLogs.map((log, idx) => (
                <div className="d-flex align-items-start gap-3 p-2 rounded-3 hover-bg-white-5 transition-all" key={idx}>
                  <div className="p-2 rounded-circle flex-shrink-0" style={{ width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: log.status === 'sent' ? 'rgba(250, 204, 21, 0.1)' : 'rgba(248, 113, 113, 0.1)' }}>
                    {log.status === 'sent' ? <CheckCircle size={14} className="text-gold" /> : <AlertCircle size={14} className="text-danger" />}
                  </div>
                  <div className="overflow-hidden w-100">
                    <div className="d-flex justify-content-between">
                       <p className="small text-white fw-bold mb-0 text-truncate">{log.user_email}</p>
                       <small className="text-muted opacity-50" style={{ fontSize: '0.65rem' }}>
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </small>
                    </div>
                    <p className="text-secondary mb-0 opacity-75" style={{ fontSize: '0.7rem' }}>
                       {log.email_templates?.title || 'System Core Sync'} 
                       {log.status === 'failed' && <span className="ms-1 text-danger fw-bold">• Blocked</span>}
                    </p>
                  </div>
                </div>
              ))}
              {stats.recentLogs.length === 0 && (
                <div className="text-center py-5 opacity-25"><Mail size={40} className="text-gold" /><p className="small mt-2 text-white">Quiet in the Hive.</p></div>
              )}
            </div>
            <button 
              className="btn btn-darker w-100 mt-4 py-2.5 fw-bold small text-secondary d-flex align-items-center justify-content-center gap-2 border border-white border-opacity-5 hover-bg-white-5"
              style={{ borderRadius: '12px' }}
              onClick={() => window.location.href = '/admin/logs'}
            >
              Full Operational View <Clock size={14} />
            </button>
          </div>
        </div>
      </div>
      <style>{`
        .bg-darker { background-color: #0F172A; }
        .blur-3xl { filter: blur(64px); }
        .shadow-gold { box-shadow: 0 0 20px rgba(250, 204, 21, 0.1); }
      `}</style>
    </motion.div>
  );
};

export default Dashboard;
