import React, { useEffect, useMemo, useState } from 'react';
import { QuickLink } from '../types';
import { canonicalizeUrl } from '../services/urlCanonicalService';
import { getLocalLogoDataUrl } from '../services/gatewayLogoCacheService';

interface GatewayEditModalProps {
  isOpen: boolean;
  link: QuickLink | null;
  onClose: () => void;
  onSave: (params: { customTitle: string | null; logoFile: File | null; reset: boolean }) => void;
}

const GatewayEditModal: React.FC<GatewayEditModalProps> = ({ isOpen, link, onClose, onSave }) => {
  const [customTitle, setCustomTitle] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [reset, setReset] = useState(false);

  useEffect(() => {
    if (!isOpen || !link) return;
    setCustomTitle(link.customTitle || '');
    setLogoFile(null);
    setLogoPreview(null);
    setReset(false);
  }, [isOpen, link]);

  // Handle file selection and create preview
  useEffect(() => {
    if (logoFile) {
      const objectUrl = URL.createObjectURL(logoFile);
      setLogoPreview(objectUrl);
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    } else {
      setLogoPreview(null);
    }
  }, [logoFile]);

  const canonicalUrl = useMemo(() => {
    if (!link) return '';
    try {
      return link.canonicalUrl || canonicalizeUrl(link.url);
    } catch {
      return link.url;
    }
  }, [link]);

  const previewSrc = useMemo(() => {
    if (!link) return null;
    if (reset) return null;

    // Priority 1: User just selected a file (show preview immediately)
    if (logoPreview) return logoPreview;

    // Priority 2: Existing custom logo from local cache
    if (canonicalUrl && link.customLogoHash) {
      const local = getLocalLogoDataUrl(canonicalUrl, link.customLogoHash);
      if (local) return local;
    }

    // Priority 3: Custom logo URL from cloud
    if (link.customLogoUrl) return link.customLogoUrl;

    // Priority 4: Default icon
    return link.icon || null;
  }, [link, canonicalUrl, reset, logoPreview]);

  if (!isOpen || !link) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/20 dark:bg-black/80 backdrop-blur-xl animate-reveal">
      <div className="bg-white dark:bg-[#0F0F0F] w-full max-w-lg rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] overflow-hidden border border-black/5 dark:border-white/10">
        <div className="p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h3 className="serif text-2xl text-gray-900 dark:text-gray-100">Edit Gateway</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Customize name and logo. Leave empty to use default.</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="mt-7 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-center overflow-hidden">
                {previewSrc ? (
                  <img src={previewSrc} alt="" className="w-9 h-9 object-contain opacity-90" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: link.color }} />
                )}
              </div>

              <div className="flex-1">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Custom name</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  disabled={reset}
                  placeholder={link.title}
                  className="mt-2 w-full bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-800 dark:text-gray-100 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Upload logo</label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  disabled={reset}
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  className="flex-1 text-xs text-gray-600 dark:text-gray-300 file:mr-3 file:rounded-full file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-[11px] file:font-bold file:uppercase file:tracking-widest file:text-gray-700 dark:file:bg-white/10 dark:file:text-gray-200"
                />
                {logoFile && (
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[160px]">{logoFile.name}</span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">We’ll store the uploaded image locally for fast display and back it up to Supabase.</p>
            </div>

            <div className="flex items-center justify-between bg-gray-50/50 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl px-5 py-4">
              <div>
                <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">Reset to default</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">Clears custom name and logo.</div>
              </div>
              <button
                type="button"
                onClick={() => setReset(v => !v)}
                className={`px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all ${reset ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-white dark:bg-black/20 text-gray-700 dark:text-gray-200 border border-black/5 dark:border-white/10'}`}
              >
                {reset ? 'Resetting' : 'Reset'}
              </button>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-full text-[11px] font-bold uppercase tracking-widest bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-200 hover:opacity-90 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave({ customTitle: customTitle.trim() ? customTitle.trim() : null, logoFile, reset })}
              className="px-6 py-3 rounded-full text-[11px] font-bold uppercase tracking-widest bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition-all"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GatewayEditModal;


