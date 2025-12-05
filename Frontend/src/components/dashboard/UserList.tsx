import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserCard } from './UserCard';
import { Input } from '@/components/ui/input';
import { Search, Users, Loader2, Sparkles } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  is_online: boolean;
  avatar_url?: string;
}

interface UserListProps {
  onCall: (profile: Profile) => void;
  onChat: (profile: Profile) => void;
  disabled?: boolean;
}

export function UserList({ onCall, onChat, disabled }: UserListProps) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProfiles();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchProfiles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProfiles = async () => {
    try {
      // Use profiles_public view to avoid exposing email addresses
      const { data, error } = await supabase
        .from('profiles_public')
        .select('id, name, is_online, avatar_url')
        .order('is_online', { ascending: false })
        .order('name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(profile =>
    profile.name.toLowerCase().includes(search.toLowerCase())
  );

  const onlineCount = profiles.filter(p => p.is_online).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold">Users</h2>
          <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {onlineCount} online
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-secondary/50"
        />
      </div>

      {/* User list */}
      <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
        {filteredProfiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {search ? 'No users found' : 'No users yet'}
          </div>
        ) : (
          filteredProfiles.map((profile) => (
            <UserCard
              key={profile.id}
              profile={profile}
              onCall={onCall}
              onChat={onChat}
              isCurrentUser={profile.id === user?.id}
              disabled={disabled}
            />
          ))
        )}
      </div>
    </div>
  );
}