import { SCHEDULER_API_BASE, SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

const STORAGE_KEY = 'scheduler_auth';

function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: ${id}`);
  return el;
}

function show(el, on) {
  el.hidden = !on;
}

function setText(el, text) {
  el.textContent = text;
}

function nowRoundedToHourLocal() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

async function storageGet(key) {
  return await chrome.storage.local.get(key);
}

async function storageSet(obj) {
  await chrome.storage.local.set(obj);
}

async function storageRemove(key) {
  await chrome.storage.local.remove(key);
}

function readPrefillFromUrl() {
  const url = new URL(window.location.href);
  const prefill = url.searchParams.get('prefill');
  return prefill ? prefill.trim() : '';
}

async function readPrefill() {
  const fromUrl = readPrefillFromUrl();
  if (fromUrl) return fromUrl;

  const stored = await chrome.storage.session.get('scheduler_prefill');
  const text = typeof stored.scheduler_prefill === 'string' ? stored.scheduler_prefill.trim() : '';
  if (text) {
    await chrome.storage.session.remove('scheduler_prefill');
  }
  return text;
}

function toIsoOrNullFromDatetimeLocal(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function isExpired(session) {
  if (!session?.expires_at) return true;
  return Date.now() >= session.expires_at - 15_000;
}

async function supabasePasswordLogin(email, password) {
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data?.error_description || data?.msg || 'Login failed.');
  }

  const expiresAt = Date.now() + Number(data.expires_in || 0) * 1000;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
  };
}

async function supabaseRefresh(refreshToken) {
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data?.error_description || data?.msg || 'Session refresh failed.');
  }

  const expiresAt = Date.now() + Number(data.expires_in || 0) * 1000;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refreshToken,
    expires_at: expiresAt,
  };
}

async function getValidSession() {
  const obj = await storageGet(STORAGE_KEY);
  const session = obj?.[STORAGE_KEY] || null;
  if (!session) return null;

  if (!isExpired(session)) return session;

  if (!session.refresh_token) return null;
  const refreshed = await supabaseRefresh(session.refresh_token);
  await storageSet({ [STORAGE_KEY]: refreshed });
  return refreshed;
}

function setTaskTypeUi(taskType) {
  show($('flexibleFields'), taskType === 'flexible');
  show($('fixedFields'), taskType === 'fixed');
}

async function createTask(session) {
  const title = $('title').value.trim();
  const task_type = $('task_type').value;
  const duration_minutes = Number($('duration_minutes').value);

  if (!title) throw new Error('Please enter a title.');
  if (!Number.isFinite(duration_minutes) || duration_minutes <= 0) {
    throw new Error('Duration must be a positive number.');
  }

  const body = {
    title,
    task_type,
    duration_minutes,
  };

  if (task_type === 'fixed') {
    const scheduled_start = toIsoOrNullFromDatetimeLocal($('scheduled_start').value);
    if (!scheduled_start) throw new Error('Please set a start time for fixed tasks.');
    body.scheduled_start = scheduled_start;
  } else {
    body.priority = Number($('priority').value);
    const deadline = toIsoOrNullFromDatetimeLocal($('deadline').value);
    if (deadline) body.deadline = deadline;
    const notes = $('notes').value.trim();
    if (notes) body.notes = notes;
  }

  const resp = await fetch(`${SCHEDULER_API_BASE}/api/tasks/create`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data?.success) {
    const msg = data?.error || `Request failed (${resp.status})`;
    throw new Error(msg);
  }
}

async function init() {
  const errorBox = $('errorBox');
  const okBox = $('okBox');
  const loginSection = $('loginSection');
  const taskSection = $('taskSection');
  const logoutBtn = $('logoutBtn');
  const loginBtn = $('loginBtn');
  const saveBtn = $('saveBtn');

  function clearBanners() {
    show(errorBox, false);
    show(okBox, false);
    setText(errorBox, '');
    setText(okBox, '');
  }

  function showError(msg) {
    setText(errorBox, msg);
    show(errorBox, true);
    show(okBox, false);
  }

  function showOk(msg) {
    setText(okBox, msg);
    show(okBox, true);
    show(errorBox, false);
  }

  $('task_type').addEventListener('change', (e) => {
    setTaskTypeUi(e.target.value);
  });

  $('scheduled_start').value = nowRoundedToHourLocal();

  const prefill = await readPrefill();
  if (prefill) {
    $('title').value = prefill.slice(0, 500);
  }

  let session = null;
  try {
    session = await getValidSession();
  } catch (err) {
    // If refresh fails, fall back to login.
    await storageRemove(STORAGE_KEY);
    session = null;
  }

  clearBanners();
  setTaskTypeUi($('task_type').value);

  show(loginSection, !session);
  show(taskSection, Boolean(session));
  show(logoutBtn, Boolean(session));

  logoutBtn.addEventListener('click', async () => {
    await storageRemove(STORAGE_KEY);
    session = null;
    clearBanners();
    show(taskSection, false);
    show(logoutBtn, false);
    show(loginSection, true);
  });

  loginBtn.addEventListener('click', async () => {
    clearBanners();
    loginBtn.disabled = true;
    try {
      if (!SUPABASE_URL.includes('supabase.co') || SUPABASE_ANON_KEY.startsWith('YOUR_')) {
        throw new Error('Extension not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in extension/config.js.');
      }

      const email = $('email').value.trim();
      const password = $('password').value;
      if (!email || !password) throw new Error('Email and password are required.');

      session = await supabasePasswordLogin(email, password);
      await storageSet({ [STORAGE_KEY]: session });

      showOk('Signed in.');
      show(loginSection, false);
      show(taskSection, true);
      show(logoutBtn, true);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      loginBtn.disabled = false;
    }
  });

  saveBtn.addEventListener('click', async () => {
    clearBanners();
    saveBtn.disabled = true;
    try {
      if (!session) {
        throw new Error('Please sign in first.');
      }

      // Ensure token is still valid.
      session = await getValidSession();
      if (!session) throw new Error('Session expired. Please sign in again.');

      await createTask(session);
      showOk('Task added.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add task.';
      showError(message);
      if (message.toLowerCase().includes('expired') || message.toLowerCase().includes('token')) {
        await storageRemove(STORAGE_KEY);
        session = null;
        show(taskSection, false);
        show(logoutBtn, false);
        show(loginSection, true);
      }
    } finally {
      saveBtn.disabled = false;
    }
  });
}

init().catch((err) => {
  const box = document.getElementById('errorBox');
  if (box) {
    box.textContent = err instanceof Error ? err.message : 'Extension failed to load.';
    box.hidden = false;
  }
});

