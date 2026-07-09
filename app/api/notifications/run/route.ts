import { NextResponse, type NextRequest } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getPreTaskNotificationWindow } from '@/lib/notification-timing';

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
      Authorization: `Key ${args.apiKey}`,
    },
    body: JSON.stringify({
      app_id: args.appId,
      target_channel: 'push',
      headings: { en: args.title },
      contents: { en: args.message },
      include_subscription_ids: args.subscriptionIds,
    }),
  });

  const text = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(`OneSignal send failed: ${res.status} ${text}`);
  }

  try {
    const body = JSON.parse(text) as { errors?: string[]; id?: string };
    if (body.errors && body.errors.length > 0) {
      throw new Error(`OneSignal send failed: ${body.errors.join('; ')}`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('OneSignal send failed:')) {
      throw err;
    }
  }
}
function isAuthorized(request: NextRequest): boolean {
  const expectedSecret = process.env.CRON_SECRET?.trim();
  if (!expectedSecret) {
    return false;
  }

  const headerSecret = request.headers.get('x-cron-secret')?.trim();
  if (headerSecret && headerSecret === expectedSecret) {
    return true;
  }

  // cron-job.org free UI may only support GET URLs with no custom headers.
  const querySecret = request.nextUrl.searchParams.get('secret')?.trim();
  return Boolean(querySecret && querySecret === expectedSecret);
}

function authDebug(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET?.trim() ?? '';
  const querySecret = request.nextUrl.searchParams.get('secret')?.trim() ?? '';
  const headerSecret = request.headers.get('x-cron-secret')?.trim() ?? '';

  return {
    hasCronSecretConfigured: Boolean(expectedSecret),
    expectedSecretLength: expectedSecret.length,
    providedQuerySecretLength: querySecret.length,
    providedHeaderSecretLength: headerSecret.length,
    querySecretProvided: querySecret.length > 0,
    lengthsMatch:
      (querySecret.length > 0 && querySecret.length === expectedSecret.length) ||
      (headerSecret.length > 0 && headerSecret.length === expectedSecret.length),
  };
}

async function runNotifications() {
  try {
    const onesignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    const onesignalApiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!onesignalAppId || !onesignalApiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing OneSignal env vars.',
          hasOneSignalAppId: Boolean(onesignalAppId),
          hasOneSignalRestApiKey: Boolean(onesignalApiKey),
        },
        { status: 500 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing SUPABASE_SERVICE_ROLE_KEY in Vercel env vars.',
        },
        { status: 500 }
      );
    }

    const supabase = createAdminClient();

    const now = new Date();
    const { windowStart, windowEnd } = getPreTaskNotificationWindow(now);

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id,user_id,title,scheduled_start')
      .is('pre_task_notified_at', null)
      .neq('status', 'completed')
      .gte('scheduled_start', windowStart.toISOString())
      .lt('scheduled_start', windowEnd.toISOString());

    if (tasksError) {
      return NextResponse.json(
        {
          ok: false,
          error: tasksError.message,
          hint:
            tasksError.message.includes('pre_task_notified_at')
              ? 'Run supabase/migrations/005_pre_task_notified_at.sql in Supabase SQL Editor.'
              : undefined,
        },
        { status: 500 }
      );
    }

    const dueTasks = (tasks ?? []) as TaskRow[];
    if (dueTasks.length === 0) {
      return NextResponse.json({
        ok: true,
        notified: 0,
        dueTasks: 0,
        skippedNoSubscriptions: 0,
      });
    }

    let notified = 0;
    let skippedNoSubscriptions = 0;
    const taskIdsNotified: string[] = [];
    const errors: string[] = [];

    for (const task of dueTasks) {
      const { data: subs, error: subsError } = await supabase
        .from('push_subscriptions')
        .select('onesignal_subscription_id')
        .eq('user_id', task.user_id);

      if (subsError) {
        errors.push(`task ${task.id}: ${subsError.message}`);
        continue;
      }

      const subscriptionIds = ((subs ?? []) as PushSubscriptionRow[])
        .map((s) => s.onesignal_subscription_id)
        .filter(Boolean);

      if (subscriptionIds.length === 0) {
        skippedNoSubscriptions += 1;
        continue;
      }

      try {
        await sendOneSignalPush({
          appId: onesignalAppId,
          apiKey: onesignalApiKey,
          subscriptionIds,
          title: 'Up next',
          message: task.title,
        });
        taskIdsNotified.push(task.id);
        notified += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown send error';
        errors.push(`task ${task.id}: ${message}`);
      }
    }

    if (taskIdsNotified.length > 0) {
      await supabase
        .from('tasks')
        .update({ pre_task_notified_at: now.toISOString() })
        .in('id', taskIdsNotified);
    }

    return NextResponse.json({
      ok: errors.length === 0,
      notified,
      dueTasks: dueTasks.length,
      skippedNoSubscriptions,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function unauthorizedResponse(request: NextRequest) {
  return NextResponse.json(
    {
      ok: false,
      error: 'Unauthorized',
      // Helps debug env setup without leaking the secret value.
      ...authDebug(request),
    },
    { status: 401 }
  );
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return unauthorizedResponse(request);
  }

  return runNotifications();
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return unauthorizedResponse(request);
  }

  return runNotifications();
}
