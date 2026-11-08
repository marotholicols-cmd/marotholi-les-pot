// LES-POT - FINAL FIXED FOR REAL COLUMNS - FULL REPLACEMENT
const SUPABASE_URL = "https://mmkxiniybctmgoozaecp.supabase.co";
const SUPABASE_KEY = "sb_publishable_wWhjXCZ4JWfGlCIG95kzPg_WXqzfVDP";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function getCurrentUser(){ const {data}=await sb.auth.getUser(); return data?.user||null; }

// --- FIX: Auto-create profile with REAL Gmail + Name + Phone on every login ---
async function ensureProfile(){
  const user = await getCurrentUser();
  if(!user) return null;
  const meta = user.user_metadata || {};
  const { data: existing } = await sb.from('profiles').select('*').eq('id', user.id).single();
  if(existing){
    // Fill missing email/name/phone for OLD users (fixes NULL full_name)
    const patch = {};
    if(!existing.email) patch.email = user.email;
    if(!existing.full_name && meta.full_name) patch.full_name = meta.full_name;
    if(!existing.full_name && meta.name) patch.full_name = meta.name;
    if(!existing.phone && meta.phone) patch.phone = meta.phone;
    if(Object.keys(patch).length) await sb.from('profiles').update(patch).eq('id', user.id);
    return { ...existing, ...patch };
  }
  // New user - create profile
  const { data: created } = await sb.from('profiles').insert({
    id: user.id,
    email: user.email,
    full_name: meta.full_name || meta.name || '',
    phone: meta.phone || '',
    grind_balance: 0,
    is_admin: false
  }).select().single();
  return created;
}

async function getMyProfile(){
  const user = await getCurrentUser();
  if(!user) return {user:null,profile:null};
  const profile = await ensureProfile();
  return {user, profile};
}

async function loadBalanceBadge(){
  const el=document.getElementById('bal');
  if(!el) return;
  const {user,profile}=await getMyProfile();
  if(!user){el.textContent='G 0.00';return;}
  el.textContent=Number(profile?.grind_balance||0).toFixed(2)+' G';
}
async function loadWallet(){
  const {user,profile}=await getMyProfile();
  const b=document.getElementById('walletBalance')||document.getElementById('bal');
  if(b&&profile) b.textContent=Number(profile.grind_balance||0).toFixed(2)+' G';
  const b2=document.getElementById('balBig');
  if(b2&&profile) b2.textContent=Number(profile.grind_balance||0).toFixed(2)+' G';
  if(user){loadMyDeposits(user.id); loadMyWithdrawals(user.id);}
}

// ---------- DEPOSITS : user_id, amount_grind, method, reference, status ----------
async function submitDeposit(amount, method, reference){
  const user=await getCurrentUser(); if(!user){alert('Login first'); location.href='auth.html'; return;}
  amount=Number(amount); if(!amount||amount<=0){alert('Enter amount');return;} if(!reference){alert('Paste OTP / Reference');return;}
  // Prevent duplicate reference - same MPESA code twice
  const {data:dup} = await sb.from('deposits').select('id').eq('reference', reference).maybeSingle();
  if(dup){ alert('This reference was already used! Use a new M-PESA code.'); return; }
  const {error}=await sb.from('deposits').insert({ user_id:user.id, amount_grind:amount, method:method, reference:reference, status:'pending' });
  if(error){alert('Deposit failed: '+error.message);return;}
  alert('✅ Deposit sent! Wait for Admin approval. Your balance will update after approval.'); location.reload();
}
window.submitDeposit=submitDeposit;

