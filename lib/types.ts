export interface AudibleTabInfo {
  id: number;
  windowId: number;
  title: string;
  url: string;
  hostname: string;
  favIconUrl?: string;
  audible: boolean;
  muted: boolean;
}

export interface RecentAudioEntry {
  tabId: number;
  windowId: number;
  title: string;
  url: string;
  hostname: string;
  favicon?: string;
  lastAudibleAt: number; // Unix timestamp in ms
}

export interface TabEchoStorage {
  recentAudioHistory?: RecentAudioEntry[];
}
