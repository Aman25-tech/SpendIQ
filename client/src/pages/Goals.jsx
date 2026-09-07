import { useState, useEffect } from 'react';
import api from '../services/api';
import './Goals.css';

const EMPTY_FORM = { title: '', targetAmount: '', targetDate: '' };

function Goals() {
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deposit, setDeposit] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const res = await api.get('/goals');
      setGoals(res.data.data);
    } catch (err) {
      setError('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const flash = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        targetAmount: parseFloat(form.targetAmount),
        targetDate: form.targetDate || undefined,
      };
      const res = await api.post('/goals', payload);
      setGoals((prev) => [res.data.data, ...prev]);
      setForm(EMPTY_FORM);
      flash('Goal created!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save goal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeposit = async (goalId) => {
    const amount = parseFloat(deposit[goalId]);
    if (!amount || amount <= 0) return;
    setError('');
    try {
      const res = await api.post(`/goals/${goalId}/deposit`, { amount });
      setGoals((prev) => prev.map((g) => (g._id === goalId ? res.data.data : g)));
      setDeposit((prev) => ({ ...prev, [goalId]: '' }));
      flash('Deposit added!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deposit');
    }
  };

  const handleDelete = async (goalId, title) => {
    if (!window.confirm(`Remove goal "${title}"?`)) return;
    try {
      await api.delete(`/goals/${goalId}`);
      setGoals((prev) => prev.filter((g) => g._id !== goalId));
      flash('Goal removed');
    } catch (err) {
      setError('Failed to delete goal');
    }
  };

  const fmtINR = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '60vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');
  const totalSaved = activeGoals.reduce((sum, g) => sum + g.savedAmount, 0);
  const totalTarget = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const closestGoal = activeGoals
    .filter((g) => g.targetDate)
    .sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate))[0];

  return (
    <div className="goals-page">
      <div className="goals-header">
        <span className="section-label">Make the future feel closer</span>
        <h1 className="page-title">Saving Goals</h1>
        <p className="page-subtitle">
          Track progress on your savings goals.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}


      <div className="goals-kpi-row">
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Active Goals</span>
            <span className="kpi-icon">🎯</span>
          </div>
          <span className="kpi-value">{activeGoals.length}</span>
          <span className="kpi-sub">in progress</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Total Saved</span>
            <span className="kpi-icon kpi-icon-coral">₹</span>
          </div>
          <span className="kpi-value">{fmtINR(totalSaved)}</span>
          <span className="kpi-sub">
            of {totalTarget > 0 ? fmtINR(totalTarget) : '—'} target
          </span>
        </div>
        {closestGoal && (
          <div className="kpi-card">
            <div className="kpi-top">
              <span className="kpi-label">Closest Deadline</span>
              <span className="kpi-icon kpi-icon-gold">⏰</span>
            </div>
            <span className="kpi-value">{closestGoal.title}</span>
            <span className="kpi-sub">
              {new Date(closestGoal.targetDate).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </span>
          </div>
        )}
      </div>


      <div className="card goals-form-card">
        <span className="section-label">New goal</span>
        <h3>Create a saving goal</h3>
        <form onSubmit={handleSubmit} className="goals-form">
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Title</label>
              <input
                name="title"
                type="text"
                className="form-input"
                placeholder="e.g., Emergency Fund"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Target (₹)</label>
              <input
                name="targetAmount"
                type="number"
                className="form-input"
                placeholder="e.g., 50000"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                required
                min="1"
                step="1"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Deadline (optional)</label>
              <input
                name="targetDate"
                type="date"
                className="form-input"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Create Goal'}
          </button>
        </form>
      </div>


      <div className="goals-section-header">
        <h3>In Progress</h3>
        <span className="badge badge-forest">{activeGoals.length}</span>
      </div>
      {activeGoals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <p className="text-muted">No active goals. Create one above!</p>
        </div>
      ) : (
        <div className="goals-grid">
          {activeGoals.map((goal) => {
            const rounded = Math.round(goal.progressPercent);
            return (
              <div key={goal._id} className="card goal-card">
                <div className="goal-card-head">
                  <div className="goal-ring" style={{ '--p': `${rounded * 3.6}deg` }}>
                    <div className="goal-ring-inner">
                      <strong>{rounded}%</strong>
                    </div>
                  </div>
                  <div className="goal-card-info">
                    <h4>{goal.title}</h4>
                    <p className="goal-saved">
                      {fmtINR(goal.savedAmount)}
                      <span className="text-muted"> of {fmtINR(goal.targetAmount)}</span>
                    </p>
                    {goal.targetDate && (
                      <p className="goal-deadline">
                        🗓️ by {new Date(goal.targetDate).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    )}
                    <p className={`goal-remaining ${goal.progressPercent >= 50 ? 'text-success' : 'text-muted'}`}>
                      {fmtINR(Math.max(goal.targetAmount - goal.savedAmount, 0))} left
                    </p>
                  </div>
                </div>

                <div className="goal-progress-bar">
                  <div
                    className="goal-progress-fill"
                    style={{ width: `${Math.min(rounded, 100)}%` }}
                  />
                </div>
                <div className="goal-card-actions">
                  <div className="goal-deposit">
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Deposit ₹"
                      min="1"
                      step="1"
                      value={deposit[goal._id] || ''}
                      onChange={(e) => setDeposit({ ...deposit, [goal._id]: e.target.value })}
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleDeposit(goal._id)}
                    >
                      Add funds
                    </button>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(goal._id, goal.title)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}


      {completedGoals.length > 0 && (
        <>
          <div className="goals-section-header">
            <h3>Completed</h3>
            <span className="badge badge-gold">🎉 {completedGoals.length}</span>
          </div>
          <div className="goals-grid">
            {completedGoals.map((goal) => (
              <div key={goal._id} className="card goal-card goal-card-done">
                <div className="goal-card-head">
                  <div className="goal-ring done" style={{ '--p': '360deg' }}>
                    <div className="goal-ring-inner">✅</div>
                  </div>
                  <div className="goal-card-info">
                    <h4>{goal.title}</h4>
                    <p className="goal-saved text-success">
                      {fmtINR(goal.savedAmount)} of {fmtINR(goal.targetAmount)} — complete
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Goals;
