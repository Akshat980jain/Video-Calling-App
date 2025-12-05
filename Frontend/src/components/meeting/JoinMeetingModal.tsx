import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, LogIn, Link } from 'lucide-react';

interface JoinMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinMeetingModal({ open, onOpenChange }: JoinMeetingModalProps) {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [joining, setJoining] = useState(false);

  const formatRoomCode = (value: string) => {
    // Remove all non-alphanumeric characters except hyphens
    let cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    
    // Auto-format as user types (abc-defg-hij)
    const parts = cleaned.replace(/-/g, '');
    if (parts.length <= 3) {
      return parts;
    } else if (parts.length <= 7) {
      return `${parts.slice(0, 3)}-${parts.slice(3)}`;
    } else {
      return `${parts.slice(0, 3)}-${parts.slice(3, 7)}-${parts.slice(7, 10)}`;
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRoomCode(e.target.value);
    setRoomCode(formatted);
  };

  const joinMeeting = async () => {
    if (!roomCode.trim()) {
      toast.error('Please enter a room code');
      return;
    }

    setJoining(true);
    try {
      // Check if room exists and is active
      const { data: room, error } = await supabase
        .from('meeting_rooms')
        .select('*')
        .eq('room_code', roomCode.trim())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!room) {
        toast.error('Meeting not found or has expired');
        return;
      }

      // Navigate to the meeting room
      navigate(`/meeting/${roomCode.trim()}`);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error joining meeting:', error);
      toast.error('Failed to join meeting');
    } finally {
      setJoining(false);
    }
  };

  const handleClose = () => {
    setRoomCode('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <LogIn className="w-5 h-5 text-primary" />
            Join Meeting
          </DialogTitle>
          <DialogDescription>
            Enter the meeting code to join an existing meeting
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roomCode">Meeting Code</Label>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="roomCode"
                value={roomCode}
                onChange={handleCodeChange}
                placeholder="abc-defg-hij"
                className="pl-10 bg-secondary/50 font-mono"
                maxLength={12}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the code shared by the meeting host
            </p>
          </div>

          <Button 
            onClick={joinMeeting} 
            disabled={joining || roomCode.length < 10}
            className="w-full"
          >
            {joining ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Join Meeting
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}