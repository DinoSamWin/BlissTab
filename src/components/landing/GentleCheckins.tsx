import React, { useState, useEffect, useRef } from 'react';

interface Props {
  onRequireLogin?: () => void;
}

export default function GentleCheckins({ onRequireLogin }: Props) {
  const [smoothProgress, setSmoothProgress] = useState(0);
  const secRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId: number;
    let targetProgress = 0;
    let currentProgress = 0;

    const onScroll = () => {
      if (!secRef.current) return;
      const rect = secRef.current.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, -rect.top / (secRef.current.offsetHeight - window.innerHeight)));
      targetProgress = p;
    };

    const update = () => {
      currentProgress += (targetProgress - currentProgress) * 0.15;
      setSmoothProgress(currentProgress);
      rafId = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll);
    rafId = requestAnimationFrame(update);
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Frame visibility based on smoothProgress
  // 0.0 - 0.35: Frame 1
  // 0.35 - 0.75: Frame 2
  // 0.75 - 1.0: Frame 3
  const op1 = smoothProgress < 0.4 ? 1 : Math.max(0, 1 - (smoothProgress - 0.4) * 8);
  const op2 = smoothProgress > 0.3 && smoothProgress < 0.8 
    ? Math.min(1, Math.min((smoothProgress - 0.3) * 8, (0.8 - smoothProgress) * 8)) 
    : 0;
  const op3 = smoothProgress > 0.7 ? Math.min(1, (smoothProgress - 0.7) * 8) : 0;

  const isD = smoothProgress > 0.75;

  return (
    <section ref={secRef} id="checkins" className="relative w-full h-[300vh] overflow-visible">
      {/* Background */}
      <div className="sticky top-0 w-full h-screen flex flex-col items-center justify-between py-8 md:py-10 overflow-hidden z-10">
        <div 
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: 'url("/images/redesign/homepage-4-background.webp")',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
          aria-hidden="true"
        />

        {/* Header Text */}
        <div className={`relative w-full max-w-[1120px] px-6 lg:px-12 z-20 transition-all duration-700 ${isD ? 'text-left' : 'text-center'}`}>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 transition-all duration-500 ${isD ? 'ml-0' : 'mx-auto'}`} style={{ background: '#EFEFFE' }}>
            <img src="/images/redesign/star4.webp" alt="" className="w-4 h-4 object-contain" />
            <span className="text-base font-normal" style={{ color: '#8A44F3' }}>Gentle Check-ins</span>
          </div>
          
          <div className="relative">
            {/* Frame 1 & 2 Text */}
            <div className={`transition-all duration-700 ${isD ? 'opacity-0 scale-95 pointer-events-none absolute inset-x-0' : 'opacity-100 scale-100'}`}>
              <h2 className="font-semibold text-[#000000] mb-6" style={{ fontFamily: "'Poltawski Nowy',serif", fontSize: 'clamp(1.75rem,3.5vw,3.2rem)', lineHeight: '1.2' }}>
                A space that <span style={{ color: '#8A44F3' }}>quietly</span><br />understands how you feel
              </h2>
              <p className="max-w-2xl mx-auto text-[#545454] text-lg leading-relaxed">
                You don't have to track anything. But when you do,{' '}
                <span style={{ color: '#8A44F3' }}>it helps you notice patterns you might have missed.</span>
              </p>
            </div>
            {/* Frame 3 Text */}
            <div className={`transition-all duration-700 ${isD ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-105 translate-y-8 pointer-events-none absolute inset-x-0'}`}>
              <h2 className="font-semibold text-[#000000] mb-4" style={{ fontFamily: "'Poltawski Nowy',serif", fontSize: 'clamp(1.105rem, 2.21vw, 2.02rem)', lineHeight: '1.2' }}>
                Not to analyze you.<br />
                Just to help you <span style={{ color: '#8A44F3' }}>understand<br />yourself a little better.</span>
              </h2>
            </div>
          </div>
        </div>

        {/* Central Visualization Area */}
        <div className="relative w-full max-w-[820px] px-4 z-10">
          <div className="relative w-full" style={{ aspectRatio: '2.5/1' }}>
            
            {/* Frame 1: Picker */}
            <div className="absolute inset-0 transition-opacity duration-300" style={{ opacity: op1 }}>
              <div className="w-full h-full relative">
                <img 
                  src="/images/redesign/homepage-4-pic-1.webp" 
                  alt="check-in" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Frame 2: Reflection */}
            <div className="absolute inset-0 transition-opacity duration-300" style={{ opacity: op2 }}>
              <div className="w-full h-full bg-white rounded-[1.5rem] shadow-xl border border-gray-100/50 p-6 md:p-8 flex flex-col overflow-hidden">
                <div className="mb-4 flex-shrink-0">
                  <div className="flex items-center gap-2 text-[#8A44F3] font-bold text-xs uppercase tracking-wider mb-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 18h2a2 2 0 0 1 2 2 2 2 0 0 0 2 2h2" /><path d="M2 12h2a2 2 0 0 1 2 2 2 2 0 0 0 2 2h2" /><path d="M2 6h2a2 2 0 0 1 2 2 2 2 0 0 0 2 2h2" />
                    </svg>
                    Reflection
                  </div>
                  <h3 className="text-[#070707] text-base md:text-xl font-bold leading-tight max-w-sm">
                    You rebound quickly, showing <span className="text-[#8A44F3]">a pattern of recovery</span> rather than staying low.
                  </h3>
                </div>
                <div className="flex-1 min-h-0 w-full flex items-center justify-center">
                  <img 
                    src="/images/redesign/homepage-4-mood-reflection-chart.webp" 
                    alt="chart" 
                    className="max-w-full max-h-full object-contain" 
                    style={{ transform: 'scale(1.3)' }} 
                  />
                </div>
              </div>
            </div>

            {/* Frame 3: Deep Care Report */}
            <div className="absolute inset-0 transition-all duration-700" style={{ opacity: op3, transform: isD ? 'translateX(0)' : 'translateX(40px)' }}>
              <div style={{ transform: 'scale(1.75) translateX(28.4px) translateY(-43px)', width: '100%', height: '100%' }}>
                <img 
                  src="/images/redesign/homepage-4-deep-care-report.webp" 
                  alt="report" 
                  className="w-full h-full object-contain" 
                />
              </div>
            </div>

          </div>
        </div>

        {/* Footer Button Section */}
        <div className="relative w-full max-w-[1120px] px-6 lg:px-12 z-20 pb-4 flex flex-col items-center text-center">
          <button 
            onClick={onRequireLogin}
            className="px-8 py-4 bg-[#8A44F3] text-white rounded-full font-bold text-lg shadow-lg hover:bg-[#7A34E3] transition-all transform hover:scale-105 active:scale-95"
          >
            Log in to try it →
          </button>
          <p className={`mt-6 text-sm text-[#8E8E8E] italic transition-all duration-500 ${isD ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {smoothProgress < 0.4 
              ? "*You don't have to reflect every day. But sometimes, a small check-in is enough to notice something you've been carrying."
              : "*Over time, small moments turn into patterns."
            }
          </p>
        </div>
      </div>
    </section>
  );
}
