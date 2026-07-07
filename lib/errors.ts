export type AppError = {
  code: string;
  message: string;
};

export function toAppError(error: unknown): AppError {
  if (error instanceof Error) {
    console.error('[Scheduler]', error);
    return { code: 'UNKNOWN', message: 'Something went wrong. Please try again.' };
  }
  return { code: 'UNKNOWN', message: 'Something went wrong. Please try again.' };
}
