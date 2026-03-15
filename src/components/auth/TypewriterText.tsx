import React, { useState, useEffect } from 'react';

interface LangContent {
  title: string;
  subtitle: string;
}

interface TypewriterTextProps {
  contents: LangContent[];
  displayDuration?: number; // ms
  typingSpeed?: number; // ms per char
  deletingSpeed?: number; // ms per char
}

const TypewriterText: React.FC<TypewriterTextProps> = ({
  contents,
  displayDuration = 3000,
  typingSpeed = 80,
  deletingSpeed = 40,
}) => {
  const [index, setIndex] = useState(0);
  const [titleText, setTitleText] = useState(contents[0].title);
  const [subtitleText, setSubtitleText] = useState(contents[0].subtitle);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isWaiting, setIsWaiting] = useState(true);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const currentContent = contents[index];
    const nextIndex = (index + 1) % contents.length;

    if (isWaiting) {
      // Waiting state: show full text for displayDuration
      timeoutId = setTimeout(() => {
        setIsWaiting(false);
        setIsDeleting(true);
      }, displayDuration);
    } else if (isDeleting) {
      // Deleting state
      if (titleText.length > 0 || subtitleText.length > 0) {
        timeoutId = setTimeout(() => {
          // Delete subtitle first, then title (or simultaneously? User said "做一个输入中的文字回删的特效", usually they go together or subtitle first)
          // Let's do subtitle first, then title
          if (subtitleText.length > 0) {
            setSubtitleText(prev => prev.slice(0, -1));
          } else if (titleText.length > 0) {
            setTitleText(prev => prev.slice(0, -1));
          }
        }, deletingSpeed);
      } else {
        // Finished deleting
        setIsDeleting(false);
        setIndex(nextIndex);
      }
    } else {
      // Typing state
      const targetContent = contents[index];
      if (titleText.length < targetContent.title.length || subtitleText.length < targetContent.subtitle.length) {
        timeoutId = setTimeout(() => {
          // Type title first, then subtitle
          if (titleText.length < targetContent.title.length) {
            setTitleText(targetContent.title.slice(0, titleText.length + 1));
          } else if (subtitleText.length < targetContent.subtitle.length) {
            setSubtitleText(targetContent.subtitle.slice(0, subtitleText.length + 1));
          }
        }, typingSpeed);
      } else {
        // Finished typing
        setIsWaiting(true);
      }
    }

    return () => clearTimeout(timeoutId);
  }, [index, titleText, subtitleText, isDeleting, isWaiting, contents, displayDuration, typingSpeed, deletingSpeed]);

  return (
    <div className="text-center min-h-[100px] flex flex-col justify-center mb-2">
      <h1 className="auth-title min-h-[32px]">
        {titleText}
        {((!isWaiting && !isDeleting && titleText.length < contents[index].title.length) || 
          (isDeleting && subtitleText.length === 0 && titleText.length > 0)) && 
          <span className="typewriter-cursor" />}
      </h1>
      <p className="auth-subtitle min-h-[20px] !mb-8">
        {subtitleText}
        {(isWaiting || 
          (!isWaiting && !isDeleting && titleText.length === contents[index].title.length) || 
          (isDeleting && subtitleText.length > 0)) && 
          <span className="typewriter-cursor" />}
      </p>
    </div>
  );
};

export default TypewriterText;
