import type { AudibleTabInfo } from './types';

/**
 * Safely extracts the domain or readable host from a tab URL.
 */
export function extractHostname(url?: string): string {
  if (!url) return 'Unknown';
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'chrome:' || parsed.protocol === 'chrome-extension:') {
      return parsed.protocol.replace(':', '');
    }
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'Web Page';
  }
}

const MEETING_DOMAINS = [
  'meet.google.com',
  'zoom.us',
  'teams.microsoft.com',
  'teams.live.com',
  'webex.com',
  'slack.com',
  'discord.com',
  'discordapp.com',
  'whereby.com',
  'gather.town',
  'meet.jit.si',
  'around.co',
  'chime.aws',
  'livestorm.co',
  'ringcentral.com',
  'gotomeeting.com',
  'bluejeans.com',
  'streamyard.com',
  'riverside.fm',
];

/**
 * Checks whether a tab is an interactive meeting, call, or live WebRTC audio tool
 * where media cannot be paused/resumed, only muted.
 */
export function isLiveMeetingTab(tab: { url?: string; hostname?: string; title?: string }): boolean {
  const host = (tab.hostname || extractHostname(tab.url)).toLowerCase();
  if (MEETING_DOMAINS.some((domain) => host === domain || host.endsWith('.' + domain))) {
    return true;
  }

  const urlLower = (tab.url || '').toLowerCase();
  if (
    urlLower.includes('meet.google.com') ||
    urlLower.includes('zoom.us/j/') ||
    urlLower.includes('teams.microsoft.com') ||
    urlLower.includes('meet.jit.si') ||
    urlLower.includes('/huddle/') ||
    urlLower.includes('/call/')
  ) {
    return true;
  }

  return false;
}

/**
 * Converts a raw Chrome Tab object into a normalized AudibleTabInfo.
 */
export function normalizeTab(tab: chrome.tabs.Tab): AudibleTabInfo {
  const hostname = extractHostname(tab.url);
  const isMeeting = isLiveMeetingTab({ url: tab.url, hostname, title: tab.title });
  return {
    id: tab.id ?? 0,
    windowId: tab.windowId,
    title: tab.title || 'Untitled Tab',
    url: tab.url || '',
    hostname,
    favIconUrl: tab.favIconUrl,
    audible: Boolean(tab.audible),
    muted: Boolean(tab.mutedInfo?.muted),
    isMeeting,
  };
}

/**
 * Retrieves all tabs currently playing audio across all open windows.
 */
export async function getAudibleTabs(): Promise<AudibleTabInfo[]> {
  try {
    const tabs = await chrome.tabs.query({ audible: true });
    return tabs.filter((t) => t.id !== undefined).map(normalizeTab);
  } catch (error) {
    console.error('[TabWave] Error querying audible tabs:', error);
    return [];
  }
}

/**
 * Retrieves all open tabs across all windows for filtering and search.
 */
export async function getAllTabs(): Promise<AudibleTabInfo[]> {
  try {
    const tabs = await chrome.tabs.query({});
    return tabs.filter((t) => t.id !== undefined).map(normalizeTab);
  } catch (error) {
    console.error('[TabWave] Error querying all tabs:', error);
    return [];
  }
}

/**
 * Jump directly to a tab by activating it and focusing its parent window.
 */
export async function jumpToTab(tabId: number, windowId: number): Promise<boolean> {
  try {
    await chrome.tabs.update(tabId, { active: true });
    await chrome.windows.update(windowId, { focused: true });
    return true;
  } catch (error) {
    console.error(`[TabWave] Failed to jump to tab ${tabId} in window ${windowId}:`, error);
    return false;
  }
}

/**
 * Mute or unmute a specific tab.
 */
export async function setTabMuted(tabId: number, muted: boolean): Promise<boolean> {
  try {
    await chrome.tabs.update(tabId, { muted });
    return true;
  } catch (error) {
    console.error(`[TabWave] Failed to set muted state on tab ${tabId}:`, error);
    return false;
  }
}

/**
 * Mute all currently audible tabs with a single action.
 */
export async function muteAllAudibleTabs(): Promise<void> {
  const audibleTabs = await getAudibleTabs();
  await Promise.all(
    audibleTabs.filter((t) => !t.muted).map((t) => setTabMuted(t.id, true))
  );
}

