import React, { useState, useEffect, useRef } from 'react';
import { streamPrivateChat } from '../services/geminiService';
import { X, Send, Sparkles, Shield, User, Bot, Clock } from 'lucide-react';

interface PrivateSpaceChatProps {
  initialContext: string;
  language: string;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
}

export const PrivateSpaceChat: React.FC<PrivateSpaceChatProps> = ({ initialContext, language, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(true);
  const [isShattering, setIsShattering] = useState(false);
  const [shatterComplete, setShatterComplete] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const isCN = language === 'Chinese (Simplified)';

  const warningText = isCN
    ? "消息会发送给当前配置的 AI 服务商生成回复，但不会在你关闭窗口后继续保存在本地。"
    : "Messages are sent to the configured AI provider to generate replies, but they are not kept in local storage after you close this window.";

  const destroyedText = isCN
    ? "当前窗口中的本地对话已清除"
    : "The local conversation in this window has been cleared.";

  const inputPlaceholder = isCN ? "想说什么都可以..." : "Say anything...";

  useEffect(() => {
    // Initial greeting generation
    const systemPrompt = isCN
      ? `你现在处于一个绝对安全的“私密树洞”模式。用户正在发泄情绪或倾诉。
请你以一个极度共情、温和、不带有任何批判性、不讲大道理的倾听者身份进行回复。
除了绝对禁止谈论政治和宣扬暴力之外，没有任何限制。
刚才用户面对这段话产生了情绪："${initialContext}"
请用一句简短、温柔、包容的问候引导他们说出心里的想法。`
      : `You are now in an absolutely safe "Private Venting Space". The user is venting emotions.
Act as an extremely empathetic, gentle, non-judgmental listener. Do not preach or give unsolicited advice.
There are NO restrictions, except you MUST NOT discuss politics or promote violence.
The user just reacted to this quote: "${initialContext}"
Generate a short, gentle, and welcoming greeting to invite them to speak their mind.`;

    const initialMessages: Message[] = [
      { role: 'system', content: systemPrompt }
    ];

    setMessages([...initialMessages, { role: 'assistant', content: '', isStreaming: true }]);

    streamPrivateChat(initialMessages, (chunk) => {
      setMessages(prev => {
        const newMsgs = [...prev];
        const last = newMsgs[newMsgs.length - 1];
        if (last.role === 'assistant') {
          last.content = chunk;
        }
        return newMsgs;
      });
    }).then(() => {
      setMessages(prev => {
        const newMsgs = [...prev];
        const last = newMsgs[newMsgs.length - 1];
        if (last.role === 'assistant') last.isStreaming = false;
        return newMsgs;
      });
      setIsGenerating(false);
    }).catch(err => {
      console.error(err);
      setIsGenerating(false);
    });
  }, [initialContext, isCN]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMsg = input.trim();
    setInput('');
    setIsGenerating(true);

    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages([...newMessages, { role: 'assistant', content: '', isStreaming: true }]);

    try {
      await streamPrivateChat(newMessages, (chunk) => {
        setMessages(prev => {
          const msgs = [...prev];
          const last = msgs[msgs.length - 1];
          if (last.role === 'assistant') {
            last.content = chunk;
          }
          return msgs;
        });
      });
    } catch (e) {
      console.error(e);
    } finally {
      setMessages(prev => {
        const msgs = [...prev];
        const last = msgs[msgs.length - 1];
        if (last.role === 'assistant') last.isStreaming = false;
        return msgs;
      });
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setIsShattering(true);

    // Create particle DOM elements manually for the explosion effect
    if (chatContainerRef.current) {
      const rect = chatContainerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      for (let i = 0; i < 80; i++) {
        const particle = document.createElement('div');
        // Adjusted particles for light theme - using more vibrant/diverse colors
        const colors = ['bg-purple-400/60', 'bg-blue-400/60', 'bg-pink-400/60', 'bg-white/80'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        particle.className = `absolute rounded-full ${color} pointer-events-none`;
        
        const size = Math.random() * 8 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${centerX}px`;
        particle.style.top = `${centerY}px`;

        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 300 + 100;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;

        particle.animate([
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
          { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`, opacity: 0 }
        ], {
          duration: 800 + Math.random() * 600,
          easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
          fill: 'forwards'
        });

        chatContainerRef.current.appendChild(particle);
      }
    }

    setTimeout(() => {
      setShatterComplete(true);
      setTimeout(() => {
        onClose();
      }, 2500);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#F0F2F5]/95 backdrop-blur-xl transition-all duration-500">
      <div
        ref={chatContainerRef}
        className={`relative w-full max-w-2xl h-[90vh] flex flex-col bg-[#F0F2F5] shadow-2xl rounded-3xl overflow-hidden transition-all duration-1000 ${isShattering ? 'scale-105 opacity-0 blur-2xl' : 'scale-100 opacity-100 blur-0'}`}
      >
        {/* Header - Modern Telegram Style */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Private Venting Space</h2>
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-green-500 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                AI Session
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-full text-[10px] text-amber-700">
              <Sparkles size={12} />
              {warningText}
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Chat Area - Telegram Bubble Style */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-[#F0F2F5]">
          {messages.filter(m => m.role !== 'system').map((msg, idx) => (
            <div key={idx} className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm ${
                msg.role === 'user' ? 'bg-indigo-500' : 'bg-white border border-gray-100 text-purple-600'
              }`}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>

              <div className={`flex flex-col max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {/* Sender Name */}
                <span className="text-[11px] font-bold text-gray-400 mb-1 px-1">
                  {msg.role === 'user' ? 'You' : 'Focus AI'}
                </span>
                
                {/* Message Bubble */}
                <div
                  className={`relative px-4 py-2.5 shadow-sm text-[14px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#7B86F9] text-white rounded-2xl rounded-tr-none'
                      : 'bg-white text-gray-800 rounded-2xl rounded-tl-none border border-gray-50'
                  }`}
                >
                  {msg.content}
                  {msg.isStreaming && <span className="inline-block w-1.5 h-4 ml-1 bg-current opacity-30 animate-pulse align-middle" />}
                  
                  {/* Timestamp/Status Sim - Telegram style */}
                  <div className={`mt-1 flex items-center justify-end gap-1 text-[9px] opacity-60 ${
                    msg.role === 'user' ? 'text-white' : 'text-gray-400'
                  }`}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.role === 'user' && <Clock size={8} />}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Clean Pill Style */}
        <div className="p-4 bg-white border-t border-gray-100">
          <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-2xl p-1 focus-within:bg-white focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={inputPlaceholder}
              disabled={isGenerating}
              className="flex-1 bg-transparent text-gray-800 px-4 py-3 outline-none placeholder-gray-400 text-sm"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isGenerating}
              className={`p-3 rounded-xl transition-all ${
                !input.trim() || isGenerating 
                ? 'text-gray-300' 
                : 'text-white bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-200'
              }`}
            >
              <Send size={18} />
            </button>
          </div>
          <div className="mt-2 text-center text-[10px] text-gray-400 flex items-center justify-center gap-1">
            <Shield size={10} />
            Encrypted conversation • Auto-destructs on close
          </div>
        </div>
      </div>

      {/* Destroyed Message Overlay - Reimagined for Light Theme */}
      {shatterComplete && (
        <div className="absolute inset-0 flex items-center justify-center z-[10000] bg-white animate-reveal">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
              <Shield size={32} />
            </div>
            <div className="text-gray-500 tracking-[0.2em] text-sm font-medium uppercase">
              {destroyedText}
            </div>
          </div>
        </div>
      </div>
    )}
  );
};
