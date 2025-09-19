/*
  Smart Study Planner
  - Uses LocalStorage
  - Features: create/edit/delete tasks, quick add, filter, timeline, notification reminders, import/export JSON
  - Key: 'smartStudyPlannerTasks'
*/

const STORAGE_KEY = 'smartStudyPlannerTasks';
let tasks = [];
const $ = id => document.getElementById(id);

// DOM elements
const form = $('taskForm');
const titleEl = $('title');
const subjectEl = $('subject');
const dueEl = $('due');
const durationEl = $('duration');
const priorityEl = $('priority');
const notesEl = $('notes');
const taskIdEl = $('taskId');
const tasksWrap = $('tasks');
const stats = $('stats');
const nextReminder = $('nextReminder');
const timelineRows = $('timelineRows');

// reminders map
const reminders = new Map();

// helpers
function uid(){ return 't_'+Math.random().toString(36).slice(2,9) }
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
function load(){ try{ tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')||[] }catch(e){ tasks=[] } }
function prettyDate(d){ if(!d) return 'No due'; const dt=new Date(d); if(isNaN(dt)) return 'Invalid'; return dt.toLocaleString(); }

// reminder handling
function scheduleReminder(task){
  if(!task.due || task.completed) return;
  const due = new Date(task.due).getTime();
  const now = Date.now(); const ms = due-now;
  if(ms<=0) return;
  if(reminders.has(task.id)) clearTimeout(reminders.get(task.id));
  if(ms > 7*24*3600*1000) return;
  const t=setTimeout(()=>{showNotification(task); reminders.delete(task.id)}, ms);
  reminders.set(task.id,t);
}
function cancelReminder(id){ if(reminders.has(id)){ clearTimeout(reminders.get(id)); reminders.delete(id); } }
function showNotification(task){
  if(Notification.permission==='granted'){
    const n=new Notification('Study Reminder: '+task.title,{body:`${task.subject||''} • Due ${prettyDate(task.due)}`});
    n.onclick=()=>window.focus();
  }
}

// form submit
form.addEventListener('submit', e=>{
  e.preventDefault();
  const id=taskIdEl.value||uid();
  const t={
    id, title:titleEl.value.trim()||'Untitled', subject:subjectEl.value.trim(),
    due:dueEl.value||null, duration:Number(durationEl.value)||0, priority:priorityEl.value,
    notes:notesEl.value.trim(), completed:false, created:new Date().toISOString()
  };
  const idx=tasks.findIndex(x=>x.id===id);
  if(idx>=0){ tasks[idx]={...tasks[idx],...t}; cancelReminder(id); }
  else tasks.push(t);
  save(); render(); form.reset(); taskIdEl.value=''; $('formTitle').innerText='Create Task';
  if(t.due && Notification.permission==='default'){ Notification.requestPermission(); }
});

// quick add
$('quickAdd').addEventListener('click',()=>{
  const v=$('quick').value.trim(); if(!v) return;
  const part=v.split('|').map(s=>s.trim());
  const t={id:uid(),title:part[0],subject:'',due:null,duration:0,priority:'medium',notes:''};
  if(part[1]){ const dt=new Date(part[1].replace(' ','T')); if(!isNaN(dt)) t.due=dt.toISOString().slice(0,16); }
  tasks.push(t); save(); render(); $('quick').value='';
});

// reset
$('resetBtn').addEventListener('click',()=>{ form.reset(); taskIdEl.value=''; $('formTitle').innerText='Create Task'; });

// import/export
$('exportBtn').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(tasks,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='smart-study-planner.json'; a.click();
});
$('importBtn').addEventListener('click',()=>{
  const input=document.createElement('input'); input.type='file'; input.accept='application/json';
  input.onchange=async e=>{
    const f=e.target.files[0]; if(!f) return; const txt=await f.text();
    try{const arr=JSON.parse(txt); if(Array.isArray(arr)){ tasks=arr; save(); render(); alert('Imported '+arr.length+' tasks'); } else alert('Invalid format');}
    catch(err){alert('Import failed: '+err.message);}
  };
  input.click();
});

// clear all
$('clearBtn').addEventListener('click',()=>{ if(confirm('Clear all tasks?')){ tasks=[]; save(); render(); } });

// filter
$('filter').addEventListener('change',()=>render());

// render
function render(){
  load(); tasks.forEach(scheduleReminder);
  stats.innerText=`${tasks.length} tasks • ${tasks.filter(t=>t.due && !t.completed && new Date(t.due)>Date.now()).length} upcoming`;
  const nearest=tasks.filter(t=>t.due && !t.completed).sort((a,b)=>new Date(a.due)-new Date(b.due))[0];
  nextReminder.innerText=nearest?`Next: ${nearest.title} • ${prettyDate(nearest.due)}`:'No reminders scheduled';

  const f=$('filter').value; let show=tasks.slice(); const now=new Date();
  if(f==='today') show=show.filter(t=>t.due && new Date(t.due).toDateString()===now.toDateString());
  else if(f==='upcoming'){ const week=Date.now()+7*24*3600*1000; show=show.filter(t=>t.due && new Date(t.due).getTime()<=week && new Date(t.due).getTime()>=Date.now()); }
  else if(f==='completed') show=show.filter(t=>t.completed);

  show.sort((a,b)=>new Date(a.due||0)-new Date(b.due||0));
  tasksWrap.innerHTML='';
  show.forEach(t=>{
    const el=document.createElement('div'); el.className='task';
    const left=document.createElement('div'); left.style.width='6px'; left.style.height='48px'; left.style.borderRadius='6px';
    left.style.background=t.priority==='high'?'linear-gradient(90deg,var(--accent-2),var(--accent))':t.priority==='medium'?'linear-gradient(90deg,#60a5fa,#34d399)':'rgba(255,255,255,0.02)';
    el.appendChild(left);

    const meta=document.createElement('div'); meta.className='meta';
    const title=document.createElement('div'); title.className='title'; title.innerText=t.title+(t.completed?' ✅':'');
    const small=document.createElement('div'); small.className='small'; small.innerText=`${t.subject||'No subject'} • ${t.duration?t.duration+' mins • ':''}${prettyDate(t.due)}`;
    const chips=document.createElement('div'); chips.className='chips'; const p=document.createElement('div'); p.className='chip'; p.innerText='Priority: '+t.priority; chips.appendChild(p);
    meta.appendChild(title); meta.appendChild(small); meta.appendChild(chips); el.appendChild(meta);

    const actions=document.createElement('div'); actions.style.display='flex'; actions.style.flexDirection='column'; actions.style.gap='6px';
    const edit=document.createElement('button'); edit.className='ghost'; edit.innerText='Edit'; edit.onclick=()=>populateForm(t);
    const del=document.createElement('button'); del.className='ghost'; del.innerText='Delete'; del.onclick=()=>{ if(confirm('Delete task?')){ tasks=tasks.filter(x=>x.id!==t.id); cancelReminder(t.id); save(); render(); } };
    const done=document.createElement('button'); done.innerText=t.completed?'Mark undone':'Mark done'; done.onclick=()=>{ t.completed=!t.completed; cancelReminder(t.id); save(); render(); }
    actions.append(edit,done,del); el.appendChild(actions);
    tasksWrap.appendChild(el);
  });

  // timeline
  timelineRows.innerHTML='';
  const withDate=tasks.filter(t=>t.due).sort((a,b)=>new Date(a.due)-new Date(b.due));
  if(!withDate.length){ timelineRows.innerHTML='<div class="small" style="color:var(--muted)">No timed tasks to show</div>'; }
  else{
    const times=withDate.map(t=>new Date(t.due).getTime());
    const min=Math.min(...times), max=Math.max(...times), range=Math.max(1,max-min);
    withDate.forEach(t=>{
      const row=document.createElement('div'); row.className='timeline-row';
      const lbl=document.createElement('div'); lbl.className='timeline-label'; lbl.innerText=t.title+(t.completed?' ✅':'');
      const wrap=document.createElement('div'); wrap.className='timeline-bar-wrap';
      const bar=document.createElement('div'); bar.className='timeline-bar';
      const pos=(new Date(t.due).getTime()-min)/range*100; const width=Math.max(6,((t.duration||30)/(24*60))*100);
      bar.style.left=pos+'%'; bar.style.width=width+'%'; bar.style.background='linear-gradient(90deg,var(--accent),var(--accent-2))';
      const prog=document.createElement('div'); prog.className='progress'; prog.style.width=(t.completed?100:0)+'%'; prog.style.position='absolute'; prog.style.left='0';
      wrap.append(bar,prog); row.append(lbl,wrap); timelineRows.appendChild(row);
    });
  }
}

function populateForm(t){
  taskIdEl.value=t.id; titleEl.value=t.title; subjectEl.value=t.subject;
  dueEl.value=t.due?t.due.slice(0,16):''; durationEl.value=t.duration||'';
  priorityEl.value=t.priority; notesEl.value=t.notes||'';
  $('formTitle').innerText='Edit Task'; window.scrollTo({top:0,behavior:'smooth'});
}

// init
load(); render();
window.addEventListener('load',()=>tasks.forEach(scheduleReminder));
window.addEventListener('beforeunload',()=>save());
window.addEventListener('keydown',e=>{ if(e.key==='n'&&!e.ctrlKey&&!e.metaKey){ e.preventDefault(); titleEl.focus(); } });
