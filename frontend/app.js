// =================================================
// app.js - MAROTHOLI LES-POT - FULL FILE
// =================================================
// YOUR SUPABASE - LOCKED IN:
// URL: https://mmkxiniybctmgoozaecp.supabase.co
// KEY: sb_publishable_... = PUBLISHABLE / ANON key
// This key is MEANT to be in the app - SAFE, NOT a leak
// NEVER put service_role key here
//
// RULES:
// - Artist sets OWN price, never 1G fixed. 1G = M10 only conversion
// - Deposits: EcoCash 128235 + Postbank 1040278800016 ONLY
// - Mpesa + PayFast = PAUSED
// - Withdrawals: ANY account, Lesotho + South Africa ONLY
// - Artist gets 63%
// - Drop NOW / Drop LATER auto-drops at exact time
// - Songs stream-only via signed URL - no download
// =================================================

// -------------------------------------------------
// 1. SUPABASE SETUP - YOUR LINK + YOUR KEY
// -------------------------------------------------
const SUPA_URL = "https://mmkxiniybctmgoozaecp.supabase.co";
const SUPA_KEY = "sb_publishable_wWhjXCZ4JWfGlCIG95kzPg_WXqzfVDP";

// Keep old names too so every file works
const SUPABASE_URL = SUPA_URL;
const SUPABASE_ANON_KEY = SUPA_KEY;

if (typeof supabase !== "undefined") {
  window.sb = supabase.createClient(SUPA_URL, SUPA_KEY);
} else {
  console.error("Supabase JS not loaded - check script tag in HTML");
}

