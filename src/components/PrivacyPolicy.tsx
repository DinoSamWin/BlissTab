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

                <section id="collection" className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">1</div>
                        <h2 className="text-2xl font-bold">Comprehensive Data Collection Disclosure</h2>
                    </div>
                    <p className="text-sm opacity-80">StartlyTab collects specific data points essential for cross-device synchronization, AI-driven companionship, and membership management.</p>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="p-6 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                Identity & Account
                            </h3>
                            <ul className="text-sm space-y-1 opacity-90">
                                <li>• Google Account ID (Primary Sync Anchor)</li>
                                <li>• Email Address (Critical for order recovery & support)</li>
                                <li>• Profile Name & Avatar URL</li>
                            </ul>
                        </div>

                        <div className="p-6 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Dashboard Customization
                            </h3>
                            <ul className="text-sm space-y-1 opacity-90">
                                <li>• Website URLs & Canonical Hostnames</li>
                                <li>• Custom Titles & User-defined labels</li>
                                <li>• Custom Favicons (Uploaded images/paths)</li>
                                <li>• Layout Organization (Groups, sorting, folders)</li>
                            </ul>
                        </div>

                        <div className="p-6 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                Membership & Transactions
                            </h3>
                            <ul className="text-sm space-y-1 opacity-90">
                                <li>• Subscription Tier (Free/Pro/Lifetime)</li>
                                <li>• Redemption History (Codes used & timestamps)</li>
                                <li>• Expiry & Renewal Dates</li>
                                <li>• External Transaction Reference IDs</li>
                            </ul>
                        </div>

                        <div className="p-6 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                Telemetry & Environment
                            </h3>
                            <ul className="text-sm space-y-1 opacity-90">
                                <li>• Heartbeat Timestamps (Last active)</li>
                                <li>• Environmental Sensors (Tab count, Audio state, Idle)</li>
                                <li>• App State (Language, Theme, AI Personality)</li>
                            </ul>
                        </div>

                        <div className="p-6 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm md:col-span-2 text-indigo-900 dark:text-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                Psychological Records & Mood Data
                            </h3>
                            <p className="text-sm mb-2"><strong>Data:</strong> Mood logs (values/feelings), mental well-being patterns (e.g., 'Late Night Overwork'), personal notes, and to-do lists.</p>
                            <p className="text-sm font-medium"><strong>Privacy Pledge:</strong> This data is processed locally first and only synced to your private secure vault via Supabase to enable cross-device access.</p>
                        </div>
                    </div>
                </section>

                <section id="processing" className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">2</div>
                        <h2 className="text-2xl font-bold">Data Processing & Purpose</h2>
                    </div>
                    <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
                        <p>We process your data for the following exclusive purposes:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Cloud Synchronization:</strong> We process IDs, Links, and Settings to ensure your dashboard is identical across all your browser instances.</li>
                            <li><strong>AI Empathy & Personalization:</strong> Telemetry data (Tab count, Heartbeat) is processed to determine your current "Digital pace" to adjust the tone and empathy of AI generation.</li>
                            <li><strong>Entitlement Management:</strong> We verify order IDs and redeem codes to grant access to premium features and personalized content pools.</li>
                            <li><strong>Mood Analytics:</strong> We analyze mood logs locally to surface mental well-being patterns and provide timely support interventions.</li>
                        </ul>
                    </div>
                </section>

                <section id="storage" className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">3</div>
                        <h2 className="text-2xl font-bold">Storage, Security & Retention</h2>
                    </div>
                    <div className="space-y-4 text-sm">
                        <div className="p-4 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5">
                            <p><strong>Physical Storage:</strong> Dashboard settings, links, and identity anchors are stored on <strong>Supabase (managed via Google Cloud)</strong> using AES-256 encryption at rest. Sensitive mood logs are stored in <strong>IndexedDB</strong> on your local hardware.</p>
                        </div>
                        <div className="p-4 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5">
                            <p><strong>Retention Policy:</strong> Local activity caches and AI generation logs are automatically purged every <strong>30 days</strong>. Account specific data is retained until the user deletes their account.</p>
                        </div>
                    </div>
                </section>

                <section id="sharing" className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">4</div>
                        <h2 className="text-2xl font-bold">Sharing & Third-Party Disclosure</h2>
                    </div>
                    <div className="p-6 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-2xl">
                        <h3 className="font-bold text-rose-800 dark:text-rose-300 mb-2">Our Strict Non-Sharing Policy:</h3>
                        <p className="text-sm text-rose-700 dark:text-rose-400">
                            StartlyTab does <strong>NOT</strong> sell, trade, or share your data with advertisers, data brokers, or third-party marketing entities. Data is transferred only to our core infrastructure partners (Google, Supabase, Vercel) strictly for operational fulfillment.
                        </p>
                    </div>
                </section>

                <section id="deletion" className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">5</div>
                        <h2 className="text-2xl font-bold">Your Rights: Data Elimination</h2>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        You have full control over your data. You can clear your local cache at any time via Settings, or request account deletion by emailing <a href="mailto:support@startlytab.com" className="text-indigo-600 font-bold">support@startlytab.com</a>. Upon account deletion, all cloud records in Supabase are purged within 7 business days.
                    </p>
                </section>

                <section id="permissions" className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">6</div>
                        <h2 className="text-2xl font-bold">Permissions Mapping</h2>
                    </div>
                    <div className="overflow-hidden border border-gray-200 dark:border-white/10 rounded-2xl">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 uppercase text-[10px] tracking-widest font-bold">
                                <tr>
                                    <th className="px-6 py-4">Permission</th>
                                    <th className="px-6 py-4">Direct Functionality Driven</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {
                                    [
                                        { p: "bookmarks", d: "Renders the customizable Bookmarks Sidebar." },
                                        { p: "history", d: "Enables Quick Visit search across your local history." },
                                        { p: "identity", d: "Secures cross-device sync and membership features." },
                                        { p: "storage", d: "Stores mood logs and local settings locally via IndexedDB." },
                                        { p: "idle / tabs", d: "Allows the AI to sense work pace and provide contextual companionship." }
                                    ].map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">{item.p}</td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{item.d}</td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                </section>

                <section id="limited-use" className="space-y-6">
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

