'use strict';

const { app, BrowserWindow, shell, session, globalShortcut, Menu } = require('electron');
const path = require('path');

const LUNA_URL = 'https://luna.amazon.com/';

// Luna blocks Linux and non-Chromium browsers by user agent alone. We present
// a plain Chrome-on-Windows UA matching the real Chromium major version that
// Electron ships, so the "browser too old" check keeps passing on upgrades.
const chromeMajor = process.versions.chrome.split('.')[0];
const USER_AGENT =
  `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ` +
  `(KHTML, like Gecko) Chrome/${chromeMajor}.0.0.0 Safari/537.36`;

// Hosts the app is allowed to navigate within. Anything else (support pages,
// store links) opens in the default browser instead.
const ALLOWED_HOSTS = /(^|\.)amazon\.(com|co\.uk|de|fr|es|it|ca|co\.jp)$|(^|\.)a2z\.com$|(^|\.)amazoncognito\.com$|(^|\.)cloudfront\.net$/;

let win = null;

function isAllowed(url) {
  try {
    return ALLOWED_HOSTS.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: '#0f1114',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'build', 'icons', '256x256.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.setUserAgent(USER_AGENT);

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowed(url)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (!isAllowed(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Games request pointer lock / fullscreen themselves; let the page drive it.
  win.webContents.on('enter-html-full-screen', () => win.setFullScreen(true));
  win.webContents.on('leave-html-full-screen', () => win.setFullScreen(false));

  win.loadURL(LUNA_URL);
  win.on('closed', () => { win = null; });
}

// Streaming needs these regardless of window focus.
app.commandLine.appendSwitch('disable-features', 'UserAgentClientHint');
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecodeLinuxGL');
app.commandLine.appendSwitch('enable-gamepad-button-axis-events');

app.whenReady().then(() => {
  session.defaultSession.setUserAgent(USER_AGENT);

  // Luna asks for gamepad + fullscreen style permissions; grant only what a
  // game stream needs, deny the rest without prompting.
  const GRANTED = new Set(['fullscreen', 'pointerLock', 'keyboardLock', 'gamepad', 'clipboard-sanitized-write']);
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => {
    cb(GRANTED.has(permission));
  });

  Menu.setApplicationMenu(null);
  createWindow();

  globalShortcut.register('F11', () => {
    if (win) win.setFullScreen(!win.isFullScreen());
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => globalShortcut.unregisterAll());

app.on('window-all-closed', () => app.quit());
