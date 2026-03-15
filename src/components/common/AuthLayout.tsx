import React from 'react';
import { useLocation } from 'react-router-dom';

interface AuthLayoutProps {
  children: React.ReactNode;
  characterImage?: string;
  bgImage?: string;
  showCharacter?: boolean;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  characterImage = '/auth_characters.png', 
  bgImage = '/auth_bg.png',
  showCharacter = true
}) => {
  return (
    <div className="auth-page" style={{ backgroundImage: `url(${bgImage})` }}>
      {/* Liquid Liquid Background */}
      <div className="auth-liquid-container">
        <div className="auth-blob blob-1" />
        <div className="auth-blob blob-2" />
        <div className="auth-blob blob-3" />
      </div>
      
      <div className="auth-bg-overlay" />
      
      <div className="auth-container">
        {showCharacter && (
          <img 
            src={characterImage} 
            alt="Characters" 
            className="auth-character-img animate-reveal"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        
        <div className="auth-card animate-enter-card">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
