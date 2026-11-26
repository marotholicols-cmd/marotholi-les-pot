// Marotholi Les-Pot - Persistent Player v4.1 - THINKS ALWAYS
// ONE player for whole app. Uses #mainAudio + #playerBar if page has them,
// otherwise creates mini bar. Music resumes across pages.
// Preview = 30s from artist preview_start, Full = after purchase
// NOTE: This is the ONLY file that declares let currentSong. Do NOT declare it in any .html file.

let audioEl = null;
let currentSong = null;
let _previewTimer = null;
let _retryOnce = false;

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
      audio_path: currentSong.audio_path || '',
      url: currentSong.url || '',
      cover_url: currentSong.cover_url || currentSong.cover || '',
      cover_path: currentSong.cover_path || '',
      preview_start: Number(currentSong.preview_start || 0),
      preview_seconds: 30,
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
function coverForPlayer(song){
  try{
    if(song._coverUrl && String(song._coverUrl).startsWith('http')) return song._coverUrl;
    if(song.cover_url && String(song.cover_url).startsWith('http')) return song.cover_url;
    if(typeof getCoverUrl==='function'){
      const c=getCoverUrl(song.cover_path||song.cover_url||song.cover||'');
      if(c && c!=='icon.svg') return c;
    }
  }catch(e){}
  if(song.cover_url && String(song.cover_url).startsWith('http')) return song.cover_url;
  return 'icon.svg';
}
// NEW - FIX FOR NOTIFICATION: One function, called everywhere
async function setMediaSession(song){
  try{
    if(!('mediaSession' in navigator)) return;
    let artworkUrl = coverForPlayer(song);
    if(song.cover_path && typeof getCoverDisplayUrl==='function'){
      try{ const signed = await getCoverDisplayUrl(song.cover_path, 3600); if(signed && signed!=='icon.svg') artworkUrl = signed; }catch(e){}
    }
    const title = song.title || 'Song';
    const artist = song.artist_name || song.artist || 'Marotholi Les-Pot';
    navigator.mediaSession.metadata = new MediaMetadata({ title: title, artist: artist, album: 'Marotholi Les-Pot', artwork: [{src: artworkUrl, sizes: '512x512', type: 'image/jpeg'}] });
    navigator.mediaSession.setActionHandler('play', function(){ togglePlayer(); });
    navigator.mediaSession.setActionHandler('pause', function(){ togglePlayer(); });
    if(document.title) document.title = title + ' - ' + artist + ' | Marotholi Les-Pot';
  }catch(e){}
}
function getPlayerUI() {
  const bar = document.getElementById('playerBar');
  if (bar) {
    return { bar: bar, title: document.getElementById('playerTitle'), sub: document.getElementById('playerArtist'), cover: document.getElementById('playerCover'), btn: document.getElementById('playerBtn'), time: null };
  }
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
  return { bar: mini, title: document.getElementById('miniTitle'), sub: document.getElementById('miniSub'), cover: document.getElementById('miniCover'), btn: document.getElementById('miniPlayBtn'), time: document.getElementById('miniTime') };
}
function showMiniPlayer(song) {
  const ui = getPlayerUI();
  if (!ui.bar) return;
  ui.bar.style.display = 'flex';
  if (ui.bar.classList) ui.bar.classList.add('show');
  if (ui.title) ui.title.textContent = song.title || 'Song';
  if (ui.sub) ui.sub.textContent = (song.artist_name || song.artist || '') + (song.previewOnly ? ' • PREVIEW 30s' : ' • FULL');
  if (ui.cover) ui.cover.src = coverForPlayer(song);
  updateMiniBtn();
}
function updateMiniBtn() {
  const ui = getPlayerUI();
  if (!ui.btn || !audioEl) return;
  const isPlaying = !audioEl.paused;
  ui.btn.textContent = isPlaying ? '⏸' : '▶';
  if (ui.time) ui.time.textContent = formatTime(audioEl.currentTime);
}
function toggleMini() { togglePlayer(); }
function ensureAudio() {
  if (audioEl) return audioEl;
  const existing = document.getElementById('mainAudio');
  if (existing) { audioEl = existing; }
  else {
    audioEl = new Audio();
    audioEl.id = 'mainAudio';
    audioEl.preload = 'auto';
    audioEl.style.display = 'none';
    document.body.appendChild(audioEl);
  }
  audioEl.setAttribute('playsinline', '');
  if (!audioEl._lespotBound) {
    audioEl._lespotBound = true;
    audioEl.addEventListener('timeupdate', function() {
      saveState();
      updateMiniBtn();
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
      if (!currentSong || !currentSong.previewOnly) localStorage.removeItem('lespot_now_playing');
      updateMiniBtn();
    });
    audioEl.addEventListener('error', function() {
      console.log('Audio error:', audioEl.src);
      if(!_retryOnce && currentSong && currentSong.audio_path && typeof getSongStreamUrl==='function'){
        _retryOnce=true;
        getSongStreamUrl(currentSong.audio_path, 3600).then(function(fresh){
          if(fresh && audioEl){ audioEl.src=fresh; audioEl.load(); audioEl.play().catch(function(){}); }
        });
      } else {
        const ui=getPlayerUI(); if(ui.sub) ui.sub.textContent='❌ Audio not found - Try again';
      }
    });
  }
  return audioEl;
}
async function startAudio(saved) {
  if (!saved) return;
  if(typeof isRemovedSong==='function' && isRemovedSong(saved.id)){ localStorage.removeItem('lespot_now_playing'); return; }
  let url = saved.url || '';
  if(saved.audio_path && typeof getSongStreamUrl==='function'){
    const fresh = await getSongStreamUrl(saved.audio_path, 3600);
    if(fresh) url = fresh;
  }
  if(!url) return;
  saved.url = url;
  currentSong = saved;
  _retryOnce=false;
  const el = ensureAudio();
  showMiniPlayer(saved);
  setMediaSession(saved);
  if(saved.cover_path && typeof getCoverDisplayUrl==='function'){
    try{ const cu = await getCoverDisplayUrl(saved.cover_path, 3600); if(cu && cu!=='icon.svg'){ saved._coverUrl = cu; const ui=getPlayerUI(); if(ui.cover) ui.cover.src = cu; setMediaSession(saved); } }catch(e){}
  }
  const isSame = el.src && (el.src === url);
  if (!isSame) {
    el.pause();
    el.src = url;
    el.load();
    el.onloadedmetadata = function() {
      try {
        let t = Number(saved.time || saved.preview_start || 0);
        if(saved.previewOnly && el.duration && t + 1 >= el.duration) t = 0;
        if(saved.previewOnly && el.duration && t + 30 > el.duration) t = Math.max(0, el.duration - 30);
        if (t > 0 && t < el.duration) el.currentTime = t;
      } catch(e) {}
      if (saved.playing) el.play().catch(function(){ updateMiniBtn(); });
      updateMiniBtn();
    };
    setTimeout(function(){ if (saved.playing && el.paused) el.play().catch(function(){}); }, 300);
  } else {
    try { if (saved.time && Math.abs(el.currentTime - saved.time) > 2) el.currentTime = saved.time; } catch(e) {}
    if (saved.playing) el.play().catch(function(){ updateMiniBtn(); });
  }
  updateMiniBtn();
}
async function playSong(song, previewOnly) {
  if (!song) return;
  if(typeof isRemovedSong==='function' && isRemovedSong(song.id)){ alert('❌ This song was REMOVED. One Song, One Home rule.'); return; }
  let url = song.url || song.audio_url || song.audio || song.file_url || null;
  if ((!url || url.includes('expired')) && song.audio_path && typeof getSongStreamUrl === 'function') {
    url = await getSongStreamUrl(song.audio_path, 3600);
  }
  if (!url && song.audio_path && typeof getSongStreamUrl==='function') url = await getSongStreamUrl(song.audio_path, 3600);
  if (!url) { alert('❌ No audio file for this song.\n\nCheck Supabase > Storage > songs bucket.'); return; }
  const previewStart = Number(song.preview_start || song.previewStart || 0);
  const toSave = {
    id: song.id || '', title: song.title || 'Song',
    artist_name: song.artist_name || song.artist || '', artist: song.artist_name || song.artist || '',
    url: url, audio_url: url, audio_path: song.audio_path || '',
    cover_url: coverForPlayer(song), cover_path: song.cover_path || '',
    preview_start: previewStart, preview_seconds: 30,
    preview_end: previewOnly ? previewStart + 30 : 0,
    previewOnly: !!previewOnly, playing: true,
    time: previewOnly ? previewStart : 0, updated: Date.now()
  };
  localStorage.setItem('lespot_now_playing', JSON.stringify(toSave));
  if (_previewTimer) clearInterval(_previewTimer);
  _retryOnce=false;
  await startAudio(toSave);
  setMediaSession(toSave);
}
function playWithPlayer(url, s, start, end, isFull) {
  if(typeof isRemovedSong==='function' && isRemovedSong(s.id)){ alert('❌ This song was REMOVED.'); return; }
  const song = Object.assign({}, s, { url: url, audio_url: url, preview_start: Number(start || 0), preview_seconds: 30, preview_end: Number(end || (Number(start || 0) + 30)), previewOnly: !isFull });
  const toSave = { id: song.id || '', title: song.title || 'Song', artist_name: song.artist_name || song.artist || '', artist: song.artist_name || song.artist || '', url: url, audio_url: url, audio_path: song.audio_path||'', cover_url: coverForPlayer(song), cover_path: song.cover_path || '', preview_start: Number(start || 0), preview_seconds: 30, preview_end: Number(end || (Number(start || 0) + 30)), previewOnly: !isFull, playing: true, time: Number(start || 0), updated: Date.now() };
  localStorage.setItem('lespot_now_playing', JSON.stringify(toSave));
  startAudio(toSave);
  setMediaSession(toSave);
}
function togglePlayer() {
  const el = ensureAudio();
  if (!el.src) {
    const saved = getSaved();
    if (saved && (saved.url || saved.audio_path)) { startAudio(saved); return; }
    return;
  }
  if (el.paused) { el.play().catch(function(){}); } else { el.pause(); }
  updateMiniBtn(); saveState();
}
function stopPlayer() { stopSong(); }
function stopSong() {
  if (audioEl) { audioEl.pause(); audioEl.removeAttribute('src'); audioEl.load(); }
  currentSong = null;
  localStorage.removeItem('lespot_now_playing');
  try{ if('mediaSession' in navigator) navigator.mediaSession.metadata = null; }catch(e){}
  const bar = document.getElementById('miniPlayer'); if (bar) bar.style.display = 'none';
  const mainBar = document.getElementById('playerBar'); if (mainBar) mainBar.classList.remove('show');
  updateMiniBtn();
}
window.playSong = playSong;
window.playWithPlayer = playWithPlayer;
window.togglePlayer = togglePlayer;
window.stopPlayer = stopPlayer;
window.stopSong = stopSong;
window.toggleMini = toggleMini;

document.addEventListener('DOMContentLoaded', function() {
  ensureAudio();
  const saved = getSaved();
  if (saved && (saved.url || saved.audio_path) && Date.now() - (saved.updated || 0) < 30 * 60 * 1000) {
    saved.playing = false;
    startAudio(saved);
    updateMiniBtn();
  }
});