async function approveDeposit(depositId){
  const {data:dep,error}=await sb.from('deposits').select('*').eq('id',depositId).single();
  if(error||!dep){alert('Deposit not found');return;} if(dep.status!=='pending'){alert('Already handled: '+dep.status);return;}
  const userId=dep.user_id; const amount=Number(dep.amount_grind||0);
  // 1. Mark approved FIRST with pending check - prevents double-click double credit
  const {error:updDep} = await sb.from('deposits').update({status:'approved'}).eq('id',depositId).eq('status','pending');
  if(updDep){alert('Approve failed: '+updDep.message);return;}
  // 2. Then credit
  const {data:prof}=await sb.from('profiles').select('grind_balance').eq('id',userId).single();
  const bal=Number(prof?.grind_balance||0);
  const {error:updErr}=await sb.from('profiles').update({grind_balance:bal+amount}).eq('id',userId);
  if(updErr){alert('Credit failed: '+updErr.message+' - Deposit is marked approved, fix balance manually');return;}
  alert(`✅ APPROVED +${amount} G. New balance: ${(bal+amount).toFixed(2)} G`); location.reload();
}
window.approveDeposit=approveDeposit;
async function rejectDeposit(id){ await sb.from('deposits').update({status:'rejected'}).eq('id',id); location.reload(); }
window.rejectDeposit=rejectDeposit;

async function loadMyDeposits(userId){
  const el=document.getElementById('myDeposits'); if(!el) return;
  const {data}=await sb.from('deposits').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(20);
  if(!data||!data.length){el.innerHTML='<p class="small">No deposits yet.</p>';return;}
  el.innerHTML=data.map(d=>`<div class="card" style="padding:10px"><b>+${d.amount_grind} G</b> • ${d.method||''} • ${d.reference||''} • <span>${d.status}</span></div>`).join('');
}

// ---------- WITHDRAWALS : artist_id, amount_grind, receive_method, receive_details, status ----------
async function submitWithdrawal(amount, method, number){
  const user=await getCurrentUser(); if(!user){alert('Login first');return;}
  amount=Number(amount); if(!amount||amount<2.5){alert('Minimum is 2.5 G (M25)');return;} if(!number){alert('Enter Mpesa / EcoCash number');return;}
  const {data:prof}=await sb.from('profiles').select('grind_balance').eq('id',user.id).single();
  const bal=Number(prof?.grind_balance||0); if(bal<amount){alert(`Not enough. You have ${bal} G, need ${amount} G`);return;}
  const {error}=await sb.from('withdrawals').insert({ artist_id:user.id, amount_grind:amount, receive_method:method, receive_details:number, status:'pending' });
  if(error){alert('Withdrawal failed: '+error.message);return;}
  alert('✅ Withdrawal sent! Balance drops after Admin approves and pays you.'); location.reload();
}
window.submitWithdrawal=submitWithdrawal; window.requestWithdrawal=submitWithdrawal;

async function approveWithdrawal(withdrawalId){
  const {data:wd,error}=await sb.from('withdrawals').select('*').eq('id',withdrawalId).single();
  if(error||!wd){alert('Withdrawal not found');return;} if(wd.status!=='pending'){alert('Already handled: '+wd.status);return;}
  const userId=wd.artist_id; const amount=Number(wd.amount_grind||0);
  const {data:prof}=await sb.from('profiles').select('grind_balance').eq('id',userId).single();
  const bal=Number(prof?.grind_balance||0); if(bal<amount){alert(`User has ${bal} G but wants ${amount} G - reject or ask them to top up`);return;}
  // Mark approved first to prevent double-deduct
  const {error:updWd} = await sb.from('withdrawals').update({status:'approved'}).eq('id',withdrawalId).eq('status','pending');
  if(updWd){alert('Approve failed: '+updWd.message);return;}
  const {error:dErr}=await sb.from('profiles').update({grind_balance:bal-amount}).eq('id',userId);
  if(dErr){alert('Deduct failed: '+dErr.message);return;}
  alert(`✅ Withdrawal APPROVED -${amount} G. New: ${(bal-amount).toFixed(2)} G. Now pay M${(amount*10).toFixed(0)} via ${wd.receive_method} to ${wd.receive_details}`); location.reload();
}
window.approveWithdrawal=approveWithdrawal; window.approveWithdraw=approveWithdrawal;
async function rejectWithdrawal(id){ await sb.from('withdrawals').update({status:'rejected'}).eq('id',id); location.reload(); }
window.rejectWithdrawal=rejectWithdrawal; window.rejectWithdraw=rejectWithdrawal;

