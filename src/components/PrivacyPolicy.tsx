import React from 'react';

const PrivacyPolicy: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0F0F0F] text-gray-800 dark:text-gray-200 p-8 md:p-16">
            <div className="max-w-3xl mx-auto space-y-8 animate-reveal">
                <header className="space-y-4 border-b border-gray-200 dark:border-white/10 pb-8">
                    <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated: 2026.04.05</p>
                </header>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">1. Scope of This Policy</h2>
                    <p>This Privacy Policy describes how StartlyTab ("Service", "we", "us", or "our") collects, uses, and protects personal and sensitive user data when you use our browser start-page web application and our Chrome Extension.</p>
                    <p>We are committed to transparency regarding how we handle your information. By using the Service, you agree to the practices described in this Privacy Policy.</p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">2. User Data Collection (What We Collect)</h2>
                    <p>We collect only the minimum amount of data necessary to provide and synchronize your personalized workspace:</p>
                    <div className="pl-4 border-l-2 border-indigo-500 space-y-4">
                        <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
                            <li><strong>Identity Information:</strong> Email address, public display name, and profile picture URL (provided by authentication providers like Google).</li>
                            <li><strong>Personalization Data:</strong> Your customized gateway links (titles and URLs), folder structures, and dashboard layout settings.</li>
                            <li><strong>Interaction Data:</strong> App settings such as theme (dark/light), language preference, and search engine choice.</li>
                            <li><strong>AI Interaction History:</strong> Text prompts you submit to our AI features (e.g., motivational quote requests or workspace assistant) to provide continuity in your experience.</li>
                            <li><strong>Technical Identifiers:</strong> A unique project-specific User ID to link your data across devices.</li>
                        </ul>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">3. Data Handling and Processing (How We Use It)</h2>
                    <p>Your data is processed strictly for the following purposes:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Cross-Device Synchronization:</strong> We process your email and UID to ensure your gateway shortcuts and settings are consistent between your extension and web dashboard.</li>
                        <li><strong>Service Functionality:</strong> Processing your AI prompts to generate relevant content or workspace insights.</li>
                        <li><strong>Security and Account Management:</strong> Authenticating your identity and preventing unauthorized access to your account.</li>
                        <li><strong>Analytics:</strong> We use privacy-preserving, cookieless analytics (Umami) to understand aggregated usage trends (e.g., most used features) without identifying individual users.</li>
                    </ul>
                    <p className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 text-sm">
                        <strong>Important:</strong> We do not use your personal data or AI prompts to train public machine learning models or sell them to third parties.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">4. Data Storage and Infrastructure</h2>
                    <p>We rely on world-class infrastructure providers to securely store and process your data:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Firebase (by Google):</strong> Used for secure authentication and user session management.</li>
                        <li><strong>Supabase:</strong> Used for storing your encrypted dashboard configuration, gateway shortcuts, and user settings.</li>
                        <li><strong>Vercel:</strong> Used to host our secure web interface and edge functions.</li>
                    </ul>
                    <p>All data is transmitted over secure, encrypted HTTPS connections. Sensitive configuration data is stored with industry-standard row-level security (RLS) in our databases.</p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">5. Data Sharing (Who We Share With)</h2>
                    <p>We have a strict <strong>No-Sharing-for-Profit</strong> policy.</p>
                    <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
                        <li><strong>No Sale of Data:</strong> We never sell your personal or sensitive data to any third parties.</li>
                        <li><strong>No Advertising:</strong> We do not share your name, email, or browsing habits with advertisers or data brokers.</li>
                        <li><strong>Essential Service Providers:</strong> We share data only with the infrastructure partners listed above (Google/Firebase, Supabase, Vercel) as strictly necessary to host and operate the Service.</li>
                        <li><strong>Legal Requirements:</strong> We may disclose data only if required by valid legal processes (e.g., a court order).</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">6. Chrome Extension Specific Disclosures</h2>
                    <p>When used as a Chrome Extension, the Service requires specific permissions to function correctly:</p>
                    <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
                        <li><strong>Bookmarks:</strong> Only accessed if you explicitly use the "Import Bookmarks" tool. We do not monitor your bookmarks in the background.</li>
                        <li><strong>Tabs:</strong> Used to allow you to import shortcuts from other services or to facilitate the secure OAuth login flow.</li>
                        <li><strong>Identity:</strong> Used for Chrome-native Google Sign-In, receiving only your basic profile info.</li>
                        <li><strong>Favicon:</strong> Used to display high-quality icons for your gateway shortcuts.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">7. Data Retention and Deletion</h2>
                    <p>We retain your data as long as your account is active. You have full control over your data:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Self-Service Deletion:</strong> You can delete specific shortcuts or folders at any time.</li>
                        <li><strong>Full Account Deletion:</strong> You may request full deletion of your account and all associated data by emailing <span className="font-medium text-indigo-600">support@startlytab.com</span>. We process verified requests within 3 business days.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">8. Contact Information</h2>
                    <p>For any privacy-related questions or data requests, please reach out to us:</p>
                    <p className="font-medium text-lg text-indigo-600 dark:text-indigo-400">Email: support@startlytab.com</p>
                </section>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
