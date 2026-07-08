import { redirect } from 'next/navigation';

import { OnboardingForm } from '@/components/OnboardingForm';
import { createClient } from '@/lib/supabase/server';
import { getUserPreferences } from '@/lib/preferences';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const preferences = await getUserPreferences(supabase, user.id);

  if (preferences) {
    redirect('/');
  }

  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center overflow-hidden px-4 py-12">
      <div
        className="ambient-orb right-0 top-20 h-56 w-56 bg-[radial-gradient(circle,rgba(224,138,79,0.35),transparent_70%)]"
        aria-hidden
      />
      <OnboardingForm />
    </div>
  );
}
