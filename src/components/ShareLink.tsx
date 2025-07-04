import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Link, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

interface ShareLinkProps {
  shareUrl: string;
  onNewFile: () => void;
}

export const ShareLink: React.FC<ShareLinkProps> = ({ shareUrl, onNewFile }) => {
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showQr, setShowQr] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const generateQR = async () => {
      try {
        const qrUrl = await QRCode.toDataURL(shareUrl, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeUrl(qrUrl);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    };
    generateQR();
  }, [shareUrl]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Share this link with the recipient",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-8 bg-gradient-card backdrop-blur-sm border-border/50 shadow-card">
      <div className="space-y-6 text-center">
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-gradient-primary rounded-full flex items-center justify-center shadow-glow animate-pulse">
            <Link className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Share Link Ready
            </h2>
            <p className="text-muted-foreground mt-2">
              Send this secure link to the recipient
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Input
              value={shareUrl}
              readOnly
              className="pr-20 bg-muted/50 border-border text-sm"
            />
            <Button
              onClick={copyToClipboard}
              size="sm"
              className="absolute right-1 top-1 h-8"
              variant={copied ? "secondary" : "default"}
            >
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowQr(!showQr)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <QrCode className="w-4 h-4 mr-2" />
              {showQr ? 'Hide QR' : 'Show QR'}
            </Button>
          </div>

          {showQr && qrCodeUrl && (
            <div className="p-4 bg-white rounded-lg border border-border/50">
              <img 
                src={qrCodeUrl} 
                alt="QR Code for share link" 
                className="w-full max-w-48 mx-auto"
              />
              <p className="text-xs text-muted-foreground text-center mt-2">
                Scan to access the download link
              </p>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <div>🔒 End-to-end encrypted</div>
            <div>📡 Direct peer-to-peer transfer</div>
            <div>⏰ Link expires when sender closes tab</div>
          </div>
        </div>

        <div className="pt-4 border-t border-border/50">
          <Button
            onClick={onNewFile}
            variant="outline"
            className="w-full"
          >
            Share Another File
          </Button>
        </div>
      </div>
    </Card>
  );
};