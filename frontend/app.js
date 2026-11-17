// ============================================
// MAROTHOLI LES-POT - app.js - FINAL SIMPLE VERSION
// Built: 11 Nov 2026 - Simple like Yesterday
// FIXED 17 Nov 2026 - Stops fighting index.html + deposit.html
// ============================================
// FIXED RULES - DO NOT CHANGE:
// 1G = M10 - CONVERSION ONLY, not song price
// Artist sets own song price, min 0.2G = M2
// Split: 63% Artist / 23% Platform / 14% Fees = 100%
// Min Withdraw: 3.5G = M35 / R35
// Deposit: EcoCash + PostBank ONLY, others LOCKED
// Preview: Max 30 sec, artist picks start time
// No Download - Stream Only - Lock Screen Player
// Admin approves everything manually
// ============================================

const SUPA_URL = "https://mmkxiniybctmgoozaecp.supabase.co";
const SUPA_KEY = "sb_publishable_wWhjXCZ4JWfGlCIG95kzPg_WXqzfVDP";
const GRIND_TO_MALOTI = 10;
const ARTIST_CUT = 0.63;
const PLATFORM_CUT = 0.23;
const FEES_CUT = 0.14;
const MIN_SONG_PRICE = 0.2;
const MIN_WITHDRAW = 3.5;
const PREVIEW_MAX_SECONDS = 30;

const DEPOSIT_METHODS = [
  { id: "ecocash", name: "EcoCash Merchant", number: "128235", accountName: "Marotholi Lespot MSU", active: true },
  { id: "postbank", name: "PostBank Visa", number: "1040278800016", accountName: "Marotholi Lespot MSU", active: true },
  { id: "mpesa", name: "M-Pesa Lesotho", number: "", accountName: "", active: false, lockedReason: "Coming Soon" },
  { id: "capitec", name: "Capitec SA", number: "", accountName: "", active: false, lockedReason: "Coming Soon" },
  { id: "fnb", name: "FNB SA", number: "", accountName: "", active: false, lockedReason: "Coming Soon" },
  { id: "standardbank", name: "Standard Bank SA", number: "", accountName: "", active: false, lockedReason: "Coming Soon" }
];

// FIXED: Was still old Vercel link - now your real domain
const APP_URL = "https://marotholigrinders.com/";

// --- Don't crash if Supabase CDN hasn't loaded yet ---
let sb = null;
function initSB() {
  if (sb) return sb;
  if (typeof window !== "undefined" && window.supabase && window.supabase.createClient) {
    try {
      sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);
      window.sb = sb;
    } catch (e) {
      console.log("Supabase create failed:", e.message);
    }
  }
  return sb;
}
initSB();
window.sb = sb;
// Retry once if CDN was slow - fixes white screen on slow phones
setTimeout(initSB, 500);

