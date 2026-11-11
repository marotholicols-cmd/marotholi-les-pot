const SUPA_URL = "https://mmkxiniybctmgoozaecp.supabase.co";
const SUPA_KEY = "sb_publishable_wWhjXCZ4JWfGlCIG95kzPg_WXqzfVDP";
if(!window.sb && window.supabase) window.sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);

async function getMyProfile(){
  const {data:{user}} = await window.sb.auth.getUser();
  if(!user) return {user:null, profile:null};
  let {data: profile} = await window.sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if(!profile){
    const {data: p2} = await window.sb.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
    profile = p2 || {id:user.id, email:user.email, grind_balance:0, grinds:0};
  }
  return {user, profile};
}
async function getMyPurchases(userId){
  try{
    const {data} = await window.sb.from('purchases').select('*').eq('user_id', userId);
    if(data && data.length) return data.map(p=>p.song_id).filter(Boolean);
  }catch(e){}
  try{
    const {data} = await window.sb.from('purchases').select('*').eq('buyer_id', userId);
    if(data) return data.map(p=>p.song_id).filter(Boolean);
  }catch(e){}
  return [];
}
window.getMyProfile = getMyProfile;
window.getMyPurchases = getMyPurchases;
