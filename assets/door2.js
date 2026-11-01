/* ══════════════════════════════════════════════════════════════════════════════════════════
   DOOR 2 — «المجلدات القانونية» · own script (app.js is NOT touched — isolation principle).

   The legal section is a HALLWAY with two doors:
     Door 1 = today's legal section (استمارة · تعهد · منح) — auto-selected, byte-for-byte the same.
     Door 2 = the legal folders: one roster → استمارة + تعهد (Word) + «الأسماء» pictures, visa-ready.

   Hooks WITHOUT a line in app.js: setLaw() already toggles #blaw.on, applyLang() already writes
   <html lang>; both are observed here. Everything else Door 2 needs from the app is used as a
   LIBRARY (pure helpers: t · esc · tv · toast · istFmtDate · istDef1 · istResCountry · istHasVisa ·
   istRepPhoto · openPicker · istWake · istAwaitRender) or as a SERVICE (the render line:
   istimara_renders → the worker fills the real Word template). Door 2's data lives in its OWN
   tables (legal_dossiers · legal_dossier_members) through its OWN RPCs (dossier_open/save/release/archive).
   ══════════════════════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  const T={
    ar:{door1:'المعاملات', door1s:'استمارة · تعهد · منح', door2:'المجلدات القانونية', door2s:'مجلدات جاهزة للتأشيرة',
        q:'ابحث باسم المجلد…', add:'＋ مجلد جديد', empty_h:'لا مجلدات بعد',
        empty:'كل مجلد = استمارة + تعهد بصيغة Word، ومجلد «الأسماء» بصورة الجواز والصورة الشخصية لكل موظف.',
        none:'لا مجلد بهذا الاسم', hall:'أبواب القسم القانوني', arch:'أرشفة', arch_q:n=>`أرشفة المجلد «${n}»؟ يختفي من القائمة ولا يُحذف.`,
        show_arch:'المؤرشفة', st_draft:'مسودة', st_saved:'محفوظ', st_arch:'مؤرشف', members:n=>`${n} موظف`, open:'فتح',
        locked:(by)=>`قيد التحرير بواسطة ${by||'مستخدم آخر'}`,
        s1:'اسم المجلد', s2:'الموظفون', s3:'الاستمارة', s4:'التعهد', s5:'حفظ',
        name_ph:'مثال: دفعة شنغهاي — تشرين الثاني', name_need:'اكتب اسم المجلد أولًا',
        src_q:'من أين نضيف الموظفين؟', src_reg:'من السجل', src_reg_s:'ابحث واختر موظفين مسجّلين', src_pc:'من الجهاز',
        src_pc_s:'ملفات جوازات PDF أو مجلدات كاملة', src_pc_soon:'يأتي في الخطوة التالية (الشريحة 3)',
        roster_h:n=>`القائمة — ${n} موظف`, roster_empty:'لم يُضَف أحد بعد', need_rows:'أضِف موظفًا واحدًا على الأقل',
        rm:'إزالة', back:'‹ السابق', next:'التالي ›', save:'حفظ المجلد', saved:'حُفظ المجلد ✓', draft_saved:'حُفظت المسودة',
        word:'تصدير Word', word_wait:'يُجهَّز ملف Word…', word_fail:'تعذّر التصدير — حاول مجددًا', word_done:'نُزِّل الملف ✓',
        gate:n=>`${n} صف يحتاج مراجعة أو إزالة قبل المتابعة`, dup:'هذا الجواز موجود في المجلد',
        apply_all:'تطبيق على كل الصفوف', fill_down:'نسخ إلى الصفوف تحتها', fold:'من المجلد', close_q:'تغييرات غير محفوظة — حفظ كمسودة؟',
        closed:'إغلاق', p_ist:'الاستمارة', p_taa:'التعهد', one_roster:'قائمة واحدة لكلا الورقتين — أي تغيير هنا يظهر هناك',
        pick_add:n=>`إضافة ${n} إلى المجلد`, pick_in:'في المجلد', ok_rows:n=>`${n} ✓`},
    en:{door1:'Procedures', door1s:'Istimara · Taahud · Grant', door2:'Legal folders', door2s:'Visa-ready folders',
        q:'Search by folder name…', add:'＋ New folder', empty_h:'No folders yet',
        empty:'Each folder = Istimara + Taahud as Word, and a «Names» folder with the passport page and portrait of every employee.',
        none:'No folder by that name', hall:'Legal section doors', arch:'Archive', arch_q:n=>`Archive folder “${n}”? It leaves the list; nothing is deleted.`,
        show_arch:'Archived', st_draft:'Draft', st_saved:'Saved', st_arch:'Archived', members:n=>`${n} employees`, open:'Open',
        locked:(by)=>`Being edited by ${by||'another user'}`,
        s1:'Folder name', s2:'Employees', s3:'Istimara', s4:'Taahud', s5:'Save',
        name_ph:'e.g. Shanghai batch — November', name_need:'Type the folder name first',
        src_q:'Where do the employees come from?', src_reg:'From the registry', src_reg_s:'Search and pick registered employees', src_pc:'From this device',
        src_pc_s:'Passport PDFs or whole folders', src_pc_soon:'Arrives in the next step (slice 3)',
        roster_h:n=>`Roster — ${n} employees`, roster_empty:'Nobody added yet', need_rows:'Add at least one employee',
        rm:'Remove', back:'‹ Back', next:'Next ›', save:'Save folder', saved:'Folder saved ✓', draft_saved:'Draft saved',
        word:'Export Word', word_wait:'Preparing the Word file…', word_fail:'Export failed — try again', word_done:'Downloaded ✓',
        gate:n=>`${n} row(s) need review or removal before continuing`, dup:'This passport is already in the folder',
        apply_all:'Apply to all rows', fill_down:'Copy to the rows below', fold:'from folder', close_q:'Unsaved changes — save as draft?',
        closed:'Close', p_ist:'Istimara', p_taa:'Taahud', one_roster:'One roster for both papers — a change here shows there',
        pick_add:n=>`Add ${n} to the folder`, pick_in:'in folder', ok_rows:n=>`${n} ✓`}
  };
  const $=s=>document.querySelector(s);
  const lang=()=>document.documentElement.lang==='en'?'en':'ar';
  const t2=(k,...a)=>{ const v=(T[lang()]||T.ar)[k]; return typeof v==='function'?v(...a):(v||''); };
  // the app's helpers are top-level let/const/function in a classic script: visible by NAME in this global
  // scope but NOT as window properties — so probe by name (indirect eval sees global lexical bindings)
  const has=n=>{ try{ return (0,eval)('typeof '+n)!=='undefined'; }catch(_){ return false; } };
  const E=s=>has('esc')?esc(s):String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const say=m=>{ if(has('toast')) toast(m); else console.info(m); };
  const T1=k=>has('t')?t(k):k;                       // the app's own labels (ist_c_name …) — same words as Door 1
  const fmtD=s=>has('istFmtDate')?istFmtDate(s):String(s||'');
  const TV=v=>has('tv')?tv(v):v;
  const HAND=['addr_iraq','border','profession','res_country','visited'];

  /* ── the hallway ──────────────────────────────────────────────────────────────────────── */
  let door='door1';
  const ICON_SCALE='<svg class="ic"><use href="#i-scale"/></svg>';
  const ICON_FOLDER='<svg class="ic" viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
  function paint(){
    const d1=$('#door-1'), d2=$('#door-2'); if(!d1||!d2) return;
    d1.innerHTML=`${ICON_SCALE}<span>${t2('door1')}</span>`; d2.innerHTML=`${ICON_FOLDER}<span>${t2('door2')}</span>`;
    d1.title=t2('door1s'); d2.title=t2('door2s');
    d1.classList.toggle('on',door==='door1'); d2.classList.toggle('on',door==='door2');
    d1.setAttribute('aria-selected',door==='door1'); d2.setAttribute('aria-selected',door==='door2');
    const nav=$('#law-doors'); if(nav) nav.setAttribute('aria-label',t2('hall'));
    const q=$('#d2-q'); if(q) q.placeholder=t2('q');
    const a=$('#d2-add'); if(a) a.textContent=t2('add');
    const ar=$('#d2-arch-t'); if(ar) ar.textContent=t2('show_arch');
    paintList();
    if(W) wizPaint();
  }
  function select(d){ door=(d==='door2')?'door2':'door1'; document.body.classList.toggle('door2',door==='door2'); paint(); if(door==='door2') loadList(); }
  function onLaw(on){ document.body.classList.toggle('lawmode',!!on); if(on) select('door1'); else { door='door1'; document.body.classList.remove('door2'); paint(); } }

  /* ── the folder list ──────────────────────────────────────────────────────────────────── */
  const L={rows:[], q:'', arch:false, loaded:false};
  async function loadList(){
    if(!has('sb')) return;
    try{
      const {data,error}=await sb.from('legal_dossiers')
        .select('dossier_id,name,status,created_at,saved_at,updated_at,editing_by,editing_at,legal_dossier_members(count)')
        .order('created_at',{ascending:false}).limit(500);
      if(error) throw error;
      L.rows=(data||[]).map(d=>({...d, n:(d.legal_dossier_members&&d.legal_dossier_members[0]&&d.legal_dossier_members[0].count)||0}));
      L.loaded=true;
    }catch(e){ console.warn('door2 list',e); say((e&&e.message)||String(e)); }
    paintList();
  }
  const fmtDay=s=>{ try{ return new Date(s).toLocaleDateString(lang()==='ar'?'ar-IQ-u-nu-latn':'en-GB',{day:'2-digit',month:'2-digit',year:'numeric'}); }catch(_){ return String(s||'').slice(0,10); } };
  function paintList(){
    const box=$('#d2-list'); if(!box) return;
    const q=L.q.trim().toLowerCase();
    const rows=L.rows.filter(d=>(L.arch?d.status==='archived':d.status!=='archived') && (!q||String(d.name||'').toLowerCase().includes(q)));
    if(!L.rows.length){ box.innerHTML=`<div class="d2-empty" id="d2-empty"><b>${t2('empty_h')}</b>${t2('empty')}</div>`; return; }
    if(!rows.length){ box.innerHTML=`<div class="d2-empty"><b>${t2(L.arch?'st_arch':'none')}</b></div>`; return; }
    box.innerHTML=rows.map(d=>{
      const st=d.status==='saved'?'saved':d.status==='archived'?'arch':'draft';
      const lock=d.editing_by && d.editing_at && (Date.now()-new Date(d.editing_at).getTime()<15*60e3);
      return `<div class="row d2-row" data-open="${d.dossier_id}">
        <div class="ava d2-ava">${ICON_FOLDER}</div>
        <div class="who"><div class="nm">${E(d.name)} <span class="d2-st ${st}">${t2('st_'+st)}</span>${lock?` <span class="d2-lock" title="${E(t2('locked',d.editing_by))}">✎ ${E(d.editing_by||'')}</span>`:''}</div>
          <div class="sub">${fmtDay(d.created_at)} · ${t2('members',d.n)}</div></div>
        ${d.status==='archived'?'':`<button class="d2-rowbtn" data-arch="${d.dossier_id}" title="${E(t2('arch'))}">⌫</button>`}
      </div>`; }).join('');
    box.querySelectorAll('[data-open]').forEach(el=>el.onclick=e=>{ if(e.target.closest('[data-arch]')) return; wizOpen(+el.dataset.open); });
    box.querySelectorAll('[data-arch]').forEach(b=>b.onclick=async()=>{ const d=L.rows.find(x=>x.dossier_id===+b.dataset.arch); if(!d) return;
      if(!confirm(t2('arch_q',d.name))) return;
      try{ const {error}=await sb.rpc('dossier_archive',{p_id:d.dossier_id}); if(error) throw error; await loadList(); }
      catch(e){ say((e&&e.message)||String(e)); } });
  }

  /* ── the wizard: ① اسم المجلد → ② الموظفون → ③ الاستمارة → ④ التعهد → ⑤ حفظ ─────────── */
  let W=null;   // {id,name,status,header,hand,rows:[{person_id,passport_no,name,nationality,passport_expiry,hand,row_state}],step,paper,photo,dirty}
  const PAPERS=()=>has('IST_PAPERS')?IST_PAPERS:null;
  const def1=(k,p)=>has('istDef1')?(istDef1(k,p)||''):'';
  const defs=(k,p)=>has('istDefs')?(istDefs(k,p)||[]):[];
  function freshHeader(){ const H={company:'',company_nat:'',addr:'',purpose:'',stay:'',visatype:'',authorized:'',project:'',to_line:'',intro:'',body:''}, pre={};
    Object.keys(H).forEach(k=>{ const v=def1(k,'istimara'); if(v){ H[k]=v; pre[k]=1; } }); return {H,pre}; }
  async function wizOpen(id){
    if(!has('sb')) return;
    if(has('istLoadDefaults')) { try{ await istLoadDefaults(); }catch(_){} }
    let d=null, members=[];
    if(id){
      try{ const {data,error}=await sb.rpc('dossier_open',{p_id:id}); if(error) throw error;
        if(!data||!data.ok){ say(data&&data.why==='locked'?t2('locked',data.by):'?'); return; }
        d=data.dossier; members=data.members||[]; }
      catch(e){ say((e&&e.message)||String(e)); return; }
    }
    const fh=freshHeader();
    W={ id:d?d.dossier_id:null, name:d?d.name:'', status:d?d.status:'draft',
        header:Object.assign(fh.H, (d&&d.header)||{}), _pre:d?{}:fh.pre, hand:(d&&d.hand)||{},
        rows:members.map(m=>({person_id:m.person_id,passport_no:m.passport_no||'',name:m.name||'',nationality:m.nationality||'',
                              passport_expiry:m.passport_expiry||'',hand:m.hand||{},row_state:m.row_state||'ok'})),
        step:d?3:1, paper:'istimara', photo:null, dirty:false };
    if(has('istRepPhoto')){ try{ W.photo=await istRepPhoto()||null; }catch(_){} }
    let ov=$('#d2-wiz'); if(!ov){ ov=document.createElement('div'); ov.id='d2-wiz'; document.body.appendChild(ov); }
    ov.classList.add('on'); document.body.style.overflow='hidden';
    document.addEventListener('keydown',wizKey);
    wizPaint();
  }
  function wizKey(e){ if(e.key==='Escape'&&!document.querySelector('#istpick.on')){ e.stopPropagation(); wizClose(); } }
  async function wizClose(){
    if(!W) return;
    if(has('istPkClose')) istPkClose();   // a picker still open must close by its own path (drops its key handler)
    if(W.dirty && W.rows.length && W.name.trim()){ if(confirm(t2('close_q'))) await wizSave(W.status==='saved'?'saved':'draft',true); }
    if(W.id){ try{ await sb.rpc('dossier_release',{p_id:W.id}); }catch(_){} }
    W=null; const ov=$('#d2-wiz'); if(ov){ ov.classList.remove('on'); ov.innerHTML=''; } document.body.style.overflow='';
    document.removeEventListener('keydown',wizKey);
    loadList();
  }
  const gateBad=()=>W.rows.filter(r=>r.row_state==='review'||r.row_state==='refused').length;
  function wizGo(step){
    if(!W) return;
    if(step>1 && !W.name.trim()){ say(t2('name_need')); W.step=1; wizPaint(); return; }
    if(step>2 && !W.rows.length){ say(t2('need_rows')); W.step=2; wizPaint(); return; }
    if(step>=5){ const n=gateBad(); if(n){ say(t2('gate',n)); W.step=W.paper==='taahud'?4:3; wizPaint(); wizScrollBad(); return; } wizSave('saved'); return; }
    if(step===3) W.paper='istimara'; if(step===4) W.paper='taahud';
    W.step=Math.max(1,Math.min(4,step)); wizPaint();
  }
  function wizScrollBad(){ const el=document.querySelector('#d2-wiz tr.d2-bad'); if(el) el.scrollIntoView({block:'center'}); }
  function wizPaint(){
    const ov=$('#d2-wiz'); if(!ov||!W) return;
    if(has('istPkClose') && ov.querySelector('#istpick')) istPkClose();   // never wipe an open picker without its close
    const steps=[1,2,3,4,5].map(i=>`<button class="d2-step${W.step===i?' on':''}${i<W.step?' done':''}" data-step="${i}" type="button"><i>${i}</i><span>${t2('s'+i)}</span></button>`).join('');
    const body = W.step===1 ? wizStep1() : W.step===2 ? wizStep2() : wizSheet();
    const prev = W.step>1 ? `<button class="d2-nav" id="d2-prev" type="button">${t2('back')}</button>` : '';
    const next = W.step<4 ? `<button class="d2-nav primary" id="d2-next" type="button">${t2('next')}</button>`
                          : `<button class="d2-nav primary" id="d2-next" type="button">✓ ${t2('save')}</button>`;
    ov.innerHTML=`<div class="ist-wrap d2-wrap">
      <div class="ist-bar d2-bar">
        <button class="icon" id="d2-close" title="${E(t2('closed'))}">✕</button>
        <div class="ist-t">${ICON_FOLDER}<span class="ist-tnm">${E(W.name||t2('s1'))}</span></div>
        <span class="spacer"></span>
        <div class="d2-navs">${prev}${next}</div>
      </div>
      <div class="d2-stepsrow"><nav class="d2-steps" aria-label="steps">${steps}</nav></div>
      <div class="d2-body">${body}</div></div>`;
    $('#d2-close').onclick=wizClose;
    const nx=$('#d2-next'); if(nx) nx.onclick=()=>wizGo(W.step+1);
    const pv=$('#d2-prev'); if(pv) pv.onclick=()=>wizGo(W.step-1);
    ov.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>wizGo(+b.dataset.step));
    if(W.step===1){ const inp=$('#d2-name'); inp.oninput=()=>{ W.name=inp.value; W.dirty=true; }; inp.onkeydown=e=>{ if(e.key==='Enter') wizGo(2); }; inp.focus(); }
    if(W.step===2) wireStep2();
    if(W.step>=3) wireSheet();
  }
  function wizStep1(){ return `<div class="d2-q"><label class="d2-lbl" for="d2-name">${t2('s1')}</label>
    <input class="d2-in" id="d2-name" value="${E(W.name)}" placeholder="${E(t2('name_ph'))}" autocomplete="off"></div>`; }
  function wizStep2(){
    const roster=W.rows.length? `<div class="d2-roster">${W.rows.map((r,i)=>`<div class="d2-rrow"><b>${i+1}</b><span class="d2-rnm">${E(r.name)}</span><small>${E(r.passport_no)} · ${E(TV(r.nationality))}</small><button class="ist-rowx sm" data-rm="${i}" title="${E(t2('rm'))}">✕</button></div>`).join('')}</div>`
      : `<div class="d2-empty slim">${t2('roster_empty')}</div>`;
    return `<div class="d2-q"><div class="d2-lbl">${t2('src_q')}</div>
      <div class="ist-src-opts d2-src">
        <button class="ist-src-opt" id="d2-src-pc" type="button" disabled title="${E(t2('src_pc_soon'))}"><span class="ist-src-ic">⬆</span><b>${t2('src_pc')}</b><small>${t2('src_pc_s')} · ${t2('src_pc_soon')}</small></button>
        <button class="ist-src-opt" id="d2-src-reg" type="button"><span class="ist-src-ic">⌕</span><b>${t2('src_reg')}</b><small>${t2('src_reg_s')}</small></button>
      </div>
      <div class="d2-lbl">${t2('roster_h',W.rows.length)}</div>${roster}</div>`;
  }
  function wireStep2(){
    $('#d2-src-reg').onclick=pickRegistry;
    document.querySelectorAll('#d2-wiz [data-rm]').forEach(b=>b.onclick=()=>{ W.rows.splice(+b.dataset.rm,1); W.dirty=true; wizPaint(); });
  }
  const inRoster=r=>{ const no=String((r&&r.passport_no)||'').trim(), pid=r&&r.person_id;
    return W.rows.some(x=>(pid&&x.person_id===pid)||(no&&String(x.passport_no||'').trim()===no)); };
  function pickRegistry(){
    if(!has('openPicker')){ say('picker'); return; }
    openPicker({host:$('#d2-wiz'), title:t2('src_reg'), isIn:inRoster, addLabel:n=>t2('pick_add',n),
                onConfirm:async rows=>{ await addFromRegistry(rows);
                  // repaint AFTER the picker has closed itself (returning false → istPkClose). Repainting inside
                  // this callback destroyed #istpick before its close ran, so its keydown handler (which eats
                  // Space to tick a row) stayed alive and no field in the sheet could take a space.
                  setTimeout(()=>{ if(!W) return; if(W.step>=3) renderRows(); else wizPaint(); },0);
                  return false; }});
  }
  async function addFromRegistry(sel){
    const ids=sel.map(r=>r.person_id); let people=[];
    try{ const {data,error}=await sb.from('persons').select('person_id,name_latin,nationality,passport_no,passport_expiry,issuing_country').in('person_id',ids);
         if(error) throw error; people=data||[]; }catch(e){ say((e&&e.message)||String(e)); return; }
    const byId=new Map(people.map(p=>[p.person_id,p])); let n=0;
    for(const id of ids){ const p=byId.get(id)||sel.find(r=>r.person_id===id); if(!p) continue;
      if(inRoster({person_id:id,passport_no:p.passport_no})) continue;
      const row={person_id:id, name:p.name_latin||p.name||'', nationality:p.nationality||'', passport_no:p.passport_no||'',
                 passport_expiry:p.passport_expiry||'', hand:{}, row_state:'ok', _pre:{}};
      const rc=has('istResCountry')?istResCountry(p):''; if(rc){ row.hand.res_country=rc; row._pre.res_country=1; }   // fact: residence ← passport country
      W.rows.push(row); n++;
      if(has('istHasVisa')) istHasVisa(id).then(v=>{ if(v===null||!W) return; if(!row.hand.visited||row._pre.visited){ row.hand.visited=v?'نعم':'كلا'; row._pre.visited=1; if(W.step>=3) renderRows(); } }).catch(()=>{});   // fact: visited ← any visa
    }
    if(n) W.dirty=true;            // the caller repaints once the picker is gone
  }

  /* ── the sheet: ONE roster, two papers (same classes as Door 1's sheet → same look) ──── */
  function wizSheet(){
    const PP=PAPERS(); if(!PP) return '<div class="d2-empty">IST_PAPERS?</div>';
    const P=PP[W.paper], H=W.header;
    const frow=f=>`<div class="ist-frow"><span class="ist-lbl">${T1(f.lab)}:</span><span class="ist-fw"><input class="ist-in${W._pre[f.k]?' ist-pre':''}" data-h="${f.k}" value="${E(H[f.k]||'')}" placeholder="${f.ph?E(T1(f.ph)):''}">`
      +(defs(f.k,W.paper).length?`<button class="ist-pick" data-pick="${f.k}" tabindex="-1" type="button"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>`:'')+`</span></div>`;
    const txt=i=>{ const x=(P.texts||[])[i]; if(!x) return ''; const v=(H[x.k]!=null&&H[x.k]!=='')?H[x.k]:T1(x.d);
      return `<div class="ist-tx${x.cls?' '+x.cls:''}" contenteditable="plaintext-only" data-h="${x.k}">${E(v)}</div>`; };
    // the representative's photo box: click = pick a picture from the device (same affordance as Door 1), ✕ = clear
    const photoBox=P.photo?`<div class="ist-photo${W.photo?' has-img':''}" id="d2-photo" title="${E(T1('ist_photo'))}">${W.photo?`<img src="${W.photo}" alt=""><button class="ist-ph-x" id="d2-ph-x" type="button" title="${E(t2('rm'))}">✕</button>`:`<span class="ist-ph-hint">${E(T1('ist_photo'))}<br>＋</span>`}</div>`:'';
    const undertaking=W.paper==='taahud'?'':`<div class="ist-undertaking">${T1('ist_undertaking_pre')} <input class="ist-in ist-in-name" data-h="authorized" value="${E(H.authorized||'')}"> ${T1('ist_undertaking_post')}</div>`;
    const authSig=W.paper==='taahud'?'':`<div class="ist-sig"><div class="ist-sig-lbl">${T1('ist_sig_auth')}</div><input class="ist-in ist-in-name ist-sig-name" data-h="authorized" value="${E(H.authorized||'')}"></div>`;
    const heads=P.cols.map(c=>`<th${c.hand?' class="ist-hcol"':''}>${T1(c.lab)}</th>`).join('');
    const cgroup=P.cols.map(c=>`<col class="c-${c.k}">`).join('');
    const tabs=`<div class="d2-papers"><button class="d2-ptab${W.paper==='istimara'?' on':''}" data-paper="istimara" type="button">${t2('p_ist')}</button><button class="d2-ptab${W.paper==='taahud'?' on':''}" data-paper="taahud" type="button">${t2('p_taa')}</button>
      <span class="spacer"></span>
      <button class="ist-btn2 ist-exp2 d2-word" id="d2-word" type="button"><svg viewBox="0 0 24 24" class="ist-bic"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"/></svg><span>${t2('word')}</span></button></div>`;
    return `${tabs}<div class="ist-stage"><div class="ist-page${P.land?'':' portrait'}" id="d2-page"><div class="ist-body">
      ${photoBox}${P.logo?`<img class="ist-logo" src="${P.logo}" alt="">`:''}${txt(0)}
      <div class="ist-title">${T1(P.title)}</div>
      ${P.fields.length?`<div class="ist-fields">${P.fields.map(frow).join('')}</div>`:''}
      ${(P.texts||[]).slice(1).map((x,i)=>txt(i+1)).join('')}
      <table class="ist-table ${W.paper}"><colgroup>${cgroup}</colgroup><thead><tr>${heads}</tr></thead><tbody id="d2-tbody"></tbody></table>
      ${undertaking}</div>
      <div class="ist-foot"><div class="ist-sig">${W.paper==='taahud'?'':`<div class="ist-sig-lbl">${T1('ist_sig_mgr')}</div>`}
        <div class="ist-sig-sub">${T1('ist_sig_mgr_title')}</div><div class="ist-sig-sub ist-sig-name-static">${T1(W.paper==='taahud'?'taa_mgr_name':'ist_mgr_name')}</div><div class="ist-sig-sub">${T1('ist_mgr_role')}</div></div>${authSig}</div>
    </div></div>`;
  }
  const handVal=(r,k)=>(r.hand&&r.hand[k])||W.hand[k]||'';      // row override → folder value → empty
  function renderRows(){
    const tb=$('#d2-tbody'); if(!tb||!W) return;
    const P=PAPERS()[W.paper], COLS=P.cols, N=COLS.length;
    tb.innerHTML=W.rows.map((r,i)=>{
      const bad=r.row_state==='review'||r.row_state==='refused';
      const badge=r.row_state==='review'?` <span class="ist-review">⚑ ${E(T1('ik_review'))}</span>`:r.row_state==='refused'?` <span class="ist-review">✕</span>`:'';
      const cell=c=>{
        if(c.hand){ const own=!!(r.hand&&r.hand[c.k]), v=handVal(r,c.k), pre=(r._pre&&r._pre[c.k])||(!own&&!!W.hand[c.k]);
          return `<td class="ist-hcell"><input class="ist-hin${pre?' ist-pre':''}" data-ri="${i}" data-rk="${c.k}" value="${E(v)}" placeholder="${E(def1(c.k,W.paper))}"><button class="ist-handle" data-pick="${c.k}" data-ri="${i}" tabindex="-1" type="button"></button></td>`; }
        // EVERY passport column is editable here (a wrong letter gets the paper refused at the counter);
        // it edits the folder's roster only — the registry is never written from this table.
        if(c.k==='_ser') return `<td class="d2-ser"><span>${i+1}</span><button class="d2-x" data-rm="${i}" type="button" title="${E(t2('rm'))}">✕</button></td>`;
        if(c.k==='nationality') return `<td class="ist-ecell"><input class="ist-ein" data-ri="${i}" data-rk="nationality" value="${E(r.nationality?TV(r.nationality):'')}"></td>`;
        if(c.k==='passport_expiry') return `<td class="ist-ecell"><input class="ist-ein" data-ri="${i}" data-rk="passport_expiry" value="${E(fmtD(r.passport_expiry)||'')}"></td>`;
        return `<td class="ist-ecell"><input class="ist-ein" data-ri="${i}" data-rk="${c.k}" value="${E(r[c.k]||'')}">${c.k==='name'?badge:''}</td>`; };
      return `<tr class="${bad?'d2-bad':''}">${COLS.map(cell).join('')}</tr>`;
    }).join('')+`<tr class="ist-addrow"><td colspan="${N}" class="ist-drop slim" id="d2-drop">＋ ${E(T1('ist_add_more'))}</td></tr>`;
    tb.querySelectorAll('.ist-hin').forEach(inp=>inp.oninput=()=>{ const r=W.rows[+inp.dataset.ri]; if(!r) return; r.hand=r.hand||{}; r.hand[inp.dataset.rk]=inp.value; if(r._pre) delete r._pre[inp.dataset.rk]; inp.classList.remove('ist-pre'); W.dirty=true; });
    tb.querySelectorAll('.ist-ein').forEach(inp=>inp.oninput=()=>{ const r=W.rows[+inp.dataset.ri]; if(r){ r[inp.dataset.rk]=inp.value; W.dirty=true; } });
    tb.querySelectorAll('.ist-handle').forEach(b=>b.onclick=e=>{ e.stopPropagation(); cellMenu(b); });
    tb.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{ W.rows.splice(+b.dataset.rm,1); W.dirty=true; renderRows(); });
    const dz=$('#d2-drop'); if(dz) dz.onclick=pickRegistry;          // «＋ أضِف موظفين» = the registry picker, directly
  }
  function cellMenu(btn){
    document.querySelectorAll('.ist-menu').forEach(m=>m.remove());
    const k=btn.dataset.pick, ri=btn.dataset.ri, isRow=ri!==undefined&&ri!=='', list=defs(k,W.paper);
    const m=document.createElement('div'); m.className='ist-menu';
    m.innerHTML=list.map(d=>`<button data-v="${E(d.value)}" type="button"><span>${E(d.value)}</span><em>${d.seen?('×'+d.seen):''}</em></button>`).join('')
      +(isRow?`${list.length?'<div class="ist-mdiv"></div>':''}<button class="ist-mfill" data-fill="1" type="button"><span>⤓ ${E(t2('fill_down'))}</span><em></em></button>`:'');   // same menu as Door 1: the ranked defaults + ⤓ fill-down
    (btn.closest('.ist-hcell')||btn.parentNode).appendChild(m);
    m.querySelectorAll('button').forEach(b=>b.onclick=e=>{ e.stopPropagation(); m.remove();
      if(isRow){ const r=W.rows[+ri]; const cur=r?handVal(r,k):'';
        if(b.dataset.fill){ for(let j=+ri+1;j<W.rows.length;j++){ W.rows[j].hand=W.rows[j].hand||{}; W.rows[j].hand[k]=cur; } W.dirty=true; renderRows(); return; }
        if(r){ r.hand=r.hand||{}; r.hand[k]=b.dataset.v; if(r._pre) delete r._pre[k]; } W.dirty=true; renderRows(); }
      else { W.header[k]=b.dataset.v; delete W._pre[k]; document.querySelectorAll('#d2-wiz .ist-in[data-h="'+k+'"]').forEach(o=>{ o.value=b.dataset.v; o.classList.remove('ist-pre'); }); W.dirty=true; } });
    setTimeout(()=>document.addEventListener('click',function off(){ m.remove(); document.removeEventListener('click',off); },{once:true}),0);
  }
  function wireSheet(){
    renderRows();
    const ov=$('#d2-wiz');
    ov.querySelectorAll('.ist-pick').forEach(b=>b.onclick=e=>{ e.stopPropagation(); cellMenu(b); });
    ov.querySelectorAll('.ist-in[data-h]').forEach(inp=>inp.addEventListener('input',()=>{ const k=inp.dataset.h; delete W._pre[k]; inp.classList.remove('ist-pre'); W.header[k]=inp.value; W.dirty=true;
      ov.querySelectorAll('.ist-in[data-h="'+k+'"]').forEach(o=>{ if(o!==inp) o.value=inp.value; }); }));
    ov.querySelectorAll('.ist-tx[data-h]').forEach(el=>el.addEventListener('input',()=>{ W.header[el.dataset.h]=el.textContent; W.dirty=true; }));
    ov.querySelectorAll('[data-paper]').forEach(b=>b.onclick=()=>{ W.paper=b.dataset.paper; W.step=W.paper==='taahud'?4:3; wizPaint(); });
    const wd=$('#d2-word'); if(wd) wd.onclick=exportWord;
    // the photo box: click → pick an image from the device → data URL (the export carries it); ✕ → clear
    const ph=$('#d2-photo'); if(ph){
      ph.onclick=e=>{ if(e.target.closest('#d2-ph-x')){ W.photo=null; W.dirty=true; wizPaint(); return; }
        const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
        inp.onchange=()=>{ const f=inp.files&&inp.files[0]; if(!f) return; const fr=new FileReader();
          fr.onload=()=>{ W.photo=fr.result; W.dirty=true; wizPaint(); }; fr.readAsDataURL(f); };
        inp.click(); }; }
    ov.scrollTop=0;
  }

  /* ── Word: the existing render line, used as a SERVICE (same row shape as Door 1's export) ── */
  async function exportWord(){
    if(!W||!W.rows.length){ say(t2('need_rows')); return; }
    const H=W.header, ov=$('#d2-wiz'), wait=document.createElement('div'); wait.className='ist-wait';
    wait.innerHTML=`<div class="ist-wait-box"><div class="ist-spin"></div><div class="ist-wait-t">${E(t2('word_wait'))}</div></div>`; ov.appendChild(wait);
    try{
      const data={ paper:W.paper, format:'docx', company:H.company||'', company_nat:H.company_nat||'', addr:H.addr||'', purpose:H.purpose||'',
        stay:H.stay||'', visatype:H.visatype||'', authorized:H.authorized||'', project:H.project||'', to_line:H.to_line||'', intro:H.intro||'', body:H.body||'',
        photo:W.paper==='istimara'?(W.photo||''):'',
        rows:W.rows.map(r=>({ name:r.name||'', nationality:r.nationality?TV(r.nationality):'', passport_no:r.passport_no||'', passport_expiry:fmtD(r.passport_expiry)||'',
          addr_iraq:handVal(r,'addr_iraq'), border:handVal(r,'border'), profession:handVal(r,'profession'), res_country:handVal(r,'res_country'), visited:handVal(r,'visited') })) };
      const {data:ins,error:ie}=await sb.from('istimara_renders').insert({data}).select('id').single(); if(ie||!ins) throw new Error((ie&&ie.message)||'insert');
      if(has('istWake')) istWake(ins.id).catch(()=>{});
      const row=await istAwaitRender(ins.id);
      const {data:sig,error:se}=await sb.storage.from('documents').createSignedUrl(row._key,120); if(se||!sig) throw new Error('sign');
      const blob=await (await fetch(sig.signedUrl)).blob(); const url=URL.createObjectURL(blob), a=document.createElement('a');
      a.href=url; a.download=`${W.name||'folder'} — ${W.paper==='taahud'?'تعهد':'استمارة'}.docx`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000);
      say(t2('word_done'));
    }catch(e){ console.warn('door2 word',e); say(t2('word_fail')); }
    finally{ wait.remove(); }
  }

  /* ── Save = Door 2's own RPC, one transaction, serial = position ─────────────────────── */
  async function wizSave(status,quiet){
    if(!W) return;
    try{
      const rows=W.rows.map(r=>({person_id:r.person_id||null, passport_no:r.passport_no||'', name:r.name||'', nationality:r.nationality||'', passport_expiry:r.passport_expiry||'',
        hand:r.hand||{}, row_state:r.row_state||'ok', scan_job_id:r.scan_job_id||null, src_path:r.src_path||null, passport_jpg:r.passport_jpg||null, portrait_jpg:r.portrait_jpg||null, portrait_tier:r.portrait_tier||null}));
      const {data,error}=await sb.rpc('dossier_save',{p_id:W.id, p_name:W.name, p_status:status, p_header:W.header, p_hand:W.hand, p_rows:rows});
      if(error) throw error;
      W.id=data; W.status=status; W.dirty=false;
      if(!quiet){ say(status==='saved'?t2('saved'):t2('draft_saved')); if(status==='saved') wizClose(); }
    }catch(e){ console.warn('door2 save',e); say((e&&e.message)||String(e)); }
  }

  /* ── boot ─────────────────────────────────────────────────────────────────────────────── */
  function build(){
    const nav=$('#law-doors'), room=$('#door2'); if(!nav||!room) return false;
    nav.setAttribute('role','tablist');
    nav.innerHTML=`<button class="door on" id="door-1" role="tab" type="button"></button><button class="door" id="door-2" role="tab" type="button"></button>`;
    room.innerHTML=`<div class="d2-head">
        <label class="d2-sbox"><svg class="ic"><use href="#i-search"/></svg><input id="d2-q" autocomplete="off" spellcheck="false"></label>
        <button class="d2-chip" id="d2-arch" type="button"><span id="d2-arch-t"></span></button>
        <button class="d2-add" id="d2-add" type="button"></button></div>
      <div id="d2-list"></div>`;
    $('#door-1').onclick=()=>select('door1'); $('#door-2').onclick=()=>select('door2');
    $('#d2-add').onclick=()=>wizOpen(null);
    $('#d2-q').oninput=e=>{ L.q=e.target.value; paintList(); };
    $('#d2-arch').onclick=()=>{ L.arch=!L.arch; $('#d2-arch').classList.toggle('on',L.arch); paintList(); };
    return true;
  }
  function init(){
    const blaw=$('#blaw'); if(!blaw||!build()) return;
    let was=blaw.classList.contains('on');   // EDGE-triggered: the app re-sets this class on repaints without changing it
    new MutationObserver(()=>{ const now=blaw.classList.contains('on'); if(now!==was){ was=now; onLaw(now); } }).observe(blaw,{attributes:true,attributeFilter:['class']});
    new MutationObserver(paint).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    onLaw(blaw.classList.contains('on'));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
