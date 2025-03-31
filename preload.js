const { ipcRenderer, contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleWindowSize: () => ipcRenderer.invoke('toggle-window-size'),
  spotifyAuth: () => ipcRenderer.invoke('open-spotify-auth'),
  spotifyToken: (data) => ipcRenderer.invoke('get-spotify-token', data),
  checkSpotifyAuth: () => ipcRenderer.invoke('check-spotify-auth'),
  loadTokens: () => ipcRenderer.invoke('load-tokens'),
  checkMinimized: () => ipcRenderer.invoke('check-minimized')
});