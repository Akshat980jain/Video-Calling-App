import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function usePresence() {
  const { user } = useAuth();

  const updatePresence = useCallback(async (isOnline: boolean) => {
    if (!user) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ 
          is_online: isOnline, 
          last_seen: new Date().toISOString() 
        })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Set online when component mounts
    updatePresence(true);

    // Set up visibility change listener
    const handleVisibilityChange = () => {
      updatePresence(!document.hidden);
    };

    // Set up beforeunload listener
    const handleBeforeUnload = () => {
      updatePresence(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Heartbeat to maintain online status
    const heartbeat = setInterval(() => {
      if (!document.hidden) {
        updatePresence(true);
      }
    }, 30000); // Every 30 seconds

    return () => {
      updatePresence(false);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(heartbeat);
    };
  }, [user, updatePresence]);

  return { updatePresence };
}
