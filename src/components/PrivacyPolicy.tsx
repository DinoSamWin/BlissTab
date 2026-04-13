import React from 'react';

const PrivacyPolicy: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0F0F0F] text-gray-800 dark:text-gray-200 p-8 md:p-16">
            <div className="max-w-3xl mx-auto space-y-8 animate-reveal">
                <header className="space-y-4 border-b border-gray-200 dark:border-white/10 pb-8">
                    <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated: 2026.04.08</p>
                </header>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">1. Data Collection</h2>
                    <p>When you use StartlyTab (both the website and the Chrome Extension), we collect only the necessary data required to provide you with our core functionalities. The data collected includes:</p>
                    <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
                        <li><strong>Google API Data (Authentication):</strong> When you sign in using Google, we collect your Email Address, Name, and Profile Picture. This information is retrieved through Google OAuth and the Chrome Identity API to establish your identity.</li>
                        <li><strong>Personalization Data:</strong> Gateway shortcuts (URLs and titles) you add, folder structures, and dashboard layout settings.</li>
                        <li><strong>User Preferences:</strong> Theme choice (dark/light mode), search engine preference, and language settings.</li>
                        <li><strong>AI Interaction History:</strong> Text prompts you submit to our AI features is collected to execute the AI requests.</li>
                        <li><strong>Technical Identifiers:</strong> A unique User ID to securely sync your data across devices.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">2. Data Processing and Use</h2>
                    <p>Your data is processed and used strictly to deliver and improve our single-purpose experience (your personalized workspace tab). Specifically, we use your data to:</p>
                    <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
                        <li><strong>Identify and Authenticate You:</strong> We use your Google email and profile information to log you in, secure your account, and synchronize your shortcuts across devices.</li>
                        <li><strong>Provide Core Features:</strong> We process your shortcuts, AI prompts, and layout configuration to render your personalized New Tab page.</li>
                        <li><strong>Ensure Security:</strong> To prevent unauthorized access and investigate potential abuse.</li>
                        <li><strong>Service Improvement:</strong> We use privacy-preserving analytics to understand aggregated usage. <strong>We strictly prohibit the use of your data, including AI prompts and Google API data, to train public machine learning models or to serve you personalized, re-targeted, or interest-based advertisements.</strong></li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">3. Data Storage and Security</h2>
                    <p>We implement robust security measures, including modern cryptography and HTTPS encryption during transmission, to protect your data. Your data is stored securely through industry-standard providers:</p>
                    <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
                        <li><strong>Authentication Data:</strong> Your Google OAuth credentials, email, and identity tokens are securely encrypted and stored by Google Firebase Authentication.</li>
                        <li><strong>User Configuration Data:</strong> Your customized shortcuts, layout, and settings are stored in our secure database provided by Supabase, enforcing row-level security (RLS).</li>
                        <li><strong>Local Device Storage:</strong> We use Chrome's local storage mechanisms (`chrome.storage.local` and IndexedDB) to securely cache your session state and settings locally for fast offline access.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">4. Data Sharing and Disclosure</h2>
                    <p>We do not sell your personal or sensitive data. We only transfer or share user data to third parties under the following strict conditions:</p>
                    <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
                        <li><strong>Essential Service Providers:</strong> We share necessary data with our infrastructure partners (Google/Firebase for auth, Supabase for database hosting, Vercel for web hosting). These providers are contractually obligated to protect your data.</li>
                        <li><strong>Legal Compliance:</strong> If necessary to comply with applicable laws, valid legal processes, or to protect against malware, spam, phishing, or other fraud or abuse.</li>
                        <li><strong>Merger or Acquisition:</strong> As part of a merger, acquisition, or sale of assets, but only after obtaining explicit prior consent from you (the user).</li>
                        <li><strong>We do NOT transfer, use, or sell your user data to any advertising platforms, data brokers, or other information resellers.</strong> We absolutely prohibit humans from reading your data unless explicit consent is obtained for support, it is necessary for security investigations, or to comply with applicable laws.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">5. Limited Use Disclosure</h2>
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                        <p className="font-semibold text-lg mb-2">Compliance Statement</p>
                        <p className="mb-4"><strong>The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.</strong></p>
                        <p>We guarantee that our collection, use, and transfer of any Google User Data strictly adheres to the Chrome Web Store Program Policies, and we never use your data for advertising, credit-worthiness, or lending purposes.</p>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">6. Data Retention and Deletion</h2>
                    <p>We retain your user data only for as long as your account is active to provide you with the Service.</p>
                    <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
                        <li><strong>Self-Service:</strong> You can delete any saved shortcut, folder, or AI prompt history directly within the application's interface at any time.</li>
                        <li><strong>Account Deletion:</strong> You have the absolute right to request full account deletion. Please email your request to <a href="mailto:support@startlytab.com" className="text-indigo-600 hover:text-indigo-500">support@startlytab.com</a> using your registered email. We will completely purge your identity, settings, and database records within 3 business days of verification.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">7. Contact Information</h2>
                    <p>If you have any questions or concerns about this privacy policy or our data practices, please contact us immediately:</p>
                    <p className="font-medium text-lg text-indigo-600 dark:text-indigo-400">Email: support@startlytab.com</p>
                </section>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
