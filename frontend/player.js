// Marotholi Les-Pot - Persistent Player v3 - BEST VERSION
// ONE player for whole app. Uses #mainAudio + #playerBar if page has them,
// otherwise creates a mini bar. Music resumes across pages.
// Preview = 30s from artist preview_start, Full = after purchase
// NOTE: This is the ONLY file that declares let currentSong. Do NOT declare it in any .html file.

let audioEl = null;
let currentSong = null;
let _previewTimer = null;

function getSaved() {
  try { return JSON.parse(localStorage.getItem('lespot_now_playing') || 'null'); }
  catch (e) { return null; }
}
function saveState() {
  if (!audioEl || !currentSong) return;
  try {
    const data = {
      id: currentSong.id || '',
      title: currentSong.title || 'Song',
      artist_name: currentSong.artist_name || currentSong.artist || '',
      artist: currentSong.artist_name || currentSong.artist || '',
      url: currentSong.url || currentSong.audio_url || currentSong.audio || '',
      cover_url: currentSong.cover_url || currentSong.cover || '',
      cover_path: currentSong.cover_path || '',
      preview_start: Number(currentSong.preview_start || currentSong.previewStart || 0),
      preview_seconds: Number(currentSong.preview_seconds || currentSong.preview_duration || 30),
      preview_end: Number(currentSong.preview_end || (Number(currentSong.preview_start || 0) + 30)),
      previewOnly: !!currentSong.previewOnly,
      time: audioEl.currentTime || 0,
      playing: !audioEl.paused,
      updated: Date.now()
    };
    localStorage.setItem('lespot_now_playing', JSON.stringify(data));
  } catch(e) {}
}
function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' + sec : sec);
}

// --- Use existing bar in index.html if it exists, else make mini bar ---
function getPlayerUI() {
  // index.html bar
  const bar = document.getElementById('playerBar');
  if (bar) {
    return {
      bar: bar,
      title: document.getElementById('playerTitle'),
      sub: document.getElementById('playerArtist'),
      cover: document.getElementById('playerCover'),
      btn: document.getElementById('playerBtn'),
      time: null
    };
  }
  // Mini bar for other pages (wallet, discover, library...)
  let mini = document.getElementById('miniPlayer');
  if (!mini) {
    mini = document.createElement('div');
    mini.id = 'miniPlayer';
    mini.style.cssText = 'position:fixed;bottom:58px;left:10px;right:10px;background:#1e1e1e;border:1px solid #d4ff3f;border-radius:14px;padding:10px;display:flex;align-items:center;gap:10px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.5)';
    mini.innerHTML = '<img id="miniCover" src="icon.svg" style="width:42px;height:42px;border-radius:10px;object-fit:cover;background:#333;flex-shrink:0">' +
      '<div style="flex:1;min-width:0"><div id="miniTitle" style="font-weight:800;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff">No song</div>' +
      '<div id="miniSub" style="font-size:11px;opacity:.7;color:#fff">Tap to resume</div></div>' +
      '<span id="miniTime" style="font-size:11px;opacity:.7;color:#fff;flex-shrink:0">0:00</span>' +
      '<button id="miniPlayBtn" style="background:#d4ff3f;border:0;width:42px;height:42px;border-radius:50%;font-size:18px;cursor:pointer;flex-shrink:0">▶</button>';
    document.body.appendChild(mini);
    document.getElementById('miniPlayBtn').onclick = toggleMini;
    document.getElementById('miniCover').onclick = toggleMini;
  }
  return {
    bar: mini,
    title: document.getElementById('miniTitle'),
    sub: document.getElementById('miniSub'),
    cover: document.getElementById('miniCover'),
    btn: document.getElementById('miniPlayBtn'),
    time: document.getElementById('miniTime')
  };
}
function showMiniPlayer(song) {
  const ui = getPlayerUI();
  if (!ui.bar) return;
  ui.bar.style.display = 'flex';
  if (ui.bar.classList) ui.bar.classList.add('show');
  if (ui.title) ui.title.textContent = song.title || 'Song';
  if (ui.sub) ui.sub.textContent = (song.artist_name || song.artist || '') + (song.previewOnly ? ' • PREVIEW 30s' : ' • FULL');
  if (ui.cover) {
    let c = song.cover_url || song.cover || '';
    if ((!c || !String(c).startsWith('http')) && (song.cover_path || song.cover_url) && typeof getCoverUrl === 'function') {
      c = getCoverUrl(song.cover_path || song.cover_url);
    }
    ui.cover.src = c || 'icon.svg';
  }
  updateMiniBtn();
}
function updateMiniBtn() {
  const ui = getPlayerUI();
  if (!ui.btn || !audioEl) return;
  const isPlaying = !audioEl.paused;
  ui.btn.textContent = isPlaying ? '⏸' : '▶';
  if (ui.time) ui.time.textContent = formatTime(audioEl.currentTime);
}
function toggleMini() {
  togglePlayer();
}

