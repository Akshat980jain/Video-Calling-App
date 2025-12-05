import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
import { Copy, Link, Loader2, Plus, Video, QrCode } from 'lucide-react';

interface NewMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMeetingCreated: (roomCode: string) => void;
}

// Generate a random room code like "abc-defg-hij"
function generateRoomCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part1}-${part2}-${part3}`;
}

export function NewMeetingModal({ open, onOpenChange, onMeetingCreated }: NewMeetingModalProps) {
  const { user } = useAuth();
  const [meetingName, setMeetingName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<{ code: string; link: string } | null>(null);
  const [showQR, setShowQR] = useState(false);

  const createMeeting = async () => {
    if (!user) return;
    
    setCreating(true);
    try {
      const roomCode = generateRoomCode();
      
      const { error } = await supabase
        .from('meeting_rooms')
        .insert({
          room_code: roomCode,
          host_id: user.id,
          name: meetingName.trim() || `${user.email?.split('@')[0]}'s Meeting`,
        });

      if (error) throw error;

      const meetingLink = `${window.location.origin}/meeting/${roomCode}`;
      setCreatedRoom({ code: roomCode, link: meetingLink });
      toast.success('Meeting room created!');
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      toast.error('Failed to create meeting');
    } finally {
      setCreating(false);
    }
  };

  const copyLink = () => {
    if (createdRoom) {
      navigator.clipboard.writeText(createdRoom.link);
      toast.success('Link copied to clipboard!');
    }
  };

  const startMeeting = () => {
    if (createdRoom) {
      onMeetingCreated(createdRoom.code);
      handleClose();
    }
  };

  const handleClose = () => {
    setMeetingName('');
    setCreatedRoom(null);
    setShowQR(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Video className="w-5 h-5 text-primary" />
            {createdRoom ? 'Meeting Created!' : 'New Meeting'}
          </DialogTitle>
          <DialogDescription>
            {createdRoom 
              ? 'Share this link or QR code with others to join your meeting'
              : 'Create a new meeting room with a shareable link'
            }
          </DialogDescription>
        </DialogHeader>

        {!createdRoom ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meetingName">Meeting Name (optional)</Label>
              <Input
                id="meetingName"
                value={meetingName}
                onChange={(e) => setMeetingName(e.target.value)}
                placeholder="My Meeting"
                className="bg-secondary/50"
              />
            </div>

            <Button 
              onClick={createMeeting} 
              disabled={creating}
              className="w-full"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Meeting
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* QR Code Toggle */}
            {showQR ? (
              <div className="space-y-3">
                <div className="flex justify-center p-4 bg-white rounded-xl">
                  <QRCodeSVG 
                    value={createdRoom.link} 
                    size={180}
                    level="H"
                    includeMargin
                  />
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowQR(false)}
                >
                  <Link className="w-4 h-4" />
                  Show Link
                </Button>
              </div>
            ) : (
              <>
                {/* Meeting Link */}
                <div className="space-y-2">
                  <Label>Meeting Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={createdRoom.link}
                      readOnly
                      className="bg-secondary/50 font-mono text-sm"
                    />
                    <Button variant="outline" size="icon" onClick={copyLink}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Room Code */}
                <div className="space-y-2">
                  <Label>Room Code</Label>
                  <div className="flex items-center justify-between gap-2 p-3 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Link className="w-4 h-4 text-muted-foreground" />
                      <code className="font-mono text-lg font-semibold text-primary">{createdRoom.code}</code>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => {
                        navigator.clipboard.writeText(createdRoom.code);
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

            <div className="flex gap-2">
              <Button variant="outline" onClick={copyLink} className="flex-1">
                <Copy className="w-4 h-4" />
                Copy Link
              </Button>
              <Button onClick={startMeeting} className="flex-1">
                <Video className="w-4 h-4" />
                Start Meeting
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
