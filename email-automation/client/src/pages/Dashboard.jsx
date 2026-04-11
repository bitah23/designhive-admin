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
  Activity
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer
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
    
    // Calculate past 7 days starting from 6 days ago up to today
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

        // Calculate Today/Week stats
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
      <div className="animate-fade-in p-2">
        <Skeleton width="350px" height="40px" className="mb-5" />
        <div className="row g-4 mb-5">
          {[1,2,3,4].map(i => (
            <div className="col-md-6 col-lg-3" key={i}>
              <div className="card border-0 shadow-sm p-4 bg-white"><Skeleton width="100%" height="80px" /></div>
            </div>
          ))}
        </div>
        <div className="row g-4">
           <div className="col-lg-8"><Skeleton width="100%" height="400px" /></div>
           <div className="col-lg-4"><Skeleton width="100%" height="400px" /></div>
        </div>
      </div>
    );
  }

  const cards = [
    { title: 'Total Users', value: stats.users, icon: <UsersIcon size={20} />, color: '#6366f1', trend: 'Master DB Sync' },
    { title: 'Sent Today', value: stats.sentToday, icon: <Zap size={20} />, color: '#0ea5e9', trend: 'Weekly: ' + stats.sentWeek },
    { title: 'Sent Total', value: stats.sentTotal, icon: <Send size={20} />, color: '#10b981', trend: 'Lifetime Deliveries' },
    { title: 'Failed emails', value: stats.failed, icon: <AlertCircle size={20} />, color: '#ef4444', trend: 'Requires Review' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h2 className="fw-bold m-0 text-dark ls-tight">Overview Dashboard</h2>
          <p className="text-muted small m-0 d-flex align-items-center gap-1">
             <Activity size={14} className="text-success" /> Real-time status from Design Hive Communication Engine
          </p>
        </div>
        <button 
          className="btn btn-primary px-4 py-2 fw-bold shadow-sm d-flex align-items-center gap-2 rounded-3"
          onClick={() => window.location.href = '/admin/campaign'}
        >
          <Send size={18} /> Launch Campaign
        </button>
      </div>

      <div className="row g-4 mb-5">
        {cards.map((card, idx) => (
          <div className="col-md-6 col-lg-3" key={idx}>
            <div className="card border-0 shadow-sm h-100 card-hover bg-white p-2" style={{ borderRadius: '20px' }}>
               <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="p-2.5 rounded-3" style={{ backgroundColor: `${card.color}15`, color: card.color }}>
                      {card.icon}
                    </div>
                  </div>
                  <h3 className="fw-bold mb-1">{card.value.toLocaleString()}</h3>
                  <p className="text-muted small fw-bold text-uppercase mb-2 ls-wide" style={{ fontSize: '0.65rem' }}>{card.title}</p>
                  <hr className="my-2 opacity-5" />
                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>{card.trend}</div>
               </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4 mb-5">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm bg-white p-4 h-100" style={{ borderRadius: '24px' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
               <div>
                  <h5 className="fw-bold m-0">Campaign Velocity</h5>
                  <p className="text-muted x-small m-0">Performance over the last 7 days</p>
               </div>
               <TrendingUp size={24} className="text-primary opacity-25" />
            </div>
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Area 
                    type="monotone" dataKey="sent" 
                    stroke="#6366f1" strokeWidth={3}
                    fillOpacity={1} fill="#6366f110"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm bg-white p-4 h-100" style={{ borderRadius: '24px' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
               <h5 className="fw-bold m-0 text-dark">Recent Activity</h5>
               <small className="badge bg-light text-muted border fw-bold pt-1.5 px-2">LIVE FEED</small>
            </div>
            <div className="d-flex flex-column gap-3 overflow-auto custom-scrollbar" style={{ maxHeight: '420px' }}>
              {stats.recentLogs.map((log, idx) => (
                <div className="d-flex align-items-start gap-3 border-bottom pb-3 last-child-border-0" key={idx}>
                  <div className={`p-2 rounded-circle flex-shrink-0 ${log.status === 'sent' ? 'bg-success-subtle' : 'bg-danger-subtle'}`} style={{ width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {log.status === 'sent' ? <CheckCircle size={14} className="text-success" /> : <AlertCircle size={14} className="text-danger" />}
                  </div>
                  <div className="overflow-hidden w-100">
                    <div className="d-flex justify-content-between">
                       <p className="small fw-bold mb-0 text-truncate">{log.user_email}</p>
                       <small className="text-muted opacity-50 pe-1">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </small>
                    </div>
                    <p className="text-muted mb-0" style={{ fontSize: '0.7rem' }}>
                       {log.email_templates?.title || 'Direct Send'} 
                       {log.status === 'failed' && <span className="ms-1 text-danger">• Error logged</span>}
                    </p>
                  </div>
                </div>
              ))}
              {stats.recentLogs.length === 0 && (
                <div className="text-center py-5 opacity-25"><Mail size={40} /><p className="small mt-2">No activity detected.</p></div>
              )}
            </div>
            <button 
              className="btn btn-light w-100 mt-auto py-2.5 fw-bold small text-primary d-flex align-items-center justify-content-center gap-2 border-0"
              style={{ borderRadius: '12px' }}
              onClick={() => window.location.href = '/admin/logs'}
            >
              Access Full Logs <Clock size={14} />
            </button>
          </div>
        </div>
      </div>
      <style>{`
        .last-child-border-0:last-child { border-bottom: none !important; }
        .x-small { font-size: 0.75rem; }
      `}</style>
    </motion.div>
  );
};

export default Dashboard;
