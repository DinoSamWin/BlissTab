# Subscription & Usage Limits Implementation

## Overview

This document describes the complete implementation of subscription enforcement and backend subscription state management for StartlyTab.

## Architecture

### 1. Backend Subscription Model

**Database Schema** (`supabase-schema.sql`):
- New `user_subscriptions` table stores subscription state
- Fields: `is_subscribed`, `subscription_plan`, `subscription_status`, `subscription_expires_at`
- Row Level Security (RLS) enabled for user data protection

**Type Definitions** (`types.ts`):
```typescript
export type SubscriptionPlan = 'free' | 'pro' | 'team';
export type SubscriptionStatus = 'active' | 'expired' | 'canceled';

export interface User {
  // ... existing fields
  isSubscribed?: boolean;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionExpiresAt?: string | null;
}
```

### 2. Subscription Service (`services/subscriptionService.ts`)

**Key Functions**:
- `fetchSubscriptionState(userId)` - Fetches subscription data from backend
- `updateSubscriptionState(userId, data)` - Updates subscription (for webhooks/admin)
- `determineSubscriptionTier(user)` - Calculates tier from user data
- `isSubscriptionActive(user)` - Validates active subscription

**Features**:
- Automatic fallback to free tier if Supabase not configured
- Creates default subscription record for new users
- Handles expired subscriptions gracefully
- Validates subscription expiration dates

### 3. Usage Limits Service (`services/usageLimitsService.ts`)

**Updated Functions**:
- `getSubscriptionTier(state)` - Now uses backend subscription data
- `canGeneratePerspective(state)` - Enforces 10 limit for unauthenticated
- `canAddGateway(state)` - Enforces 5 limit for free tier
- `canAddIntention(state)` - Enforces 1 active limit for free tier

**Enforcement Logic**:
- Unauthenticated: 10 perspectives max, no gateways/intentions
- Free tier: Unlimited perspectives, 5 gateways max, 1 active intention max
- Subscribed: Unlimited everything

### 4. UI Components

#### Settings Modal (`components/Settings.tsx`)

**Gateway Tab**:
- Shows subscription guidance when 5 gateways reached
- Disables Add form when limit reached
- Shows "Upgrade to Pro" button
- Handles unauthenticated users with sign-in prompt

**Intentions Tab**:
- Shows subscription guidance when 1 active intention reached
- Disables Add form when limit reached
- Shows "Upgrade to Pro" button
- Handles unauthenticated users with sign-in prompt

**Subscription Guidance UI**:
- Clean, non-intrusive design
- Clear messaging about limits
- Direct upgrade path
- Maintains calm, respectful tone

#### Subscription Upsell Modal (`components/SubscriptionUpsellModal.tsx`)
- Triggered when limits are reached
- Feature-specific messaging
- Upgrade CTA

#### Login Prompt Modal (`components/LoginPromptModal.tsx`)
- Shown when unauthenticated users hit perspective limit
- Encourages sign-in for unlimited access

### 5. App Integration (`App.tsx`)

**Login Flow**:
1. User signs in via Google OAuth
2. Fetches subscription state from backend
3. Merges subscription data with user object
4. Determines subscription tier
5. Updates AppState with subscription info

**Initialization**:
- Fetches subscription state on app load if user is authenticated
- Sets subscription tier based on backend data
- Falls back gracefully if backend unavailable

## Usage Limits Matrix

| Feature | Unauthenticated | Free Tier | Subscribed |
|---------|----------------|-----------|------------|
| Perspectives | 10 max | Unlimited | Unlimited |
| Gateways | 0 (requires auth) | 5 max | Unlimited |
| Intentions | 0 (requires auth) | 1 active max | Unlimited |
| Share Quote | ✓ | ✓ | ✓ |

## Backend Integration

### Setting Up Subscription Records

**For New Users**:
- Subscription record is automatically created on first login
- Defaults to `free` plan with `active` status

**For Existing Users**:
- Run migration to create subscription records
- Default all existing users to free tier

**For Webhooks/Payment Processing**:
```typescript
import { updateSubscriptionState } from './services/subscriptionService';

// Example: Update subscription after payment
await updateSubscriptionState(userId, {
  isSubscribed: true,
  subscriptionPlan: 'pro',
  subscriptionStatus: 'active',
  subscriptionExpiresAt: '2024-12-31T23:59:59Z'
});
```

## Database Migration

Run the updated `supabase-schema.sql` in your Supabase SQL Editor to:
1. Create `user_subscriptions` table
2. Set up indexes for performance
3. Enable Row Level Security
4. Create update triggers

## Testing Checklist

- [ ] Unauthenticated user: Can generate 10 perspectives, then sees login prompt
- [ ] Free tier user: Can add 5 gateways, then sees upgrade prompt
- [ ] Free tier user: Can have 1 active intention, then sees upgrade prompt
- [ ] Subscribed user: Can add unlimited gateways and intentions
- [ ] Subscription state persists across sessions
- [ ] Expired subscriptions fall back to free tier
- [ ] Settings modal shows appropriate guidance based on limits
- [ ] All modals maintain calm, respectful tone

## Future Enhancements

1. **Payment Integration**: Connect `updateSubscriptionState` to Stripe/Paddle webhooks
2. **Subscription Management**: Add UI for users to manage their subscription
3. **Usage Analytics**: Track usage patterns for subscription insights
4. **Trial Periods**: Support time-limited free trials
5. **Team Plans**: Implement team subscription features

## Notes

- All subscription checks are client-side for now (MVP phase)
- Backend subscription state is the source of truth
- Graceful fallbacks ensure app works even if backend unavailable
- No dark patterns or aggressive upselling
- Maintains StartlyTab's calm, intentional design philosophy

