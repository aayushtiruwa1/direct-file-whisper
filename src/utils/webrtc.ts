// WebRTC utilities for peer-to-peer file transfer

export interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  status: 'connecting' | 'connected' | 'disconnected' | 'failed';
}

export interface FileTransferMessage {
  type: 'file-info' | 'file-chunk' | 'file-complete' | 'encryption-key';
  data: any;
  chunkIndex?: number;
  totalChunks?: number;
}

export class WebRTCService {
  private static readonly CHUNK_SIZE = 16384; // 16KB chunks
  private static iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  /**
   * Create a new peer connection
   */
  static createPeerConnection(): RTCPeerConnection {
    return new RTCPeerConnection({
      iceServers: this.iceServers,
    });
  }

  /**
   * Create offer for connection initiation
   */
  static async createOffer(peerConnection: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    return offer;
  }

  /**
   * Create answer for connection response
   */
  static async createAnswer(
    peerConnection: RTCPeerConnection,
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    return answer;
  }

  /**
   * Set remote answer
   */
  static async setRemoteAnswer(
    peerConnection: RTCPeerConnection,
    answer: RTCSessionDescriptionInit
  ): Promise<void> {
    await peerConnection.setRemoteDescription(answer);
  }

  /**
   * Add ICE candidate
   */
  static async addIceCandidate(
    peerConnection: RTCPeerConnection,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    await peerConnection.addIceCandidate(candidate);
  }

  /**
   * Create data channel
   */
  static createDataChannel(peerConnection: RTCPeerConnection, label: string): RTCDataChannel {
    return peerConnection.createDataChannel(label, {
      ordered: true,
    });
  }

  /**
   * Send file through data channel in chunks
   */
  static async sendFile(
    dataChannel: RTCDataChannel,
    file: File,
    encryptedData: ArrayBuffer,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const totalChunks = Math.ceil(encryptedData.byteLength / this.CHUNK_SIZE);

    // Send file info first
    const fileInfo: FileTransferMessage = {
      type: 'file-info',
      data: {
        name: file.name,
        size: file.size,
        type: file.type,
        encryptedSize: encryptedData.byteLength,
        totalChunks,
      },
    };
    dataChannel.send(JSON.stringify(fileInfo));

    // Send file in chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.CHUNK_SIZE;
      const end = Math.min(start + this.CHUNK_SIZE, encryptedData.byteLength);
      const chunk = encryptedData.slice(start, end);

      const chunkMessage: FileTransferMessage = {
        type: 'file-chunk',
        data: Array.from(new Uint8Array(chunk)),
        chunkIndex: i,
        totalChunks,
      };

      dataChannel.send(JSON.stringify(chunkMessage));

      if (onProgress) {
        onProgress((i + 1) / totalChunks);
      }

      // Small delay to prevent overwhelming the channel
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    // Send completion message
    const completeMessage: FileTransferMessage = {
      type: 'file-complete',
      data: null,
    };
    dataChannel.send(JSON.stringify(completeMessage));
  }

  /**
   * Generate a share URL with connection info
   */
  static generateShareUrl(
    offer: RTCSessionDescriptionInit,
    encryptionKey: JsonWebKey,
    fileId: string
  ): string {
    const connectionData = {
      offer,
      key: encryptionKey,
      fileId,
      timestamp: Date.now(),
    };

    const encoded = btoa(JSON.stringify(connectionData));
    return `${window.location.origin}/download/${encoded}`;
  }

  /**
   * Parse share URL to extract connection info
   */
  static parseShareUrl(encodedData: string): {
    offer: RTCSessionDescriptionInit;
    key: JsonWebKey;
    fileId: string;
    timestamp: number;
  } | null {
    try {
      const decoded = atob(encodedData);
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Failed to parse share URL:', error);
      return null;
    }
  }
}