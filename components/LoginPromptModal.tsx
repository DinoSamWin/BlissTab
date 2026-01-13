import React from 'react';
import { Theme } from '../types';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: () => void;
  theme: Theme;
}

const LoginPromptModal: React.FC<LoginPromptModalProps> = ({ isOpen, onClose, onSignIn, theme }) => {
  if (!isOpen) return null;

  const handleSignIn = () => {
    onSignIn();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/20 dark:bg-black/80 backdrop-blur-xl animate-reveal">
      <div className="bg-white dark:bg-[#0F0F0F] w-full max-w-md rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] overflow-hidden">
        <div className="px-12 pt-12 pb-8">
          <h2 className="serif text-3xl md:text-4xl font-normal text-gray-800 dark:text-gray-100 mb-4">
            Continue your perspective
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
            Sign in to keep generating daily perspectives without limits.
          </p>
          
          <div className="flex flex-col gap-4">
            <button
              onClick={handleSignIn}
              className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-full text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-xl shadow-black/10 flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.74 0 3.3.6 4.53 1.77l3.39-3.39C17.85 1.5 15.15 0 12 0 7.31 0 3.25 2.69 1.25 6.64l3.96 3.07C6.16 6.94 8.86 5.04 12 5.04z" />
                <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.91c2.2-2.02 3.46-4.99 3.46-8.73z" />
                <path fill="#FBBC05" d="M5.21 14.71c-.24-.7-.37-1.44-.37-2.21s.13-1.51.37-2.21L1.25 7.22C.45 8.71 0 10.33 0 12s.45 3.29 1.25 4.78l3.96-3.07z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.76-2.91c-1.08.72-2.45 1.16-4.17 1.16-3.14 0-5.84-1.9-6.84-4.73L1.25 17.68C3.25 21.31 7.31 24 12 24z" />
              </svg>
              <span>Sign in with Google</span>
            </button>
            
            <button
              onClick={onClose}
              className="w-full py-4 text-gray-500 dark:text-gray-400 text-sm font-medium hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPromptModal;

