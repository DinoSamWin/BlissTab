import React, { useState, useEffect } from 'react';
import { SubscriptionPlan, User } from '../types';
import { fetchSubscriptionState } from '../services/subscriptionService';
import { createCheckoutSession } from '../services/creemService';
import { Check, Diamond, Briefcase, Zap, Loader2 } from 'lucide-react';

interface SubscriptionPageProps {
  user: User | null;
  onSubscriptionUpdate?: (user: User) => void;
}

// UI-level plans: Free, Pro (monthly/yearly), Lifetime (one-time)
type DisplayPlanId = 'free' | 'pro' | 'lifetime';

interface PlanMeta {
  id: DisplayPlanId;
  label: string;
  badge?: string;
  subtitle: string;
  monthlyPrice: number;
  yearlyPrice: number; // monthly equivalent when billed yearly, or one-time price for lifetime
  originalMonthlyPrice?: number; // for strike-through
  originalYearlyPrice?: number; // for strike-through
  features: {
    title: string;
    items: string[];
  }[];
  icon: React.ReactNode;
}

const PLANS: PlanMeta[] = [
  {
    id: 'free',
    label: 'Free',
    subtitle: 'Complete and calm for simple starts.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    icon: <Zap className="w-6 h-6 text-white" />,
    features: [
      {
        title: 'Daily Start',
        items: ['2 gentle New Perspective refreshes/session', 'Up to 2 intentions to set your tone'],
      },
      {
        title: 'Essentials',
        items: ['Up to 8 shortcuts for daily essentials', 'Local preferences (syncs when signed in)'],
      },
      {
        title: 'Philosophy',
        items: ['No ads, no tracking', 'Complete but calm experience'],
      },
    ],
  },
  {
    id: 'pro',
    label: 'Startly Pro',
    badge: 'Popular',
    subtitle: 'For people who want their browser to grow with them.',
    monthlyPrice: 4.99,
    yearlyPrice: 3.25, // approx $39/12
    originalMonthlyPrice: undefined,
    originalYearlyPrice: 4.99, // shows savings vs monthly
    icon: <Diamond className="w-6 h-6 text-white" />,
    features: [
      {
        title: 'Unlimited Flow',
        items: ['Unlimited Perspective refreshes', 'Unlimited Intentions & Shortcuts'],
      },
      {
        title: 'Smart System',
        items: [
          'Smart rotation between intentions',
          'Full cross-device sync & backup',
        ],
      },
      {
        title: 'Pure Experience',
        items: ['Priority speed', 'Support independent calm tech'],
      },
    ],
  },
  {
    id: 'lifetime',
    label: 'Lifetime',
    badge: 'Limited',
    subtitle: 'Pay once. Start softly, every day.',
    monthlyPrice: 99, // One-time payment
    yearlyPrice: 99, // One-time payment
    icon: <Briefcase className="w-6 h-6 text-white" />,
    features: [
      {
        title: 'One-time Payment',
        items: ['No subscription, no renewals', 'Access for as long as StartlyTab exists'],
      },
      {
        title: 'All Pro Features',
        items: [
          'Everything in Pro included',
          'Future core updates included',
        ],
      },
      {
        title: 'Ideal For',
        items: ['Habitual daily users', 'supporters of indie calm tech'],
      },
    ],
  },
];

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ user, onSubscriptionUpdate }) => {
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<DisplayPlanId | null>(null);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro' | 'lifetime'>('free');
  const [proBillingCycle, setProBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  // Fetch current subscription status
  useEffect(() => {
    if (!user?.id) return;

    fetchSubscriptionState(user.id).then((data) => {
      // Map existing "lifetime" plan to "career" or now just default to "pro" behavior mentally,
      // but strictly we only have 'free' and 'pro' as visible plans.
      // If backend says 'lifetime', we can show 'pro' active or just 'free' if we want to hide it completely,
      // but likely we want to show them as having Pro features.
      if ((data.subscriptionPlan === 'pro' || data.subscriptionPlan === 'lifetime') && data.isSubscribed) {
        setCurrentPlan(data.subscriptionPlan === 'lifetime' ? 'lifetime' : 'pro');
      } else {
        setCurrentPlan('free');
      }
    });
  }, [user]);

  // Handle Creem payment success callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutId = urlParams.get('checkout_id');
    const orderId = urlParams.get('order_id');
    const productId = urlParams.get('product_id');

    if (checkoutId && orderId && user?.id && onSubscriptionUpdate) {
      console.log('[Subscription] Payment success detected:', { checkoutId, orderId, productId });

      // Determine plan type from product_id
      let planType: SubscriptionPlan = 'pro';
      let displayPlan: DisplayPlanId = 'pro';
      let expiresAt: string;

      const now = Date.now();

      // Map Creem product ID to our plan types
      if (productId?.includes('lifetime') || productId === import.meta.env.VITE_CREEM_PRODUCT_LIFETIME_ID) {
        planType = 'lifetime';
        displayPlan = 'lifetime';
        expiresAt = new Date(now + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(); // 100 years
      } else if (productId?.includes('yearly') || productId === import.meta.env.VITE_CREEM_PRICE_PRO_YEARLY_ID) {
        planType = 'pro';
        displayPlan = 'pro';
        expiresAt = new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year
      } else {
        // Monthly or default
        planType = 'pro';
        displayPlan = 'pro';
        expiresAt = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
      }

      const updatedUser: User = {
        ...user,
        isSubscribed: true,
        subscriptionPlan: planType,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expiresAt,
      };

      setCurrentPlan(displayPlan);
      setPaymentSuccess(true);
      onSubscriptionUpdate(updatedUser);

      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);

      // Reset success message after a delay
      setTimeout(() => setPaymentSuccess(false), 5000);
    }
  }, [user, onSubscriptionUpdate]);

  const handleSelectPlan = async (planId: DisplayPlanId) => {
    if (!user?.id || !onSubscriptionUpdate) return;
    if (planId === 'free') return; // Free is default

    // Prevent re-subscribing to same plan (simplified logic)
    if (currentPlan === planId) return;

    try {
      setLoadingPlan(planId);

      // Determine specific productId to send to backend
      let specificProductId: string = planId;
      if (planId === 'pro') {
        specificProductId = proBillingCycle === 'monthly' ? 'pro_monthly' : 'pro_yearly';

      }

      // Call Creem Service to get checkout URL
      // This works in "Mock Mode" locally if backend is not set up
      const checkoutUrl = await createCheckoutSession(specificProductId, user?.email);

      // If we got a real URL (not the mock one), redirect
      if (checkoutUrl && !checkoutUrl.includes('mock-session-id')) {
        window.location.href = checkoutUrl;
        return;
      }

      // --- MOCK FLOW FOR DEMO ONLY ---
      // If we are in mock mode (implied by getting a mock-session-id URL),
      // we simulate the webhook success immediately for the user.

      // FOR DEMO:
      // Since we don't have backend, we will simulate the success flow directly
      // as if the webhook had fired and updated the user state.

      const now = Date.now();
      let expiresAt = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(); // Default 30 days

      // Correctly set expiry based on the plan and cycle
      if (planId === 'pro' && proBillingCycle === 'yearly') {
        expiresAt = new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString();
      } else if (planId === 'lifetime') {
        expiresAt = new Date(now + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(); // 100 years
      }

      // Map UI plan to backend plan type
      // Note: 'career' in UI might map to 'pro' with higher tier features or 'lifetime' in backend
      // For now, let's map 'career' to 'lifetime' to reuse existing types, or just 'pro'
      const backendPlanType: SubscriptionPlan = planId === 'lifetime' ? 'lifetime' : 'pro';

      const updatedUser: User = {
        ...user,
        isSubscribed: true,
        subscriptionPlan: backendPlanType,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expiresAt,
      };

      setCurrentPlan(planId);
      setPaymentSuccess(true);
      await onSubscriptionUpdate(updatedUser);

      // Reset success message after a delay
      setTimeout(() => setPaymentSuccess(false), 3000);

    } catch (error) {
      console.error('[Subscription] Plan selection failed:', error);
      alert('Failed to initiate checkout. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#AECFE8] to-[#F0F8FF] font-sans text-[#333]">
      {/* Header Section */}
      <div className="pt-16 pb-12 text-center text-white">
        <h1 className="text-4xl md:text-5xl font-medium mb-3 tracking-tight drop-shadow-sm">
          Pick your perfect plan
        </h1>
        <p className="text-white/90 text-sm md:text-base font-medium tracking-wide">
          Find the one that fits your goals.
        </p>

        {/* Billing Toggle Removed - Moved to Pro Card */}
      </div>

      {/* Plans Container */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        {/* Success Message */}
        {paymentSuccess && (
          <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4">
            <div className="bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <Check className="w-5 h-5" />
              <span className="font-medium">Plan updated successfully!</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => {
            const isFree = plan.id === 'free';
            const isPro = plan.id === 'pro';
            const isLifetime = plan.id === 'lifetime';

            // Price calculation logic
            let price = plan.monthlyPrice;
            let originalPrice = undefined;
            let billingPeriod = '/ mo';

            if (isPro) {
              price = proBillingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
              originalPrice = proBillingCycle === 'yearly' ? plan.originalYearlyPrice : undefined;
            } else if (isLifetime) {
              price = plan.monthlyPrice;
              billingPeriod = ' one-time';
            } else {
              // Free
              billingPeriod = '/ forever';
            }

            // Dynamic card height to match alignment in design (roughly)
            // Free plan has glass effect, others are solid white
            // Update: Free plan now uses dark text for better visibility on subtle background
            const cardClasses = isFree
              ? 'bg-black/5 backdrop-blur-md border border-white/20 text-gray-900'
              : 'bg-white text-gray-800 shadow-xl';

            const isPlanLoading = loadingPlan === plan.id;
            const isAnyLoading = loadingPlan !== null;

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-8 flex flex-col h-full transition-transform hover:scale-[1.01] ${cardClasses}`}
              >
                {/* Icon Box */}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-sm ${plan.id === 'free' ? 'bg-white/40' :
                  plan.id === 'pro' ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                  {plan.id === 'free' ? <Zap className="w-6 h-6 text-gray-800" /> :
                    plan.id === 'pro' ? <Diamond className="w-6 h-6 text-blue-400" /> :
                      <Briefcase className="w-6 h-6 text-green-600" />}
                </div>

                {/* Header Info */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className={`text-2xl font-medium ${isFree ? 'text-gray-900' : 'text-gray-900'}`}>
                      {plan.label}
                    </h2>
                    {plan.badge && (
                      <span className="px-3 py-1 bg-[#FDE8D4] text-[#C48B57] text-xs font-bold rounded-full uppercase tracking-wider">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  {/* Toggle for Pro Plan */}
                  {isPro && (
                    <div className="mb-3 inline-flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                      <button
                        onClick={() => setProBillingCycle('monthly')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${proBillingCycle === 'monthly'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-900'
                          }`}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setProBillingCycle('yearly')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${proBillingCycle === 'yearly'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-900'
                          }`}
                      >
                        Yearly
                      </button>
                    </div>
                  )}

                  <p className={`text-sm ${isFree ? 'text-gray-600' : 'text-gray-500'} font-normal mb-8 min-h-[40px]`}>
                    {plan.subtitle}
                  </p>

                  {/* Pricing */}
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-bold ${isFree ? 'text-gray-900' : 'text-gray-900'}`}>
                      ${price}
                    </span>
                    <span className={`text-sm ${isFree ? 'text-gray-500' : 'text-gray-400'}`}>
                      {billingPeriod}
                    </span>
                  </div>

                  {!isFree && proBillingCycle === 'yearly' && isPro && (
                    <p className="text-xs text-gray-400 mt-1 line-through decoration-gray-300">
                      ${originalPrice} for the first year
                    </p>
                  )}


                  {isFree && (
                    <p className="text-xs text-gray-500 mt-1">No hidden fees</p>
                  )}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={
                    isAnyLoading ||
                    (currentPlan === plan.id) ||
                    (isFree && currentPlan !== 'free') // Disable Free button if user is on paid plan
                  }
                  className={`w-full py-3.5 rounded-full text-sm font-semibold transition-all mb-8 shadow-sm flex items-center justify-center gap-2 ${
                    // Current plan styling
                    currentPlan === plan.id
                      ? isFree
                        // Free plan current: blue
                        ? 'bg-blue-500 text-white cursor-not-allowed shadow-lg'
                        // Paid plan current: gold gradient
                        : 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 text-gray-900 cursor-not-allowed shadow-lg'
                      // Free plan when user is on paid plan: gray disabled
                      : isFree && currentPlan !== 'free'
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        // Free plan when user is free: dark with glass effect
                        : isFree
                          ? 'bg-gray-900 text-white hover:bg-gray-800 border border-white/10'
                          // Other plans: black
                          : 'bg-[#222222] text-white hover:bg-black'
                    } ${isAnyLoading ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {isPlanLoading && !isFree ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {
                    // Button text logic
                    currentPlan === plan.id
                      ? 'Current Plan'
                      : isFree && currentPlan !== 'free'
                        ? (currentPlan === 'lifetime' ? 'You are a Lifetime user' : 'You are a Pro user')
                        : isFree
                          ? 'Current Plan'
                          : 'Start Now'
                  }
                </button>

                {/* Features List */}
                <div className="space-y-6 flex-1">
                  {plan.features.map((section, idx) => (
                    <div key={idx}>
                      <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isFree ? 'text-gray-900' : 'text-gray-900'
                        }`}>
                        {/* Icon based on section title could go here, simplified for now */}
                        {section.title === 'Resume Builder' && <span className="opacity-70">📄</span>}
                        {section.title === 'AI Assistant' && <span className="opacity-70">✨</span>}
                        {section.title === 'Document Management' && <span className="opacity-70">📁</span>}
                        {section.title}
                      </h3>
                      <ul className="space-y-2.5">
                        {section.items.map((item, itemIdx) => (
                          <li key={itemIdx} className={`text-sm flex items-start gap-2 ${isFree ? 'text-gray-600' : 'text-gray-500'
                            }`}>
                            <span className={`mt-1.5 w-1 h-1 rounded-full flex-shrink-0 ${isFree ? 'bg-gray-400' : 'bg-gray-300'
                              }`} />
                            {item}
                          </li>
                        ))}
                      </ul>
                      {/* Dashed separator unless last item */}
                      {idx < plan.features.length - 1 && (
                        <div className={`mt-6 border-b border-dashed ${isFree ? 'border-white/20' : 'border-gray-200'
                          }`} />
                      )}
                    </div>
                  ))}
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
