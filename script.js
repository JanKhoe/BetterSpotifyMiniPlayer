const test = document.getElementById('jansenTest')

const config = {
  clientId: 'CLIENT_ID',
  redirectUri: 'http://localhost:3000', // Must match Spotify Dashboard
  clientSecret: 'CLIENT_SECRET',
  accessToken: ''
};

let errorCount = 0;
const MAX_ERRORS = 5;
let pollingIntervalId = null;
let currentData;

const slider = document.querySelector('.slider');



async function getSpotifyData() {

  try{
    // 1. Check existing auth
    const {isAuthenticated} = await window.electronAPI.checkSpotifyAuth(

    );

    if (isAuthenticated) {
      // 2A. Use existing token (will auto-refresh if needed)
      config.accessToken = await refreshTokenIfNeeded();
    } else {
      // 2B. Full auth flow
      const { code } = await window.electronAPI.spotifyAuth(
        {
        clientId: config.clientId,
        redirectUri: config.redirectUri
      });
      const tokens = await window.electronAPI.spotifyToken({
        type: 'code',
        code
      });
      config.accessToken = tokens.access_token;
    }
    const result = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${config.accessToken}` }
    });

    if(result.status === 204){
      return null;
    }

    errorCount = 0;
    return await result.json();
  }
  catch (error){
    errorCount++;
    console.error('API Error:', error);
    if (errorCount >= MAX_ERRORS) stopPolling();
    return null;
  }
}


function setProgress(percent) {
  document.querySelector('.progress-bar').style.width = `${percent}%`;
}

async function updateUI(data) {
  if (!data?.item) {
    document.getElementById('Title').textContent = 'No active playback';
    document.getElementById('Artist').textContent = '';
    document.getElementById('song-art').src = 'placeholder.png';
    document.getElementsByClassName('bi-shuffle')[0].classList.remove('active')
    document.getElementsByClassName('bi-repeat')[0].classList.remove('active')

    return;
  }

  const { item } = data;
  document.getElementById('Title').textContent = item.name;
  document.getElementById('Artist').textContent =
    item.artists.map(a => a.name).join(', ');
  document.getElementById('song-art').src =
    item.album.images[0]?.url;
  if(data.is_playing){
    document.getElementById('is-playing').classList.add('none')
    document.getElementById('is-not-playing').classList.remove('none')
  }
  else{
    document.getElementById('is-playing').classList.remove('none')
    document.getElementById('is-not-playing').classList.add('none')
  }
  if(data.repeat_state == "off")document.getElementsByClassName('bi-repeat')[0].classList.remove('active');
  else if(data.repeat_state == "context") document.getElementsByClassName('bi-repeat')[0].classList.add('active');

  if(data.shuffle_state == false)document.getElementsByClassName('bi-shuffle')[0].classList.remove('active');
  else  document.getElementsByClassName('bi-shuffle')[0].classList.add('active');

  setProgress((data.progress_ms/data.item.duration_ms).toFixed(2) * 100)

  slider.value = data.device.volume_percent
  console.log(data.device.volume_percent);

}


async function refreshTokenIfNeeded() {
  const tokens = await window.electronAPI.loadTokens();
  if (Date.now() < tokens.expires_at) return tokens.access_token;

  // Token expired - refresh it
  const newTokens = await window.electronAPI.spotifyToken({
    type: 'refresh',
    refreshToken: tokens.refresh_token
  });
  return newTokens.access_token;
}

var exitButton = document.getElementById('exit');
exitButton.addEventListener('click', e => {
  window.close();
})

document.getElementById('minimize').addEventListener('click', async e => {
  const container = document.getElementsByClassName('main-window')[0];
  const playbackButtons = document.getElementById('playback-buttons');
  const songTextInfo = document.getElementsByClassName('song-information-container')[0]
  const progressBar = document.getElementsByClassName('progress-container')[0]
  const playlistContainer = document.getElementsByClassName('playlist-container')[0]

  // const maximize = document.getElementById('maximize')
  // maximize.classList.toggle('none')
  const response = await new Promise(async (resolve) => {

    playbackButtons.classList.add('none')
    songTextInfo.classList.add('none')
    progressBar.classList.add('none')
    playlistContainer.classList.remove('active')
    playlistContainer.classList.add('mini')
    console.log('hi1')
    resolve();
  }).then( async () => {
    container.classList.toggle('minimized');
    console.log('hi2')
    let currentX = window.screenX;
    let currentY = window.screenY;
    console.log(currentX, currentY)
    const steps = 20;
    const interval = setInterval(() => {
      currentX -= Math.ceil(currentX / steps);
      currentY -= Math.ceil(currentY / steps);

      if (currentX <= 0 && currentY <= 0) {
        window.moveTo(0, 0);
        clearInterval(interval);
      } else {
        window.moveTo(currentX, currentY);
      }
    }, 8);

    setInterval( async e => {
      await window.electronAPI.toggleWindowSize();
    }, 500)

  })
});


document.getElementById('maximize').addEventListener('click', async e => {

  const maximize = document.getElementById('maximize')
  maximize.classList.toggle('none')

  window.resizeTo(310, 335)

  setInterval( async e => {
    await window.electronAPI.toggleWindowSize();
  }, 500)

  const container = document.getElementsByClassName('main-window')[0];
  container.classList.toggle('minimized');

})

document.getElementById('play-controls-container').addEventListener('click', async e => {

    const endpoint = currentData.is_playing ? 'pause' : 'play'
    const result = await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${config.accessToken}` }
  });
  setTimeout( () => {
    startPolling();
  }, 1000)
})

