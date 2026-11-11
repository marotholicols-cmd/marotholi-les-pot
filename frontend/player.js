// ============================================
// MAROTHOLI LES-POT - player.js
// Stays playing outside app + shows cover on Lock Screen
// Preview = 30 sec max, Full = bought songs only
// ============================================

let playerState = { audio: null, song: null, previewEnd: null, isFull: false, timer: null };

function getAudioEl() {
  let el = document.getElementById('mainAudio');
  if (!el) {
    el = document.createElement('audio');
    el.id = 'mainAudio';
    el.preload = 'none';
    document.body.appendChild(el);
  }
  return el;
}

function playWithPlayer(url, song, startSec, endSec, isFull) {
  const audio = getAudioEl();
  playerState.song = song;
  playerState.isFull = !!isFull;
  playerState.previewEnd = isFull ? null : (endSec || (startSec || 0) + 30);

  // Show player bar
  const bar = document.getElementById('playerBar');
  if (bar) bar.classList.add('show');
  const titleEl = document.getElementById('playerTitle');
  const artistEl = document.getElementById('playerArtist');
  const coverEl = document.getElementById('playerCover');
  if (titleEl) titleEl.textContent = song.title || 'Unknown';
  if (artistEl) artistEl.textContent = (song.artist_name || 'Marotholi Les-Pot') + (isFull ? ' • FULL' : ' • PREVIEW 30s');
  if (coverEl) coverEl.src = getCoverUrl(song.cover_url || song.cover_path);

  // Lock Screen - Media Session API
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title || 'Unknown',
        artist: song.artist_name || 'Marotholi Les-Pot',
        album: 'Marotholi Les-Pot',
        artwork: [{ src: getCoverUrl(song.cover_url || song.cover_path), sizes: '512x512', type: 'image/jpeg' }]
      });
      navigator.mediaSession.setActionHandler('play', function() { audio.play(); });
      navigator.mediaSession.setActionHandler('pause', function() { audio.pause(); });
      navigator.mediaSession.setActionHandler('stop', function() { stopPlayer(); });
    } catch (e) {}
  }

  // Stop old timer
  if (playerState.timer) clearInterval(playerState.timer);

  audio.src = url;
  audio.currentTime = startSec || 0;
  audio.play().then(function() {
    updatePlayerBtn();
  }).catch(function(e) {
    alert('Tap Play again to start. Browser blocked auto-play.');
  });

  // Preview cutoff - stop at 30 sec
  if (!isFull && playerState.previewEnd) {
    playerState.timer = setInterval(function() {
      if (audio.currentTime >= playerState.previewEnd) {
        audio.pause();
        clearInterval(playerState.timer);
        updatePlayerBtn();
        const bar2 = document.getElementById('playerBar');
        if (bar2) {
          const artistEl2 = document.getElementById('playerArtist');
          if (artistEl2) artistEl2.textContent = (song.artist_name || '') + ' • Preview ended - Buy for FULL';
        }
      }
    }, 500);
  }

  audio.onplay = updatePlayerBtn;
  audio.onpause = updatePlayerBtn;
  audio.onended = function() {
    if (playerState.timer) clearInterval(playerState.timer);
    updatePlayerBtn();
  };
}

function updatePlayerBtn() {
  const btn = document.getElementById('playerBtn');
  if (!btn) return;
  const audio = getAudioEl();
  btn.textContent = audio.paused ? '▶' : '⏸';
}

function togglePlayer() {
  const audio = getAudioEl();
  if (!audio.src) return;
  if (audio.paused) audio.play(); else audio.pause();
  updatePlayerBtn();
}

function stopPlayer() {
  const audio = getAudioEl();
  audio.pause();
  audio.src = '';
  if (playerState.timer) clearInterval(playerState.timer);
  const bar = document.getElementById('playerBar');
  if (bar) bar.classList.remove('show');
  if ('mediaSession' in navigator) {
    try { navigator.mediaSession.metadata = null; } catch(e) {}
  }
}