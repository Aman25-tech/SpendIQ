import { useState, useEffect } from 'react';
import api from '../services/api';
import './Expenses.css';

const SOURCES = ['Salary', 'Freelance', 'Business', 'Gift', 'Investment', 'Other'];

const toLocalDateInput = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const EMPTY_FORM = { title: '', amount: '', source: 'Other', description: '', date: toLocalDateInput() };

function Income() {
  const [incomeList, setIncomeList] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [view, setView] = useState('month');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchIncome(); }, []);

  const fetchIncome = async () => {
    try { const res = await api.get('/income'); setIncomeList(res.data.data); }
    catch { setError('Failed to load income'); }
    finally { setLoading(false); }
  };

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); setSubmitting(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      const res = await api.post('/income', payload);
      setIncomeList([res.data.data, ...incomeList]);
      setForm(EMPTY_FORM); setSuccess('Income added!'); setShowForm(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.response?.data?.message || 'Failed to add income'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this income record?')) return;
    try { await api.delete(`/income/${id}`); setIncomeList(incomeList.filter((i) => i._id !== id)); setSuccess('Deleted!'); setTimeout(() => setSuccess(''), 3000); }
    catch { setError('Failed to delete'); }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const now = new Date();
  const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const currentKey = monthKey(now);
  const visibleIncome = view === 'month' ? incomeList.filter((i) => monthKey(new Date(i.date)) === currentKey) : incomeList;
  const totalIncome = visibleIncome.reduce((s, i) => s + i.amount, 0);
  const isMonthView = view === 'month';

  if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;

  return (
    <div className="expenses-page">
      <div className="expenses-header">
        <div>
          <span className="section-label">MONEY IN</span>
          <h1 className="page-title">Income</h1>
          <p className="page-subtitle">A clearer view of the choices behind your money.</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>+ Add income</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="expenses-summary-grid">
        <div className="kpi-card">
          <span className="badge badge-forest">TOTAL INCOME</span>
          <p className="kpi-value">₹{totalIncome.toLocaleString('en-IN')}</p>
          <p className="kpi-sub">{isMonthView ? 'This month' : 'All time'}</p>
        </div>
        <div className="kpi-card">
          <span className="badge badge-slate">SOURCES</span>
          <p className="kpi-value">{new Set(visibleIncome.map(i => i.source)).size}</p>
          <p className="kpi-sub">Active income streams</p>
        </div>
        <div className="kpi-card">
          <span className="badge badge-gold">ENTRIES</span>
          <p className="kpi-value">{visibleIncome.length}</p>
          <p className="kpi-sub">{isMonthView ? 'This month' : 'Total records'}</p>
        </div>
      </div>

      {showForm && (
        <div className="card expense-form-card">
          <h3 style={{ marginBottom: '1rem' }}>Add Income</h3>
          <form onSubmit={handleSubmit} className="expense-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input name="title" type="text" className="form-input" placeholder="e.g., Monthly salary" value={form.title} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input name="amount" type="number" className="form-input" placeholder="e.g., 30000" value={form.amount} onChange={handleChange} required min="0.01" step="0.01" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Source</label>
                <select name="source" className="form-select" value={form.source} onChange={handleChange}>
                  {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
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
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Add Income'}</button>
          </form>
        </div>
      )}

      <div className="card expenses-ledger">
        <div className="ledger-header">
          <div>
            <span className="section-label">INCOME LEDGER</span>
            <h3>Every rupee, accounted for</h3>
          </div>
          <div className="seg" role="tablist">
            <button className={`seg-btn ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>This Month</button>
            <button className={`seg-btn ${view === 'all' ? 'active' : ''}`} onClick={() => setView('all')}>All Time</button>
          </div>
        </div>
        <div className="ledger-list">
          {visibleIncome.length === 0 ? (
            <p className="text-muted text-sm" style={{ padding: '2rem', textAlign: 'center' }}>No income recorded yet.</p>
          ) : visibleIncome.map((inc) => (
            <div key={inc._id} className="ledger-row">
              <span className="ledger-chip" style={{ background: 'rgba(23,63,53,0.08)', color: 'var(--accent)' }}>{inc.title?.slice(0, 2).toUpperCase()}</span>
              <div className="ledger-main">
                <h4 className="ledger-title">{inc.title}</h4>
                <div className="ledger-meta">
                  <span className="text-sm">{inc.source}</span>
                  <span className="text-muted text-sm">· {formatDate(inc.date)}</span>
                  {inc.description && <span className="text-muted text-sm">· {inc.description}</span>}
                </div>
              </div>
              <div className="ledger-side">
                <span className="ledger-amount" style={{ color: 'var(--accent)' }}>+ ₹{inc.amount.toLocaleString('en-IN')}</span>
                <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(inc._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Income;
