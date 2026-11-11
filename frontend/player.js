// Marotholi Les-Pot - player.js - FINAL FIXED VERSION
// Works with Supabase Bucket 'songs', audio_path + audio_url, no false popup
let audio = new Audio();
let currentSong = null;
let isPreview = false;
let previewTimer = null;

function showPlayer(title, artist, cover){
  const mp = document.getElementById('miniPlayer');
  if(!mp) return;
  mp.classList.remove('hidden');
  const t = document.getElementById('pTitle');
  const a = document.getElementById('pArtist');
  const img = document.getElementById('pCover');
  if(t) t.textContent = title || 'No song';
  if(a) a.textContent = artist || 'Marotholi';
  if(img) img.src = cover || 'icon.svg';
}

function fixAudioUrl(raw){
  if(!raw) return '';
  raw = String(raw).trim();
  if(!raw || raw === 'undefined' || raw === 'null') return '';
  if(raw.startsWith('http')){
    // Fix spaces in Supabase bucket URLs
    if(raw.includes('/songs/')){
      const parts = raw.split('/songs/');
      if(parts.length === 2){
        return parts[0] + '/songs/' + encodeURIComponent(decodeURIComponent(parts[1]));
      }
    }
    return raw;
  }
  // Only filename saved - build full bucket URL
  return 'https://mmkxiniybctmgoozaecp.supabase.co/storage/v1/object/public/songs/' + encodeURIComponent(raw);
}

function playSong(url, title, artist, cover, preview){
  const fixedUrl = fixAudioUrl(url);
  if(!fixedUrl){
    alert('NO AUDIO LINK for: ' + (title || 'this song') + '\n\nArtist needs to re-upload it via Upload page.');
    return;
  }
  clearTimeout(previewTimer);
  try{ audio.pause(); }catch(e){}
  audio = new Audio();
  currentSong = {url: fixedUrl, title, artist, cover};
  isPreview = !!preview;
  showPlayer(title, artist, cover);
  const btn = document.getElementById('pPlayBtn');
  if(btn) btn.textContent = '⏸';
  audio.src = fixedUrl;
  audio.preload = 'auto';

  // Only show error if REALLY fails - not false alarm
  audio.onerror = function(){
    setTimeout(()=>{
      if(audio.error && audio.paused && audio.currentTime === 0 && currentSong && currentSong.url === fixedUrl){
        alert('Could not play: ' + title + '\nLink: ' + fixedUrl + '\n\nCheck: Supabase -> Storage -> songs -> file exists? Bucket PUBLIC?');
        if(btn) btn.textContent = '▶';
      }
    }, 1500);
  };

  audio.onplay = function(){
    if(btn) btn.textContent = '⏸';
    if(isPreview){
      clearTimeout(previewTimer);
      previewTimer = setTimeout(()=>{
        try{ audio.pause(); }catch(e){}
        alert('⏱️ 30s Preview ended.\nBuy with Grinds to unlock FULL song.');
        if(btn) btn.textContent = '▶';
      }, 30000);
    }
  };
  audio.onpause = function(){ if(btn) btn.textContent = '▶'; };
  audio.onended = function(){ if(btn) btn.textContent = '▶'; };

  audio.play().catch(()=>{
    // Browser blocked autoplay - user must tap Play again, no popup
    if(btn) btn.textContent = '▶';
  });
}

function togglePlay(){
  if(!currentSong) return;
  const btn = document.getElementById('pPlayBtn');
  if(audio.paused){
    audio.play().catch(()=>{});
    if(btn) btn.textContent = '⏸';
  } else {
    audio.pause();
    if(btn) btn.textContent = '▶';
  }
}

function stopSong(hide){
  clearTimeout(previewTimer);
  try{ audio.pause(); audio.currentTime = 0; }catch(e){}
  currentSong = null;
  if(hide){
    const mp = document.getElementById('miniPlayer');
    if(mp) mp.classList.add('hidden');
  }
  const btn = document.getElementById('pPlayBtn');
  if(btn) btn.textContent = '▶';
}

window.playSong = playSong;
window.togglePlay = togglePlay;
window.stopSong = stopSong;
window.fixAudioUrl = fixAudioUrl;
