import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';

interface CallControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
}

export function CallControls({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
}: CallControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4 p-4">
      {/* Mute/Unmute */}
      <Button
        variant={isAudioEnabled ? 'secondary' : 'destructive'}
        size="iconLg"
        onClick={onToggleAudio}
        title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
      </Button>

      {/* End Call */}
      <Button
        variant="endCall"
        size="iconLg"
        onClick={onEndCall}
        title="End call"
      >
        <PhoneOff className="w-6 h-6" />
      </Button>

      {/* Toggle Video */}
      <Button
        variant={isVideoEnabled ? 'secondary' : 'destructive'}
        size="iconLg"
        onClick={onToggleVideo}
        title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
      >
        {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
      </Button>
    </div>
  );
}
