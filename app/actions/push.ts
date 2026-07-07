'use server';

import { createClient } from '@/lib/supabase/server';

export type SavePushSubscriptionResult =
  | { success: true }
  | { success: false; error: string };

export async function savePushSubscriptionAction(
  onesignalSubscriptionId: string
): Promise<SavePushSubscriptionResult> {
  if (!onesignalSubscriptionId || onesignalSubscriptionId.length < 8) {
    return { success: false, error: 'Invalid OneSignal subscription id.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be signed in.' };
  }

  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    onesignal_subscription_id: onesignalSubscriptionId,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

