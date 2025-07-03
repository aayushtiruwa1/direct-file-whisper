import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center space-y-2">
      <p className="text-xs text-muted-foreground">
        🔒 Zero-knowledge • 📡 P2P • 🚫 No server storage
      </p>
      <p className="text-xs text-muted-foreground/70">
        Made by{' '}
        <span className="bg-gradient-primary bg-clip-text text-transparent font-medium">
          Aayush Tiruwa
        </span>
      </p>
    </footer>
  );
};