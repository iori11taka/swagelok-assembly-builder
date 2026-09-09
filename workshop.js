'use strict';
// Product shell; the supplied geometry and interaction engine remains in app.js.
(function(){
 const $=id=>document.getElementById(id),KEY='taller-visual-projects-v1';let projects=[],active=null,dialogMode='',toastTimer,ready=false,storageBlocked=false;
 function notify(message){$('workshopToast').textContent=message;$('workshopToast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('workshopToast').style.display='none',4500);}
 function current(){return {...active,state:serializeProjectState()};}
 function persist(){if(!ready||!active)return;active.state=serializeProjectState();active.updated=new Date().toISOString();if(storageBlocked){$('storageStatus').textContent='Archivo local dañado · exporta una copia';return;}try{localStorage.setItem(KEY,JSON.stringify({active:active.id,projects}));$('storageStatus').textContent='Guardado en este dispositivo';}catch{$('storageStatus').textContent='Sin guardar · exporta una copia';notify('No se pudo guardar en este navegador. Exporta una copia del proyecto.');}}
 function sync(){if(!ready)return;$('projectName').textContent=active.name;const s=serializeProjectState();$('materialCount').textContent=s.components.length+s.tubingConnections.length;$('summaryPieces').textContent=`${s.components.length} piezas en tu diseño`;$('summaryConnections').textContent=s.components.length?`${s.connections.length} conexiones roscadas · ${s.tubingConnections.length} tramos de tubo`:'Añade el primer componente para comenzar.';$('canvasStats').textContent=`${s.components.length} piezas · ${s.tubingConnections.length} tubos`;$('piecePicker').innerHTML='<option value="">Selecciona una pieza</option>'+s.components.map(c=>`<option value="${c.id}" ${selectedComponent?.dataset.id===c.id?'selected':''}>${c.id}. ${escapeHtml(componentLibrary[c.type].name)}</option>`).join('');$('detailEmpty').hidden=!!selectedComponent||!!selectedTubeId;const rows=WorkshopData.materials(s,componentLibrary);$('materialsBody').innerHTML=rows.map(r=>`<tr><td>${r.image?`<img src="${escapeHtml(r.image)}" alt="">`:''}${escapeHtml(r.name)}</td><td>${escapeHtml(r.reference)}</td><td>${escapeHtml(r.detail)}</td><td>${r.quantity}</td></tr>`).join('')||'<tr><td colspan="4">Tu conjunto está vacío. Añade piezas desde la biblioteca.</td></tr>';$('downloadCsvBtn').disabled=!rows.length;
  document.querySelector('.mobile-port-actions')?.remove();if(selectedComponent){const component=selectedComponent,definition=getComponentDefinition(component);const ports=document.createElement('div');ports.className='mobile-port-actions';ports.innerHTML='<p>Conectar tubo desde un puerto</p>'+definition.ports.filter(p=>p.connection.family==='tube').map(p=>`<button data-start-port="${escapeHtml(p.id)}" ${isPortOccupied(component.dataset.id,p.id)?'disabled':''}>${escapeHtml(getPortDisplayName(p.id))} · ${escapeHtml(formatConnection(p.connection))}</button>`).join('');if(ports.children.length>1){propertiesPanel.append(ports);ports.onclick=e=>{const b=e.target.closest('[data-start-port]');if(!b)return;if(currentTool!=='tubing')setTool('tubing');const port=definition.ports.find(p=>p.id===b.dataset.startPort);handleTubingPortClick(component,port,findPortElement(component,port.id));sync();};}}
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
 function openDialog(mode){dialogMode=mode;$('dialogTitle').textContent=mode==='list'?'Mis proyectos':mode==='new'?'Nuevo proyecto':'Editar proyecto';$('dialogBody').innerHTML=mode==='list'?'<p class="technical-note">Guardados en este navegador. Exporta una copia para abrirla en otro dispositivo.</p>'+projects.map(p=>`<div class="saved-project"><button type="button" data-open-project="${p.id}">${escapeHtml(p.name)}<small>${p.state.components.length} piezas · ${p.id===active.id?'Abierto':'Guardado'}</small></button><button class="danger" type="button" data-delete-project="${p.id}" aria-label="Eliminar ${escapeHtml(p.name)}">Eliminar</button></div>`).join(''):`<label class="form-field">Nombre<input id="projectNameInput" maxlength="100" required value="${mode==='new'?'':escapeHtml(active.name)}" placeholder="Ej. Panel de regulación A-01"></label><label class="form-field">Notas<textarea id="projectNotesInput" maxlength="5000" placeholder="Aplicación, requisitos y observaciones…">${mode==='new'?'':escapeHtml(active.notes)}</textarea></label>`;$('dialogActions').innerHTML=mode==='list'?'':'<button type="button" id="cancelDialogBtn">Cancelar</button><button type="submit" class="primary">Guardar proyecto</button>';if(!$('projectDialog').open)$('projectDialog').showModal();}
 document.querySelectorAll('.component-card').forEach(card=>{const button=document.createElement('button');button.type='button';button.className='add-piece';button.textContent='＋';button.setAttribute('aria-label','Añadir '+componentLibrary[card.dataset.component].name);button.addEventListener('pointerdown',e=>e.stopPropagation());button.onclick=e=>{e.stopPropagation();switchScreen('design');const rect=workspace.getBoundingClientRect(),point=screenToCanvas(rect.left+rect.width/2,rect.top+rect.height/2);const component=createComponent(card.dataset.component,point.x,point.y);if(component){selectComponent(component);commitHistory();notify('Pieza añadida. Muévela para conectar sus puertos.');}};card.append(button);});
 $('componentSearch').setAttribute('aria-label','Buscar componente por nombre o referencia');searchInput.addEventListener('input',()=>{let visible=0;document.querySelectorAll('.component-section').forEach(section=>{const cards=[...section.querySelectorAll('.component-card')],count=cards.filter(c=>c.style.display!=='none').length;section.hidden=!count;visible+=count;});let empty=$('noSearchResults');if(!empty){empty=document.createElement('p');empty.id='noSearchResults';empty.className='no-results';empty.textContent='No encontramos piezas. Prueba otro nombre o referencia.';document.querySelector('.sidebar-header').after(empty);}empty.hidden=visible>0;});
 $('piecePicker').onchange=e=>{selectComponent(getComponentById(e.target.value));sync();};$('fitViewBtn').onclick=fit;document.querySelectorAll('[data-screen]').forEach(b=>b.onclick=()=>switchScreen(b.dataset.screen));$('showMaterialsBtn').onclick=()=>switchScreen('materials');$('createProjectBtn').onclick=()=>openDialog('new');$('renameProjectBtn').onclick=()=>openDialog('edit');$('openProjectsBtn').onclick=()=>openDialog('list');$('closeProjectDialog').onclick=()=>$('projectDialog').close();$('dialogActions').onclick=e=>{if(e.target.id==='cancelDialogBtn')$('projectDialog').close();};
 $('projectDialogForm').onsubmit=e=>{e.preventDefault();if(dialogMode==='list')return;const name=$('projectNameInput').value.trim();if(!name)return $('projectNameInput').focus();if(dialogMode==='new'){if(projects.length>=100)return notify('Máximo 100 proyectos. Exporta y elimina uno para continuar.');persist();const project=fresh(name);project.notes=$('projectNotesInput').value;projects.unshift(project);loadProject(project);}else{active.name=name;active.notes=$('projectNotesInput').value;persist();sync();}$('projectDialog').close();};
 $('dialogBody').onclick=e=>{const button=e.target.closest('button');if(!button)return;if(button.dataset.openProject){persist();loadProject(projects.find(p=>p.id===button.dataset.openProject));$('projectDialog').close();}if(button.dataset.deleteProject&&confirm('¿Eliminar este proyecto? Exporta una copia si quieres conservarlo.')){projects=projects.filter(p=>p.id!==button.dataset.deleteProject);if(!projects.length)projects=[fresh('Mi conjunto')];if(!projects.includes(active))loadProject(projects[0]);persist();openDialog('list');}};
 function download(content,type,name){const url=URL.createObjectURL(new Blob([content],{type})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const fileName=()=>active.name.replace(/[^\p{L}\p{N}_-]/gu,'_').slice(0,80)||'conjunto';$('saveProjectBtn').onclick=()=>{persist();if($('storageStatus').textContent.startsWith('Guardado'))notify('Proyecto guardado en este dispositivo.');};$('exportProjectBtn').onclick=()=>download(JSON.stringify(current(),null,2),'application/json',fileName()+'.json');$('importProjectBtn').onclick=()=>$('projectFile').click();$('projectFile').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>2000000)throw Error('El archivo supera 2 MB.');if(projects.length>=100)throw Error('Máximo 100 proyectos.');const imported=WorkshopData.validate(JSON.parse(await file.text()),componentLibrary);imported.id=crypto.randomUUID();persist();projects.unshift(imported);loadProject(imported);notify('Proyecto importado como una copia nueva.');}catch(error){notify(error.message||'No se pudo importar el archivo.');}finally{e.target.value='';}};
 $('downloadCsvBtn').onclick=()=>download(WorkshopData.csv(WorkshopData.materials(serializeProjectState(),componentLibrary)),'text/csv;charset=utf-8',fileName()+'.csv');$('printMaterialsBtn').onclick=()=>window.print();
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
  storageBlocked=true;
  projects=[];
  active=null;
  setTimeout(()=>notify('No se pudo leer el archivo local. Conservamos los datos existentes; exporta tu nuevo trabajo como respaldo.'),500);
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
})();