// --- ONE audio element for whole app ---
function ensureAudio() {
  if (audioEl) return audioEl;
  // Reuse #mainAudio from index.html if page has it - NO second audio!
  const existing = document.getElementById('mainAudio');
  if (existing) {
    audioEl = existing;
  } else {
    audioEl = new Audio();
    audioEl.id = 'mainAudio';
    audioEl.preload = 'auto';
    audioEl.style.display = 'none';
    document.body.appendChild(audioEl);
  }
  audioEl.setAttribute('playsinline', '');
  // Clear old listeners by cloning? We only attach once because audioEl is singleton
  if (!audioEl._lespotBound) {
    audioEl._lespotBound = true;
    audioEl.addEventListener('timeupdate', function() {
      saveState();
      updateMiniBtn();
      // Preview cut-off - NO alert spam, just stop + show text
      if (currentSong && currentSong.previewOnly && currentSong.preview_end) {
        if (audioEl.currentTime >= Number(currentSong.preview_end)) {
          audioEl.pause();
          if (_previewTimer) clearInterval(_previewTimer);
          updateMiniBtn();
          const ui = getPlayerUI();
          if (ui.sub) ui.sub.textContent = (currentSong.artist_name || currentSong.artist || '') + ' • PREVIEW ENDED - Buy for full';
        }
      }
    });
    audioEl.addEventListener('play', function() { updateMiniBtn(); saveState(); });
    audioEl.addEventListener('pause', function() { updateMiniBtn(); saveState(); });
    audioEl.addEventListener('ended', function() {
      if (currentSong && currentSong.previewOnly) {
        // Preview ended naturally
      } else {
        localStorage.removeItem('lespot_now_playing');
      }
      updateMiniBtn();
    });
    audioEl.addEventListener('error', function() {
      console.log('Audio error:', audioEl.src);
    });
  }
  return audioEl;
}
function startAudio(saved) {
  if (!saved || !saved.url) return;
  currentSong = saved;
  const el = ensureAudio();
  showMiniPlayer(saved);
  // Only change src if different
  const newSrc = saved.url;
  const isSame = el.src && (el.src === newSrc || el.src.endsWith(newSrc) || newSrc.endsWith(el.src.split('/').pop()));
  if (!isSame) {
    el.pause();
    el.src = newSrc;
    el.load();
    el.onloadedmetadata = function() {
      try {
        const t = Number(saved.time || saved.preview_start || 0);
        if (t > 0 && t < el.duration) el.currentTime = t;
      } catch(e) {}
      if (saved.playing) el.play().catch(function(){ updateMiniBtn(); });
      updateMiniBtn();
    };
    // Fallback if metadata already loaded / event missed
    setTimeout(function(){ if (saved.playing && el.paused) el.play().catch(function(){}); }, 300);
  } else {
    try { if (saved.time && Math.abs(el.currentTime - saved.time) > 2) el.currentTime = saved.time; } catch(e) {}
    if (saved.playing) el.play().catch(function(){ updateMiniBtn(); });
  }
  updateMiniBtn();
}

