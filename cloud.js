'use strict';
(function(){
 const URL='https://bpfcjyjqydiajryotbtt.supabase.co';
 const KEY='sb_publishable_KxMgv9qVs2bjZvtDfzqGqg_htdWHo_F';
 const client=window.supabase.createClient(URL,KEY);
 let user=null;
 async function session(){const {data}=await client.auth.getSession();user=data.session?.user||null;return user;}
 async function signUp(email,password){const {data,error}=await client.auth.signUp({email,password});if(error)throw error;user=data.user||data.session?.user||null;return {user,needsConfirmation:!data.session};}
 async function signIn(email,password){const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;user=data.user;return user;}
 async function signOut(){const {error}=await client.auth.signOut();if(error)throw error;user=null;}
 async function list(){if(!user)return[];const {data,error}=await client.from('assembly_projects').select('id,name,notes,state,created_at,updated_at').order('updated_at',{ascending:false});if(error)throw error;return (data||[]).map(r=>({format:'taller-visual-v1',id:r.id,name:r.name,notes:r.notes||'',state:r.state,created:r.created_at,updated:r.updated_at}));}
 async function save(project){if(!user)return null;const row={id:project.id,user_id:user.id,name:project.name,notes:project.notes||'',state:project.state,updated_at:new Date().toISOString()};const {data,error}=await client.from('assembly_projects').upsert(row,{onConflict:'id'}).select().single();if(error)throw error;return data;}
 async function remove(id){if(!user)return;const {error}=await client.from('assembly_projects').delete().eq('id',id);if(error)throw error;}
 client.auth.onAuthStateChange((_event,s)=>{user=s?.user||null;window.dispatchEvent(new CustomEvent('cloud-auth-changed',{detail:{user}}));});
 window.CloudProjects={client,session,signUp,signIn,signOut,list,save,remove,get user(){return user;}};
})();
