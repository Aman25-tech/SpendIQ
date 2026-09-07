import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(form.name, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      <aside className="auth-brand-panel">
        <div className="auth-brand-mark">
          <div className="auth-logo">₹</div>
          <span className="auth-brand-name">SpendIQ</span>
        </div>
        <div className="auth-brand-copy">
          <span className="section-label auth-brand-eyebrow">Your money, your rhythm</span>
          <h1>Build a relationship with your money.</h1>
          <p>No noise. No shame. Just a clear place to notice what&apos;s working.</p>
        </div>
      </aside>


      <main className="auth-form-side">
        <div className="auth-form-wrap">
          <span className="section-label">Start with clarity</span>
          <h2 className="auth-heading">Create your space.</h2>
          <p className="auth-lead">A few details, then a better view of your money.</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                id="register-name"
                name="name"
                type="text"
                className="form-input"
                placeholder="Aman Gupta"
                value={form.name}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                id="register-email"
                name="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                id="register-password"
                name="password"
                type="password"
                className="form-input"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>

            <button
              id="register-submit"
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default Register;
