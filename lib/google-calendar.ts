const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_READONLY_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

export function getGoogleRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/api/google-calendar/callback`;
}

export function getGoogleClientId(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not set in .env.local');
  }
  return clientId;
}

export function getGoogleClientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) {
    throw new Error('GOOGLE_CLIENT_SECRET is not set in .env.local');
  }
  return secret;
}

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    redirect_uri: getGoogleRedirectUri(),
    response_type: 'code',
    scope: CALENDAR_READONLY_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type: string;
};

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      redirect_uri: getGoogleRedirectUri(),
      grant_type: 'authorization_code',
    }),
  });

  const data = (await response.json()) as TokenResponse & { error?: string };

  if (!response.ok || !data.access_token) {
    throw new Error(data.error ?? 'Failed to exchange Google auth code');
  }

  return data;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = (await response.json()) as TokenResponse & { error?: string };

  if (!response.ok || !data.access_token) {
    throw new Error(data.error ?? 'Failed to refresh Google access token');
  }

  return data;
}

export type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

export function getTodayBounds(): { timeMin: string; timeMax: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { timeMin: start.toISOString(), timeMax: end.toISOString() };
}

export async function fetchTodaysEvents(accessToken: string): Promise<GoogleCalendarEvent[]> {
  const { timeMin, timeMax } = getTodayBounds();
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const data = (await response.json()) as {
    items?: GoogleCalendarEvent[];
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message ?? 'Failed to fetch Google Calendar events');
  }

  return data.items ?? [];
}

export function eventDurationMinutes(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const minutes = Math.round((end - start) / (60 * 1000));
  return Math.max(1, minutes);
}
