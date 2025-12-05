import { CallState } from '@/lib/webrtc';
import { VideoStream } from './VideoStream';
import { CallControls } from './CallControls';
import { Loader2, Phone, Users } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
}

interface CallUIProps {
  callState: CallState;
  remoteUser: Profile | null;
  currentUserName?: string;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
}

export function CallUI({
  callState,
  remoteUser,
  currentUserName,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
}: CallUIProps) {
  const { localStream, remoteStream, isAudioEnabled, isVideoEnabled, callStatus } = callState;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
      {/* Remote video (full screen) */}
      <div className="flex-1 relative">
        {callStatus === 'calling' ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-secondary">
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center animate-ring">
              <Phone className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Calling {remoteUser?.name}...</h2>
            <p className="text-muted-foreground">Waiting for answer</p>
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : remoteStream ? (
          <VideoStream
            stream={remoteStream}
            name={remoteUser?.name}
            isVideoEnabled={true}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-secondary">
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Waiting for participants...</h2>
            <p className="text-muted-foreground">Share the meeting link for others to join</p>
          </div>
        )}

        {/* Local video (picture-in-picture) */}
        <div className="absolute top-4 right-4 rounded-xl overflow-hidden border-2 border-border shadow-lg">
          <VideoStream
            stream={localStream}
            muted
            isLocal
            name={currentUserName}
            isVideoEnabled={isVideoEnabled}
          />
        </div>

        {/* Call status indicator */}
        {callStatus === 'connected' && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <div className={`w-2 h-2 rounded-full ${remoteStream ? 'bg-success' : 'bg-warning'} animate-pulse`} />
            <span className="text-sm font-medium">{remoteStream ? 'Connected' : 'In Meeting'}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-card/80 backdrop-blur-xl border-t border-border">
        <CallControls
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          onToggleAudio={onToggleAudio}
          onToggleVideo={onToggleVideo}
          onEndCall={onEndCall}
        />
      </div>
    </div>
  );
}
