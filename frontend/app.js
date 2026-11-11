// ============================================================
// MAROTHOLI LES-POT - app.js - MAIN SHARED LOGIC
// ============================================================
// Supabase Keys - YOUR keys, used by ALL pages
// ============================================================
const SUPABASE_URL = "https://mmkxiniybctmgoozaecp.supabase.co";
const SUPABASE_KEY = "sb_publishable_wWhjXCZ4JWfGlCIG95kzPg_WXqzfVDP";

// ============================================================
// OFFICIAL PAYMENT ACCOUNTS - ONLY THESE 2 WORK
// EcoCash Merchant: 128235 - Marotholi Lespot MSU
// Postbank Visa: 1040278800016 - Marotholi Lespot
// NO M-PESA - DO NOT ADD IT BACK
// ============================================================
const PAY_ACCOUNTS = {
  EcoCash: {
    label: "EcoCash - Pay Merchant",
    number: "128235",
    name: "Marotholi Lespot MSU",
    instruction: "EcoCash > Pay Merchant > Enter 128235 > Enter Amount > Copy Reference"
  },
  Postbank: {
    label: "Postbank - Visa Account",
    number: "1040278800016",
    name: "Marotholi Lespot",
    instruction: "Transfer to Postbank Visa 1040278800016 > Copy Reference from receipt / SMS"
  }
};

const GRIND_PRICE_MALOTI = 10;
const MIN_DEPOSIT_GRINDS = 1;

// ============================================================
// SUPABASE CLIENT - created once, shared by all pages
// ============================================================
let sb = null;
if (window.supabase) {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  window.sb = sb;
} else {
  console.error("Supabase JS library failed to load. Check internet / CDN.");
}

// ============================================================
// AUTH + PROFILE HELPERS
// ============================================================

// Get logged-in user + their profile row (with grind_balance)
async function getMyProfile() {
  try {
    if (!sb) return { user: null, profile: null };
    const { data: { user }, error: userErr } = await sb.auth.getUser();
    if (userErr || !user) return { user: null, profile: null };

    const { data: profile, error: profErr } = await sb
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profErr) {
      console.warn("Profile load:", profErr.message);
      return { user, profile: null };
    }
    return { user, profile };
  } catch (e) {
    console.warn("getMyProfile error:", e);
    return { user: null, profile: null };
  }
}

// Make sure a profile row exists for this user (used on login/register)
async function ensureMyProfile(name, phone) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: existing } = await sb.from("profiles").select("*").eq("id", user.id).single();
  if (existing) return existing;
  const { data, error } = await sb.from("profiles").insert({
    id: user.id,
    email: user.email,
    full_name: name || user.email,
    phone: phone || "",
    grind_balance: 0
  }).select().single();
  if (error) console.warn("ensureMyProfile:", error.message);
  return data;
}

// Update every balance badge on the page (topBal, etc.)
function updateBalanceUI(balance) {
  const els = document.querySelectorAll("#topBal, #statBal");
  els.forEach(function (el) {
    if (el.id === "statBal") el.textContent = balance;
    else el.textContent = balance + " Grinds";
  });
}

// ============================================================
// DEPOSITS - TOP UP
// ============================================================

// Called from deposit.html - amount in Grinds, method = EcoCash / Postbank
async function submitDeposit(amount, method, reference) {
  const msg = document.getElementById("dMsg");

  function fail(text) {
    if (msg) { msg.textContent = text; msg.style.color = "#ff5252"; }
    else alert(text);
  }

  const { user } = await getMyProfile();
  if (!user) {
    alert("Please login first.");
    location.href = "auth.html";
    return;
  }

  const amt = parseInt(amount, 10);
  if (!amt || amt < MIN_DEPOSIT_GRINDS) {
    fail("Enter amount - min 1 Grind (M10)");
    return;
  }

  const ref = (reference || "").trim();
  if (!ref) {
    fail("Enter your Reference from EcoCash / Postbank");
    return;
  }
  if (ref.length < 4) {
    fail("Reference looks too short. Copy the full reference.");
    return;
  }

  // Safety: only allow the 2 real methods
  if (method !== "EcoCash" && method !== "Postbank") {
    fail("Invalid payment method. Use EcoCash or Postbank only.");
    return;
  }

  if (msg) { msg.textContent = "Sending deposit..."; msg.style.color = "#fff"; }

  const { error } = await sb.from("deposits").insert({
    user_id: user.id,
    amount_grinds: amt,
    method: method,
    reference: ref,
    status: "pending"
  });

  if (error) {
    fail("Failed: " + error.message);
    return;
  }

  if (msg) {
    msg.textContent = "✅ Sent for approval! You sent M" + (amt * 10) + " via " + method + " (" + PAY_ACCOUNTS[method].number + "). Check Wallet for status.";
    msg.style.color = "#00ff88";
  } else {
    alert("✅ Sent for approval!");
  }

  // Refresh the deposit list on the page if it exists
  const list = document.getElementById("myDeposits");
  if (list) loadMyDeposits(user.id);
}

