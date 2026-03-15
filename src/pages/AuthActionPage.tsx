import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { auth } from '../services/firebaseService';
import { applyActionCode } from 'firebase/auth';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import AuthLayout from '../components/common/AuthLayout';

const AuthActionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
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
          // This page just confirms/initializes reset, but usually we redirect to a reset form
          setStatus('success');
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

  useEffect(() => {
    if (status !== 'success') return;
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          window.close();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status]);

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
          <div className="animate-reveal">
            <div className="auth-success-icon bg-green-50 text-green-500">
              <CheckCircle2 size={40} />
            </div>
            
            <h1 className="auth-title">Success!</h1>
            
            <p className="auth-subtitle mb-8">
              Your request has been processed successfully.<br />
              This window will close in <span className="font-bold text-[#1A1A1A]">{countdown}s</span>.
            </p>

            <button
              onClick={() => window.close()}
              className="auth-submit-btn w-full font-semibold"
            >
              Close Window
            </button>
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
