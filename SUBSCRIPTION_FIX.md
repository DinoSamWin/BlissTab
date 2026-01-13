# Subscription Gating Fix - Implementation Summary

## Problem Fixed
- Paywall was triggering too early (at 1 gateway instead of 5)
- Missing handler-level guards to prevent bypass

## Solution Implemented

### 1. Single Source of Truth for Limits
Added `SUBSCRIPTION_LIMITS` constant in `usageLimitsService.ts`:
```typescript
export const SUBSCRIPTION_LIMITS = {
  GATEWAYS: {
    FREE: 5,
    SUBSCRIBED: Infinity,
  },
  INTENTIONS: {
    FREE: 1,
    SUBSCRIBED: Infinity,
  },
} as const;
```

### 2. Updated Limit Check Functions
- `canAddGateway()`: Now uses `SUBSCRIPTION_LIMITS.GATEWAYS.FREE` (5) instead of hardcoded value
- `canAddIntention()`: Now uses `SUBSCRIPTION_LIMITS.INTENTIONS.FREE` (1) instead of hardcoded value
- Both functions explicitly check `gatewayCount >= maxGateways` (not `>= 1`)

### 3. Handler-Level Guards (Prevent Bypass)
Added explicit guards in `Settings.tsx` handlers:

**`handleAddLink`**:
```typescript
// Handler-level guard: Prevent bypass via Enter key, fast clicks, or devtools
const isAuthed = !!state.user;
const gatewayCount = state.links.length;

if (isAuthed && !isSubscribed(state) && gatewayCount >= SUBSCRIPTION_LIMITS.GATEWAYS.FREE) {
  setSubscriptionModalFeature('gateways');
  setIsSubscriptionModalOpen(true);
  return;
}
```

**`handleAddSnippet`**:
```typescript
// Handler-level guard: Prevent bypass
const isAuthed = !!state.user;
const activeIntentionCount = state.requests.filter(r => r.active).length;

if (isAuthed && !isSubscribed(state) && activeIntentionCount >= SUBSCRIPTION_LIMITS.INTENTIONS.FREE) {
  setSubscriptionModalFeature('intentions');
  setIsSubscriptionModalOpen(true);
  return;
}
```

**`toggleSnippetActive`**:
- Same guard pattern when activating an intention

### 4. Correct Trigger Conditions

**Gateways**:
- ✅ Allow when: `gatewayCount < 5` (free users)
- ❌ Block when: `isAuthed === true && isSubscribed === false && gatewayCount >= 5`

**Intentions**:
- ✅ Allow when: `activeIntentionCount < 1` (free users)
- ❌ Block when: `isAuthed === true && isSubscribed === false && activeIntentionCount >= 1`

## Testing Checklist

- [ ] Free user with 0-4 gateways: Can add gateways normally
- [ ] Free user with 5 gateways: Sees upgrade prompt (no input field)
- [ ] Free user with 0 active intentions: Can add intention normally
- [ ] Free user with 1 active intention: Sees upgrade prompt (no input field)
- [ ] Subscribed user: Can add unlimited gateways and intentions
- [ ] Handler guards prevent bypass via Enter key
- [ ] Handler guards prevent bypass via fast clicks
- [ ] Handler guards prevent bypass via devtools

## Files Modified

1. `services/usageLimitsService.ts`
   - Added `SUBSCRIPTION_LIMITS` constant
   - Updated `canAddGateway()` to use constant
   - Updated `canAddIntention()` to use constant
   - Added `isSubscribed()` helper function

2. `components/Settings.tsx`
   - Added handler-level guards in `handleAddLink`
   - Added handler-level guards in `handleAddSnippet`
   - Added handler-level guards in `toggleSnippetActive`
   - Imported `SUBSCRIPTION_LIMITS` and `isSubscribed`

## Backend Enforcement (Future)

When implementing API endpoints, ensure they match UI limits:

```typescript
// POST /gateways
if (!isSubscribed && gatewayCount >= 5) {
  return { error: "SUBSCRIPTION_REQUIRED", reason: "gateway_limit" };
}

// POST /intentions
if (!isSubscribed && activeIntentionCount >= 1) {
  return { error: "SUBSCRIPTION_REQUIRED", reason: "intention_limit" };
}
```

