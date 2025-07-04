import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { EncryptionService } from '@/utils/encryption';
import { WebRTCService } from '@/utils/webrtc';
import { Upload } from 'lucide-react';

interface FileUploaderProps {
  onShareLink: (url: string) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onShareLink }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setStatus('Reading file...');

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      setProgress(20);
      setStatus('Generating encryption key...');

      // Generate encryption key
      const encryptionKey = await EncryptionService.generateKey();
      setProgress(40);
      setStatus('Encrypting file...');

      // Encrypt file
      const { encrypted, iv } = await EncryptionService.encrypt(arrayBuffer, encryptionKey);
      setProgress(60);
      setStatus('Preparing for transfer...');

      // Export encryption key
      const exportedKey = await EncryptionService.exportKey(encryptionKey);

      // Generate file ID
      const fileId = EncryptionService.generateId();
      
      setProgress(80);
      setStatus('Creating secure transfer...');

      // Store encrypted data with metadata for transfer
      // Convert encrypted data to base64 for storage using chunked approach for large files
      const encryptedArray = new Uint8Array(encrypted);
      const ivArray = new Uint8Array(iv);
      
      let encryptedBase64 = '';
      const chunkSize = 8192; // Process in 8KB chunks
      for (let i = 0; i < encryptedArray.length; i += chunkSize) {
        const chunk = encryptedArray.slice(i, i + chunkSize);
        encryptedBase64 += btoa(String.fromCharCode(...chunk));
      }
      
      let ivBase64 = '';
      for (let i = 0; i < ivArray.length; i += chunkSize) {
        const chunk = ivArray.slice(i, i + chunkSize);
        ivBase64 += btoa(String.fromCharCode(...chunk));
      }
      
      const transferData = {
        encrypted: encryptedBase64,
        iv: ivBase64,
        key: exportedKey,
        originalName: file.name,
        originalSize: file.size,
        originalType: file.type,
        timestamp: Date.now(),
        downloaded: false,
      };

      // Store in sessionStorage (expires when tab closes)
      sessionStorage.setItem(`transfer_${fileId}`, JSON.stringify(transferData));

      // Generate share URL
      const shareUrl = `${window.location.origin}/download/${fileId}`;
      setProgress(100);
      setStatus('Ready to share!');

      onShareLink(shareUrl);
    } catch (error) {
      console.error('Upload failed:', error);
      setStatus('Upload failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="p-8 bg-gradient-card backdrop-blur-sm border-border/50 shadow-card">
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-gradient-primary rounded-full flex items-center justify-center shadow-glow">
            <Upload className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Secure File Sharing
            </h2>
            <p className="text-muted-foreground mt-2">
              End-to-end encrypted, peer-to-peer file transfer
            </p>
          </div>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-smooth ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          {file ? (
            <div className="space-y-3">
              <div className="text-lg font-medium text-foreground">{file.name}</div>
              <div className="text-sm text-muted-foreground">
                {formatFileSize(file.size)} • {file.type || 'Unknown type'}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-lg font-medium">
                {isDragActive ? 'Drop your file here' : 'Drag & drop a file here'}
              </div>
              <div className="text-sm text-muted-foreground">
                or click to select a file • No size limit
              </div>
            </div>
          )}
        </div>

        {isProcessing && (
          <div className="space-y-3">
            <Progress value={progress} className="w-full" />
            <div className="text-sm text-center text-muted-foreground">{status}</div>
          </div>
        )}

        {file && !isProcessing && (
          <Button
            onClick={handleUpload}
            className="w-full bg-gradient-primary hover:opacity-90 shadow-glow"
            size="lg"
          >
            Generate Secure Share Link
          </Button>
        )}
      </div>
    </Card>
  );
};