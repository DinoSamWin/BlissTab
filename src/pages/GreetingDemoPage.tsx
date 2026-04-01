import React, { useState } from 'react';
import DailyGreetingLoading from '../components/DailyGreetingLoading';

const GreetingDemoPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);

    const handleLoadingComplete = () => {
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#FBFBFE] dark:bg-[#0A0A0B] flex flex-col items-center justify-center p-8 transition-colors duration-500">
            {isLoading && (
                <DailyGreetingLoading onComplete={handleLoadingComplete} />
            )}

            {/* Main Content (Mock Homepage State) */}
            <div className={`w-full max-w-4xl transition-all duration-1500 delay-500 ${!isLoading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <header className="mb-12 text-center">
                    <h1 className="text-5xl font-extrabold serif editorial-title mb-4 tracking-tighter">
                        StartlyTab / Focus
                    </h1>
                    <p className="text-slate-500 font-light tracking-widest uppercase text-xs">
                        Welcome back to your workspace.
                    </p>
                </header>

                <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section className="soft-card p-12 rounded-[2.5rem] bg-white/40 dark:bg-black/20 backdrop-blur-3xl border border-white/20 shadow-2xl hover:scale-[1.02] transition-transform duration-700">
                        <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            Quick Access
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="h-24 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl animate-pulse"></div>
                            <div className="h-24 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl animate-pulse"></div>
                            <div className="h-24 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl animate-pulse"></div>
                            <div className="h-24 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl animate-pulse"></div>
                        </div>
                    </section>

                    <section className="soft-card p-12 rounded-[2.5rem] bg-white/40 dark:bg-black/20 backdrop-blur-3xl border border-white/20 shadow-2xl hover:scale-[1.02] transition-transform duration-700">
                        <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            Daily Reflection
                        </h2>
                        <div className="space-y-6">
                            <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full w-full"></div>
                            <p className="text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                                Morning vibes set to serene. You've been focused for 25 minutes today. Keep going, the quiet is where you find yourself.
                            </p>
                            <div className="h-4 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl w-3/4"></div>
                        </div>
                    </section>
                </main>

                <footer className="mt-20 text-center">
                    <button
                        onClick={() => setIsLoading(true)}
                        className="px-8 py-3 rounded-2xl bg-black dark:bg-white text-white dark:text-black hover:scale-105 active:scale-95 transition-all text-sm font-medium shadow-xl hover:shadow-2xl"
                    >
                        Re-trigger Loading Effect
                    </button>
                    <p className="mt-8 text-xs text-slate-400 uppercase tracking-[0.2em]">
                        Concept Demo for StartlyTab Refresh
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default GreetingDemoPage;
