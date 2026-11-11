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
const GRIND_TO_MALOTI = 10; // FIXED: 1G = M10
const ARTIST_CUT = 0.63; // 63% Artist
const PLATFORM_CUT = 0.23; // 23% Platform
const FEES_CUT = 0.14; // 14% Fees
const MIN_SONG_PRICE = 0.2; // Min 0.2G = M2
const MIN_WITHDRAW = 3.5; // Min 3.5G = M35
const PREVIEW_MAX_SECONDS = 30; // Preview max 30 sec

// DEPOSIT METHODS - ONLY 2 ACTIVE, OTHERS LOCKED
const DEPOSIT_METHODS = [
  { id: "ecocash", name: "EcoCash Merchant", number: "128235", accountName: "Marotholi Lespot MSU", active: true },
  { id: "postbank", name: "PostBank Visa", number: "1040278800016", accountName: "Marotholi Lespot MSU", active: true },
  { id: "mpesa", name: "M-Pesa Lesotho", number: "", accountName: "", active: false, lockedReason: "Coming Soon" },
  { id: "capitec", name: "Capitec SA", number: "", accountName: "", active: false, lockedReason: "Coming Soon" },
  { id: "fnb", name: "FNB SA", number: "", accountName: "", active: false, lockedReason: "Coming Soon" },
  { id: "standardbank", name: "Standard Bank SA", number: "", accountName: "", active: false, lockedReason: "Coming Soon" }
];

const APP_URL = "https://marotholi-les-pot-frontend.vercel.app/";

// Supabase Client - ONE for whole app
const sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);
window.sb = sb;

// ---------- MONEY HELPERS ----------

// 1G = M10 - FIXED
function grindToMaloti(g) {
  return (Number(g || 0) * GRIND_TO_MALOTI).toFixed(2);
}

// Show price: "0.35 G = M3.50"
function formatPrice(g) {
  const price = Number(g || 0);
  return price.toFixed(2) + " G = M" + grindToMaloti(price);
}

// Split calculator: 63 / 23 / 14
function splitMoney(totalGrind) {
  const total = Number(totalGrind || 0);
  return {
    artist: total * ARTIST_CUT,
    platform: total * PLATFORM_CUT,
    fees: total * FEES_CUT,
    total: total
  };
}

// ---------- GENERAL HELPERS ----------

function escHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function getCurrentUser() {
  const { data } = await sb.auth.getUser();
  return data ? data.user : null;
}

async function getMyProfile() {
  const user = await getCurrentUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await sb.from("profiles").select("*").eq("id", user.id).single();
  return { user: user, profile: profile };
}

async function requireLogin() {
  const user = await getCurrentUser();
  if (!user) { location.href = "auth.html"; return null; }
  return user;
}

// ---------- SONG STREAMING ----------

// Get signed URL - Stream Only, expires in 1 hour
async function getSongStreamUrl(audioPath, seconds) {
  if (!audioPath) return null;
  if (audioPath.startsWith("http")) return audioPath;
  const { data, error } = await sb.storage.from("songs").createSignedUrl(audioPath, seconds || 3600);
  if (error) { console.log("Stream error:", error.message); return null; }
  return data.signedUrl;
}

// Get cover URL - covers bucket is public
function getCoverUrl(coverPath) {
  if (!coverPath) return "icon.svg";
  if (coverPath.startsWith("http")) return coverPath;
  return SUPA_URL + "/storage/v1/object/public/covers/" + coverPath;
}

// ---------- SHARE ----------

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

// ---------- PREVIEW LOGIC ----------
// Artist picks preview_start (e.g. 45 = start at 0:45)
// Preview = max 30 sec from that start, never more
function getPreviewRange(previewStart) {
  const start = Number(previewStart || 0);
  return { start: start, end: start + PREVIEW_MAX_SECONDS, max: PREVIEW_MAX_SECONDS };
}

console.log("Marotholi Les-Pot app.js loaded - 1G = M10 FIXED - 63/23/14 - Min Withdraw 3.5G");