// --- Main API used by ALL pages ---
async function playSong(song, previewOnly) {
  if (!song) return;
  let url = song.url || song.audio_url || song.audio || song.file_url || null;
  if (!url && song.audio_path && typeof getSongStreamUrl === 'function') {
    url = await getSongStreamUrl(song.audio_path);
  }
  if (!url) { alert('❌ No audio file for this song.\n\nCheck Supabase > Storage > songs bucket.'); return; }
  let cover = song.cover_url || song.cover || '';
  if ((!cover || !String(cover).startsWith('http')) && (song.cover_path || song.cover_url) && typeof getCoverUrl === 'function') {
    cover = getCoverUrl(song.cover_path || song.cover_url);
  }
  const previewStart = Number(song.preview_start || song.previewStart || 0);
  const previewSeconds = Number(song.preview_seconds || song.preview_duration || 30);
  const toSave = {
    id: song.id || '',
    title: song.title || 'Song',
    artist_name: song.artist_name || song.artist || '',
    artist: song.artist_name || song.artist || '',
    url: url,
    audio_url: url,
    cover_url: cover,
    cover_path: song.cover_path || '',
    preview_start: previewStart,
    preview_seconds: previewSeconds,
    preview_end: previewOnly ? previewStart + previewSeconds : 0,
    previewOnly: !!previewOnly,
    playing: true,
    time: previewOnly ? previewStart : 0,
    updated: Date.now()
  };
  localStorage.setItem('lespot_now_playing', JSON.stringify(toSave));
  // Stop old preview timer
  if (_previewTimer) clearInterval(_previewTimer);
  startAudio(toSave);
  // For preview, jump to preview_start on load
  const el = ensureAudio();
  if (previewOnly) {
    el.onloadedmetadata = function() {
      try { if (previewStart > 0 && previewStart < el.duration) el.currentTime = previewStart; } catch(e) {}
      el.play().catch(function(){ updateMiniBtn(); });
    };
  }
}

// --- Compatibility: index.html calls these names ---
function playWithPlayer(url, s, start, end, isFull) {
  // Convert index.html call -> new unified playSong
  const song = Object.assign({}, s, {
    url: url,
    audio_url: url,
    preview_start: Number(start || 0),
    preview_seconds: 30,
    preview_end: Number(end || (Number(start || 0) + 30)),
    previewOnly: !isFull
  });
  // Direct play, don't re-fetch URL
  const toSave = {
    id: song.id || '',
    title: song.title || 'Song',
    artist_name: song.artist_name || song.artist || '',
    artist: song.artist_name || song.artist || '',
    url: url, audio_url: url,
    cover_url: song.cover_url || '', cover_path: song.cover_path || '',
    preview_start: Number(start || 0), preview_seconds: 30,
    preview_end: Number(end || (Number(start || 0) + 30)),
    previewOnly: !isFull, playing: true,
    time: Number(start || 0), updated: Date.now()
  };
  localStorage.setItem('lespot_now_playing', JSON.stringify(toSave));
  startAudio(toSave);
}
function togglePlayer() {
  const el = ensureAudio();
  if (!el.src) {
    const saved = getSaved();
    if (saved && saved.url) { startAudio(saved); return; }
    return;
  }
  if (el.paused) { el.play().catch(function(){}); }
  else { el.pause(); }
  updateMiniBtn();
  saveState();
}
function stopPlayer() { stopSong(); }
function stopSong() {
  if (audioEl) { audioEl.pause(); audioEl.removeAttribute('src'); audioEl.load(); }
  currentSong = null;
  localStorage.removeItem('lespot_now_playing');
  const bar = document.getElementById('miniPlayer');
  if (bar) bar.style.display = 'none';
  const mainBar = document.getElementById('playerBar');
  if (mainBar) mainBar.classList.remove('show');
  updateMiniBtn();
}
// Make sure other pages can call them
window.playSong = playSong;
window.playWithPlayer = playWithPlayer;
window.togglePlayer = togglePlayer;
window.stopPlayer = stopPlayer;
window.stopSong = stopSong;
window.toggleMini = toggleMini;

document.addEventListener('DOMContentLoaded', function() {
  ensureAudio();
  const saved = getSaved();
  // Resume only if recent (30 min) and user was playing
  if (saved && saved.url && Date.now() - (saved.updated || 0) < 30 * 60 * 1000) {
    // Don't auto-play on load (browsers block it) - just show bar, user taps ▶
    saved.playing = false;
    startAudio(saved);
    // Hide play state - show ▶
    updateMiniBtn();
  }
});