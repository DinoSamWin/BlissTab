import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import App from './App';
import EchoLand from './pages/EchoLand';
import SubscriptionPage from './components/SubscriptionPage';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import LoadingDemo from './components/LoadingDemo';
import { User } from './types';
import { fetchSubscriptionState, determineSubscriptionTier, updateSubscriptionState } from './services/subscriptionService';
import { fetchUserMembership, fetchUserSettings } from './services/redeemService';

import { UserProvider, useUser } from './contexts/UserContext';

const AppRoutes: React.FC = () => {
  const { user, setUser } = useUser();
  const location = useLocation();

  const handleSubscriptionUpdate = async (updatedUser: User) => {
    // Update subscription in backend
    if (updatedUser.id) {
      await updateSubscriptionState(updatedUser.id, {
        isSubscribed: updatedUser.isSubscribed || false,
        subscriptionPlan: updatedUser.subscriptionPlan || 'free',
        subscriptionStatus: updatedUser.subscriptionStatus || 'active',
        subscriptionExpiresAt: updatedUser.subscriptionExpiresAt || null,
      });
    }

    setUser(updatedUser);
  };

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/cove" replace /> : <App />} />
      <Route path="/cove/*" element={<App />} />
      <Route
        path="/subscription"
        element={
          <SubscriptionPage
            user={user}
            onSubscriptionUpdate={handleSubscriptionUpdate}
          />
        }
      />
      <Route path="/loading-demo" element={<LoadingDemo />} />
      <Route path="/echo-land" element={<EchoLand />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const AppRouter: React.FC = () => {
  // Check if running in Chrome Extension environment
  // @ts-ignore
  const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;

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

