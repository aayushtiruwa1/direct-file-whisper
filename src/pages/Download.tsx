import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { WebRTCService, FileTransferMessage } from '@/utils/webrtc';
import { EncryptionService } from '@/utils/encryption';
import { useToast } from '@/hooks/use-toast';
import { Download as DownloadIcon } from 'lucide-react';

export const Download: React.FC = () => {
  const { encodedData } = useParams<{ encodedData: string }>();
  const [transferData, setTransferData] = useState<any>(null);
  const [status, setStatus] = useState<string>('Loading...');
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (encodedData) {
      // Try to load transfer data from sessionStorage (expires when sender tab closes)
      const data = sessionStorage.getItem(`transfer_${encodedData}`);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (parsed.downloaded) {
            setStatus('File has already been downloaded');
            return;
          }
          setTransferData(parsed);
          setStatus('Ready to download');
        } catch (error) {
          setStatus('Invalid transfer data');
        }
      } else {
        setStatus('Transfer not found or sender has closed the tab');
      }
    }
  }, [encodedData]);

  const startDownload = async () => {
    if (!transferData || !encodedData) return;

    setIsDownloading(true);
    setStatus('Preparing download...');
    setProgress(10);

    try {
      // Import encryption key
      const encryptionKey = await EncryptionService.importKey(transferData.key);
      setProgress(30);
      setStatus('Decrypting file...');

      // Reconstruct encrypted data from base64 using chunked approach
      const decodeBase64ToUint8Array = (base64String: string): Uint8Array => {
        const binaryString = atob(base64String);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      };
      
      const encryptedArray = decodeBase64ToUint8Array(transferData.encrypted);
      const ivArray = decodeBase64ToUint8Array(transferData.iv);
      
      setProgress(60);

      // Decrypt the file
      const decryptedData = await EncryptionService.decrypt(
        encryptedArray.buffer, 
        encryptionKey, 
        ivArray
      );
      
      setProgress(80);
      setStatus('Preparing download...');

      // Create download blob
      const blob = new Blob([decryptedData], { type: transferData.originalType });
      const url = URL.createObjectURL(blob);
      
      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = transferData.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(100);
      setStatus('Download complete!');
      setDownloadComplete(true);

      // Mark as downloaded and remove from storage
      sessionStorage.removeItem(`transfer_${encodedData}`);
      
      toast({
        title: "Download Complete",
        description: `${transferData.originalName} has been downloaded successfully`,
      });

    } catch (error) {
      console.error('Download failed:', error);
      setStatus('Download failed');
      toast({
        title: "Download Failed",
        description: "Could not decrypt or download the file",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!encodedData || !transferData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 bg-gradient-card backdrop-blur-sm border-border/50 shadow-card max-w-md w-full mx-4">
          <div className="text-center space-y-4">
            <div className="text-xl font-bold text-destructive">
              {status.includes('expired') ? 'Link Expired' : 
               status.includes('downloaded') ? 'Already Downloaded' : 
               'Invalid Link'}
            </div>
            <p className="text-muted-foreground">
              {status.includes('downloaded') ? 'This file has already been downloaded.' :
               status.includes('sender has closed') ? 'The sender has closed their tab.' :
               'This share link is invalid or not found.'}
            </p>
            <Button onClick={() => window.location.href = '/'} variant="outline">
              Go Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="p-8 bg-gradient-card backdrop-blur-sm border-border/50 shadow-card max-w-md w-full">
        <div className="space-y-6 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-gradient-primary rounded-full flex items-center justify-center shadow-glow">
              <DownloadIcon className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Secure File Download
              </h1>
              <p className="text-muted-foreground mt-2">
                End-to-end encrypted file transfer
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Status: <span className="text-foreground font-medium">{status}</span>
            </div>

            {transferData && (
              <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="font-medium">{transferData.originalName}</div>
                <div className="text-sm text-muted-foreground">
                  {formatFileSize(transferData.originalSize)} • {transferData.originalType || 'Unknown type'}
                </div>
              </div>
            )}

            {progress > 0 && progress < 100 && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <div className="text-xs text-muted-foreground">
                  {Math.round(progress)}% complete
                </div>
              </div>
            )}

            {!isDownloading && !downloadComplete && transferData && (
              <Button
                onClick={startDownload}
                className="w-full bg-gradient-primary hover:opacity-90 shadow-glow"
                size="lg"
              >
                Download File
              </Button>
            )}

            {downloadComplete && (
              <div className="space-y-4">
                <div className="text-sm text-green-400 font-medium">
                  ✅ File downloaded successfully!
                </div>
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  className="w-full"
                >
                  Share Another File
                </Button>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground pt-4 border-t border-border/50">
            🔒 Your file is encrypted end-to-end for maximum security
          </div>
        </div>
      </Card>
    </div>
  );
};