async function loadMyWithdrawals(userId){
  const el=document.getElementById('myWithdrawals'); if(!el) return;
  const {data}=await sb.from('withdrawals').select('*').eq('artist_id',userId).order('created_at',{ascending:false}).limit(20);
  if(!data||!data.length){el.innerHTML='<p class="small">No withdrawals yet.</p>';return;}
  el.innerHTML=data.map(w=>`<div class="card" style="padding:10px"><b>-${w.amount_grind} G</b> • ${w.receive_method||''} • ${w.receive_details||''} • <span>${w.status}</span></div>`).join('');
}

// ---------- BUY SONG ----------
async function buySongWithWallet(songId, price, artistId){
  const user=await getCurrentUser(); if(!user){alert('Login first'); location.href='auth.html'; return;}
  price=Number(price);
  const {data:me}=await sb.from('profiles').select('grind_balance').eq('id',user.id).single();
  const bal=Number(me?.grind_balance||0); if(bal<price){alert(`Not enough. You have ${bal} G, need ${price} G. Top up first.`);return;}
  const {data:already}=await sb.from('purchases').select('id').eq('fan_id',user.id).eq('song_id',songId).eq('status','approved').maybeSingle();
  if(already){alert('You already own this. Go to Library.');return;}
  const {error:dErr}=await sb.from('profiles').update({grind_balance:bal-price}).eq('id',user.id);
  if(dErr){alert('Deduct failed: '+dErr.message);return;}
  // Pay artist 63% immediately for wallet buys - so approvePurchase must NOT pay again
  if(artistId && artistId!==user.id){
    const {data:artist}=await sb.from('profiles').select('grind_balance').eq('id',artistId).single();
    await sb.from('profiles').update({grind_balance:Number(artist?.grind_balance||0)+price*0.63}).eq('id',artistId);
  }
  if(pErr){alert('Purchase save failed: '+pErr.message);return;}
  alert(`✅ Bought! -${price} G. New: ${(bal-price).toFixed(2)} G`); location.href='library.html';
}
window.buySongWithWallet=buySongWithWallet; window.buySong=buySongWithWallet;

async function loadLibrary(){
  const el=document.getElementById('librarySongs'); if(!el) return;
  const user=await getCurrentUser(); if(!user){el.innerHTML='<p>Login to see Library</p>';return;}
  const {data:purchases}=await sb.from('purchases').select('song_id').eq('fan_id',user.id).eq('status','approved');
  const ids=(purchases||[]).map(p=>p.song_id); if(!ids.length){el.innerHTML='<p class="small">No songs yet. Buy one in Discover.</p>';return;}
  const {data:songs}=await sb.from('songs').select('*').in('id',ids);
  el.innerHTML=(songs||[]).map(s=>`<div class="card song"><b>${s.title}</b><small>${s.artist_name}</small><audio controls src="${s.audio_url||s.file_url||s.audio_path||''}" style="width:100%"></audio></div>`).join('');
}