/**
 * Unmute all muted audible tabs.
 */
export async function unmuteAllAudibleTabs(): Promise<void> {
  const audibleTabs = await getAudibleTabs();
  await Promise.all(
    audibleTabs.filter((t) => t.muted).map((t) => setTabMuted(t.id, false))
  );
}

/**
 * Request optional host permission on demand if not already granted.
 */
export async function requestHostPermission(): Promise<boolean> {
  try {
    const hasPermission = await chrome.permissions.contains({ origins: ['<all_urls>'] });
    if (hasPermission) return true;
    return await chrome.permissions.request({ origins: ['<all_urls>'] });
  } catch (error) {
    console.warn('[TabWave] Error requesting host permissions:', error);
    return false;
  }
}

/**
 * Toggles play/pause on any HTML5 media element or supported web players in the specified tab.
 */
export async function togglePlayPauseTab(
  tabId: number
): Promise<{ success: boolean; permissionDenied?: boolean; noMedia?: boolean; state?: string }> {
  try {
    const hasPermission = await requestHostPermission();
    if (!hasPermission) {
      return { success: false, permissionDenied: true };
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => {
        // Priority 1: Site-specific native player controls (prevents 1-2s auto-resume by host players)
        
        // YouTube Web
        const ytBtn = document.querySelector<HTMLButtonElement>('.ytp-play-button');
        if (ytBtn) {
          ytBtn.click();
          return 'youtube_toggled';
        }

        // YouTube Music
        const ytmBtn = document.querySelector<HTMLButtonElement>('#play-pause-button, .play-pause-button');
        if (ytmBtn) {
          ytmBtn.click();
          return 'ytmusic_toggled';
        }

        // Spotify Web Player
        const spotifyBtn = document.querySelector<HTMLButtonElement>('[data-testid="control-button-playpause"]');
        if (spotifyBtn) {
          spotifyBtn.click();
          return 'spotify_toggled';
        }

        // SoundCloud
        const scBtn = document.querySelector<HTMLButtonElement>('.playControls__play, .playControl');
        if (scBtn) {
          scBtn.click();
          return 'soundcloud_toggled';
        }

        // Priority 2: Generic HTML5 Media (Videos & Audios)
        const allMedia = Array.from(document.querySelectorAll<HTMLMediaElement>('video, audio'));
        if (allMedia.length === 0) {
          return null;
        }

        // Find the specific media element actively playing right now
        const activePlaying = allMedia.find((el) => !el.paused && !el.ended && el.currentTime > 0);

        if (activePlaying) {
          // Pause only the actively playing element
          activePlaying.pause();
          (activePlaying as any).__tabwave_user_paused = true;
          return 'paused';
        }

        // If nothing is playing, find the one previously paused or with progress to resume
        const toResume =
          allMedia.find((el) => (el as any).__tabwave_user_paused) ||
          allMedia.find((el) => el.currentTime > 0 && !el.ended) ||
          allMedia.find((el) => el.duration > 0 && !el.ended) ||
          allMedia[0];

        if (toResume) {
          toResume.play().catch(() => {});
          (toResume as any).__tabwave_user_paused = false;
          return 'playing';
        }

        return null;
      },
    });

    const hasAction = results && results.some((r) => r.result !== null && r.result !== undefined);
    return { success: Boolean(hasAction), noMedia: !hasAction };
  } catch (error) {
    console.warn(`[TabWave] Unable to toggle playback on tab ${tabId}:`, error);
    return { success: false, noMedia: true };
  }
}

/**
 * Checks whether a tab can support media playback (not a chrome internal page or non-playable tool).
 */
export function canTabPlayMedia(tab?: { url?: string; hostname?: string }): boolean {
  if (!tab || !tab.url) return false;
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    return false;
  }
  return true;
}

/**
 * Pauses all currently audible media tabs (excluding live meetings & calls).
 */
export async function pauseAllAudibleTabs(): Promise<void> {
  const audibleTabs = await getAudibleTabs();
  await Promise.all(
    audibleTabs.filter((t) => !t.isMeeting).map((t) => togglePlayPauseTab(t.id))
  );
}
