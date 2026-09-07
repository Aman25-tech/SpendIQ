import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Settings.css';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];

function Settings() {
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || '',
    currency: user?.currency || 'INR',
    monthlyBudget: user?.monthlyBudget ?? 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await api.put('/auth/me', {
        name: form.name,
        currency: form.currency,
        monthlyBudget: parseFloat(form.monthlyBudget) || 0,
      });

      updateUser(res.data.user);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <span className="section-label">Make it yours</span>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your profile and monthly budget.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="settings-grid">

        <div className="card settings-profile-card">
          <div className="settings-avatar">
            <span className="settings-avatar-text">
              {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
            </span>
          </div>
          <h3>{user?.name || 'User'}</h3>
          <p className="settings-profile-email">{user?.email || ''}</p>
          <div className="settings-profile-stats">
            <div className="settings-profile-stat">
              <span className="settings-profile-stat-value">{form.currency}</span>
              <span className="settings-profile-stat-label">Currency</span>
            </div>
            <div className="settings-profile-stat">
              <span className="settings-profile-stat-value">
                {form.monthlyBudget > 0 ? `₹${Number(form.monthlyBudget).toLocaleString('en-IN')}` : '—'}
              </span>
              <span className="settings-profile-stat-label">Budget</span>
            </div>
          </div>
        </div>


        <div className="card settings-form-card">
          <span className="section-label">Profile settings</span>
          <h3>Edit profile</h3>
          <form onSubmit={handleSubmit} className="settings-form">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                name="name"
                type="text"
                className="form-input"
                value={form.name}
                onChange={handleChange}
                required
                maxLength="50"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={user?.email || ''}
                disabled
              />
              <p className="text-muted text-sm" style={{ marginTop: '0.35rem' }}>
                Email is read-only for now.
              </p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select
                  name="currency"
                  className="form-select"
                  value={form.currency}
                  onChange={handleChange}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Budget (₹)</label>
                <input
                  name="monthlyBudget"
                  type="number"
                  className="form-input"
                  min="0"
                  step="100"
                  value={form.monthlyBudget}
                  onChange={handleChange}
                  placeholder="e.g., 25000"
                />
              </div>
            </div>

            <p className="text-muted text-sm" style={{ marginBottom: '1rem' }}>
              The budget powers the Budget vs Actual gauge on the dashboard.
            </p>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Settings;
