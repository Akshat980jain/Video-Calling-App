// WebRTC configuration with STUN and TURN servers
export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    // Google STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Free TURN servers from OpenRelay (for NAT traversal)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

export interface CallState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  callStatus: 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';
}

export const initialCallState: CallState = {
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  isAudioEnabled: true,
  isVideoEnabled: true,
  callStatus: 'idle',
};

export async function getLocalStream(video: boolean = true, audio: boolean = true): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: video ? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
      } : false,
      audio: audio ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      } : false,
    });
    return stream;
  } catch (error) {
    console.error('Error getting local stream:', error);
    throw error;
  }
}

export function createPeerConnection(
  onIceCandidate: (candidate: RTCIceCandidate) => void,
  onTrack: (stream: MediaStream) => void,
  onConnectionStateChange: (state: RTCPeerConnectionState) => void
): RTCPeerConnection {
  const pc = new RTCPeerConnection(RTC_CONFIG);

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('ICE candidate:', event.candidate);
      onIceCandidate(event.candidate);
    }
  };

  pc.ontrack = (event) => {
    console.log('Remote track received:', event.streams[0]);
    if (event.streams[0]) {
      onTrack(event.streams[0]);
    }
  };

  pc.onconnectionstatechange = () => {
    console.log('Connection state:', pc.connectionState);
    onConnectionStateChange(pc.connectionState);
  };

  pc.oniceconnectionstatechange = () => {
    console.log('ICE connection state:', pc.iceConnectionState);
  };

  return pc;
}

export async function createOffer(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
  const offer = await pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  });
  await pc.setLocalDescription(offer);
  return offer;
}

export async function createAnswer(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return answer;
}

export async function setRemoteDescription(
  pc: RTCPeerConnection,
  sdp: RTCSessionDescriptionInit
): Promise<void> {
  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
}

export async function addIceCandidate(
  pc: RTCPeerConnection,
  candidate: RTCIceCandidateInit
): Promise<void> {
  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (error) {
    console.error('Error adding ICE candidate:', error);
  }
}

export function closeConnection(pc: RTCPeerConnection | null, stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  if (pc) {
    pc.close();
  }
}
