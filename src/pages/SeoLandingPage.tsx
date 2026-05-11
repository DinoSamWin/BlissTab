import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SEO_PAGES } from '../data/seoPages';
import SemanticFooter from '../components/SemanticFooter';
import { useSEO } from '../hooks/useSEO';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

const SeoLandingPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const pageData = SEO_PAGES.find(p => p.slug === slug);

    useSEO({
        title: pageData?.seo.title || "StartlyTab",
        description: pageData?.seo.description || "StartlyTab",
        keywords: `${pageData?.id}, startlytab, productivity, mental health, calm internet`,
        ogImage: pageData?.transformationSection.image
    });

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [slug]);

    if (!pageData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center">
                    <h1 className="text-4xl font-serif mb-4">Page not found</h1>
                    <Link to="/" className="text-blue-600 hover:underline">Return to Home</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FBFBFE] text-[#1A1A1A] selection:bg-indigo-100 selection:text-indigo-900">
            {/* Navigation Bar */}
            <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-black/5 px-6 py-4 flex justify-between items-center">
                <Link to="/" className="flex items-center gap-3 group">
                   <img src="/icons/icon-64x64.png" alt="Logo" className="w-8 h-8 rounded-lg group-hover:rotate-6 transition-transform" />
                   <span className="logo-text text-2xl tracking-tight text-gray-900 font-bold">StartlyTab</span>
                </Link>
                <div className="flex items-center gap-6">
                    <Link to="/" className="hidden md:block text-sm font-medium text-gray-500 hover:text-black transition-colors">Home</Link>
                    <Link 
                        to="https://chrome.google.com/webstore/detail/pfjfdnaopfaampmgaalfafhodcafbelm"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-bold hover:scale-105 active:scale-95 transition-all shadow-lg"
                    >
                        {pageData.hero.primaryCta}
                    </Link>
                </div>
            </nav>

            <main className="pt-32 pb-20">
                {/* 1. Hero Section */}
                <header className="max-w-[1200px] mx-auto px-6 lg:px-12 mb-24 text-center">
                    <div className="animate-reveal">
                        <span className="text-indigo-600 font-bold uppercase tracking-[0.2em] text-[10px] mb-6 block">
                            {pageData.hero.eyebrow}
                        </span>
                        <h1 
                            className="font-serif text-5xl lg:text-7xl mb-8 font-bold max-w-4xl mx-auto"
                            style={{ 
                                lineHeight: '1.15', 
                                letterSpacing: '0.02em',
                                fontFamily: '"Poltawski Nowy", serif'
                            }}
                        >
                            {pageData.hero.title}
                        </h1>
                        <p className="text-xl lg:text-2xl text-gray-600 font-light leading-relaxed mb-12 max-w-2xl mx-auto">
                            {pageData.hero.subtitle}
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-6 items-center justify-center">
                            <Link 
                                to="https://chrome.google.com/webstore/detail/pfjfdnaopfaampmgaalfafhodcafbelm"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-4 px-12 py-5 bg-black text-white rounded-full text-lg font-bold hover:bg-gray-800 transition-all shadow-2xl shadow-black/20 group active:scale-95"
                            >
                                {pageData.hero.primaryCta}
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </header>

                {/* 2. Emotional Problem Section */}
                <section className="bg-white py-24 border-y border-black/5">
                    <div className="max-w-[1000px] mx-auto px-6 lg:px-12 animate-reveal delay-100">
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            <div>
                                <h2 className="font-serif text-3xl lg:text-5xl font-bold mb-6">{pageData.problemSection.title}</h2>
                                <p className="text-xl text-gray-600 leading-relaxed mb-8">{pageData.problemSection.description}</p>
                            </div>
                            <div className="bg-red-50/50 p-8 rounded-3xl border border-red-100">
                                <ul className="space-y-4">
                                    {pageData.problemSection.items.map((item, idx) => (
                                        <li key={idx} className="flex items-start gap-4 text-gray-800 font-medium">
                                            <span className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-sm font-bold">✕</span>
                                            <span className="leading-relaxed">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. Product Transformation Section */}
                <section className="py-24 bg-[#0A0A0B] text-white overflow-hidden">
                    <div className="max-w-[1200px] mx-auto px-6 lg:px-12 animate-reveal delay-200">
                        <div className="text-center mb-16">
                            <h2 className="font-serif text-3xl lg:text-5xl font-bold mb-6">{pageData.transformationSection.title}</h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-8 items-stretch mb-16">
                            <article className="bg-white/5 p-8 lg:p-12 rounded-[2.5rem] border border-white/10 backdrop-blur-sm flex flex-col justify-center">
                                <span className="text-red-400 font-bold uppercase tracking-widest text-xs mb-6 block">Before</span>
                                <p className="text-gray-300 text-xl leading-relaxed font-light">{pageData.transformationSection.before}</p>
                            </article>
                            <article className="bg-indigo-900/20 p-8 lg:p-12 rounded-[2.5rem] border border-indigo-500/30 backdrop-blur-sm relative overflow-hidden flex flex-col justify-center">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
                                <span className="text-indigo-400 font-bold uppercase tracking-widest text-xs mb-6 block relative z-10">With StartlyTab</span>
                                <p className="text-white text-xl leading-relaxed font-medium relative z-10">{pageData.transformationSection.after}</p>
                            </article>
                        </div>
                        
                        {pageData.transformationSection.image && (
                            <div className="relative rounded-[2rem] lg:rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(99,102,241,0.15)] max-w-[1000px] mx-auto animate-reveal delay-300 group">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none"></div>
                                <img 
                                    src={pageData.transformationSection.image} 
                                    alt="StartlyTab Workspace Preview" 
                                    className="w-full h-auto object-cover transform hover:scale-[1.02] transition-transform duration-1000" 
                                    loading="lazy" 
                                />
                            </div>
                        )}
                    </div>
                </section>

                {/* 4. Feature Explanation Section */}
                <section className="py-24 max-w-[1000px] mx-auto px-6 lg:px-12">
                    <div className="text-center mb-16 animate-reveal">
                        <h2 className="font-serif text-3xl lg:text-5xl font-bold mb-6">How it Works</h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8 animate-reveal delay-100">
                        {pageData.features.map((feature, idx) => (
                            <article key={idx} className="bg-white p-10 rounded-[2rem] shadow-sm border border-black/5 hover:shadow-md transition-shadow">
                                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                                <p className="text-gray-600 leading-relaxed text-lg">{feature.description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                {/* 7. FAQ */}
                <section className="py-24 bg-white border-t border-black/5">
                    <div className="max-w-[800px] mx-auto px-6 lg:px-12 animate-reveal">
                        <h2 className="font-serif text-3xl lg:text-4xl mb-16 text-center font-bold">Frequently Asked Questions</h2>
                        <div className="space-y-12">
                            {pageData.faq.map((f, idx) => (
                                <article key={idx} className="group">
                                    <h3 className="text-xl font-bold mb-4 flex items-start gap-4 text-gray-900">
                                        <div className="mt-1 w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                                        </div>
                                        {f.question}
                                    </h3>
                                    <p className="text-gray-500 text-lg font-light leading-relaxed pl-10">
                                        {f.answer}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 8. Final CTA */}
                <section className="py-24 max-w-[1000px] mx-auto px-6 lg:px-12">
                    <div className="bg-indigo-50 rounded-[3rem] p-16 lg:p-20 text-center relative overflow-hidden animate-reveal border border-indigo-100">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-200/50 rounded-full blur-3xl mix-blend-multiply"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-200/50 rounded-full blur-3xl mix-blend-multiply"></div>
                        
                        <div className="relative z-10">
                            <h2 className="font-serif text-4xl lg:text-5xl mb-6 font-bold text-indigo-950">Ready to find your calm?</h2>
                            <p className="text-xl text-indigo-800/80 mb-10 max-w-xl mx-auto">Join thousands of others who have transformed their browser from a source of stress into a sanctuary.</p>
                            <Link 
                                to="https://chrome.google.com/webstore/detail/pfjfdnaopfaampmgaalfafhodcafbelm"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-4 px-12 py-5 bg-indigo-600 text-white rounded-full text-lg font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 group active:scale-95"
                            >
                                Add to Chrome - It's Free
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <SemanticFooter />

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes reveal {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-reveal {
                    animation: reveal 1s cubic-bezier(0.16, 1, 0.3, 1) both;
                }
                .delay-100 { animation-delay: 0.15s; }
                .delay-200 { animation-delay: 0.3s; }
            ` }} />
        </div>
    );
};

export default SeoLandingPage;
