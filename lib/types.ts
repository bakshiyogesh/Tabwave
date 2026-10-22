export interface AudibleTabInfo {
  id: number;
  windowId: number;
  title: string;
  url: string;
  hostname: string;
  favIconUrl?: string;
  audible: boolean;
  muted: boolean;
  isMeeting?: boolean;
}

export interface RecentAudioEntry {
  tabId: number;
  windowId: number;
  title: string;
  url: string;
  hostname: string;
  favicon?: string;
  lastAudibleAt: number; // Unix timestamp in ms
  isMeeting?: boolean;
}

export interface TabWaveStorage {
  recentAudioHistory?: RecentAudioEntry[];
}
