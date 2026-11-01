/* ══════════════════════════════════════════════════════════════════════════════════════════
   DOOR 2 — «المجلدات القانونية» · own script (app.js is NOT touched — isolation principle).

   The legal section becomes a HALLWAY with two doors:
     Door 1 = today's legal section (استمارة · تعهد · منح) — auto-selected, byte-for-byte the same.
     Door 2 = the legal folders (visa-ready: papers as Word + per-employee passport/portrait pictures).

   How it hooks in WITHOUT a line in app.js: setLaw() already toggles the header button's `on` class
   (#blaw.on), and applyLang() already writes <html lang>. Both are observed here. Entering the legal
   section (from the header, the phone sheet, or an employee → batch deep link) always lands on Door 1;
   leaving it («الصفحة الرئيسية» / the header button) clears everything this file added.
   Behind Door 2 the roster surfaces are hidden by one body class (CSS) — hidden, never changed.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  const T={
    ar:{door1:'المعاملات', door1s:'استمارة · تعهد · منح', door2:'المجلدات القانونية', door2s:'مجلدات جاهزة للتأشيرة',
        q:'ابحث باسم المجلد…', add:'＋ مجلد جديد', empty_h:'لا مجلدات بعد', empty:'كل مجلد = استمارة + تعهد بصيغة Word، ومجلد «الأسماء» بصورة الجواز والصورة الشخصية لكل موظف.',
        soon:'قريبًا — إنشاء المجلدات يأتي في الخطوة التالية', hall:'أبواب القسم القانوني'},
    en:{door1:'Procedures', door1s:'Istimara · Taahud · Grant', door2:'Legal folders', door2s:'Visa-ready folders',
        q:'Search by folder name…', add:'＋ New folder', empty_h:'No folders yet', empty:'Each folder = Istimara + Taahud as Word, and a «Names» folder with the passport page and portrait of every employee.',
        soon:'Coming next — creating folders arrives in the next step', hall:'Legal section doors'}
  };
  const $=s=>document.querySelector(s);
  const lang=()=>document.documentElement.lang==='en'?'en':'ar';
  const t=k=>(T[lang()]||T.ar)[k]||'';
  let door='door1';

  const ICON_SCALE='<svg class="ic"><use href="#i-scale"/></svg>';
  const ICON_FOLDER='<svg class="ic" viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';

  function paint(){
    const d1=$('#door-1'), d2=$('#door-2'); if(!d1||!d2) return;
    d1.innerHTML=`${ICON_SCALE}<span>${t('door1')}</span>`;
    d2.innerHTML=`${ICON_FOLDER}<span>${t('door2')}</span>`;
    d1.title=t('door1s'); d2.title=t('door2s');
    d1.classList.toggle('on',door==='door1'); d2.classList.toggle('on',door==='door2');
    d1.setAttribute('aria-selected',door==='door1'); d2.setAttribute('aria-selected',door==='door2');
    const nav=$('#law-doors'); if(nav) nav.setAttribute('aria-label',t('hall'));
    const q=$('#d2-q'); if(q) q.placeholder=t('q');
    const a=$('#d2-add'); if(a) a.textContent=t('add');
    const e=$('#d2-empty'); if(e) e.innerHTML=`<b>${t('empty_h')}</b>${t('empty')}`;
  }
  function select(d){
    door=(d==='door2')?'door2':'door1';
    document.body.classList.toggle('door2',door==='door2');
    paint();
  }
  function onLaw(on){                       // mirrors LAWMODE through the header button's own class
    document.body.classList.toggle('lawmode',!!on);
    if(on) select('door1');                 // every entry lands on Door 1 — today's section, as it is
    else { door='door1'; document.body.classList.remove('door2'); paint(); }
  }
  function build(){
    const nav=$('#law-doors'), room=$('#door2'); if(!nav||!room) return false;
    nav.setAttribute('role','tablist');
    nav.innerHTML=`<button class="door on" id="door-1" role="tab" type="button"></button>
                   <button class="door" id="door-2" role="tab" type="button"></button>`;
    room.innerHTML=`<div class="d2-head">
        <label class="d2-sbox"><svg class="ic"><use href="#i-search"/></svg><input id="d2-q" autocomplete="off" spellcheck="false"></label>
        <button class="d2-add" id="d2-add" type="button"></button></div>
      <div id="d2-list"><div class="d2-empty" id="d2-empty"></div></div>`;
    $('#door-1').addEventListener('click',()=>select('door1'));
    $('#door-2').addEventListener('click',()=>select('door2'));
    $('#d2-add').addEventListener('click',()=>{ if(typeof toast==='function') toast(t('soon')); });
    return true;
  }
  function init(){
    const blaw=$('#blaw'); if(!blaw||!build()) return;
    // EDGE-triggered: the app re-sets the button's class on repaints (language switch, re-renders)
    // without changing it — only a real off→on / on→off transition may move the doors.
    let was=blaw.classList.contains('on');
    new MutationObserver(()=>{ const now=blaw.classList.contains('on'); if(now!==was){ was=now; onLaw(now); } })
      .observe(blaw,{attributes:true,attributeFilter:['class']});
    new MutationObserver(paint).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    onLaw(blaw.classList.contains('on'));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
