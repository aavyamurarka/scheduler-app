/** Tasks starting in ~14–16 minutes (1-min cron catches each once). */
export function getPreTaskNotificationWindow(now: Date): {
  windowStart: Date;
  windowEnd: Date;
} {
  const windowStart = new Date(now.getTime() + 14 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 16 * 60 * 1000);
  return { windowStart, windowEnd };
}
