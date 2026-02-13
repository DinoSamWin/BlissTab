import React from 'react';

const SocialProof: React.FC = () => {
    const avatars = [
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120&h=120&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=120&h=120&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=120&h=120&auto=format&fit=crop"
    ];

    return (
        <div className="mt-12 flex items-center gap-4 animate-reveal" style={{ animationDelay: '0.6s' }}>
            <div className="flex -space-x-3.5">
                {avatars.map((url, i) => (
                    <div
                        key={i}
                        className="w-12 h-12 rounded-full border-[3px] border-[#FBFBFE] dark:border-[#121214] overflow-hidden bg-[#EDF1F5] dark:bg-gray-800 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:-translate-y-1 shadow-sm"
                        style={{ zIndex: 4 - i }}
                    >
                        <img
                            src={url}
                            alt="User"
                            className="w-full h-full object-cover grayscale-[0.2] contrast-[1.1]"
                        />
                    </div>
                ))}
            </div>
            <p className="text-[20px] text-slate-400/80 dark:text-slate-500/80 font-normal tracking-tight flex items-center h-12" style={{ fontFamily: "'Inter', sans-serif" }}>
                Joined by 2,000+ mindful workers
            </p>
        </div>
    );
};

export default SocialProof;
