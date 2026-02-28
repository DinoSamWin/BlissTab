import React from 'react';

const SemanticFooter: React.FC = () => {
    return (
        <footer className="w-full bg-[#0B0C1A] text-gray-300 py-20 px-8 relative overflow-hidden border-t border-white/5 z-20">
            {/* Ambient Lighting */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/20 to-transparent"></div>
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-900/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 relative z-10">

                {/* Zone 1: Brand & Entity */}
                <div className="flex flex-col space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
                                <path d="M12 4V2M12 22V20M4 12H2M22 12H20M5.636 5.636L4.222 4.222M19.778 19.778L18.364 18.364M5.636 18.364L4.222 19.778M19.778 5.636L18.364 4.222" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span className="font-bold text-white tracking-widest text-lg">StartlyTab</span>
                    </div>

                    <div className="space-y-2 max-w-xs">
                        <p className="text-sm text-gray-400 font-medium">Your emotional workspace in a new tab.</p>
                        <p className="text-xs text-gray-500 leading-relaxed font-light">
                            Designed to reduce work anxiety and bring psychological rhythm back to your browser.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                        <a href="https://twitter.com/startlytab" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors" aria-label="StartlyTab on Twitter/X">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 24.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zl-1.161 17.52h1.833L7.007 4.076H5.036z" />
                            </svg>
                        </a>
                        <a href="https://www.producthunt.com/products/startlytab" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-orange-500 transition-colors" aria-label="StartlyTab on Product Hunt">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM10.15 15.69h-1.63V8.31h3.33c1.7 0 2.55.8 2.55 2.12 0 1.34-.85 2.13-2.55 2.13h-1.7v3.13zm1.61-4.32c.76 0 1.25-.33 1.25-.87 0-.58-.45-.89-1.25-.89h-1.61v1.76h1.61z" />
                            </svg>
                        </a>
                    </div>
                </div>

                {/* Zone 2: The SEO Silos - Internal Links */}
                <div className="flex flex-col space-y-5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Solutions & Use Cases</h3>
                    <ul className="space-y-3.5">
                        <li>
                            <span className="text-sm text-gray-500 hover:text-purple-400 transition-colors cursor-default">For High-Pressure Developers</span>
                        </li>
                        <li>
                            <span className="text-sm text-gray-500 hover:text-purple-400 transition-colors cursor-default">For Overwhelmed Designers</span>
                        </li>
                        <li>
                            <span className="text-sm text-gray-500 hover:text-purple-400 transition-colors cursor-default">Remote Work Sanctuary</span>
                        </li>
                        <li>
                            <span className="text-sm text-gray-500 hover:text-purple-400 transition-colors cursor-default flex items-center gap-2">
                                StartlyTab vs Momentum
                                <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded uppercase font-bold tracking-wider">Compare</span>
                            </span>
                        </li>
                    </ul>
                </div>

                {/* Zone 3: Strategic Gateway - Nofollow Outbound */}
                <div className="flex flex-col space-y-5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Your Calmer Gateways</h3>
                    <ul className="space-y-3.5">
                        <li>
                            <a href="https://notion.so" rel="nofollow external" aria-label="Access Notion mindfully from StartlyTab" className="group flex items-center text-sm text-gray-500 hover:text-white transition-colors">
                                <span className="opacity-0 group-hover:opacity-100 text-purple-400 mr-2 transition-all -translate-x-2 group-hover:translate-x-0">↳</span>
                                <span className="group-hover:translate-x-1 transition-transform">Mindful access to Notion</span>
                            </a>
                        </li>
                        <li>
                            <a href="https://calendar.google.com" rel="nofollow external" aria-label="Access Google Calendar calmly from StartlyTab" className="group flex items-center text-sm text-gray-500 hover:text-white transition-colors">
                                <span className="opacity-0 group-hover:opacity-100 text-yellow-400 mr-2 transition-all -translate-x-2 group-hover:translate-x-0">↳</span>
                                <span className="group-hover:translate-x-1 transition-transform">Stress-free sync with Google Calendar</span>
                            </a>
                        </li>
                        <li>
                            <a href="https://figma.com" rel="nofollow external" aria-label="Access Figma focus mode from StartlyTab" className="group flex items-center text-sm text-gray-500 hover:text-white transition-colors">
                                <span className="opacity-0 group-hover:opacity-100 text-pink-400 mr-2 transition-all -translate-x-2 group-hover:translate-x-0">↳</span>
                                <span className="group-hover:translate-x-1 transition-transform">Focus mode for Figma</span>
                            </a>
                        </li>
                        <li>
                            <a href="https://slack.com" rel="nofollow external" aria-label="Enter Slack quietly from StartlyTab" className="group flex items-center text-sm text-gray-500 hover:text-white transition-colors">
                                <span className="opacity-0 group-hover:opacity-100 text-blue-400 mr-2 transition-all -translate-x-2 group-hover:translate-x-0">↳</span>
                                <span className="group-hover:translate-x-1 transition-transform">Quiet entry to Slack</span>
                            </a>
                        </li>
                    </ul>
                </div>

                {/* Zone 4: Trust & Legal - E-E-A-T Core */}
                <div className="flex flex-col space-y-5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Trust & Privacy</h3>
                    <ul className="space-y-3.5">
                        <li>
                            <a href="/privacy" className="text-sm text-gray-500 hover:text-white transition-colors underline decoration-gray-500/30 underline-offset-4">Privacy Policy</a>
                        </li>
                        <li>
                            <a href="/terms" className="text-sm text-gray-500 hover:text-white transition-colors underline decoration-gray-500/30 underline-offset-4">Terms of Service</a>
                        </li>
                        <li>
                            <a href="mailto:support@startlytab.com" className="text-sm text-gray-500 hover:text-white transition-colors underline decoration-gray-500/30 underline-offset-4">Contact Us</a>
                        </li>
                        <li className="pt-2">
                            {/* Note: This to Chrome Web Store is strategically NOT nofollow to boost extension page */}
                            <a href="https://chrome.google.com/webstore" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-white transition-colors">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2c5.523 0 10 4.477 10 10 0 1.258-.236 2.463-.666 3.58L14.735 6.096C13.9 5.415 13.012 5 12 5 8.134 5 5 8.134 5 12c0 .99.197 1.936.55 2.808l5.856-10.144c.196-.037.394-.064.594-.064zM3.483 8.356c.928-1.554 2.308-2.768 4.02-3.486l4.908 8.5H12c-2.76 0-5 2.24-5 5v.498L3.435 12.68c-.687.94-.954 2.053-.954 3.238 0-2.658 1.05-5.074 2.76-6.85zM12 20c-1.854 0-3.555-.658-4.904-1.748L11.332 11h9.54c.732 1.628 1.128 3.444 1.128 5.352 0 4.418-3.582 8-8 8zm4.332-9.5H12c.552 0 1 .448 1 1v6c0 .552-.448 1-1 1s-1-.448-1-1v-2.348l1.344-4.8c.2-.71 1.02-1.042 1.684-.684l.65.344c.642.34 1.488.22 1.984-.36z" />
                                </svg>
                                Add to Chrome
                            </a>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-xs text-gray-600 relative z-10">
                <p>© {new Date().getFullYear()} StartlyTab. Building a calmer internet.</p>
                <p className="mt-2 md:mt-0 flex items-center gap-1">
                    Designed with <span className="text-purple-500">♥</span> for mindful workers
                </p>
            </div>
        </footer>
    );
};

export default SemanticFooter;
