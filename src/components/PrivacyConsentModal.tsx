import React from 'react';
import { Theme } from '../types';
import { getInternalUrl } from '../services/environmentService';

interface PrivacyConsentModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  theme: Theme;
}

const PrivacyConsentModal: React.FC<PrivacyConsentModalProps> = ({
  isOpen,
  onAccept,
  onDecline,
  theme
}) => {
  if (!isOpen) return null;

  const isDark = theme === 'dark';
  const privacyHref = getInternalUrl('/privacy');

  return (
    <div className="fixed inset-0 z-[180] bg-black/45 backdrop-blur-sm flex items-center justify-center p-5">
      <div className={`w-full max-w-3xl rounded-[2rem] border shadow-2xl overflow-hidden ${
        isDark ? 'bg-[#111214] border-white/10 text-white' : 'bg-white border-black/5 text-gray-900'
      }`}>
        <div className={`px-8 py-7 border-b ${isDark ? 'border-white/10' : 'border-black/5'}`}>
          <div className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${
            isDark ? 'bg-white/10 text-white/80' : 'bg-black/[0.04] text-gray-600'
          }`}>
            Privacy Choice
          </div>
          <h2 className="mt-4 text-2xl md:text-3xl font-bold tracking-tight">
            Enable context-aware insights?
          </h2>
          <p className={`mt-3 text-sm md:text-[15px] leading-7 ${
            isDark ? 'text-white/70' : 'text-gray-600'
          }`}>
            To better understand your current rhythm and emotional context, StartlyTab can optionally read a
            small set of aggregated browser-state signals. We recommend enabling this if you want more
            emotionally aware AI reflections. This includes only your open tab count, whether any tab is
            playing audio, whether a download is in progress, focused window state, battery level, and idle
            time on this page. It does not use the URLs of all your open tabs for this feature.
          </p>
        </div>

        <div className="px-8 py-7 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className={`rounded-3xl border p-5 ${
              isDark ? 'border-white/10 bg-white/[0.03]' : 'border-black/5 bg-gray-50'
            }`}>
              <h3 className="text-sm font-bold uppercase tracking-[0.16em]">If You Enable It</h3>
              <p className={`mt-3 text-sm leading-7 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                These aggregated signals are used only to tailor the tone and timing of your perspective
                generation. When you request a perspective, only the selected context summary may be sent to our
                configured AI provider.
              </p>
            </div>

            <div className={`rounded-3xl border p-5 ${
              isDark ? 'border-white/10 bg-white/[0.03]' : 'border-black/5 bg-gray-50'
            }`}>
              <h3 className="text-sm font-bold uppercase tracking-[0.16em]">If You Skip It</h3>
              <p className={`mt-3 text-sm leading-7 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                StartlyTab still works in basic mode. Your new tab, search, shortcuts, sign-in, and sync features
                remain available, but AI reflections will not use those optional browser-state signals.
              </p>
            </div>
          </div>

          <div className={`rounded-3xl border p-5 ${
            isDark ? 'border-amber-500/20 bg-amber-500/10' : 'border-amber-200 bg-amber-50'
          }`}>
            <p className={`text-sm leading-7 ${isDark ? 'text-amber-100/90' : 'text-amber-900'}`}>
              This prompt is for the optional context-aware mode only. It does not grant permission to sell data or
              use it for advertising. See our{' '}
              <a href={privacyHref} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-4">
                Privacy Policy
              </a>{' '}
              for the full list of collected data, what is shared, storage locations, retention, and deletion
              options.
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
            <button
              onClick={onDecline}
              className={`px-6 py-3 rounded-full text-[11px] font-bold uppercase tracking-[0.18em] transition-all ${
                isDark
                  ? 'bg-white/10 text-white hover:bg-white/15'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Use Basic Mode
            </button>
            <button
              onClick={onAccept}
              className="px-6 py-3 rounded-full text-[11px] font-bold uppercase tracking-[0.18em] transition-all bg-black text-white hover:opacity-90 dark:bg-white dark:text-black"
            >
              Enable Context Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyConsentModal;
