'use client';

type DayChoice = 'today' | 'tomorrow';

type DayToggleProps = {
  value: DayChoice;
  onChange: (day: DayChoice) => void;
  className?: string;
};

export function DayToggle({ value, onChange, className = '' }: DayToggleProps) {
  const base =
    'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]';
  const active = 'bg-[var(--accent)] text-white shadow-sm';
  const idle =
    'bg-transparent text-[var(--ink-muted)] hover:bg-white/60 hover:text-[var(--ink)]';

  return (
    <div
      className={`inline-flex rounded-lg border border-[var(--glass-border)] bg-white/50 p-0.5 ${className}`}
      role="group"
      aria-label="Choose day"
    >
      <button
        type="button"
        className={`${base} ${value === 'today' ? active : idle}`}
        aria-pressed={value === 'today'}
        onClick={() => onChange('today')}
      >
        Today
      </button>
      <button
        type="button"
        className={`${base} ${value === 'tomorrow' ? active : idle}`}
        aria-pressed={value === 'tomorrow'}
        onClick={() => onChange('tomorrow')}
      >
        Tomorrow
      </button>
    </div>
  );
}
