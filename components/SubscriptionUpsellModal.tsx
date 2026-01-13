import React from 'react';
import { Theme } from '../types';

interface SubscriptionUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  feature: 'gateways' | 'intentions';
  theme: Theme;
}

const SubscriptionUpsellModal: React.FC<SubscriptionUpsellModalProps> = ({ 
  isOpen, 
  onClose, 
  onUpgrade, 
  feature,
  theme 
}) => {
  if (!isOpen) return null;

  const config = {
    gateways: {
      title: 'Unlock more gateways',
      description: 'Organize all your important destinations in one place.',
      highlight: 'Unlimited Gateways',
    },
    intentions: {
      title: 'Multiple intentions, deeper focus',
      description: 'Create and manage multiple intentions for different days or contexts.',
      highlight: 'Multiple active intentions',
    },
  };

  const content = config[feature];

  const handleUpgrade = () => {
    onUpgrade();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/20 dark:bg-black/80 backdrop-blur-xl animate-reveal">
      <div className="bg-white dark:bg-[#0F0F0F] w-full max-w-md rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] overflow-hidden">
        <div className="px-12 pt-12 pb-8">
          <h2 className="serif text-3xl md:text-4xl font-normal text-gray-800 dark:text-gray-100 mb-4">
            {content.title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
            {content.description}
          </p>
          
          <div className="mb-8 p-6 bg-indigo-50 dark:bg-indigo-950/20 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                {content.highlight}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            <button
              onClick={handleUpgrade}
              className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-full text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-xl shadow-black/10"
            >
              Upgrade
            </button>
            
            <button
              onClick={onClose}
              className="w-full py-4 text-gray-500 dark:text-gray-400 text-sm font-medium hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              {feature === 'intentions' ? 'Keep one intention' : 'Maybe later'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionUpsellModal;

