// LES-POT Player - Play / Pause / Next / Prev / Seek
let CURRENT_SONG=null, AUDIO=null;
function playSong(id){
  const audio=document.getElementById('player');
  if(!audio) return;
  audio.innerHTML=`<audio id="audioEl" controls autoplay style="width:100%"></audio><div class="controls"><button onclick="prevSong()">⏮ Prev</button><button class="primary" onclick="togglePlay()">⏸ Pause</button><button onclick="nextSong()">⏭ Next</button></div><p class="small center">Now Playing: ${id}</p>`;
  CURRENT_SONG=id;
  const el=document.getElementById('audioEl');
  AUDIO=el;
  el.src=''; // set real audio_url from Supabase in production
}
function togglePlay(){if(!AUDIO) return;if(AUDIO.paused){AUDIO.play();}else{AUDIO.pause();}}
function nextSong(){alert('Next song - wire playlist in app.js');}
function prevSong(){alert('Prev song - wire playlist in app.js');}
