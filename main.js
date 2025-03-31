const { app, BrowserWindow, ipcMain, safeStorage} = require('electron');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

//const { Spotify } = require ('spotify-web-playback-sdk');

let mainWindow;
let miniWindow;
let isMiniMode = false;


// Store tokens in same directory as main.js
const TOKEN_PATH = path.join(__dirname, 'spotify_tokens.json');

function storeTokens(tokens) {
  const encrypted = safeStorage.encryptString(JSON.stringify({
    ...tokens,
    expires_at: Date.now() + (tokens.expires_in * 1000)
  }));
  fs.writeFileSync(TOKEN_PATH, encrypted);
}



// Updated auth check with refresh token validation
ipcMain.handle('check-spotify-auth', () => {
  const tokens = loadTokens();
  const hasValidToken = tokens && Date.now() < tokens.expires_at;
  console.log('in the check auth', hasValidToken)
  const hasRefreshToken = !!tokens?.refresh_token;
  return {
    isAuthenticated: hasValidToken,
  };
});

// Config
const SPOTIFY_CONFIG = {
  clientId: 'CLIENT_ID',
  clientSecret: 'CLIENT_SECRET',
  redirectUri: 'http://localhost:3000'
};

// Encrypt and store tokens
function storeTokens(tokens) {
  storedTokens = tokens;
  const encrypted = safeStorage.encryptString(JSON.stringify(tokens));
  fs.writeFileSync(TOKEN_PATH, encrypted);

  const exists = fs.existsSync(TOKEN_PATH);
  console.log('Token file exists after write:', exists);
  if (!exists) throw new Error('File write failed');
}

//Load tokens
function loadTokens() {

  try {
    const encrypted = fs.readFileSync(TOKEN_PATH);
    console.log('tokens loaded, ', safeStorage.decryptString(encrypted))
    return JSON.parse(safeStorage.decryptString(encrypted));
  } catch {
    return null;
  }
}

ipcMain.handle('load-tokens', () => {
  console.log('?')
  return loadTokens();
})


//Initial Spotify Auth
ipcMain.handle('open-spotify-auth', () => {
  console.log('in the auth')
  return new Promise((resolve) => {
    const authWindow = new BrowserWindow({
      // ... your window config
    });

    const authUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams({
      client_id: SPOTIFY_CONFIG.clientId, // Get from env vars
      redirect_uri: SPOTIFY_CONFIG.redirectUri,
      response_type: 'code',
      scope: 'user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private user-library-read'
    })}`;

    // user-read-email user-read-private

    authWindow.loadURL(authUrl);

    authWindow.webContents.on('will-redirect', (event, url) => {
      if (url.startsWith(SPOTIFY_CONFIG.redirectUri)) {
        const code = new URL(url).searchParams.get('code');
        if (code) {
          resolve({ code });
          authWindow.close();
        }
      }
    });
  });
});

// Handle both code exchange AND token refresh
ipcMain.handle('get-spotify-token', async (_, { type, code, refreshToken }) => {
  console.log('in the get tokens')
  try {
    let response;
      console.log('code')
      // Initial token request
      response = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: SPOTIFY_CONFIG.redirectUri,
          client_id: SPOTIFY_CONFIG.clientId,
          client_secret: SPOTIFY_CONFIG.clientSecret
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

    const tokens = {
      access_token: response.data.access_token,
      expires_at: Date.now() + (response.data.expires_in * 1000),
      refresh_token: response.data.refresh_token || refreshToken
    };
    console.log('response:',  tokens)
    storeTokens(tokens);
    return tokens;

  } catch (error) {
    console.error('Token error:', error.response?.data);
    throw new Error(error.response?.data?.error_description || 'Token request failed');
  }
});

ipcMain.handle('check-minimized', ( ) => {
  console.log('in the check minimized', isMiniMode)
  return isMiniMode;
});

function createMainWindow() {
  // Close existing window if it exists
  if (miniWindow) miniWindow.close();

  mainWindow = new BrowserWindow({
    width: 300,
    height: 325,
    x: 0,
    y: 0,
    alwaysOnTop: true,
    transparent: true,
    frame: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });
  mainWindow.loadFile('index.html');
}

function createMiniWindow() {
  if (mainWindow) mainWindow.close();

  miniWindow = new BrowserWindow({
    width: 28,
    height: 64,
    x: 0,
    y: 0,
    alwaysOnTop: true,
    transparent: true,
    frame: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  miniWindow.loadFile('mini.html');

}

app.whenReady().then( async () => {
  loadTokens();
  createMainWindow();

  ipcMain.handle('toggle-window-size', () => {
    isMiniMode = !isMiniMode;
    if (isMiniMode) {
      createMiniWindow();
    } else {
      createMainWindow();
    }
  });
});

// Window cleanup on close
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});