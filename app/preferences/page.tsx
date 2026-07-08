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
    <div className="relative flex min-h-full flex-1 items-center justify-center overflow-hidden px-4 py-12">
      <div
        className="ambient-orb -left-8 bottom-16 h-48 w-48 bg-[radial-gradient(circle,rgba(90,140,180,0.22),transparent_70%)]"
        aria-hidden
      />
      <div className="w-full max-w-md">
        <PreferencesForm
          mode="edit"
          initialWakeTime={preferences.wake_time}
          initialSleepTime={preferences.sleep_time}
        />
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm font-medium text-[var(--accent-hot)] hover:underline">
            Back to schedule
          </Link>
        </div>
      </div>
    </div>
  );
}