// ---------- ADMIN ----------
async function loadAdmin(){
  const pd=document.getElementById('pendingDeposits'); const pw=document.getElementById('pendingWithdrawals'); const pp=document.getElementById('pendingPurchases'); const ps=document.getElementById('pendingSongs');
  async function labels(rows, key){ const ids=[...new Set(rows.map(r=>r[key]).filter(Boolean))]; if(!ids.length) return {}; const {data}=await sb.from('profiles').select('id, full_name, email, phone').in('id',ids); const m={}; (data||[]).forEach(p=>m[p.id]=`${p.full_name||'No Name'} - ${p.email||''} - ${p.phone||''}`); return m; }
  if(pd){
    const {data}=await sb.from('deposits').select('*').eq('status','pending').order('created_at',{ascending:false});
    if(!data||!data.length) pd.innerHTML='<p class="small">No pending deposits</p>';
    else { const l=await labels(data,'user_id'); pd.innerHTML=data.map(d=>`<div class="card" style="padding:12px"><b>+${d.amount_grind} G</b><br><b>👤 ${l[d.user_id]||d.user_id}</b><br><span class="small">${d.method} • Ref: ${d.reference} • ${new Date(d.created_at).toLocaleString()}</span><br><br><button onclick="approveDeposit('${d.id}')">✅ Approve + Credit</button> <button class="ghost" onclick="rejectDeposit('${d.id}')">Reject</button></div>`).join(''); }
  }
  if(pw){
    const {data}=await sb.from('withdrawals').select('*').eq('status','pending').order('created_at',{ascending:false});
    if(!data||!data.length) pw.innerHTML='<p class="small">No pending withdrawals</p>';
    else { const l=await labels(data,'artist_id'); pw.innerHTML=data.map(w=>`<div class="card" style="padding:12px"><b>-${w.amount_grind} G (M${(w.amount_grind*10).toFixed(0)})</b><br><b>👤 ${l[w.artist_id]||w.artist_id}</b><br><span class="small">${w.receive_method} • Pay to: ${w.receive_details} • ${new Date(w.created_at).toLocaleString()}</span><br><br><button onclick="approveWithdrawal('${w.id}')">✅ Approve + Deduct</button> <button class="ghost" onclick="rejectWithdrawal('${w.id}')">Reject</button></div>`).join(''); }
  }
  if(pp){
    const {data}=await sb.from('purchases').select('*').eq('status','pending').order('created_at',{ascending:false});
    if(!data||!data.length) pp.innerHTML='<p class="small">No pending purchases</p>';
    else { const l=await labels(data,'fan_id'); pp.innerHTML=data.map(p=>`<div class="card" style="padding:12px"><b>Purchase</b><br><b>👤 ${l[p.fan_id]||p.fan_id}</b><br><span class="small">${p.payment_method} • Ref: ${p.payment_ref} • Fees: ${p.fees_grind}</span><br><br><button onclick="approvePurchase('${p.id}')">Approve Unlock</button> <button class="ghost" onclick="rejectPurchase('${p.id}')">Reject</button></div>`).join(''); }
  }
  if(ps){
    const {data}=await sb.from('songs').select('*').eq('status','pending').order('created_at',{ascending:false});
    ps.innerHTML=(!data||!data.length)?'<p class="small">No pending songs</p>':data.map(s=>`<div class="card" style="padding:10px"><b>${s.title}</b> • ${s.artist_name}<br><button onclick="approveSong('${s.id}')">Approve Song</button> <button class="ghost" onclick="rejectSong('${s.id}')">Reject</button></div>`).join('');
  }
}
window.loadAdmin=loadAdmin;

// FIXED: Only pay artist for M-PESA purchases. Wallet purchases already paid in buySongWithWallet.
async function approvePurchase(id){
  const {data:p}=await sb.from('purchases').select('*').eq('id',id).single(); if(!p) return;
  if(p.status!=='pending'){ alert('Already handled: '+p.status); return; }
  await sb.from('purchases').update({status:'approved'}).eq('id',id).eq('status','pending');
  if(p.payment_method !== 'Wallet'){
    const {data:song}=await sb.from('songs').select('*').eq('id',p.song_id).single();
    if(song){ const artistId=song.artist_id; if(artistId&&artistId!==p.fan_id){ const {data:a}=await sb.from('profiles').select('grind_balance').eq('id',artistId).single(); await sb.from('profiles').update({grind_balance:Number(a?.grind_balance||0)+Number(p.fees_grind||0)}).eq('id',artistId);} }
  }
  alert('Purchase approved + unlocked'); location.reload();
}
window.approvePurchase=approvePurchase;
async function rejectPurchase(id){ await sb.from('purchases').update({status:'rejected'}).eq('id',id); location.reload(); } window.rejectPurchase=rejectPurchase;
async function approveSong(id){ await sb.from('songs').update({status:'approved'}).eq('id',id); location.reload(); } window.approveSong=approveSong;
async function rejectSong(id){ await sb.from('songs').update({status:'rejected'}).eq('id',id); location.reload(); } window.rejectSong=rejectSong;

document.addEventListener('DOMContentLoaded', async ()=>{
  await ensureProfile().catch(()=>{});
  loadBalanceBadge();
  if(document.getElementById('walletBalance')) loadWallet();
  if(document.getElementById('pendingDeposits')||document.getElementById('pendingWithdrawals')) loadAdmin();
  if(document.getElementById('librarySongs')) loadLibrary();
});