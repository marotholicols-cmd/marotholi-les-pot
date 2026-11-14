// ============================================
// MAROTHOLI LES-POT - app.js - FINAL SIMPLE VERSION
// Built: 11 Nov 2026 - Simple like Yesterday
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

const APP_URL = "https://marotholi-les-pot-frontend.vercel.app/";

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
  if (!user) { location.href = "auth.html"; return null; }
  return user;
}
// --- FIXED: Handles all audio_path formats ---
function cleanStoragePath(p) {
  if (!p) return "";
  let path = String(p).trim();
  // If it's a full Supabase storage URL, extract the file path after /songs/
  const marker = "/songs/";
  if (path.includes(marker)) {
    path = path.split(marker).pop().split("?")[0];
  }
  // Strip leading songs/ or / or bucket name
  path = path.replace(/^\/+/, "").replace(/^songs\//, "");
  // Decode %20 etc
  try { path = decodeURIComponent(path); } catch(e) {}
  return path;
}
async function getSongStreamUrl(audioPath, seconds) {
  const client = initSB();
  if (!audioPath) return null;
  const raw = String(audioPath).trim();
  // Already a direct http link - return as-is, don't break it
  if (raw.startsWith("http")) {
    // If it's a Supabase public URL, it already works
    return raw;
  }
  if (!client) return null;
  const clean = cleanStoragePath(raw);
  if (!clean) return null;
  // Try signed URL first (works for private bucket)
  try {
    const { data, error } = await client.storage.from("songs").createSignedUrl(clean, seconds || 3600);
    if (!error && data && data.signedUrl) return data.signedUrl;
    console.log("Signed URL failed, trying public URL:", error ? error.message : "no url");
  } catch(e) { console.log("Signed URL exception:", e.message); }
  // Fallback: public URL (works if bucket is public)
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