'use client';

import { useActionState } from 'react';

import {
  savePreferencesAction,
  type SavePreferencesResult,
} from '@/app/actions/preferences';

const initialState: SavePreferencesResult | null = null;

const labelClass = 'mb-1.5 block text-sm font-medium text-[var(--ink-muted)]';

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
  const title = mode === 'onboarding' ? 'Set your day bounds' : 'Edit preferences';
  const subtitle =
    mode === 'onboarding'
      ? "When are you usually awake? We'll schedule tasks between these times."
      : "Update wake and sleep times. Flexible tasks stay inside this window.";
  const submitLabel = mode === 'onboarding' ? 'Save and continue' : 'Save preferences';

  return (
    <div className="glass-strong bubble-lg w-full max-w-md p-6 sm:p-8">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-hot)]">
          Scheduler
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-[var(--ink)]">
          {title}
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">{subtitle}</p>
      </div>

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="wake_time" className={labelClass}>
            Wake-up time
          </label>
          <input
            id="wake_time"
            name="wake_time"
            type="time"
            required
            defaultValue={wakeDefault}
            className="field"
          />
        </div>

        <div>
          <label htmlFor="sleep_time" className={labelClass}>
            Sleep time
          </label>
          <input
            id="sleep_time"
            name="sleep_time"
            type="time"
            required
            defaultValue={sleepDefault}
            className="field"
          />
        </div>

        <p className="text-xs text-[var(--ink-faint)]">
          Your timezone is detected automatically when you save.
        </p>

        {state && !state.success && (
          <p className="alert alert-error" role="alert">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn-primary w-full text-sm">
          {pending ? 'Saving…' : submitLabel}
        </button>
      </form>
    </div>
  );
}
