import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import {
  signInWithEmail,
  signInWithGoogle,
  signInWithX,
  isRateLimited,
  type AuthResult,
} from '../services/authService';
import { useUser } from '../contexts/UserContext';
import AuthLayout from '../components/common/AuthLayout';
import TypewriterText from '../components/auth/TypewriterText';

const PROVIDER_LABELS: Record<string, string> = {
  'google.com': 'Google',
  'twitter.com': 'X',
  'password': 'Email',
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<'email' | 'google' | 'x' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLockSeconds, setRateLockSeconds] = useState(0);
  const [conflictInfo, setConflictInfo] = useState<{ methods: string[]; email: string } | null>(null);

  useEffect(() => {
    if (user) navigate('/cove', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (rateLockSeconds <= 0) return;
    const id = setInterval(() => {
      setRateLockSeconds((s) => {
        if (s <= 1) { clearInterval(id); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [rateLockSeconds]);

  const handleResult = (result: AuthResult) => {
    if (result.user) {
      setUser(result.user);
      navigate('/cove', { replace: true });
      return;
    }

    const code = result.error || 'unknown';
    if (code.startsWith('wrong_password:')) {
      const left = code.split(':')[1];
      setError(parseInt(left) > 0 ? `Incorrect password, ${left} attempts remaining` : 'Account locked due to multiple failed attempts.');
      return;
    }
    if (code.startsWith('rate_limited:')) {
      const secs = parseInt(code.split(':')[1]);
      setRateLockSeconds(secs);
      setError(`Too many attempts. Please try again in ${secs}s`);
      return;
    }
    if (code === 'account_exists_different_credential' && result.existingMethods) {
      setConflictInfo({ methods: result.existingMethods, email });
      return;
    }

    const messages: Record<string, string> = {
      user_not_found: 'Account not found. Please sign up first.',
      invalid_email: 'Invalid email format.',
      cancelled: '',
      popup_blocked: 'Popup blocked. Please allow popups and try again.',
      unknown: 'Login failed. Please try again later.',
    };
    let msg = messages[code] ?? 'Login failed';
    if (code.startsWith('email_delivery_failed:')) {
      msg = `Login success, but mail error: ${code.split(':')[1]}`;
    }
    if (msg) setError(msg);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConflictInfo(null);

    const rateCheck = isRateLimited();
    if (rateCheck.limited) {
      setRateLockSeconds(rateCheck.secondsLeft);
      setError(`Too many attempts. Please try again in ${rateCheck.secondsLeft}s`);
      return;
    }

    if (!email || !password) { setError('Please enter email and password'); return; }

    setLoading('email');
    const result = await signInWithEmail(email, password);
    setLoading(null);
    handleResult(result);
  };

  const handleSocialLogin = async (provider: 'google' | 'x') => {
    setError(null);
    setConflictInfo(null);
    setLoading(provider);
    let result: AuthResult;
    if (provider === 'google') result = await signInWithGoogle();
    else result = await signInWithX();
    setLoading(null);
    handleResult(result);
  };

  return (
    <AuthLayout>
      <TypewriterText
        contents={[
          { title: "Welcome back", subtitle: "Sign in to StartlyTab to continue." },
          { title: "欢迎回来", subtitle: "登录以继续使用 StartlyTab。" },
          { title: "おかえりなさい", subtitle: "StartlyTab にログインして続行してください。" },
          { title: "환영합니다", subtitle: "StartlyTab에 로그인하여 계속하세요." },
          { title: "Bienvenido de nuevo", subtitle: "Inicia sesión en StartlyTab para continuar." },
          { title: "Bon retour", subtitle: "Connectez-vous à StartlyTab pour continuer." },
        ]}
      />

      <div className="social-auth-group">
        <button className="social-auth-btn" onClick={() => handleSocialLogin('x')} title="Continue with X">
          {loading === 'x' ? <Loader2 size={20} className="animate-spin" /> : <XIcon />}
        </button>
        <button className="social-auth-btn" onClick={() => handleSocialLogin('google')} title="Continue with Google">
          {loading === 'google' ? <Loader2 size={20} className="animate-spin" /> : <GoogleIcon />}
        </button>
      </div>

      <div className="auth-separator">
        <div className="auth-separator-line" />
        <span className="auth-separator-text">or</span>
        <div className="auth-separator-line" />
      </div>

      {conflictInfo && (
        <div className="auth-error border-amber-100 bg-amber-50 text-amber-700 mb-6 font-medium">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            This email is already linked to {conflictInfo.methods.map(m => PROVIDER_LABELS[m] || m).join(', ')}.
          </div>
        </div>
      )}

      {error && !conflictInfo && (
        <div className="auth-error">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleEmailLogin}>
        <div className="auth-input-group">
          <div className="auth-input-wrapper">
            <input
              type="email"
              placeholder="Email address"
              className="auth-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={!!loading || rateLockSeconds > 0}
              required
            />
          </div>
          <div className="auth-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              className="auth-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={!!loading || rateLockSeconds > 0}
              required
            />
            <button
              type="button"
              className="auth-input-icon-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div className="flex justify-end mb-6 -mt-2">
          <Link to="/reset-password" id="forgot-password" className="text-sm font-semibold text-[#737373] hover:text-[#1A1A1A] transition-colors">
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="auth-submit-btn" disabled={!!loading || rateLockSeconds > 0}>
          {loading === 'email' ? <Loader2 size={20} className="animate-spin mx-auto" /> : (rateLockSeconds > 0 ? `Wait ${rateLockSeconds}s` : 'Sign in')}
        </button>
      </form>

      <div className="auth-footer">
        Don’t have an account? <Link to="/signup" className="auth-link">Sign up</Link>
      </div>
    </AuthLayout>
  );
};

// SVG Components
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);


export default LoginPage;