// Load "My Deposits" list - used in deposit.html + wallet.html
async function loadMyDeposits(userId) {
  const el = document.getElementById("myDeposits");
  if (!el) return;
  try {
    const { data, error } = await sb
      .from("deposits")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      el.innerHTML = "Could not load deposits: " + error.message;
      return;
    }
    if (!data || !data.length) {
      el.innerHTML = "No deposits yet. Top up to see them here.";
      return;
    }

    el.innerHTML = data.map(function (d) {
      let cls = "status-pending";
      let label = "⏳ PENDING - waiting for admin";
      if (d.status === "approved") { cls = "status-approved"; label = "✅ APPROVED - Grinds added"; }
      if (d.status === "rejected") { cls = "status-rejected"; label = "❌ REJECTED - not found / no payment"; }

      const acct = PAY_ACCOUNTS[d.method] ? PAY_ACCOUNTS[d.method].number : "";
      const dateStr = d.created_at ? new Date(d.created_at).toLocaleString() : "";

      return (
        '<div style="padding:12px 0;border-bottom:1px solid #222">' +
          '<b>' + d.amount_grinds + ' Grinds</b> (M' + (d.amount_grinds * 10) + ') • ' + d.method + (acct ? ' ' + acct : '') + '<br>' +
          '<small>Ref: ' + d.reference + ' • ' + dateStr + '</small><br>' +
          '<small class="' + cls + '">' + label + '</small>' +
        '</div>'
      );
    }).join("");
  } catch (e) {
    el.innerHTML = "Could not load deposits.";
  }
}

// ============================================================
// SONGS + PURCHASES - shared helpers
// ============================================================

async function getMyPurchases(userId) {
  if (!userId) return [];
  const { data } = await sb.from("purchases").select("song_id").eq("user_id", userId);
  if (!data) return [];
  return data.map(function (p) { return p.song_id; });
}

async function buySongById(songId, priceGrinds, songTitle) {
  const { user, profile } = await getMyProfile();
  if (!user) { location.href = "auth.html"; return false; }
  const bal = profile ? (profile.grind_balance || 0) : 0;
  if (bal < priceGrinds) {
    alert("Not enough Grinds. You have " + bal + " Grinds. Need " + priceGrinds + ". Top up in Wallet.\n\nEcoCash 128235 • Postbank 1040278800016");
    location.href = "deposit.html";
    return false;
  }
  if (!confirm('Buy "' + (songTitle || "this song") + '" for ' + priceGrinds + ' Grind(s)?')) return false;
  const { error: upErr } = await sb.from("profiles").update({ grind_balance: bal - priceGrinds }).eq("id", user.id);
  if (upErr) { alert("Buy failed: " + upErr.message); return false; }
  const { error: pErr } = await sb.from("purchases").insert({ user_id: user.id, song_id: songId, price_grinds: priceGrinds });
  if (pErr) console.warn("Purchase record warning:", pErr.message);
  alert("✅ Purchased! Full song unlocked.");
  return true;
}

// ============================================================
// MISC HELPERS
// ============================================================

function copyPayNumber(number) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(number).then(function () { alert("Copied: " + number); });
  } else {
    prompt("Copy this:", number);
  }
}

function grindToMaloti(grinds) {
  return (grinds || 0) * GRIND_PRICE_MALOTI;
}

// Expose for console / debugging
window.PAY_ACCOUNTS = PAY_ACCOUNTS;
window.getMyProfile = getMyProfile;
window.submitDeposit = submitDeposit;
window.loadMyDeposits = loadMyDeposits;
