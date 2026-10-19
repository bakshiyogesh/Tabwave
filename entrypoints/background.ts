import { recordAudioPlayback, removeTabFromHistory, updateTabInHistory, getMostRecentAudioEntry } from '../lib/history';
import { jumpToTab, getAudibleTabs } from '../lib/tabs';

export default defineBackground(() => {
  /**
   * Recomputes and updates the extension toolbar badge showing the count of audible tabs.
   * Clears badge if count is 0.
   */
  async function updateAudibleBadge(): Promise<void> {
    try {
      const audibleTabs = await getAudibleTabs();
      const count = audibleTabs.length;

      if (count > 0) {
        await chrome.action.setBadgeText({ text: count.toString() });
        await chrome.action.setBadgeBackgroundColor({ color: '#4f46e5' }); // Modern indigo
        if (chrome.action.setBadgeTextColor) {
          await chrome.action.setBadgeTextColor({ color: '#ffffff' });
        }
      } else {
        await chrome.action.setBadgeText({ text: '' });
      }
    } catch (err) {
      console.error('[TabEcho Background] Failed to update badge:', err);
    }
  }

  // --- TAB AUDIBLE & STATUS UPDATES ---
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Check if audio state changed
    if (typeof changeInfo.audible !== 'undefined') {
      if (changeInfo.audible) {
        await recordAudioPlayback(tab);
      }
      await updateAudibleBadge();
    }

    // Check if metadata changed (title, url, favicon)
    if (changeInfo.title || changeInfo.url || changeInfo.favIconUrl) {
      await updateTabInHistory(tabId, {
        title: changeInfo.title || tab.title,
        url: changeInfo.url || tab.url,
        favIconUrl: changeInfo.favIconUrl || tab.favIconUrl,
        windowId: tab.windowId,
      });
    }
  });

  // --- TAB REMOVED ---
  chrome.tabs.onRemoved.addListener(async (tabId) => {
    await removeTabFromHistory(tabId);
    await updateAudibleBadge();
  });

  // --- TAB ATTACHED TO NEW WINDOW ---
  chrome.tabs.onAttached.addListener(async (tabId, attachInfo) => {
    await updateTabInHistory(tabId, { windowId: attachInfo.newWindowId });
  });

  // --- KEYBOARD COMMANDS (Alt+P, etc.) ---
  chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'jump_to_recent_audio') {
      // 1. Check if any tab is currently playing audio right now
      const audibleTabs = await getAudibleTabs();
      if (audibleTabs.length > 0 && audibleTabs[0]) {
        const target = audibleTabs[0];
        await jumpToTab(target.id, target.windowId);
        return;
      }

      // 2. Otherwise jump to the most recently audible tab from history
      const mostRecent = await getMostRecentAudioEntry();
      if (mostRecent) {
        await jumpToTab(mostRecent.tabId, mostRecent.windowId);
      }
    }
  });

  // --- EXTENSION STARTUP / RESTART ---
  chrome.runtime.onStartup.addListener(async () => {
    await updateAudibleBadge();
  });

  chrome.runtime.onInstalled.addListener(async () => {
    await updateAudibleBadge();
  });

  // Initial badge update when background service worker wakes up
  updateAudibleBadge();
});
