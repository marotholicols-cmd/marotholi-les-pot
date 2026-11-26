// ===== MAROTHOLI LES-POT - app.js - BRAIN v2 - THINKS ALWAYS =====
// One truth: 1G = M10 FIXED | Split 63% Artist / 23% Platform / 14% Fees
// One truth: purchases.fan_id + profiles.grind_balance - NEVER buyer_id / balance_grind
const SUPABASE_URL = "https://mmkxiniybctmgoozaecp.supabase.co";
const SUPABASE_KEY = "sb_publishable_wWhjXCZ4JWfGlCIG95kzPg_WXqzfVDP";
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_KEY = SUPABASE_KEY;
window.SUPABASE_ANON_KEY = SUPABASE_KEY;

// ===== CENTRAL RULES - One place, all pages obey =====
const REMOVED_SONG_IDS = ['4f924d31-8873-4ec4-befc-f0d7b2a3d697']; // MAMA - One Song, One Home
window.REMOVED_SONG_IDS = REMOVED_SONG_IDS;
function isRemovedSong(id){ return REMOVED_SONG_IDS.includes(String(id||'')); }
window.isRemovedSong = isRemovedSong;
function isRemoved(id){ return isRemovedSong(id); }
window.isRemoved = isRemoved;

let sb = null;
function initSB(){
  if(sb && sb.auth) return sb;
  if(!window.supabase || !window.supabase.createClient){
    console.log("Supabase library not loaded yet");
    return null;
  }
  try{
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.sb = sb;
    return sb;
  }catch(e){ console.log("createClient failed", e); return null; }
}
window.initSB = initSB;
window.getSB = function(){ if(window.sb) return window.sb; return initSB(); };
function getSB(){ return window.sb || initSB(); }
window.getSB2 = getSB;

// ===== Helpers - Money / Text =====
function escHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
window.escHtml = escHtml;
function formatPrice(p){ const g=Number(p||0); return g.toFixed(2)+" G = M"+(g*10).toFixed(2); }
window.formatPrice = formatPrice;
function grindToMaloti(g){ return (Number(g||0)*10).toFixed(2); }
window.grindToMaloti = grindToMaloti;
function splitMoney(price){ const p=Number(price||0); return { artist: +(p*0.63).toFixed(4), platform: +(p*0.23).toFixed(4), fees: +(p*0.14).toFixed(4), total: p }; }
window.splitMoney = splitMoney;
function getPreviewRange(start){ const s=Math.max(0, Number(start||0)); return { start: s, end: s+30 }; }
window.getPreviewRange = getPreviewRange;

// ===== Path cleaning - Upload + Brain agree =====
function cleanStoragePath(name){
  return String(name||'').replace(/[^a-zA-Z0-9._-]/g,'_').replace(/_+/g,'_').slice(0,120) || 'file';
}
window.cleanStoragePath = cleanStoragePath;