document.getElementsByClassName('bi-fast-forward-fill')[0].addEventListener('click', async e => {
  const result = await fetch(`https://api.spotify.com/v1/me/player/next`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${config.accessToken}` }
  });

  if(result === 200){
    setTimeout( () => {
      startPolling();
    }, 1000)
  }

});

document.getElementsByClassName('bi-rewind-fill')[0].addEventListener('click', async e => {
  const result = await fetch(`https://api.spotify.com/v1/me/player/previous`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${config.accessToken}` }
  });

  setTimeout( () => {
    startPolling();
  }, 1000)
});

document.getElementsByClassName('bi-repeat')[0].addEventListener('click', async e => {
  const endpoint =document.getElementsByClassName('bi-repeat')[0].classList.contains('active') ? 'state=off' : 'state=context'
  const result = await fetch(`https://api.spotify.com/v1/me/player/repeat?${endpoint}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${config.accessToken}` }
  });

  if(result.status === 200){
    document.getElementsByClassName('bi-repeat')[0].classList.toggle('active')
  }

  setTimeout( () => {
    startPolling();
  }, 1000)
});

document.getElementsByClassName('bi-shuffle')[0].addEventListener('click', async e => {
  const endpoint =document.getElementsByClassName('bi-shuffle')[0].classList.contains('active') ? 'state=false' : 'state=true'
  const result = await fetch(`https://api.spotify.com/v1/me/player/shuffle?${endpoint}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${config.accessToken}` }
  });
  if(result.status === 200){
    document.getElementsByClassName('bi-shuffle')[0].classList.toggle('active')
  }

  setTimeout( () => {
    startPolling();
  }, 1000)
});



slider.addEventListener('input', async (e) => {
  console.log(`Volume: ${e.target.value}%`); // Log volume to console
  const endpoint = 'volume_percent=' + e.target.value
  const result = await fetch(`https://api.spotify.com/v1/me/player/volume?${endpoint}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${config.accessToken}` }
  });
});

let sliderTimeOutID;


slider.addEventListener('mouseup', () => {
  console.log('mouse up')
  if(sliderTimeOutID){
    console.log('timeout clearned')
    clearTimeout(sliderTimeOutID)
  }

  sliderTimeOutID = setTimeout( () => {
    startPolling();
  }, 1500)
})


document.getElementsByClassName('list-container')[0].addEventListener('click', async () => {
  const playlistcontainer = document.getElementsByClassName('playlist-container')[0]
  if(playlistcontainer.classList.contains('active')){
    
    playlistcontainer.classList.toggle('active')
    setTimeout(() => {
      playlistcontainer.classList.toggle('none')
      window.resizeTo(300, 325)
    }, 1000);
  }
  else{
    window.resizeTo(500, 325)
    playlistcontainer.classList.toggle('none')
    setTimeout(() => {
      playlistcontainer.classList.toggle('active')
    }, 10);
  }

})





