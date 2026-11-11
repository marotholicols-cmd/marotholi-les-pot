// Marotholi LES-POT - Core
// DEPOSIT: EcoCash + Postbank ONLY | WITHDRAWAL: EcoCash + Postbank + M-Pesa (artist's own number)
const SUPABASE_URL="https://mmkxiniybctmgoozaecp.supabase.co";
const SUPABASE_KEY="sb_publishable_wWhjXCZ4JWfGlCIG95kzPg_WXqzfVDP";
const GRIND_RATE=10;
window.LES_POT={GRIND_RATE};
window.LES_POT.getSongs=async function(){try{const r=await fetch(SUPABASE_URL+"/rest/v1/songs?select=*&order=created_at.desc",{headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+SUPABASE_KEY}});return await r.json();}catch(e){return[];}};
window.LES_POT.getBalance=async function(){return{grinds:0,earned:0,spent:0,withdrawn:0};};
window.LES_POT.getLibrary=async function(){try{const r=await fetch(SUPABASE_URL+"/rest/v1/purchases?select=*,songs(*)",{headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+SUPABASE_KEY}});const d=await r.json();return d.map(x=>({...x.songs,created_at:x.created_at,price_grinds:x.price_grinds}));}catch(e){return[];}};
window.LES_POT.getHistory=async function(){return[];};
window.LES_POT.submitDeposit=async function(d){if(d.method==='Mpesa'||d.method==='PayFast')return{ok:false,error:'M-Pesa / PayFast are PAUSED for deposits. Use EcoCash or Postbank or VISA.'};return{ok:true};};
// window.LES_POT.submitWithdrawal=async function(d){if(d.method==='PayFast')return{ok:false,error:'PayFast is paused. Use EcoCash, Postbank / VISA or M-Pesa.'};if(!d.number)return{ok:false,error:'Enter your number.'};return{ok:true};};
window.LES_POT.buySong=async function(id){return{ok:true};};
async function buySong(id){const r=await window.LES_POT.buySong(id);if(r.ok){alert('✅ Bought! Check Library.');location.href='library.html';}else alert('❌ '+r.error);}
