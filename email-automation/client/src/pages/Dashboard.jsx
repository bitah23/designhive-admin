import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, FileText, Calendar, Mail } from 'lucide-react';
import api from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEmailsSent: 0,
    totalNewslettersSent: 0,
    totalCampaigns: 0,
    totalScheduled: 0,
    campaigns: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [templatesRes, logsRes] = await Promise.all([
          api.get('/templates'),
          api.get('/logs'),
        ]);

        const logs = logsRes.data;
        const templates = templatesRes.data;

        const sentLogs = logs.filter(l => l.status === 'sent');
        const uniqueTemplatesUsed = new Set(sentLogs.map(l => l.template_id)).size;

        setStats({
          totalEmailsSent: sentLogs.length,
          totalNewslettersSent: uniqueTemplatesUsed,
          totalCampaigns: templates.length,
          totalScheduled: 0,
          campaigns: templates,
        });
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Emails Sent',       value: stats.totalEmailsSent,       icon: <Mail size={18} /> },
    { label: 'Total Newsletters Sent',   value: stats.totalNewslettersSent,   icon: <Send size={18} /> },
    { label: 'Total Campaigns',          value: stats.totalCampaigns,         icon: <FileText size={18} /> },
    { label: 'Total Scheduled Emails',   value: stats.totalScheduled,         icon: <Calendar size={18} /> },
  ];

  if (loading) {
    return (
      <div className="row g-4">
        {[1, 2, 3, 4].map(i => (
          <div className="col-md-6 col-lg-3" key={i}>
            <div className="glass-card p-4 animate-pulse" style={{ height: '110px' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="pb-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h2 className="fw-bold m-0 text-white">Dashboard</h2>
          <p className="text-secondary small m-0 mt-1">Email campaign overview</p>
        </div>
        <button
          className="btn btn-primary d-flex align-items-center gap-2 px-4 py-2 border-0 fw-semibold"
          style={{ borderRadius: '10px' }}
          onClick={() => navigate('/admin/campaign')}
        >
          <Send size={16} />
          Send Email / Newsletter
        </button>
      </div>

      {/* Stat Cards */}
      <div className="row g-4 mb-5">
        {statCards.map((card, idx) => (
          <div className="col-md-6 col-lg-3" key={idx}>
            <div className="glass-card p-4 h-100">
              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="text-gold">{card.icon}</span>
                <span
                  className="text-secondary fw-semibold text-uppercase"
                  style={{ fontSize: '0.68rem', letterSpacing: '0.08em' }}
                >
                  {card.label}
                </span>
              </div>
              <h3 className="fw-bold text-white m-0" style={{ fontSize: '1.75rem' }}>
                {card.value.toLocaleString()}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Campaigns List */}
      <div className="glass-card p-4">
        <h6 className="fw-bold text-white m-0 mb-4">Campaigns</h6>
        {stats.campaigns.length === 0 ? (
          <p className="text-secondary small text-center py-5 m-0 opacity-50">
            No campaigns yet.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle m-0">
              <thead>
                <tr>
                  <th
                    className="text-secondary fw-semibold text-uppercase border-white border-opacity-5 pb-3"
                    style={{ fontSize: '0.68rem', letterSpacing: '0.08em' }}
                  >
                    Campaign Name
                  </th>
                  <th
                    className="text-secondary fw-semibold text-uppercase border-white border-opacity-5 pb-3"
                    style={{ fontSize: '0.68rem', letterSpacing: '0.08em' }}
                  >
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.campaigns.map(c => (
                  <tr key={c.id}>
                    <td className="text-white fw-medium py-3 border-white border-opacity-5">
                      {c.title}
                    </td>
                    <td className="text-secondary small py-3 border-white border-opacity-5">
                      {new Date(c.created_at).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