async function startPolling(){
  stopPolling();

  const pollFunction = async () => {
    console.log('polled!', Date.now())
    const data = await getSpotifyData();
    currentData = data;

    await updateUI(data);
  };

  pollFunction();
  pollingIntervalId = setInterval(pollFunction, 2000); // Store interval ID
}
function stopPolling() {
  if (pollingIntervalId) {
    console.log('polling stoped')
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }
}

function createPlaylistElement(title, imageUrl, uri, size) {
  // Create container div
  const playlist = document.createElement('div');
  playlist.className = 'playlist';

  playlist.addEventListener('click', async () => {
    console.log(uri)
    const result = await fetch(`https://api.spotify.com/v1/me/player/play`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        context_uri: uri,
        offset: {
          position: Math.floor(Math.random() * size)
        },
        position_ms: 0
      })
    });
  })

  // Create mask div
  const mask = document.createElement('div');
  mask.className = 'playlist-mask';

  // Create image element
  const img = document.createElement('img');
  img.className = 'playlist-img';
  if (imageUrl) img.src = imageUrl;

  // Create title div
  const titleDivcontainer = document.createElement('div');
  titleDivcontainer.className = 'playlist-title';

  const playlistTitle = document.createElement('p')
  playlistTitle.innerHTML = title || 'Playlist Title';
  titleDivcontainer.appendChild(playlistTitle)

  // Assemble structure
  playlist.appendChild(mask);
  playlist.appendChild(img);
  playlist.appendChild(titleDivcontainer);

  return playlist;
}

window.onload = async (event) => {
  const Title = document.getElementById('Title')
  const Artist = document.getElementById('Artist')
  const SongImage = document.getElementById('song-art')
  const isMinimized = await window.electronAPI.checkMinimized();
  if(isMinimized){
    return;
  }
  console.log("page is fully loaded");
  Title.innerHTML = "fetching..."
  let data =await getSpotifyData();

  console.log(data ? data : null)

  startPolling();

  let result = await fetch(`https://api.spotify.com/v1/me/playlists`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${config.accessToken}` }
  });

  data = await result.json()
  console.log( data)

  if(data){
    data.items.forEach(element => {
      const playlistItem = createPlaylistElement(element.name, element.images[0].url, element.uri, element.tracks.total)
      document.getElementsByClassName('playlist-container')[0].append(playlistItem)
    });
  }

  result = await fetch(`https://api.spotify.com/v1/me/albums`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${config.accessToken}` }
  });

  data = await result.json()
  console.log( data)

  if(data){
    data.items.forEach(element => {
      const playlistItem = createPlaylistElement(element.album.name, element.album.images[0].url, element.album.uri, element.album.tracks.total)
      document.getElementsByClassName('playlist-container')[0].append(playlistItem)
    });
  }

// I turbo stole this from chatGPT btw. Im sorry
// 1. Create the scrollable container (do this once)
const playlistContainer = document.getElementsByClassName('playlist-container')[0];


// 2. Make it scrollable without visible scrollbars
Object.assign(playlistContainer.style, {
  overflow: 'hidden',
  cursor: 'grab',
  userSelect: 'none'
});

// 3. Variables for drag scrolling
let isDragging = false;
let startY, scrollTop;

// 4. Mouse wheel scrolling
playlistContainer.addEventListener('wheel', (e) => {
  e.preventDefault();
  playlistContainer.scrollTop += e.deltaY;
});

// 5. Click-and-drag scrolling (absolute-position compatible)
playlistContainer.addEventListener('mousedown', (e) => {
  isDragging = true;
  startY = e.clientY; // Use clientY instead of pageY for absolute positioning
  scrollTop = playlistContainer.scrollTop;
  playlistContainer.style.cursor = 'grabbing';
  document.body.style.userSelect = 'none'; // Prevent text selection during drag
});

document.addEventListener('mouseup', () => {
  isDragging = false;
  playlistContainer.style.cursor = 'grab';
  document.body.style.userSelect = '';
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  e.preventDefault();
  const y = e.clientY;
  const walk = (y - startY) * 2;
  playlistContainer.scrollTop = scrollTop - walk;
});

// 6. Handle mouse leaving the window
document.addEventListener('mouseleave', () => {
  isDragging = false;
  playlistContainer.style.cursor = 'grab';
  document.body.style.userSelect = '';
});

};


