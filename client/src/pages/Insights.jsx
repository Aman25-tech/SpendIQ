import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './Insights.css';

const PATTERN_META = {
  'food-heavy': { icon: '🍔', color: '#f97316' },
  'ent-heavy': { icon: '🎮', color: '#a855f7' },
  'travel-heavy': { icon: '🚖', color: '#06b6d4' },
  discretionary: { icon: '🛍️', color: '#ec4899' },
  'increasing-trend': { icon: '📈', color: '#ef4444' },
  'small-transactions': { icon: '🪙', color: '#10b981' },
  'large-transactions': { icon: '💥', color: '#f97316' },
  'weekend-heavy': { icon: '🗓️', color: '#3b82f6' },
};

const SEVERITY_META = {
  high: { label: 'High', className: 'sev-high' },
  medium: { label: 'Medium', className: 'sev-medium' },
  low: { label: 'Low', className: 'sev-low' },
};

const SEGMENT_COLORS = ['#f97316', '#a855f7', '#06b6d4', '#ec4899', '#10b981'];

function Insights() {
  const [data, setData] = useState(null);
  const [segments, setSegments] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/analytics/segments')
      .then((res) => {
        const segs = res.data?.data?.segments;
        if (Array.isArray(segs) && segs.length > 0) setSegments(segs);
      })
      .catch(() => {

      });
  }, []);

  useEffect(() => {
    let mounted = true;
    api
      .get('/analytics/behavior')
      .then((res) => {
        if (mounted) setData(res.data.data);
      })
      .catch((err) => {
        if (mounted) setError(err.response?.data?.message || 'Failed to load insights');
      });
    return () => {
      mounted = false;
    };
  }, []);

  const fmtINR = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

  return (
    <div className="insights-page">
      <div className="insights-header">
        <span className="section-label">Behavioural analytics</span>
        <h1 className="page-title">Spending Patterns</h1>
        <p className="page-subtitle">Rule-based detection of behavioural spending patterns for this month.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!data && !error && (
        <div className="flex-center" style={{ padding: '3rem 0' }}>
          <div className="spinner"></div>
        </div>
      )}

      {data && (
        <>
          <div className="insights-kpi-row">
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Patterns Detected</span>
                <span className="kpi-icon">🔍</span>
              </div>
              <span className="kpi-value">{data.detectedCount}</span>
              <span className="kpi-sub">
                pattern{data.detectedCount === 1 ? '' : 's'} this month
              </span>
            </div>
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Total Spent</span>
                <span className="kpi-icon kpi-icon-coral">₹</span>
              </div>
              <span className="kpi-value">{data.totalSpent ? fmtINR(data.totalSpent) : '₹0'}</span>
              <span className="kpi-sub">
                across {data.transactionCount} transaction{data.transactionCount === 1 ? '' : 's'}
              </span>
            </div>
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Month</span>
                <span className="kpi-icon kpi-icon-gold">📅</span>
              </div>
              <span className="kpi-value">{data.period.monthName}</span>
              <span className="kpi-sub">
                {data.period.year}
                {data.monthlyGrowth !== null && (
                  <> · {data.monthlyGrowth > 0 ? '▲' : '▼'} {Math.abs(data.monthlyGrowth).toFixed(1)}% vs last month</>
                )}
              </span>
            </div>
          </div>

          {data.detectedCount === 0 ? (
            <div className="card insights-empty">
              <div className="insights-empty-icon">✅</div>
              <h3>No major patterns detected</h3>
              <p>Your spending this month looks balanced. Patterns appear automatically when a behaviour passes its threshold.</p>
            </div>
          ) : (
            <div className="insights-grid">
              {data.patterns.map((pattern) => {
                const meta = PATTERN_META[pattern.key] || { icon: '🔍', color: '#94a3b8' };
                const sev = SEVERITY_META[pattern.severity] || SEVERITY_META.medium;
                return (
                  <div
                    key={pattern.key}
                    className="card insight-card"
                  >
                    <div className="insight-card-head">
                      <span className="insight-icon" style={{ background: `${meta.color}1f` }}>{meta.icon}</span>
                      <div className="insight-card-title-group">
                        <h3>{pattern.label}</h3>
                        <span className={`severity-badge ${sev.className}`}>{sev.label}</span>
                      </div>
                    </div>
                    <p className="insight-description">{pattern.description}</p>
                    <div className="insight-actions">
                      <Link
                        to={`/expenses?pattern=${pattern.key}`}
                        className="btn btn-outline btn-sm"
                      >
                        Review transactions
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {segments && (
            <div className="card seg-card">
              <div className="seg-header">
                <h3>Spending Segments</h3>
              </div>
              <p className="seg-sub">
                Every transaction this month clustered into {segments.length} spending styles by
                amount. The widest bar = where your money actually goes.
              </p>
              <div className="seg-list">
                {segments.map((seg, i) => {
                  const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
                  return (
                    <div key={seg.label} className="seg-row">
                      <div className="seg-row-head">
                        <span className="seg-label">
                          <span className="seg-dot" style={{ background: color }}></span>
                          {seg.label}
                        </span>
                        <span className="seg-stats">
                          {seg.count} txn{seg.count === 1 ? '' : 's'} · {seg.share_pct}% of spend
                        </span>
                      </div>
                      <div className="seg-bar">
                        <div
                          className="seg-fill"
                          style={{ width: `${Math.min(seg.share_pct, 100)}%`, background: color }}
                        ></div>
                      </div>
                      <div className="seg-row-foot">
                        <span className="seg-cats">
                          {seg.top_categories.map((c) => (
                            <span key={c} className="seg-cat">
                              {c}
                            </span>
                          ))}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Insights;
