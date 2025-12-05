import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { useCall } from '@/hooks/useCall';
import { Header } from '@/components/layout/Header';
import { UserList } from '@/components/dashboard/UserList';
import { CallUI } from '@/components/call/CallUI';
import { IncomingCallModal } from '@/components/call/IncomingCallModal';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { CallHistory } from '@/components/history/CallHistory';
import { NewMeetingModal } from '@/components/meeting/NewMeetingModal';
import { JoinMeetingModal } from '@/components/meeting/JoinMeetingModal';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { History, LogIn, MessageCircle, Plus, Video } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  is_online: boolean;
  avatar_url?: string;
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [selectedChatUser, setSelectedChatUser] = useState<Profile | null>(null);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [showJoinMeeting, setShowJoinMeeting] = useState(false);
  
  usePresence();
  
  const {
    callState,
    remoteUser,
    incomingCall,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleAudio,
    toggleVideo,
  } = useCall();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id, name, is_online, avatar_url')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setCurrentUserProfile(data);
        }
      };
      fetchProfile();
    }
  }, [user]);

  const handleCallFromHistory = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, is_online, avatar_url')
      .eq('id', userId)
      .single();
    
    if (data) {
      startCall(data);
      setShowCallHistory(false);
    }
  };

  const handleMeetingCreated = (roomCode: string) => {
    navigate(`/meeting/${roomCode}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const isInCall = callState.callStatus === 'calling' || callState.callStatus === 'connected';

  return (
    <div className="min-h-screen bg-background">
      {/* Modals */}
      <NewMeetingModal 
        open={showNewMeeting} 
        onOpenChange={setShowNewMeeting}
        onMeetingCreated={handleMeetingCreated}
      />
      <JoinMeetingModal 
        open={showJoinMeeting} 
        onOpenChange={setShowJoinMeeting}
      />

      {/* Call UI (fullscreen when in call) */}
      {isInCall && (
        <CallUI
          callState={callState}
          remoteUser={remoteUser}
          currentUserName={currentUserProfile?.name}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onEndCall={endCall}
        />
      )}

      {/* Incoming call modal */}
      {incomingCall && callState.callStatus === 'incoming' && (
        <IncomingCallModal
          callerId={incomingCall.from}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}

      {/* Main dashboard (hidden when in call) */}
      {!isInCall && (
        <>
          <Header 
            userAvatar={currentUserProfile?.avatar_url}
            userName={currentUserProfile?.name}
          />
          <main className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* User List */}
              <div className="lg:col-span-2">
                <div className="glass-card p-6">
                  <UserList 
                    onCall={startCall} 
                    onChat={(profile) => {
                      setSelectedChatUser(profile);
                      setShowCallHistory(false);
                    }}
                    disabled={callState.callStatus !== 'idle'}
                  />
                </div>
              </div>

              {/* Side Panel - Chat or History */}
              <div className="space-y-4">
                {/* Meeting Actions Card */}
                {!selectedChatUser && !showCallHistory && (
                  <div className="glass-card-elevated p-6 animate-fade-in hero-gradient">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
                        <Video className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-lg">Video Meetings</h3>
                        <p className="text-sm text-muted-foreground">Create or join a meeting</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="gradient"
                        className="h-auto py-3 flex flex-col gap-1"
                        onClick={() => setShowNewMeeting(true)}
                      >
                        <Plus className="w-5 h-5" />
                        <span className="text-xs font-medium">New Meeting</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-3 flex flex-col gap-1"
                        onClick={() => setShowJoinMeeting(true)}
                      >
                        <LogIn className="w-5 h-5" />
                        <span className="text-xs font-medium">Join Meeting</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                {!selectedChatUser && !showCallHistory && (
                  <div className="glass-card p-4 animate-fade-in">
                    <h3 className="font-display font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wider">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex flex-col gap-2"
                        onClick={() => setShowCallHistory(true)}
                      >
                        <History className="w-5 h-5 text-primary" />
                        <span className="text-xs">Call History</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex flex-col gap-2"
                        disabled
                      >
                        <MessageCircle className="w-5 h-5 text-accent" />
                        <span className="text-xs">Select user to chat</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Chat Panel */}
                {selectedChatUser && (
                  <ChatPanel
                    selectedUser={selectedChatUser}
                    onClose={() => setSelectedChatUser(null)}
                  />
                )}

                {/* Call History */}
                {showCallHistory && !selectedChatUser && (
                  <CallHistory
                    onClose={() => setShowCallHistory(false)}
                    onCallUser={handleCallFromHistory}
                  />
                )}
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  );
}