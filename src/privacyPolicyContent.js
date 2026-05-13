export const privacyPolicyBadge = "Chrome Web Store Compliance 2026";
export const privacyPolicyTitle = "Privacy Policy";
export const privacyPolicyIntro =
  "This page explains how StartlyTab collects, uses, stores, and shares data when you use the extension, website, and related account features.";
export const privacyPolicyLastUpdated = "May 13, 2026";
export const privacyLimitedUseStatement =
  "The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.";

export const privacyCollectionCards = [
  {
    title: "Account & Sign-in Data",
    items: [
      "Email address, account ID, display name, and social/profile photo when available",
      "Authentication state, session data, and verification status needed for sign-in",
      "Subscription, membership, and account status returned by our backend",
    ],
  },
  {
    title: "Saved Content & Preferences",
    items: [
      "Saved shortcuts, URLs, titles, categories, and custom labels",
      "User-uploaded gateway logos, storage paths, hashes, and sync metadata",
      "Theme, language, selected search engine, persona, snippet preferences, and similar settings",
    ],
  },
  {
    title: "User-Triggered Browser Data & Imports",
    items: [
      "Bookmarks, only when you use bookmark import",
      "Links extracted from supported third-party start pages, only when you trigger an import",
      "Installed extension state, checked only to verify supported import sources",
      "Current tab URL, title, and favicon, only when you add the active page",
      "Website title, icon, or favicon requests for shortcuts you save",
    ],
  },
  {
    title: "AI Inputs & Generated Content",
    items: [
      "Prompts, selected language/persona, and recent in-product history used for AI generation",
      "Custom venting text, chat messages, or other freeform text you submit to AI features",
      "AI-generated perspectives, responses, and related output history when you choose to save or sync it",
    ],
  },
  {
    title: "Search Queries",
    items: [
      "Search terms entered into the StartlyTab search bar",
      "Queries are sent to your selected search engine or Chrome's default search flow when you search",
    ],
  },
  {
    title: "Optional Context-Aware Signals",
    items: [
      "Open tab count, audio-playing state, mute state, fullscreen/window state, and download-in-progress state",
      "Battery level and idle time on this page",
      "Collected only if you enable context-aware mode, and used as aggregated signals rather than a list of all open tab URLs",
    ],
  },
  {
    title: "Well-Being History & Feedback",
    items: [
      "Emotion selections you explicitly click in the UI",
      "Perspective history, timestamps, trend summaries, and local metadata caches",
      "Feedback you choose to submit about generated AI output",
    ],
  },
  {
    title: "Billing & Support Data",
    items: [
      "Subscription plan, redemption status, and transaction references",
      "Customer email used for payment portal and billing support",
      "Transactional email delivery status for verification and password reset",
    ],
  },
];

export const privacyHandlingItems = [
  {
    label: "Sign-in and account management",
    text: "Authenticate you, keep you signed in, and restore your synced workspace.",
  },
  {
    label: "Shortcut management & imports",
    text: "Save, sync, import, edit, export, and display your saved links and custom logos. Bookmarks or supported start pages are read only when you trigger an import.",
  },
  {
    label: "Search routing",
    text: "Send search queries to your selected search engine or Chrome's default search flow. StartlyTab does not intentionally store a separate searchable history of those queries.",
  },
  {
    label: "AI generation and chat",
    text: "Send prompts, selected settings, recent history, optional context summaries, and any freeform text you submit to the configured AI provider in order to generate responses.",
  },
  {
    label: "Billing and entitlements",
    text: "Verify subscriptions, redemption status, transaction references, and payment-related access.",
  },
  {
    label: "Security and operations",
    text: "Maintain caches, prevent sync issues, and send verification or password-reset emails.",
  },
];

export const privacyStorageItems = [
  {
    label: "On your device",
    text: "localStorage, chrome.storage.local, and IndexedDB may store app state, preferences, auth/session state, caches, emotion logs, perspective history, and locally cached logo data.",
  },
  {
    label: "In the cloud",
    text: "Supabase may store synced account data, gateway overrides, uploaded gateway logos, subscription or membership state, and optional feedback submitted through our backend.",
  },
  {
    label: "Payment processing",
    text: "Creem handles checkout and billing portal flows. StartlyTab receives subscription status, transaction references, and limited billing-support metadata rather than full payment card numbers.",
  },
  {
    label: "Cloud retention",
    text: "Account-linked synced records are generally kept while your account remains active and until you delete them or request deletion, unless longer retention is required for security, fraud prevention, or legal compliance.",
  },
  {
    label: "Retention examples",
    text: "Local perspective history is trimmed to recent entries, emotion logs are kept for up to 30 days, and metadata caches expire automatically over time.",
  },
  {
    label: "Security",
    text: "Data sent over the network is intended to use HTTPS/TLS. Access to synced cloud records is controlled by backend rules and service-provider safeguards.",
  },
];

export const privacyProviderRows = [
  {
    party: "Google / Firebase / Chrome services",
    reason:
      "Google sign-in, Firebase authentication, Chrome Search API when you use browser/default search mode, and Google favicon lookups for saved shortcuts.",
  },
  {
    party: "Search engines you choose",
    reason:
      "Search terms are sent to the engine you select in StartlyTab when you run a search.",
  },
  {
    party: "Supabase",
    reason:
      "Cloud sync, database records, backend functions, and storage for user-uploaded gateway logos.",
  },
  {
    party: "AI providers (such as DeepSeek, SiliconFlow, or ZhipuAI, depending on configuration)",
    reason:
      "Process prompts, optional context summaries, recent history, and any freeform text you submit to AI features in order to generate responses.",
  },
  {
    party: "Creem",
    reason:
      "Subscription checkout, billing portal access, payment-related customer lookups, and transaction/reference handling.",
  },
  {
    party: "Resend",
    reason:
      "Transactional emails such as verification, password reset, and payment-support notifications.",
  },
  {
    party: "Websites you save or supported import sources",
    reason:
      "When you add or import shortcuts, StartlyTab may request those pages or parse supported start pages to extract URLs, titles, or icons.",
  },
];

export const privacyChoiceItems = [
  {
    label: "Context-aware mode is optional",
    text: "You can use StartlyTab in basic mode without enabling the optional browser-state signals described above.",
  },
  {
    label: "Imports are user-triggered",
    text: "Bookmark import, supported start-page import, active-tab capture, and similar browser-data access only happen when you explicitly use those features.",
  },
  {
    label: "AI features are optional",
    text: "Freeform prompts, venting/chat, and context-aware AI processing only happen when you actively use those features.",
  },
  {
    label: "Local data",
    text: "You can remove local app data on this device by clearing your browser storage for StartlyTab or uninstalling the extension. Where available, StartlyTab settings may also help you reset local data.",
  },
  {
    label: "Synced account data",
    text: "If you want cloud data deleted, contact support@startlytab.com. We use that request to remove account-linked synced records that are not required to be retained for security, fraud prevention, or legal compliance.",
  },
  {
    label: "Questions",
    text: "If you need clarification about our data handling, contact us at support@startlytab.com.",
  },
];
