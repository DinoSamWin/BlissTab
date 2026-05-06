import React from 'react';

const collectionCards = [
  {
    title: 'Account & Sign-in Data',
    items: [
      'Email address, account ID, display name, and avatar',
      'Authentication state and session data needed for sign-in',
      'Subscription and account status returned by our backend'
    ]
  },
  {
    title: 'Saved Content & Settings',
    items: [
      'Saved shortcuts, URLs, titles, categories, and custom labels',
      'Custom gateway logos and related storage paths',
      'Theme, language, search engine, persona, and snippet preferences'
    ]
  },
  {
    title: 'User-Triggered Browser Data',
    items: [
      'Bookmarks, only when you use bookmark import',
      'Current tab URL, title, and favicon, only when you add the active page',
      'Page title and icon requests for websites you save as shortcuts'
    ]
  },
  {
    title: 'Optional Context-Aware Signals',
    items: [
      'Open tab count, audio-playing state, and download-in-progress state',
      'Focused window state, battery level, and idle time on this page',
      'Collected only if you enable context-aware mode, and used as aggregated signals rather than a list of all open tab URLs'
    ]
  },
  {
    title: 'Well-Being & Local History',
    items: [
      'Emotion selections you explicitly click in the UI',
      'Locally saved perspective history and related timestamps',
      'Local metadata caches used to reduce repeat requests'
    ]
  },
  {
    title: 'Billing & Support Data',
    items: [
      'Subscription plan, redemption status, and transaction references',
      'Customer email used for payment portal and billing support',
      'Transactional email delivery status for verification and password reset'
    ]
  }
];

