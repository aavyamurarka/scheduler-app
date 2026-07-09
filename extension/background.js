const MENU_ID = 'scheduler_add_as_task';
const PREFILL_KEY = 'scheduler_prefill';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'Add as task',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== MENU_ID) return;

  const text = (info.selectionText ?? '').trim();
  if (!text) return;

  await chrome.storage.session.set({ [PREFILL_KEY]: text });

  // Prefer the native extension popup (small panel under the toolbar).
  try {
    await chrome.action.openPopup();
    return;
  } catch {
    // openPopup unavailable or blocked — fall back to a compact window.
  }

  await chrome.windows.create({
    url: chrome.runtime.getURL('popup.html'),
    type: 'popup',
    width: 380,
    height: 520,
    focused: true,
  });
});
