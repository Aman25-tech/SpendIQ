import { useState, useEffect } from 'react';
import api from '../services/api';
import './AiInsights.css';

const SEVERITY_META = {
  danger:   { icon: '🚨', label: 'Needs attention', className: 'sev-danger' },
  warning:  { icon: '⚠️', label: 'Warning',        className: 'sev-warning' },
  positive: { icon: '✅', label: 'Positive',        className: 'sev-positive' },
  info:     { icon: 'ℹ️', label: 'Good to know',    className: 'sev-info' },
};

const SEVERITY_ORDER = { danger: 4, warning: 3, positive: 2, info: 1 };

function AiInsights() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    setData(null);
    setError('');
    api
      .get('/analytics/ai-insights')
      .then((res) => {
        if (mounted) setData(res.data.data);
      })
      .catch((err) => {
        if (mounted) setError(err.response?.data?.message || 'Failed to load AI insights');
      });
    return () => {
      mounted = false;
    };
  }, [retryKey]);

  const fmtINR = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

  const sortedInsights = data?.insights
    ? [...data.insights].sort(
        (a, b) => (SEVERITY_ORDER[b.severity] || 0) - (SEVERITY_ORDER[a.severity] || 0)
      )
    : [];

  return (
    <div className="ai-insights-page">
      <div className="ai-header">
        <span className="section-label">AI-powered</span>
        <h1 className="page-title">AI Insights</h1>
        <p className="page-subtitle">
          Clear, plain-language analysis of how your money moved this month.
        </p>
      </div>

      {error && (
        <>
          <div className="alert alert-error">{error}</div>
          <button className="btn btn-outline btn-sm" onClick={() => setRetryKey((k) => k + 1)}>
            🔄 Try again
          </button>
        </>
      )}

      {!data && !error && (
        <div className="flex-center" style={{ padding: '3rem 0', flexDirection: 'column', gap: '1rem' }}>
          <div className="spinner"></div>
          <p className="text-muted text-sm" style={{ maxWidth: '420px', textAlign: 'center' }}>
            Contacting your local AI model — this usually takes about 10 seconds,
            up to a minute on first load.
          </p>
        </div>
      )}

      {data && (
        <>
          <div className="ai-kpi-row">
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Day</span>
                <span className="kpi-icon">📅</span>
              </div>
              <span className="kpi-value">
                {data.meta.daysElapsed}<span className="kpi-sub"> / {data.meta.daysInMonth}</span>
              </span>
              <span className="kpi-sub">of the month</span>
            </div>
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Spent</span>
                <span className="kpi-icon kpi-icon-coral">₹</span>
              </div>
              <span className="kpi-value">{fmtINR(data.meta.spent)}</span>
              <span className="kpi-sub">this month</span>
            </div>
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Income</span>
                <span className="kpi-icon kpi-icon-gold">💰</span>
              </div>
              <span className="kpi-value">{fmtINR(data.meta.income)}</span>
              <span className="kpi-sub">received</span>
            </div>
          </div>

          {sortedInsights.length === 0 ? (
            <div className="card ai-empty">
              <div className="ai-empty-icon">📊</div>
              <h3>Not enough data yet</h3>
              <p>Insights appear once you have at least a few days and 5+ transactions this month.</p>
            </div>
          ) : (
            <div className="ai-insights-list">
              {sortedInsights.map((insight, idx) => {
                const sev = SEVERITY_META[insight.severity] || SEVERITY_META.info;
                return (
                  <div
                    key={`${insight.type}-${idx}`}
                    className="card ai-card"
                  >
                    <div className="ai-card-left">
                      <span className="ai-card-icon">{sev.icon}</span>
                      <span className={`severity-badge ${sev.className}`}>{sev.label}</span>
                    </div>
                    <div className="ai-card-body">
                      <h3>{insight.title}</h3>
                      <p className="ai-card-summary">{insight.summary}</p>
                      {insight.suggestion && (
                        <p className="ai-card-suggestion">→ {insight.suggestion}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          </>
      )}
    </div>
  );
}

export default AiInsights;
