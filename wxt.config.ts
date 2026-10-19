import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  outDir: 'dist',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'TabEcho - Audio Tab Finder & Controller',
    description: 'Find, jump to, and mute tabs playing audio across all windows.',
    version: '1.0.0',
    permissions: ['tabs', 'storage', 'scripting'],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'TabEcho - Find Audio Tabs',
      default_popup: 'popup.html',
    },
    commands: {
      _execute_action: {
        suggested_key: {
          default: 'Alt+K',
          mac: 'Alt+K',
        },
        description: 'Open TabEcho popup',
      },
      jump_to_recent_audio: {
        suggested_key: {
          default: 'Alt+P',
          mac: 'Alt+P',
        },
        description: 'Jump to most recently audible tab',
      },
    },
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      96: 'icon/96.png',
      128: 'icon/128.png',
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
