import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface SignalingMessage {
  type: 'call' | 'answer' | 'ice-candidate' | 'end-call' | 'decline';
  from: string;
  to: string;
  payload?: any;
}

interface UseSignalingProps {
  onIncomingCall: (from: string, offer: RTCSessionDescriptionInit) => void;
  onCallAnswered: (answer: RTCSessionDescriptionInit) => void;
  onIceCandidate: (candidate: RTCIceCandidateInit) => void;
  onCallEnded: () => void;
  onCallDeclined: () => void;
}

export function useSignaling({
  onIncomingCall,
  onCallAnswered,
  onIceCandidate,
  onCallEnded,
  onCallDeclined,
}: UseSignalingProps) {
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`signaling:${user.id}`, {
      config: {
        broadcast: { self: false },
      },
    });

    channel
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        const message = payload as SignalingMessage;
        console.log('Received signal:', message.type);

        switch (message.type) {
          case 'call':
            onIncomingCall(message.from, message.payload);
            break;
          case 'answer':
            onCallAnswered(message.payload);
            break;
          case 'ice-candidate':
            onIceCandidate(message.payload);
            break;
          case 'end-call':
            onCallEnded();
            break;
          case 'decline':
            onCallDeclined();
            break;
        }
      })
      .subscribe((status) => {
        console.log('Signaling channel status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [user, onIncomingCall, onCallAnswered, onIceCandidate, onCallEnded, onCallDeclined]);

  const sendSignal = useCallback(async (to: string, message: Omit<SignalingMessage, 'from' | 'to'>) => {
    if (!user) return;

    const targetChannel = supabase.channel(`signaling:${to}`);

    // Wait for the channel to be fully subscribed before sending
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Signaling channel subscription timeout'));
      }, 5000);

      targetChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeout);
          reject(new Error(`Signaling channel error: ${status}`));
        }
      });
    });

    console.log(`Sending signal to ${to}:`, message.type);

    await targetChannel.send({
      type: 'broadcast',
      event: 'signal',
      payload: {
        ...message,
        from: user.id,
        to,
      },
    });

    // Cleanup after a longer delay to ensure message is delivered
    setTimeout(() => {
      targetChannel.unsubscribe();
    }, 5000);
  }, [user]);

  const sendOffer = useCallback((to: string, offer: RTCSessionDescriptionInit) => {
    return sendSignal(to, { type: 'call', payload: offer });
  }, [sendSignal]);

  const sendAnswer = useCallback((to: string, answer: RTCSessionDescriptionInit) => {
    return sendSignal(to, { type: 'answer', payload: answer });
  }, [sendSignal]);

  const sendIceCandidate = useCallback((to: string, candidate: RTCIceCandidateInit) => {
    return sendSignal(to, { type: 'ice-candidate', payload: candidate });
  }, [sendSignal]);

  const sendEndCall = useCallback((to: string) => {
    return sendSignal(to, { type: 'end-call' });
  }, [sendSignal]);

  const sendDecline = useCallback((to: string) => {
    return sendSignal(to, { type: 'decline' });
  }, [sendSignal]);

  return {
    isConnected,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    sendEndCall,
    sendDecline,
  };
}
