import type { RecentAudioEntry } from './types';
import { extractHostname, isLiveMeetingTab } from './tabs';

const STORAGE_KEY = 'tabwave_recent_audio';
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Retrieves the recently played audio history from chrome.storage.local,
 * filtering out any entries older than 30 minutes.
 */
export async function getRecentAudioHistory(): Promise<RecentAudioEntry[]> {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const history: RecentAudioEntry[] = data[STORAGE_KEY] || [];
    const now = Date.now();

    // Filter out items older than 30 minutes
    const validHistory = history.filter((item) => now - item.lastAudibleAt <= MAX_AGE_MS);

    // If any items were pruned, save back to storage
    if (validHistory.length !== history.length) {
      await chrome.storage.local.set({ [STORAGE_KEY]: validHistory });
    }

    // Sort with most recent first
    return validHistory.sort((a, b) => b.lastAudibleAt - a.lastAudibleAt);
  } catch (error) {
    console.error('[TabWave] Failed to retrieve audio history:', error);
    return [];
  }
}

/**
 * Records or updates an entry when a tab starts playing audio.
 */
export async function recordAudioPlayback(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id) return;

  try {
    const history = await getRecentAudioHistory();
    const now = Date.now();

    // Remove existing entry for this tabId if present
    const filtered = history.filter((item) => item.tabId !== tab.id);

    const hostname = extractHostname(tab.url);
    const isMeeting = isLiveMeetingTab({ url: tab.url, hostname, title: tab.title });

    const newEntry: RecentAudioEntry = {
      tabId: tab.id,
      windowId: tab.windowId,
      title: tab.title || 'Untitled Tab',
      url: tab.url || '',
      hostname,
      favicon: tab.favIconUrl,
      lastAudibleAt: now,
      isMeeting,
    };

    // Prepend new entry and enforce max 50 items
    const updated = [newEntry, ...filtered].slice(0, 50);
    await chrome.storage.local.set({ [STORAGE_KEY]: updated });
  } catch (error) {
    console.error('[TabWave] Failed to record audio playback:', error);
  }
}

/**
 * Removes an entry from recent audio history when the corresponding tab closes.
 */
export async function removeTabFromHistory(tabId: number): Promise<void> {
  try {
    const history = await getRecentAudioHistory();
    const updated = history.filter((item) => item.tabId !== tabId);
    await chrome.storage.local.set({ [STORAGE_KEY]: updated });
  } catch (error) {
    console.error(`[TabWave] Failed to remove tab ${tabId} from history:`, error);
  }
}

/**
 * Updates metadata (title, URL, favicon) of an existing audio history entry if the tab changes.
 */
export async function updateTabInHistory(
  tabId: number,
  changes: { title?: string; url?: string; favIconUrl?: string; windowId?: number }
): Promise<void> {
  try {
    const history = await getRecentAudioHistory();
    let updated = false;

    const newHistory = history.map((item) => {
      if (item.tabId === tabId) {
        updated = true;
        return {
          ...item,
          title: changes.title ?? item.title,
          url: changes.url ?? item.url,
          hostname: changes.url ? extractHostname(changes.url) : item.hostname,
          favicon: changes.favIconUrl ?? item.favicon,
          windowId: changes.windowId ?? item.windowId,
        };
      }
      return item;
    });

    if (updated) {
      await chrome.storage.local.set({ [STORAGE_KEY]: newHistory });
    }
  } catch (error) {
    console.error(`[TabWave] Failed to update tab ${tabId} in history:`, error);
  }
}

/**
 * Returns the most recently played tab that is still open.
 */
export async function getMostRecentAudioEntry(): Promise<RecentAudioEntry | null> {
  const history = await getRecentAudioHistory();
  return history[0] || null;
}
