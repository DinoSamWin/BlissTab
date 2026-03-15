import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { signUpWithEmail, signInWithGoogle, signInWithX, resendVerificationEmail, type AuthResult } from '../services/authService';
import { useUser } from '../contexts/UserContext';
import AuthLayout from '../components/common/AuthLayout';
import TypewriterText from '../components/auth/TypewriterText';

const PROVIDER_LABELS: Record<string, string> = {
  'google.com': 'Google',
  'twitter.com': 'X',
  'password': 'Email',
};

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<'email' | 'google' | 'x' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflictInfo, setConflictInfo] = useState<{ methods: string[]; email: string } | null>(null);
  const [verificationPending, setVerificationPending] = useState<{ email: string } | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (user && user.emailVerified) navigate('/cove', { replace: true });
    else if (user && !user.emailVerified) navigate('/verify-email', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown(s => s <= 1 ? 0 : s - 1), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const handleResult = (result: AuthResult, signedUpEmail?: string) => {
    if (result.needsEmailVerification && signedUpEmail) {
      setVerificationPending({ email: signedUpEmail });
      setResendCooldown(60);
      return;
    }
    if (result.user) {
      setUser(result.user);
      navigate('/cove', { replace: true });
      return;
    }

    const code = result.error || 'unknown';
    if (code === 'email_in_use') {
      const methods = result.existingMethods || [];
      setConflictInfo({ methods, email: signedUpEmail || email });
      return;
    }

    const messages: Record<string, string> = {
      weak_password: 'Password is too weak. Use at least 6 characters.',
      invalid_email: 'Invalid email format.',
      cancelled: '',
      popup_blocked: 'Popup blocked. Please allow popups and try again.',
      unknown: 'Signup failed. Please try again later.',
    };
    let msg = messages[code] ?? 'Signup failed';
    if (code.startsWith('email_delivery_failed:')) {
      msg = `Signup success, but email failed: ${code.split(':')[1]}`;
    }
    if (msg) setError(msg);
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConflictInfo(null);
    if (!email || !password) { setError('Please fill in email and password'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setLoading('email');
    const result = await signUpWithEmail(email, password);
    setLoading(null);
    handleResult(result, email);
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

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    await resendVerificationEmail();
    setResending(false);
    setResendCooldown(60);
  };

  if (verificationPending) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="auth-success-icon">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="auth-title">Verify your email</h2>
          <p className="auth-subtitle">
            We've sent a verification email to <span className="font-semibold text-[#1A1A1A]">{verificationPending.email}</span>. Please check your inbox.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0 || resending}
              className="auth-submit-btn w-full mb-2"
            >
              <div className="flex items-center justify-center gap-2">
                {resending ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                {resendCooldown > 0 ? `Resend in ${resendCooldown} seconds` : 'Resend Email'}
              </div>
            </button>
            <Link to="/login" className="auth-submit-btn flex items-center justify-center no-underline">
              Go to Login
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <TypewriterText
        contents={[
          { title: "Glad you're here :)", subtitle: "Your day deserves a softer start." },
          { title: "很高兴见到你 :)", subtitle: "愿你的每一天都有个温柔的开始。" },
          { title: "お会いできて嬉しいです :)", subtitle: "あなたの一日が穏やかに始まりますように。" },
          { title: "만나서 반가워요 :)", subtitle: "오늘 하루가 부드럽게 시작되길 바랍니다." },
          { title: "Qué bueno que estés aquí :)", subtitle: "Tu día merece un comienzo más suave." },
          { title: "Ravi de vous voir :)", subtitle: "Votre journée mérite un début tout en douceur." },
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
        <div className="auth-error border-amber-100 bg-amber-50 text-amber-700 mb-6">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Email already in use</p>
            <p className="text-xs mb-2">
              <strong>{conflictInfo.email}</strong> is already registered via {conflictInfo.methods.map(m => PROVIDER_LABELS[m] || m).join(', ')}.
            </p>
            <Link to="/login" className="text-xs font-bold underline decoration-2 underline-offset-2">Sign in instead</Link>
          </div>
        </div>
      )}

      {error && !conflictInfo && (
        <div className="auth-error">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleEmailSignup}>
        <div className="auth-input-group">
          <div className="auth-input-wrapper">
            <input
              type="email"
              placeholder="Email address"
              className="auth-input"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null); setConflictInfo(null); }}
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

        <button type="submit" className="auth-submit-btn" disabled={!!loading}>
          {loading === 'email' ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Continue with Email'}
        </button>
      </form>

      <div className="auth-footer">
        Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
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


export default SignupPage;
