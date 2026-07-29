/* ACS Crop Settings — app logic
   Factory data lives in data.js and is never mutated. User edits and hidden-crop
   choices are kept in a separate overlay so "restore factory" is always possible. */

const SCHEMAS = {
  rotary: [
    {key:'fanSpeed',   label:'Fan Speed',               unit:'rpm',  kind:'range'},
    {key:'sieveUpper', label:'Sieve, upper',            unit:'mm',   kind:'range'},
    {key:'sieveLower', label:'Sieve, lower',            unit:'mm',   kind:'range'},
    {key:'rotorSpeed', label:'Rotor Speed',             unit:'rpm',  kind:'range'},
    {key:'concave',    label:'Concave Opening',         unit:'mm',   kind:'range'},
    {key:'spreader',   label:'Spreader Speed',          unit:'rpm',  kind:'range'},
    {key:'cageVanes',  label:'Cage Vanes',              unit:'%',    kind:'range'},
    {key:'sievePre',   label:'Sieve, pre',              unit:'mm',   kind:'range'},
    {key:'feeder',     label:'Feeder Speed',            unit:'rpm',  kind:'range'},
    {key:'spiked',     label:'Spiked Rasp Bars',        unit:'',     kind:'single'},
    {key:'nonSpiked',  label:'Non Spiked Rasp Bars',    unit:'',     kind:'single'},
    {key:'separator',  label:'Straight Separator Bars', unit:'',     kind:'single'},
    {key:'modFront',   label:'Module Conf. Front Type', unit:'',     kind:'single'},
    {key:'modRear',    label:'Module Conf. Rear Type',  unit:'',     kind:'single'}
  ],
  conventional: [
    {key:'fanSpeed',   label:'Fan Speed',        unit:'rpm', kind:'pair'},
    {key:'drumSpeed',  label:'Drum Speed',       unit:'rpm', kind:'single'},
    {key:'concave',    label:'Concave Clearance',unit:'mm',  kind:'single'},
    {key:'sieveUpper', label:'Sieve, upper',     unit:'mm',  kind:'pair'},
    {key:'sieveLower', label:'Sieve, lower',     unit:'mm',  kind:'pair'},
    {key:'sievePre',   label:'Sieve, pre',       unit:'mm',  kind:'pair'}
  ]
};

const MACHINES = [
  {id:'afx_std',   brand:'Case IH',      name:'Axial-Flow', label:'Standard AFX rotor',      schema:'rotary'},
  {id:'afx_small', brand:'Case IH',      name:'Axial-Flow', label:'Small tube rotor',        schema:'rotary'},
  {id:'cr_v2',     brand:'New Holland',  name:'CR',         label:'CR — base',               schema:'rotary'},
  {id:'cr_std17',  brand:'New Holland',  name:'CR',         label:'CR — Standard, 17 in',    schema:'rotary'},
  {id:'cr_std22',  brand:'New Holland',  name:'CR',         label:'CR — Standard, 22 in',    schema:'rotary'},
  {id:'cr_twin17', brand:'New Holland',  name:'CR',         label:'CR — Twin-pitch, 17 in',  schema:'rotary'},
  {id:'cr_twin22', brand:'New Holland',  name:'CR',         label:'CR — Twin-pitch, 22 in',  schema:'rotary'},
  {id:'cx',        brand:'New Holland',  name:'CX',         label:'CX — conventional',       schema:'conventional'}
];

const STORE_KEY = 'acs.settings.v1';
const $ = id => document.getElementById(id);

/* ---------- persistence (degrades to memory if storage is unavailable) ---------- */
let storageWorks = true;
function loadStore(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {hidden:[], edits:{}};
  }catch(e){ storageWorks = false; return {hidden:[], edits:{}}; }
}
function saveStore(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(store)); }
  catch(e){ storageWorks = false; }
}

let store = loadStore();
const state = {brand:'Case IH', machine:'afx_std', crop:'Wheat-Spring', filter:''};

/* ---------- data access ---------- */
const machine  = () => MACHINES.find(m => m.id === state.machine);
const schema   = () => SCHEMAS[machine().schema];
const factory  = (mid, crop) => (window.ACS_FACTORY[mid] || {})[crop] || null;
const editsFor = (mid, crop) => ((store.edits[mid] || {})[crop]) || null;

