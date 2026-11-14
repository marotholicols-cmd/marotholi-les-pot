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
// >>> PASTE THE KEY THAT WORKED IN debug.html HERE - COPY FROM debug.html, DON'T TYPE <<<
const SUPA_KEY = "PASTE_YOUR_NEW_PUBLISHABLE_KEY_FROM_DEBUG_HTML_HERE";
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

// --- FIXED: Don't crash if Supabase CDN hasn't loaded yet ---
let sb = null;
if (typeof window !== "undefined" && window.supabase && window.supabase.createClient) {
  try {
    sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);
  } catch (e) {
    console.log("Supabase create failed:", e.message);
  }
} else {
  console.log("Supabase CDN not loaded yet - app.js waiting. Check index.html loads supabase-js BEFORE app.js");
}
window.sb = sb;

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
  if (!sb) return null;
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
async function getSongStreamUrl(audioPath, seconds) {
  if (!audioPath || !sb) return null;
  if (audioPath.startsWith("http")) return audioPath;
  const { data, error } = await sb.storage.from("songs").createSignedUrl(audioPath, seconds || 3600);
  if (error) { console.log("Stream error:", error.message); return null; }
  return data.signedUrl;
}
function getCoverUrl(coverPath) {
  if (!coverPath) return "icon.svg";
  if (coverPath.startsWith("http")) return coverPath;
  return SUPA_URL + "/storage/v1/object/public/covers/" + coverPath;
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