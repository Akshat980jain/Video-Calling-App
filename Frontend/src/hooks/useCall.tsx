import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useSignaling } from './useSignaling';
import {
  CallState,
  initialCallState,
  getLocalStream,
  createPeerConnection,
  createOffer,
  createAnswer,
  setRemoteDescription,
  addIceCandidate,
  closeConnection,
} from '@/lib/webrtc';
import { toast } from 'sonner';

interface Profile {
  id: string;
  name: string;
}

export function useCall() {
  const { user } = useAuth();
  const [callState, setCallState] = useState<CallState>(initialCallState);
  const [remoteUser, setRemoteUser] = useState<Profile | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ from: string; offer: RTCSessionDescriptionInit } | null>(null);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteUserIdRef = useRef<string | null>(null);

  const sendIceCandidateRef = useRef<((to: string, candidate: RTCIceCandidateInit) => Promise<void>) | null>(null);

  const handleIceCandidate = useCallback((candidate: RTCIceCandidate) => {
    if (remoteUserIdRef.current && sendIceCandidateRef.current) {
      sendIceCandidateRef.current(remoteUserIdRef.current, candidate.toJSON());
    }
  }, []);

  const handleTrack = useCallback((stream: MediaStream) => {
    setCallState(prev => ({ ...prev, remoteStream: stream }));
  }, []);

  const cleanupCallRef = useRef<(() => void) | null>(null);

  const handleConnectionStateChange = useCallback((state: RTCPeerConnectionState) => {
    console.log('Connection state changed:', state);
    if (state === 'connected') {
      setCallState(prev => ({ ...prev, callStatus: 'connected' }));
      toast.success('Call connected!');
    } else if (state === 'disconnected' || state === 'failed') {
      cleanupCallRef.current?.();
    }
  }, []);

  const cleanupCall = useCallback(() => {
    closeConnection(pcRef.current, localStreamRef.current);
    pcRef.current = null;
    localStreamRef.current = null;
    remoteUserIdRef.current = null;
    setCallState(initialCallState);
    setRemoteUser(null);
    setIncomingCall(null);
  }, []);

  // Store cleanupCall in ref for use in callbacks
  useEffect(() => {
    cleanupCallRef.current = cleanupCall;
  }, [cleanupCall]);

  // Memoize signaling callbacks to prevent infinite loops
  const onIncomingCall = useCallback((from: string, offer: RTCSessionDescriptionInit) => {
    console.log('Incoming call from:', from);
    setIncomingCall({ from, offer });
    setCallState(prev => ({ ...prev, callStatus: 'incoming' }));
  }, []);

  const onCallAnswered = useCallback(async (answer: RTCSessionDescriptionInit) => {
    console.log('Call answered');
    if (pcRef.current) {
      await setRemoteDescription(pcRef.current, answer);
    }
  }, []);

  const onIceCandidate = useCallback((candidate: RTCIceCandidateInit) => {
    if (pcRef.current) {
      addIceCandidate(pcRef.current, candidate);
    }
  }, []);

  const onCallEnded = useCallback(() => {
    toast.info('Call ended');
    cleanupCallRef.current?.();
  }, []);

  const onCallDeclined = useCallback(() => {
    toast.info('Call was declined');
    cleanupCallRef.current?.();
  }, []);

  const {
    isConnected,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    sendEndCall,
    sendDecline,
  } = useSignaling({
    onIncomingCall,
    onCallAnswered,
    onIceCandidate,
    onCallEnded,
    onCallDeclined,
  });

  // Store sendIceCandidate in ref for use in callbacks
  useEffect(() => {
    sendIceCandidateRef.current = sendIceCandidate;
  }, [sendIceCandidate]);

  const startCall = useCallback(async (targetUser: Profile) => {
    if (!user) return;

    try {
      setCallState(prev => ({ ...prev, callStatus: 'calling' }));
      setRemoteUser(targetUser);
      remoteUserIdRef.current = targetUser.id;

      // Get local media
      const stream = await getLocalStream();
      localStreamRef.current = stream;
      setCallState(prev => ({ ...prev, localStream: stream }));

      // Create peer connection
      const pc = createPeerConnection(
        handleIceCandidate,
        handleTrack,
        handleConnectionStateChange
      );
      pcRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create and send offer
      const offer = await createOffer(pc);
      await sendOffer(targetUser.id, offer);

      toast.info(`Calling ${targetUser.name}...`);
    } catch (error: any) {
      console.error('Error starting call:', error);
      toast.error(error.message || 'Failed to start call');
      cleanupCall();
    }
  }, [user, handleIceCandidate, handleTrack, handleConnectionStateChange, sendOffer, cleanupCall]);

  const acceptCall = useCallback(async (callerProfile: Profile) => {
    if (!incomingCall || !user) return;

    try {
      setRemoteUser(callerProfile);
      remoteUserIdRef.current = incomingCall.from;

      // Get local media
      const stream = await getLocalStream();
      localStreamRef.current = stream;
      setCallState(prev => ({ ...prev, localStream: stream }));

      // Create peer connection
      const pc = createPeerConnection(
        handleIceCandidate,
        handleTrack,
        handleConnectionStateChange
      );
      pcRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Set remote description and create answer
      await setRemoteDescription(pc, incomingCall.offer);
      const answer = await createAnswer(pc);
      await sendAnswer(incomingCall.from, answer);

      setIncomingCall(null);
      toast.success('Call accepted!');
    } catch (error: any) {
      console.error('Error accepting call:', error);
      toast.error(error.message || 'Failed to accept call');
      cleanupCall();
    }
  }, [incomingCall, user, handleIceCandidate, handleTrack, handleConnectionStateChange, sendAnswer, cleanupCall]);

  const declineCall = useCallback(() => {
    if (incomingCall) {
      sendDecline(incomingCall.from);
    }
    cleanupCall();
    toast.info('Call declined');
  }, [incomingCall, sendDecline, cleanupCall]);

  const endCall = useCallback(() => {
    if (remoteUserIdRef.current) {
      sendEndCall(remoteUserIdRef.current);
    }
    cleanupCall();
    toast.info('Call ended');
  }, [sendEndCall, cleanupCall]);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState(prev => ({ ...prev, isAudioEnabled: audioTrack.enabled }));
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCallState(prev => ({ ...prev, isVideoEnabled: videoTrack.enabled }));
      }
    }
  }, []);

  const initializeLocalStream = useCallback((stream: MediaStream) => {
    localStreamRef.current = stream;
    setCallState(prev => ({ 
      ...prev, 
      localStream: stream,
      callStatus: 'connected',
      isAudioEnabled: true,
      isVideoEnabled: true,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, [cleanupCall]);

  // Auto-accept call when already in meeting (for hosts)
  const autoAcceptCall = useCallback(async (callerProfile: Profile) => {
    if (!incomingCall || !user) return;

    try {
      setRemoteUser(callerProfile);
      remoteUserIdRef.current = incomingCall.from;

      // Use existing local stream if available, otherwise get a new one
      let stream = localStreamRef.current;
      if (!stream) {
        stream = await getLocalStream();
        localStreamRef.current = stream;
        setCallState(prev => ({ ...prev, localStream: stream }));
      }

      // Create peer connection
      const pc = createPeerConnection(
        handleIceCandidate,
        handleTrack,
        handleConnectionStateChange
      );
      pcRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream!);
      });

      // Set remote description and create answer
      await setRemoteDescription(pc, incomingCall.offer);
      const answer = await createAnswer(pc);
      await sendAnswer(incomingCall.from, answer);

      setIncomingCall(null);
      toast.success(`${callerProfile.name} joined the meeting!`);
    } catch (error: any) {
      console.error('Error auto-accepting call:', error);
      toast.error(error.message || 'Failed to connect participant');
    }
  }, [incomingCall, user, handleIceCandidate, handleTrack, handleConnectionStateChange, sendAnswer]);

  return {
    callState,
    remoteUser,
    incomingCall,
    isSignalingConnected: isConnected,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleAudio,
    toggleVideo,
    initializeLocalStream,
    autoAcceptCall,
  };
}
