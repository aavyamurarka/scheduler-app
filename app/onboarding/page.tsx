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
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4 py-12">
      <OnboardingForm />
    </div>
  );
}
