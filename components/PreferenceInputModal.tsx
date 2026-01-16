import React, { useState, useEffect } from 'react';
import { Theme } from '../types';
import { renderGoogleButton } from '../services/authService';

interface PreferenceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveLocal: (preference: string) => void;
  theme: Theme;
  isAuthenticated: boolean;
}

const PreferenceInputModal: React.FC<PreferenceInputModalProps> = ({
  isOpen,
  onClose,
  onSaveLocal,
  theme,
  isAuthenticated
}) => {
  const [preference, setPreference] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Store preference when user types (for migration after Google login)
  useEffect(() => {
    if (preference.trim() && !isAuthenticated) {
      // Store preference temporarily for migration after login
      localStorage.setItem('startly_intention_pending', preference.trim());
    }
  }, [preference, isAuthenticated]);

  // Render Google button when modal opens (for unauthenticated users)
  useEffect(() => {
    if (isOpen && !isAuthenticated) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        renderGoogleButton('preference-modal-google-btn', theme);
      }, 100);
    }
  }, [isOpen, isAuthenticated, theme]);
  
  // Listen for successful login to close modal
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      // User logged in, close modal
      onClose();
    }
  }, [isAuthenticated, isOpen, onClose]);

  const handleSaveLocal = async () => {
    if (!preference.trim()) return;
    setIsSaving(true);
    try {
      onSaveLocal(preference.trim());
      setPreference('');
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/20 dark:bg-black/80 backdrop-blur-xl animate-reveal">
      <div className="bg-white dark:bg-[#0F0F0F] w-full max-w-md rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] overflow-hidden">
        <div className="px-12 pt-12 pb-8">
          <h2 className="serif text-3xl md:text-4xl font-normal text-gray-800 dark:text-gray-100 mb-4">
            What would you like to see each day?
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
            Write a simple sentence about the vibe you want.
            <br />
            Examples: a little gloomy, high-energy, poetic, light humor.
          </p>
          
          <div className="mb-6">
            <textarea
              value={preference}
              onChange={(e) => setPreference(e.target.value)}
              placeholder='E.g. "A bit gloomy and poetic, like a quiet diary."'
              className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
              rows={4}
              maxLength={200}
            />
            <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-right">
              {preference.length}/200
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {!isAuthenticated && (
              <>
                {/* Google Sign-In Button (same as homepage) */}
                <div 
                  id="preference-modal-google-btn" 
                  className="w-full flex justify-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                />
              </>
            )}
            
            {isAuthenticated && (
              <button
                onClick={handleSaveLocal}
                disabled={!preference.trim() || isSaving}
                className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-full text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-xl shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            )}
            
            <button
              onClick={onClose}
              className="w-full py-4 text-gray-500 dark:text-gray-400 text-sm font-medium hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Not now
            </button>
          </div>

          {!isAuthenticated && (
            <p className="mt-6 text-xs text-gray-400 dark:text-gray-500 text-center leading-relaxed">
              Saving on this device keeps your preference here.<br />
              Sign in with Google to unlock unlimited perspectives and sync across devices.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreferenceInputModal;

