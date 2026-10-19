import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  Search,
  ExternalLink,
  Clock,
  Radio,
  X,
  Volume1,
  Play,
  Pause,
  AlertCircle,
} from 'lucide-react';
import type { AudibleTabInfo, RecentAudioEntry } from '../../lib/types';
import {
  getAudibleTabs,
  getAllTabs,
  jumpToTab,
  setTabMuted,
  muteAllAudibleTabs,
  unmuteAllAudibleTabs,
  togglePlayPauseTab,
  pauseAllAudibleTabs,
} from '../../lib/tabs';
import { getRecentAudioHistory } from '../../lib/history';
import { isPro, PRO_FEATURES } from '../../lib/license';
import { IconButton } from './IconButton';

// Feature flag to control PRO badge visibility
const SHOW_PRO_BADGE = false;

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [audibleTabs, setAudibleTabs] = useState<AudibleTabInfo[]>([]);
  const [allTabs, setAllTabs] = useState<AudibleTabInfo[]>([]);
  const [recentHistory, setRecentHistory] = useState<RecentAudioEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showProModal, setShowProModal] = useState(false);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load all tabs & history
  const refreshData = async () => {
    const [audible, all, history] = await Promise.all([
      getAudibleTabs(),
      getAllTabs(),
      getRecentAudioHistory(),
    ]);
    setAudibleTabs(audible);
    setAllTabs(all);
    setRecentHistory(history);
  };

  useEffect(() => {
    refreshData();

    // Listen for live changes while popup is open
    const handleTabUpdated = () => refreshData();
    const handleTabRemoved = () => refreshData();

    chrome.tabs.onUpdated.addListener(handleTabUpdated);
    chrome.tabs.onRemoved.addListener(handleTabRemoved);

    // Auto-focus search input for keyboard-first experience
    searchInputRef.current?.focus();

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
      chrome.tabs.onRemoved.removeListener(handleTabRemoved);
    };
  }, []);

  // Filtered tabs for search view
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return allTabs.filter(
      (tab) =>
        tab.title.toLowerCase().includes(q) ||
        tab.url.toLowerCase().includes(q) ||
        tab.hostname.toLowerCase().includes(q)
    );
  }, [allTabs, searchQuery]);

  // Keep selectedIndex in bounds when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Keyboard navigation: Arrow keys & Enter
  const handleKeyDown = async (e: React.KeyboardEvent) => {
    const isSearching = searchQuery.trim().length > 0;
    const currentListLength = isSearching ? searchResults.length : audibleTabs.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentListLength > 0) {
        setSelectedIndex((prev) => (prev + 1) % currentListLength);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentListLength > 0) {
        setSelectedIndex((prev) => (prev - 1 + currentListLength) % currentListLength);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isSearching && searchResults[selectedIndex]) {
        const target = searchResults[selectedIndex];
        await jumpToTab(target.id, target.windowId);
        window.close();
      } else if (!isSearching && audibleTabs[selectedIndex]) {
        const target = audibleTabs[selectedIndex];
        await jumpToTab(target.id, target.windowId);
        window.close();
      }
    } else if (e.key === 'Escape') {
      if (searchQuery) {
        setSearchQuery('');
      } else {
        window.close();
      }
    }
  };

  // Format relative timestamp
  const formatTimeAgo = (timestamp: number): string => {
    const elapsedSeconds = Math.floor((Date.now() - timestamp) / 1000);
    if (elapsedSeconds < 60) return 'Just now';
    const minutes = Math.floor(elapsedSeconds / 60);
    if (minutes === 1) return '1m ago';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const handleMuteToggle = async (e: React.MouseEvent, tab: AudibleTabInfo) => {
    e.stopPropagation();
    await setTabMuted(tab.id, !tab.muted);
    setAudibleTabs((prev) =>
      prev.map((t) => (t.id === tab.id ? { ...t, muted: !t.muted } : t))
    );
  };

  const allMuted = audibleTabs.length > 0 && audibleTabs.every((t) => t.muted);

  const handleToggleMuteAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (allMuted) {
      await unmuteAllAudibleTabs();
    } else {
      await muteAllAudibleTabs();
    }
    refreshData();
  };

  const handlePlayPauseToggle = async (e: React.MouseEvent, tabId: number) => {
    e.stopPropagation();
    const result = await togglePlayPauseTab(tabId);
    if (result.permissionDenied) {
      setPermissionNotice('Page access was not granted to pause media. Mute still works without it.');
      return;
    }
    setPermissionNotice(null);
    await refreshData();
    setTimeout(refreshData, 500);
  };

  const handlePauseAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await pauseAllAudibleTabs();
    refreshData();
  };

  return (
    <div
      className="w-[360px] min-h-[420px] max-h-[580px] flex flex-col font-sans select-none overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xl"
      onKeyDown={handleKeyDown}
    >
      {/* HEADER */}
      <header className="px-3 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/70 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/30">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight flex items-center gap-1.5 leading-none">
              TabEcho
              <span className="text-[10px] font-mono px-1 py-0.2 bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
                v1.0
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {audibleTabs.length > 0 && (
            <>
              <IconButton
                icon={Pause}
                label="Pause all tabs"
                text="Pause all"
                onClick={handlePauseAll}
              />
              <IconButton
                icon={allMuted ? VolumeX : Volume2}
                label={allMuted ? 'Unmute all tabs' : 'Mute all tabs'}
                text={allMuted ? 'Unmute all' : 'Mute all'}
                danger={allMuted}
                onClick={handleToggleMuteAll}
              />
            </>
          )}

          {SHOW_PRO_BADGE && isPro() && (
            <button
              onClick={() => setShowProModal(true)}
              className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:opacity-90 transition-opacity flex items-center gap-1 h-[28px]"
              title="View Pro features"
            >
              PRO
            </button>
          )}
        </div>
      </header>

      {/* PERMISSION NOTICE (IF DENIED) */}
      {permissionNotice && (
        <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/50 flex items-start justify-between gap-2 text-[11px] text-amber-800 dark:text-amber-300">
          <div className="flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>{permissionNotice}</span>
          </div>
          <button
            onClick={() => setPermissionNotice(null)}
            className="text-amber-600 dark:text-amber-400 hover:opacity-80 p-0.5"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SEARCH INPUT */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-2.5 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search all open tabs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-7 py-2 bg-zinc-100 dark:bg-zinc-800/80 rounded-md border border-transparent focus:border-indigo-500 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div ref={listRef} className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/50">
        {searchQuery.trim() ? (
          /* SEARCH RESULTS VIEW */
          <div className="py-1">
            <div className="px-3 py-1.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center justify-between">
              <span>Matching Tabs ({searchResults.length})</span>
              <span className="text-[10px] lowercase font-normal">↑↓ to pick, ↵ to jump</span>
            </div>

            {searchResults.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">No matching tabs found</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Try searching a different title or URL</p>
              </div>
            ) : (
              searchResults.map((tab, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={tab.id}
                    onClick={() => {
                      jumpToTab(tab.id, tab.windowId);
                      window.close();
                    }}
                    className={`px-3 py-2 flex items-center gap-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    {/* Favicon or fallback */}
                    <div className="relative flex-shrink-0 w-4 h-4 flex items-center justify-center">
                      {tab.favIconUrl ? (
                        <img
                          src={tab.favIconUrl}
                          alt=""
                          className="w-4 h-4 rounded-sm object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-600 dark:text-zinc-300">
                          {tab.hostname.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {tab.audible && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900 animate-pulse" />
                      )}
                    </div>

                    {/* Title & Hostname */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate flex items-center gap-1.5">
                        <span className="truncate">{tab.title}</span>
                        {tab.audible && (
                          <span className="flex-shrink-0 text-[10px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                            Playing
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                        {tab.hostname}
                      </div>
                    </div>

                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400 opacity-60 flex-shrink-0" />
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* DEFAULT VIEW: NOW PLAYING & RECENTLY PLAYED */
          <>
            {/* NOW PLAYING SECTION */}
            <section className="py-2">
              <div className="px-3 py-1 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    {audibleTabs.length > 0 && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        audibleTabs.length > 0 ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'
                      }`}
                    ></span>
                  </span>
                  <span>Now Playing ({audibleTabs.length})</span>
                </div>
              </div>

              {audibleTabs.length === 0 ? (
                <div className="px-4 py-5 text-center flex flex-col items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-2">
                    <Volume1 className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Nothing playing right now
                  </p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                    Audio tabs will show up here automatically
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100/60 dark:divide-zinc-800/40">
                  {audibleTabs.map((tab, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={tab.id}
                        onClick={() => {
                          jumpToTab(tab.id, tab.windowId);
                          window.close();
                        }}
                        className={`group px-3 py-2 flex items-center gap-2.5 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        {/* Favicon & Mini Equalizer Container */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <div className="relative w-4 h-4 flex items-center justify-center">
                            {tab.favIconUrl ? (
                              <img
                                src={tab.favIconUrl}
                                alt=""
                                className="w-4 h-4 rounded-sm object-contain"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-600 dark:text-zinc-300">
                                {tab.hostname.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          {/* Equalizer Indicator next to favicon */}
                          <div
                            className="flex items-end gap-0.5 h-3.5 w-3"
                            title={tab.muted ? 'Muted' : 'Playing audio'}
                            aria-hidden="true"
                          >
                            {tab.audible && !tab.muted ? (
                              <>
                                <span className="w-0.5 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-eq-1 inline-block" />
                                <span className="w-0.5 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-eq-2 inline-block" />
                                <span className="w-0.5 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-eq-3 inline-block" />
                              </>
                            ) : (
                              <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600 my-auto" />
                            )}
                          </div>
                        </div>

                        {/* Title & Hostname */}
                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-xs font-medium truncate text-zinc-900 dark:text-zinc-100 transition-opacity ${
                              tab.muted ? 'opacity-70' : ''
                            }`}
                          >
                            {tab.title}
                          </div>
                          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate flex items-center gap-1.5">
                            <span>{tab.hostname}</span>
                            {tab.muted && (
                              <span className="text-[10px] text-red-500 font-medium">
                                (Muted)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right Actions: Exactly Two 28px IconButtons with 4px gap */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <IconButton
                            icon={Pause}
                            label="Pause tab"
                            onClick={(e) => handlePlayPauseToggle(e, tab.id)}
                          />
                          <IconButton
                            icon={tab.muted ? VolumeX : Volume2}
                            label={tab.muted ? 'Unmute tab' : 'Mute tab'}
                            danger={tab.muted}
                            onClick={(e) => handleMuteToggle(e, tab)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* RECENTLY PLAYED SECTION */}
            <section className="py-2">
              <div className="px-3 py-1 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <span>Recently Played (Past 30m)</span>
                </div>
                <span className="text-[10px]">{recentHistory.length} tabs</span>
              </div>

              {recentHistory.length === 0 ? (
                <div className="px-4 py-4 text-center">
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    No recent audio history in the last 30 minutes
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100/60 dark:divide-zinc-800/40 max-h-[190px] overflow-y-auto">
                  {recentHistory.map((item) => (
                    <div
                      key={`${item.tabId}-${item.lastAudibleAt}`}
                      onClick={() => {
                        jumpToTab(item.tabId, item.windowId);
                        window.close();
                      }}
                      className="px-3 py-2 flex items-center gap-2.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      {/* Favicon */}
                      <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                        {item.favicon ? (
                          <img
                            src={item.favicon}
                            alt=""
                            className="w-4 h-4 rounded-sm object-contain opacity-80"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-600 dark:text-zinc-300">
                            {item.hostname.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Title & Hostname */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-normal truncate text-zinc-800 dark:text-zinc-200">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                          {item.hostname}
                        </div>
                      </div>

                      {/* Right side: Time Ago + Action */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          {formatTimeAgo(item.lastAudibleAt)}
                        </span>
                        <IconButton
                          icon={Play}
                          label="Resume tab"
                          onClick={(e) => handlePlayPauseToggle(e, item.tabId)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* FOOTER SHORTCUTS */}
      <footer className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>
            <kbd className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-[9px]">
              Alt+P
            </kbd>{' '}
            Jump to audio
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-[9px]">
              Alt+K
            </kbd>{' '}
            Open popup
          </span>
        </div>
        <div className="text-[9px] text-zinc-400">
          <kbd className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-[9px]">
            ↵
          </kbd>{' '}
          Jump
        </div>
      </footer>

      {/* PRO FEATURES PREVIEW MODAL (GATED) */}
      {showProModal && SHOW_PRO_BADGE && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 rounded-t-xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-xs font-semibold">TabEcho Pro Features</h3>
              <button
                onClick={() => setShowProModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2">
              Coming in v2! The core audio finder & controller is 100% free and local.
            </p>

            <div className="mt-3 space-y-2">
              {PRO_FEATURES.map((feature) => (
                <div
                  key={feature.id}
                  className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-700/50"
                >
                  <div className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
                    <span>{feature.name}</span>
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
                      Planned
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    {feature.description}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <span className="text-[10px] text-zinc-400">Current tier: Free</span>
              <button
                onClick={() => setShowProModal(false)}
                className="text-xs px-3 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:opacity-90"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
