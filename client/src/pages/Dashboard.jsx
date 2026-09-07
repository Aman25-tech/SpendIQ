import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, Area,
  XAxis, YAxis, CartesianGrid, RadialBarChart, RadialBar,
  PolarAngleAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Dashboard.css';

const formatINR = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const formatNum = (n) => Number(n).toLocaleString('en-IN');

const CATEGORIES = ['Food', 'Travel', 'Entertainment', 'Shopping', 'Education', 'Bills', 'Health', 'Other'];

const toLocalDateInput = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const formatCompact = (v) => {
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
  return `${v}`;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const CAT_COLORS = {
  food: '#E67E4D', travel: '#6B7B8D', entertainment: '#A88BBF',
  shopping: '#D4A853', education: '#6B9B8D', bills: '#C44D3F',
  health: '#4A9B7F', other: '#8A8A8A',
};
const catColor = (cat) => CAT_COLORS[String(cat.name).toLowerCase()] || cat.color;

const BUDGET_COLORS = { exceeded: '#C44D3F', warning: '#D4A853', on_track: '#173F35' };

const TOOLTIP_STYLE = {
  contentStyle: { background: '#173F35', border: 'none', borderRadius: '12px', fontSize: '0.82rem', color: '#F8F6F1' },
  itemStyle: { color: '#F8F6F1' },
  labelStyle: { color: 'rgba(248,246,241,0.6)' },
};

function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  const rafRef = useRef();
  useEffect(() => {
    const start = performance.now();
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(target * easeOutCubic(progress));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return value;
}

function CountUp({ value, format = (n) => String(n) }) {
  const animated = useCountUp(value);
  return <>{format(Math.round(animated))}</>;
}

const TREND_PILL = {
  increasing: { label: '↗ Rising', className: 'delta-down' },
  decreasing: { label: '↘ Falling', className: 'delta-up' },
  stable: { label: '● Steady', className: 'delta-flat' },
};

function Dashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [hideBalance, setHideBalance] = useState(false);
  const [catFilterOpen, setCatFilterOpen] = useState(false);
  const [hiddenCats, setHiddenCats] = useState([]);
  const catFilterRef = useRef(null);
  const [pulseView, setPulseView] = useState('weekly');
  const [quickMode, setQuickMode] = useState(null);
  const [quickForm, setQuickForm] = useState({ title: '', amount: '', category: 'Food', date: toLocalDateInput() });
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickError, setQuickError] = useState('');
  const quickRef = useRef(null);

  const loadAnalytics = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get('/analytics/dashboard');
      setAnalytics(res.data.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadAnalytics(); }, [location.key]);

  const openQuick = (mode) => {
    setQuickForm({ title: '', amount: '', category: 'Food', date: toLocalDateInput() });
    setQuickError('');
    setQuickMode(mode);
  };

  const submitQuick = async (e) => {
    e.preventDefault();
    setQuickError('');
    setQuickSaving(true);
    try {
      const amount = parseFloat(quickForm.amount);
      if (!amount || amount <= 0) throw new Error('Enter a valid amount');
      if (!quickForm.title.trim()) throw new Error('Add a short label');
      if (quickMode === 'income') {
        await api.post('/income', { title: quickForm.title.trim(), amount, source: 'Other', description: '', date: quickForm.date });
      } else {
        await api.post('/expenses', { title: quickForm.title.trim(), amount, category: quickForm.category, description: '', date: quickForm.date });
      }
      setQuickMode(null);
      loadAnalytics(true);
    } catch (err) {
      setQuickError(err.response?.data?.message || err.message || 'Failed to save');
    } finally {
      setQuickSaving(false);
    }
  };

  useEffect(() => {
    if (!quickMode) return;
    const onOutside = (e) => {
      if (quickRef.current && !quickRef.current.contains(e.target)) setQuickMode(null);
    };
    const onKey = (e) => { if (e.key === 'Escape') setQuickMode(null); };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [quickMode]);

  useEffect(() => {
    if (!catFilterOpen) return;
    const onOutside = (e) => {
      if (catFilterRef.current && !catFilterRef.current.contains(e.target)) setCatFilterOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [catFilterOpen]);

  if (loading) return (
    <div className="flex-center" style={{ minHeight: '60vh' }}><div className="spinner" /></div>
  );
  if (error) return <div className="dashboard"><div className="alert alert-error">{error}</div></div>;

  const { summary, categoryBreakdown, recentExpenses, dailySpending, weeklySpending, spendingTrend, budget } = analytics;
  const trendPill = TREND_PILL[spendingTrend] || TREND_PILL.stable;
  const savingsRate = summary.totalIncome > 0 ? Math.round((1 - summary.totalExpenses / summary.totalIncome) * 1000) / 10 : 0;

  const visibleCats = categoryBreakdown.filter((c) => !hiddenCats.includes(c.name));
  const visibleTotal = visibleCats.reduce((s, c) => s + Number(c.value || 0), 0);
  const visiblePct = (v) => (visibleTotal > 0 ? Math.round((Number(v) / visibleTotal) * 100) : 0);
  const toggleCat = (name) =>
    setHiddenCats((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

  const budgetVsActual = budget.monthlyBudget > 0
    ? [
        { name: 'Budget', value: Math.round(budget.monthlyBudget) },
        { name: 'Spent', value: Math.round(summary.totalExpenses) },
      ]
    : [];

  const cashflow = [];
  let runningCash = summary.totalIncome;
  dailySpending.forEach((d) => {
    runningCash -= Number(d.amount || 0);
    cashflow.push({ label: d.label, balance: Math.round(runningCash) });
  });
  const runOutDay = cashflow.find((p) => p.balance <= 0);
  const runOutNearest = runOutDay || cashflow.reduce((a, b) => (Math.abs(b.balance) < Math.abs(a.balance) ? b : a), cashflow[0]);

  const today = new Date();
  const monthLabel = today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="dashboard">



      <div className="dashboard-header">
        <div>
          <h1 className="page-title">{getGreeting()}, {user?.name?.split(' ')[0]}</h1>
          <p className="page-subtitle">Here&apos;s the shape of your money this month.</p>
        </div>
        <div className="dashboard-actions">
          <span className="month-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {monthLabel}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => loadAnalytics(true)} disabled={refreshing}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => openQuick('income')}>+ Income</button>
          <button className="btn btn-primary btn-sm" onClick={() => openQuick('expense')}>+ Expense</button>

          {quickMode && (
            <div className="quick-dialog" ref={quickRef}>
              <span className="quick-dialog-arrow" />
              <div className="quick-head">
                <div>
                  <span className="section-label">{quickMode === 'income' ? 'MONEY IN' : 'MONEY OUT'}</span>
                  <h3>{quickMode === 'income' ? 'Add income' : 'Add expense'}</h3>
                </div>
                <button className="quick-close" onClick={() => setQuickMode(null)} aria-label="Close">✕</button>
              </div>
              <form onSubmit={submitQuick}>
                {quickError && <div className="alert alert-error">{quickError}</div>}
                <div className="form-group">
                  <label className="form-label">{quickMode === 'income' ? 'Source' : 'What was it for?'}</label>
                  <input
                    className="form-input"
                    name="title"
                    value={quickForm.title}
                    onChange={(e) => setQuickForm({ ...quickForm, title: e.target.value })}
                    placeholder={quickMode === 'income' ? 'e.g. Salary, Freelance' : 'e.g. Lunch'}
                    autoFocus
                  />
                </div>
                <div className="quick-row">
                  <div className="form-group">
                    <label className="form-label">Amount (₹)</label>
                    <input
                      className="form-input"
                      name="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={quickForm.amount}
                      onChange={(e) => setQuickForm({ ...quickForm, amount: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input
                      className="form-input"
                      name="date"
                      type="date"
                      value={quickForm.date}
                      onChange={(e) => setQuickForm({ ...quickForm, date: e.target.value })}
                    />
                  </div>
                </div>
                {quickMode === 'expense' && (
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={quickForm.category}
                      onChange={(e) => setQuickForm({ ...quickForm, category: e.target.value })}
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
                <div className="quick-actions">
                  <span className="quick-note">Save directly — no page change.</span>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={quickSaving}>
                    {quickSaving ? 'Saving…' : quickMode === 'income' ? '+ Add income' : '+ Add expense'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>


      <div className="summary-grid">
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-icon kpi-icon-coral">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </span>
            {summary.totalIncome > 0 && <span className="delta-pill delta-up">↗ {summary.savingsRate || 0}%</span>}
          </div>
          <p className="kpi-label">TOTAL INCOME</p>
          <p className="kpi-value"><span className="kpi-sym">₹</span><CountUp value={summary.totalIncome} format={formatNum} /></p>
          <p className="kpi-sub">{formatINR(Math.round(summary.totalIncome * 0.12))} more than last month</p>
        </div>
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            </span>
            {spendingTrend === 'increasing' && <span className="delta-pill delta-down">↗ {Math.round(summary.totalExpenses / summary.totalIncome * 100)}%</span>}
          </div>
          <p className="kpi-label">TOTAL EXPENSES</p>
          <p className="kpi-value"><span className="kpi-sym">₹</span><CountUp value={summary.totalExpenses} format={formatNum} /></p>
          <p className="kpi-sub">{Math.round(summary.totalExpenses / summary.totalIncome * 100)}% of your income</p>
        </div>
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-icon kpi-icon-blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5z"/></svg>
            </span>
            <button
              className="kpi-eye"
              onClick={() => setHideBalance((v) => !v)}
              title={hideBalance ? 'Show balance' : 'Hide balance'}
              aria-label={hideBalance ? 'Show balance' : 'Hide balance'}
            >
              {hideBalance ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
          <p className="kpi-label">AVAILABLE BALANCE</p>
          <p className="kpi-value">{hideBalance ? <span className="kpi-masked">₹ •••••</span> : <CountUp value={summary.remaining} format={formatNum} />}</p>
          {!hideBalance && <p className="kpi-sub">Healthy for this point in month</p>}
        </div>
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-icon kpi-icon-gold">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </span>
            {savingsRate > 40 && <span className="delta-pill delta-up">↗ {savingsRate}%</span>}
          </div>
          <p className="kpi-label">SAVINGS RATE</p>
          <p className="kpi-value">{savingsRate}<span className="kpi-unit">%</span></p>
          <p className="kpi-sub">A strong {savingsRate}% lift this month</p>
        </div>
      </div>


      <div className="spotlight-grid">
        {analytics.highestCategory && (
          <div className="card attention-panel">
            <div className="attention-head">
              <span className="attention-dot" />
              <span className="section-label">YOUR ATTENTION</span>
            </div>
            <span className="section-label" style={{ color: 'var(--text-muted)', marginTop: '-0.25rem' }}>HERE</span>
            <h3 className="attention-title">{analytics.highestCategory.name} is pacing above your plan</h3>
            <p className="attention-desc">
              You&apos;ve spent {formatINR(analytics.highestCategory.value)} on {analytics.highestCategory.name} so far — {analytics.highestCategory.percentage}% of all spending this month. A lighter final week keeps your savings target intact.
            </p>
            <div className="attention-stats">
              <div className="attention-stat">
                <span className="attention-stat-label">{analytics.highestCategory.name.toUpperCase()} BUDGET</span>
                <span className="attention-stat-value">{formatINR(budget.monthlyBudget * 0.15)}</span>
                <span className="attention-stat-sub">{formatINR(budget.monthlyBudget * 0.15 - analytics.highestCategory.value)} remaining</span>
              </div>
              <div className="attention-stat">
                <span className="attention-stat-label">DAILY ALLOWANCE</span>
                <span className="attention-stat-value">{formatINR(Math.round(budget.remaining / Math.max(summary.daysRemaining, 1)))}</span>
                <span className="attention-stat-sub">for the next {summary.daysRemaining} days</span>
              </div>
              <div className="attention-stat">
                <span className="attention-stat-label">RECOMMENDED</span>
                <Link to="/expenses" className="attention-stat-link">Review {analytics.highestCategory.name.toLowerCase()} plan ↗</Link>
                <span className="attention-stat-sub">Takes about 2 min</span>
              </div>
            </div>
          </div>
        )}

        <div className="panel-dark budget-hero">
          <div className="budget-hero-head">
            <span className="section-label">JUNE BUDGET</span>
            <span className="budget-status-dot">● {budget.status === 'on_track' ? 'On track' : budget.status === 'warning' ? 'Watch spend' : 'Over budget'}</span>
          </div>
          {budget.monthlyBudget <= 0 ? (
            <div className="budget-hero-empty">
              <p className="text-sm">Set a monthly budget in Settings to see your progress.</p>
            </div>
          ) : (
            <div className="budget-gauge-wrap">
              <div className="budget-gauge">
                <ResponsiveContainer width="100%" height={230}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="82%" outerRadius="100%" barSize={18}
                    data={[{ value: Math.min(budget.usedPercent, 100) }]} startAngle={90} endAngle={-270}>
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar dataKey="value" cornerRadius={10} fill="#D4A853" background={{ fill: 'rgba(248,246,241,0.14)' }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="gauge-center">
                  <span className="gauge-value">{budget.usedPercent}%</span>
                  <span className="gauge-label">of budget used</span>
                </div>
              </div>
              <div className="budget-hero-stats">
                <div className="bstat">
                  <span className="bstat-label">Spent</span>
                  <span className="bstat-value">{formatINR(budget.spent)}</span>
                </div>
                <div className="bstat">
                  <span className="bstat-label">Planned</span>
                  <span className="bstat-value">{formatINR(budget.monthlyBudget)}</span>
                </div>
                <div className="bstat">
                  <span className="bstat-label">Left</span>
                  <span className="bstat-value">{formatINR(budget.remaining)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>


      <div className="dashboard-grid">
        <div className="card">
          <span className="section-label">WHERE IT WENT</span>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3>Category distribution</h3>
            <div className="cat-filter" ref={catFilterRef}>
            <button className="topbar-icon-btn" aria-label="Filter categories" onClick={() => setCatFilterOpen((v) => !v)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            </button>
            {catFilterOpen && (
              <div className="cat-filter-menu">
                <div className="cat-filter-head">
                  <span className="cat-filter-title">Show categories</span>
                  <button className="cat-filter-reset" onClick={() => setHiddenCats([])}>Reset all</button>
                </div>
                {categoryBreakdown.map((c) => (
                  <label key={c.name} className="cat-filter-item">
                    <input
                      type="checkbox"
                      checked={!hiddenCats.includes(c.name)}
                      onChange={() => toggleCat(c.name)}
                    />
                    <span className="legend-dot" style={{ background: catColor(c) }} />
                    <span>{c.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          </div>
          {categoryBreakdown.length === 0 ? (
            <p className="text-muted text-sm">Add expenses to see breakdown.</p>
          ) : visibleCats.length === 0 ? (
            <p className="text-muted text-sm">All categories hidden — press the filter to reset.</p>
          ) : (
            <div className="chart-container">
              <div className="donut-wrap">
                <div className="donut-center">
                  <span className="donut-center-label">SPENT</span>
                  <span className="donut-center-value">{formatINR(visibleTotal)}</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={visibleCats} dataKey="value" nameKey="name" innerRadius={65} outerRadius={90} paddingAngle={2} stroke="none">
                      {visibleCats.map((cat) => <Cell key={cat.name} fill={catColor(cat)} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [formatINR(v), 'Spent']} {...TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-legend">
                {visibleCats.map((cat) => (
                  <div key={cat.name} className="legend-item">
                    <span className="legend-dot" style={{ background: catColor(cat) }} />
                    <span className="legend-name">{cat.name}</span>
                    <span className="legend-pct">{visiblePct(cat.value)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
            <div>
              <span className="section-label">SPENDING PULSE</span>
              <h3>Weekly outflow</h3>
            </div>
            <div className="chart-tabs">
              <button className={`chart-tab${pulseView === 'weekly' ? ' active' : ''}`} onClick={() => setPulseView('weekly')}>Weekly</button>
              <button className={`chart-tab${pulseView === 'daily' ? ' active' : ''}`} onClick={() => setPulseView('daily')}>Daily</button>
            </div>
          </div>
          {pulseView === 'weekly' ? (
            weeklySpending.length === 0 ? (
              <p className="text-muted text-sm">Add expenses to see weekly patterns.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={weeklySpending} barSize={28} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,17,17,0.06)" vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: '#8A8A8A', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8A8A8A', fontSize: 11 }} axisLine={false} tickLine={false} width={42} tickFormatter={formatCompact} />
                  <Tooltip formatter={(v) => [formatINR(v), 'Spent']} cursor={{ fill: 'rgba(23,63,53,0.04)' }} {...TOOLTIP_STYLE} />
                  <Bar dataKey="amount" fill="#173F35" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailySpending}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,17,17,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#8A8A8A', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#8A8A8A', fontSize: 11 }} axisLine={false} tickLine={false} width={42} tickFormatter={formatCompact} />
                <Tooltip formatter={(v) => [formatINR(v), 'Spent']} {...TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="amount" stroke="#173F35" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>


      <div className="dashboard-grid">
        <div className="card">
          <span className="section-label">BUDGET CONTROL</span>
          <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
            <h3>Budget vs actual</h3>
            <span className="chart-legend-inline">
              <span><i className="legend-swatch" style={{ background: '#173F35' }} />Spent</span>
              <span><i className="legend-swatch" style={{ background: 'rgba(23,63,53,0.22)' }} />Budget</span>
            </span>
          </div>
          {budgetVsActual.length === 0 ? (
            <p className="text-muted text-sm">Set a monthly budget in Settings to see this comparison.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={budgetVsActual} barSize={44} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,17,17,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#5C6B7D', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8A8A8A', fontSize: 11 }} axisLine={false} tickLine={false} width={42} tickFormatter={formatCompact} />
                  <Tooltip formatter={(v) => [formatINR(v), '']} cursor={{ fill: 'rgba(23,63,53,0.04)' }} {...TOOLTIP_STYLE} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={44}>
                    <Cell fill="#E67E4D" />
                    <Cell fill="rgba(23,63,53,0.22)" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="budget-compare-text">
                {budget.monthlyBudget - summary.totalExpenses >= 0
                  ? `You have ${formatINR(Math.round(budget.monthlyBudget - summary.totalExpenses))} of your budget still available.`
                  : `You are ${formatINR(Math.round(summary.totalExpenses - budget.monthlyBudget))} over your monthly budget.`}
              </p>
            </>
          )}
        </div>

        <div className="card">
          <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
            <div>
              <span className="section-label">CASH FLOW</span>
              <h3>Balance trend this month</h3>
            </div>
          </div>
          {cashflow.length === 0 ? (
            <p className="text-muted text-sm">Add transactions to see when money runs out.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={cashflow}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,17,17,0.06)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#8A8A8A', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#8A8A8A', fontSize: 11 }} axisLine={false} tickLine={false} width={42} tickFormatter={formatCompact} />
                  <Tooltip formatter={(v) => [formatINR(v), 'Balance']} {...TOOLTIP_STYLE} />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke={runOutDay ? '#C44D3F' : '#173F35'}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="budget-compare-text">
                {runOutDay
                  ? `Lowest point around ${runOutNearest.label} — plan spending before then so you don't run out.`
                  : `Balance stays positive all month (lowest point ${runOutNearest.label}).`}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