// ===== COVER BRAIN - Always returns something usable =====
function getCoverUrl(path){
  if(!path || String(path)==='null' || String(path)==='undefined') return 'icon.svg';
  const p=String(path).trim();
  if(p.startsWith('http')) return p;
  if(p.startsWith('icon.svg')) return 'icon.svg';
  let clean=p.replace(/^covers\//,'').replace(/^audio\//,'').replace(/^\//,'');
  const c = window.sb || initSB();
  if(!c) return 'icon.svg';
  try{ const {data} = c.storage.from('covers').getPublicUrl(clean); return data?.publicUrl || 'icon.svg'; }catch(e){ return 'icon.svg'; }
}
window.getCoverUrl = getCoverUrl;

// Signed cover - use this if your covers bucket is PRIVATE
async function getCoverSignedUrl(path, expires){
  if(!path) return 'icon.svg';
  if(String(path).startsWith('http')) return String(path);
  const c = window.sb || initSB(); if(!c) return 'icon.svg';
  let clean=String(path).replace(/^covers\//,'');
  try{
    const {data, error} = await c.storage.from('covers').createSignedUrl(clean, expires||3600);
    if(!error && data?.signedUrl) return data.signedUrl;
  }catch(e){}
  return getCoverUrl(path);
}
window.getCoverSignedUrl = getCoverSignedUrl;

// NEW - FIX FOR COVERS: Tries Signed first, then Public. Use this for display.
async function getCoverDisplayUrl(path, expires){
  if(!path || String(path)==='null' || String(path)==='undefined') return 'icon.svg';
  const p=String(path).trim();
  if(p.startsWith('http')) return p;
  if(p.startsWith('icon.svg')) return 'icon.svg';
  const c = window.sb || initSB(); if(!c) return 'icon.svg';
  let clean=p.replace(/^covers\//,'').replace(/^audio\//,'').replace(/^\//,'');
  try{
    const {data, error} = await c.storage.from('covers').createSignedUrl(clean, expires||3600);
    if(!error && data?.signedUrl) return data.signedUrl;
  }catch(e){}
  return getCoverUrl(path);
}
window.getCoverDisplayUrl = getCoverDisplayUrl;

// ===== AUDIO BRAIN - Always returns a stream URL =====
async function getSongStreamUrl(path, expires){
  if(!path) return null;
  if(String(path).startsWith('http')) return path;
  const c = window.sb || initSB(); if(!c) return null;
  let clean=String(path).replace(/^songs\//,'').replace(/^audio\//,'').replace(/^\//,'');
  try{
    const {data, error} = await c.storage.from('songs').createSignedUrl(clean, expires||3600);
    if(error) throw error;
    return data?.signedUrl || null;
  }catch(e){
    try{
      const {data} = await c.storage.from('songs').getPublicUrl(clean);
      if(data?.publicUrl) return data.publicUrl;
    }catch(e2){}
    console.log("Stream URL error", e.message);
    return null;
  }
}
window.getSongStreamUrl = getSongStreamUrl;

// ===== AUTH BRAIN - Proper access, never hangs =====
async function getCurrentUser(){
  const c = window.sb || initSB(); if(!c) return null;
  try{
    const {data} = await c.auth.getUser();
    return data?.user || null;
  }catch(e){ console.log('getUser failed', e.message); return null; }
}
window.getCurrentUser = getCurrentUser;

async function requireLogin(){
  for(let i=0;i<5;i++){
    const c = window.sb || initSB();
    if(c) break;
    await new Promise(r=>setTimeout(r,300));
  }
  const u = await getCurrentUser();
  if(!u){ alert("Please login first"); location.href='account.html'; return null; }
  return u;
}
window.requireLogin = requireLogin;

async function getMyBalance(userId){
  const c = window.sb || initSB(); if(!c) return 0;
  const uid = userId || (await getCurrentUser())?.id;
  if(!uid) return 0;
  const {data} = await c.from('profiles').select('grind_balance').eq('id', uid).single();
  return Number(data?.grind_balance || 0);
}
window.getMyBalance = getMyBalance;

async function hasBoughtSong(userId, songId){
  const c = window.sb || initSB(); if(!c) return false;
  const {data} = await c.from('purchases').select('id').eq('fan_id', userId).eq('song_id', songId).eq('status','approved').maybeSingle();
  if(data) return true;
  const r2 = await c.from('purchases').select('id').eq('buyer_id', userId).eq('song_id', songId).maybeSingle();
  return !!r2.data;
}
window.hasBoughtSong = hasBoughtSong;

function shareSongLink(id, title, artist){
  if(isRemovedSong(id)){ alert('❌ This song was removed. Share NTABAZI instead.'); return; }
  const url = location.origin + "/index.html?song=" + id;
  const text = "Listen to " + title + " by " + artist + " on Marotholi Les-Pot: " + url;
  if(navigator.share){ navigator.share({title: title, text: text, url: url}).catch(()=>{}); }
  else { try{ navigator.clipboard.writeText(url); alert("Link copied! " + url); }catch(e){ alert(url); } }
}
window.shareSongLink = shareSongLink;

document.addEventListener('DOMContentLoaded', function(){ initSB(); });
if(window.supabase) initSB();
let _sbRetry=0;
const _sbTimer=setInterval(function(){
  if(window.sb || _sbRetry>10){ clearInterval(_sbTimer); return; }
  _sbRetry++; initSB();
},500);