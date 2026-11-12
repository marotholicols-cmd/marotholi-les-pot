// Marotholi Les-Pot - Persistent Player v2
// Music resumes across pages: Discover -> Wallet -> Library
// Preview = 30s max, Full = after purchase
// NOTE: This is the ONLY file that declares let currentSong. Do NOT declare it in any .html file.

let audioEl = null;
let currentSong = null;

function getSaved() {
  try { return JSON.parse(localStorage.getItem('lespot_now_playing') || 'null'); }
  catch (e) { return null; }
}
function saveState() {
  if (!audioEl || !currentSong) return;
  const data = {
    id: currentSong.id || '',
    title: currentSong.title || 'Song',
    artist_name: currentSong.artist_name || currentSong.artist || '',
    artist: currentSong.artist_name || currentSong.artist || '',
    url: currentSong.url || currentSong.audio_url || currentSong.audio || '',
    cover_url: currentSong.cover_url || currentSong.cover || '',
    preview_seconds: currentSong.preview_seconds || currentSong.preview_duration || 30,
    previewOnly: currentSong.previewOnly || false,
    time: audioEl.currentTime || 0,
    playing: !audioEl.paused,
    updated: Date.now()
  };
  localStorage.setItem('lespot_now_playing', JSON.stringify(data));
}
function showMiniPlayer(song) {
  let bar = document.getElementById('miniPlayer');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'miniPlayer';
    bar.style.cssText = 'position:fixed;bottom:58px;left:10px;right:10px;background:#1e1e1e;border:1px solid #d4ff3f;border-radius:14px;padding:10px;display:flex;align-items:center;gap:10px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.5)';
    bar.innerHTML = '<button id="miniPlayBtn" style="background:#d4ff3f;border:0;width:42px;height:42px;border-radius:50%;font-size:18px;cursor:pointer;flex-shrink:0">⏸️</button>' +
      '<div style="flex:1;min-width:0"><div id="miniTitle" style="font-weight:800;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff">No song</div>' +
      '<div id="miniSub" style="font-size:11px;opacity:.7;color:#fff">Tap to resume</div></div>' +
      '<span id="miniTime" style="font-size:11px;opacity:.7;color:#fff;flex-shrink:0">0:00</span>';
    document.body.appendChild(bar);
    document.getElementById('miniPlayBtn').onclick = toggleMini;
  }
  document.getElementById('miniTitle').textContent = song.title || 'Song';
  document.getElementById('miniSub').textContent = (song.artist_name || song.artist || '') + (song.previewOnly ? ' • PREVIEW' : ' • FULL');
}
function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' + sec : sec);
}
function updateMiniBtn() {
  const b = document.getElementById('miniPlayBtn');
  if (b && audioEl) b.textContent = audioEl.paused ? '▶️' : '⏸️';
  const t = document.getElementById('miniTime');
  if (t && audioEl) t.textContent = formatTime(audioEl.currentTime);
}
function toggleMini() {
  if (!audioEl) {
    const saved = getSaved();
    if (saved && saved.url) startAudio(saved);
    return;
  }
  if (audioEl.paused) { audioEl.play().catch(function(){}); }
  else { audioEl.pause(); }
  updateMiniBtn();
  saveState();
}
function ensureAudio() {
  if (audioEl) return audioEl;
  audioEl = new Audio();
  audioEl.preload = 'auto';
  audioEl.addEventListener('timeupdate', function() {
    saveState();
    updateMiniBtn();
    if (currentSong && currentSong.previewOnly && currentSong.preview_seconds) {
      if (audioEl.currentTime >= Number(currentSong.preview_seconds)) {
        audioEl.pause();
        audioEl.currentTime = 0;
        saveState();
        updateMiniBtn();
        alert('Preview ended (' + currentSong.preview_seconds + 's) - Buy to hear full song!');
      }
    }
  });
  audioEl.addEventListener('play', function() { updateMiniBtn(); saveState(); });
  audioEl.addEventListener('pause', function() { updateMiniBtn(); saveState(); });
  audioEl.addEventListener('ended', function() {
    localStorage.removeItem('lespot_now_playing');
    updateMiniBtn();
  });
  return audioEl;
}
function startAudio(saved) {
  if (!saved || !saved.url) return;
  currentSong = saved;
  const el = ensureAudio();
  if (el.src !== saved.url && !el.src.endsWith(saved.url)) {
    el.src = saved.url;
    el.currentTime = saved.time || 0;
  } else if (saved.time && Math.abs(el.currentTime - saved.time) > 2) {
    el.currentTime = saved.time;
  }
  showMiniPlayer(saved);
  if (saved.playing) {
    el.play().catch(function() { updateMiniBtn(); });
  }
  updateMiniBtn();
}
async function playSong(song, previewOnly) {
  if (!song) return;
  let url = song.url || song.audio_url || song.audio || song.file_url || null;
  // FIXED: if only audio_path exists, get signed URL from app.js helper
  if (!url && song.audio_path && typeof getSongStreamUrl === 'function') {
    url = await getSongStreamUrl(song.audio_path);
  }
  if (!url) { alert('No audio file for this song'); return; }
  let cover = song.cover_url || song.cover || '';
  if ((!cover || !String(cover).startsWith('http')) && (song.cover_path || song.cover_url) && typeof getCoverUrl === 'function') {
    cover = getCoverUrl(song.cover_path || song.cover_url);
  }
  const toSave = {
    id: song.id || '',
    title: song.title || 'Song',
    artist_name: song.artist_name || song.artist || '',
    artist: song.artist_name || song.artist || '',
    url: url,
    audio_url: url,
    cover_url: cover,
    preview_seconds: song.preview_seconds || song.preview_duration || 30,
    previewOnly: !!previewOnly,
    playing: true,
    time: 0,
    updated: Date.now()
  };
  localStorage.setItem('lespot_now_playing', JSON.stringify(toSave));
  startAudio(toSave);
}
function stopSong() {
  if (audioEl) { audioEl.pause(); audioEl.currentTime = 0; }
  localStorage.removeItem('lespot_now_playing');
  const bar = document.getElementById('miniPlayer');
  if (bar) bar.style.display = 'none';
}
document.addEventListener('DOMContentLoaded', function() {
  const saved = getSaved();
  if (saved && saved.url && Date.now() - (saved.updated || 0) < 30 * 60 * 1000) {
    startAudio(saved);
  }
});