const providerRows = [
  {
    party: 'Google / Firebase',
    reason: 'Google sign-in, Firebase authentication, and related account/session handling.'
  },
  {
    party: 'Supabase',
    reason: 'Cloud sync, database records, storage for user-uploaded gateway logos, and backend functions.'
  },
  {
    party: 'AI providers (such as DeepSeek, SiliconFlow, or ZhipuAI, depending on configuration)',
    reason: 'Generate AI perspectives using the prompts and selected context StartlyTab sends when you request generation, including optional aggregated browser-state signals if you enabled that mode.'
  },
  {
    party: 'Creem',
    reason: 'Subscription checkout, billing portal access, and payment-related customer lookups.'
  },
  {
    party: 'Resend',
    reason: 'Transactional emails such as verification and password reset messages.'
  },
  {
    party: 'Websites you save or request metadata for',
    reason: 'When you add a shortcut, StartlyTab may request that page, its favicon, or related icon endpoints to fetch title or icon data.'
  }
];

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FBFBFE] dark:bg-[#0A0A0B] text-gray-900 dark:text-gray-100 px-6 py-10 md:px-10 md:py-16">
      <div className="max-w-5xl mx-auto space-y-12">
        <header className="space-y-4 border-b border-black/5 dark:border-white/10 pb-10">
          <div className="inline-flex rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
            Chrome Web Store Compliance 2026
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Privacy Policy
          </h1>
          <p className="max-w-3xl text-sm md:text-base leading-7 text-gray-600 dark:text-gray-400">
            This page explains how StartlyTab collects, uses, stores, and shares data when you use the
            extension, website, and related account features.
          </p>
        </header>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center">1</div>
            <h2 className="text-2xl font-bold">What We Collect</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {collectionCards.map((card) => (
              <div
                key={card.title}
                className="rounded-3xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] p-6 shadow-sm"
              >
                <h3 className="text-lg font-bold mb-3">{card.title}</h3>
                <ul className="space-y-2 text-sm leading-7 text-gray-600 dark:text-gray-400">
                  {card.items.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center">2</div>
            <h2 className="text-2xl font-bold">How We Use It</h2>
          </div>
          <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] p-6">
            <ul className="space-y-3 text-sm leading-7 text-gray-600 dark:text-gray-400">
              <li><strong className="text-gray-900 dark:text-gray-100">Sign-in and account management:</strong> authenticate you, keep you signed in, and restore your synced workspace.</li>
              <li><strong className="text-gray-900 dark:text-gray-100">Shortcut management:</strong> save, sync, import, edit, export, and display your saved links and custom logos.</li>
              <li><strong className="text-gray-900 dark:text-gray-100">Perspective generation:</strong> generate AI text using your selected language, active prompts, recent in-product history, and emotion selections. If you enable context-aware mode, optional browser-state signals may also be used. For this feature, StartlyTab is designed to use the summarized state itself, such as tab count or whether audio is playing, rather than the full URLs of all open tabs.</li>
              <li><strong className="text-gray-900 dark:text-gray-100">Billing and entitlements:</strong> verify subscriptions, redemption status, and payment-related access.</li>
              <li><strong className="text-gray-900 dark:text-gray-100">Security and operations:</strong> maintain caches, prevent account-sync issues, and send verification or password-reset emails.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center">3</div>
            <h2 className="text-2xl font-bold">Storage & Retention</h2>
          </div>
          <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] p-6">
            <ul className="space-y-3 text-sm leading-7 text-gray-600 dark:text-gray-400">
              <li><strong className="text-gray-900 dark:text-gray-100">On your device:</strong> StartlyTab stores app state, preferences, caches, emotion logs, and perspective history in local browser storage. Firebase authentication may also use IndexedDB persistence.</li>
              <li><strong className="text-gray-900 dark:text-gray-100">In the cloud:</strong> synced user data, subscription state, feedback submitted through our backend, and uploaded gateway logos may be stored in Supabase.</li>
              <li><strong className="text-gray-900 dark:text-gray-100">Cloud retention:</strong> account-linked synced records are generally kept while your account remains active and until you delete them or request deletion, unless a longer retention period is required for security, fraud prevention, or legal compliance.</li>
              <li><strong className="text-gray-900 dark:text-gray-100">Retention examples:</strong> local perspective history is trimmed to recent entries, emotion logs are kept for up to 30 days, and metadata caches expire automatically over time.</li>
              <li><strong className="text-gray-900 dark:text-gray-100">Security:</strong> data sent over the network is intended to use HTTPS/TLS. Access to synced cloud records is controlled by our backend and service-provider safeguards.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center">4</div>
            <h2 className="text-2xl font-bold">Who Data Is Shared With</h2>
          </div>
          <div className="rounded-3xl border border-rose-100 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-900/10 p-6 text-sm leading-7 text-rose-900 dark:text-rose-100">
            We do not sell your personal data and we do not use it for personalized advertising, creditworthiness decisions, or data brokerage.
          </div>
          <div className="overflow-hidden rounded-3xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03]">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 uppercase tracking-[0.16em] text-[10px]">
                <tr>
                  <th className="px-6 py-4">Party</th>
                  <th className="px-6 py-4">Why Data May Be Shared</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {providerRows.map((row) => (
                  <tr key={row.party}>
                    <td className="px-6 py-4 align-top font-semibold text-gray-900 dark:text-gray-100">{row.party}</td>
                    <td className="px-6 py-4 align-top text-gray-600 dark:text-gray-400 leading-7">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center">5</div>
            <h2 className="text-2xl font-bold">Your Choices</h2>
          </div>
          <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] p-6">
            <ul className="space-y-3 text-sm leading-7 text-gray-600 dark:text-gray-400">
              <li><strong className="text-gray-900 dark:text-gray-100">Context-aware mode is optional:</strong> you can use StartlyTab in basic mode without enabling the optional browser-state signals described above.</li>
              <li><strong className="text-gray-900 dark:text-gray-100">Local data:</strong> you can remove local app data on this device by clearing your browser storage for StartlyTab or uninstalling the extension. Where available, StartlyTab settings may also help you reset local data.</li>
              <li><strong className="text-gray-900 dark:text-gray-100">Synced account data:</strong> if you want cloud data deleted, contact <a href="mailto:support@startlytab.com" className="text-indigo-600 dark:text-indigo-300 font-bold">support@startlytab.com</a>. We use that request to remove account-linked synced records that are not required to be retained for security, fraud prevention, or legal compliance.</li>
              <li><strong className="text-gray-900 dark:text-gray-100">Questions:</strong> if you need clarification about our data handling, contact us at <a href="mailto:support@startlytab.com" className="text-indigo-600 dark:text-indigo-300 font-bold">support@startlytab.com</a>.</li>
            </ul>
          </div>
        </section>

        <section className="rounded-[2rem] bg-gradient-to-br from-indigo-600 to-indigo-500 text-white p-8 shadow-xl">
          <h2 className="text-2xl font-bold">Chrome Limited Use</h2>
          <p className="mt-3 text-sm leading-7 text-white/90">
            The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy,
            including the Limited Use requirements.
          </p>
          <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-white/70">
            Last updated: April 27, 2026
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
