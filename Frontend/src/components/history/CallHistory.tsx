import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Phone, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Clock, 
  User,
  X,
  History as HistoryIcon
} from 'lucide-react';
import { format } from 'date-fns';

interface CallHistoryEntry {
  id: string;
  caller_id: string;
  receiver_id: string;
  status: 'completed' | 'missed' | 'declined';
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  caller_profile?: { name: string; avatar_url: string | null } | null;
  receiver_profile?: { name: string; avatar_url: string | null } | null;
}

interface CallHistoryProps {
  onClose: () => void;
  onCallUser: (userId: string) => void;
}

export function CallHistory({ onClose, onCallUser }: CallHistoryProps) {
  const { user } = useAuth();
  const [history, setHistory] = useState<CallHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('call_history')
        .select(`
          *,
          caller_profile:profiles!call_history_caller_id_fkey(name, avatar_url),
          receiver_profile:profiles!call_history_receiver_id_fkey(name, avatar_url)
        `)
        .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Type assertion to handle the status field
      const typedData = (data || []).map(entry => ({
        ...entry,
        status: entry.status as 'completed' | 'missed' | 'declined'
      }));
      
      setHistory(typedData);
    } catch (error) {
      console.error('Error fetching call history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getCallIcon = (entry: CallHistoryEntry) => {
    const isOutgoing = entry.caller_id === user?.id;
    
    if (entry.status === 'missed' || entry.status === 'declined') {
      return <PhoneMissed className="w-4 h-4 text-destructive" />;
    }
    
    return isOutgoing 
      ? <PhoneOutgoing className="w-4 h-4 text-success" />
      : <PhoneIncoming className="w-4 h-4 text-primary" />;
  };

  const getOtherUser = (entry: CallHistoryEntry) => {
    const isOutgoing = entry.caller_id === user?.id;
    return isOutgoing ? entry.receiver_profile : entry.caller_profile;
  };

  const getOtherUserId = (entry: CallHistoryEntry) => {
    return entry.caller_id === user?.id ? entry.receiver_id : entry.caller_id;
  };

  return (
    <div className="glass-card-elevated h-[500px] flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HistoryIcon className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold">Call History</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* History List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Phone className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">No call history</p>
              <p className="text-xs">Your calls will appear here</p>
            </div>
          ) : (
            history.map((entry) => {
              const otherUser = getOtherUser(entry);
              const otherUserId = getOtherUserId(entry);
              
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors group"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex-shrink-0">
                    {otherUser?.avatar_url ? (
                      <img src={otherUser.avatar_url} alt={otherUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getCallIcon(entry)}
                      <span className="font-medium truncate">{otherUser?.name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(new Date(entry.started_at), 'MMM d, h:mm a')}</span>
                      {entry.status === 'completed' && entry.duration_seconds > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(entry.duration_seconds)}
                          </span>
                        </>
                      )}
                      {entry.status !== 'completed' && (
                        <>
                          <span>•</span>
                          <span className="capitalize text-destructive">{entry.status}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Call back button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onCallUser(otherUserId)}
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}