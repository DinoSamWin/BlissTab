import React from 'react';

const PrivacyPolicy: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#FBFBFE] dark:bg-[#0A0A0B] text-gray-800 dark:text-gray-200 p-8 md:p-16 font-sans">
            <div className="max-w-4xl mx-auto space-y-12 animate-reveal">
                <header className="space-y-4 border-b border-gray-200 dark:border-white/10 pb-10">
                    <div className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                        Compliance Updated: April 2026
                    </div>
                    <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 dark:from-white dark:via-gray-300 dark:to-gray-500">
                        Privacy Policy
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        This policy outlines how StartlyTab ("we", "the Product") collects, processes, stores, and shares user data. We are committed to an absolute local-first approach where your privacy is the priority.
                    </p>
                </header>

                {/* 1. DATA COLLECTION */}
                <section id="collection" className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">1</div>
                        <h2 className="text-2xl font-bold">Comprehensive Data Collection Disclosure</h2>
                    </div>
                    <p className="text-sm opacity-80 italic">We disclose every data point collected to provide a seamless, synchronized, and personalized experience:</p>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* 1.1 Private Identity */}
                        <div className="p-6 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                Identity & Account
                            </h3>
                            <ul className="text-sm space-y-1 opacity-90">
                                <li>• Google Account ID (Sync Anchor)</li>
                                <li>• Email Address (Critical for order recovery)</li>
                                <li>• Profile Name & Avatar URL</li>
                            </ul>
                        </div>

                        {/* 1.2 Custom Shortcuts */}
                        <div className="p-6 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Custom Links (Gateways)
                            </h3>
                            <ul className="text-sm space-y-1 opacity-90">
                                <li>• Website URLs (Canonicalized)</li>
                                <li>• Custom Titles (User-defined names)</li>
                                <li>• Custom Icons (Uploaded images/paths)</li>
                                <li>• Layout Data (Groups, sorting, folders)</li>
                            </ul>
                        </div>

                        {/* 1.3 Subscription & Commerce */}
                        <div className="p-6 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                Membership & Commerce
                            </h3>
                            <ul className="text-sm space-y-1 opacity-90">
                                <li>• Subscription Tier (Free/Pro/Member)</li>
                                <li>• Redemption Records (Redeem codes used)</li>
                                <li>• Membership Expiry & Renewal dates</li>
                                <li>• Payment/Order Anchors (Supabase ID)</li>
                            </ul>
                        </div>

                        {/* 1.4 Product Usage Context */}
                        <div className="p-6 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                Session & Environment
                            </h3>
                            <ul className="text-sm space-y-1 opacity-90">
                                <li>• Return Time (Heartbeat timestamp)</li>
                                <li>• Tab Count & Audio/Mute status</li>
                                <li>• App Settings (Language, Theme, AI persona)</li>
                                <li>• Pinned Content (Last liked AI quotes)</li>
                            </ul>
                        </div>

                        {/* 1.5 Sensitive User Content */}
                        <div className="p-6 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm md:col-span-2 text-indigo-900 dark:text-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                Psychological Records & Mood Data
                            </h3>
                            <p className="text-sm mb-2"><strong>Data:</strong> Mood logs (values/feelings), mental well-being patterns (e.g., 'Late Night Overwork'), personal notes, and to-do lists.</p>
                            <p className="text-sm font-medium"><strong>Privacy Note:</strong> This data is LOCAL-FIRST. While it may sync to your private cloud bucket via Supabase for multi-device access, it is never used for external analytics or training.</p>
                        </div>
                    </div>
                </section>

                {/* 2. DATA PROCESSING */}
                <section id="processing" className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">2</div>
                        <h2 className="text-2xl font-bold">Data Processing & Purpose</h2>
                    </div>
                    <div className="overflow-hidden border border-gray-200 dark:border-white/10 rounded-2xl">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 uppercase text-[10px] tracking-widest font-bold">
                                <tr>
                                    <th className="px-6 py-4">Data Pillar</th>
                                    <th className="px-6 py-4">Core Processing Purpose</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {
                                    [
                                        { k: "Gateways", v: "Syncing your personalized dashboard across browser instances." },
                                        { k: "Commerce", v: "Granting Pro feature access and validating redeem codes." },
                                        { k: "Language", v: "Applying translations and regional setting overrides." },
                                        { k: "Environment", v: "Informing the 'Sense' of AI generation (detecting work pace)." },
                                        { k: "Session", v: "Determining 'Return Time' to calculate 48h emotional baselines." }
                                    ].map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">{item.k}</td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{item.v}</td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                </section>


                {/* 3. DATA STORAGE & RETENTION */}
                <section id="storage" className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">3</div>
                        <h2 className="text-2xl font-bold">Data Storage and Retention</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5">
                            <p className="text-sm">
                                <strong>Local Storage:</strong> Most sensitive data (mood, patterns, notes, local metadata cache) is stored <strong>locally</strong> in your browser (IndexedDB and chrome.storage.local).
                            </p>
                        </div>
                        <div className="p-4 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5">
                            <p className="text-sm">
                                <strong>Retention Policy:</strong> Activity logs and generation caches are automatically purged after 30 days. Account identity and cross-device sync data are retained while your account is active.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 4. DATA SHARING */}
                <section id="sharing" className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">4</div>
                        <h2 className="text-2xl font-bold">Data Sharing and Third-Party Transfer</h2>
                    </div>
                    <div className="p-6 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-2xl">
                        <p className="text-sm font-bold text-rose-800 dark:text-rose-300 mb-3">Our Zero-Sharing Promise:</p>
                        <p className="text-sm text-rose-700 dark:text-rose-400">
                            We do <strong>NOT</strong> share your personal records (mood, notes) or browsing history with any third-party advertisers or data brokers. Data transfers are limited to infrastructure partners (Google, Supabase, Vercel) for the sole purpose of core app operation and secure cloud synchronization.
                        </p>
                    </div>
                </section>

                {/* 5. PERMISSIONS */}
                <section id="permissions" className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">5</div>
                        <h2 className="text-2xl font-bold">Detailed Use of Permissions</h2>
                    </div>
                    <div className="overflow-hidden border border-gray-200 dark:border-white/10 rounded-2xl">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 uppercase text-[10px] tracking-widest font-bold">
                                <tr>
                                    <th className="px-6 py-4">Permission</th>
                                    <th className="px-6 py-4">Functionality Driven</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {
                                    [
                                        { p: "bookmarks", d: "Enables 'Bookmarks Sidebar' for easy organization." },
                                        { p: "history", d: "Powers 'Quick Search' and 'Contextual AI' history references." },
                                        { p: "activeTab / scripting", d: "Used for AI summarization of the current site (User-initiated)." },
                                        { p: "identity", d: "Manages secure login and cross-device sync via Google." },
                                        { p: "storage", d: "Saves mental well-being patterns, notes, and local app state." },
                                        { p: "idle / tabs", d: "Allows the AI to know if you've been away or if tabs are overflowing." }
                                    ].map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-mono text-indigo-600 dark:text-indigo-400 font-bold">{item.p}</td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{item.d}</td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 6. LIMITED USE */}
                <section id="limited-use" className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">6</div>
                        <h2 className="text-2xl font-bold">Limited Use Disclosure</h2>
                    </div>
                    <div className="p-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl text-white shadow-xl">
                        <p className="text-lg font-bold mb-4 italic">"Privacy is not an option; it is our foundation."</p>
                        <ul className="space-y-3 text-sm opacity-90">
                            <li className="flex gap-2"><span>✅</span> Our use of information received from Google APIs will adhere to Chrome Web Store User Data Policy, including the Limited Use requirements.</li>
                            <li className="flex gap-2"><span>✅</span> No human interaction with user data except for authorized technical support.</li>
                            <li className="flex gap-2"><span>✅</span> Strictly no use of data for credit-worthiness or advertising.</li>
                        </ul>
                    </div>
                </section>


                {/* 5. CONTACT */}
                <footer className="pt-10 border-t border-gray-200 dark:border-white/10 text-center">
                    <p className="text-sm text-gray-500 mb-2">Have questions about your data?</p>
                    <a href="mailto:support@startlytab.com" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                        support@startlytab.com
                    </a>
                    <p className="mt-8 text-[10px] text-gray-400 uppercase tracking-widest">
                        © 2026 StartlyTab. All Rights Reserved.
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default PrivacyPolicy;