function record(mid, crop){
  const fac = factory(mid, crop), ed = editsFor(mid, crop);
  if(!fac && !ed) return null;
  const v = Object.assign({}, fac ? fac.v : {}, ed || {});
  let source = fac ? fac.source : 'user';
  if(ed) source = 'user';
  return {source, v};
}
const current = () => record(state.machine, state.crop);
const cropsForMachine = () => window.ACS_CROPS.filter(c => record(state.machine, c));
const visibleCrops = () => cropsForMachine().filter(c => !store.hidden.includes(c));

/* ---------- formatting ---------- */
function fmt(field, val){
  val = val || [];
  if(field.kind === 'range'){
    if(!val[0] && !val[1]) return '';
    return `${val[0]||'—'} - ${val[1]||'—'}${field.unit ? ' '+field.unit : ''}`;
  }
  if(field.kind === 'pair'){
    if(!val[0] && !val[1]) return '';
    if(val[0] === val[1] || !val[1]) return `${val[0]}${field.unit ? ' '+field.unit : ''}`;
    return `${val[0]} / ${val[1]}${field.unit ? ' '+field.unit : ''}`;
  }
  return val[0] ? `${val[0]}${field.unit ? ' '+field.unit : ''}` : '';
}

/* ---------- rendering ---------- */
function renderBrand(){
  document.querySelectorAll('[data-brand]').forEach(b => {
    if(b.classList.contains('seg-btn'))
      b.setAttribute('aria-pressed', b.dataset.brand === state.brand);
  });
  const m = machine();
  $('brandMark').textContent = m.brand;
  $('brandMark').dataset.brand = m.brand;
  $('machineName').textContent = m.name;
}

function renderMachines(){
  $('machines').innerHTML = MACHINES.filter(m => m.brand === state.brand).map(m =>
    `<button class="machine-btn" type="button" data-machine="${m.id}"
      aria-pressed="${m.id === state.machine}">${m.label}</button>`).join('');
}

function renderChips(){
  const f = state.filter.toLowerCase();
  const list = visibleCrops().filter(c => c.toLowerCase().includes(f));
  if(!list.length){
    $('chips').innerHTML = `<p class="empty-note">${
      cropsForMachine().length ? 'Nothing matches. Check Manage list if crops are hidden.'
                               : 'No crops in this table.'}</p>`;
    return;
  }
  $('chips').innerHTML = list.map(c => {
    const r = record(state.machine, c);
    return `<button class="chip" type="button" data-crop="${c}" data-src="${r.source}"
      aria-pressed="${c === state.crop}"><span class="dot"></span>${c}</button>`;
  }).join('');
}

function renderReadout(){
  const r = current();
  const head = `<div class="rows"><div class="row row-crop">
      <span class="row-label">Crop type</span>
      <span class="row-value">${state.crop}</span></div>`;
  if(!r){
    $('readout').innerHTML = head + `</div><div class="blank">
      <p class="blank-h">No values for this crop</p>
      <p class="blank-p">This crop isn't in the ${machine().label} table. Pick another crop, or add your own values with Edit.</p></div>`;
    $('prov').removeAttribute('data-src');
    $('prov').innerHTML = `<span class="dot"></span>Not in this table`;
    return;
  }
  const ed = editsFor(state.machine, state.crop) || {};
  const rows = schema().map(f => {
    const text = fmt(f, r.v[f.key]);
    return `<div class="row${ed[f.key] ? ' row-edited' : ''}">
      <span class="row-label">${f.label}</span>
      <span class="row-value${text ? '' : ' empty'}">${text || 'not set'}</span></div>`;
  }).join('');
  $('readout').innerHTML = head + rows + `</div>`;

  const label = r.source === 'photo'    ? 'Confirmed on a real monitor'
              : r.source === 'firmware' ? 'Factory table'
              : 'Your values';
  $('prov').setAttribute('data-src', r.source);
  $('prov').innerHTML = `<span class="dot"></span>${label} · ${machine().label}`;
}

function render(){
  renderBrand(); renderMachines(); renderChips(); renderReadout();
  $('footNote').textContent = storageWorks
    ? 'Your edits are saved on this device.'
    : 'Storage is unavailable here, so changes last only for this session. Use Backup to export.';
}

