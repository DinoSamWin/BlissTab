import React, { useState, useEffect } from 'react';
import { SubscriptionPlan, User } from '../types';
import { fetchSubscriptionState } from '../services/subscriptionService';

interface SubscriptionPageProps {
  user: User | null;
  onSubscriptionUpdate?: (user: User) => void;
}

// UI-level plans: Free, Pro (monthly), Lifetime (one-time)
type DisplayPlanId = 'free' | 'pro' | 'lifetime';

interface PlanMeta {
  id: DisplayPlanId;
  label: string;
  subtitle: string;
  price: number;
  billingLine: string;
  bullets: string[];
}

const PLANS: PlanMeta[] = [
  {
    id: 'free',
    label: 'Free',
    subtitle: 'Complete and calm for simple starts.',
    price: 0,
    billingLine: 'Always free',
    bullets: [
      '2 gentle New Perspective refreshes each session',
      'Up to 2 intentions to set your tone',
      'Up to 8 shortcuts for daily essentials',
      'Local preferences that sync when you sign in',
    ],
  },
  {
    id: 'pro',
    label: 'Startly Pro',
    subtitle: 'For a soft, intentional start every day.',
    price: 4.99,
    billingLine: '$4.99 / month',
    bullets: [
      'Refresh your perspective anytime you need it',
      'As many intentions as you like, with natural rotation',
      'As many shortcuts as you like, neatly organized',
      'Full cross-device sync · No ads · No tracking',
    ],
  },
  {
    id: 'lifetime',
    label: 'Lifetime',
    subtitle: 'For those who want calm to be permanent.',
    price: 79,
    billingLine: 'One-time payment',
    bullets: [
      'All Pro features, without a subscription',
      'Keep your daily ritual, even if tools change',
      'No renewals, no expiry to track',
      'A quiet, long-term way to support StartlyTab',
    ],
  },
];

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ user, onSubscriptionUpdate }) => {
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro'>('free');
  const [proBillingCycle, setProBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  // Fetch current subscription status (free vs pro) for state labels
  useEffect(() => {
    if (!user?.id) return;

    fetchSubscriptionState(user.id).then((data) => {
      if (data.subscriptionPlan && data.subscriptionPlan !== 'free' && data.isSubscribed) {
        setCurrentPlan('pro');
      } else {
        setCurrentPlan('free');
      }
    });
  }, [user]);

  const handleSelectPlan = async (planId: DisplayPlanId) => {
    if (!user?.id || !onSubscriptionUpdate) return;
    if (planId === 'free') return;

    // If already on Pro, no need to re-upgrade
    if (currentPlan === 'pro' && planId === 'pro') return;

    try {
      // Simulate gentle processing
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const now = Date.now();
      // For Pro: use selected billing cycle; Lifetime is one-time
      const expiresAt =
        planId === 'lifetime'
          ? new Date(now + 10 * 365 * 24 * 60 * 60 * 1000).toISOString() // conceptual long horizon
          : proBillingCycle === 'yearly'
          ? new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();

      const updatedUser: User = {
        ...user,
        isSubscribed: true,
        subscriptionPlan: 'pro' as SubscriptionPlan,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expiresAt,
      };

      setCurrentPlan('pro');
      setPaymentSuccess(true);
      await onSubscriptionUpdate(updatedUser);
    } catch (error) {
      console.error('[Subscription] Plan selection failed:', error);
    }
  };

  const isOnPro = currentPlan === 'pro';

  // Calculate Pro price based on billing cycle
  const getProPrice = () => {
    return proBillingCycle === 'monthly' ? 4.99 : 39;
  };

  const getProBillingLine = () => {
    return proBillingCycle === 'monthly' ? '/ month' : '/ year';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50/30 to-blue-50/40 relative overflow-hidden">
      {/* Background decorative elements for glassmorphism effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-[1120px] mx-auto px-10 py-12 flex flex-col gap-10 relative z-10">
        {/* Header – reduced vertical spacing, emotional first */}
        <div className="space-y-3">
          <p className="text-xs tracking-[0.28em] uppercase text-gray-500/70">
            STARTLYTAB
          </p>
          <p className="serif text-base text-gray-700/80">
            A calm start is worth protecting.
          </p>
          <h1 className="serif text-4xl md:text-[2.6rem] font-normal text-gray-800">
            Subscriptions
          </h1>
          <p className="text-sm md:text-base text-gray-600/75 max-w-xl leading-relaxed">
            Free is enough for a simple morning. Pro is for people who want their browser to
            feel like a gentle, daily ritual.
          </p>
        </div>

        {/* Optional success state */}
        {paymentSuccess && (
          <div className="flex items-center gap-2 px-4 py-3 bg-white/60 backdrop-blur-md rounded-2xl border border-white/30 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
            <svg className="w-4 h-4 text-emerald-600/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-gray-700">You're all set. Changes apply to your next start.</span>
          </div>
        )}

        {/* Plans – three cards, one row, center plan emphasized */}
        <div className="flex items-stretch justify-center gap-5">
          {PLANS.map((plan) => {
            const isPro = plan.id === 'pro';
            const isLifetime = plan.id === 'lifetime';
            const isCurrentProCard = isOnPro && isPro;
            const displayPrice = isPro ? getProPrice() : plan.price;
            const displayBillingLine = isPro ? getProBillingLine() : plan.billingLine;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border backdrop-blur-md transition-transform duration-200 ease-out ${
                  isPro
                    ? 'bg-white/70 border-white/40 shadow-[0_20px_40px_rgba(0,0,0,0.1)]'
                    : 'bg-white/60 border-white/30 shadow-[0_12px_32px_rgba(0,0,0,0.08)]'
                } px-6 py-7 flex flex-col justify-between`}
                style={{
                  width: plan.id === 'pro' ? 360 : 320,
                  transform: plan.id === 'pro' ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                {/* Badge for Pro plan */}
                {isPro && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                    <div className="px-4 py-1 rounded-full bg-white/80 backdrop-blur-sm border border-white/40 shadow-[0_8px_20px_rgba(0,0,0,0.1)] text-[11px] font-medium text-gray-700">
                      Most chosen
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {/* Plan name */}
                  <div>
                    <p className="text-xs font-semibold tracking-[0.18em] uppercase text-gray-500/80 mb-1">
                      {plan.id === 'pro' ? 'Pro' : plan.id === 'lifetime' ? 'Lifetime Access' : 'Free'}
                    </p>
                    <h2 className="text-xl font-semibold text-gray-800">{plan.label}</h2>
                    <p className="text-xs text-gray-600/80 mt-1 leading-relaxed">
                      {plan.subtitle}
                    </p>
                  </div>

                  {/* Monthly/Yearly Toggle - Only for Pro */}
                  {isPro && (
                    <div className="mt-4 mb-2">
                      <div className="flex items-center gap-1.5 bg-white/50 backdrop-blur-sm rounded-full p-1 border border-white/30">
                        <button
                          onClick={() => setProBillingCycle('monthly')}
                          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ease-out ${
                            proBillingCycle === 'monthly'
                              ? 'bg-purple-500 text-white shadow-sm'
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                        >
                          Monthly
                        </button>
                        <button
                          onClick={() => setProBillingCycle('yearly')}
                          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ease-out ${
                            proBillingCycle === 'yearly'
                              ? 'bg-purple-500 text-white shadow-sm'
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                        >
                          Yearly
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Price */}
                  <div className="mt-3">
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`font-semibold ${
                          plan.id === 'pro' ? 'text-[2rem]' : 'text-[1.8rem]'
                        } text-gray-800`}
                      >
                        {displayPrice === 0 ? '$0' : `$${displayPrice}`}
                      </span>
                      <span className="text-gray-600/75 text-sm">
                        {plan.id === 'free' ? '' : displayBillingLine}
                      </span>
                      {plan.id === 'free' && (
                        <span className="text-gray-500/70 text-sm">Always free</span>
                      )}
                      {isLifetime && (
                        <span className="ml-1 text-xs text-gray-500/75">Pay once, keep forever</span>
                      )}
                      {isPro && proBillingCycle === 'yearly' && (
                        <span className="ml-1 text-xs text-gray-500/70">billed yearly</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* CTA or status */}
                <div className="mt-5 mb-5">
                  {isCurrentProCard ? (
                    <div className="py-3 text-center text-sm text-gray-500/55 font-medium">
                      You're on Pro
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelectPlan(plan.id)}
                      className={`w-full py-3.5 rounded-full text-sm font-medium transition-all duration-200 ease-out ${
                        plan.id === 'pro'
                          ? 'bg-purple-500 text-white hover:bg-purple-600 active:scale-[0.98] shadow-md'
                          : plan.id === 'free'
                          ? 'bg-white/80 backdrop-blur-sm text-gray-700 border border-gray-200/50 hover:bg-white/90'
                          : 'bg-white/80 backdrop-blur-sm text-gray-800 border border-gray-300/50 hover:border-gray-400/70'
                      }`}
                    >
                      {plan.id === 'free'
                        ? 'Continue with Free'
                        : plan.id === 'pro'
                        ? 'Upgrade to Pro'
                        : 'Get Lifetime'}
                    </button>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-2.5 pt-2">
                  {plan.bullets.slice(0, 4).map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-sm text-gray-700/85 leading-relaxed"
                    >
                      <span className="mt-1 inline-flex w-3.5 h-3.5 rounded-full bg-purple-100/70 text-purple-600/80 items-center justify-center flex-shrink-0">
                        <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note (within same viewport) */}
        <div className="text-center text-sm text-gray-500/70 pb-2">
          Cancel anytime · No ads · No tracking · Designed for quiet mornings
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
