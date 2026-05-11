import React from 'react';
import { Link } from 'react-router-dom';

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

                {/* Zone 2: The SEO Silos - Internal Links (Inbound) */}
                <div className="flex flex-col space-y-5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Solutions</h3>
                    <ul className="space-y-3.5">
                        <li>
                            <Link to="/use-cases/high-pressure-developers" title="How StartlyTab helps developers focus" className="text-sm text-gray-500 hover:text-purple-400 transition-colors">For Developers</Link>
                        </li>
                        <li>
                            <Link to="/use-cases/overwhelmed-designers" title="How StartlyTab helps designers reduce overwhelm" className="text-sm text-gray-500 hover:text-purple-400 transition-colors">For Designers</Link>
                        </li>
                        <li>
                            <Link to="/use-cases/remote-work-sanctuary" title="Create a calm remote work environment" className="text-sm text-gray-500 hover:text-purple-400 transition-colors">Remote Work</Link>
                        </li>
                        <li>
                            <Link to="/compare/startlytab-vs-momentum" title="Compare StartlyTab with Momentum dashboard" className="text-sm text-gray-500 hover:text-purple-400 transition-colors flex items-center gap-2">
                                vs Momentum
                                <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded uppercase font-bold tracking-wider">Compare</span>
                            </Link>
                        </li>
                    </ul>
                </div>

                {/* Zone 3: Strategic Gateways - User Stories (NEW for SEO) */}
                <div className="flex flex-col space-y-5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">User Stories</h3>
                    <ul className="space-y-3.5">
                        <li>
                            <Link to="/stories/maya-tab-overload-mental-buffer" className="text-sm text-gray-500 hover:text-indigo-400 transition-colors">Maya: Marketing Lead</Link>
                        </li>
                        <li>
                            <Link to="/stories/daniel-workplace-frustration-emotional-buffer" className="text-sm text-gray-500 hover:text-indigo-400 transition-colors">Daniel: Senior Engineer</Link>
                        </li>
                        <li>
                            <Link to="/stories/rachel-monday-blues-post-holiday-slump" className="text-sm text-gray-500 hover:text-indigo-400 transition-colors">Rachel: Freelancer</Link>
                        </li>
                        <li>
                            <Link to="/stories/lena-project-manager-fragmented-workday" className="text-sm text-gray-500 hover:text-indigo-400 transition-colors">Lena: Project Manager</Link>
                        </li>
                    </ul>
                </div>

                {/* Zone 4: Strategic Gateways - Internal Feature Links */}
                <div className="flex flex-col space-y-5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Features</h3>
                    <ul className="space-y-3.5">
                        <li>
                            <Link to="/features/gentle-check-ins" title="Reduce work anxiety with gentle check-ins" className="group flex items-center text-sm text-gray-500 hover:text-white transition-colors">
                                <span className="opacity-0 group-hover:opacity-100 text-teal-400 mr-2 transition-all -translate-x-2 group-hover:translate-x-0">↳</span>
                                <span className="group-hover:translate-x-1 transition-transform">Gentle check-ins</span>
                            </Link>
                        </li>
                        <li>
                            <Link to="/features/minimalist-dashboard" title="Create a calm and minimalist new tab workspace" className="group flex items-center text-sm text-gray-500 hover:text-white transition-colors">
                                <span className="opacity-0 group-hover:opacity-100 text-purple-400 mr-2 transition-all -translate-x-2 group-hover:translate-x-0">↳</span>
                                <span className="group-hover:translate-x-1 transition-transform">Minimalist dashboard</span>
                            </Link>
                        </li>
                        <li>
                            <Link to="/features/ai-creative-companion" title="Overcome creative blocks with the AI companion" className="group flex items-center text-sm text-gray-500 hover:text-white transition-colors">
                                <span className="opacity-0 group-hover:opacity-100 text-pink-400 mr-2 transition-all -translate-x-2 group-hover:translate-x-0">↳</span>
                                <span className="group-hover:translate-x-1 transition-transform">AI Companion</span>
                            </Link>
                        </li>
                        <li>
                            <Link to="/workflows/tab-overload-relief" title="Strategies to manage and relieve browser tab overload" className="group flex items-center text-sm text-gray-500 hover:text-white transition-colors">
                                <span className="opacity-0 group-hover:opacity-100 text-blue-400 mr-2 transition-all -translate-x-2 group-hover:translate-x-0">↳</span>
                                <span className="group-hover:translate-x-1 transition-transform">Tab Overload Relief</span>
                            </Link>
                        </li>
                    </ul>
                </div>

                {/* Zone 5: Trust & Legal - E-E-A-T Core */}
                <div className="flex flex-col space-y-5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Trust</h3>
                    <ul className="space-y-3.5">
                        <li>
                            <Link to="/privacy" className="text-sm text-gray-500 hover:text-white transition-colors underline decoration-gray-500/30 underline-offset-4">Privacy Policy</Link>
                        </li>
                        <li>
                            <Link to="/terms" className="text-sm text-gray-500 hover:text-white transition-colors underline decoration-gray-500/30 underline-offset-4">Terms of Service</Link>
                        </li>
                        <li>
                            <a href="mailto:support@startlytab.com" className="text-sm text-gray-500 hover:text-white transition-colors underline decoration-gray-500/30 underline-offset-4">Contact Us</a>
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
