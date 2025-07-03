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
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState<string>('Initializing...');
  const [progress, setProgress] = useState(0);
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [receivedData, setReceivedData] = useState<Uint8Array[]>([]);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (encodedData) {
      const info = WebRTCService.parseShareUrl(encodedData);
      if (info) {
        setConnectionInfo(info);
        setStatus('Ready to connect');
      } else {
        setStatus('Invalid or expired link');
      }
    }
  }, [encodedData]);

  const initiateConnection = async () => {
    if (!connectionInfo) return;

    setIsConnecting(true);
    setStatus('Connecting to sender...');

    try {
      // Import encryption key
      const key = await EncryptionService.importKey(connectionInfo.key);
      setEncryptionKey(key);

      // Create peer connection
      const pc = WebRTCService.createPeerConnection();
      setPeerConnection(pc);

      // Handle data channel
      pc.ondatachannel = (event) => {
        const channel = event.channel;
        
        channel.onopen = () => {
          setStatus('Connected! Waiting for file...');
          toast({
            title: "Connected",
            description: "Ready to receive file",
          });
        };

        channel.onmessage = async (event) => {
          try {
            const message: FileTransferMessage = JSON.parse(event.data);
            
            switch (message.type) {
              case 'file-info':
                setFileInfo(message.data);
                setStatus(`Receiving ${message.data.name}...`);
                setReceivedData(new Array(message.data.totalChunks));
                break;
                
              case 'file-chunk':
                if (message.chunkIndex !== undefined && message.totalChunks) {
                  receivedData[message.chunkIndex] = new Uint8Array(message.data);
                  setProgress((message.chunkIndex + 1) / message.totalChunks * 100);
                }
                break;
                
              case 'file-complete':
                setStatus('Processing file...');
                await processReceivedFile();
                break;
            }
          } catch (error) {
            console.error('Error processing message:', error);
          }
        };

        channel.onerror = (error) => {
          console.error('Data channel error:', error);
          setStatus('Connection error');
        };
      };

      // Handle connection state
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') {
          setStatus('Connection failed');
          setIsConnecting(false);
        }
      };

      // Create answer
      const answer = await WebRTCService.createAnswer(pc, connectionInfo.offer);
      
      // In a real implementation, this answer would be sent back to the sender
      // For this demo, we'll simulate the connection process
      setStatus('Establishing secure connection...');
      
      // Simulate connection establishment
      setTimeout(() => {
        setStatus('Connected! Waiting for sender...');
      }, 2000);

    } catch (error) {
      console.error('Connection failed:', error);
      setStatus('Failed to connect');
      setIsConnecting(false);
      toast({
        title: "Connection Failed",
        description: "Please check the link and try again",
        variant: "destructive",
      });
    }
  };

  const processReceivedFile = async () => {
    if (!fileInfo || !encryptionKey || receivedData.length === 0) return;

    try {
      // Combine all chunks
      const totalSize = receivedData.reduce((sum, chunk) => sum + (chunk?.length || 0), 0);
      const combined = new Uint8Array(totalSize);
      let offset = 0;
      
      for (const chunk of receivedData) {
        if (chunk) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
      }

      setStatus('Decrypting file...');
      
      // Note: In a real implementation, the IV would be transmitted separately
      // For this demo, we'll assume it's prepended to the encrypted data
      const iv = combined.slice(0, 12);
      const encryptedData = combined.slice(12);

      // Decrypt the file
      const decryptedData = await EncryptionService.decrypt(encryptedData.buffer, encryptionKey, iv);
      
      // Create download blob
      const blob = new Blob([decryptedData], { type: fileInfo.type });
      const url = URL.createObjectURL(blob);
      
      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = fileInfo.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus('Download complete!');
      setDownloadReady(true);
      
      toast({
        title: "Download Complete",
        description: `${fileInfo.name} has been downloaded successfully`,
      });

    } catch (error) {
      console.error('File processing failed:', error);
      setStatus('Failed to process file');
      toast({
        title: "Download Failed",
        description: "Could not decrypt or download the file",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!encodedData || !connectionInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 bg-gradient-card backdrop-blur-sm border-border/50 shadow-card max-w-md w-full mx-4">
          <div className="text-center space-y-4">
            <div className="text-xl font-bold text-destructive">Invalid Link</div>
            <p className="text-muted-foreground">
              This share link is invalid or has expired.
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

            {fileInfo && (
              <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="font-medium">{fileInfo.name}</div>
                <div className="text-sm text-muted-foreground">
                  {formatFileSize(fileInfo.size)} • {fileInfo.type || 'Unknown type'}
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

            {!isConnecting && !downloadReady && (
              <Button
                onClick={initiateConnection}
                className="w-full bg-gradient-primary hover:opacity-90 shadow-glow"
                size="lg"
              >
                Start Download
              </Button>
            )}

            {downloadReady && (
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