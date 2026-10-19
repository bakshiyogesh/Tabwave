# TabEcho 🎧

> **Find, jump to, and mute any tab playing audio across 40+ tabs and multiple windows.**

TabEcho is a lightweight, local-only Chrome extension (Manifest V3) that solves a universal frustration: *"I have 40 tabs open, something is playing audio, and I can't find which tab."*

---

## ⚡ Features (v1 Free Tier)

1. **"Now Playing" Live Audio List**:
   - Lists all open tabs where `tab.audible === true`.
   - Displays favicon, page title, clean hostname, and an animated equalizer sound indicator.
   - Shows muted state indicator when tab audio is silenced.
2. **One-Click Instant Jump**:
   - Clicking any tab row immediately focuses its window and activates the tab (`chrome.tabs.update` + `chrome.windows.update`).
3. **Play / Pause Media Control**:
   - Per-row Play/Pause button directly in the popup to pause or resume media playback without switching to the tab.
   - Header "Pause All" button to instantly pause all media playing across all tabs.
   - Quick resume button on "Recently Played" entries to restart paused audio.
4. **Per-Row & Global Mute Controls**:
   - Per-row mute/unmute toggle button without losing focus or needing to navigate away.
   - "Mute All" / "Unmute All" batch toggle in the header.
5. **"Recently Played" (30-Minute Window)**:
   - Stateless-safe background service worker tracks tabs that were audible in the past 30 minutes (`tabId`, `windowId`, `title`, `url`, `favicon`, `lastAudibleAt`).
   - Automatically cleans up tabs when closed or when expired (>30 minutes).
5. **Universal Tab Quick-Search**:
   - Top search box filters all open tabs (not just audible ones) by title and URL.
   - Live "Playing" badge for audible matches.
   - Keyboard-first: navigate with `↑` / `↓` and press `Enter` to jump.
6. **Dynamic Toolbar Audio Badge**:
   - Shows the count of currently audible tabs on the extension icon; automatically clears when count is 0.
7. **Keyboard Shortcuts (Commands API)**:
   - `Alt+P`: Jump directly to the most recently audible tab.
   - `Alt+K`: Open the TabEcho popup.

---

## 🏗️ Architecture & Stack