// -------------------------------------------------
// 2. HELPERS
// -------------------------------------------------
function showMsg(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function fmtG(n) {
  const v = Number(n || 0);
  return v.toFixed(2) + " G";
}

function fmtM(n) {
  const v = Number(n || 0);
  return "M" + (v * 10).toFixed(2);
}

function escHtml(s) {
  return String(s || "").replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

// -------------------------------------------------
// 3. AUTH + PROFILE
// -------------------------------------------------
async function getMyProfile() {
  const { data: { user } } = await window.sb.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await window.sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile };
}

async function requireLogin() {
  const { data: { user } } = await window.sb.auth.getUser();
  if (!user) {
    location.href = "auth.html";
    return null;
  }
  return user;
}

async function signUp(email, password, username) {
  const { data, error } = await window.sb.auth.signUp({
    email: email,
    password: password,
  });
  if (error) {
    alert(error.message);
    return null;
  }
  const user = data.user;
  if (user) {
    await window.sb.from("profiles").insert({
      id: user.id,
      email: email,
      username: username || email.split("@")[0],
      grind_balance: 0,
    });
  }
  return user;
}

async function signIn(email, password) {
  const { data, error } = await window.sb.auth.signInWithPassword({
    email: email,
    password: password,
  });
  if (error) {
    alert(error.message);
    return null;
  }
  return data.user;
}

async function signOut() {
  await window.sb.auth.signOut();
  location.href = "auth.html";
}

// -------------------------------------------------
// 4. WALLET - BALANCE
// -------------------------------------------------
async function getBalance() {
  const { user, profile } = await getMyProfile();
  if (!profile) return 0;
  return Number(profile.grind_balance || 0);
}

async function refreshBalanceUI() {
  const bal = await getBalance();
  const big = document.getElementById("walletBalance");
  if (big) big.textContent = fmtG(bal);
  const sub = document.getElementById("walletSub");
  if (sub) sub.textContent = fmtM(bal) + " • Min withdraw 2.5 G • M25";
  const top = document.getElementById("topBal");
  if (top) top.textContent = "G " + bal.toFixed(2);
  return bal;
}

// -------------------------------------------------
// 5. DEPOSITS - ECOCASH + POSTBANK ONLY
// Mpesa + PayFast = PAUSED
// -------------------------------------------------
async function submitDeposit(amountG, method, ref) {
  const amt = Number(amountG);
  const cleanRef = String(ref || "").trim();

  if (method === "Mpesa" || method === "PayFast") {
    alert("⏸️ " + method + " is PAUSED. Use EcoCash or Postbank / Visa.");
    return;
  }

  if (!amt || amt <= 0) {
    alert("Enter amount in G");
    return;
  }

  if (amt < 0.01) {
    alert("Min deposit 0.01 G");
    return;
  }

  if (!cleanRef) {
    alert("Paste OTP / Reference first");
    return;
  }

  if (method !== "EcoCash" && method !== "Postbank") {
    alert("Only EcoCash and Postbank are live right now.");
    return;
  }

  const user = await requireLogin();
  if (!user) return;

  const { error } = await window.sb.from("deposits").insert({
    user_id: user.id,
    amount_grind: amt,
    amount_maloti: amt * 10,
    payment_method: method,
    payment_ref: cleanRef,
    status: "pending",
  });

  if (error) {
    alert("Deposit failed: " + error.message);
    return;
  }

  alert("✅ Deposit sent! Wait for Admin approval.\n\nYou paid via " + method + " - Ref: " + cleanRef);
  location.reload();
}

// -------------------------------------------------
// 6. WITHDRAWALS - ANY ACCOUNT, LS + ZA ONLY
// -------------------------------------------------
async function submitWithdrawal(amountG, method, details) {
  const amt = Number(amountG);
  const cleanDetails = String(details || "").trim();

  if (!amt || amt < 2.5) {
    alert("Minimum withdrawal is 2.5 G = M25");
    return;
  }

  if (!cleanDetails) {
    alert("Enter your number / account details + full name");
    return;
  }

  const lower = cleanDetails.toLowerCase();
  const isLesotho = lower.includes("lesotho");
  const isSA = lower.includes("south africa") || lower.includes("south_africa");

  if (!isLesotho && !isSA) {
    alert("❌ Withdrawals are Lesotho + South Africa ONLY.\nOther countries are not allowed.");
    return;
  }

  if (lower.startsWith("other") || lower.includes("| other")) {
    alert("❌ Withdrawals are Lesotho + South Africa ONLY.");
    return;
  }

  const user = await requireLogin();
  if (!user) return;

  const { profile } = await getMyProfile();
  const bal = Number(profile?.grind_balance || 0);

  if (amt > bal) {
    alert("Not enough balance. You have " + bal.toFixed(2) + " G, you tried " + amt + " G");
    return;
  }

  const { error } = await window.sb.from("withdrawals").insert({
    user_id: user.id,
    amount_grind: amt,
    amount_maloti: amt * 10,
    payment_method: method,
    payment_details: cleanDetails,
    account_details: cleanDetails,
    status: "pending",
  });

  if (error) {
    alert("Withdrawal failed: " + error.message);
    return;
  }

  alert("✅ Withdrawal requested: " + amt + " G to " + method + "\nAdmin will pay you soon.");
  location.reload();
}

// -------------------------------------------------
// 7. LOAD WALLET - DEPOSITS + WITHDRAWALS
// -------------------------------------------------
async function loadWallet() {
  const depEl = document.getElementById("myDeposits");
  const wdEl = document.getElementById("myWithdrawals");

  try {
    const { data: { user } } = await window.sb.auth.getUser();
    if (!user) {
      if (depEl) depEl.innerHTML = "<p class='small'>Login first</p>";
      if (wdEl) wdEl.innerHTML = "<p class='small'>Login first</p>";
      return;
    }

    if (depEl) {
      const { data: deps } = await window.sb
        .from("deposits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!deps || !deps.length) {
        depEl.innerHTML = "<p class='small'>No deposits yet. Top up with EcoCash or Postbank.</p>";
      } else {
        depEl.innerHTML = deps.map(function (d) {
          return "<div style='padding:8px 0;border-bottom:1px solid #333'><b>+" + Number(d.amount_grind || 0).toFixed(2) + " G</b> <span class='small'>via " + escHtml(d.payment_method) + " • " + escHtml(d.status) + " • " + new Date(d.created_at).toLocaleString() + "</span></div>";
        }).join("");
      }
    }

    if (wdEl) {
      const { data: wds } = await window.sb
        .from("withdrawals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!wds || !wds.length) {
        wdEl.innerHTML = "<p class='small'>No withdrawals yet.</p>";
      } else {
        wdEl.innerHTML = wds.map(function (w) {
          const det = w.payment_details || w.account_details || "";
          return "<div style='padding:8px 0;border-bottom:1px solid #333'><b>-" + Number(w.amount_grind || 0).toFixed(2) + " G</b> <span class='small'>to " + escHtml(w.payment_method) + " • " + escHtml(w.status) + "<br>" + escHtml(det) + " • " + new Date(w.created_at).toLocaleString() + "</span></div>";
        }).join("");
      }
    }

    await refreshBalanceUI();
  } catch (e) {
    if (depEl) depEl.innerHTML = "Error: " + e.message;
  }
}

// -------------------------------------------------
// 8. MUSIC - BUY WITH WALLET - ARTIST PRICE ONLY
// Artist gets 63%
// -------------------------------------------------
async function buySongWithWallet(songId, priceGrind, artistId) {
  const price = Number(priceGrind);
  if (!price || price <= 0) {
    alert("Invalid artist price");
    return;
  }

  const user = await requireLogin();
  if (!user) return;

  if (artistId && artistId === user.id) {
    alert("You already own your own song - it's in Library / My Uploads");
    return;
  }

  const { data: existing } = await window.sb
    .from("purchases")
    .select("id")
    .eq("fan_id", user.id)
    .eq("song_id", songId)
    .eq("status", "approved")
    .maybeSingle();

  if (existing) {
    alert("✅ You already own this song. Play it in Library.");
    location.href = "library.html";
    return;
  }

  const { profile } = await getMyProfile();
  const bal = Number(profile?.grind_balance || 0);

  if (bal < price) {
    alert("Not enough. You have " + bal.toFixed(2) + " G, need " + price + " G (artist price). Top up in Wallet.");
    location.href = "wallet.html";
    return;
  }

  const { error: deductErr } = await window.sb
    .from("profiles")
    .update({ grind_balance: bal - price })
    .eq("id", user.id);

  if (deductErr) {
    alert("Buy failed: " + deductErr.message);
    return;
  }

  const artistCut = price * 0.63;
  if (artistId) {
    const { data: artistProfile } = await window.sb
      .from("profiles")
      .select("grind_balance")
      .eq("id", artistId)
      .single();

    if (artistProfile) {
      await window.sb
        .from("profiles")
        .update({ grind_balance: Number(artistProfile.grind_balance || 0) + artistCut })
        .eq("id", artistId);
    }
  }

  const { error: buyErr } = await window.sb.from("purchases").insert({
    song_id: songId,
    fan_id: user.id,
    price_grind: price,
    payment_method: "Wallet",
    payment_ref: "WALLET-" + Date.now(),
    status: "approved",
  });

  if (buyErr) {
    alert("Buy failed: " + buyErr.message);
    return;
  }

  try {
    const { data: song } = await window.sb
      .from("songs")
      .select("total_buys")
      .eq("id", songId)
      .single();
    await window.sb
      .from("songs")
      .update({ total_buys: Number(song?.total_buys || 0) + 1 })
      .eq("id", songId);
  } catch (e) {}

  alert("✅ BOUGHT! Artist got " + artistCut.toFixed(2) + " G (63%). Play it in Library.");
  location.href = "library.html";
}

// -------------------------------------------------
// 9. MUSIC - SECURE STREAMING - NO DOWNLOAD
// Signed URL expires in 1 hour
// -------------------------------------------------
async function getSongStreamUrl(audioPath, expiresInSeconds) {
  if (!audioPath) return null;
  const { data, error } = await window.sb.storage
    .from("songs")
    .createSignedUrl(audioPath, expiresInSeconds || 3600);

  if (error || !data) {
    console.error("Stream URL failed", error);
    return null;
  }
  return data.signedUrl;
}

async function playPreview(audioEl, audioPath, title) {
  const url = await getSongStreamUrl(audioPath, 35);
  if (!url) return;
  audioEl.src = url;
  audioEl.currentTime = 0;
  try { await audioEl.play(); } catch (e) {}
  audioEl.addEventListener("timeupdate", function () {
    if (audioEl.currentTime >= 30) {
      audioEl.pause();
      audioEl.currentTime = 0;
      alert("Preview ended - Buy to hear full song");
    }
  });
}

// -------------------------------------------------
// 10. SCHEDULED DROPS - AUTO-DROP AT EXACT TIME
// -------------------------------------------------
async function checkScheduledDrops() {
  try {
    const { data: ups } = await window.sb
      .from("songs")
      .select("id, drop_date")
      .eq("status", "upcoming");

    if (!ups || !ups.length) return;
    const now = new Date();
    for (const s of ups) {
      if (s.drop_date && new Date(s.drop_date) <= now) {
        await window.sb
          .from("songs")
          .update({ status: "published", is_upcoming: false })
          .eq("id", s.id);
      }
    }
  } catch (e) {}
}

// -------------------------------------------------
// 11. SHARE LINK - TO APP ONLY, NOT TO FILE
// -------------------------------------------------
function getSongShareLink(songId) {
  return location.origin + "/discover.html?song=" + songId;
}

function shareSongLink(songId, title, artist) {
  const url = getSongShareLink(songId);
  const text = "🔥 Listen to " + title + " by " + artist + " on Marotholi Les-Pot";
  if (navigator.share) {
    navigator.share({ title: title, text: text, url: url }).catch(function () {});
  } else {
    navigator.clipboard.writeText(text + " " + url).then(function () {
      alert("🔗 Share link copied! Goes to app, NOT to download.");
    });
  }
}

// -------------------------------------------------
// 12. ADMIN - APPROVE / REJECT
// -------------------------------------------------
async function approveDeposit(depositId, userId, amountG) {
  const { error: upErr } = await window.sb
    .from("deposits")
    .update({ status: "approved" })
    .eq("id", depositId);
  if (upErr) return alert(upErr.message);

  const { data: p } = await window.sb
    .from("profiles")
    .select("grind_balance")
    .eq("id", userId)
    .single();

  await window.sb
    .from("profiles")
    .update({ grind_balance: Number(p?.grind_balance || 0) + Number(amountG) })
    .eq("id", userId);

  alert("✅ Deposit approved - " + amountG + " G added");
  location.reload();
}

async function approvePurchase(purchaseId, songId, fanId, priceGrind, artistId) {
  const price = Number(priceGrind);
  const { error } = await window.sb
    .from("purchases")
    .update({ status: "approved" })
    .eq("id", purchaseId);
  if (error) return alert(error.message);

  if (artistId) {
    const { data: ap } = await window.sb
      .from("profiles")
      .select("grind_balance")
      .eq("id", artistId)
      .single();
    await window.sb
      .from("profiles")
      .update({ grind_balance: Number(ap?.grind_balance || 0) + price * 0.63 })
      .eq("id", artistId);
  }

  try {
    const { data: song } = await window.sb.from("songs").select("total_buys").eq("id", songId).single();
    await window.sb.from("songs").update({ total_buys: Number(song?.total_buys || 0) + 1 }).eq("id", songId);
  } catch (e) {}

  alert("✅ Purchase approved");
  location.reload();
}

async function approveWithdrawal(withdrawalId, userId, amountG) {
  const { error } = await window.sb
    .from("withdrawals")
    .update({ status: "approved" })
    .eq("id", withdrawalId);
  if (error) return alert(error.message);

  const { data: p } = await window.sb
    .from("profiles")
    .select("grind_balance")
    .eq("id", userId)
    .single();

  await window.sb
    .from("profiles")
    .update({ grind_balance: Number(p?.grind_balance || 0) - Number(amountG) })
    .eq("id", userId);

  alert("✅ Withdrawal approved - paid, " + amountG + " G deducted");
  location.reload();
}

async function rejectItem(table, id) {
  const { error } = await window.sb.from(table).update({ status: "rejected" }).eq("id", id);
  if (error) return alert(error.message);
  alert("Rejected");
  location.reload();
}

// -------------------------------------------------
// 13. GLOBAL START
// -------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
  checkScheduledDrops();
  setInterval(checkScheduledDrops, 60000);
});