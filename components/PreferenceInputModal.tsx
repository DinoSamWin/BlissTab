import React, { useState } from 'react';
import { Theme } from '../types';

interface PreferenceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveLocal: (preference: string) => void;
  onSaveAndSync: (preference: string) => void;
  onSignIn: () => void;
  theme: Theme;
  isAuthenticated: boolean;
}

const PreferenceInputModal: React.FC<PreferenceInputModalProps> = ({
  isOpen,
  onClose,
  onSaveLocal,
  onSaveAndSync,
  onSignIn,
  theme,
  isAuthenticated
}) => {
  const [preference, setPreference] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

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

  const handleSaveAndSync = async () => {
    // Store preference temporarily
    if (preference.trim()) {
      localStorage.setItem('startly_intention_pending', preference.trim());
    }
    
    // Close modal first
    onClose();
    
    // Immediately trigger Google sign-in (same as homepage button)
    onSignIn();
  };

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
                <button
                  onClick={handleSaveLocal}
                  disabled={!preference.trim() || isSaving}
                  className="w-full py-5 bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-white/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save on this device'}
                </button>
                
                <button
                  onClick={handleSaveAndSync}
                  disabled={isSaving}
                  className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-full text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-xl shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5.04c1.74 0 3.3.6 4.53 1.77l3.39-3.39C17.85 1.5 15.15 0 12 0 7.31 0 3.25 2.69 1.25 6.64l3.96 3.07C6.16 6.94 8.86 5.04 12 5.04z" />
                    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.91c2.2-2.02 3.46-4.99 3.46-8.73z" />
                    <path fill="#FBBC05" d="M5.21 14.71c-.24-.7-.37-1.44-.37-2.21s.13-1.51.37-2.21L1.25 7.22C.45 8.71 0 10.33 0 12s.45 3.29 1.25 4.78l3.96-3.07z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.76-2.91c-1.08.72-2.45 1.16-4.17 1.16-3.14 0-5.84-1.9-6.84-4.73L1.25 17.68C3.25 21.31 7.31 24 12 24z" />
                  </svg>
                  <span>Save & unlock unlimited (Google)</span>
                </button>
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