function closePanels(except){
  ['editor','manage','share','backup'].forEach(id => { if(id !== except) $(id).hidden = true; });
}
function toast(msg){
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- editor ---------- */
function openEditor(){
  const r = current();
  $('edHead').textContent = `Edit — ${state.crop}`;
  $('edFields').innerHTML = schema().map(f => {
    const v = (r && r.v[f.key]) || [];
    const two = f.kind === 'range' || f.kind === 'pair';
    const sep = f.kind === 'range' ? '–' : '/';
    const inputs = two
      ? `<input type="text" data-k="${f.key}" data-i="0" value="${v[0]||''}" aria-label="${f.label} first">
         <span class="dash">${sep}</span>
         <input type="text" data-k="${f.key}" data-i="1" value="${v[1]||''}" aria-label="${f.label} second">`
      : `<input type="text" data-k="${f.key}" data-i="0" value="${v[0]||''}" aria-label="${f.label}">`;
    return `<div class="field"><label class="field-label">${f.label}</label>
      <div class="field-inputs">${inputs}<span class="unit">${f.unit}</span></div></div>`;
  }).join('');
  closePanels('editor');
  $('editor').hidden = false;
  $('editor').scrollIntoView({behavior:'smooth', block:'start'});
}

function saveEditor(){
  const fac = factory(state.machine, state.crop);
  const diff = {};
  schema().forEach(f => {
    const arr = [];
    $('edFields').querySelectorAll(`[data-k="${f.key}"]`).forEach(i => { arr[+i.dataset.i] = i.value.trim(); });
    const base = (fac && fac.v[f.key]) || [];
    if(JSON.stringify(arr) !== JSON.stringify(base.slice(0, arr.length))) diff[f.key] = arr;
  });
  store.edits[state.machine] = store.edits[state.machine] || {};
  if(Object.keys(diff).length) store.edits[state.machine][state.crop] = diff;
  else delete store.edits[state.machine][state.crop];
  saveStore(); $('editor').hidden = true; render();
  toast(Object.keys(diff).length ? 'Saved' : 'Matches factory — edit cleared');
}

function revertCrop(){
  if(store.edits[state.machine]) delete store.edits[state.machine][state.crop];
  saveStore(); $('editor').hidden = true; render(); toast('Factory values restored');
}

/* ---------- manage crop list ---------- */
function openManage(){
  const all = cropsForMachine();
  $('manageList').innerHTML = all.map(c => {
    const r = record(state.machine, c);
    const on = !store.hidden.includes(c);
    return `<label class="manage-row"><input type="checkbox" data-crop="${c}" ${on?'checked':''}>
      <span>${c}</span><span class="dot" style="background:${
        r.source==='photo'?'var(--ok)':r.source==='user'?'var(--amber)':'var(--blue)'}"></span></label>`;
  }).join('');
  closePanels('manage'); $('manage').hidden = false;
  $('manage').scrollIntoView({behavior:'smooth', block:'start'});
}
function setHidden(list){
  store.hidden = list; saveStore();
  if(!visibleCrops().includes(state.crop) && visibleCrops().length) state.crop = visibleCrops()[0];
  render();
}

/* ---------- share ---------- */
function shareText(){
  const r = current();
  if(!r) return '';
  const m = machine();
  const lines = [
    `ACS recommended combine settings`,
    `${m.brand} ${m.name} — ${m.label}`,
    `Crop: ${state.crop}`,
    ''
  ];
  schema().forEach(f => {
    const t = fmt(f, r.v[f.key]);
    if(t) lines.push(`${f.label.padEnd(24)} ${t}`);
  });
  lines.push('', r.source === 'photo' ? 'Source: confirmed on monitor'
            : r.source === 'user' ? 'Source: operator values'
            : 'Source: factory table');
  return lines.join('\n');
}
function openShare(){
  $('shHead').textContent = `Share — ${state.crop}`;
  $('sharePreview').textContent = shareText() || 'Nothing to share for this crop.';
  closePanels('share'); $('share').hidden = false;
  $('share').scrollIntoView({behavior:'smooth', block:'start'});
}
function download(name, text, type){
  const b = new Blob([text], {type});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- events ---------- */
document.querySelector('.seg').addEventListener('click', e => {
  const b = e.target.closest('[data-brand]'); if(!b) return;
  state.brand = b.dataset.brand;
  const first = MACHINES.find(m => m.brand === state.brand);
  state.machine = first.id;
  const list = visibleCrops();
  if(!list.includes(state.crop) && list.length) state.crop = list[0];
  closePanels(); render();
});
$('machines').addEventListener('click', e => {
  const b = e.target.closest('[data-machine]'); if(!b) return;
  state.machine = b.dataset.machine;
  const list = visibleCrops();
  if(!list.includes(state.crop) && list.length) state.crop = list[0];
  closePanels(); render();
});
$('chips').addEventListener('click', e => {
  const b = e.target.closest('[data-crop]'); if(!b) return;
  state.crop = b.dataset.crop; closePanels(); render();
});
$('search').addEventListener('input', e => { state.filter = e.target.value; renderChips(); });

$('btnEdit').addEventListener('click', openEditor);
$('btnSave').addEventListener('click', saveEditor);
$('btnRevert').addEventListener('click', revertCrop);
$('btnCancelEdit').addEventListener('click', () => { $('editor').hidden = true; });

$('btnManage').addEventListener('click', openManage);
$('btnCloseManage').addEventListener('click', () => { $('manage').hidden = true; });
$('manageList').addEventListener('change', () => {
  const hidden = [...$('manageList').querySelectorAll('input')].filter(i => !i.checked).map(i => i.dataset.crop);
  const others = store.hidden.filter(c => !cropsForMachine().includes(c));
  setHidden([...new Set([...others, ...hidden])]);
});
$('btnAll').addEventListener('click', () => { setHidden(store.hidden.filter(c => !cropsForMachine().includes(c))); openManage(); });
$('btnNone').addEventListener('click', () => { setHidden([...new Set([...store.hidden, ...cropsForMachine()])]); openManage(); });
$('btnOnlyData').addEventListener('click', () => {
  const keep = cropsForMachine();
  setHidden([...new Set([...store.hidden.filter(c => !keep.includes(c))])]);
  openManage(); toast('Showing every crop this table has');
});

$('btnShare').addEventListener('click', openShare);
$('btnShareSend').addEventListener('click', async () => {
  const text = shareText(); if(!text) return;
  if(navigator.share){ try{ await navigator.share({title:`ACS — ${state.crop}`, text}); }catch(e){} }
  else { try{ await navigator.clipboard.writeText(text); toast('Copied — paste into a message'); }catch(e){ toast('Copy not available'); } }
});
$('btnShareCopy').addEventListener('click', async () => {
  try{ await navigator.clipboard.writeText(shareText()); toast('Copied'); }
  catch(e){ toast('Copy not available'); }
});
$('btnShareJson').addEventListener('click', () => {
  const r = current(); if(!r) return;
  const m = machine();
  download(`acs-${state.crop.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.json`,
    JSON.stringify({brand:m.brand, machine:m.label, machineId:m.id, crop:state.crop,
      source:r.source, values:r.v}, null, 2), 'application/json');
});
$('btnCloseShare').addEventListener('click', () => { $('share').hidden = true; });

$('btnData').addEventListener('click', () => {
  $('storeNote').textContent = storageWorks
    ? 'Saving is working on this device.'
    : 'This browser is blocking storage, so nothing will persist after you close the app.';
  closePanels('backup'); $('backup').hidden = false;
  $('backup').scrollIntoView({behavior:'smooth', block:'start'});
});
$('btnExportAll').addEventListener('click', () => {
  download('acs-my-settings.json', JSON.stringify(store, null, 2), 'application/json');
});
$('btnImportAll').addEventListener('click', () => $('fileInput').click());
$('fileInput').addEventListener('change', e => {
  const file = e.target.files[0]; if(!file) return;
  const fr = new FileReader();
  fr.onload = () => {
    try{
      const p = JSON.parse(fr.result);
      if(!p || typeof p !== 'object' || !('edits' in p)) throw 0;
      store = {hidden: p.hidden || [], edits: p.edits || {}};
      saveStore(); render(); toast('Settings imported');
    }catch(err){ toast('That file is not an ACS backup'); }
  };
  fr.readAsText(file); e.target.value = '';
});
$('btnResetAll').addEventListener('click', () => {
  if(!confirm('Clear every edit and show all crops again? Factory values stay.')) return;
  store = {hidden:[], edits:{}}; saveStore(); render(); toast('Reset to factory');
});
$('btnCloseBackup').addEventListener('click', () => { $('backup').hidden = true; });

render();
