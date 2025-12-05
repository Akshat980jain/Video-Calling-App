import { useEffect, useRef } from 'react';
import { User, VideoOff } from 'lucide-react';

interface VideoStreamProps {
  stream: MediaStream | null;
  muted?: boolean;
  isLocal?: boolean;
  name?: string;
  isVideoEnabled?: boolean;
}

export function VideoStream({ stream, muted = false, isLocal = false, name, isVideoEnabled = true }: VideoStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`video-container ${isLocal ? 'w-32 h-24 md:w-48 md:h-36' : 'w-full h-full'}`}>
      {stream && isVideoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={`w-full h-full object-cover ${isLocal ? 'transform scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-secondary">
          {!isVideoEnabled ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-muted flex items-center justify-center">
                <User className="w-8 h-8 md:w-12 md:h-12 text-muted-foreground" />
              </div>
              <VideoOff className="w-5 h-5 text-muted-foreground" />
            </div>
          ) : (
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-muted flex items-center justify-center">
              <User className="w-8 h-8 md:w-12 md:h-12 text-muted-foreground" />
            </div>
          )}
        </div>
      )}
      
      {/* Name label */}
      {name && (
        <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
          {name} {isLocal && '(You)'}
        </div>
      )}
    </div>
  );
}
