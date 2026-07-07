'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { createClient } from '@/lib/supabase/client';

type RealtimeScheduleRefresherProps = {
  userId: string;
};

export function RealtimeScheduleRefresher({ userId }: RealtimeScheduleRefresherProps) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router, userId]);

  return null;
}

