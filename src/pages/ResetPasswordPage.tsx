import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { sendPasswordReset } from '../services/authService';
import AuthLayout from '../components/common/AuthLayout';

const ResetPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => {
      setResendCooldown(s => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) { setError('Please enter your email address'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Invalid email format'); return; }

    setLoading(true);
    await sendPasswordReset(email);
    setLoading(false);
    setSent(true);
    setResendCooldown(60);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    await sendPasswordReset(email);
    setLoading(false);
    setResendCooldown(60);
  };

  return (
    <AuthLayout showCharacter={false}>
      <div className="text-center">
        <h1 className="auth-title">Reset password</h1>
        <p className="auth-subtitle">
          Enter your email and we'll send you a link to reset your password.
        </p>
      </div>

      {sent ? (
        <div className="animate-reveal">
          <div className="bg-[#F9FAFB] rounded-2xl p-8 mb-8 text-center border border-[#E5E7EB]">
            <div className="auth-success-icon mx-auto mb-4">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="auth-title">Check your email</h3>
            <p className="auth-subtitle mb-0">
              We've sent a password reset link to<br />
              <strong className="text-[#1A1A1A]">{email}</strong>
            </p>
          </div>

          <div className="flex flex-col gap-4 mt-2">
            <div className="text-center text-sm">
              {resendCooldown > 0 ? (
                <div className="text-[#A3A3A3] flex items-center justify-center gap-2 py-2">
                  <RefreshCw size={14} className="animate-spin" />
                  Resend in {resendCooldown} seconds
                </div>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="text-[#737373] hover:text-[#1A1A1A] font-medium transition-colors py-2 flex items-center justify-center gap-2 mx-auto"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Resend reset link
                </button>
              )}
            </div>
            
            <Link to="/login" className="auth-submit-btn flex items-center justify-center no-underline">
              Back to Login
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="auth-error">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="auth-input-group">
            <div className="auth-input-wrapper">
              <input
                type="email"
                placeholder="Email address"
                className="auth-input"
                value={email}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e); }}
                onChange={e => { setEmail(e.target.value); setError(null); }}
                disabled={loading}
                required
              />
            </div>
          </div>

          <button 
            type="button" 
            className="auth-submit-btn mb-6 w-full" 
            onClick={handleSubmit} 
            disabled={loading}
          >
            {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Send reset link'}
          </button>

          <div className="auth-footer text-center">
            Remembered your password? <Link to="/login" className="auth-link">Sign in</Link>
          </div>
        </div>
      )}
    </AuthLayout>
  );
};

export default ResetPasswordPage;
