import React from 'react';

const JumpStarLoading: React.FC<{ caption?: string; captionClassName?: string }> = ({
  caption = "Loading...",
  captionClassName = "text-white/40 text-[13px] tracking-wide font-medium mt-6"
}) => (
  <div className="flex flex-col items-center justify-center pointer-events-none">
    <div className="relative w-12 h-12">
      <svg className="w-12 h-12 animate-[spin_4s_linear_infinite]" viewBox="0 0 100 100">
        <path
          d="M50 0L52.5 40L92.5 42.5L55 60L65 97.5L50 72.5L35 97.5L45 60L7.5 42.5L47.5 40L50 0Z"
          className="fill-indigo-500/80 drop-shadow-[0_0_12px_rgba(99,102,241,0.6)] animate-pulse"
        />
        <path
          d="M50 15L51.5 45L81.5 46.5L53 58L60.5 86.5L50 67.5L39.5 86.5L47 58L18.5 46.5L48.5 45L50 15Z"
          className="fill-violet-400/90 drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]"
          style={{ transformOrigin: 'center', animation: 'spin 8s linear infinite reverse' }}
        />
        <circle cx="50" cy="50" r="4" className="fill-white drop-shadow-[0_0_10px_rgba(255,255,255,1)]" />
      </svg>
    </div>
    <div className={captionClassName}>
      {caption}
    </div>
  </div>
);

export default JumpStarLoading;
