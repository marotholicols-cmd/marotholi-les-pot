// LES-POT Player - Background + Lock Screen + Notification - FIXED
let audio = new Audio();
let currentSong = null;
let isPreview = false;
let previewTimer = null;
let onPreviewEnd = null;
let onNextSong = null;
let onPrevSong = null;

function syncPlayButtons(isPlaying){
  const ids = ['pPlayBtn','miniPlayBtn','playPauseBtn'];
  ids.forEach(id=>{
    const b = document.getElementById(id);
    if(b) b.textContent = isPlaying ? '⏸️ Pause' : '▶️ Play';
    // Mini player uses short icons - keep it compact
    if(id==='pPlayBtn' && b) b.textContent = isPlaying ? '⏸' : '▶';
    if(id==='miniPlayBtn' && b) b.textContent = isPlaying ? '⏸' : '▶';
  });
}
function showPreviewEndMsg(title){
  const np = document.getElementById('nowPlaying');
  if(np) np.textContent = '🔒 Preview ended — Buy "' + (title||'this song') + '" to hear full song';
  const msg = document.getElementById('msg');
  if(msg) msg.textContent = 'Preview ended — Buy to hear full song. You own it in Library after buying.';
}

function playSong(url, title, artist, cover, preview = false, opts = {}){
  if(previewTimer) clearTimeout(previewTimer);
  audio.pause();
  audio.currentTime = 0;
  if(opts && opts.onPreviewEnd) onPreviewEnd = opts.onPreviewEnd;
  if(opts && opts.onNext) onNextSong = opts.onNext;
  if(opts && opts.onPrev) onPrevSong = opts.onPrev;

  isPreview = preview;
  audio.src = url;
  audio.play().catch(()=>{ /* user needs to tap play */ });
  currentSong = {title, artist, cover, url};

  // 30s preview lock
  if(preview){
    previewTimer = setTimeout(()=>{
      audio.pause();
      audio.currentTime = 0;
      showPreviewEndMsg(title);
      if(typeof onPreviewEnd === 'function'){ try{ onPreviewEnd(); }catch(e){} }
      syncPlayButtons(false);
    }, 30000);
  }

  // Lock screen / notification controls
  if('mediaSession' in navigator){
    try{
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'Les-Pot Song',
        artist: artist || 'Marotholi',
        album: 'Marotholi Les-Pot',
        artwork: [{src: cover || 'icon-192.png', sizes:'512x512', type:'image/png'}]
      });
      navigator.mediaSession.setActionHandler('play', ()=>{ audio.play(); syncPlayButtons(true); });
      navigator.mediaSession.setActionHandler('pause', ()=>{ audio.pause(); syncPlayButtons(false); });
      navigator.mediaSession.setActionHandler('nexttrack', ()=>{ if(onNextSong) onNextSong(); else seekSong(10); });
      navigator.mediaSession.setActionHandler('previoustrack', ()=>{ if(onPrevSong) onPrevSong(); else seekSong(-10); });
      navigator.mediaSession.setActionHandler('seekto', (e)=>{ if(e.seekTime!=null) audio.currentTime = e.seekTime; });
    }catch(e){}
  }

  const p = document.getElementById('miniPlayer');
  if(p){
    p.classList.remove('hidden');
    const t = document.getElementById('pTitle'); if(t) t.textContent = title;
    const a = document.getElementById('pArtist'); if(a) a.textContent = artist;
    const c = document.getElementById('pCover'); if(c && cover) c.src = cover;
    const btn = document.getElementById('pPlayBtn'); if(btn) btn.textContent = '⏸';
  }
  const np = document.getElementById('nowPlaying');
  if(np) np.textContent = '🎵 ' + title + ' — ' + artist + (preview ? ' (Preview 30s)' : '');
  syncPlayButtons(true);
}

function toggleMiniPlay(){
  if(!audio.src) return;
  if(audio.paused){ audio.play(); } else { audio.pause(); }
  syncPlayButtons(!audio.paused);
}

function togglePlay(){
  // Smart toggle: if Library player (#audio) exists and has src, use it - else use mini player
  const libAudio = document.getElementById('audio');
  if(libAudio && libAudio.src){
    if(libAudio.paused){ libAudio.play(); } else { libAudio.pause(); }
    syncPlayButtons(!libAudio.paused);
    return;
  }
  toggleMiniPlay();
}

function stopSong(){
  if(previewTimer) clearTimeout(previewTimer);
  audio.pause();
  audio.currentTime = 0;
  currentSong = null;
  isPreview = false;
  const p = document.getElementById('miniPlayer'); if(p) p.classList.add('hidden');
  syncPlayButtons(false);
}

function seekSong(sec){
  if(!audio.src) return;
  audio.currentTime = Math.max(0, Math.min(audio.duration||0, audio.currentTime + sec));
}
function setVolumePlayer(v){ audio.volume = Math.max(0, Math.min(1, parseFloat(v)||1)); }
function setSpeedPlayer(v){ audio.playbackRate = parseFloat(v)||1; }

// Keep buttons in sync
audio.addEventListener('play', ()=> syncPlayButtons(true));
audio.addEventListener('pause', ()=> syncPlayButtons(false));
audio.addEventListener('ended', ()=>{
  if(previewTimer) clearTimeout(previewTimer);
  syncPlayButtons(false);
  // If Discover gave us a next handler, auto-play next
  if(typeof onNextSong === 'function' && !isPreview){ try{ onNextSong(); }catch(e){} }
});

window.playSong = playSong;
window.togglePlay = togglePlay;
window.toggleMiniPlay = toggleMiniPlay;
window.stopSong = stopSong;
window.seekSong = seekSong;
window.setVolumePlayer = setVolumePlayer;
window.setSpeedPlayer = setSpeedPlayer;
window.lespotAudio = audio;
window.getCurrentSong = ()=> currentSong;