function grindToMaloti(g) {
  return (Number(g || 0) * GRIND_TO_MALOTI).toFixed(2);
}
function formatPrice(g) {
  const price = Number(g || 0);
  return price.toFixed(2) + " G = M" + grindToMaloti(price);
}
function splitMoney(totalGrind) {
  const total = Number(totalGrind || 0);
  return { artist: total * ARTIST_CUT, platform: total * PLATFORM_CUT, fees: total * FEES_CUT, total: total };
}
function escHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
async function getCurrentUser() {
  const client = initSB();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data ? data.user : null;
}
async function getMyProfile() {
  const user = await getCurrentUser();
  if (!user) return { user: null, profile: null };
  const client = initSB();
  const { data: profile } = await client.from("profiles").select("*").eq("id", user.id).single();
  return { user: user, profile: profile };
}
async function requireLogin() {
  const user = await getCurrentUser();
  if (!user) { location.href = "account.html"; return null; }
  return user;
}
// --- FIXED: Handles all audio_path formats ---
function cleanStoragePath(p) {
  if (!p) return "";
  let path = String(p).trim();
  const marker = "/songs/";
  if (path.includes(marker)) {
    path = path.split(marker).pop().split("?")[0];
  }
  path = path.replace(/^\/+/, "").replace(/^songs\//, "");
  try { path = decodeURIComponent(path); } catch(e) {}
  return path;
}
async function getSongStreamUrl(audioPath, seconds) {
  const client = initSB();
  if (!audioPath) return null;
  const raw = String(audioPath).trim();
  if (raw.includes('/storage/v1/object/')) {
    const clean = cleanStoragePath(raw);
    if (client && clean) {
      try {
        const { data, error } = await client.storage.from("songs").createSignedUrl(clean, seconds || 3600);
        if (!error && data && data.signedUrl) {
          console.log('Using SIGNED URL for:', clean);
          return data.signedUrl;
        }
        console.log('Signed failed:', error ? error.message : 'no url');
      } catch(e) { console.log('Signed exception:', e.message); }
      try {
        const { data } = client.storage.from("songs").getPublicUrl(clean);
        if (data && data.publicUrl) return data.publicUrl;
      } catch(e) {}
    }
    return raw;
  }
  if (raw.startsWith("http")) return raw;
  if (!client) return null;
  const clean = cleanStoragePath(raw);
  if (!clean) return null;
  try {
    const { data, error } = await client.storage.from("songs").createSignedUrl(clean, seconds || 3600);
    if (!error && data && data.signedUrl) return data.signedUrl;
    console.log("Signed URL failed, trying public URL:", error ? error.message : "no url");
  } catch(e) { console.log("Signed URL exception:", e.message); }
  try {
    const { data } = client.storage.from("songs").getPublicUrl(clean);
    if (data && data.publicUrl) return data.publicUrl;
  } catch(e) {}
  return null;
}
function getCoverUrl(coverPath) {
  if (!coverPath) return "icon.svg";
  const raw = String(coverPath).trim();
  if (raw.startsWith("http")) return raw;
  const clean = cleanStoragePath(raw);
  if (!clean) return "icon.svg";
  return SUPA_URL + "/storage/v1/object/public/covers/" + encodeURIComponent(clean).replace(/%2F/g, "/");
}
function shareSongLink(songId, title, artistName) {
  const link = APP_URL + "discover.html?song=" + songId;
  const text = "🔥 Listen to " + title + " by " + artistName + " on Marotholi Les-Pot " + link;
  if (navigator.share) {
    navigator.share({ title: title + " - Marotholi Les-Pot", text: text, url: link }).catch(function() {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() {
      alert("✅ Link copied! Paste it on WhatsApp / Facebook:\n\n" + link);
    });
  } else {
    prompt("Copy this link:", link);
  }
}
function getPreviewRange(previewStart) {
  const start = Number(previewStart || 0);
  return { start: start, end: start + PREVIEW_MAX_SECONDS, max: PREVIEW_MAX_SECONDS };
}
console.log("Marotholi Les-Pot app.js loaded - 1G = M10 FIXED - 63/23/14 - Min Withdraw 3.5G");

// ============================================
// FIXED HELPERS - Respect pages that have their own loaders
// ============================================

async function loadBalanceBadge() {
  // FIXED: Don't fight deposit.html - it has its own loadBalance() for #bal
  if (document.getElementById('myDeposits')) return;
  // FIXED: Don't fight index.html - it has its own loadBalance() for #balText
  if (window._homeOwnsSongList) return;
  const el = document.getElementById('bal');
  if (!el) return;
  const { user, profile } = await getMyProfile();
  if (!user) { el.textContent = 'G 0.00'; return; }
  el.textContent = Number(profile?.grind_balance || 0).toFixed(2) + ' G';
}

async function loadSongs(searchTerm) {
  // FIXED: index.html owns #songList - do NOT overwrite its pretty cards
  if (window._homeOwnsSongList) return;
  const containers = [
    document.getElementById('latestSongs'),
    document.getElementById('songsList'),
    document.getElementById('discoverSongs'),
    document.getElementById('songList'),
    document.getElementById('songs')
  ].filter(Boolean);
  if (!containers.length) return;
  const client = initSB();
  if (!client) {
    containers.forEach(c => c.innerHTML = '<p>Connecting to Supabase... refresh if stuck</p>');
    return;
  }
  let q = client.from('songs').select('*').order('created_at', { ascending: false }).limit(50);
  if (searchTerm) q = q.or('title.ilike.%' + searchTerm + '%,artist_name.ilike.%' + searchTerm + '%');
  const { data: songs, error } = await q;
  const conn = document.getElementById('connecting');
  if (conn) conn.style.display = 'none';
  if (error) {
    containers.forEach(c => c.innerHTML = '<p>Could not load songs: ' + escHtml(error.message) + '</p>');
    return;
  }
  if (!songs || !songs.length) {
    containers.forEach(c => c.innerHTML = '<p>No songs yet.</p>');
    return;
  }
  let html = '';
  for (const s of songs) {
    const price = Number(s.price_grind || s.price || 0.5);
    const previewStart = Number(s.preview_start || 0);
    const artistId = s.artist_id || s.user_id || '';
    const cover = getCoverUrl(s.cover_path || s.cover_url);
    html += '<div class="card song" style="padding:12px;margin-bottom:12px">'
      + '<img src="' + cover + '" onerror="this.src=\'icon.svg\'" style="width:64px;height:64px;border-radius:12px;object-fit:cover;float:left;margin-right:10px">'
      + '<b>' + escHtml(s.title) + '</b><br><small>' + escHtml(s.artist_name || '') + ' • ' + formatPrice(price) + '</small><br>'
      + '<div style="display:flex;gap:8px;margin-top:8px;clear:both">'
      + '<button onclick="playPreviewFor(\'' + s.id + '\', ' + previewStart + ', this)">▶️ Preview 30s</button>'
      + '<button onclick="buySongWithWallet(\'' + s.id + '\', ' + price + ', \'' + artistId + '\')">Buy ' + price + ' G</button>'
      + '<button onclick="shareSongLink(\'' + s.id + '\', \'' + escHtml(s.title) + '\', \'' + escHtml(s.artist_name || '') + '\')">Share</button>'
      + '</div><div class="preview-holder" data-song="' + s.id + '"></div></div>';
  }
  containers.forEach(c => c.innerHTML = html);
  window._allSongs = songs;
}
window.loadSongs = loadSongs;
window.loadDiscover = loadSongs;
window.loadLatestSongs = loadSongs;

async function playPreviewFor(songId, previewStart, btn) {
  const song = (window._allSongs || []).find(x => String(x.id) === String(songId));
  if (!song) return;
  const holder = btn.parentElement.parentElement.querySelector('.preview-holder');
  if (!holder) return;
  let audio = holder.querySelector('audio');
  if (!audio) {
    const url = await getSongStreamUrl(song.audio_path || song.audio_url || song.file_url);
    if (!url) { alert('No audio for this song'); return; }
    audio = document.createElement('audio');
    audio.src = url;
    audio.controls = true;
    audio.style.width = '100%';
    audio.style.marginTop = '8px';
    holder.appendChild(audio);
  }
  if (audio.paused) {
    document.querySelectorAll('audio').forEach(a => { if (a !== audio) a.pause(); });
    audio.currentTime = Number(previewStart || 0);
    audio.play();
    btn.textContent = '⏸️ Pause Preview';
    audio.ontimeupdate = function() {
      if (audio.currentTime >= Number(previewStart || 0) + PREVIEW_MAX_SECONDS) {
        audio.pause();
        btn.textContent = '▶️ Preview 30s';
        alert('PREVIEW ENDED - Buy for full');
      }
    };
  } else {
    audio.pause();
    btn.textContent = '▶️ Preview 30s';
  }
}
window.playPreviewFor = playPreviewFor;

function renderDepositMethods() {
  const el = document.getElementById('deposit-details');
  if (!el) return;
  let h = '<h3>Deposit - EcoCash | PostBank</h3>';
  DEPOSIT_METHODS.forEach(m => {
    if (m.active) {
      h += '<div class="pay-card"><strong>' + escHtml(m.name) + ':</strong> ' + escHtml(m.number) + '<br><small>' + escHtml(m.accountName) + '</small><br><button onclick="navigator.clipboard.writeText(\'' + m.number + '\').then(()=>alert(\'Copied\'))">Copy</button></div>';
    } else {
      h += '<div class="pay-card" style="opacity:.5"><strong>' + escHtml(m.name) + ':</strong> 🔒 ' + escHtml(m.lockedReason || 'Coming Soon') + '</div>';
    }
  });
  el.innerHTML = h;
}

async function loadWallet() {
  const { user, profile } = await getMyProfile();
  // FIXED: deposit.html owns #bal, don't overwrite it
  if (!document.getElementById('myDeposits')) {
    const b = document.getElementById('walletBalance') || document.getElementById('bal');
    if (b && profile) b.textContent = Number(profile.grind_balance || 0).toFixed(2) + ' G';
  }
  const b2 = document.getElementById('balBig');
  if (b2 && profile) b2.textContent = Number(profile.grind_balance || 0).toFixed(2) + ' G';
  const dep = document.getElementById('deposit-details');
  const prompt = document.getElementById('login-prompt');
  if (user) {
    if (dep) { dep.style.display = 'block'; renderDepositMethods(); }
    if (prompt) prompt.style.display = 'none';
    loadMyDeposits(user.id); loadMyWithdrawals(user.id);
  } else {
    if (dep) { dep.style.display = 'none'; dep.innerHTML = ''; }
    if (prompt) { prompt.style.display = 'block'; prompt.innerHTML = '<p>Login to see pay details</p><a href="account.html">Login</a>'; }
  }
}
async function submitDeposit(amount, method, reference) {
  // NOTE: deposit.html uses submitDepositForm() now - this is the generic fallback for other pages
  const user = await requireLogin(); if (!user) return;
  amount = Number(amount); if (!amount || amount <= 0) { alert('Enter amount'); return; }
  if (!reference) { alert('Paste OTP / Reference'); return; }
  const client = initSB();
  const { data: dup } = await client.from('deposits').select('id').eq('reference', reference).maybeSingle();
  if (dup) { alert('This reference was already used! Use a new EcoCash / PostBank code.'); return; }
  const { error } = await client.from('deposits').insert({ user_id: user.id, amount_grind: amount, method: method, reference: reference, status: 'pending' });
  if (error) { alert('Deposit failed: ' + error.message); return; }
  alert('✅ Deposit sent! Wait for Admin approval.'); location.reload();
}
window.submitDeposit = submitDeposit;
async function approveDeposit(id) {
  const client = initSB();
  const { data: dep } = await client.from('deposits').select('*').eq('id', id).single();
  if (!dep || dep.status !== 'pending') { alert('Already handled'); return; }
  await client.from('deposits').update({ status: 'approved' }).eq('id', id).eq('status', 'pending');
  const { data: prof } = await client.from('profiles').select('grind_balance').eq('id', dep.user_id).single();
  const bal = Number(prof?.grind_balance || 0);
  await client.from('profiles').update({ grind_balance: bal + Number(dep.amount_grind || 0) }).eq('id', dep.user_id);
  alert('✅ APPROVED +' + dep.amount_grind + ' G'); location.reload();
}
window.approveDeposit = approveDeposit;
async function rejectDeposit(id) { await initSB().from('deposits').update({ status: 'rejected' }).eq('id', id); location.reload(); }
window.rejectDeposit = rejectDeposit;
async function loadMyDeposits(userId) {
  const el = document.getElementById('myDeposits'); if (!el) return;
  // deposit.html has its own loadDeposits() - don't overwrite it if it already loaded
  if (document.getElementById('submitBtn') && document.getElementById('amountM')) return;
  const { data } = await initSB().from('deposits').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
  if (!data || !data.length) { el.innerHTML = '<p>No deposits yet.</p>'; return; }
  el.innerHTML = data.map(d => '<div class="card" style="padding:10px"><b>+' + d.amount_grind + ' G</b> • ' + escHtml(d.method || '') + ' • ' + escHtml(d.reference || '') + ' • ' + escHtml(d.status) + '</div>').join('');
}
async function submitWithdrawal(amount, method, number) {
  const user = await requireLogin(); if (!user) return;
  amount = Number(amount); if (!amount || amount < MIN_WITHDRAW) { alert('Minimum is ' + MIN_WITHDRAW + ' G (M' + (MIN_WITHDRAW * 10) + ')'); return; }
  if (!number) { alert('Enter EcoCash / PostBank number'); return; }
  const client = initSB();
  const { data: prof } = await client.from('profiles').select('grind_balance').eq('id', user.id).single();
  const bal = Number(prof?.grind_balance || 0); if (bal < amount) { alert('Not enough. You have ' + bal + ' G, need ' + amount + ' G'); return; }
  const { error } = await client.from('withdrawals').insert({ artist_id: user.id, amount_grind: amount, receive_method: method, receive_details: number, status: 'pending' });
  if (error) { alert('Withdrawal failed: ' + error.message); return; }
  alert('✅ Withdrawal sent!'); location.reload();
}
window.submitWithdrawal = submitWithdrawal; window.requestWithdrawal = submitWithdrawal;
async function approveWithdrawal(id) {
  const client = initSB();
  const { data: wd } = await client.from('withdrawals').select('*').eq('id', id).single();
  if (!wd || wd.status !== 'pending') { alert('Already handled'); return; }
  const { data: prof } = await client.from('profiles').select('grind_balance').eq('id', wd.artist_id).single();
  const bal = Number(prof?.grind_balance || 0); if (bal < Number(wd.amount_grind)) { alert('User has ' + bal + ' G, not enough'); return; }
  await client.from('withdrawals').update({ status: 'approved' }).eq('id', id).eq('status', 'pending');
  await client.from('profiles').update({ grind_balance: bal - Number(wd.amount_grind) }).eq('id', wd.artist_id);
  alert('✅ Withdrawal APPROVED. Now pay M' + (Number(wd.amount_grind) * 10).toFixed(0) + ' via ' + wd.receive_method + ' to ' + wd.receive_details); location.reload();
}
window.approveWithdrawal = approveWithdrawal; window.approveWithdraw = approveWithdrawal;
async function rejectWithdrawal(id) { await initSB().from('withdrawals').update({ status: 'rejected' }).eq('id', id); location.reload(); }
window.rejectWithdrawal = rejectWithdrawal; window.rejectWithdraw = rejectWithdrawal;
async function loadMyWithdrawals(userId) {
  const el = document.getElementById('myWithdrawals'); if (!el) return;
  const { data } = await initSB().from('withdrawals').select('*').eq('artist_id', userId).order('created_at', { ascending: false }).limit(20);
  if (!data || !data.length) { el.innerHTML = '<p>No withdrawals yet.</p>'; return; }
  el.innerHTML = data.map(w => '<div class="card" style="padding:10px"><b>-' + w.amount_grind + ' G</b> • ' + escHtml(w.receive_method || '') + ' • ' + escHtml(w.receive_details || '') + ' • ' + escHtml(w.status) + '</div>').join('');
}
async function buySongWithWallet(songId, price, artistId) {
  const user = await requireLogin(); if (!user) return;
  price = Number(price);
  const client = initSB();
  const { data: me } = await client.from('profiles').select('grind_balance').eq('id', user.id).single();
  const bal = Number(me?.grind_balance || 0);
  if (bal < price) { alert('Not enough. You have ' + bal + ' G, need ' + price + ' G. Top up first.'); return; }
  const { data: already } = await client.from('purchases').select('id').eq('fan_id', user.id).eq('song_id', songId).eq('status', 'approved').maybeSingle();
  if (already) { alert('You already own this. Go to Library.'); location.href = 'library.html'; return; }
  const { error: dErr } = await client.from('profiles').update({ grind_balance: bal - price }).eq('id', user.id);
  if (dErr) { alert('Deduct failed: ' + dErr.message); return; }
  const split = splitMoney(price);
  const { error: pErr } = await client.from('purchases').insert({ fan_id: user.id, song_id: songId, price_grind: price, fees_grind: split.fees, payment_method: 'Wallet', status: 'approved' }).select().single();
  if (pErr) { await client.from('profiles').update({ grind_balance: bal }).eq('id', user.id); alert('Purchase failed: ' + pErr.message + ' - Refunded'); return; }
  if (artistId && artistId !== user.id) {
    const { data: artist } = await client.from('profiles').select('grind_balance').eq('id', artistId).single();
    await client.from('profiles').update({ grind_balance: Number(artist?.grind_balance || 0) + split.artist }).eq('id', artistId);
  }
  try {
    const { data: song } = await client.from('songs').select('total_buys').eq('id', songId).single();
    if (song) await client.from('songs').update({ total_buys: Number(song.total_buys || 0) + 1 }).eq('id', songId);
  } catch(e) {}
  alert('✅ Bought! -' + price + ' G. New: ' + (bal - price).toFixed(2) + ' G');
  location.href = 'library.html';
}
window.buySongWithWallet = buySongWithWallet; window.buySong = buySongWithWallet;
async function loadLibrary() {
  const el = document.getElementById('librarySongs'); if (!el) return;
  const user = await getCurrentUser(); if (!user) { el.innerHTML = '<p>Login to see Library</p>'; return; }
  const client = initSB();
  const { data: purchases } = await client.from('purchases').select('song_id').eq('fan_id', user.id).eq('status', 'approved');
  const ids = (purchases || []).map(p => p.song_id); if (!ids.length) { el.innerHTML = '<p>No songs yet. Buy one in Discover.</p>'; return; }
  const { data: songs } = await client.from('songs').select('*').in('id', ids);
  let h = '';
  for (const s of (songs || [])) {
    const url = await getSongStreamUrl(s.audio_path || s.audio_url || s.file_url);
    h += '<div class="card song"><b>' + escHtml(s.title) + '</b><small>' + escHtml(s.artist_name || '') + '</small><audio controls src="' + (url || '') + '" style="width:100%"></audio></div>';
  }
  el.innerHTML = h;
}
async function loadAdmin() {
  const pd = document.getElementById('pendingDeposits'); const pw = document.getElementById('pendingWithdrawals'); const pp = document.getElementById('pendingPurchases');
  const client = initSB();
  if (pd) {
    const { data } = await client.from('deposits').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    pd.innerHTML = (!data || !data.length) ? '<p>No pending deposits</p>' : data.map(d => '<div class="card" style="padding:12px"><b>+' + d.amount_grind + ' G</b><br>' + escHtml(d.method) + ' • ' + escHtml(d.reference) + '<br><button onclick="approveDeposit(\'' + d.id + '\')">✅ Approve</button> <button onclick="rejectDeposit(\'' + d.id + '\')">Reject</button></div>').join('');
  }
  if (pw) {
    const { data } = await client.from('withdrawals').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    pw.innerHTML = (!data || !data.length) ? '<p>No pending withdrawals</p>' : data.map(w => '<div class="card" style="padding:12px"><b>-' + w.amount_grind + ' G (M' + (Number(w.amount_grind) * 10).toFixed(0) + ')</b><br>' + escHtml(w.receive_method) + ' • ' + escHtml(w.receive_details) + '<br><button onclick="approveWithdrawal(\'' + w.id + '\')">✅ Approve</button> <button onclick="rejectWithdrawal(\'' + w.id + '\')">Reject</button></div>').join('');
  }
  if (pp) {
    const { data } = await client.from('purchases').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    pp.innerHTML = (!data || !data.length) ? '<p>No pending purchases</p>' : data.map(p => '<div class="card" style="padding:12px"><b>Purchase</b><br><button onclick="approvePurchase(\'' + p.id + '\')">Approve</button> <button onclick="rejectPurchase(\'' + p.id + '\')">Reject</button></div>').join('');
  }
}
window.loadAdmin = loadAdmin;
async function approvePurchase(id) { await initSB().from('purchases').update({ status: 'approved' }).eq('id', id); location.reload(); }
window.approvePurchase = approvePurchase;
async function rejectPurchase(id) { await initSB().from('purchases').update({ status: 'rejected' }).eq('id', id); location.reload(); }
window.rejectPurchase = rejectPurchase;
async function approveSong(id) { alert('Songs are auto-approved'); } window.approveSong = approveSong;
async function rejectSong(id) { alert('Delete song from Supabase > songs table if needed'); } window.rejectSong = rejectSong;
function searchSongs() {
  const input = document.getElementById('searchInput') || document.getElementById('search');
  // FIXED: On home, search is handled by loadHome(), not loadSongs()
  if (window._homeOwnsSongList && typeof loadHome === 'function') { loadHome(); return; }
  loadSongs(input ? input.value.trim() : '');
}
window.searchSongs = searchSongs;

document.addEventListener('DOMContentLoaded', async () => {
  try { loadBalanceBadge(); } catch(e) {}
  try { if (document.getElementById('walletBalance')) loadWallet(); } catch(e) {}
  try { if (document.getElementById('deposit-details') || document.getElementById('login-prompt')) loadWallet(); } catch(e) {}
  try { if (document.getElementById('pendingDeposits') || document.getElementById('pendingWithdrawals')) loadAdmin(); } catch(e) {}
  try { if (document.getElementById('librarySongs')) loadLibrary(); } catch(e) {}
  try { await loadSongs(); } catch(e) { console.log(e); }
  // FIXED: Don't add a second search listener on home - home already has oninput="loadHome()"
  if (!window._homeOwnsSongList) {
    const searchBox = document.getElementById('searchInput') || document.getElementById('search');
    if (searchBox) searchBox.addEventListener('input', () => loadSongs(searchBox.value.trim()));
  }
});
