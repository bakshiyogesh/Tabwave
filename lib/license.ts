/**
 * TabEcho Licensing & Feature Gating module
 * In v1 free tier, isPro() returns false.
 */

export interface ProFeature {
  id: string;
  name: string;
  description: string;
}

export const PRO_FEATURES: ProFeature[] = [
  {
    id: 'full-text-search',
    name: 'Full-Text Tab Search',
    description: 'Index tab titles, meta descriptions, and page text to search across hundreds of tabs.',
  },
  {
    id: 'transcript-search',
    name: 'Live Audio Transcript Search',
    description: 'Search what was spoken inside YouTube, podcasts, and meeting tabs.',
  },
  {
    id: 'audio-sessions',
    name: 'Saved Audio Sessions',
    description: 'Bookmark and restore audio workspaces and playlist tabs with one click.',
  },
  {
    id: 'cloud-sync',
    name: 'Cross-Device Audio Sync',
    description: 'Seamlessly switch audio sessions and mute state between your desktop & laptop.',
  },
];

/**
 * Returns true if the user has an active Pro license.
 * In v1, this returns false (free tier).
 */
export function isPro(): boolean {
  return false;
}

/**
 * Helper to check whether a specific feature is enabled.
 */
export function hasFeature(featureId: string): boolean {
  if (isPro()) {
    return true;
  }
  // Free tier features:
  const freeFeatures = ['now-playing', 'recently-played', 'quick-search', 'shortcuts', 'mute-control'];
  return freeFeatures.includes(featureId);
}
