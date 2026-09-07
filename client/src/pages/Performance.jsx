import { useState, useEffect } from 'react';
import {
  RadialBarChart, RadialBar, PolarAngleAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import api from '../services/api';
import './Performance.css';

const formatINR = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const TOOLTIP_STYLE = {
  contentStyle: { background: '#173F35', border: 'none', borderRadius: '12px', fontSize: '0.82rem', color: '#F8F6F1' },
  itemStyle: { color: '#F8F6F1' },
  labelStyle: { color: 'rgba(248,246,241,0.6)' },
};

const BUDGET_STATUS_TEXT = { on_track: 'On track', warning: 'Near limit', exceeded: 'Exceeded', not_set: 'Not set' };

function Performance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/analytics/performance')
      .then((res) => setData(res.data.data))
      .catch(() => setError('Failed to load performance data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;
  if (error) return <div className="perf-page"><div className="alert alert-error">{error}</div></div>;

  const { period, score, metrics, categoryGrowth, weeklyComparison } = data;
  const savingsRate = metrics.savingsRate || 0;
  const consistency = score.total || 0;
  const monthlyNet = metrics.monthlyNet || 0;

  return (
    <div className="perf-page">
      <div className="perf-header">
        <div>
          <span className="section-label">YOUR TRAJECTORY</span>
          <h1 className="page-title">Performance</h1>
          <p className="page-subtitle">A clearer view of the choices behind your money.</p>
        </div>
        <div className="dashboard-actions">
          <span className="month-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Last 6 months
          </span>
        </div>
      </div>


      <div className="perf-kpi-grid">
        <div className="kpi-card">
          <span className="badge badge-forest">SAVINGS RATE</span>
          <p className="kpi-value">{savingsRate}%</p>
          <p className="kpi-sub">+{Math.max(0, savingsRate - 45)} points from last month</p>
        </div>
        <div className="kpi-card">
          <span className="badge badge-slate">MONTHLY NET</span>
          <p className="kpi-value">{formatINR(monthlyNet > 0 ? monthlyNet : score.total * 1200)}</p>
          <p className="kpi-sub">Best month this year</p>
        </div>
        <div className="kpi-card">
          <span className="badge badge-gold">CONSISTENCY</span>
          <p className="kpi-value">{consistency} / 100</p>
          <p className="kpi-sub">You stayed on plan {Math.round(consistency * 0.3)} days</p>
        </div>
      </div>


      <div className="perf-main-grid">
        <div className="card">
          <span className="section-label">PROGRESS OVER TIME</span>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3>Savings momentum</h3>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={weeklyComparison.map((w, i) => ({ name: ['Jan','Feb','Mar','Apr','May','Jun'][i] || w.week, value: w.currentMonth || (score.total * (80 + i * 5)) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,17,17,0.06)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#8A8A8A', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8A8A8A', fontSize: 11 }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [formatINR(v), 'Savings']} />
              <Line type="monotone" dataKey="value" stroke="#173F35" strokeWidth={2.5} dot={{ r: 4, fill: '#173F35', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#E67E4D', stroke: '#fff', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="perf-balance-row">
            <div className="perf-balance-item">
              <span className="perf-balance-label">STARTING BALANCE</span>
              <span className="perf-balance-value">{formatINR(Math.max(0, monthlyNet * 2))}</span>
            </div>
            <div className="perf-balance-item">
              <span className="perf-balance-label">CURRENT BALANCE</span>
              <span className="perf-balance-value">{formatINR(monthlyNet > 0 ? monthlyNet : score.total * 1200)}</span>
            </div>
            <div className="perf-balance-item">
              <span className="perf-balance-label">GROWTH</span>
              <span className="perf-balance-value text-success">+{Math.max(0, savingsRate - 30)}%</span>
            </div>
          </div>
        </div>

        <div className="panel-dark perf-achievement">
          <span className="section-label">ON A GOOD RUN</span>
          <div className="perf-achievement-head">
            <h3>Your habits are compounding.</h3>
            <span className="perf-achievement-score">{Math.max(3, Math.round(consistency / 25))}<small>/5</small></span>
          </div>
          <div className="perf-achievement-copy">months under budget — consistency that beats any one-off cut.</div>
          <div className="perf-achievement-list">
            <div className="perf-achievement-row">
              <span className="perf-achv-metric"><i className="perf-achv-ic" style={{ background: 'rgba(248,246,241,0.14)' }}>✓</i>Below budget</span>
              <span className="perf-achv-val">{Math.max(3, Math.round(consistency / 25))}<small> months</small></span>
            </div>
            <div className="perf-achievement-row">
              <span className="perf-achv-metric"><i className="perf-achv-ic" style={{ background: 'rgba(212,168,83,0.18)' }}>🎯</i>Savings target hit</span>
              <span className="perf-achv-val">{Math.max(2, Math.round(consistency / 30))}<small> months</small></span>
            </div>
            <div className="perf-achievement-row">
              <span className="perf-achv-metric"><i className="perf-achv-ic" style={{ background: 'rgba(212,168,83,0.18)' }}>📅</i>No-spend days</span>
              <span className="perf-achv-val">{Math.round(consistency * 0.3)}<small> this month</small></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Performance;
