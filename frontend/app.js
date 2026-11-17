// ===== MAROTHOLI LES-POT - app.js - FIXED for sb_publishable =====
const SUPABASE_URL = "https://mmkxiniybctmgoozaecp.supabase.co";
const SUPABASE_KEY = "sb_publishable_wWhjXCZ4JWfGlCIG95kzPg_WXqzfVDP";
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_KEY = SUPABASE_KEY;
window.SUPABASE_ANON_KEY = SUPABASE_KEY;

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

// Helpers
function escHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function formatPrice(p){ const g=Number(p||0); return g.toFixed(2)+" G = M"+(g*10).toFixed(2); }
function grindToMaloti(g){ return (Number(g||0)*10).toFixed(2); }
function splitMoney(price){ const p=Number(price); return { artist: +(p*0.63).toFixed(4), platform: +(p*0.23).toFixed(4), fees: +(p*0.14).toFixed(4) }; }
function getPreviewRange(start){ const s=Number(start||0); return { start: s, end: s+30 }; }
function getCoverUrl(path){
  if(!path) return 'icon.svg';
  if(String(path).startsWith('http')) return path;
  const c = window.sb || initSB();
  if(!c) return 'icon.svg';
  try{ const {data} = c.storage.from('covers').getPublicUrl(path); return data?.publicUrl || 'icon.svg'; }catch(e){ return 'icon.svg'; }
}
async function getSongStreamUrl(path, expires){
  if(!path) return null;
  if(String(path).startsWith('http')) return path;
  const c = window.sb || initSB(); if(!c) return null;
  try{
    const {data, error} = await c.storage.from('songs').createSignedUrl(path, expires||3600);
    if(error) throw error;
    return data?.signedUrl || null;
  }catch(e){ console.log("Stream URL error", e.message); return null; }
}
async function getCurrentUser(){
  const c = window.sb || initSB(); if(!c) return null;
  const {data} = await c.auth.getUser();
  return data?.user || null;
}
async function requireLogin(){
  const u = await getCurrentUser();
  if(!u){ alert("Please login first"); location.href='account.html'; return null; }
  return u;
}
function shareSongLink(id, title, artist){
  const url = location.origin + "/index.html?song=" + id;
  const text = "Listen to " + title + " by " + artist + " on Marotholi Les-Pot: " + url;
  if(navigator.share){ navigator.share({title: title, text: text, url: url}); }
  else { navigator.clipboard.writeText(url); alert("Link copied! " + url); }
}
// Auto-init on load
document.addEventListener('DOMContentLoaded', function(){ initSB(); });
if(window.supabase) initSB();
