import { NextResponse, type NextRequest } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';

type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  scheduled_start: string | null;
};

type PushSubscriptionRow = {
  onesignal_subscription_id: string;
};

async function sendOneSignalPush(args: {
  appId: string;
  apiKey: string;
  subscriptionIds: string[];
  title: string;
  message: string;
}) {
  const res = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${args.apiKey}`,
    },
    body: JSON.stringify({
      app_id: args.appId,
      target_channel: 'push',
      headings: { en: args.title },
      contents: { en: args.message },
      include_subscription_ids: args.subscriptionIds,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OneSignal send failed: ${res.status} ${text}`);
  }
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  const gotSecret = request.headers.get('x-cron-secret');

  if (!expectedSecret || gotSecret !== expectedSecret) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const onesignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const onesignalApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!onesignalAppId || !onesignalApiKey) {
    return NextResponse.json(
      { ok: false, error: 'Missing OneSignal env vars.' },
      { status: 500 }
    );
  }

  const supabase = createAdminClient();

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 15 * 60 * 1000);

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id,user_id,title,scheduled_start')
    .is('pre_task_notified_at', null)
    .neq('status', 'completed')
    .gte('scheduled_start', now.toISOString())
    .lt('scheduled_start', windowEnd.toISOString());

  if (tasksError) {
    return NextResponse.json({ ok: false, error: tasksError.message }, { status: 500 });
  }

  const dueTasks = (tasks ?? []) as TaskRow[];
  if (dueTasks.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  let notified = 0;
  const taskIdsNotified: string[] = [];

  // One notification per task (keeps copy simple and avoids batching edge cases).
  for (const task of dueTasks) {
    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('onesignal_subscription_id')
      .eq('user_id', task.user_id);

    if (subsError) {
      continue;
    }

    const subscriptionIds = ((subs ?? []) as PushSubscriptionRow[])
      .map((s) => s.onesignal_subscription_id)
      .filter(Boolean);

    if (subscriptionIds.length === 0) {
      continue;
    }

    await sendOneSignalPush({
      appId: onesignalAppId,
      apiKey: onesignalApiKey,
      subscriptionIds,
      title: 'Up next',
      message: task.title,
    });

    taskIdsNotified.push(task.id);
    notified += 1;
  }

  if (taskIdsNotified.length > 0) {
    await supabase
      .from('tasks')
      .update({ pre_task_notified_at: now.toISOString() })
      .in('id', taskIdsNotified);
  }

  return NextResponse.json({ ok: true, notified });
}

