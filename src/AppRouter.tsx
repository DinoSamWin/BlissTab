import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import App from './App';
import EchoLand from './pages/EchoLand';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import AuthActionPage from './pages/AuthActionPage';
import SubscriptionPage from './components/SubscriptionPage';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import LoadingDemo from './components/LoadingDemo';
import { User } from './types';
import { updateSubscriptionState } from './services/subscriptionService';
import { UserProvider, useUser } from './contexts/UserContext';

import JumpStarLoading from './components/common/JumpStarLoading';

/**
 * Redirects already-authenticated users away from auth pages.
 * Shows a loading state while Firebase auth is being checked.
 */
const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthChecking } = useUser();
  if (isAuthChecking) return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FBFBFE] dark:bg-[#0A0A0B] z-[1000]">
      <JumpStarLoading caption="正在检查安全状态..." />
    </div>
  );
  if (user) {
    if (!user.emailVerified) return <Navigate to="/verify-email" replace />;
    return <Navigate to="/cove" replace />;
  }
  return <>{children}</>;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthChecking } = useUser();
  const location = useLocation();

  if (isAuthChecking) return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FBFBFE] dark:bg-[#0A0A0B] z-[1000]">
      <JumpStarLoading caption="Starting your day softly..." />
    </div>
  );
  
  if (!user) {
    return <Navigate to="/signup" state={{ from: location }} replace />;
  }
  
  // STABILITY FIX: If the user is verified, let them pass.
  // If we are ALREADY on a /cove path, do NOT kick the user out just because of a transient state update
  // unless we are absolutely sure they are logged out.
  const isCovePath = location.pathname.startsWith('/cove');
  const isVerified = user.emailVerified === true;

  if (!isVerified) {
    // If we are already in Cove, and a background update happens, 
    // we give it a "grace period" or check if it's just a transient false.
    if (isCovePath) {
      console.log('[ProtectedRoute] User in Cove but emailVerified is false. Checking for transient state...');
      // If we have a local record of being verified, trust it.
      const savedUser = localStorage.getItem('focus_tab_user');
      if (savedUser && JSON.parse(savedUser).emailVerified === true) {
        console.log('[ProtectedRoute] Trusting local storage verification to prevent flicker.');
        return <>{children}</>;
      }
    }

    if (location.pathname === '/verify-email') return <>{children}</>;
    return <Navigate to="/verify-email" replace />;
  }
  
  return <>{children}</>;
};

const RootRedirect: React.FC = () => {
  const { user, isAuthChecking } = useUser();
  const location = useLocation();

  if (isAuthChecking) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FBFBFE] dark:bg-[#0A0A0B] z-[1000]">
        <JumpStarLoading caption="Starting your day softly..." />
      </div>
    );
  }

  if (user) {
    // If logged in but NOT verified, allow them to stay on the landing page (App)
    if (!user.emailVerified) return <App key="root-app" />;
    return <Navigate to="/cove" replace />;
  }
  return <App key="root-app" />;
};

const SubscriptionRoute: React.FC = () => {
  const { user, setUser } = useUser();

  const handleSubscriptionUpdate = async (updatedUser: User) => {
    if (updatedUser.id) {
      await updateSubscriptionState(updatedUser.id, {
        isSubscribed: updatedUser.isSubscribed || false,
        subscriptionPlan: updatedUser.subscriptionPlan || 'free',
        subscriptionStatus: updatedUser.subscriptionStatus || 'active',
        subscriptionExpiresAt: updatedUser.subscriptionExpiresAt || null,
      }, updatedUser.email);
    }
    setUser(updatedUser, true, 'AppRouter:SubscriptionUpdate');
  };

  return <SubscriptionPage user={user} onSubscriptionUpdate={handleSubscriptionUpdate} />;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Root: send logged-in users to /cove, others to App (landing) */}
      <Route path="/" element={<RootRedirect />} />

      {/* Auth pages — only accessible when NOT logged in */}
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/signup" element={<GuestRoute><SignupPage /></GuestRoute>} />
      <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/auth/action" element={<AuthActionPage />} />

      {/* Main app */}
      <Route path="/cove/*" element={<ProtectedRoute><App key="cove-app" /></ProtectedRoute>} />

      {/* Other pages */}
      <Route path="/subscription" element={<SubscriptionRoute />} />
      <Route path="/loading-demo" element={<LoadingDemo />} />
      <Route path="/echo-land" element={<EchoLand />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const AppRouter: React.FC = () => {
  // @ts-ignore
  const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.id;

  if (isExtension) {
    return (
      <HashRouter>
        <UserProvider>
          <AppRoutes />
        </UserProvider>
      </HashRouter>
    );
  }

  return (
    <BrowserRouter>
      <UserProvider>
        <AppRoutes />
      </UserProvider>
    </BrowserRouter>
  );
};

export default AppRouter;
