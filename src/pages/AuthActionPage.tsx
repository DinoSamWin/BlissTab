import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { auth } from '../services/firebaseService';
import { applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../components/common/AuthLayout';
import TypewriterText from '../components/auth/TypewriterText';

const AuthActionPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'reset-form'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!mode || !oobCode) {
      setStatus('error');
      setErrorMsg('Invalid or missing action link.');
      return;
    }

    const handleAction = async () => {
      try {
        if (mode === 'verifyEmail') {
          await applyActionCode(auth, oobCode);
          setStatus('success');
        } else if (mode === 'resetPassword') {
          try {
            const userEmail = await verifyPasswordResetCode(auth, oobCode);
            setEmail(userEmail);
            setStatus('reset-form');
          } catch (err: any) {
            throw err;
          }
        } else {
          setStatus('error');
          setErrorMsg('Unsupported action mode.');
        }
      } catch (err: any) {
        setStatus('error');
        const code = err.code || '';
        if (code === 'auth/expired-action-code') setErrorMsg('The link has expired. Please request a new one.');
        else if (code === 'auth/invalid-action-code') setErrorMsg('The link is invalid or has already been used.');
        else setErrorMsg('An error occurred. Please try again later.');
      }
    };

    handleAction();
  }, [mode, oobCode]);

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode || !newPassword) return;
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStatus('success');
    } catch (err: any) {
      setErrorMsg('Failed to reset password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (status !== 'success') return;
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          navigate('/login', { replace: true });
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, navigate]);

  return (
    <AuthLayout showCharacter={false}>
      <div className="text-center">
        {status === 'loading' && (
          <div className="animate-pulse py-8">
            <Loader2 size={48} className="animate-spin text-[#1A1A1A] mx-auto mb-6" />
            <h2 className="auth-title">Processing request...</h2>
            <p className="auth-subtitle">Securing your account, please wait a moment.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="animate-reveal py-8 flex flex-col items-center text-center">
            <div className="auth-success-icon bg-green-50 text-green-500 mb-6 flex items-center justify-center">
              <CheckCircle2 size={40} />
            </div>
            
            <h1 className="auth-title">Password Changed</h1>
            
            <p className="auth-subtitle mb-8">
              Your password has been updated successfully.<br />
              Redirecting to login in <span className="font-bold text-[#1A1A1A]">{countdown}s</span>.
            </p>

            <Link
              to="/login"
              className="auth-submit-btn w-full block no-underline text-center"
            >
              Go to Login
            </Link>
          </div>
        )}

        {status === 'reset-form' && (
          <div className="animate-reveal">
            <h1 className="auth-title">Create new password</h1>
            <p className="auth-subtitle mb-8 text-center">
              Setting a new password for <span className="font-semibold text-[#1A1A1A]">{email}</span>
            </p>

            <div className="space-y-6">
              <div className="auth-input-group mb-6 text-left">
                <div className="auth-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="New password"
                    className="auth-input pr-12"
                    value={newPassword}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleResetSubmit(e);
                    }}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setErrorMsg('');
                    }}
                    required
                    minLength={6}
                    autoFocus
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

              {errorMsg && (
                <div className="auth-error mb-6 flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button 
                type="button" 
                className="auth-submit-btn w-full"
                onClick={handleResetSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 size={20} className="white-spin mx-auto" />
                ) : (
                  'Reset password'
                )}
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="animate-reveal">
            <div className="auth-success-icon bg-red-50 text-red-500">
              <AlertCircle size={40} />
            </div>
            
            <h2 className="auth-title">Something went wrong</h2>
            <p className="auth-subtitle mb-8">
              {errorMsg || 'We couldn\'t verify your request. Please ensure the link is correct.'}
            </p>

            <div className="flex flex-col gap-3">
              <Link 
                to="/login"
                className="auth-submit-btn flex items-center justify-center no-underline"
              >
                Return to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
};

export default AuthActionPage;
