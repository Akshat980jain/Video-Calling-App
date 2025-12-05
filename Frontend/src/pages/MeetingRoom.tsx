import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { useCall } from '@/hooks/useCall';
import { supabase } from '@/integrations/supabase/client';
import { CallUI } from '@/components/call/CallUI';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Copy, Loader2, Users, Video, QrCode, Clock } from 'lucide-react';
import { getLocalStream } from '@/lib/webrtc';

interface MeetingRoom {
  id: string;
  room_code: string;
  host_id: string;
  name: string;
  is_active: boolean;
  expires_at: string | null;
}

interface Profile {
  id: string;
  name: string;
  is_online: boolean;
  avatar_url?: string;
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s remaining`;
  }
  return `${seconds}s remaining`;
}

export default function MeetingRoom() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState<MeetingRoom | null>(null);
  const [hostProfile, setHostProfile] = useState<Profile | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [inMeeting, setInMeeting] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  usePresence();

  const {
    callState,
    remoteUser,
    incomingCall,
    startCall,
    endCall,
    toggleAudio,
    toggleVideo,
    initializeLocalStream,
    autoAcceptCall,
  } = useCall();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && roomCode) {
      fetchRoomAndProfiles();
    }
  }, [user, roomCode]);

  // Countdown timer
  useEffect(() => {
    if (!room?.expires_at) return;

    const updateTimer = () => {
      const expiresAt = new Date(room.expires_at!).getTime();
      const now = Date.now();
      const remaining = expiresAt - now;
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        toast.error('Meeting has expired');
        navigate('/dashboard');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [room?.expires_at, navigate]);

  const fetchRoomAndProfiles = async () => {
    if (!user || !roomCode) return;

    try {
      // Fetch the meeting room
      const { data: roomData, error: roomError } = await supabase
        .from('meeting_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .eq('is_active', true)
        .maybeSingle();

      if (roomError) throw roomError;

      if (!roomData) {
        toast.error('Meeting not found or has expired');
        navigate('/dashboard');
        return;
      }

      setRoom(roomData);

      // Fetch host profile
      const { data: hostData } = await supabase
        .from('profiles')
        .select('id, name, is_online, avatar_url')
        .eq('id', roomData.host_id)
        .single();

      if (hostData) {
        setHostProfile(hostData);
      }

      // Fetch current user profile
      const { data: userData } = await supabase
        .from('profiles')
        .select('id, name, is_online, avatar_url')
        .eq('id', user.id)
        .single();

      if (userData) {
        setCurrentUserProfile(userData);
      }
    } catch (error) {
      console.error('Error fetching room:', error);
      toast.error('Failed to load meeting');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Auto-accept incoming calls when host is already in the meeting
  useEffect(() => {
    if (inMeeting && incomingCall && room) {
      // Fetch caller profile and auto-accept
      const acceptIncomingParticipant = async () => {
        try {
          const { data: callerProfile } = await supabase
            .from('profiles')
            .select('id, name, is_online, avatar_url')
            .eq('id', incomingCall.from)
            .single();

          if (callerProfile) {
            autoAcceptCall({ id: callerProfile.id!, name: callerProfile.name || 'Unknown' });
          }
        } catch (error) {
          console.error('Error fetching caller profile:', error);
        }
      };

      acceptIncomingParticipant();
    }
  }, [inMeeting, incomingCall, room, autoAcceptCall]);

  const joinMeeting = async () => {
    try {
      if (hostProfile && user?.id !== hostProfile.id) {
        // Join as participant - call the host
        startCall(hostProfile);
      } else {
        // Host starting the meeting - initialize camera
        const stream = await getLocalStream();
        initializeLocalStream(stream);
        toast.success('Meeting started! Share the link for others to join.');
      }
      setInMeeting(true);
    } catch (error: any) {
      console.error('Error starting meeting:', error);
      toast.error(error.message || 'Failed to access camera/microphone');
    }
  };

  const leaveMeeting = () => {
    endCall();
    setInMeeting(false);
    navigate('/dashboard');
  };

  const copyLink = () => {
    const link = `${window.location.origin}/meeting/${roomCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard!');
  };

  const meetingLink = `${window.location.origin}/meeting/${roomCode}`;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !room) return null;

  const isHost = user.id === room.host_id;
  const isInCall = callState.callStatus === 'calling' || callState.callStatus === 'connected';

  // Show call UI when in an active call
  if (isInCall || (inMeeting && isHost)) {
    return (
      <CallUI
        callState={callState}
        remoteUser={remoteUser || hostProfile}
        currentUserName={currentUserProfile?.name}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onEndCall={leaveMeeting}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/30 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display font-bold text-lg">Meeting Room</h1>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          <div className="glass-card-elevated p-8 space-y-6 animate-fade-in">
            {/* Meeting Info */}
            <div className="text-center space-y-2">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto shadow-lg shadow-primary/30">
                <Video className="w-10 h-10 text-white" />
              </div>
              <h2 className="font-display font-bold text-2xl">{room.name}</h2>
              <p className="text-muted-foreground">
                Hosted by {hostProfile?.name || 'Unknown'}
              </p>
            </div>

            {/* Expiration Timer */}
            {timeRemaining !== null && (
              <div className={`flex items-center justify-center gap-2 p-3 rounded-lg ${timeRemaining < 3600000 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                }`}>
                <Clock className="w-4 h-4" />
                <span className="font-medium text-sm">{formatTimeRemaining(timeRemaining)}</span>
              </div>
            )}

            {/* QR Code or Room Code */}
            {showQR ? (
              <div className="space-y-3">
                <div className="flex justify-center p-4 bg-white rounded-xl">
                  <QRCodeSVG
                    value={meetingLink}
                    size={200}
                    level="H"
                    includeMargin
                  />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Scan to join the meeting
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowQR(false)}
                >
                  Show Code
                </Button>
              </div>
            ) : (
              <>
                {/* Room Code */}
                <div className="bg-secondary/50 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1 text-center">Meeting Code</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="font-mono text-xl font-semibold text-primary">{room.room_code}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        navigator.clipboard.writeText(room.room_code);
                        toast.success('Room code copied!');
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowQR(true)}
                >
                  <QrCode className="w-4 h-4" />
                  Show QR Code
                </Button>
              </>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={joinMeeting}
                className="w-full"
                size="lg"
                variant="gradient"
              >
                <Video className="w-5 h-5" />
                {isHost ? 'Start Meeting' : 'Join Meeting'}
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" onClick={copyLink} className="flex-1">
                  <Copy className="w-4 h-4" />
                  Copy Link
                </Button>
                <Button variant="outline" className="flex-1" disabled>
                  <Users className="w-4 h-4" />
                  Participants
                </Button>
              </div>
            </div>

            {isHost && (
              <p className="text-center text-sm text-muted-foreground">
                Share the meeting link or QR code with others to let them join
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