- **Framework**: [WXT](https://wxt.dev) + React 19 + TypeScript
- **Styling**: Tailwind CSS + custom equalizer keyframes (automatic system light/dark mode support)
- **Icons**: Lucide React + custom multi-resolution high-DPI soundwave icons
- **State & Storage**: Pure `chrome.storage.local` with stateless service worker resilience (MV3 safe)
- **Permissions**: Strictly `tabs` and `storage`. No host permissions, no content scripts, no network calls.
- **Extensible Licensing**: Includes `lib/license.ts` stub with future Pro feature gating (full-text search, transcript search, sessions, sync).

### Directory Structure

```text
├── entrypoints/
│   ├── background.ts        # Stateless MV3 service worker (audio events, badge, shortcuts)
│   └── popup/
│       ├── index.html       # Extension popup HTML entry
│       ├── main.tsx         # React root initialization
│       ├── App.tsx          # Main UI: Now Playing, Search, History, Equalizer
│       └── style.css        # Tailwind CSS + equalizer animations
├── lib/
│   ├── types.ts             # TypeScript interfaces for tabs & audio history
│   ├── tabs.ts              # Chrome tabs query, jump, and mute abstractions
│   ├── history.ts           # 30-min audio history storage & lifecycle sync
│   └── license.ts           # Licensing & Pro feature gating stubs
├── public/
│   └── icon/                # Extension icons (16, 32, 48, 96, 128 px)
├── package.json
├── tsconfig.json
├── wxt.config.ts            # Manifest V3 configuration & commands
└── README.md
```

---

## 🚀 Dev, Build & Load Instructions

Always use `pnpm` in this repository:

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Run in Development Mode
```bash
pnpm run dev
```
This spins up the WXT dev server with Hot Module Replacement (HMR) and automatically launches an isolated Chrome instance with TabEcho loaded.

### 3. Build for Production
```bash
pnpm run build
```
The compiled, ready-to-load extension will be placed in `dist/chrome-mv3`.

### 4. Load Unpacked in Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** via the toggle switch in the top-right corner.
3. Click **Load unpacked**.
4. Select the build directory:
   ```text
   /home/thirdweb/work/Tabwave/dist/chrome-mv3
   ```
5. TabEcho is now installed and active! Pin it to your Chrome toolbar for quick access.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| <kbd>Alt</kbd> + <kbd>K</kbd> | Open TabEcho | Triggers `_execute_action` to open popup |
| <kbd>Alt</kbd> + <kbd>P</kbd> | Jump to Audio | Instantly focuses the most recently audible tab |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Navigate | Move selection up or down through the list |
| <kbd>Enter</kbd> | Jump | Focus and activate the selected tab |
| <kbd>Esc</kbd> | Clear / Close | Clears current search query or closes popup |

*Note: You can customize shortcuts at any time via `chrome://extensions/shortcuts`.*

---

## 📦 Chrome Web Store Assets Checklist

### 1. Required Icon Sizes
- [x] **16x16** (`public/icon/16.png`): Extension favicon
- [x] **32x32** (`public/icon/32.png`): Windows high-DPI display
- [x] **48x48** (`public/icon/48.png`): Extensions management page
- [x] **96x96** (`public/icon/96.png`): High-resolution displays
- [x] **128x128** (`public/icon/128.png`): Chrome Web Store listing & installation

### 2. Store Metadata
- **Extension Name**: TabEcho - Audio Tab Finder & Controller
- **Short Description (Max 132 chars)**:
  > *Instantly find, jump to, and mute any browser tab currently or recently playing audio across multiple windows.*
- **Category**: Productivity / Accessibility
- **Language**: English

### 3. Single Purpose Justification
TabEcho exists solely to detect audible browser tabs, display their playback status, and allow users to switch to or mute them with minimal friction.

### 4. Permissions Justification
- `tabs`: Required strictly to read `tab.audible`, `tab.mutedInfo`, title, URL, and favicon, and to invoke `chrome.tabs.update` for jumping and muting.
- `storage`: Required to store the last 30 minutes of audible tab history in `chrome.storage.local`.
- `scripting`: Required to send pause/play control signals to media elements.
- `optional_host_permissions`: `<all_urls>` is declared as **optional** only. It is never requested at install time. Page access is requested only on-demand when the user clicks the Pause button, and no page content is ever read, indexed, or stored.

---

## 🔒 Privacy Policy

**TabEcho is 100% local and privacy-respecting:**
- **Zero Tracking**: No analytics, telemetry, fingerprinting, or tracking scripts.
- **Zero Network Calls**: No external servers, APIs, or databases. The extension functions completely offline.
- **Local Storage Only**: The 30-minute audio history is stored strictly on your device inside `chrome.storage.local` and never leaves your browser.
- **On-Demand Page Access**: Optional host access is requested exclusively when you click the "Pause" button to pause media. No page content or DOM text is read, recorded, or transmitted.
- **Automatic Pruning**: Closed tabs and entries older than 30 minutes are automatically deleted.

---

## 🧪 Short Test Plan

To verify all features, perform this structured test across multiple windows:

### Setup
1. Open **Window 1** with 10–15 tabs, including:
   - **Tab A**: A [YouTube](https://www.youtube.com) video playing audio.
   - **Tab B**: [X / Twitter](https://x.com) with a video playing with sound.
2. Open **Window 2** on another screen or side-by-side with:
   - **Tab C**: [Spotify Web Player](https://open.spotify.com) playing music.
   - 10 miscellaneous tabs (docs, articles, search).

### Verification Steps
1. **Toolbar Badge**:
   - Confirm the extension icon displays a badge count of `3`.
2. **"Now Playing" List**:
   - Press <kbd>Alt</kbd>+<kbd>K</kbd> to open TabEcho.
   - Verify all 3 tabs appear under **Now Playing** with their favicons, hostnames (`youtube.com`, `x.com`, `open.spotify.com`), and animated equalizer bars.
3. **Cross-Window Jump**:
   - In Window 1, open TabEcho and click the Spotify tab row.
   - Verify Window 2 is focused and the Spotify tab is activated.
4. **Per-Row Mute**:
   - Click the mute speaker icon on the YouTube row.
   - Verify the audio cuts out, the icon turns into a red muted indicator, and the equalizer animation pauses.
5. **Global Mute / Unmute**:
   - Click "Mute All" in the header; verify all playing tabs mute. Click "Unmute All" to restore.
6. **"Recently Played" Section**:
   - Pause the Spotify playback.
   - After a few moments, open TabEcho. Verify Spotify moved from **Now Playing** to **Recently Played** with a "Just now" timestamp.
   - Close the Spotify tab. Re-open TabEcho and verify Spotify was removed from history.
7. **Search & Keyboard Navigation**:
   - Type `you` in the search box.
   - Verify only matching tabs appear with an emerald "Playing" badge on YouTube.
   - Press <kbd>↓</kbd> then <kbd>Enter</kbd>; verify focus jumps directly to YouTube.
8. **Alt+P Shortcut**:
   - Switch to an empty tab and press <kbd>Alt</kbd>+<kbd>P</kbd>.
   - Verify it immediately jumps to the actively audible or most recently audible tab.
## Roadmap

Planned, in no fixed order. The free core stays free.

- Search inside open tabs (page text)
- Search video and podcast transcripts
- Saved tab sessions

Want something first? comment down .