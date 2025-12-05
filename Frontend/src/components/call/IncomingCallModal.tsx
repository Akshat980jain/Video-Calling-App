import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, User } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  avatar_url?: string;
}

interface IncomingCallModalProps {
  callerId: string;
  onAccept: (callerProfile: Profile) => void;
  onDecline: () => void;
}

export function IncomingCallModal({ callerId, onAccept, onDecline }: IncomingCallModalProps) {
  const [callerProfile, setCallerProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchCaller = async () => {
      // Fetch caller profile
      const { data } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .eq('id', callerId)
        .single();

      if (data) {
        setCallerProfile(data);
      }
    };

    fetchCaller();
  }, [callerId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-card p-8 max-w-sm w-full mx-4 text-center space-y-6 animate-scale-in">
        {/* Caller avatar */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center animate-ring">
            {callerProfile?.avatar_url ? (
              <img
                src={callerProfile.avatar_url}
                alt={callerProfile.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-primary" />
            )}
          </div>
        </div>

        {/* Caller info */}
        <div>
          <h2 className="text-xl font-semibold">{callerProfile?.name || 'Unknown'}</h2>
          <p className="text-muted-foreground">Incoming video call</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-6">
          <Button
            variant="destructive"
            size="iconLg"
            onClick={onDecline}
            title="Decline call"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>

          <Button
            variant="success"
            size="iconLg"
            onClick={() => callerProfile && onAccept(callerProfile)}
            disabled={!callerProfile}
            title="Accept call"
          >
            <Phone className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
