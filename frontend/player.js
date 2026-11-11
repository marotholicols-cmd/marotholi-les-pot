// ============================================================
// MAROTHOLI LES-POT - player.js - MUSIC PLAYER
// 30s preview for non-owners, full song for owners
// ============================================================

let audio = null;
let currentSong = null;
let previewTimer = null;
let isPreviewMode = false;
let isPlaying = false;

const PREVIEW_SECONDS = 30;

function getMiniPlayerEls() {
  return {
    bar: document.getElementById('miniPlayer'),
    cover: document.getElementById('pCover'),
    title: document.getElementById('pTitle'),
    artist: document.getElementById('pArtist'),
    playBtn: document.getElementById('pPlayBtn')
  };
}

function showMiniPlayer() {
  const els = getMiniPlayerEls();
  if (els.bar) els.bar.classList.remove('hidden');
}

function hideMiniPlayer() {
  const els = getMiniPlayerEls();
  if (els.bar) els.bar.classList.add('hidden');
}

function updatePlayBtn() {
  const els = getMiniPlayerEls();
  if (els.playBtn) els.playBtn.textContent = isPlaying ? '⏸' : '▶';
}

function clearPreviewTimer() {
  if (previewTimer) {
    clearTimeout(previewTimer);
    previewTimer = null;
  }
}

// Main function - called from index.html / discover.html
// playSong(audioUrl, title, artist, coverUrl, isPreview)
function playSong(url, title, artist, cover, isPreview) {
  if (!url) {
    alert('This song has no audio link.');
    return;
  }

  // Stop old song
  stopSong(false);

  currentSong = { url: url, title: title || 'Untitled', artist: artist || 'Marotholi', cover: cover || '' };
  isPreviewMode = !!isPreview;

  const els = getMiniPlayerEls();
  if (els.cover) {
    els.cover.src = currentSong.cover || 'icon.svg';
    els.cover.onerror = function () { this.src = 'icon.svg'; };
  }
  if (els.title) els.title.textContent = currentSong.title + (isPreviewMode ? ' — 30s Preview' : ' — Full Song');
  if (els.artist) els.artist.textContent = currentSong.artist;
  showMiniPlayer();

  audio = new Audio(url);
  audio.preload = 'auto';

  audio.onplay = function () {
    isPlaying = true;
    updatePlayBtn();
  };
  audio.onpause = function () {
    isPlaying = false;
    updatePlayBtn();
  };
  audio.onended = function () {
    isPlaying = false;
    updatePlayBtn();
    clearPreviewTimer();
  };
  audio.onerror = function () {
    alert('Could not play this song. The audio link may be broken. Ask the artist to re-upload.');
    isPlaying = false;
    updatePlayBtn();
  };

  // Preview limit - stop at 30s and prompt to buy
  if (isPreviewMode) {
    clearPreviewTimer();
    previewTimer = setTimeout(function () {
      if (audio) audio.pause();
      isPlaying = false;
      updatePlayBtn();
      alert('⏱ 30s preview ended.\n\nBuy "' + currentSong.title + '" to listen to the full song.\n\nTop up: EcoCash 128235 • Postbank 1040278800016');
    }, PREVIEW_SECONDS * 1000);
  }

  audio.play().catch(function (err) {
    console.warn('Play blocked:', err);
    alert('Tap Play again to start the song.');
  });
  isPlaying = true;
  updatePlayBtn();
}

function togglePlay() {
  if (!audio) return;
  if (audio.paused) {
    audio.play().catch(function () {});
    isPlaying = true;
  } else {
    audio.pause();
    isPlaying = false;
  }
  updatePlayBtn();
}

function stopSong(hideBar) {
  clearPreviewTimer();
  if (audio) {
    try { audio.pause(); } catch (e) {}
    try { audio.src = ''; } catch (e) {}
    audio = null;
  }
  isPlaying = false;
  currentSong = null;
  updatePlayBtn();
  if (hideBar !== false) hideMiniPlayer();
}

function resumeSong() {
  if (audio && audio.paused) {
    audio.play().catch(function () {});
    isPlaying = true;
    updatePlayBtn();
  }
}

// Expose globally
window.playSong = playSong;
window.togglePlay = togglePlay;
window.stopSong = stopSong;
window.resumeSong = resumeSong;
