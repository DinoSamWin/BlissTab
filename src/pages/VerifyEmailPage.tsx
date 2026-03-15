import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, CheckCircle2, Loader2, RefreshCw, ArrowLeft } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { reloadUser, resendVerificationEmail } from '../services/authService';
import AuthLayout from '../components/common/AuthLayout';

const VerifyEmailPage: React.FC = () => {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isVerified, setIsVerified] = useState(() => !!user?.emailVerified);
  const [countdown, setCountdown] = useState(() => (user?.emailVerified ? 0 : 3));

  useEffect(() => {
    if (!user) {
      const t = setTimeout(() => { navigate('/login', { replace: true }); }, 100);
      return () => clearTimeout(t);
    }
    if (user.emailVerified) {
      navigate('/cove', { replace: true });
    }
  }, [user?.emailVerified, !!user, navigate]);

  useEffect(() => {
    if (isVerified || !user) return;
    const interval = setInterval(async () => {
      const updatedUser = await reloadUser();
      if (updatedUser?.emailVerified) {
        setIsVerified(true);
        setUser(updatedUser);
        navigate('/cove', { replace: true });
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isVerified, user, setUser, navigate]);

  useEffect(() => {
    if (!isVerified) return;
    if (countdown <= 0) {
      navigate('/cove', { replace: true });
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [isVerified, countdown, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown(s => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    await resendVerificationEmail();
    setResending(false);
    setResendCooldown(60);
  };

  return (
    <AuthLayout showCharacter={false}>
      <div className="text-center">
        {isVerified ? (
          <div className="animate-reveal">
            <div className="auth-success-icon">
              <CheckCircle2 size={36} />
            </div>
            
            <h1 className="auth-title">Success!</h1>
            
            <p className="auth-subtitle">
              Your email has been verified. Redirecting in <span className="font-bold text-[#1A1A1A]">{countdown}s</span>...
            </p>

            <Link to="/cove" className="auth-submit-btn flex items-center justify-center no-underline">
              Go to Homepage Now
            </Link>
          </div>
        ) : (
          <div>
            <div className="auth-success-icon bg-blue-50 text-blue-500">
              <Mail size={32} />
            </div>
            
            <h1 className="auth-title">Verify your email</h1>
            
            <p className="auth-subtitle">
              A verification email has been sent to:<br />
              <span className="font-bold text-[#1A1A1A]">{user?.email}</span>
            </p>

            <div className="bg-[#F9FAFB] rounded-2xl p-6 text-left mb-8 text-sm text-[#737373] border border-[#E5E7EB]">
              <div className="flex gap-3 mb-3">
                <span className="font-bold text-[#1A1A1A]">1.</span>
                <span>Open your inbox and look for an email from <strong>StartlyTab</strong>.</span>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-[#1A1A1A]">2.</span>
                <span>Click the link in the email. This page will update automatically.</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || resending}
                className="auth-submit-btn w-full flex items-center justify-center gap-2 mb-2"
              >
                {resending ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                {resendCooldown > 0 ? `Resend in ${resendCooldown} seconds` : 'Resend verification link'}
              </button>

              <Link 
                to="/login"
                onClick={() => setUser(null)}
                className="mt-2 text-[#A3A3A3] hover:text-[#1A1A1A] transition-colors flex items-center justify-center gap-1 text-sm no-underline"
              >
                <ArrowLeft size={14} />
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
};

export default VerifyEmailPage;
