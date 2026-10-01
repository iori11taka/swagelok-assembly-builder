'use strict';
// Product shell; the supplied geometry and interaction engine remains in app.js.
(function(){
 const $=id=>document.getElementById(id),KEY='taller-visual-projects-v1';let projects=[],active=null,dialogMode='',toastTimer,ready=false,storageBlocked=false,cloudTimer=null;
 function notify(message){$('workshopToast').textContent=message;$('workshopToast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('workshopToast').style.display='none',4500);}
 function current(){return {...active,state:serializeProjectState()};}
 function persist(){if(!ready||!active)return;active.state=serializeProjectState();active.updated=new Date().toISOString();scheduleCloudSave();if(storageBlocked){$('storageStatus').textContent='Archivo local dañado · exporta una copia';return;}try{localStorage.setItem(KEY,JSON.stringify({active:active.id,projects}));$('storageStatus').textContent='Guardado en este dispositivo';}catch{$('storageStatus').textContent='Sin guardar · exporta una copia';notify('No se pudo guardar en este navegador. Exporta una copia del proyecto.');}}
 function sync(){if(!ready)return;$('projectName').textContent=active.name;const s=serializeProjectState();$('materialCount').textContent=s.components.length+s.tubingConnections.length;$('canvasStats').textContent=`${s.components.length} piezas · ${s.tubingConnections.length} tubos`;const rows=WorkshopData.materials(s,componentLibrary);$('materialsBody').innerHTML=rows.map(r=>`<tr><td>${r.image?`<img src="${escapeHtml(r.image)}" alt="">`:''}${escapeHtml(r.name)}</td><td>${escapeHtml(r.reference)}</td><td>${escapeHtml(r.detail)}</td><td>${r.quantity}</td></tr>`).join('')||'<tr><td colspan="4">Tu conjunto está vacío. Añade piezas desde la biblioteca.</td></tr>';$('downloadCsvBtn').disabled=!rows.length;

 }
 const originalCommit=commitHistory;commitHistory=function(...args){originalCommit(...args);if(ready){persist();sync();}};
 const originalRestore=restoreProjectState;restoreProjectState=function(...args){originalRestore(...args);if(ready){persist();sync();}};
 const originalProperties=renderPropertiesPanel;renderPropertiesPanel=function(...args){originalProperties(...args);sync();};
 const originalCreate=createComponent;createComponent=function(...args){if(!isRestoringState&&canvas.querySelectorAll('.canvas-component').length>=200){notify('Máximo 200 piezas por proyecto.');return null;}const component=originalCreate(...args);if(component){component.tabIndex=0;component.setAttribute('role','button');component.setAttribute('aria-label',componentLibrary[args[0]].name);component.addEventListener('keydown',e=>{if(e.key==='Enter'){selectComponent(component);e.preventDefault();}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&!componentHasRigidConnections(component.dataset.id)){e.preventDefault();component.style.left=(parseFloat(component.style.left)+(e.key==='ArrowRight'?10:e.key==='ArrowLeft'?-10:0))+'px';component.style.top=(parseFloat(component.style.top)+(e.key==='ArrowDown'?10:e.key==='ArrowUp'?-10:0))+'px';refreshPorts();updateTubing();commitHistory();}});}return component;};
 function fit(){const components=[...canvas.querySelectorAll('.canvas-component')];if(!components.length){cameraX=0;cameraY=0;zoom=.8;}else{const bounds=components.map(c=>({x:parseFloat(c.style.left),y:parseFloat(c.style.top),w:parseFloat(c.style.width),h:parseFloat(c.style.height)})),minX=Math.min(...bounds.map(b=>b.x))-70,minY=Math.min(...bounds.map(b=>b.y))-70,maxX=Math.max(...bounds.map(b=>b.x+b.w))+70,maxY=Math.max(...bounds.map(b=>b.y+b.h))+70;zoom=Math.max(.25,Math.min(1,workspace.clientWidth/(maxX-minX),(workspace.clientHeight-100)/(maxY-minY)));cameraX=(workspace.clientWidth-(maxX-minX)*zoom)/2-minX*zoom;cameraY=60+(workspace.clientHeight-110-(maxY-minY)*zoom)/2-minY*zoom;}updateCameraTransform();zoomValue.textContent=Math.round(zoom*100)+'%';}
 function switchScreen(name){for(const screen of ['design','materials','guide'])$(screen+'Screen').hidden=screen!==name;document.querySelectorAll('[data-screen]').forEach(b=>{b.classList.toggle('active',b.dataset.screen===name);b.setAttribute('aria-current',b.dataset.screen===name?'page':'false');});if(name==='design')requestAnimationFrame(updateCameraTransform);sync();}
 function fresh(name){return {format:'taller-visual-v1',id:crypto.randomUUID(),name,notes:'',state:WorkshopData.empty()};}
 function isLegacyDemoProject(project){
  if(!project||project.name!=='Panel de regulación'||(project.notes||'')!=='')return false;
  const s=project.state;
  if(!s||s.connections?.length||s.tubingConnections?.length||s.components?.length!==3)return false;

  const byType=Object.fromEntries(s.components.map(c=>[c.type,c]));
  const regulator=byType.regulator,gauge=byType.gauge,valve=byType.needleValve;
  if(!regulator||!gauge||!valve)return false;

  const near=(a,b)=>Number.isFinite(a)&&Math.abs(a-b)<0.01;

  return (
   near(regulator.left,215)&&near(regulator.top,225)&&
   near(gauge.left,242.5)&&near(gauge.top,12.5)&&
   near(valve.left,515)&&near(valve.top,250)
  );
 }

 function loadProject(project){ready=false;active=project;restoreProjectState(project.state);undoStack=[];redoStack=[];commitHistory(true);ready=true;setTool('select');persist();sync();switchScreen('design');requestAnimationFrame(fit);}
 function openDialog(mode){
  dialogMode=mode;
  if(mode==='account'){
   const u=window.CloudProjects?.user;
   $('dialogTitle').textContent='Cuenta y sincronización';
   $('dialogBody').innerHTML=u?`<p class="technical-note">Conectado como <strong>${escapeHtml(u.email||'usuario')}</strong>. Tus proyectos se sincronizan con Supabase y estarán disponibles en otros dispositivos.</p><button type="button" id="syncCloudBtn">↻ Sincronizar ahora</button>`:`<p class="technical-note">Inicia sesión con la misma cuenta en laptop, tablet o celular para acceder a tus proyectos.</p><label class="form-field">Correo<input id="cloudEmail" type="email" autocomplete="email" required></label><label class="form-field">Contraseña<input id="cloudPassword" type="password" autocomplete="current-password" minlength="6" required></label>`;
   $('dialogActions').innerHTML=u?'<button type="button" id="signOutBtn">Cerrar sesión</button>':'<button type="button" id="signUpBtn">Crear cuenta</button><button type="button" class="primary" id="signInBtn">Iniciar sesión</button>';
  }else{
   $('dialogTitle').textContent=mode==='list'?'Mis proyectos':mode==='new'?'Nuevo proyecto':'Editar proyecto';
   const cloudNote=window.CloudProjects?.user?'☁ Sincronizados con tu cuenta. Puedes abrirlos desde otros dispositivos.':'Guardados en este dispositivo. Inicia sesión en ☁ Cuenta para sincronizarlos.';
   $('dialogBody').innerHTML=mode==='list'?`<p class="technical-note">${cloudNote}</p>`+projects.map(p=>`<div class="saved-project"><button type="button" data-open-project="${p.id}">${escapeHtml(p.name)}<small>${p.state.components.length} piezas · ${p.id===active.id?'Abierto':'Guardado'}</small></button><button class="danger" type="button" data-delete-project="${p.id}" aria-label="Eliminar ${escapeHtml(p.name)}">Eliminar</button></div>`).join(''):`<label class="form-field">Nombre<input id="projectNameInput" maxlength="100" required value="${mode==='new'?'':escapeHtml(active.name)}" placeholder="Ej. Panel de regulación A-01"></label><label class="form-field">Notas<textarea id="projectNotesInput" maxlength="5000" placeholder="Aplicación, requisitos y observaciones…">${mode==='new'?'':escapeHtml(active.notes)}</textarea></label>`;
   $('dialogActions').innerHTML=mode==='list'?'':'<button type="button" id="cancelDialogBtn">Cancelar</button><button type="submit" class="primary">Guardar proyecto</button>';
  }
  if(!$('projectDialog').open)$('projectDialog').showModal();
 }
 document.querySelectorAll('.component-card').forEach(card=>{const button=document.createElement('button');button.type='button';button.className='add-piece';button.textContent='＋';button.setAttribute('aria-label','Añadir '+componentLibrary[card.dataset.component].name);button.addEventListener('pointerdown',e=>e.stopPropagation());button.onclick=e=>{e.stopPropagation();switchScreen('design');const rect=workspace.getBoundingClientRect(),point=screenToCanvas(rect.left+rect.width/2,rect.top+rect.height/2);const component=createComponent(card.dataset.component,point.x,point.y);if(component){selectComponent(component);commitHistory();notify('Pieza añadida. Muévela para conectar sus puertos.');}};card.append(button);});
 $('componentSearch').setAttribute('aria-label','Buscar componente por nombre o referencia');searchInput.addEventListener('input',()=>{let visible=0;document.querySelectorAll('.component-section').forEach(section=>{const cards=[...section.querySelectorAll('.component-card')],count=cards.filter(c=>c.style.display!=='none').length;section.hidden=!count;visible+=count;});let empty=$('noSearchResults');if(!empty){empty=document.createElement('p');empty.id='noSearchResults';empty.className='no-results';empty.textContent='No encontramos piezas. Prueba otro nombre o referencia.';document.querySelector('.sidebar-header').after(empty);}empty.hidden=visible>0;});
 $('fitViewBtn').onclick=fit;document.querySelectorAll('[data-screen]').forEach(b=>b.onclick=()=>switchScreen(b.dataset.screen));if($('showMaterialsBtn')) $('showMaterialsBtn').onclick=()=>switchScreen('materials');$('createProjectBtn').onclick=()=>openDialog('new');$('renameProjectBtn').onclick=()=>openDialog('edit');$('openProjectsBtn').onclick=async()=>{await syncFromCloud();openDialog('list');};$('accountBtn').onclick=()=>openDialog('account');$('closeProjectDialog').onclick=()=>$('projectDialog').close();$('dialogActions').onclick=async e=>{if(e.target.id==='cancelDialogBtn')$('projectDialog').close();if(e.target.id==='signInBtn')await handleAuth(false);if(e.target.id==='signUpBtn')await handleAuth(true);if(e.target.id==='signOutBtn'){await CloudProjects.signOut();$('projectDialog').close();updateCloudUI();notify('Sesión cerrada. Los proyectos locales permanecen en este dispositivo.');}};
 $('projectDialogForm').onsubmit=e=>{e.preventDefault();if(dialogMode==='list')return;const name=$('projectNameInput').value.trim();if(!name)return $('projectNameInput').focus();if(dialogMode==='new'){if(projects.length>=100)return notify('Máximo 100 proyectos. Exporta y elimina uno para continuar.');persist();const project=fresh(name);project.notes=$('projectNotesInput').value;projects.unshift(project);loadProject(project);}else{active.name=name;active.notes=$('projectNotesInput').value;persist();sync();}$('projectDialog').close();};
 $('dialogBody').onclick=e=>{const button=e.target.closest('button');if(!button)return;if(button.dataset.openProject){persist();loadProject(projects.find(p=>p.id===button.dataset.openProject));$('projectDialog').close();}if(button.id==='syncCloudBtn'){syncFromCloud(true);return;}if(button.dataset.deleteProject&&confirm('¿Eliminar este proyecto? Exporta una copia si quieres conservarlo.')){if(window.CloudProjects?.user)CloudProjects.remove(button.dataset.deleteProject).catch(()=>notify('No se pudo eliminar la copia en la nube.'));projects=projects.filter(p=>p.id!==button.dataset.deleteProject);if(!projects.length)projects=[fresh('Mi conjunto')];if(!projects.includes(active))loadProject(projects[0]);persist();openDialog('list');}};
 function download(content,type,name){const url=URL.createObjectURL(new Blob([content],{type})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const fileName=()=>active.name.replace(/[^\p{L}\p{N}_-]/gu,'_').slice(0,80)||'conjunto';$('saveProjectBtn').onclick=async()=>{persist();if(window.CloudProjects?.user){await saveActiveCloud(true);}else notify('Proyecto guardado en este dispositivo. Inicia sesión en ☁ Cuenta para sincronizarlo.');};$('exportProjectBtn').onclick=()=>download(JSON.stringify(current(),null,2),'application/json',fileName()+'.json');$('importProjectBtn').onclick=()=>$('projectFile').click();$('projectFile').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>2000000)throw Error('El archivo supera 2 MB.');if(projects.length>=100)throw Error('Máximo 100 proyectos.');const imported=WorkshopData.validate(JSON.parse(await file.text()),componentLibrary);imported.id=crypto.randomUUID();persist();projects.unshift(imported);loadProject(imported);notify('Proyecto importado como una copia nueva.');}catch(error){notify(error.message||'No se pudo importar el archivo.');}finally{e.target.value='';}};
 $('downloadCsvBtn').onclick=()=>download(WorkshopData.csv(WorkshopData.materials(serializeProjectState(),componentLibrary)),'text/csv;charset=utf-8',fileName()+'.csv');$('printMaterialsBtn').onclick=()=>window.print();
 async function saveActiveCloud(showMessage=false){
  if(!window.CloudProjects?.user||!active)return;
  try{active.state=serializeProjectState();await CloudProjects.save(active);$('storageStatus').textContent='☁ Guardado en la nube';if(showMessage)notify('Proyecto guardado y sincronizado en la nube.');}
  catch(err){console.error(err);$('storageStatus').textContent='Guardado local · nube pendiente';if(showMessage)notify('Guardado localmente, pero no se pudo sincronizar con Supabase.');}
 }
 function scheduleCloudSave(){if(!window.CloudProjects?.user||!ready)return;clearTimeout(cloudTimer);cloudTimer=setTimeout(()=>saveActiveCloud(false),1200);}
 async function syncFromCloud(showMessage=false){
  if(!window.CloudProjects?.user)return;
  try{const remote=await CloudProjects.list();const map=new Map(projects.map(p=>[p.id,p]));for(const rp of remote){try{const valid=WorkshopData.validate(rp,componentLibrary);const local=map.get(valid.id);if(!local||new Date(valid.updated||0)>=new Date(local.updated||0))map.set(valid.id,valid);}catch{}}
   projects=[...map.values()].sort((a,b)=>new Date(b.updated||0)-new Date(a.updated||0));
   try{localStorage.setItem(KEY,JSON.stringify({active:active?.id,projects}));}catch{}
   if(showMessage)notify('Proyectos sincronizados.');
  }catch(err){console.error(err);if(showMessage)notify('No se pudo sincronizar con Supabase.');}
 }
 async function handleAuth(create){
  const email=$('cloudEmail')?.value.trim(),password=$('cloudPassword')?.value||'';if(!email||password.length<6)return notify('Ingresa un correo y una contraseña de al menos 6 caracteres.');
  try{if(create){const r=await CloudProjects.signUp(email,password);if(r.needsConfirmation){notify('Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.');return;}}else await CloudProjects.signIn(email,password);await syncFromCloud(true);for(const p of projects){try{await CloudProjects.save(p);}catch{}}updateCloudUI();$('projectDialog').close();notify('Cuenta conectada. Tus proyectos ahora se sincronizan entre dispositivos.');}
  catch(err){console.error(err);notify(err.message||'No se pudo iniciar sesión.');}
 }
 function updateCloudUI(){const u=window.CloudProjects?.user;$('accountBtn').textContent=u?'☁ '+(u.email?.split('@')[0]||'Cuenta'):'☁ Cuenta';if(u)$('storageStatus').textContent='☁ Sincronización activa';}
 window.addEventListener('pagehide',persist);window.addEventListener('storage',e=>{if(e.key===KEY){storageBlocked=true;$('storageStatus').textContent='Cambios en otra pestaña · exporta tu copia';notify('Otro taller modificó los proyectos guardados. Exporta tu trabajo antes de recargar.');}});
 try{
  const saved=JSON.parse(localStorage.getItem(KEY)||'null');

  if(saved){
   if(!Array.isArray(saved.projects)||saved.projects.length>100)throw Error();

   projects=saved.projects
    .map(p=>WorkshopData.validate(p,componentLibrary))
    .filter(p=>!isLegacyDemoProject(p));

   if(new Set(projects.map(p=>p.id)).size!==projects.length||projects.some(p=>!p.id))throw Error();

   active=projects.find(p=>p.id===saved.active)||projects[0]||null;
  }
 }catch{
  // A previous version may have left an incompatible local project.
  // Preserve the raw value as a recovery copy, then let the current
  // version start normally instead of permanently blocking local saves.
  const raw=localStorage.getItem(KEY);
  if(raw){
   try{localStorage.setItem(KEY+'-recovery-'+Date.now(),raw);}catch{}
  }
  try{localStorage.removeItem(KEY);}catch{}
  storageBlocked=false;
  projects=[];
  active=null;
  setTimeout(()=>notify('Se actualizó el almacenamiento local para esta versión.'),500);
 }

 /*
   Primera entrada:
   empezamos con un proyecto vacío.
   Solo se restauran piezas cuando existe un proyecto real guardado.
 */
 if(!projects.length){
  active=fresh('Mi conjunto');
  projects=[active];
 }

 loadProject(active||projects[0]);
 (async()=>{try{await CloudProjects.session();updateCloudUI();if(CloudProjects.user){await syncFromCloud();const cloudActive=projects.find(p=>p.id===active?.id)||projects[0];if(cloudActive)loadProject(cloudActive);}}catch(e){console.error('Cloud init',e);}})();
})();
