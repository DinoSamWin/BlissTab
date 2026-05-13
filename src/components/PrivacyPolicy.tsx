import React from 'react';
import { useSEO } from '../hooks/useSEO';
import {
  privacyChoiceItems,
  privacyCollectionCards,
  privacyHandlingItems,
  privacyLimitedUseStatement,
  privacyPolicyBadge,
  privacyPolicyIntro,
  privacyPolicyLastUpdated,
  privacyProviderRows,
  privacyStorageItems,
} from '../privacyPolicyContent';

const PrivacyPolicy: React.FC = () => {
  useSEO({
    title: "Privacy Policy | StartlyTab",
    description: "Read our privacy policy to understand how StartlyTab handles your data. We prioritize your privacy and minimize data collection.",
    keywords: "privacy policy, data protection, startlytab"
  });

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#FBFBFE] px-6 py-10 text-[#1A1A1E] dark:bg-[#0A0A0B] dark:text-[#F3F4F6] md:px-10 md:py-14"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-0 h-72 w-72 rounded-full bg-[#d6e4ed]/70 blur-3xl dark:bg-indigo-900/20" />
        <div className="absolute -top-10 right-0 h-72 w-72 rounded-full bg-[#ece9ca]/65 blur-3xl dark:bg-amber-900/10" />
      </div>

      <div className="relative mx-auto max-w-6xl space-y-10">
        <header className="space-y-4 border-b border-black/10 pb-11 dark:border-white/10">
          <div className="inline-flex rounded-full bg-indigo-100/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-200">
            {privacyPolicyBadge}
          </div>
          <h1 className="text-[3.2rem] font-semibold leading-[0.94] tracking-[-0.065em] md:text-[4.6rem]">
            Privacy Policy
          </h1>
          <p className="max-w-4xl text-[18px] leading-8 text-[#556071] dark:text-white/65">
            {privacyPolicyIntro}
          </p>
        </header>

        <section className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-[15px] font-bold text-white shadow-[0_12px_28px_rgba(79,70,229,0.22)]">1</div>
            <h2 className="text-[1.95rem] font-semibold tracking-[-0.04em]">User Data Collection</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {privacyCollectionCards.map((card) => (
              <div
                key={card.title}
                className="rounded-[1.8rem] border border-black/10 bg-white/75 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_22px_60px_rgba(0,0,0,0.22)]"
              >
                <h3 className="mb-3 text-[1.15rem] font-semibold tracking-[-0.02em]">{card.title}</h3>
                <ul className="space-y-2.5 pl-4 text-[15px] leading-8 text-[#556071] dark:text-white/65">
                  {card.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-[15px] font-bold text-white shadow-[0_12px_28px_rgba(79,70,229,0.22)]">2</div>
            <h2 className="text-[1.95rem] font-semibold tracking-[-0.04em]">User Data Handling & Processing</h2>
          </div>
          <div className="rounded-[1.8rem] border border-black/10 bg-white/75 p-7 shadow-[0_22px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_22px_60px_rgba(0,0,0,0.22)]">
            <ul className="space-y-3 pl-4 text-[15px] leading-8 text-[#556071] dark:text-white/65">
              {privacyHandlingItems.map((item) => (
                <li key={item.label}>
                  <strong className="font-semibold text-[#1A1A1E] dark:text-[#F3F4F6]">{item.label}:</strong> {item.text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-[15px] font-bold text-white shadow-[0_12px_28px_rgba(79,70,229,0.22)]">3</div>
            <h2 className="text-[1.95rem] font-semibold tracking-[-0.04em]">User Data Storage & Retention</h2>
          </div>
          <div className="rounded-[1.8rem] border border-black/10 bg-white/75 p-7 shadow-[0_22px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_22px_60px_rgba(0,0,0,0.22)]">
            <ul className="space-y-3 pl-4 text-[15px] leading-8 text-[#556071] dark:text-white/65">
              {privacyStorageItems.map((item) => (
                <li key={item.label}>
                  <strong className="font-semibold text-[#1A1A1E] dark:text-[#F3F4F6]">{item.label}:</strong> {item.text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-[15px] font-bold text-white shadow-[0_12px_28px_rgba(79,70,229,0.22)]">4</div>
            <h2 className="text-[1.95rem] font-semibold tracking-[-0.04em]">User Data Sharing</h2>
          </div>
          <div className="rounded-[1.5rem] border border-indigo-200/70 bg-indigo-50/70 p-5 text-[15px] leading-8 text-indigo-950/80 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-100/90">
            We do not sell your personal data and we do not use it for personalized advertising, creditworthiness decisions, or data brokerage.
          </div>
          <div className="overflow-hidden rounded-[1.8rem] border border-black/10 bg-white/75 shadow-[0_22px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_22px_60px_rgba(0,0,0,0.22)]">
            <table className="w-full text-left text-[15px]">
              <thead className="bg-white/60 text-[#556071] uppercase tracking-[0.16em] text-[11px] dark:bg-white/[0.05] dark:text-white/55">
                <tr>
                  <th className="px-6 py-4 font-semibold">Party</th>
                  <th className="px-6 py-4 font-semibold">Why Data May Be Shared</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/10">
                {privacyProviderRows.map((row) => (
                  <tr key={row.party}>
                    <td className="px-6 py-4 align-top font-semibold leading-8 text-[#1A1A1E] dark:text-[#F3F4F6]">{row.party}</td>
                    <td className="px-6 py-4 align-top leading-8 text-[#556071] dark:text-white/65">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-[15px] font-bold text-white shadow-[0_12px_28px_rgba(79,70,229,0.22)]">5</div>
            <h2 className="text-[1.95rem] font-semibold tracking-[-0.04em]">Your Choices</h2>
          </div>
          <div className="rounded-[1.8rem] border border-black/10 bg-white/75 p-7 shadow-[0_22px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_22px_60px_rgba(0,0,0,0.22)]">
            <ul className="space-y-3 pl-4 text-[15px] leading-8 text-[#556071] dark:text-white/65">
              {privacyChoiceItems.map((item) => (
                <li key={item.label}>
                  <strong className="font-semibold text-[#1A1A1E] dark:text-[#F3F4F6]">{item.label}:</strong>{' '}
                  {item.text.includes('support@startlytab.com') ? (
                    <>
                      {item.text.split('support@startlytab.com')[0]}
                      <a href="mailto:support@startlytab.com" className="font-semibold text-indigo-600 dark:text-indigo-300">support@startlytab.com</a>
                      {item.text.split('support@startlytab.com').slice(1).join('support@startlytab.com')}
                    </>
                  ) : (
                    item.text
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-indigo-200/70 bg-[linear-gradient(135deg,rgba(79,70,229,0.12),rgba(99,102,241,0.05))] p-8 shadow-[0_22px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-indigo-400/20 dark:bg-[linear-gradient(135deg,rgba(129,140,248,0.14),rgba(129,140,248,0.05))] dark:shadow-[0_22px_60px_rgba(0,0,0,0.22)]">
          <h2 className="text-[1.55rem] font-semibold tracking-[-0.03em]">Chrome Limited Use</h2>
          <p className="mt-3 text-[15px] leading-8 text-[#556071] dark:text-white/70">
            {privacyLimitedUseStatement}
          </p>
          <p className="mt-6 text-[13px] text-[#556071] dark:text-white/55">
            Last updated: {privacyPolicyLastUpdated}
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
