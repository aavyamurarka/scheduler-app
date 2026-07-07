export type TaskType = 'fixed' | 'flexible';

export type TaskStatus = 'pending' | 'scheduled' | 'completed';

export type Task = {
  id: string;
  user_id: string;
  title: string;
  task_type: TaskType;
  duration_minutes: number;
  priority: number | null;
  deadline: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  status: TaskStatus;
  created_at: string;
  google_event_id: string | null;
};

export type NewTask = {
  title: string;
  task_type: TaskType;
  duration_minutes: number;
  priority?: number | null;
  deadline?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  status?: TaskStatus;
};

export type GoogleCalendarTokens = {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  updated_at: string;
};

export type UserPreferences = {
  user_id: string;
  wake_time: string;
  sleep_time: string;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type PushSubscription = {
  user_id: string;
  onesignal_subscription_id: string;
  created_at: string;
  updated_at: string;
};
