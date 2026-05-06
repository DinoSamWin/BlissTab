import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { STORIES } from '../data/stories';
import SemanticFooter from '../components/SemanticFooter';
import { ArrowRight, CheckCircle2, Plus, Compass, Coffee, List, Search, Moon, Zap, User } from 'lucide-react';

interface PersonaPreviewProps {
    personaId: string;
}

const PersonaPreview: React.FC<PersonaPreviewProps> = ({ personaId }) => {
    if (personaId === 'maya') {
        return (
            <div className="my-24 animate-reveal">
                <div className="text-center mb-12">
                    <span className="text-indigo-600 font-bold uppercase tracking-[0.2em] text-[10px] mb-4 block">Transformation Preview</span>
                    <h2 className="font-serif text-3xl lg:text-4xl font-bold mb-4">Maya's New Beginning</h2>
                    <p className="text-gray-500 font-light max-w-xl mx-auto">This is how Maya's browser looks now. No tool walls, just a space to breathe before jumping into her next marketing campaign.</p>
                </div>
                <div className="flex justify-center">
                    <img 
                        src="/images/redesign/maya sample.png" 
                        alt="Maya's StartlyTab" 
                        className="max-w-full h-auto"
                    />
                </div>
            </div>
        );
    }

    if (personaId === 'daniel') {
        return (
            <div className="my-40 animate-reveal">
                <div className="text-center mb-16 px-6">
                    <span className="text-indigo-600 font-bold uppercase tracking-[0.2em] text-[10px] mb-4 block">Resilience Tools</span>
                    <h2 className="font-serif text-3xl lg:text-4xl font-bold mb-4 text-[#1A1A1A]">Daniel's Space to Reset</h2>
                    <p className="text-gray-500 font-light max-w-2xl mx-auto text-lg leading-relaxed">
                        StartlyTab gives Daniel a place to express what he actually feels, turning workplace frustration into self-awareness.
                    </p>
                </div>

                {/* Horizontal Carousel with Peeking Effect - Smaller size for better visibility */}
                <div className="relative w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-12">
                    <div className="flex gap-8 px-[15%] min-w-max">
                        <div className="snap-center w-[70vw] md:w-[640px] flex-shrink-0">
                            <img 
                                src="/images/redesign/Daniel Sample 1.png" 
                                alt="Daniel's Emotional Buffer" 
                                className="w-full h-auto"
                            />
                        </div>
                        <div className="snap-center w-[70vw] md:w-[640px] flex-shrink-0">
                            <img 
                                src="/images/redesign/Daniel Sample 2.png" 
                                alt="Daniel's Mood Tracking" 
                                className="w-full h-auto"
                            />
                        </div>
                    </div>
                </div>
                
                {/* Scroll Indicator */}
                <div className="flex justify-center gap-2 mt-4">
                    <div className="w-8 h-1 bg-[#22C55E] rounded-full" />
                    <div className="w-2 h-1 bg-gray-200 rounded-full" />
                </div>
            </div>
        );
    }

    if (personaId === 'rachel') {
        return (
            <div className="my-24 animate-reveal">
                <div className="text-center mb-12">
                    <span className="text-indigo-600 font-bold uppercase tracking-[0.2em] text-[10px] mb-4 block">Soft Start Tool</span>
                    <h2 className="font-serif text-3xl lg:text-4xl font-bold mb-4">A Gentle Morning for Rachel</h2>
                    <p className="text-gray-500 font-light max-w-xl mx-auto">StartlyTab gives Rachel permission to slow down, removing the guilt of "not being ready" and allowing her to arrive at her own pace.</p>
                </div>
                <div className="flex justify-center">
                    <img 
                        src="/images/redesign/Rachel Sample.png" 
                        alt="Rachel's StartlyTab" 
                        className="max-w-full h-auto"
                    />
                </div>
            </div>
        );
    }

    if (personaId === 'lena') {
        return (
            <div className="my-24 animate-reveal">
                <div className="text-center mb-12">
                    <span className="text-indigo-600 font-bold uppercase tracking-[0.2em] text-[10px] mb-4 block">Focus Restoration Tool</span>
                    <h2 className="font-serif text-3xl lg:text-4xl font-bold mb-4">Lena's Moment of Clarity</h2>
                    <p className="text-gray-500 font-light max-w-xl mx-auto">In a fragmented day, StartlyTab acts as a circuit breaker — interrupting the interruptions to give Lena the pause she actually needs.</p>
                </div>
                <div className="flex justify-center">
                    <img 
                        src="/images/redesign/Lena Sample.png" 
                        alt="Lena's StartlyTab" 
                        className="max-w-full h-auto"
                    />
                </div>
            </div>
        );
    }

    return null;
};








const StoryPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const story = STORIES.find(s => s.slug === slug);
    const [activeSection, setActiveSection] = useState<string>('');

    useEffect(() => {
        window.scrollTo(0, 0);
        
        if (story) {
            document.title = story.seo.title;
            
            // Meta tags
            let metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.setAttribute('name', 'description');
                document.head.appendChild(metaDesc);
            }
            metaDesc.setAttribute('content', story.seo.description);

            // JSON-LD
            const scriptId = 'story-json-ld';
            let script = document.getElementById(scriptId) as HTMLScriptElement;
            if (!script) {
                script = document.createElement('script');
                script.id = scriptId;
                script.type = 'application/ld+json';
                document.head.appendChild(script);
            }
            script.text = JSON.stringify([
                {
                    "@context": "https://schema.org",
                    "@type": "Article",
                    "headline": story.title,
                    "description": story.seo.description,
                    "author": { "@type": "Organization", "name": "StartlyTab" },
                    "publisher": { "@type": "Organization", "name": "StartlyTab" },
                    "mainEntityOfPage": { "@type": "WebPage", "@id": window.location.href }
                },
                {
                    "@context": "https://schema.org",
                    "@type": "FAQPage",
                    "mainEntity": story.faq.map(f => ({
                        "@type": "Question",
                        "name": f.question,
                        "acceptedAnswer": { "@type": "Answer", "text": f.answer }
                    }))
                }
            ]);
        }

        const handleScroll = () => {
            const sections = document.querySelectorAll('section[id]');
            let currentActive = '';
            sections.forEach(section => {
                const rect = section.getBoundingClientRect();
                if (rect.top <= 150) {
                    currentActive = section.id;
                }
            });
            setActiveSection(currentActive);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [slug, story]);

    if (!story) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center">
                    <h1 className="text-4xl font-serif mb-4">Story not found</h1>
                    <Link to="/" className="text-blue-600 hover:underline">Return to Home</Link>
                </div>
            </div>
        );
    }

    const otherStories = STORIES.filter(s => s.id !== story.id);
    
    const toc = story.sections.filter(s => s.title).map(s => {
        let displayTitle = s.title!;
        if (displayTitle.includes(':')) displayTitle = displayTitle.split(':')[1].trim();
        if (displayTitle.length > 25) displayTitle = displayTitle.substring(0, 22) + '...';
        
        return {
            title: displayTitle,
            fullTitle: s.title!,
            id: s.title!.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
        };
    });

    const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            const offset = 120;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = element.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="min-h-screen bg-[#FBFBFE] text-[#1A1A1A] selection:bg-indigo-100 selection:text-indigo-900">
            {/* Navigation Bar */}
            <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-black/5 px-6 py-4 flex justify-between items-center">
                <Link to="/" className="flex items-center gap-3 group">
                   <img src="/icons/icon-64x64.png" alt="Logo" className="w-8 h-8 rounded-lg group-hover:rotate-6 transition-transform" />
                   <span className="logo-text text-2xl tracking-tight text-gray-900">StartlyTab</span>
                </Link>
                <div className="flex items-center gap-6">
                    <Link to="/" className="hidden md:block text-sm font-medium text-gray-500 hover:text-black transition-colors">Learn More</Link>
                    <Link 
                        to={story.ctaPrimary.link}
                        className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-bold hover:scale-105 active:scale-95 transition-all shadow-lg"
                    >
                        Install Free
                    </Link>
                </div>
            </nav>

            <article className="pt-24 pb-20">
                {/* Hero Section */}
                <header className="max-w-[1200px] mx-auto px-6 lg:px-12 mb-24">
                    <div className="grid lg:grid-cols-12 gap-16 items-center">
                        <div className="lg:col-span-7 animate-reveal">
                            <h1 
                                className="font-serif text-5xl lg:text-7xl mb-10 font-bold"
                                style={{ 
                                    lineHeight: '1.25', 
                                    letterSpacing: '0.02em',
                                    fontFamily: '"Poltawski Nowy", serif'
                                }}
                            >
                                {story.title}
                            </h1>
                            <p className="text-xl lg:text-2xl text-gray-600 font-light leading-relaxed mb-12 max-w-xl">
                                {story.subtitle}
                            </p>
                            
                            <div className="flex flex-col sm:flex-row gap-6 items-center">
                                <Link 
                                    to={story.ctaPrimary.link}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-4 px-12 py-5 bg-black text-white rounded-full text-lg font-bold hover:bg-gray-800 transition-all shadow-2xl shadow-black/20 group active:scale-95"
                                >
                                    Create Your Calm New Tab
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>
                        
                        <div className="lg:col-span-5 animate-reveal delay-100">
                            <div className="relative group">
                                <div className="absolute -inset-6 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-[4rem] blur-2xl opacity-70" />
                                <div className="relative aspect-[3.5/4.5] rounded-[3.5rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)]">
                                    <img 
                                        src={story.image} 
                                        alt={story.title} 
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                                    <div className="absolute bottom-12 left-12 right-12 text-white">
                                        <div className="text-4xl font-serif mb-2">{story.id.charAt(0).toUpperCase() + story.id.slice(1)}</div>
                                        <div className="text-indigo-300 font-bold tracking-[0.2em] uppercase text-[10px]">{story.role}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="max-w-[1300px] mx-auto px-6 lg:px-12 grid lg:grid-cols-12 gap-20">
                    {/* Sidebar Navigation */}
                    <aside className="hidden lg:block lg:col-span-4 sticky top-32 h-fit">
                        <div className="bg-white/50 backdrop-blur-sm border border-black/5 p-10 rounded-[2.5rem] shadow-sm">
                            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-8">
                                <List className="w-4 h-4" />
                                On this page
                            </h4>
                            <ul className="space-y-5">
                                {toc.map((item) => (
                                    <li key={item.id}>
                                        <a 
                                            href={`#${item.id}`}
                                            onClick={(e) => handleAnchorClick(e, item.id)}
                                            className={`block text-sm leading-relaxed transition-all duration-300 ${
                                                activeSection === item.id 
                                                ? 'text-indigo-600 font-bold translate-x-2' 
                                                : 'text-gray-500 hover:text-black hover:translate-x-1'
                                            }`}
                                        >
                                            {item.title}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                            
                            <div className="mt-12 pt-10 border-t border-black/5">
                                <div className="p-6 bg-indigo-50 rounded-3xl">
                                    <p className="text-sm text-indigo-700 font-medium leading-relaxed mb-6">
                                        Join 10k+ focused people using StartlyTab today.
                                    </p>
                                    <Link 
                                        to={story.ctaPrimary.link}
                                        className="inline-flex items-center gap-2 text-sm font-bold text-indigo-900 group"
                                    >
                                        Try for free
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content Sections */}
                    <div id="story-content" className="lg:col-span-8 space-y-32">
                        {/* Hook Badge */}
                        <div className="animate-reveal mb-[-40px]">
                            <div className="inline-flex items-center gap-4 px-6 py-3 bg-amber-50 text-amber-800 rounded-2xl text-base font-medium border border-amber-200/50 shadow-sm leading-relaxed max-w-2xl">
                                <span className="flex h-3 w-3 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                                {story.hook}
                            </div>
                        </div>

                        {story.sections.map((section, idx) => {
                            const sectionId = section.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') || '';
                            
                            return (
                                <section key={idx} id={sectionId} className="animate-reveal scroll-mt-32">
                                    {section.title && (
                                        <h2 
                                            className="font-serif text-3xl lg:text-4xl mb-12 leading-tight font-bold border-b border-black/5 pb-8"
                                            style={{ fontFamily: '"Poltawski Nowy", serif' }}
                                        >
                                            {section.title}
                                        </h2>
                                    )}

                                    {section.type === 'text' && (
                                        <div className="space-y-8 text-lg lg:text-xl text-gray-700 leading-[1.8] font-light">
                                            {(section.content as string[]).map((p, pIdx) => (
                                                <p key={pIdx} dangerouslySetInnerHTML={{ __html: p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                            ))}
                                        </div>
                                    )}

                                    {section.type === 'interview' && (
                                        <div className="space-y-16">
                                            {(section.content as any[]).map((item, iIdx) => (
                                                <div key={iIdx} className="space-y-8">
                                                    {/* Question (Interviewer) */}
                                                    <div className="flex gap-4 lg:gap-6 group">
                                                        <div className="flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 group-hover:scale-110 transition-transform">
                                                            <img src={story.interviewer.avatar} alt="Interviewer" className="w-6 h-6 lg:w-8 lg:h-8 object-contain opacity-80" />
                                                        </div>
                                                        <div className="flex-1 pt-1">
                                                            <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2">StartlyTab</div>
                                                            <h3 className="text-xl lg:text-2xl font-serif font-medium text-gray-800 leading-snug">
                                                                {item.question}
                                                            </h3>
                                                        </div>
                                                    </div>

                                                    {/* Answer (Maya) */}
                                                    <div className="flex gap-4 lg:gap-6">
                                                        <div className="flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 rounded-2xl overflow-hidden border border-black/5">
                                                            <img src={story.avatar} alt={story.id} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="flex-1 pt-1 bg-white/40 p-6 lg:p-8 rounded-[2rem] border border-black/5 shadow-sm">
                                                            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">{story.id}</div>
                                                            <div className="space-y-6 text-lg lg:text-xl text-gray-700 leading-[1.8] font-light">
                                                                {Array.isArray(item.answer) ? (
                                                                    item.answer.map((ans, aIdx) => (
                                                                        <p key={aIdx}>{ans}</p>
                                                                    ))
                                                                ) : (
                                                                    <p>{item.answer}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Transformation Preview - Persona Specific */}
                                    {idx === 1 && <PersonaPreview personaId={story.id} />}

                                    {section.type === 'feature-grid' && (
                                        <div className="bg-white rounded-[3.5rem] p-10 lg:p-24 text-[#1A1D21] relative overflow-hidden my-24 group/grid border border-black/5">
                                            {/* Decorative Elements - Asymmetrical Green Fluid Shape */}
                                            <div className="absolute top-0 right-0 w-full h-full opacity-[0.03] pointer-events-none">
                                                <svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                                    <path fill="#22C55E" d="M845,644Q755,788,598.5,845Q442,902,305,820.5Q168,739,122,593.5Q76,448,154,302Q232,156,413.5,108Q595,60,765,153.5Q935,247,845,644Z" />
                                                </svg>
                                            </div>

                                            <div className="relative z-10">
                                                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
                                                    <div className="max-w-xl">
                                                        <div className="flex items-center gap-4 mb-4">
                                                            <div className="w-12 h-2 bg-[#22C55E]" />
                                                            <span className="font-bold tracking-[0.3em] uppercase text-sm text-[#22C55E]">Our System</span>
                                                        </div>
                                                        <h2 className="text-5xl lg:text-7xl font-black tracking-tighter mb-6 leading-[0.9]">
                                                            The Calm <br/> Performance
                                                        </h2>
                                                        <p className="text-gray-500 font-medium text-lg leading-relaxed">
                                                            Engineered for those who demand clarity. StartlyTab isn't just a tool; it's your mental training ground.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-5 max-w-5xl mx-auto">
                                                    {section.features?.map((feature, fIdx) => (
                                                        <div key={fIdx} className="group/card bg-[#1A1D21] rounded-[1.5rem] overflow-hidden shadow-lg hover:scale-[1.01] transition-all duration-500 flex flex-col md:flex-row items-stretch min-h-[140px]">
                                                            <div className="p-6 lg:p-8 flex-1 relative overflow-hidden flex flex-col justify-center">
                                                                <div className="relative z-10">
                                                                    <div className="flex items-center gap-4 mb-2">
                                                                        <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 group-hover/card:border-[#22C55E]/50 transition-colors flex-shrink-0">
                                                                            {fIdx === 0 && <Plus className="w-5 h-5 text-[#22C55E]" />}
                                                                            {fIdx === 1 && <Compass className="w-5 h-5 text-[#22C55E]" />}
                                                                            {fIdx === 2 && <Coffee className="w-5 h-5 text-[#22C55E]" />}
                                                                        </div>
                                                                        <h3 className="text-xl lg:text-2xl font-black text-white tracking-tighter leading-none">
                                                                            {feature.title.split('\n')[0].trim()}
                                                                        </h3>
                                                                    </div>
                                                                    <p className="text-gray-400 font-medium text-sm lg:text-base leading-relaxed max-w-2xl">
                                                                        {feature.description.split('\n')[0].trim()}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            
                                                            <Link 
                                                                to={story.ctaPrimary.link}
                                                                className="bg-[#22C55E] px-6 py-4 md:w-40 flex flex-row md:flex-col items-center justify-center text-white font-bold uppercase tracking-[0.2em] text-[9px] group-hover/card:bg-[#16A34A] transition-colors gap-3"
                                                            >
                                                                <span className="whitespace-nowrap">Try Now</span>
                                                                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                                                                    <ArrowRight className="w-4 h-4" />
                                                                </div>
                                                            </Link>
                                                        </div>
                                                    ))}
                                                </div>





                                                <div className="mt-24 pt-12 border-t border-black/5 flex flex-col md:flex-row items-center justify-between gap-8">
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center font-bold text-xl overflow-hidden border border-black/5">
                                                            <img src={story.avatar} alt="User" className="w-full h-full object-cover" />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-black uppercase tracking-wider">Join {story.name}</div>
                                                            <div className="text-gray-400 text-sm font-medium uppercase tracking-widest">Performance Track</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-[#22C55E] font-black italic text-4xl tracking-tighter opacity-10">
                                                        STARTLYTAB.PRO
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}



                                </section>
                            );
                        })}

                        {/* FAQ Section */}
                        <section className="bg-white rounded-[3rem] p-12 lg:p-20 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.05)] border border-black/5 animate-reveal">
                            <div className="max-w-2xl mx-auto">
                                <h2 className="font-serif text-3xl lg:text-4xl mb-16 text-center font-bold">Frequently Asked Questions</h2>
                                <div className="space-y-12">
                                    {story.faq.map((f, fIdx) => (
                                        <div key={fIdx} className="group">
                                            <h3 className="text-xl font-bold mb-4 flex items-start gap-4 text-gray-900">
                                                <div className="mt-1 w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                                    <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                                                </div>
                                                {f.question}
                                            </h3>
                                            <p className="text-gray-500 text-lg font-light leading-relaxed pl-10">
                                                {f.answer}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                <footer className="mt-40 mb-20 max-w-[1200px] mx-auto px-6">
                    <div className="bg-[#0A0A0B] rounded-[4rem] p-16 lg:p-24 text-white shadow-3xl relative overflow-hidden animate-reveal text-center group/footer">
                        {/* Texture overlay */}
                        <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay" />
                        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
                        
                        <div className="relative z-10">
                            <h2 
                                className="font-serif text-4xl lg:text-6xl mb-10 tracking-wide font-bold"
                                style={{ lineHeight: '1.25' }}
                            >
                                Your browser doesn't have <br className="hidden md:block" /> to feel this heavy.
                            </h2>
                            <p className="text-xl lg:text-2xl text-gray-400 font-light mb-16 max-w-2xl mx-auto leading-relaxed">
                                Join Maya and thousands of others who turned their tab chaos into a breathing space.
                            </p>
                            <div className="flex flex-col items-center gap-8">
                                <Link 
                                    to={story.ctaPrimary.link}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-4 px-12 py-6 bg-white text-black rounded-full text-xl font-bold hover:bg-gray-100 transition-all shadow-[0_25px_60px_rgba(255,255,255,0.08)] group active:scale-95"
                                >
                                    Create Your Calm New Tab
                                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                                </Link>
                                <Link 
                                    to="/"
                                    className="text-gray-400 hover:text-white transition-colors font-bold uppercase tracking-[0.2em] text-[10px] border-b border-gray-800 pb-1"
                                >
                                    Learn More About Us
                                </Link>
                            </div>
                        </div>
                    </div>

                    {otherStories.length > 0 && (
                        <div className="mt-40 animate-reveal">
                            <div className="flex justify-between items-end mb-16">
                                <div>
                                    <h4 className="text-indigo-600 font-bold uppercase tracking-[0.2em] text-xs mb-4">Read Next</h4>
                                    <h2 className="font-serif text-4xl leading-tight font-bold">More Stories Like This</h2>
                                </div>
                            </div>
                            
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                                {otherStories.map((s) => (
                                    <Link key={s.id} to={`/stories/${s.slug}`} className="group block">
                                        <div className="aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-lg mb-8 relative">
                                            <img 
                                                src={s.image} 
                                                alt={s.title} 
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                                            />
                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                        </div>
                                        <h3 className="text-2xl font-serif font-bold group-hover:text-indigo-600 transition-colors mb-4 leading-snug">
                                            {s.title}
                                        </h3>
                                        <p className="text-gray-500 line-clamp-2 font-light leading-relaxed">
                                            {s.subtitle}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </footer>
            </article>

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
                
                html {
                    scroll-behavior: smooth;
                }
                
                .serif {
                    font-family: 'Poltawski Nowy', serif;
                }
                
                .logo-text {
                    font-family: 'Zain', sans-serif;
                }
            ` }} />
        </div>
    );
};

export default StoryPage;
