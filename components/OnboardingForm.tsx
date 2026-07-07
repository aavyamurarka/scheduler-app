'use client';

import { useActionState } from 'react';

import {
  savePreferencesAction,
  type SavePreferencesResult,
} from '@/app/actions/preferences';

const initialState: SavePreferencesResult | null = null;

const inputClassName =
  'w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20';

export function OnboardingForm() {
  return <PreferencesForm mode="onboarding" />;
}

type PreferencesFormProps = {
  mode: 'onboarding' | 'edit';
  initialWakeTime?: string;
  initialSleepTime?: string;
};

function normalizeTimeForInput(value: string | undefined): string | undefined {
  if (!value) return undefined;
  // DB stores TIME; Supabase returns string like "07:00:00". <input type="time"> wants "07:00".
  return value.slice(0, 5);
}

export function PreferencesForm({
  mode,
  initialWakeTime,
  initialSleepTime,
}: PreferencesFormProps) {
  const [state, formAction, pending] = useActionState(
    async (prev: SavePreferencesResult | null, formData: FormData) => {
      formData.set('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone);
      return savePreferencesAction(prev, formData);
    },
    initialState
  );

  const wakeDefault = normalizeTimeForInput(initialWakeTime) ?? '07:00';
  const sleepDefault = normalizeTimeForInput(initialSleepTime) ?? '23:00';
  const title =
    mode === 'onboarding' ? 'Welcome to Scheduler' : 'Edit preferences';
  const subtitle =
    mode === 'onboarding'
      ? "When are you usually awake? We'll schedule tasks between these times."
      : "Update your wake-up and sleep times. We'll schedule tasks inside this window.";
  const submitLabel =
    mode === 'onboarding' ? 'Save and continue' : 'Save preferences';

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {subtitle}
        </p>
      </div>

      <form action={formAction} className="space-y-4">

        <div>
          <label htmlFor="wake_time" className="mb-1 block text-sm font-medium text-zinc-700">
            Wake-up time
          </label>
          <input
            id="wake_time"
            name="wake_time"
            type="time"
            required
            defaultValue={wakeDefault}
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="sleep_time" className="mb-1 block text-sm font-medium text-zinc-700">
            Sleep time
          </label>
          <input
            id="sleep_time"
            name="sleep_time"
            type="time"
            required
            defaultValue={sleepDefault}
            className={inputClassName}
          />
        </div>

        <p className="text-xs text-zinc-500">
          Your timezone is detected automatically when you save.
        </p>

        {state && !state.success && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? 'Saving…' : submitLabel}
        </button>
      </form>
    </div>
  );
}
