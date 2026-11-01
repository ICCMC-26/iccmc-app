/* ══════════════════════════════════════════════════════════════════════════════════════════
   DOOR 2 — «المجلدات القانونية» · own script (app.js is NOT touched — isolation principle).

   The legal section is a HALLWAY with two doors:
     Door 1 = today's legal section (استمارة · تعهد · منح) — auto-selected, byte-for-byte the same.
     Door 2 = the legal folders: one roster → استمارة + تعهد (Word) + «الأسماء» pictures, visa-ready.

   Hooks WITHOUT a line in app.js: setLaw() already toggles #blaw.on, applyLang() already writes
   <html lang>; both are observed here. Everything else Door 2 needs from the app is used as a
   LIBRARY (pure helpers: t · esc · tv · toast · sha256 · istFmtDate · istDef1 · istResCountry ·
   istHasVisa · istRepPhoto · openPicker · ikBuildReview · istWake · istAwaitRender) or as a SERVICE:
     · the INTAKE LINE (ledger → bucket → worker → ikCommitSerial) reads every device file exactly as
       the drop box does — same hash dedup, same quota, same gate, same registry commit;
     · the RENDER LINE (istimara_renders → the worker fills the real Word template).
   Door 2's data lives in its OWN tables (legal_dossiers · legal_dossier_members) through its OWN
   RPCs (dossier_open/save/release/archive) and its OWN bucket (dossiers = a second copy of each file).
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
        src_pc_s:'ملفات جوازات PDF أو صور — أو مجلد كامل', pc_folder:'اختر مجلدًا كاملًا', pc_drop:'أو اسحب الملفات أو المجلدات إلى هنا',
        roster_h:n=>`القائمة — ${n} موظف`, roster_empty:'لم يُضَف أحد بعد', need_rows:'أضِف موظفًا واحدًا على الأقل',
        rm:'إزالة', back:'‹ السابق', next:'التالي ›', save:'حفظ المجلد', saved:'حُفظ المجلد ✓', draft_saved:'حُفظت المسودة',
        word:'تصدير Word', word_wait:'يُجهَّز ملف Word…', word_fail:'تعذّر التصدير — حاول مجددًا', word_done:'نُزِّل الملف ✓',
        gate:n=>`${n} صف يحتاج مراجعة أو إزالة قبل المتابعة`, gate_reading:n=>`${n} ملف ما زال قيد القراءة — انتظر اكتماله`,
        dup:'هذا الجواز موجود في المجلد', reading:'قيد القراءة', review:'تحتاج مراجعة', refused:'مرفوض', pre:'موجودة مسبقًا',
        fill_down:'نسخ إلى الصفوف تحتها', close_q:'تغييرات غير محفوظة — حفظ كمسودة؟',
        closed:'إغلاق', p_ist:'الاستمارة', p_taa:'التعهد',
        pick_add:n=>`إضافة ${n} إلى المجلد`, rv_of:(k,n)=>`⚑ ${k} / ${n}`, rv_prev:'‹ السابق', rv_next:'التالي ›', rv_done:'اكتملت مراجعة المجلد ✓',
        none_ok:n=>`${n} ملفًا لا يصلح (صورة أو PDF فقط)`},
    en:{door1:'Procedures', door1s:'Istimara · Taahud · Grant', door2:'Legal folders', door2s:'Visa-ready folders',
        q:'Search by folder name…', add:'＋ New folder', empty_h:'No folders yet',
        empty:'Each folder = Istimara + Taahud as Word, and a «Names» folder with the passport page and portrait of every employee.',
        none:'No folder by that name', hall:'Legal section doors', arch:'Archive', arch_q:n=>`Archive folder “${n}”? It leaves the list; nothing is deleted.`,
        show_arch:'Archived', st_draft:'Draft', st_saved:'Saved', st_arch:'Archived', members:n=>`${n} employees`, open:'Open',
        locked:(by)=>`Being edited by ${by||'another user'}`,
        s1:'Folder name', s2:'Employees', s3:'Istimara', s4:'Taahud', s5:'Save',
        name_ph:'e.g. Shanghai batch — November', name_need:'Type the folder name first',
        src_q:'Where do the employees come from?', src_reg:'From the registry', src_reg_s:'Search and pick registered employees', src_pc:'From this device',
        src_pc_s:'Passport PDFs or images — or a whole folder', pc_folder:'Pick a whole folder', pc_drop:'or drop files or folders here',
        roster_h:n=>`Roster — ${n} employees`, roster_empty:'Nobody added yet', need_rows:'Add at least one employee',
        rm:'Remove', back:'‹ Back', next:'Next ›', save:'Save folder', saved:'Folder saved ✓', draft_saved:'Draft saved',
        word:'Export Word', word_wait:'Preparing the Word file…', word_fail:'Export failed — try again', word_done:'Downloaded ✓',
        gate:n=>`${n} row(s) need review or removal before continuing`, gate_reading:n=>`${n} file(s) still being read — wait for them`,
        dup:'This passport is already in the folder', reading:'Reading', review:'Needs review', refused:'Refused', pre:'Already in the system',
        fill_down:'Copy to the rows below', close_q:'Unsaved changes — save as draft?',
        closed:'Close', p_ist:'Istimara', p_taa:'Taahud',
        pick_add:n=>`Add ${n} to the folder`, rv_of:(k,n)=>`⚑ ${k} / ${n}`, rv_prev:'‹ Previous', rv_next:'Next ›', rv_done:'Folder review complete ✓',
        none_ok:n=>`${n} file(s) not usable (image or PDF only)`}
  };
  const $=s=>document.querySelector(s);
  const lang=()=>document.documentElement.lang==='en'?'en':'ar';
  const t2=(k,...a)=>{ const v=(T[lang()]||T.ar)[k]; return typeof v==='function'?v(...a):(v||''); };
  // the app's helpers are top-level let/const/function in a classic script: visible by NAME in this global
  // scope but NOT as window properties — so probe by name (indirect eval sees global lexical bindings)
  const has=n=>{ try{ return (0,eval)('typeof '+n)!=='undefined'; }catch(_){ return false; } };
  const E=s=>has('esc')?esc(s):String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const say=m=>{ if(has('toast')) toast(m); else console.info(m); };
  const T1=(k,...a)=>has('t')?t(k,...a):k;                 // the app's own labels (ist_c_name …) — same words as Door 1
  const fmtD=s=>has('istFmtDate')?istFmtDate(s):String(s||'');
  const TV=v=>has('tv')?tv(v):v;

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
      </div>`; }).join('');
    // no archive / remove control here on purpose: the app's UI never deletes or hides a record — a folder
    // leaves the list only by an admin at the database (dossier_archive stays an admin-side RPC)
    box.querySelectorAll('[data-open]').forEach(el=>el.onclick=()=>wizOpen(+el.dataset.open));
  }

  /* ── the wizard: ① اسم المجلد → ② الموظفون → ③ الاستمارة → ④ التعهد → ⑤ حفظ ─────────── */
  let W=null;   // {id,name,status,header,hand,rows:[{person_id,passport_no,name,nationality,passport_expiry,hand,row_state,scan_hash,scan_job_id,src_path, _status,_job,_file…}],step,paper,photo,dirty}
  const PAPERS=()=>has('IST_PAPERS')?IST_PAPERS:null;
  const def1=(k,p)=>has('istDef1')?(istDef1(k,p)||''):'';
  const defs=(k,p)=>has('istDefs')?(istDefs(k,p)||[]):[];
  function freshHeader(){ const H={company:'',company_nat:'',addr:'',purpose:'',stay:'',visatype:'',authorized:'',project:'',to_line:'',intro:'',body:''}, pre={};
    Object.keys(H).forEach(k=>{ const v=def1(k,'istimara'); if(v){ H[k]=v; pre[k]=1; } }); return {H,pre}; }
  function rowFromMember(m){
    const st=m.row_state||'ok';
    return {person_id:m.person_id, passport_no:m.passport_no||'', name:m.name||'', nationality:m.nationality||'', passport_expiry:m.passport_expiry||'',
            hand:m.hand||{}, row_state:st, scan_hash:m.scan_hash||null, scan_job_id:m.scan_job_id||null, src_path:m.src_path||null,
            _pre:{}, _status: st==='reading'?'processing': st==='refused'?'refused': st==='review'?'review':'landed', _hash:m.scan_hash||null, _file:null};
  }
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
        rows:members.map(rowFromMember), step:d?3:1, paper:'istimara', photo:null, dirty:false };
    if(has('istRepPhoto')){ try{ W.photo=await istRepPhoto()||null; }catch(_){} }
    let ov=$('#d2-wiz'); if(!ov){ ov=document.createElement('div'); ov.id='d2-wiz'; document.body.appendChild(ov); }
    ov.classList.add('on'); document.body.style.overflow='hidden';
    document.addEventListener('keydown',wizKey);
    wizPaint();
    if(W.rows.some(r=>r._hash && (r.row_state==='reading'||r.row_state==='review'))) ensureWatch();   // heal rows left mid-read
  }
  function wizKey(e){ if(e.key==='Escape'&&!document.querySelector('#istpick.on')&&!document.querySelector('#ikreview.on')){ e.stopPropagation(); wizClose(); } }
  // leaving mid-work asks, exactly as Door 1's sheet does: Save · Discard · Cancel (backdrop = cancel)
  function wizClose(){
    if(!W) return;
    if(has('istPkClose')) istPkClose();   // a picker still open must close by its own path (drops its key handler)
    if(!(W.dirty && W.rows.length && W.name.trim())){ wizCloseNow(); return; }
    const ov=$('#d2-wiz'); if(!ov){ wizCloseNow(); return; }
    const dlg=document.createElement('div'); dlg.className='ist-dlg-wrap';
    dlg.innerHTML=`<div class="ist-dlg"><div class="ist-dlg-t">${E(T1('ist_close_q'))}</div>
      <div class="ist-dlg-btns"><button class="ist-btn primary" data-a="save" type="button">${E(T1('ist_save'))}</button>
        <button class="ist-btn" data-a="discard" type="button">${E(T1('ist_discard'))}</button>
        <button class="ist-btn ghost" data-a="cancel" type="button">${E(T1('ist_cancel'))}</button></div></div>`;
    ov.appendChild(dlg);
    const done=()=>dlg.remove();
    dlg.querySelector('[data-a="save"]').onclick=async()=>{ await wizSave(W.status==='saved'?'saved':'draft',true); if(W&&W.dirty) return; done(); say(T1('ist_saved')); wizCloseNow(); };
    dlg.querySelector('[data-a="discard"]').onclick=()=>{ done(); wizCloseNow(); };
    dlg.querySelector('[data-a="cancel"]').onclick=done;
    dlg.onclick=e=>{ if(e.target===dlg) done(); };
  }
  async function wizCloseNow(){
    if(!W) return;
    if(W.id){ try{ await sb.rpc('dossier_release',{p_id:W.id}); }catch(_){} }
    if(_watch){ clearInterval(_watch); _watch=null; }
    W=null; const ov=$('#d2-wiz'); if(ov){ ov.classList.remove('on'); ov.innerHTML=''; } document.body.style.overflow='';
    document.removeEventListener('keydown',wizKey);
    loadList();
  }
  const badRows=()=>W.rows.filter(r=>r.row_state==='review'||r.row_state==='refused');
  const readingRows=()=>W.rows.filter(r=>r.row_state==='reading');
  function wizGo(step){
    if(!W) return;
    if(step>1 && !W.name.trim()){ say(t2('name_need')); W.step=1; wizPaint(); return; }
    if(step>2 && !W.rows.length){ say(t2('need_rows')); W.step=2; wizPaint(); return; }
    if(step>=5){
      const nr=readingRows().length; if(nr){ say(t2('gate_reading',nr)); return; }
      const n=badRows().length; if(n){ say(t2('gate',n)); W.step=W.paper==='taahud'?4:3; wizPaint(); wizScrollBad(); return; }
      wizSave('saved'); return; }
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
  const stateChip=r=>r.row_state==='reading'?`<span class="d2-chipst reading">${E(has('istRowStatusTxt')?(istRowStatusTxt(r)||t2('reading')):t2('reading'))}</span>`
    : r.row_state==='review'?`<span class="d2-chipst review">⚑ ${t2('review')}</span>`
    : r.row_state==='refused'?`<span class="d2-chipst refused" title="${E(r._err||'')}">✕ ${t2('refused')}${r._err?' · '+E(r._err):''}</span>`
    : r._preexisting?`<span class="d2-chipst ok">✓ ${t2('pre')}</span>`:'';
  function wizStep2(){
    const roster=W.rows.length? `<div class="d2-roster" id="d2-roster">${W.rows.map((r,i)=>`<div class="d2-rrow${r.row_state!=='ok'?' '+r.row_state:''}"><b>${i+1}</b><span class="d2-rnm">${E(r.name||(r._file&&r._file.name)||'…')}</span><small>${E(r.passport_no||'')}${r.passport_no?' · ':''}${E(TV(r.nationality||''))}</small>${stateChip(r)}<button class="ist-rowx sm" data-rm="${i}" title="${E(t2('rm'))}">✕</button></div>`).join('')}</div>`
      : `<div class="d2-empty slim">${t2('roster_empty')}</div>`;
    return `<div class="d2-q" id="d2-step2"><div class="d2-lbl">${t2('src_q')}</div>
      <div class="ist-src-opts d2-src">
        <button class="ist-src-opt" id="d2-src-pc" type="button"><span class="ist-src-ic">⬆</span><b>${t2('src_pc')}</b><small>${t2('src_pc_s')}</small></button>
        <button class="ist-src-opt" id="d2-src-reg" type="button"><span class="ist-src-ic">⌕</span><b>${t2('src_reg')}</b><small>${t2('src_reg_s')}</small></button>
      </div>
      <div class="d2-pcline"><button class="d2-link" id="d2-src-folder" type="button">📁 ${t2('pc_folder')}</button><span class="d2-muted">· ${t2('pc_drop')}</span></div>
      <div class="d2-lbl">${t2('roster_h',W.rows.length)}</div>${roster}</div>`;
  }
  function wireStep2(){
    $('#d2-src-reg').onclick=pickRegistry;
    $('#d2-src-pc').onclick=()=>pickDevice(false);
    $('#d2-src-folder').onclick=()=>pickDevice(true);
    const z=$('#d2-step2');
    z.ondragover=e=>{ e.preventDefault(); z.classList.add('over'); }; z.ondragleave=()=>z.classList.remove('over');
    z.ondrop=async e=>{ e.preventDefault(); z.classList.remove('over'); const fs=await filesFromDrop(e.dataTransfer); if(fs.length) addFromDevice(fs); };
    document.querySelectorAll('#d2-wiz [data-rm]').forEach(b=>b.onclick=()=>removeRow(+b.dataset.rm));
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
                 passport_expiry:p.passport_expiry||'', hand:{}, row_state:'ok', _status:'landed', _pre:{}};
      W.rows.push(row); n++; facts(row, p, id);
    }
    if(n) W.dirty=true;            // the caller repaints once the picker is gone
  }
  // the two FACT fills, from the same helpers Door 1 uses: residence ← the passport's country · visited ← any visa on file
  function facts(row, f, pid){
    const rc=has('istResCountry')?istResCountry(f||{}):''; if(rc && !row.hand.res_country){ row.hand.res_country=rc; row._pre.res_country=1; }
    const ask=pid ? Promise.resolve(pid) : (has('istPidByPassport')?istPidByPassport(row.passport_no):Promise.resolve(null));
    if(!has('istHasVisa')) return;
    ask.then(p=>p?istHasVisa(p):null).then(v=>{ if(v===null||v===undefined||!W) return;
      if(!row.hand.visited||row._pre.visited){ row.hand.visited=v?'نعم':'كلا'; row._pre.visited=1; if(W.step>=3) renderRows(); else wizPaint(); } }).catch(()=>{});
  }

  /* ── FROM THE DEVICE: files or whole folders → the INTAKE LINE, as a service ─────────────────
     Exactly the drop box's path: content hash → ledger row (quota answers here; an already-settled
     file answers «موجودة مسبقًا» without a second read) → the intake bucket → the worker reads it →
     the row fills → the intake's own commit registers the person. A scan that needs a human PARKS
     the row (⚑) until it is reviewed in the same review pane the inbox uses. Door 2 adds ONE thing:
     a second copy of the file into its own bucket, for the pictures (slice 4). */
  const isDoc=f=>((has('IK_OK')?IK_OK:/^(image\/|application\/pdf)/).test(f.type)||/\.pdf$/i.test(f.name));
  const maxB=()=>has('IK_MAX')?IK_MAX:200*1024*1024;
  function pickDevice(folder){
    const inp=document.createElement('input'); inp.type='file'; inp.multiple=true;
    if(folder) inp.webkitdirectory=true; else inp.accept='image/*,application/pdf';
    inp.onchange=()=>{ const fs=Array.from(inp.files||[]); if(fs.length) addFromDevice(fs); }; inp.click();
  }
  async function filesFromDrop(dt){                      // folders dropped → walked recursively, flattened
    const out=[]; const items=[...((dt&&dt.items)||[])];
    const entries=items.map(i=>i.webkitGetAsEntry&&i.webkitGetAsEntry()).filter(Boolean);
    if(!entries.length) return [...((dt&&dt.files)||[])];
    const walk=async en=>{
      if(en.isFile) await new Promise(r=>en.file(f=>{ out.push(f); r(); },()=>r()));
      else if(en.isDirectory){ const rd=en.createReader(); let batch;
        do{ batch=await new Promise(r=>rd.readEntries(r,()=>r([]))); for(const e of batch) await walk(e); }while(batch.length); } };
    for(const en of entries) await walk(en);
    return out;
  }
  async function addFromDevice(files){
    if(!W) return;
    files=files.filter(f=>f && !/^\./.test(f.name) && !/^(thumbs\.db|desktop\.ini)$/i.test(f.name));
    if(!files.length) return;
    if(!W.id){ await wizSave('draft',true); if(!W.id) return; }      // the folder needs its id for its own copies
    const usable=files.filter(f=>isDoc(f)&&f.size<=maxB());
    let take=usable, block=[], q=null;
    if(has('ikQuotaSplit')){ try{ ({take,block,q}=await ikQuotaSplit(usable)); }catch(_){} }
    const blocked=new Set(block);
    if(q&&block.length) say(take.length?T1('ik_quota_left',take.length,q.limit):T1('ik_quota',q.limit));
    const bad=files.length-usable.length; if(bad) say(t2('none_ok',bad));
    const queue=[];
    for(const f of files){
      const row={person_id:null,name:'',nationality:'',passport_no:'',passport_expiry:'',hand:{},row_state:'reading',
                 _status:'uploading',_pct:0,_stage:'',_err:'',_file:f,_pre:{}};
      W.rows.push(row);
      if(!isDoc(f)||f.size>maxB()){ row.row_state='refused'; row._status='refused'; row._err=f.size>maxB()?T1('ik_big'):T1('ik_bad'); continue; }
      if(blocked.has(f)){ row.row_state='refused'; row._status='refused'; row._err=T1('ik_quota',q&&q.limit); continue; }
      queue.push([f,row]);
    }
    W.dirty=true; if(W.step>=3) renderRows(); else wizPaint();
    drain(queue);
  }
  let _up=0;
  async function drain(queue){
    while(queue.length){
      while(_up>=4) await new Promise(r=>setTimeout(r,250));
      const [f,row]=queue.shift(); _up++;
      ingest(f,row).catch(e=>{ row.row_state='refused'; row._status='refused'; row._err=(e&&e.message)||T1('ist_read_fail'); repaintRow(); })
        .finally(()=>{ _up--; });
    }
  }
  function repaintRow(){ if(!W) return; if(W.step>=3) renderRows(); else { const r=$('#d2-roster'); if(r||W.step===2) wizPaint(); } }
  async function ingest(file,row){
    const hash=await sha256(file); if(!hash) throw new Error('hash'); row._hash=hash; row.scan_hash=hash;
    const {data:{session}}=await sb.auth.getSession(); if(!session) throw new Error(T1('ik_auth'));
    const safe=file.name.replace(/[^\w.\-]+/g,'_');
    const path=`${Date.now().toString(36)}-d2-${safe}`;         // a plain passport name (no legal-form marker)
    const lj={hash, file, batch:null};
    if(!await ikLedgerRow(lj,path)) throw new Error(lj._quota ? lj._ledgerErr : (T1('ik_ledger')||lj._ledgerErr||'ledger'));
    copyToFolder(file,hash,row).catch(()=>{});                 // Door 2's own copy — never blocks the line
    if(lj._pre){ row._preexisting=true; row._status='processing'; row._stage=''; }   // settled already → its job is read back, no upload
    else{
      await new Promise((res,rej)=>{ const xhr=new XMLHttpRequest();
        xhr.open('POST',`${SUPA_URL}/storage/v1/object/${IK_BUCKET}/${encodeURIComponent(path)}`);
        xhr.setRequestHeader('apikey',SUPA_KEY); xhr.setRequestHeader('Authorization',`Bearer ${session.access_token}`);
        xhr.setRequestHeader('x-upsert','true'); if(file.type) xhr.setRequestHeader('Content-Type',file.type);
        xhr.upload.onprogress=e=>{ if(e.lengthComputable){ row._pct=Math.round(e.loaded/e.total*100); repaintRow(); } };
        xhr.onload=()=>(xhr.status>=200&&xhr.status<300)?res():rej(new Error('HTTP '+xhr.status));
        xhr.onerror=()=>rej(new Error('network')); xhr.send(file); });
      row._status='processing'; row._stage='';
    }
    repaintRow(); ensureWatch();
  }
  async function copyToFolder(file,hash,row){
    if(!W||!W.id) return;
    const ext=(file.name.match(/\.(pdf|jpe?g|png|webp|tiff?)$/i)||[,'bin'])[1].toLowerCase();
    const key=`${W.id}/src/${hash}.${ext}`;
    const {error}=await sb.storage.from('dossiers').upload(key, file, {upsert:true, contentType:file.type||undefined});
    if(!error){ row.src_path=key; W.dirty=true; }
  }
  // ONE reconciler for the folder (the drop box's design): one query for every pending hash, every 2.5 s
  let _watch=null;
  const pending=()=>W?W.rows.filter(r=>r._hash && (r.row_state==='reading'||(r.row_state==='review'&&!r._job))):[];
  function ensureWatch(){
    if(_watch) return; const t0=Date.now();
    _watch=setInterval(async()=>{
      if(!W||!pending().length){ clearInterval(_watch); _watch=null; return; }
      if(document.hidden) return;
      const waited=Date.now()-t0; if(waited>180000 && (waited/2500)%3>=1) return;
      try{ await reconcile(); }catch(_){}
    },2500);
    reconcile().catch(()=>{});
  }
  async function reconcile(){
    const pend=pending(); if(!pend.length) return;
    const hashes=[...new Set(pend.map(r=>r._hash))]; let jobs=[];
    try{ const {data}=await sb.from('scan_jobs').select('job_id,status,fields,doc_type,image_path,field_conf,flagged,error_msg,image_hash')
          .in('image_hash',hashes).order('created_at',{ascending:false}); jobs=data||[]; }catch(_){ return; }
    const byHash={}; for(const j of jobs) if(!byHash[j.image_hash]) byHash[j.image_hash]=j;
    let dirty=false;
    for(const row of pend){ const j=byHash[row._hash]; if(!j) continue; if(await applyJob(row,j)) dirty=true; }
    if(dirty) repaintRow();
  }
  // what ONE row's job means — the same rules as Door 1's sheet (istApply), written against Door 2's row
  async function applyJob(row,j){
    if(row._stage!==j.status) row._stage=j.status;
    row.scan_job_id=j.job_id;
    if(j.status==='failed'){ row.row_state='refused'; row._status='refused'; row._err=j.error_msg||T1('ist_read_fail'); return true; }
    if(j.status==='legal-review' || String(j.doc_type||'').startsWith('legal')){      // passports only — a legal paper is refused here, clearly
      row.row_state='refused'; row._status='refused'; row._err=T1('ist_not_passport'); row._job=j; return true; }
    const f=j.fields||{};
    if(f.passport_no||f.name_latin){
      Object.assign(row,{name:f.name_latin||'', nationality:f.nationality||'', passport_no:f.passport_no||'', passport_expiry:f.passport_expiry||''});
      // the same passport twice in one folder → this row is refused quietly, the first keeps the place
      const twin=W.rows.find(x=>x!==row && x.row_state!=='refused' && x.passport_no && x.passport_no===row.passport_no);
      if(twin){ row.row_state='refused'; row._status='refused'; row._err=t2('dup'); row._job=j; return true; }
      if(j.status==='pending-review'||j.status==='needs-linking'){ row.row_state='review'; row._status='review'; row._job=j; return true; }
      if(row._committing) return true;
      row._committing=true; row._status='committing'; repaintRow();
      try{ const res=await ikCommitSerial(j,{...f});                  // the intake's own commit — the person enters the registry
           if(res&&res.defer){ row.row_state='review'; row._status='review'; row._job=j; } else landed(row,f,res&&res.pid); }
      catch(_){ landed(row,f,null); }
      row._committing=false; return true;
    }
    return true;
  }
  function landed(row,f,pid){
    row.row_state='ok'; row._status='landed'; row._job=null; if(pid) row.person_id=pid; W.dirty=true;
    facts(row, f, row.person_id||null);
  }
  async function removeRow(i){
    const row=W.rows[i]; if(!row) return;
    // an UNCOMMITTED scan leaves with its row (no leak into the review queue) — the drop box's own rule
    if(row._hash && row._status!=='landed' && row.row_state!=='ok'){
      try{ await sb.from('scan_jobs').delete().eq('image_hash',row._hash).not('status','in','(done,committed)'); }catch(_){}
    }
    W.rows.splice(i,1); W.dirty=true; repaintRow();
  }

  /* ── REVIEW: the inbox's own pane, opened on this folder's row; ‹ › and auto-advance are Door 2's ── */
  let _rvIdx=-1, _rvObs=null;
  const reviewIdx=()=>W.rows.map((r,i)=>r.row_state==='review'&&r._job?i:-1).filter(i=>i>=0);
  function openReview(i){
    const row=W&&W.rows[i]; if(!row||!row._job){ say(T1('ist_read_fail')); return; }
    if(!has('ikBuildReview')) return;
    _rvIdx=i;
    _rvJob={ id:'d2-'+i, job:row._job, file:row._file||{name:(row.name||row.passport_no||'passport')}, _scanUrl:null, _istRow:row }; _rvShowAll=false;
    ikBuildReview(); $('#ikreview').classList.add('on'); document.body.style.overflow='hidden';
    paintRvBar(); watchReview();
  }
  function paintRvBar(){
    let bar=$('#d2-rvbar'); if(!bar){ bar=document.createElement('div'); bar.id='d2-rvbar'; document.body.appendChild(bar); }
    const list=reviewIdx(), k=list.indexOf(_rvIdx);
    bar.innerHTML=`<button type="button" id="d2-rv-prev" ${k<=0?'disabled':''}>${t2('rv_prev')}</button><b>${t2('rv_of',k+1,list.length)}</b><button type="button" id="d2-rv-next" ${k<0||k>=list.length-1?'disabled':''}>${t2('rv_next')}</button>`;
    bar.classList.add('on');
    $('#d2-rv-prev').onclick=()=>{ const l=reviewIdx(), k2=l.indexOf(_rvIdx); if(k2>0) jumpReview(l[k2-1]); };
    $('#d2-rv-next').onclick=()=>{ const l=reviewIdx(), k2=l.indexOf(_rvIdx); if(k2<l.length-1) jumpReview(l[k2+1]); };
  }
  function jumpReview(i){ _rvJump=true; if(has('closeIkReview')) closeIkReview(); _rvJump=false; openReview(i); }
  let _rvJump=false;
  function watchReview(){
    if(_rvObs) return; const pane=$('#ikreview'); if(!pane) return;
    _rvObs=new MutationObserver(()=>{ if(pane.classList.contains('on')) return; if(_rvJump) return; onReviewClosed(); });
    _rvObs.observe(pane,{attributes:true,attributeFilter:['class']});
  }
  function onReviewClosed(){
    const bar=$('#d2-rvbar'); if(bar) bar.classList.remove('on');
    if(!W){ return; }
    document.body.style.overflow='hidden';                        // the wizard is still open underneath
    const row=W.rows[_rvIdx];
    if(row && row._status==='landed' && row.row_state==='review'){   // ikDoAdd wrote the corrected data back → the row lands
      landed(row, {nationality:row.nationality, issuing_country:''}, null);
      if(has('istPidByPassport')) istPidByPassport(row.passport_no).then(p=>{ if(p&&W){ row.person_id=p; } }).catch(()=>{});
      repaintRow();
      const next=reviewIdx()[0];
      if(next!==undefined) setTimeout(()=>openReview(next),150);    // another case waits → it opens by itself
      else say(t2('rv_done'));
    } else repaintRow();
    _rvIdx=-1;
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
    const tabs=`<div class="d2-papers"><span class="spacer"></span>
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
      const x=`<button class="d2-x" data-rm="${i}" type="button" title="${E(t2('rm'))}">✕</button>`;
      // a row still travelling the line: the same stage text the drop box shows
      if(r._status==='uploading'||r._status==='processing'||r._status==='committing')
        return `<tr class="ist-row-busy d2-bad"><td class="d2-ser"><span>${i+1}</span>${x}</td><td colspan="${N-1}">${E(has('istRowStatusTxt')?istRowStatusTxt(r):'…')} <small class="d2-fn">${E((r._file&&r._file.name)||'')}</small></td></tr>`;
      if(r.row_state==='refused')
        return `<tr class="ist-row-err d2-bad"><td class="d2-ser"><span>${i+1}</span>${x}</td><td colspan="${N-1}">✕ ${E(r._err||t2('refused'))} <small class="d2-fn">${E((r._file&&r._file.name)||r.name||'')}</small></td></tr>`;
      const bad=r.row_state==='review';
      const badge=bad?` <button class="ist-review" data-rv="${i}" type="button" title="${E(T1('rv_ask'))}">⚑ ${E(T1('ik_review'))}</button>`:'';
      const cell=c=>{
        if(c.hand){ const own=!!(r.hand&&r.hand[c.k]), v=handVal(r,c.k), pre=(r._pre&&r._pre[c.k])||(!own&&!!W.hand[c.k]);
          return `<td class="ist-hcell"><input class="ist-hin${pre?' ist-pre':''}" data-ri="${i}" data-rk="${c.k}" value="${E(v)}" placeholder="${E(def1(c.k,W.paper))}"><button class="ist-handle" data-pick="${c.k}" data-ri="${i}" tabindex="-1" type="button"></button></td>`; }
        // EVERY passport column is editable here (a wrong letter gets the paper refused at the counter);
        // it edits the folder's roster only — the registry is never written from this table.
        if(c.k==='_ser') return `<td class="d2-ser"><span>${i+1}</span>${x}</td>`;
        if(c.k==='nationality') return `<td class="ist-ecell"><input class="ist-ein" data-ri="${i}" data-rk="nationality" value="${E(r.nationality?TV(r.nationality):'')}"></td>`;
        if(c.k==='passport_expiry') return `<td class="ist-ecell"><input class="ist-ein" data-ri="${i}" data-rk="passport_expiry" value="${E(fmtD(r.passport_expiry)||'')}"></td>`;
        return `<td class="ist-ecell"><input class="ist-ein" data-ri="${i}" data-rk="${c.k}" value="${E(r[c.k]||'')}">${c.k==='name'?badge:''}</td>`; };
      return `<tr class="${bad?'d2-bad d2-review':''}">${COLS.map(cell).join('')}</tr>`;
    }).join('')+`<tr class="ist-addrow"><td colspan="${N}" class="ist-drop slim" id="d2-drop">＋ ${E(T1('ist_add_more'))}</td></tr>`;
    tb.querySelectorAll('.ist-hin').forEach(inp=>inp.oninput=()=>{ const r=W.rows[+inp.dataset.ri]; if(!r) return; r.hand=r.hand||{}; r.hand[inp.dataset.rk]=inp.value; if(r._pre) delete r._pre[inp.dataset.rk]; inp.classList.remove('ist-pre'); W.dirty=true; });
    tb.querySelectorAll('.ist-ein').forEach(inp=>inp.oninput=()=>{ const r=W.rows[+inp.dataset.ri]; if(r){ r[inp.dataset.rk]=inp.value; W.dirty=true; } });
    tb.querySelectorAll('.ist-handle').forEach(b=>b.onclick=e=>{ e.stopPropagation(); cellMenu(b); });
    tb.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>removeRow(+b.dataset.rm));
    tb.querySelectorAll('[data-rv]').forEach(b=>b.onclick=()=>openReview(+b.dataset.rv));
    // «＋ أضِف موظفين»: the same question as Door 1 — from the device or from the registry; a drop = the device
    const dz=$('#d2-drop'); if(dz){
      dz.onclick=chooseSource;
      dz.ondragover=e=>{ e.preventDefault(); dz.classList.add('over'); }; dz.ondragleave=()=>dz.classList.remove('over');
      dz.ondrop=async e=>{ e.preventDefault(); dz.classList.remove('over'); const fs=await filesFromDrop(e.dataTransfer); if(fs.length) addFromDevice(fs); };
    }
  }
  // Door 2's copy of Door 1's source question (same classes → same look), hosted in the wizard
  function chooseSource(){
    let o=$('#d2-src'); if(!o){ o=document.createElement('div'); o.id='d2-src'; $('#d2-wiz').appendChild(o); }
    o.innerHTML=`<div class="ist-src-box" role="dialog" aria-label="${E(t2('src_q'))}">
      <div class="ist-src-q">${E(t2('src_q'))}</div>
      <div class="ist-src-opts">
        <button class="ist-src-opt" data-src="pc" type="button"><span class="ist-src-ic">⬆</span><b>${E(t2('src_pc'))}</b><small>${E(t2('src_pc_s'))}</small></button>
        <button class="ist-src-opt" data-src="reg" type="button"><span class="ist-src-ic">⌕</span><b>${E(t2('src_reg'))}</b><small>${E(t2('src_reg_s'))}</small></button>
      </div></div>`;
    const close=()=>{ o.classList.remove('on'); document.removeEventListener('keydown',onKey); };
    const onKey=e=>{ if(e.key==='Escape'){ e.stopPropagation(); close(); } };
    o.onclick=e=>{ const b=e.target.closest('[data-src]');
      if(b){ close(); if(b.dataset.src==='pc') pickDevice(false); else pickRegistry(); return; }
      if(!e.target.closest('.ist-src-box')) close(); };
    document.addEventListener('keydown',onKey);
    o.classList.add('on'); const first=o.querySelector('[data-src="pc"]'); if(first) first.focus();
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
      const rows=W.rows.filter(r=>r.row_state==='ok'||r.row_state==='review');
      const data={ paper:W.paper, format:'docx', company:H.company||'', company_nat:H.company_nat||'', addr:H.addr||'', purpose:H.purpose||'',
        stay:H.stay||'', visatype:H.visatype||'', authorized:H.authorized||'', project:H.project||'', to_line:H.to_line||'', intro:H.intro||'', body:H.body||'',
        photo:W.paper==='istimara'?(W.photo||''):'',
        rows:rows.map(r=>({ name:r.name||'', nationality:r.nationality?TV(r.nationality):'', passport_no:r.passport_no||'', passport_expiry:fmtD(r.passport_expiry)||'',
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
        hand:r.hand||{}, row_state:r.row_state||'ok', scan_job_id:r.scan_job_id||null, scan_hash:r.scan_hash||null, src_path:r.src_path||null,
        passport_jpg:r.passport_jpg||null, portrait_jpg:r.portrait_jpg||null, portrait_tier:r.portrait_tier||null}));
      const {data,error}=await sb.rpc('dossier_save',{p_id:W.id, p_name:W.name, p_status:status, p_header:W.header, p_hand:W.hand, p_rows:rows});
      if(error) throw error;
      W.id=data; W.status=status; W.dirty=false;
      if(!quiet){ say(status==='saved'?t2('saved'):t2('draft_saved')); if(status==='saved') wizCloseNow(); }
    }catch(e){ console.warn('door2 save',e); say((e&&e.message)||String(e)); }
  }

  /* ── boot ─────────────────────────────────────────────────────────────────────────────── */
  function build(){
    const nav=$('#law-doors'), room=$('#door2'); if(!nav||!room) return false;
    nav.setAttribute('role','tablist');
    nav.innerHTML=`<button class="door on" id="door-1" role="tab" type="button"></button><button class="door" id="door-2" role="tab" type="button"></button>`;
    room.innerHTML=`<div class="d2-head">
        <label class="d2-sbox"><svg class="ic"><use href="#i-search"/></svg><input id="d2-q" autocomplete="off" spellcheck="false"></label>
        <button class="d2-add" id="d2-add" type="button"></button></div>
      <div id="d2-list"></div>`;
    $('#door-1').onclick=()=>select('door1'); $('#door-2').onclick=()=>select('door2');
    $('#d2-add').onclick=()=>wizOpen(null);
    $('#d2-q').oninput=e=>{ L.q=e.target.value; paintList(); };
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
