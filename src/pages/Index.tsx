import React, { useState } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { ShareLink } from '@/components/ShareLink';

const Index = () => {
  const [shareUrl, setShareUrl] = useState<string>('');

  const handleShareLink = (url: string) => {
    setShareUrl(url);
  };

  const handleNewFile = () => {
    setShareUrl('');
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-gradient-glow opacity-20 blur-3xl" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-primary opacity-10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary opacity-10 rounded-full blur-3xl" />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {!shareUrl ? (
            <FileUploader onShareLink={handleShareLink} />
          ) : (
            <ShareLink shareUrl={shareUrl} onNewFile={handleNewFile} />
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-xs text-muted-foreground">
          🔒 Zero-knowledge • 📡 P2P • 🚫 No server storage
        </p>
      </div>
    </div>
  );
};

export default Index;
