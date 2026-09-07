import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
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
          <span className="section-label auth-brand-eyebrow">Welcome back</span>
          <h1>Sign in to your clarity.</h1>
          <p>Pick up where your financial picture left off.</p>
        </div>
      </aside>


      <main className="auth-form-side">
        <div className="auth-form-wrap">
          <span className="section-label">Start with clarity</span>
          <h2 className="auth-heading">Welcome back.</h2>
          <p className="auth-lead">Sign in to see the shape of your money.</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                id="login-email"
                name="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                id="login-password"
                name="password"
                type="password"
                className="form-input"
                placeholder="Your password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="auth-switch">
            Don&apos;t have an account?{' '}
            <Link to="/register">Create one</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default Login;
