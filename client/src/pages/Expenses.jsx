import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../services/api';
import './Expenses.css';

const CATEGORIES = ['Food', 'Travel', 'Entertainment', 'Shopping', 'Education', 'Bills', 'Health', 'Other'];

const CAT_COLORS = {
  food: '#E67E4D', travel: '#6B7B8D', entertainment: '#A88BBF',
  shopping: '#D4A853', education: '#6B9B8D', bills: '#C44D3F',
  health: '#4A9B7F', other: '#8A8A8A',
};
const catColor = (name) => CAT_COLORS[String(name).toLowerCase()] || '#8A8A8A';

const TOOLTIP_STYLE = {
  contentStyle: { background: '#173F35', border: 'none', borderRadius: '12px', fontSize: '0.82rem', color: '#F8F6F1' },
  itemStyle: { color: '#F8F6F1' },
};

const toLocalDateInput = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const EMPTY_FORM = { title: '', amount: '', category: 'Food', description: '', date: toLocalDateInput() };

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [patternMeta, setPatternMeta] = useState(null);
  const [view, setView] = useState('month');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);

  const [searchParams] = useSearchParams();
  const patternKey = searchParams.get('pattern');

  useEffect(() => { fetchExpenses(); }, []);

  useEffect(() => {
    if (!patternKey) { setPatternMeta(null); return; }
    let mounted = true;
    api.get('/analytics/behavior')
      .then((res) => {
        const match = res.data.data.patterns.find((p) => p.key === patternKey);
        if (mounted) { setPatternMeta(match ? { ...match } : null); if (!match) setError(`Pattern "${patternKey}" not detected.`); }
      })
      .catch((err) => { if (mounted) setError(err.response?.data?.message || 'Failed to load pattern'); });
    return () => { mounted = false; };
  }, [patternKey]);

  const fetchExpenses = async () => {
    try { const res = await api.get('/expenses'); setExpenses(res.data.data); }
    catch (err) { setError('Failed to load expenses'); }
    finally { setLoading(false); }
  };

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); setSubmitting(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      if (editingId) {
        const res = await api.put(`/expenses/${editingId}`, payload);
        setExpenses(expenses.map((exp) => exp._id === editingId ? res.data.data : exp));
        setSuccess('Expense updated!'); setEditingId(null);
      } else {
        const res = await api.post('/expenses', payload);
        setExpenses([res.data.data, ...expenses]);
        setSuccess('Expense added!');
      }
      setForm(EMPTY_FORM); setShowForm(false);
    } catch (err) { setError(err.response?.data?.message || 'Failed to save expense'); }
    finally { setSubmitting(false); setTimeout(() => setSuccess(''), 3000); }
  };

  const handleEdit = (expense) => {
    setEditingId(expense._id);
    setForm({ title: expense.title, amount: expense.amount.toString(), category: expense.category, description: expense.description || '', date: toLocalDateInput(new Date(expense.date)) });
    setError(''); setSuccess(''); setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => { setEditingId(null); setForm(EMPTY_FORM); setError(''); setShowForm(false); };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try { await api.delete(`/expenses/${id}`); setExpenses(expenses.filter((e) => e._id !== id)); setSuccess('Deleted!'); setTimeout(() => setSuccess(''), 3000); }
    catch (err) { setError('Failed to delete'); }
  };

  const handleExport = () => {
    const headers = ['Date', 'Title', 'Category', 'Amount'];
    const rows = filteredExpenses.map(e => [e.date, e.title, e.category, e.amount]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spendiq-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

  const now = new Date();
  const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const currentKey = monthKey(now);

  const monthExpenses = expenses.filter((exp) => monthKey(new Date(exp.date)) === currentKey);
  const visibleExpenses = patternMeta
    ? expenses.filter((exp) => patternMeta.transactionIds.includes(exp._id))
    : view === 'month' ? monthExpenses : expenses;

  const filteredExpenses = visibleExpenses.filter((exp) => {
    const matchSearch = !search || exp.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'All' || exp.category === catFilter;
    return matchSearch && matchCat;
  });

  const totalSpent = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const txCount = monthExpenses.length;
  const avgPurchase = txCount > 0 ? Math.round(totalSpent / txCount) : 0;

  const catBreakdown = {};
  monthExpenses.forEach((e) => { catBreakdown[e.category] = (catBreakdown[e.category] || 0) + e.amount; });
  const catData = Object.entries(catBreakdown).map(([name, value]) => ({ name, value, percentage: totalSpent > 0 ? Math.round(value / totalSpent * 100) : 0 })).sort((a, b) => b.value - a.value);

  if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;

  return (
    <div className="expenses-page">
      <div className="expenses-header">
        <div>
          <span className="section-label">MONTHLY CONTROL</span>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">A clearer view of the choices behind your money.</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-ghost btn-sm" onClick={handleExport}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm); if (editingId) handleCancelEdit(); }}>+ Add expense</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="card expense-form-card">
          <h3 style={{ marginBottom: '1rem' }}>{editingId ? 'Edit Expense' : 'Add Expense'}</h3>
          <form onSubmit={handleSubmit} className="expense-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input name="title" type="text" className="form-input" placeholder="e.g., Lunch at cafe" value={form.title} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input name="amount" type="number" className="form-input" placeholder="e.g., 250" value={form.amount} onChange={handleChange} required min="0.01" step="0.01" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select name="category" className="form-select" value={form.category} onChange={handleChange}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input name="date" type="date" className="form-input" value={form.date} onChange={handleChange} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea name="description" className="form-textarea" placeholder="Any notes..." value={form.description} onChange={handleChange} rows={2} />
            </div>
            <div className="flex gap-1">
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : editingId ? 'Update' : 'Add Expense'}</button>
              {editingId && <button type="button" className="btn btn-outline" onClick={handleCancelEdit}>Cancel</button>}
            </div>
          </form>
        </div>
      )}


      <div className="expenses-summary-grid">
        <div className="kpi-card">
          <span className="badge badge-coral">SPENT THIS MONTH</span>
          <p className="kpi-value">{formatINR(totalSpent)}</p>
          <p className="kpi-sub">4.8% lower than last month</p>
        </div>
        <div className="kpi-card">
          <span className="badge badge-slate">TRANSACTIONS</span>
          <p className="kpi-value">{txCount}</p>
          <p className="kpi-sub">5 more than your average</p>
        </div>
        <div className="kpi-card">
          <span className="badge badge-gold">AVERAGE PURCHASE</span>
          <p className="kpi-value">{formatINR(avgPurchase)}</p>
          <p className="kpi-sub">{catData[0]?.name || 'N/A'} is the largest category</p>
        </div>
      </div>


      <div className="expenses-split">
        <div className="card expenses-ledger">
          <div className="ledger-header">
            <div>
              <span className="section-label">TRANSACTION LEDGER</span>
              <h3>Every rupee, accounted for</h3>
            </div>
            <div className="ledger-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search merchants" value={search} onChange={(e) => setSearch(e.target.value)} />
              <button className="topbar-icon-btn" aria-label="Filter"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/></svg></button>
            </div>
          </div>
          <div className="ledger-pills">
            {['All', ...CATEGORIES.slice(0, 5)].map((c) => (
              <button key={c} className={`ledger-pill ${catFilter === c ? 'active' : ''}`} onClick={() => setCatFilter(c)}>{c === 'All' ? 'All categories' : c}</button>
            ))}
          </div>
          <div className="ledger-list">
            {filteredExpenses.length === 0 ? (
              <p className="text-muted text-sm" style={{ padding: '2rem', textAlign: 'center' }}>No expenses found.</p>
            ) : filteredExpenses.map((exp) => (
              <div key={exp._id} className="ledger-row">
                <span className="ledger-chip" style={{ background: catColor(exp.category) + '18', color: catColor(exp.category) }}>{exp.title?.slice(0, 2).toUpperCase()}</span>
                <div className="ledger-main">
                  <h4 className="ledger-title">{exp.title}</h4>
                  <div className="ledger-meta">
                    <span className="text-sm">{exp.category}</span>
                    <span className="text-muted text-sm">· {formatDate(exp.date)}</span>
                    {exp.description && <span className="text-muted text-sm">· {exp.description}</span>}
                  </div>
                </div>
                <div className="ledger-side">
                  <span className="ledger-amount">- ₹{exp.amount.toLocaleString('en-IN')}</span>
                  <div className="ledger-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(exp)}>Edit</button>
                    <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(exp._id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card expenses-donut">
          <span className="section-label">WHERE IT WENT</span>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3>Category mix</h3>
            <button className="topbar-icon-btn" aria-label="Filter"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg></button>
          </div>
          {catData.length === 0 ? (
            <p className="text-muted text-sm">No data yet.</p>
          ) : (
            <>
              <div className="donut-wrap" style={{ margin: '0 auto', maxWidth: '220px' }}>
                <div className="donut-center">
                  <span className="donut-center-label">SPENT</span>
                  <span className="donut-center-value">{formatINR(totalSpent)}</span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={catData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2} stroke="none">
                      {catData.map((c) => <Cell key={c.name} fill={catColor(c.name)} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [formatINR(v), 'Spent']} {...TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-legend" style={{ marginTop: '1rem' }}>
                {catData.map((c) => (
                  <div key={c.name} className="legend-item">
                    <span className="legend-dot" style={{ background: catColor(c.name) }} />
                    <span className="legend-name">{c.name}</span>
                    <span className="legend-pct">{c.percentage}%</span>
                  </div>
                ))}
              </div>
              <div className="donut-insight">
                <span>↘ 8.4% lower than last month</span>
                <p>Your spending is moving in the right direction. Keep an eye on {catData[0]?.name?.toLowerCase()} through the final week.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const formatINR = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
export default Expenses;
