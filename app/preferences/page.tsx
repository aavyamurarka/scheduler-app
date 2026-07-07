import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PreferencesForm } from '@/components/OnboardingForm';
import { getUserPreferences } from '@/lib/preferences';
import { createClient } from '@/lib/supabase/server';

export default async function PreferencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const preferences = await getUserPreferences(supabase, user.id);

  if (!preferences) {
    redirect('/onboarding');
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <PreferencesForm
          mode="edit"
          initialWakeTime={preferences.wake_time}
          initialSleepTime={preferences.sleep_time}
        />
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Back to schedule
          </Link>
        </div>
      </div>
    </div>
  );
}

