import { useState, useEffect } from 'react';
import api from '../services/api';
import './Plan.css';

const CATEGORY_COLORS = {
  Food: '#E67E4D',
  Travel: '#6B7B8D',
  Entertainment: '#A88BBF',
  Shopping: '#D4A853',
  Education: '#6B9B8D',
  Bills: '#C44D3F',
  Health: '#4A9B7F',
  Other: '#8A8A8A',
};

function Plan() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    api
      .get('/analytics/future-plan')
      .then((res) => {
        if (mounted) setData(res.data.data);
      })
      .catch((err) => {
        if (mounted) setError(err.response?.data?.message || 'Failed to load forecast');
      });
    return () => {
      mounted = false;
    };
  }, []);

  const fmtINR = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

  const categories = data?.categories || [];
  const maxForecast = categories.reduce((m, c) => Math.max(m, c.forecast), 1);

  const trendMeta = (trend) => {
    if (trend > 5) return { arrow: '▲', className: 'trend-up', label: `${trend}%` };
    if (trend < -5) return { arrow: '▼', className: 'trend-down', label: `${trend}%` };
    return { arrow: '•', className: 'trend-flat', label: `${trend}%` };
  };

  const statusBadge = (status) => {
    if (status === 'over') return { text: 'Over budget', className: 'badge-coral' };
    if (status === 'within') return { text: 'Within budget', className: 'badge-forest' };
    return { text: 'No budget set', className: 'badge-gold' };
  };

  return (
    <div className="plan-page">
      <div className="plan-header">
        <span className="section-label">Give every rupee a job</span>
        <h1 className="page-title">Future Planning</h1>
        <p className="page-subtitle">
          A clear, rule-based forecast of next month&apos;s spending.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!data && !error && (
        <div className="flex-center" style={{ padding: '3rem 0' }}>
          <div className="spinner"></div>
        </div>
      )}

      {data && (
        <>
          <div className="plan-kpi-row">
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Forecast Next Month</span>
                <span className="kpi-icon">📊</span>
              </div>
              <span className="kpi-value">{fmtINR(data.totalForecast)}</span>
              <span className="kpi-sub">
                {data.budgetStatus !== 'no_budget' && data.percentOfBudget !== null
                  ? `≈ ${data.percentOfBudget}% of budget`
                  : 'No budget set'}
              </span>
            </div>
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Budget Status</span>
                <span className="kpi-icon kpi-icon-coral">💰</span>
              </div>
              <span className="kpi-value" style={{ fontSize: '1.5rem' }}>
                {statusBadge(data.budgetStatus).text}
              </span>
              <span className="kpi-sub">
                {data.budgetStatus === 'over'
                  ? 'Forecast exceeds your budget'
                  : data.budgetStatus === 'within'
                  ? 'Looking good — within your budget'
                  : 'Set a budget to track this'}
              </span>
            </div>
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Categories</span>
                <span className="kpi-icon kpi-icon-gold">📁</span>
              </div>
              <span className="kpi-value">{categories.length}</span>
              <span className="kpi-sub">with spending history</span>
            </div>
          </div>

          <div className="card plan-categories-card">
            <span className="section-label">Category forecast</span>
            <h3>Category-level forecast</h3>
            {categories.length === 0 ? (
              <p className="text-muted">No categories with history yet.</p>
            ) : (
              <div className="plan-cat-list">
                {categories.map((cat) => {
                  const t = trendMeta(cat.trend);
                  const color = CATEGORY_COLORS[cat.category] || '#8A8A8A';
                  const pct = (cat.forecast / maxForecast) * 100;
                  return (
                    <div key={cat.category} className="plan-cat-row">
                      <div className="plan-cat-head">
                        <div className="plan-cat-name">
                          <span className="plan-dot" style={{ background: color }} />
                          {cat.category}
                          <span className={`trend ${t.className}`} title={`${cat.trend}% vs baseline`}>
                            {t.arrow} {t.label}
                          </span>
                        </div>
                        <div className="plan-cat-values">
                          <span className="plan-cat-forecast">{fmtINR(cat.forecast)}</span>
                          <span className="plan-cat-baseline">avg {fmtINR(cat.baseline)}</span>
                        </div>
                      </div>
                      <div className="plan-cat-bar">
                        <div
                          className="plan-cat-bar-fill"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {data.advice && data.advice.length > 0 && (
            <div className="card plan-advice-card">
              <span className="section-label">Recommendations</span>
              <h3>What to watch</h3>
              <ul>
                {data.advice.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          </>
      )}
    </div>
  );
}

export default Plan;
