import React, { useState } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { ShareLink } from '@/components/ShareLink';
import { Footer } from '@/components/Footer';

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
      
      <Footer />
    </div>
  );
};

export default Index;
