# BetterSpotify Mini Player

A lightweight Spotify mini-player built with ElectronJS and the Spotify Web API, featuring:
- Playlist and album selection directly from the player.
- Minimalist user interface with the ability to minimize the player.
- All other features present in the default spotify miniplayer (playback controls, always on top)

### Prerequisites
- Node.js
- npm
- Spotify Premium account

## Setup & Installation

### 1. Register a Spotify Application
- Visit the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications)
- Create a new application and fill in the required details
- Note these credentials from your application dashboard:
  - Client ID
  - Client Secret
- Add a Redirect URI (example: `http://localhost:3000` - this is required but not actively used)

### 2. Configure the Application
- Clone or download this repository
- Replace the following placeholders in the codebase:
  - `CLIENT_ID` with your actual Spotify Client ID
  - `CLIENT_SECRET` with your actual Spotify Client Secret

### 3. Install Dependencies
Open a terminal in the project directory and run:
npm install

### 4. Launch the Application
Start the mini-player by running:
npm run start
