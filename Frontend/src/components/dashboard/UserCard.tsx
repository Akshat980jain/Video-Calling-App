import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, User as UserIcon } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  is_online: boolean;
  avatar_url?: string;
}

interface UserCardProps {
  profile: Profile;
  onCall: (profile: Profile) => void;
  onChat: (profile: Profile) => void;
  isCurrentUser: boolean;
  disabled?: boolean;
}

export function UserCard({ profile, onCall, onChat, isCurrentUser, disabled }: UserCardProps) {
  return (
    <div className="glass-card p-4 flex items-center justify-between gap-4 animate-fade-in hover:border-primary/30 transition-all duration-300 group">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center overflow-hidden border-2 border-border group-hover:border-primary/30 transition-colors">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          {/* Online indicator */}
          <div className={`absolute -bottom-0.5 -right-0.5 ${profile.is_online ? 'online-indicator' : 'offline-indicator'} border-2 border-card`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-medium truncate">{profile.name}</h3>
            {isCurrentUser && (
              <span className="text-xs bg-gradient-to-r from-primary to-accent text-white px-2 py-0.5 rounded-full">You</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {profile.is_online ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      {!isCurrentUser && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChat(profile)}
            title={`Chat with ${profile.name}`}
            className="hover:bg-primary/10 hover:text-primary"
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
          <Button
            variant={profile.is_online ? 'success' : 'secondary'}
            size="icon"
            onClick={() => onCall(profile)}
            disabled={disabled || !profile.is_online}
            title={profile.is_online ? `Call ${profile.name}` : 'User is offline'}
            className={profile.is_online ? 'shadow-lg shadow-success/20' : ''}
          >
            <Phone className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}