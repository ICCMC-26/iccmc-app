/* ── config (reuses the same Supabase backend as v1) ─────────────────────── */
const SUPA_URL='https://jsmfrwjydmhcqheulpjo.supabase.co';
const SUPA_KEY='sb_publishable_huim4LWiwS_UgSt77rpSPw_i22WlQxx';
// sessionStorage → the login survives reloads & app-switching WHILE THE TAB IS OPEN,
// but is wiped when the tab/window is closed → next open asks for email + password.
// GUARDED: some phones (iOS private mode) / file:// contexts THROW on storage access —
// if so we fall back to no-persistence (still logs out on close) instead of the whole
// script crashing before the buttons get wired up.
const _authStore=(()=>{try{const s=window.sessionStorage;s.setItem('__p','1');s.removeItem('__p');return s;}catch(_){return null;}})();
const sb = window.supabase.createClient(SUPA_URL, SUPA_KEY,
  {auth:{persistSession:!!_authStore, autoRefreshToken:true, storageKey:'iccmc_v2_auth',
         storage:_authStore||undefined}});
const $=s=>document.querySelector(s);
if(window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
let CURRENT_P=null, CURRENT_VS=[], CURRENT_LEGAL=[];   // the open employee — the print dossier's subject

/* ── bilingual (chrome translates; stored values never do) ───────────────── */
const I18N={
  ar:{dir:'rtl', other:'English',
    gtag:'سجل وثائق الموظفين', signin:'تسجيل الدخول ›', signing:'… جارٍ الدخول',
    bad:'بريد أو كلمة مرور غير صحيحة.', need:'أدخل البريد وكلمة المرور.',
    add:'إضافة', ph:'ابحث عن أي موظف — الاسم، الجواز، التأشيرة، الجنسية…',
    hint:'اكتب أي شيء أخذناه من الموظف — يظهر فورًا.', all:'كل الموظفين',
    n_res:n=>`${n} نتيجة`, none:'لا نتائج — جرّب اسمًا أو رقم جواز آخر.',
    soon:'ينتهي خلال', day:'يوم', expired:'منتهٍ', valid:'ساري', nodocs:'لا وثائق', incomplete:'غير مكتمل',
    f_all:'الكل', f_expiring:'قارب الانتهاء', f_none:'لا نتائج ضمن هذا التصنيف.', f_legal:'الملف القانوني ناقص',
    inc_all:'الكل', inc_pass:'الجواز', inc_visa:'الفيزا',
    out:'تسجيل الخروج؟', soon_v2:'إضافة موظف — قادمة قريبًا.',
    t_passport:'جواز السفر', t_visa:'التأشيرة', t_print:'طباعة', t_close:'إغلاق',
    hx_title:'سِجل الوثائق', hx_retired:'سابقة', hx_open:'فتح المستند', vhx_title:'سِجل التأشيرات',
    t_est:'تقديري', t_novisa:'لا تأشيرة مسجّلة', t_tap:'اضغط الصورة لعرض المستند كاملاً',
    dz_t:'اسحب ملفات الموظف هنا',
    dz_s:'أو انقر للاختيار · صورة أو PDF أو Excel أو Word · ملفات كبيرة مدعومة · عدة ملفات وموظفين معًا',
    ik_queued:'بالانتظار', ik_done:'رُفع', ik_failed:'فشل', ik_retry:'إعادة',
    ik_bad:'نوع غير مدعوم — صورة أو PDF أو Excel أو Word فقط', ik_big:'أكبر من 200MB', ik_auth:'يلزم تسجيل الدخول',
    ik_up:'رُفع', ik_busy:'قيد الرفع', ik_fail:'فشل',
    ik_next:'الملفات في طابور المسح — تظهر فور اعتمادها.',
    ik_processing:'قيد المعالجة…', ik_landed:'أودعت', ik_sent:'قيد المعالجة', ik_committed:'أودعت', ik_refused:'مرفوض', ik_split:n=>'قُسِّمت إلى '+n, ik_pk_skip:n=>n+' مُتجاهَل', ik_rm_fail:'تعذّر الحذف من الخادم — أُعيدت البطاقة، جرّب مجددًا', ik_v_compact:'مُوجز', ik_v_detailed:'تفصيلي', ik_allclear:'أودِع الكل ✓', ik_lg_rev:'مراجعة',
    ik_cls_passport:'جواز', ik_cls_visa:'تأشيرة', ik_cls_legal:'قانوني',
    ik_next2:'المستندات قيد المسح — تظهر في صفحة البحث فور اعتمادها.',
    ik_review:'مراجعة ›', ik_legal:'مراجعة قانونية', rv_ask:'بانتظار مراجعتك — تأكيد سريع', rv_asklink:'يحتاج ربطًا — راجِع للمتابعة',
    rv_h:'مراجعة سريعة', rv_scan:'المستند الأصلي', rv_noscan:'لا صورة متاحة', rv_loading:'…جارٍ التحميل',
    rv_check:'تأكّد مما يلي', rv_clean:'راجِع البيانات قبل الإضافة', rv_all:'عرض كل الحقول', rv_less:'إخفاء البقية',
    rv_missing:'مفقود', rv_face:'صورة الوجه', rv_add:'تأكيد وإضافة الموظف', rv_adding:'…جارٍ الإضافة',
    rv_renewal:'تجديد محتمل لـ', rv_renew_do:'تأكيد التجديد', rv_need:'أكمل الحقول المطلوبة:',
    rv_need:'أكمل الحقول المطلوبة: ', rv_added:'أُضيف الموظف ✓ ', rv_addfail:'تعذّر الإضافة: ',
    rv_defer:'لا هوية لهذا المستند — افتح «عرض كل الحقول» وأدخل اسم الموظف أو رقم جوازه، ثم أكّد.',
    dv_order:(a,b)=>`«${a}» بعد «${b}» — راجِع التواريخ.`, dv_future:a=>`«${a}» في المستقبل — تحقّق منه.`,
    pv_company:'الشركة الدولية الصينية للميكانيك والبناء', pv_title:'سجل وثائق الموظف',
    pv_generated:'صدر بتاريخ', pv_conf:'سري — للاستخدام الداخلي', pv_contents:'المحتويات',
    pv_report:'تقرير التفاصيل', pv_passport:'صورة الجواز الأصلية', pv_photo:'الصورة الشخصية', pv_visa:'صورة التأشيرة الأصلية',
    lg_h:'دفعة قانونية', lg_sub:'المنح + التعهد + الاستمارة كمجموعة واحدة تشترك بتسلسل واحد',
    lg_id:'رقم المنح (معرّف الدفعة)', lg_id_ph:'مثال: 22491 — يُكتب يدويًا',
    lg_date:'تاريخ المنح', lg_from:'من التسلسل', lg_to:'إلى التسلسل',
    lg_stamps:'الأختام — بوابة الثقة (تُعتمد بيانات الورقة فقط إذا وُجد ختمها)',
    lg_st_taahud:'ختم الشركة — التعهد', lg_st_ist_co:'ختم الشركة — الاستمارة',
    lg_st_ist_mo:'ختم الوزارة — الاستمارة', lg_st_manh:'ختم الوزارة — المنح',
    lg_roster:'القائمة — كل سطر: التسلسل · الاسم · رقم الجواز',
    lg_roster_ph:'1  SAMPLE NAME  AB1234567\n2  ANOTHER NAME  CD2345678\n13  THIRD NAME  EF3456789',
    lg_parsed:n=>`${n} اسم في القائمة`, lg_commit:'حفظ الدفعة', lg_saving:'…جارٍ الحفظ',
    lg_saved:'حُفظت الدفعة ✓ ', lg_need_id:'أدخل رقم المنح.', lg_need_rows:'أضِف صفًا واحدًا على الأقل.',
    lg_savefail:'تعذّر الحفظ: ',
    lg_file:'الملف القانوني', lg_none:'لا أوراق قانونية مسجّلة', lg_batch:'دفعة',
    lg_serial:'التسلسل', lg_taahud:'التعهد', lg_istimara:'الاستمارة', lg_manh:'المنح',
    lg_present:'موجود', lg_missing:'ناقص', lg_nostamp:'بلا ختم', lg_covered:'مشمول ضمن',
    lg_pending:'أوراق ممسوحة بانتظار المطابقة', lg_no_pending:'لا أوراق بانتظار المطابقة — أدخِل دفعة يدويًا أدناه',
    lg_proposal:'دفعة مقترحة', lg_provisional:'مؤقتة — بانتظار المنح', lg_ambiguous:'غامضة — راجِع يدويًا',
    lg_papers_lbl:'الأوراق:', lg_confirm_commit:'تأكيد وحفظ الدفعة', lg_view:'عرض',
    lg_manh_need:'اكتب رقم المنح لهذه الدفعة', lg_manual_h:'إدخال يدوي', lg_names_ocr:n=>`${n} اسم من المسح`,
    lg_saved_prov:'حُفظت دفعة مؤقتة ✓ ', lg_adopt:(n,b)=>`المنح ${n} يُكمل الدفعة: ${b}`, lg_adopt_do:'أكمِل الدفعة بهذا المنح',
    lg_adopted:'اكتملت الدفعة برقم المنح ✓ ', lg_adopt_amb:'منح يطابق أكثر من دفعة — اختر الصحيحة:', lg_manh_opt:'رقم المنح (اختياري الآن)', lg_anchor:'ثبّت الدفعة مؤقتًا', lg_merged:'دُمجت في الدفعة: ',
    big_files:'ملف — دفعة كبيرة', big_why:'المتصفح يفقد الطابور عند التحديث أو الإغلاق. أداة الرفع تجعل الطابور مجلدًا على قرصك، فيصمد أمام التحديث وانقطاع النت وإعادة التشغيل.',
    dz_agent:'أكثر من 12 ملفًا؟ حمِّل أداة الرفع — الطابور يصير مجلدًا على قرصك',
    dz_agent_open:'دفعة كبيرة؟ افتح أداة الرفع على جهازك',
    dz_agent_nope:'لم تُفتح — شغّلها مرة على جهازك أولاً، أو حمِّلها من هنا',
    dz_agent_new:'يوجد تحديث لأداة الرفع — حمِّل النسخة الأحدث',
    big_open:'افتح أداة الرفع', big_opening:'…يُفتح على جهازك',
    big_nope:'لم تُفتح؟ شغّلها مرة على جهازك أولاً — أو حمِّلها من جديد', big_have:'الأداة موجودة على جهازك — افتحها وأفلِت ملفاتك فيها.',
    big_get:'حمِّل أداة الرفع', big_anyway:'إلغاء', big_note:'بعد الرفع بالأداة، افتح الموقع مرة واحدة لتُودَع الملفات النظيفة.',
    pq_btn:'الوارد', pq_h:'الوارد — ما لم يُودَع بعد',
    pq_rev:'قيد المراجعة', pq_ref:'مرفوض',
    pq_rev_s:'ملفات تنتظر تأكيدك قبل أن تُودَع', pq_ref_s:'ملفات لم تُقبل — السبب مذكور مع كل ملف',
    pq_all:'الكل', pq_legal:'قانوني', pq_pass:'جوازات', pq_visa:'فيزا',
    pq_none_rev:'لا شيء بانتظار المراجعة — كل شيء تم.', pq_none_ref:'لا ملفات مرفوضة.',
    pq_review:'راجِع', pq_retry:'إعادة', pq_del:'حذف نهائي', pq_noreason:'بدون سبب مسجَّل',
    pq_gone:'لم يعد موجودًا', pq_deleted:'حُذف', pq_cleared:'أُزيل السجل — أعِد إسقاط الملف الآن',
    pq_nodet:'هذا الملف لن ينجح بإعادة المحاولة — يحتاج ملفًا أوضح أو تقسيمًا',
    pq_nocommit:'لا يمكن حذف ملف مُودَع', pq_delq:n=>`حذف «${n}» نهائيًا؟`,
    law_h:'القانون', law_btn:'المعاملات', law_ph:'ابحث عن دفعة — رقم المنح، اسم موظف، جواز…', law_none:'لا دفعات قانونية بعد',
    ist_new:'استمارة', ist_h:'استمارة سمة الدخول', ist_title:'استمارة طلب سمات الدخول للشركات المتعاقدة مع الدولة',
    ist_company:'اسم الشركة', ist_company_nat:'جنسية الشركة', ist_addr:'عنوان الشركة داخل العراق', ist_purpose:'الغاية من الدخول', ist_stay:'مدة البقاء المتوقعة في العراق', ist_visatype:'نوع السمة',
    ist_undertaking_pre:'اني المخول (', ist_undertaking_post:') اتعهد بعدم التصرف بأوراق الشركة دون علمها أو إضافة أو تغيير او تعديل بيانات المعلومات وبخلاف ذلك أتحمل كافة التبعات القانونية وعدم إخفاء أي معلومات عن مديرية شؤون الإقامة',
    ist_sig_mgr:'اسم وختم وتوقيع مدير الشركة', ist_sig_mgr_title:'المهندس', ist_mgr_name:'احمد عبد اللطيف جاسم', ist_mgr_role:'المدير الإقليمي', ist_sig_auth:'اسم وتوقيع مخول الشركة',
    ist_c_ser:'ت', ist_c_name:'الاسم', ist_c_nat:'الجنسية', ist_c_pass:'رقم الجواز', ist_c_exp:'مدة نفاذية الجواز',
    ist_c_addr:'العنوان الكامل للأقامة داخل العراق', ist_c_border:'اسم المنفذ الحدودي', ist_c_prof:'المهنة', ist_c_country:'بلد الاقامة الحالي', ist_c_visited:'هل سبق زيارة العراق',
    ist_filldown:'تعبئة للأسفل — نسخ هذه القيمة إلى كل الصفوف تحتها', ist_hand_hint:'تُكتب باليد (لا تأتي من قراءة الجواز)',
    ist_photo:'الصورة', ist_add_pc:'إضافة من الحاسبة', ist_add_reg:'من السجل', ist_empty:'لا موظفين بعد — أضِفهم من الحاسبة', ist_soon:'قريباً', ist_company_ph:'مثال: مجموعة شنغهاي للكهرباء',
    ist_reading:'… جارٍ القراءة', ist_read_fail:'تعذّرت القراءة — أعِد المحاولة', ist_drop_sub:'انقر أو اسحب جوازات الموظفين',
    ist_close_q:'لديك عمل غير محفوظ — احفظه لتتابع لاحقًا؟', ist_save:'حفظ', ist_discard:'عدم الحفظ', ist_cancel:'إلغاء', ist_saved:'حُفظ ✓',
    ist_export:'تصدير PDF', ist_export_tip:'ينزّل ملف PDF (عرضي) إلى جهازك — افتحه واطبعه لاحقاً إن رغبت', ist_export_empty:'أضِف موظفاً واحداً على الأقل قبل التصدير', ist_pdf_done:'تم تنزيل ملف الـ PDF ✓', ist_pdf_fail:'تعذّر إنشاء ملف الـ PDF — أعِد المحاولة', ist_pdf_working:'جارٍ إنشاء ملف الـ PDF…', ist_pdf_step1:'تجهيز البيانات', ist_pdf_step2:'بناء الورقة الرسمية', ist_pdf_step3:'المُصيّر يستيقظ — قد يستغرق لحظات في أول تصدير', ist_pdf_step4:'جارٍ التنزيل…',
    ist_not_passport:'ورقة قانونية — ليست جوازاً. هذا الجدول للجوازات فقط؛ عالِجها من قسم المعاملات.', ist_remove:'إزالة',
    mk_ist:'إنشاء استمارة', mk_ist_s:'استمارة سمة الدخول', mk_taa:'إنشاء تعهد', mk_taa_s:'تعهد الشركة بالموظفين',
    taa_h:'تعهد الشركة', taa_title:'م/ تعهد', taa_to:'الى مديرية شؤون الاقامة',
    taa_intro:'نحن مجموعة شنغهاي الصينية للكهرباء المتعاقدة مع وزارة الكهرباء في تنفيذ مشروع الدورات المركبة للمحطات (كربلاء – النجف – الحلة -الديوانية – المنصورية -الهارثة )',
    taa_body:'تتعهد الشركة بعدم تسرب الموظفين خارج موقع العمل وتتحمل الشركة تكاليف السفر في حالة مغادرتهم البلاد في الوقت المحدد .',
    taa_c_ser:'العدد', taa_mgr_name:'احمدعبداللطيف جاسم', ist_still_reading:'ما زال قيد القراءة في خط المسح — سيظهر عند اكتماله', taa_editable:'نص افتراضي — يمكنك تعديله',
    law_members:n=>`${n} موظف`, law_covers:'التسلسل', law_papersLbl:'الأوراق', law_back:'‹ رجوع',
    law_roster:'القائمة', law_open_emp:'فتح الموظف ›', law_orphan:'بانتظار الجواز',
    law_addname:'اكتب الاسم', law_name_saved:'حُفظ الاسم', law_gaps:n=>`⚑ لا تكفي البيانات لربط الدفعة بالمنح — أكمِل اسم أحد طرفَيها`,
    law_cover:id=>`الأوراق القانونية للمنح رقم ${id}`, law_emp:'الموظف', law_kicker:'ملف قانوني',
    law_rot_saved:'حُفظ التدوير — سيظهر في الطباعة',
    lr_verify:'رقم المنح (العدد) — تحقّق منه واكتبه', law_main:'‹ الصفحة الرئيسية', lr_rotate:'تدوير الورقة 90°',
    lr_xlsx:'ملف {k} · لا صورة للعرض', lr_xlsx_dl:'تنزيل ملف {k}',
    lr_endname:'اسم الموظف — لم يقرأه الماسح', lr_endname_need:'أكمِل اسم طرف الدفعة قبل الحفظ',
    pv_legal_note:(name,serial)=>`الموظف ${name} مُدرَج في هذه الاستمارة ضمن التسلسل رقم ${serial}.`},
  en:{dir:'ltr', other:'العربية',
    gtag:'Employee documents registry', signin:'Sign in ›', signing:'… signing in',
    bad:'Wrong email or password.', need:'Enter email and password.',
    add:'Add', ph:'Search any employee — name, passport, visa, nationality…',
    hint:'Type anything we captured from the employee — results appear instantly.', all:'All employees',
    n_res:n=>`${n} result${n===1?'':'s'}`, none:'No matches — try another name or passport number.',
    soon:'expires in', day:'d', expired:'Expired', valid:'Valid', nodocs:'No documents', incomplete:'Incomplete',
    f_all:'All', f_expiring:'Expiring', f_none:'None in this filter.', f_legal:'Legal file incomplete',
    inc_all:'All', inc_pass:'Passport', inc_visa:'Visa',
    out:'Sign out?', soon_v2:'Add employee — coming next.',
    t_passport:'Passport', t_visa:'Visa', t_print:'Print', t_close:'Close',
    hx_title:'Document history', hx_retired:'past', hx_open:'Open document', vhx_title:'Visa history',
    t_est:'estimated', t_novisa:'No visa on record', t_tap:'Tap the photo to view the full document',
    dz_t:"Drop the employee's files here",
    dz_s:'or click to browse · image, PDF, Excel or Word · large files OK · many files & employees at once',
    ik_queued:'Queued', ik_done:'Uploaded', ik_failed:'Failed', ik_retry:'Retry',
    ik_bad:'Unsupported — image, PDF, Excel, or Word only', ik_big:'Larger than 200MB', ik_auth:'Sign-in required',
    ik_up:'uploaded', ik_busy:'in progress', ik_fail:'failed',
    ik_next:'Files are queued for scanning — they appear once committed.',
    ik_processing:'Processing…', ik_landed:'Committed', ik_sent:'processing', ik_committed:'committed', ik_refused:'Refused', ik_split:n=>'Split into '+n, ik_pk_skip:n=>n+' skipped', ik_rm_fail:'Could not remove on the server — card restored, try again', ik_v_compact:'Compact', ik_v_detailed:'Detailed', ik_allclear:'All committed ✓', ik_lg_rev:'review',
    ik_cls_passport:'passport', ik_cls_visa:'visa', ik_cls_legal:'legal',
    ik_next2:'Being scanned — they appear on the search page once committed.',
    ik_review:'Review ›', ik_legal:'legal review', rv_ask:'Waiting for your check — quick confirm', rv_asklink:'Needs linking — open to continue',
    rv_h:'Quick review', rv_scan:'Original document', rv_noscan:'No scan available', rv_loading:'…loading',
    rv_check:'Please check', rv_clean:'Review before adding', rv_all:'Show all fields', rv_less:'Show less',
    rv_missing:'missing', rv_face:'face photo', rv_add:'Confirm & add employee', rv_adding:'…adding',
    rv_renewal:'Likely a renewal of', rv_renew_do:'Confirm renewal', rv_need:'Please fill the required fields:',
    rv_need:'Fill the required fields: ', rv_added:'Employee added ✓ ', rv_addfail:'Could not add: ',
    rv_defer:"No identity on this document — open “Show all fields” and enter the employee's name or passport number, then confirm.",
    dv_order:(a,b)=>`“${a}” is after “${b}” — check the dates.`, dv_future:a=>`“${a}” is in the future — check it.`,
    pv_company:'International Chinese Company for Mechanics and Construction', pv_title:'Employee Document Record',
    pv_generated:'Generated', pv_conf:'Confidential — internal use only', pv_contents:'Contents',
    pv_report:'Details report', pv_passport:'Original passport scan', pv_photo:'Personal photo', pv_visa:'Original visa scan',
    lg_h:'Legal batch', lg_sub:'Grant + Undertaking + Entry-form as ONE set sharing one serial order',
    lg_id:'Grant number (batch id)', lg_id_ph:'e.g. 22491 — hand-written, type it',
    lg_date:'Grant date', lg_from:'From serial', lg_to:'To serial',
    lg_stamps:"Stamps — the trust gate (a paper's data counts only if its stamp is present)",
    lg_st_taahud:'Company stamp — Undertaking', lg_st_ist_co:'Company stamp — Entry form',
    lg_st_ist_mo:'Ministry stamp — Entry form', lg_st_manh:'Ministry stamp — Grant',
    lg_roster:'Roster — one line each: serial · name · passport no.',
    lg_roster_ph:'1  SAMPLE NAME  AB1234567\n2  ANOTHER NAME  CD2345678\n13  THIRD NAME  EF3456789',
    lg_parsed:n=>`${n} in roster`, lg_commit:'Save batch', lg_saving:'…saving',
    lg_saved:'Batch saved ✓ ', lg_need_id:'Enter the grant number.', lg_need_rows:'Add at least one row.',
    lg_savefail:'Could not save: ',
    lg_file:'Legal file', lg_none:'No legal papers on record', lg_batch:'Batch',
    lg_serial:'Serial', lg_taahud:'Undertaking', lg_istimara:'Entry form', lg_manh:'Grant',
    lg_present:'present', lg_missing:'missing', lg_nostamp:'no stamp', lg_covered:'covered in',
    lg_pending:'Scanned papers awaiting matching', lg_no_pending:'None awaiting — enter a batch manually below',
    lg_proposal:'Proposed batch', lg_provisional:'provisional — awaiting grant', lg_ambiguous:'ambiguous — review manually',
    lg_papers_lbl:'Papers:', lg_confirm_commit:'Confirm & save batch', lg_view:'view',
    lg_manh_need:'Type the grant number for this batch', lg_manual_h:'Manual entry', lg_names_ocr:n=>`${n} names from scan`,
    lg_saved_prov:'Provisional batch saved ✓ ', lg_adopt:(n,b)=>`Grant ${n} completes: ${b}`, lg_adopt_do:'Complete this batch with the grant',
    lg_adopted:'Batch completed with its grant number ✓ ', lg_adopt_amb:'Grant matches more than one batch — pick the right one:', lg_manh_opt:'Grant number (optional now)', lg_anchor:'Anchor provisionally', lg_merged:'Merged into batch: ',
    big_files:'files — that is a big batch', big_why:'The browser loses the queue on refresh or close. The uploader makes the queue a folder on your disk, so it survives refresh, connection drops and restarts.',
    dz_agent:'More than 12 files? Get the uploader — the queue becomes a folder on your disk',
    dz_agent_open:'Big batch? Open the uploader on your machine',
    dz_agent_nope:'It did not open — run it once on your machine first, or download it here',
    dz_agent_new:'A newer uploader is available — download the update',
    big_open:'Open the uploader', big_opening:'…opening on your machine',
    big_nope:"Didn't open? Download it again", big_have:'You already have the uploader — open it and drop your files there.',
    big_get:'Get the uploader', big_anyway:'Cancel', big_note:'After it finishes, open the site once so the clean files are committed.',
    pq_btn:'Inbox', pq_h:'Inbox — not committed yet',
    pq_rev:'Pending review', pq_ref:'Refused',
    pq_rev_s:'Files waiting for your confirmation before they are committed',
    pq_ref_s:'Files that were not accepted — each shows its reason',
    pq_all:'All', pq_legal:'Legal', pq_pass:'Passports', pq_visa:'Visas',
    pq_none_rev:'Nothing waiting — all clear.', pq_none_ref:'No refused files.',
    pq_review:'Review', pq_retry:'Retry', pq_del:'Delete', pq_noreason:'no reason recorded',
    pq_gone:'No longer there', pq_deleted:'Deleted', pq_cleared:'Cleared — drop the file again now',
    pq_nodet:'Retrying cannot help this file — it needs a clearer scan or splitting',
    pq_nocommit:'Cannot delete a committed file', pq_delq:n=>`Delete “${n}” permanently?`,
    law_h:'Law', law_btn:'Procedures', law_ph:'Search a batch — grant no., employee name, passport…', law_none:'No legal batches yet',
    ist_new:'Entry form', ist_h:'Entry-visa form', ist_title:'Application form for entry visas — companies contracted with the State',
    ist_company:'Company name', ist_company_nat:'Company nationality', ist_addr:'Address in Iraq', ist_purpose:'Purpose of entry', ist_stay:'Expected stay in Iraq', ist_visatype:'Visa type',
    ist_undertaking_pre:'I, the authorized (', ist_undertaking_post:'), undertake not to dispose of the company documents without its knowledge, nor add/alter/modify the data; otherwise I bear all legal consequences and will not conceal any information from the Residence Directorate.',
    ist_sig_mgr:'Company manager — name, seal & signature', ist_sig_mgr_title:'المهندس', ist_mgr_name:'احمد عبد اللطيف جاسم', ist_mgr_role:'المدير الإقليمي', ist_sig_auth:'Company authorized rep — name & signature',
    ist_c_ser:'No.', ist_c_name:'Name', ist_c_nat:'Nationality', ist_c_pass:'Passport No.', ist_c_exp:'Passport validity',
    ist_c_addr:'Full address of residence in Iraq', ist_c_border:'Border entry point', ist_c_prof:'Profession', ist_c_country:'Current country of residence', ist_c_visited:'Visited Iraq before?',
    ist_filldown:'Fill down — copy this value to all rows below', ist_hand_hint:'Typed by hand (not read from the passport)',
    ist_photo:'Photo', ist_add_pc:'Add from PC', ist_add_reg:'From registry', ist_empty:'No employees yet — add them from your PC', ist_soon:'soon', ist_company_ph:'e.g. Shanghai Electric Group',
    ist_reading:'… reading', ist_read_fail:'Could not read — try again', ist_drop_sub:'click or drop the employees’ passports',
    ist_close_q:'You have unsaved work — save it to continue later?', ist_save:'Save', ist_discard:'Discard', ist_cancel:'Cancel', ist_saved:'Saved ✓',
    ist_export:'Export PDF', ist_export_tip:'Downloads a PDF file (landscape) to your device — open & print it later if you want', ist_export_empty:'Add at least one employee before exporting', ist_pdf_done:'PDF downloaded ✓', ist_pdf_fail:'Could not create the PDF — try again', ist_pdf_working:'Building your PDF…', ist_pdf_step1:'Preparing the data', ist_pdf_step2:'Building the official paper', ist_pdf_step3:'Waking the renderer — the first export takes a moment', ist_pdf_step4:'Downloading…',
    ist_not_passport:'A legal paper — not a passport. This table is passports only; handle it in the Procedures section.', ist_remove:'Remove',
    mk_ist:'New entry form', mk_ist_s:'Entry-visa form (استمارة)', mk_taa:'New undertaking', mk_taa_s:'Company undertaking (تعهد)',
    taa_h:'Company undertaking', taa_title:'Re / Undertaking', taa_to:'To the Directorate of Residence Affairs',
    taa_intro:'We, Shanghai Electric Group (China), contracted with the Ministry of Electricity for the combined-cycle stations project (Karbala – Najaf – Hilla – Diwaniyah – Mansuriya – Hartha)',
    taa_body:'The company undertakes that no employee will leave the work site, and bears travel costs should they leave the country at the set time.',
    taa_c_ser:'No.', taa_mgr_name:'احمدعبداللطيف جاسم', ist_still_reading:'Still being read by the scan line — it will appear when done', taa_editable:'Default text — you can edit it',
    law_members:n=>`${n} member${n===1?'':'s'}`, law_covers:'Serials', law_papersLbl:'Papers', law_back:'‹ Back',
    law_roster:'Roster', law_open_emp:'Open employee ›', law_orphan:'awaiting passport',
    law_addname:'Type the name', law_name_saved:'Name saved', law_gaps:n=>`⚑ Not enough to match this batch to its منح — fill one endpoint name`,
    law_cover:id=>`Legal papers — Grant no. ${id}`, law_emp:'Employee', law_kicker:'Legal file',
    law_rot_saved:'Rotation saved — shows in print',
    lr_verify:'Grant number (العدد) — verify & type it', law_main:'‹ Home', lr_rotate:'Rotate 90°',
    lr_xlsx:'{k} file · no image to show', lr_xlsx_dl:'Download {k} file',
    lr_endname:'Employee name — the scanner missed it', lr_endname_need:'Fill the batch-endpoint name before saving',
    pv_legal_note:(name,serial)=>`${name} is listed in this entry form at serial no. ${serial}.`},
};
let LANG=(()=>{try{return localStorage.getItem('iccmc_lang')==='en'?'en':'ar'}catch(_){return'ar'}})();
const t=(k,...a)=>{const v=I18N[LANG][k];return typeof v==='function'?v(...a):v};
function applyLang(){
  const L=I18N[LANG];
  document.documentElement.lang=LANG; document.documentElement.dir=L.dir;
  $('#gtag').textContent=t('gtag'); $('#signin').textContent=t('signin');
  $('#glang').textContent=L.other; $('#tlang').textContent=LANG==='ar'?'EN':'ع';
  $('#addtxt').textContent=t('add'); $('#q').placeholder=LAWMODE?t('law_ph'):t('ph');
  { const bl=$('#blawtxt'); if(bl)bl.textContent=t('law_btn'); }
  { const bp=$('#bpendtxt'); if(bp)bp.textContent=t('pq_btn');
    const bh=$('#pq-bar-h'); if(bh)bh.textContent=t('pq_h');
    // the queue re-labels itself too, or it would keep the old language until reopened
    if($('#pend')&&$('#pend').classList.contains('on'))pqRender(); }
  $('#ik-h').textContent=t('add');
  $('#dz-t').textContent=t('dz_t'); $('#dz-s').textContent=t('dz_s');
  paintAgentLink();
  if($('#intake').classList.contains('on'))ikRender();   // re-label file rows
  paintSort();                                            // re-label the sort control for the new language
  if(LAWMODE)renderLaw(LAWLAST); else render(LAST);       // re-label result chrome (law or employees)
}
function setLang(l){LANG=l==='en'?'en':'ar';try{localStorage.setItem('iccmc_lang',LANG)}catch(_){}applyLang()}

/* ── PAPER-TYPE REGISTRY (G6) — ONE source of truth for the legal paper types ────────────────────────
   The DB table `paper_types` is authoritative; the client caches it. A built-in default (today's 3 types,
   byte-identical to the seeded rows) is the FALLBACK — so the legal UI can NEVER break if the fetch fails
   or runs before auth. Legal sites read the helpers below (never a hardcoded type list), so a new paper of
   an existing role becomes a DB row that appears everywhere with no client deploy. */
const PT_DEFAULT=[
  {key:'taahud',   label:{ar:'التعهد',   en:'Undertaking'}, role:'roster', ord:1, stamps:['stamp'],             required:true},
  {key:'istimara', label:{ar:'الاستمارة', en:'Entry form'},  role:'roster', ord:2, stamps:['company','ministry'], required:true},
  {key:'manh',     label:{ar:'المنح',    en:'Grant'},       role:'grant',  ord:3, stamps:['stamp'],             required:true},
];
let _PT=PT_DEFAULT.slice();
async function loadPaperTypes(){
  try{ const {data,error}=await sb.from('paper_types').select('key,label,role,ord,stamps,required,active').order('ord');
    const rows=(data||[]).filter(r=>r&&r.active!==false&&r.key);
    if(!error && rows.length) _PT=rows;                       // else keep the safe built-in default
  }catch(_){}
}
const ptKeys  =()=>_PT.map(p=>p.key);                         // type keys, in registry order
const ptGet   =k=>_PT.find(p=>p.key===k);
const ptLabel =k=>{ const p=ptGet(k); return (p&&p.label&&(p.label[LANG]||p.label.ar))||t('lg_'+k)||k; };  // bilingual, registry-driven
const ptOrd   =k=>{ const p=ptGet(k); return p?p.ord:99; };
const ptStamps=k=>{ const p=ptGet(k); return (p&&p.stamps)||[]; };
const ptReq   =k=>{ const p=ptGet(k); return p?p.required!==false:true; };   // does this type GATE completeness?
// ── batchPaper: the ONE place that reads a batch's per-type completeness (registry-driven) ──────────
// The only site that knows column names. Schema convention (holds for every seeded type):
//   scan  = `${key}_scan`   ·   stamp = (name==='stamp') ? `${key}_stamp` : `${key}_${name}_stamp`
// Returns {scan, present, trusted}. `trusted` = all of the type's registry stamps are marked.
const _scanCol =k=>k+'_scan';
const _stampCol=(k,name)=> name==='stamp' ? k+'_stamp' : k+'_'+name+'_stamp';
function batchPaper(b,k){
  b=b||{}; const scan=b[_scanCol(k)]||null; const need=ptStamps(k);
  const marks=need.map(n=>!!b[_stampCol(k,n)]); const anyStamp=marks.some(Boolean);
  return { scan, present:!!(scan||anyStamp), trusted: need.length?marks.every(Boolean):!!scan };
}
loadPaperTypes();   // fire once now (refreshes again on SIGNED_IN); pre-auth failure just keeps the default

/* ── theme ───────────────────────────────────────────────────────────────── */
(()=>{try{if(localStorage.getItem('iccmc_theme')==='light')document.documentElement.dataset.theme='light'}catch(_){}})();
function toggleTheme(){const r=document.documentElement;const light=r.dataset.theme!=='light';
  r.dataset.theme=light?'light':'';try{localStorage.setItem('iccmc_theme',light?'light':'dark')}catch(_){}}

function toast(m){const el=$('#toast');el.textContent=m;el.classList.add('on');
  clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),2600)}

/* ── auth ────────────────────────────────────────────────────────────────── */
function gerr(m){const e=$('#gerr');e.textContent=m||'';e.style.display=m?'block':'none'}
async function signIn(){
  const email=$('#email').value.trim(), pass=$('#pass').value;
  if(!email||!pass){gerr(t('need'));return}
  const b=$('#signin');b.disabled=true;b.textContent=t('signing');gerr('');
  try{
    const {error}=await sb.auth.signInWithPassword({email,password:pass});
    if(error){gerr(/invalid|credential/i.test(error.message)?t('bad'):error.message);return}
    enterApp();
  }catch(e){gerr((e&&e.message)||e)}
  finally{b.disabled=false;b.textContent=t('signin')}
}
function enterApp(){$('#gate').style.display='none';$('#app').style.display='block';applyLang();$('#q').focus();search('');subscribeLive()}

/* live-sync: when an OCR'd employee is committed to persons/visas, re-run the
   current search so the search page updates itself — no manual refresh. RLS still
   filters the stream, so a client only hears about rows it may read. */
let _liveCh=null, _liveTimer=null;
function subscribeLive(){
  if(_liveCh)return;
  const bump=()=>{clearTimeout(_liveTimer);_liveTimer=setTimeout(()=>search($('#q').value),500)};   // live: list + insights
  _liveCh=sb.channel('iccmc_live')
    .on('postgres_changes',{event:'*',schema:'public',table:'persons'},bump)
    .on('postgres_changes',{event:'*',schema:'public',table:'visas'},bump)
    .subscribe();
}

/* ── search (the whole point) ────────────────────────────────────────────── */
let LAST=[], _seq=0, _timer=null;
function onType(){clearTimeout(_timer);_timer=setTimeout(()=>search($('#q').value),180)}
async function search(q){
  const seq=++_seq;
  if(LAWMODE){ const rows=await searchLegalBatches(q); if(seq!==_seq)return; LAWLAST=sortLawRows(rows); renderLaw(LAWLAST); return; }
  const {data,error}=await sb.rpc('search_employees',{q});
  if(seq!==_seq)return;                            // a newer keystroke won
  if(error){toast(error.message);return}
  // SEARCH = relevance order (the RPC ranks exact/prefix first — best match on top, direct & pro).
  // BROWSE (empty box) = the chosen sort chip (number / name / newest).
  LAST = String(q||'').trim() ? (data||[]) : sortRows(data||[]);
  render(LAST);                                        // PAINT after one round-trip — don't wait on the 2nd query
  // the per-row legal-gap counts (a filter-chip only) load in the BACKGROUND, then re-render — they never
  // block the results from appearing. A newer keystroke (seq bumped) discards a stale background result.
  refreshLegalFlags(LAST.map(r=>r.person_id)).then(()=>{ if(seq!==_seq) return;
    if(PERF.smartFlags){ paintFilters(_rItems); if(FILTER==='legal') render(LAST); }  // #1: chips-only; roster stays put unless the legal filter is active
    else render(LAST); });
}

/* ══ THE LAW SECTION — a dedicated SEARCH/READ surface for legal batches (owner's ask) ══════════
   The write side is review-in-place; this is the read side. Same "search IS the app" pattern applied
   to the legal domain: one box finds a batch by its منح number OR by any employee's name/passport in it.
   Click a batch → its papers (view links) + the full roster, each member linking to his employee dossier. */
let LAWMODE=false, LAWLAST=[], _lawBatch=null, LAW_FILTER='all';   // legal-section case filter (chips)
function setLaw(on){
  LAWMODE=!!on; _lawBatch=null; LAW_FILTER='all';   // enter the legal section on "All"
  const b=$('#blaw'); if(b)b.classList.toggle('on',LAWMODE);
  const q=$('#q'); if(q){ q.placeholder=LAWMODE?t('law_ph'):t('ph'); q.value=''; }
  $('#filters').innerHTML=''; $('#count').textContent='';
  search('');
}
async function searchLegalBatches(q){
  const [br,mr]=await Promise.all([
    sb.from('legal_batches').select('*'),
    sb.from('legal_batch_members').select('batch_id,serial,passport_no,name_as_written,person_id')]);
  const byB={}; (mr.data||[]).forEach(m=>{ (byB[m.batch_id]=byB[m.batch_id]||[]).push(m); });
  let rows=(br.data||[]).map(b=>({...b, members:(byB[b.batch_id]||[]).sort((a,c)=>(a.serial||0)-(c.serial||0))}));
  await loadLegalLinks(rows.map(b=>b.batch_id));
  // #Review: current visas of all members → flag a static batch sitting near a member's ACTIVE visa
  const _pids=[...new Set(rows.flatMap(b=>(b.members||[]).map(m=>m.person_id)).filter(Boolean))];
  _LVISA={};
  if(_pids.length){ try{ const {data}=await sb.from('visas').select('person_id,visa_issue_d,visa_valid_floor,visa_valid_ceiling').eq('is_current',true).in('person_id',_pids);
    (data||[]).forEach(v=>{ if(!_LVISA[v.person_id]) _LVISA[v.person_id]=v; }); }catch(_){} }
  const ql=String(q||'').trim().toLowerCase();
  if(ql) rows=rows.filter(b=> String(b.batch_id).toLowerCase().includes(ql)
    || b.members.some(m=>String(m.passport_no||'').toLowerCase().includes(ql)||String(m.name_as_written||'').toLowerCase().includes(ql)));
  return rows.sort((a,c)=>String(c.batch_id).localeCompare(String(a.batch_id),undefined,{numeric:true}));
}
function lawPaperStatus(b){   // registry-driven: {key → '–'|'✓'|'⚑'} for every paper type
  const o={}; ptKeys().forEach(k=>{ const x=batchPaper(b,k); o[k]= !x.present?'–':(x.trusted?'✓':'⚑'); }); return o; }
let _LBL={};   // #Phase2: batch_id -> v_legal_batch_link row (connection + status)
let _LVISA={};   // #Review: person_id -> their current visa row (to flag static batches near an active visa)
async function loadLegalLinks(ids){
  ids=[...new Set((ids||[]).filter(Boolean))]; if(!ids.length) return;
  try{ const {data}=await sb.from('v_legal_batch_link').select('batch_id,connected,batch_expiry,status,expiry_variants,connected_visa_id').in('batch_id',ids);
    (data||[]).forEach(r=>{ _LBL[r.batch_id]=r; }); }catch(_){}
}
function legalStatusChip(id){   // batch presence = its connected visa's status; static -> NO chip (honest)
  const l=_LBL[id]; if(!l||!l.connected||!l.status||l.status==='static') return '';
  const _w=l.expiry_variants>1?` <span class="law-flag" title="${LANG==='ar'?'تعارض في الدفعة — راجعها':'batch mismatch — review'}">⚑</span>`:'';
  return phaseChip(l.status)+_w;
}
function visaLegalCover(v){   // #Phase2b: from a visa, show the legal batch it keeps alive (the mirror)
  if(!v||v.visa_id==null) return '';
  const bid=Object.keys(_LBL).find(id=>_LBL[id]&&_LBL[id].connected&&_LBL[id].connected_visa_id===v.visa_id);
  if(!bid) return '';
  return `<div class="v-legal" data-lawgo="${esc(bid)}" style="cursor:pointer;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.08);font-size:13px;display:flex;align-items:center;gap:6px;flex-wrap:wrap"><span style="opacity:.7">${LANG==='ar'?'الغطاء القانوني':'Legal cover'}</span> ⚖ ${esc(bid)} ${legalStatusChip(bid)}</div>`;
}
function isStaticBatch(id){ const l=_LBL[id]; return !l || !l.connected || l.status==='static'; }   // no connecting visa yet → life unknown
function awaitingLabel(id){   // static presence → honest "pending; the visa that will time it hasn't landed"
  if(!isStaticBatch(id)) return '';
  return `<span class="lg-await" title="${LANG==='ar'?'لا فيزا مرتبطة بعد — تتحدد حياته عند ظهور الفيزا':'no connected visa yet — its life resolves when the visa appears'}">${LANG==='ar'?'⏳ بانتظار الفيزا':'⏳ awaiting visa'}</span>`;
}
function legalChipOrAwait(id){ return legalStatusChip(id) || awaitingLabel(id); }   // a visa timed it → phase chip; else the pending label
/* legal-section case filter — chips like the employee search; each batch bucketed by its case */
function _batchSectionCase(b){
  const l=_LBL[b.batch_id];
  if(l && l.status==='expired')  return 'expired';
  if(l && l.status==='active')   return 'active';
  if(l && l.status==='expiring') return 'expiring';
  return _batchFlagged(b) ? 'flag' : 'awaiting';   // static → flagged (review) or awaiting
}
// the stamp gate, batch-wide: every REQUIRED paper present AND trusted (all its stamps marked).
// Same rule the employee list uses for its legal gap — one definition, two places.
const _batchStampsDone=b=>ptKeys().filter(ptReq).every(k=>{ const x=batchPaper(b,k); return x.present&&x.trusted; });
// A filter matches on the batch's CASE (active/expiring/…) and may also inspect the batch itself —
// «أختام ناقصة» is a different dimension: a batch can be perfectly active and still miss a stamp.
const LAW_FILTERS=[
  {k:'all',      ar:'الكل',           en:'All',      match:()=>true},
  {k:'active',   ar:'ساري',           en:'Active',   match:c=>c==='active'},
  {k:'expiring', ar:'قارب الانتهاء',  en:'Expiring', match:c=>c==='expiring'},
  {k:'awaiting', ar:'بانتظار الفيزا', en:'Awaiting', match:c=>c==='awaiting'},
  {k:'nostamp',  ar:'أختام ناقصة',    en:'Missing stamps', match:(c,b)=>!_batchStampsDone(b)},
  {k:'flag',     ar:'مراجعة',         en:'Review',   match:c=>c==='flag'},
  {k:'expired',  ar:'الأرشيف',        en:'Archive',  match:c=>c==='expired'},
];
// ONE way to name a batch everywhere — a generated «~» id reads as its people, a real منح number
// reads as itself. (The employee's legal card used to print the raw «~…» id while the legal section
// showed the friendly label, so the same batch appeared under two different names.)
function batchName(b){ b=b||{}; const id=String(b.batch_id||''); return id.startsWith('~')?batchLabel(b):id; }
function renderLaw(rows){
  if(_lawBatch){ renderLawBatch(_lawBatch); return; }
  rows=rows||LAWLAST; const box=$('#results');
  { const sb2=$('#sortbar'); if(sb2) sb2.style.display=''; }     // back to the list → sorting applies again
  // classify every batch into a case, render filter chips (counts), then show the chosen case
  const cased=rows.map(b=>({b, c:_batchSectionCase(b)}));
  const bar=$('#filters');
  if(bar) bar.innerHTML=LAW_FILTERS.map(f=>{ const n=cased.filter(x=>f.match(x.c,x.b)).length;
    if(f.k!=='all' && !n) return '';
    return `<button class="fchip${LAW_FILTER===f.k?' on':''}" data-lf="${f.k}">${LANG==='ar'?f.ar:f.en}<span class="fc">${n}</span></button>`; }).join('');
  const F=LAW_FILTERS.find(f=>f.k===LAW_FILTER)||LAW_FILTERS[0];
  const _shownC=cased.filter(x=>F.match(x.c,x.b));   // keep {b,c}: the row reuses the case — no recomputing the flag per row
  $('#count').textContent=_shownC.length?t('n_res',_shownC.length):'';
  const addBtn=`<div class="law-actions"><button class="law-home" id="law-home">${t('law_main')}</button>
    <span class="law-actR"><span class="law-newwrap">
      <button class="law-add" id="law-add">＋ ${t('lg_manual_h')} <span class="law-caret">▾</span></button>
      <div class="law-menu" id="law-menu">
        <button data-new="istimara"><b>${t('mk_ist')}</b><em>${t('mk_ist_s')}</em></button>
        <button data-new="taahud"><b>${t('mk_taa')}</b><em>${t('mk_taa_s')}</em></button>
      </div></span></span></div>`;
  const _empty = LAW_FILTER==='all' ? t('law_none') : (LANG==='ar'?'لا دفعات في هذا التصنيف':'No batches in this filter');
  const body = !_shownC.length ? `<div class="empty">${_empty}</div>`
    : _shownC.map(({b,c})=>{ const s=lawPaperStatus(b);
    // the OLD ⚑ (law-flag) = a batch that can't connect to a منح (endpoint name missing); distinct from the timing flag below
    const _epGap=(b.interval_from==null||b.interval_to==null)||(!b.first_name&&!b.last_name);
    // timing flag (reuses the precomputed case c → no double _batchFlagged): static batch near/after a member's active visa
    const _mark=(c==='flag')
      ? `<span class="lg-flag2" title="${LANG==='ar'?'دفعة غير مرتبطة قرب فيزا سارية — راجعها':'unlinked batch near a valid visa — review'}">⚑ ${LANG==='ar'?'راجع':'review'}</span>`
      : legalChipOrAwait(b.batch_id);
    return `<div class="row law-row" data-batch="${esc(b.batch_id)}">
      <div class="ava law-ava">⚖</div>
      <div class="who"><div class="nm">${esc(batchName(b))} ${_mark}${_epGap?` <span class="law-flag" title="${esc(t('law_gaps',1))}">⚑</span>`:''}</div>
        <div class="sub">${t('law_covers')} ${esc(b.interval_from??'—')}–${esc(b.interval_to??'—')} · ${t('law_members',b.members.length)}</div></div>
      <div class="val law-pp">${ptKeys().map(k=>`<span class="lp-ok">${ptLabel(k)} ${s[k]}</span>`).join('')}</div>
      <button class="law-cardprint" data-lawprint="${esc(b.batch_id)}" title="${t('t_print')}"><span style="font-size:15px">⎙</span></button>
    </div>`; }).join('');
  box.innerHTML=addBtn+body;
  // «إدخال يدوي ▾» → one gentle menu: build an استمارة · build a تعهد · (or) record a batch by hand
  const la=$('#law-add'), lm=$('#law-menu');
  if(la&&lm){
    la.onclick=e=>{ e.stopPropagation(); lm.classList.toggle('on'); };
    lm.querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>{ lm.classList.remove('on');
      _IST=null; istimaraOpen(b.dataset.new); });   // a fresh sheet of that paper
    document.addEventListener('click',()=>lm.classList.remove('on'));   // click anywhere else = close
  }
  const lh=$('#law-home'); if(lh)lh.onclick=()=>setLaw(false);    // back to the main employee search
  if(bar) bar.querySelectorAll('[data-lf]').forEach(el=>el.onclick=()=>{ LAW_FILTER=el.getAttribute('data-lf'); renderLaw(rows); });
}
function openLawBatch(id){ const b=(LAWLAST||[]).find(x=>String(x.batch_id)===String(id)); if(!b)return; _lawBatch=b; renderLaw(); }
async function gotoLawBatch(id){ closeEmployee(); setLaw(true); await search(''); openLawBatch(id); }
async function lawFillName(b,i,name){   // fill a name the OCR missed → completes the record (review-flag action)
  name=String(name||'').trim(); if(!name)return; const m=b.members[i]; if(!m)return;
  try{
    let q=sb.from('legal_batch_members').update({name_as_written:name}).eq('batch_id',b.batch_id);
    q=(m.serial!=null)?q.eq('serial',+m.serial):q.eq('passport_no',m.passport_no||'');
    const {error}=await q; if(error)throw error;
    const patch={};   // an ENDPOINT name filled → refresh the stored label (which had fallen back to the passport)
    if(m.serial!=null){ if(+m.serial===+b.interval_from)patch.first_name=name; if(+m.serial===+b.interval_to)patch.last_name=name; }
    if(Object.keys(patch).length){ try{ await sb.from('legal_batches').update(patch).eq('batch_id',b.batch_id); }catch(_){}
      if(patch.first_name)b.first_name=name; if(patch.last_name)b.last_name=name; }
    m.name_as_written=name; toast(t('law_name_saved')); renderLawBatch(b);
  }catch(e){ toast(t('lg_savefail')+((e&&e.message)||e)); }
}
function renderLawBatch(b){
  const box=$('#results'); $('#count').textContent='';
  // Inside ONE batch there is nothing to order — the roster is fixed by serial. Hide the sort chips
  // (الرقم / الاسم / الأحدث) here; the list view restores them.
  { const sb2=$('#sortbar'); if(sb2) sb2.style.display='none'; }
  const s=lawPaperStatus(b);
  const brot=b.rot||{};
  const paper=(lab,status,scan,rd)=>`<div class="lb-paper"><span>${lab} <b>${status}</b></span>${scan?`<button class="lb-view" data-lawscan="${esc(scan)}" data-rot="${(+rd||0)}">${t('lg_view')} ›</button>`:''}</div>`;
  const _hasName=m=>!!(m.name_as_written&&String(m.name_as_written).trim());
  const _epSer=new Set([b.interval_from,b.interval_to].filter(v=>v!=null).map(Number));   // the two endpoints
  const _isEp=m=>m.serial!=null&&_epSer.has(+m.serial);
  const _canConnect=(b.interval_from!=null&&b.interval_to!=null)&&!!(b.first_name||b.last_name);   // منح-matchable: interval + ≥1 endpoint name
  // Only an ENDPOINT missing its name is a REAL issue: the منح matches by endpoint name (no passports),
  // so an unread endpoint would break its later match. A MIDDLE unread name doesn't affect matching —
  // show the passport quietly, no flag. → far fewer flags, same accuracy.
  const _epGaps=b.members.filter(m=>!_hasName(m)&&_isEp(m)).length;
  const mem=b.members.map((m,i)=>{ const noName=!_hasName(m), epGap=noName&&_isEp(m)&&!_canConnect;
    const nameCell = !noName ? `<span class="lb-nm">${esc(m.name_as_written)}</span>`
      : epGap ? `<span class="lb-nm gap"><input class="lb-fill" data-idx="${i}" placeholder="${esc(t('law_addname'))}" autocomplete="off"><button class="lb-fillbtn" data-idx="${i}" title="${esc(t('law_name_saved'))}">✓</button></span>`
              : `<span class="lb-nm soft" title="${esc(t('law_addname'))}">${esc(m.passport_no||'—')}</span>`;
    return `<div class="lb-mem${m.person_id?'':' orphan'}${epGap?' gaprow':''}"${(m.person_id&&!epGap)?` data-emp="${esc(m.person_id)}"`:''}>
      <span class="lb-ser">${epGap?'⚑ ':''}${esc(m.serial??'—')}</span>
      ${nameCell}
      <span class="lb-pp">${esc(m.passport_no||'—')}</span>
      <span class="lb-emp">${m.person_id?esc(m.person_id):t('law_orphan')}</span></div>`; }).join('');
  const gapNote=(!_canConnect)?`<div class="lb-gapnote">${t('law_gaps',_epGaps||1)}</div>`:'';
  box.innerHTML=`<div class="lb">
    <div class="lb-bar"><span style="display:flex;gap:8px">
      <button class="lb-back" id="lb-back">${t('law_back')}</button>
      <button class="lb-back" id="lb-home2">${t('law_main')}</button></span>
      <button class="lb-printbtn" id="lb-print"><span style="font-size:14px">⎙</span> ${t('t_print')}</button></div>
    <div class="lb-h">⚖ ${esc(batchName(b))} ${legalChipOrAwait(b.batch_id)}</div>
    <div class="lb-meta">${t('law_covers')} ${esc(b.interval_from??'—')}–${esc(b.interval_to??'—')} · ${t('law_members',b.members.length)}${b.manh_date?` · ${esc(b.manh_date)}`:''}</div>
    <div class="lb-block"><div class="lb-sub">${t('law_papersLbl')}</div>
      ${ptKeys().map(k=>paper(ptLabel(k),s[k],batchPaper(b,k).scan,brot[k])).join('')}</div>
    <div class="lb-sub">${t('law_roster')}</div>${gapNote}
    <div class="lb-roster">${mem}</div></div>`;
  $('#lb-back').onclick=()=>{ _lawBatch=null; renderLaw(LAWLAST); };
  { const h=$('#lb-home2'); if(h)h.onclick=()=>setLaw(false); }
  $('#lb-print').onclick=()=>printBatch(b);
  box.querySelectorAll('[data-lawscan]').forEach(el=>el.onclick=()=>legalViewScan(el.getAttribute('data-lawscan'), el.getAttribute('data-rot')));
  box.querySelectorAll('[data-emp]').forEach(el=>el.onclick=()=>openEmployee(el.getAttribute('data-emp')));
  box.querySelectorAll('.lb-fillbtn[data-idx]').forEach(btn=>btn.onclick=()=>{ const i=+btn.getAttribute('data-idx');
    const inp=box.querySelector(`.lb-fill[data-idx="${i}"]`); const v=inp&&inp.value.trim(); if(!v){ if(inp)inp.focus(); return; } lawFillName(b,i,v); });
  box.querySelectorAll('.lb-fill[data-idx]').forEach(inp=>inp.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); const i=+inp.getAttribute('data-idx'); const v=inp.value.trim(); if(v)lawFillName(b,i,v); } });
}

/* ── validity → ONE status engine: colour + icon + TEXT (WCAG 1.4.1), Carbon map,
      escalating yellow→orange, and an HONEST gray for missing/unknown data ────── */
function daysTo(d){if(!d)return null;const ms=new Date(d+'T00:00:00')-new Date();return Math.ceil(ms/864e5)}
function statusFromDays(days){
  if(days===null) return {k:'unknown',ic:'–',txt:t('incomplete')};                       // gray — no expiry on file
  if(days<0)      return {k:'expired',ic:'✕',txt:t('expired')};                           // red
  if(days<=30)    return {k:'crit',   ic:'!',txt:`${t('soon')} ${days}${LANG==='en'?t('day'):' '+t('day')}`}; // orange
  if(days<=90)    return {k:'soon',   ic:'!',txt:`${t('soon')} ${days}${LANG==='en'?t('day'):' '+t('day')}`}; // yellow
  return              {k:'valid',  ic:'✓',txt:t('valid')};                                // green
}
function statusChip(s){return `<span class="pill st-${s.k}"><span class="pi">${s.ic}</span>${s.txt}</span>`}
function pill(days){return statusChip(statusFromDays(days))}
// overall verdict across documents — worst-of, so an UNKNOWN surfaces (never a false "Valid")
function worstStatus(dates){
  const rank={expired:0,crit:1,soon:2,unknown:3,valid:4};
  const ss=dates.map(d=>statusFromDays(daysTo(d))); if(!ss.length)return statusFromDays(null);
  return ss.sort((a,b)=>rank[a.k]-rank[b.k])[0];
}
function initials(n){return (n||'—').split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase()}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));  // escapes ' too → airtight for single-quoted attrs; output is display-only (never parsed back), getAttribute decodes on read
let _urlCache={};
// #4 (safe face-reuse): cache the already-DECODED <img> element per storage path. On any re-render
// (filter click, chip switch, future filters) we MOVE the loaded element back in — instant pixels,
// NO network re-fetch, so NO flicker and NO expired-signed-URL risk. Render-level => every filter,
// present and future, is covered automatically. Bounded so memory stays flat.
const _faceEls=new Map();
function _faceCap(){ const CAP=600; while(_faceEls.size>CAP){ _faceEls.delete(_faceEls.keys().next().value); } }
async function faceUrl(path){
  if(!path)return null; if(_urlCache[path])return _urlCache[path];
  try{const {data}=await sb.storage.from('photos').createSignedUrl(path,3600);   // 1h — survives a long session
    if(data&&data.signedUrl){_urlCache[path]=data.signedUrl;return data.signedUrl}}catch(_){}
  return null;
}
/* Load an avatar the PRO way: PRE-load the image and only swap the initials for the photo
   once it truly loads. A missing/expired/broken crop then NEVER shows a broken-image icon —
   it silently keeps the clean initials. On error we also drop the (maybe stale) signed URL so
   the next render re-signs a fresh one (self-healing), and fall back thumb-crop → initials. */
function loadFace(el, path, clickable, fallback){
  if(!el) return;
  if(!path){ if(fallback) loadFace(el, fallback, clickable); return; }
  faceUrl(path).then(u=>{
    if(!u){ if(fallback) loadFace(el, fallback, clickable); return; }
    const img=new Image(); img.alt=''; if(PERF.asyncDecode){ img.decoding='async'; }   // #7 asyncDecode: decode off the main thread → no scroll stutter
    img.onload=()=>{ el.innerHTML=''; el.appendChild(img);
      if(PERF.faceReuse && !clickable){ _faceEls.set(path, img); _faceCap(); }   // #4: remember the decoded element
      if(clickable){ el.dataset.url=u; el.classList.add('clickable'); } };
    img.onerror=()=>{ delete _urlCache[path]; if(fallback) loadFace(el, fallback, clickable); };
    img.src=u;
  });
}
/* persons.photo points at the 96px THUMB (cheap for 40 row avatars). The sharp
   480px crop sits beside it as `…-full.jpg` (pipeline convention, no 2nd column).
   The big detail avatar must use the -full one, or 96→152px upscales to a blur. */
function fullFace(path){ return path ? path.replace(/\.jpg$/i,'-full.jpg') : null; }
/* Result filter — a registry, so a future dimension (nationality, doc type…) is just a new
   row here. Each entry matches on the row's overall status; counts are live off the results. */
const FILTERS=[
  {k:'all',        lab:'f_all',      match:()=>true},
  {k:'valid',      lab:'valid',      match:s=>s.k==='valid'},
  {k:'expiring',   lab:'f_expiring', match:s=>s.k==='soon'||s.k==='crit'},
  {k:'expired',    lab:'expired',    match:s=>s.k==='expired'},
  {k:'incomplete', lab:'incomplete', match:s=>s.k==='unknown'},
  {k:'legal',      lab:'f_legal',    match:(s,r)=>LEGAL_INCOMPLETE.has(r.person_id)},   // in a batch missing a stamped paper
];
let FILTER='all';
// second level of «غير مكتمل»: pick which side is missing. الكل = the whole incomplete set (missing passport OR
// visa); الجواز = no passport date; الفيزا = no current visa. Someone missing BOTH shows under both (counts overlap).
let INC_SIDE='all';
const INC_SIDES=[
  {k:'all',  lab:'inc_all',  match:()=>true},
  {k:'pass', lab:'inc_pass', match:r=>!r.passport_expiry},
  {k:'visa', lab:'inc_visa', match:r=>!r.soonest_visa_expiry},
];
/* who has a GAP in their legal file — a member of ≥1 batch where a paper isn't present-AND-stamped.
   Computed off the visible result set (one .in() query per search), so the chip counts live and a
   person with NO legal batch is never falsely flagged. */
let LEGAL_INCOMPLETE=new Set();
async function refreshLegalFlags(ids){
  LEGAL_INCOMPLETE=new Set();
  if(!ids.length)return;
  const {data,error}=await sb.from('legal_batch_members')
    .select('person_id, batch:legal_batches(*)')
    .in('person_id',ids);
  if(error)return;                                   // legal tables absent / no access → simply no chip
  (data||[]).forEach(m=>{ const b=m.batch||{}; if(!m.person_id)return;
    // complete = every REQUIRED registry paper is present AND trusted (all stamps marked)
    const complete = ptKeys().filter(ptReq).every(k=>{ const x=batchPaper(b,k); return x.present && x.trusted; });
    if(!complete) LEGAL_INCOMPLETE.add(m.person_id); });                          // any incomplete batch → gap
}
function rowStatus(r){ return worstStatus([r.passport_expiry,r.soonest_visa_expiry]); }
const _VCHUNK=60;                                   // rows in the first window; the rest stream in on scroll
let _vShown=[], _vCursor=0, _vObs=null;
function _rowHtml({r,s}){ return `<div class="row" data-id="${esc(r.person_id)}">
      <div class="ava" data-face="${esc(r.photo||'')}">${esc(initials(r.name))}</div>
      <div class="who">
        <div class="nm">${esc(r.name)}${r.name_native?`<span class="native">${esc(r.name_native)}</span>`:''}</div>
        <div class="sub"><span class="id">${esc(r.person_id)}</span> · ${esc(r.passport_no||'—')} · ${esc(r.nationality?tv(r.nationality):'—')}</div>
      </div>
      <div class="val">${statusChip(s)}</div>
    </div>`; }
function _vChunk(box){
  const end=Math.min(_vCursor+_VCHUNK, _vShown.length);
  const sen=box.querySelector('.v-sentinel'); if(sen)sen.remove();
  const tmp=document.createElement('div'); tmp.innerHTML=_vShown.slice(_vCursor,end).map(_rowHtml).join('');
  const toLoad=[];   // #6 faceBatch: faces needing a network load, gathered for ONE signed-URLs round-trip
  tmp.querySelectorAll('.ava[data-face]').forEach(el=>{ const p=el.getAttribute('data-face'); if(!p) return;
    if(PERF.faceReuse){ const c=_faceEls.get(p); if(c && c.complete && c.naturalWidth>0){ el.innerHTML=''; el.appendChild(c); return; } }  // #4: reuse decoded element — no re-fetch, no flicker
    toLoad.push({el,p}); });
  while(tmp.firstChild) box.appendChild(tmp.firstChild);   // rows paint instantly (initials); faces resolve next
  if(toLoad.length){
    const run=()=>toLoad.forEach(({el,p})=>loadFace(el,p));   // uncached → load once (loadFace caches it)
    if(PERF.faceBatch) primeFaceUrls(toLoad.map(x=>x.p)).then(run); else run();   // #6: one round-trip signs the whole window, then each resolves cache-hot
  }
  _vCursor=end;
  if(_vCursor<_vShown.length){
    box.insertAdjacentHTML('beforeend','<div class="v-sentinel" aria-hidden="true" style="height:1px"></div>');
    const s2=box.querySelector('.v-sentinel'); if(_vObs)_vObs.disconnect();
    _vObs=new IntersectionObserver(es=>{ if(es.some(e=>e.isIntersecting)) _vChunk(box); }, {rootMargin:'800px'});
    _vObs.observe(s2);
  } else if(_vObs){ _vObs.disconnect(); _vObs=null; }
}
let _rItems=null, _rRef=null;
const PERF={smartFlags:true, idlePoll:true, lazyPdf:true, faceReuse:true, faceBatch:true, asyncDecode:true, cvAuto:true};
try{ if(PERF.cvAuto) document.documentElement.classList.add('cv-auto'); }catch(_){}   // #8 cvAuto: browser skips layout/paint of off-screen rows
// #6 faceBatch: sign a WHOLE window of avatar URLs in ONE storage call (was: one createSignedUrl per row → ~60 round-trips/paint).
// Populates the same _urlCache faceUrl() reads first, so each subsequent loadFace() resolves with no network hop.
async function primeFaceUrls(paths){
  const need=[...new Set(paths.filter(p=>p&&!_urlCache[p]))];
  if(!need.length) return;
  try{ const {data}=await sb.storage.from('photos').createSignedUrls(need,3600);
    (data||[]).forEach(r=>{ if(r&&r.signedUrl&&!r.error) _urlCache[r.path]=r.signedUrl; }); }catch(_){}
}
let _pdfjsP=null;
function ensurePdfjs(){   // #5: load pdf.js only when a PDF is actually opened (not on every cold load)
  if(window.pdfjsLib) return Promise.resolve();
  if(_pdfjsP) return _pdfjsP;
  _pdfjsP=new Promise((res,rej)=>{
    const el=document.createElement('script');
    el.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    el.onload=()=>{ try{ pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; }catch(_){}; res(); };
    el.onerror=()=>{ _pdfjsP=null; rej(new Error('pdfjs load failed')); };
    document.head.appendChild(el);
  });
  return _pdfjsP;
}   // Phase G UI-smoothness flags (flip a key false to revert that seam)
/* ── list sort — minimalist: by number (EMP serial asc), by name, or newest (serial desc).
   Pure client-side: the EMP serial already tracks creation order, so "newest" = highest number first. */
let SORT=(()=>{try{const s=localStorage.getItem('iccmc_sort');return ['num','name','new'].includes(s)?s:'num'}catch(_){return'num'}})();
function _pidNum(id){ const m=String(id||'').match(/\d+/); return m?+m[0]:0; }
function sortRows(rows){ const a=(rows||[]).slice();
  if(SORT==='name') a.sort((x,y)=>String(x.name||'').localeCompare(String(y.name||''),undefined,{numeric:true,sensitivity:'base'}));
  else if(SORT==='new') a.sort((x,y)=>_pidNum(y.person_id)-_pidNum(x.person_id));   // newest first (highest EMP no.)
  else a.sort((x,y)=>_pidNum(x.person_id)-_pidNum(y.person_id));                      // by number, ascending
  return a; }
// the SAME three chips, applied to legal batches: الرقم = grant no. asc · الأحدث = grant no. desc · الاسم = lead member's name.
function _leadName(b){ const m=(b&&b.members)||[]; return m.length?String(m[0].name_as_written||''):''; }  // members are serial-asc → [0] is the lead
function sortLawRows(rows){ const a=(rows||[]).slice(); const num=(x,y)=>String(x.batch_id).localeCompare(String(y.batch_id),undefined,{numeric:true});
  if(SORT==='name') a.sort((x,y)=>_leadName(x).localeCompare(_leadName(y),undefined,{numeric:true,sensitivity:'base'}));
  else if(SORT==='new') a.sort((x,y)=>num(y,x));   // newest grant number first
  else a.sort(num);                                 // 'num' = grant number ascending
  return a; }
const SORT_OPTS=[{k:'num',ar:'الرقم',en:'No.'},{k:'name',ar:'الاسم',en:'Name'},{k:'new',ar:'الأحدث',en:'Newest'}];
function paintSort(){ const bar=$('#sortbar'); if(!bar)return;
  bar.style.display='';        // a batch view hides these; any repaint (search, language, back) restores them
  bar.innerHTML=`<span class="sort-lbl">${LANG==='ar'?'الترتيب':'Sort'}</span>`
    +SORT_OPTS.map(o=>`<button class="sort-opt${SORT===o.k?' on':''}" data-sort="${o.k}">${LANG==='ar'?o.ar:o.en}</button>`).join(''); }
function setSort(k){ if(k===SORT||!SORT_OPTS.some(o=>o.k===k))return; SORT=k; try{localStorage.setItem('iccmc_sort',k)}catch(_){}
  paintSort();
  if(LAWMODE){ LAWLAST=sortLawRows(LAWLAST); renderLaw(LAWLAST); }   // stay in the legal section, sort the batches
  else { LAST=sortRows(LAST); render(LAST); } }
function paintFilters(items){    // repaint ONLY the filter chips (counts) — no roster teardown
  const bar=$('#filters'); if(!bar) return;
  let html=FILTERS.map(f=>{
    const n=items.filter(x=>f.match(x.s,x.r)).length;
    if(f.k!=='all'&&!n) return '';
    return `<button class="fchip${FILTER===f.k?' on':''}" data-f="${f.k}">${t(f.lab)}<span class="fc">${n}</span></button>`;
  }).join('');
  // second level: «غير مكتمل» active → a tinted bracket that NAMES its parent, so it clearly belongs to that
  // chip (not the row). Counts are within the incomplete set only.
  if(FILTER==='incomplete'){
    const incF=FILTERS.find(f=>f.k==='incomplete');
    const inc=items.filter(x=>incF.match(x.s,x.r)).map(x=>x.r);
    const opts=INC_SIDES.map(sd=>{ const n=inc.filter(sd.match).length;
      if(sd.k!=='all'&&!n) return '';
      return `<button class="subchip${INC_SIDE===sd.k?' on':''}" data-inc="${sd.k}">${t(sd.lab)}<span class="fc">${n}</span></button>`;
    }).join('');
    html+=`<div class="subfilter"><div class="sf-box" role="group" aria-label="${esc(t('incomplete'))}">`
      +`<span class="sf-parent">${t('incomplete')}</span><span class="sf-div"></span>${opts}</div></div>`;
  }
  bar.innerHTML=html;
}
function render(rows){
  const box=$('#results');
  // status is computed ONCE per dataset — a filter-chip click re-renders the SAME rows, so reuse it
  // instead of re-parsing every row's dates again (a new search replaces LAST → recompute).
  let items;
  if(rows===_rRef && _rItems){ items=_rItems; }
  else { items=rows.map(r=>({r, s:rowStatus(r)})); _rItems=items; _rRef=rows; }
  // chips: hide an empty group (except All) so the bar stays minimal
  paintFilters(items);
  const F=FILTERS.find(f=>f.k===FILTER)||FILTERS[0];
  let shown=items.filter(x=>F.match(x.s,x.r));
  if(FILTER==='incomplete'&&INC_SIDE!=='all'){ const sd=INC_SIDES.find(s=>s.k===INC_SIDE); if(sd) shown=shown.filter(x=>sd.match(x.r)); }
  $('#count').textContent = rows.length ? t('n_res',shown.length) : '';
  if(!rows.length){box.innerHTML=`<div class="empty">${$('#q')&&$('#q').value?t('none'):t('all')}</div>`;return}
  if(!shown.length){box.innerHTML=`<div class="empty">${t('f_none')}</div>`;return}
  // VIRTUALISED: a first window of rows, then the next chunk streams in as the user scrolls near the bottom.
  // A small, ~constant number of nodes is built per search instead of thousands. Same visible output.
  if(_vObs){ _vObs.disconnect(); _vObs=null; }
  _vShown=shown; _vCursor=0; box.innerHTML='';
  _vChunk(box);
}

/* ── employee detail = the digital template (passport + visa + photo) ──────── */
const FL={
  name_latin:['الاسم','Name'], name_native:['الاسم (بالأصل)','Name (native)'],
  passport_no:['رقم الجواز','Passport No.'], passport_type:['النوع','Type'],
  passport_issue:['تاريخ الإصدار','Issued'], passport_expiry:['تاريخ الانتهاء','Expires'],
  dob:['تاريخ الميلاد','Date of birth'], sex:['الجنس','Sex'],
  nationality:['الجنسية','Nationality'], place_of_birth:['مكان الميلاد','Place of birth'],
  issuing_country:['بلد الإصدار','Issuing country'], issuing_authority:['جهة الإصدار','Issuing authority'],
  national_id_no:['الرقم الوطني','National ID'],
  visa_no:['رقم التأشيرة','Visa No.'], visa_type:['نوع التأشيرة','Visa type'],
  visa_country:['دولة التأشيرة','Visa country'], visa_issue:['تاريخ الإصدار','Issued'],
  visa_expiry:['تاريخ الانتهاء','Expires'], visa_entry_days:['صلاحية الدخول','Entry Validity'],
  visa_stay_days:['مدة الإقامة','Duration of stay'],
};
/* controlled-vocabulary VALUES are stored canonical-Arabic; translate them to the UI
   language at render (free text — names, places, authorities — is never translated). */
const VMAP={
  'ذكر':'Male','أنثى':'Female',
  'صينية':'Chinese','عراقية':'Iraqi','سورية':'Syrian','مصرية':'Egyptian','هندية':'Indian',
  'باكستانية':'Pakistani','فلبينية':'Filipino','تركية':'Turkish','إيرانية':'Iranian','أمريكية':'American',
  'الصين':'China','العراق':'Iraq','جمهورية العراق':'Republic of Iraq','سوريا':'Syria','مصر':'Egypt',
  'الهند':'India','باكستان':'Pakistan','الفلبين':'Philippines','تركيا':'Turkey','إيران':'Iran',
  'عمل':'Work','سياحة':'Tourism','إقامة':'Residence','دبلوماسية':'Diplomatic','دراسة':'Study'};
const CTRL=new Set(['sex','nationality','issuing_country','visa_country','visa_type']);
function tv(val){ return LANG==='ar' ? val : (VMAP[String(val).trim()]||val); }   // translate a value
function cell(k,val){ if(val==null||String(val).trim()==='')return '';
  const L=FL[k]; const lab=L?(LANG==='ar'?L[0]:L[1]):k;
  const disp=CTRL.has(k)?tv(val):val;
  return `<div class="cell"><label>${lab}</label><div class="v">${esc(disp)}</div></div>`; }
function badge(dateStr,estimated){
  return statusChip(statusFromDays(daysTo(dateStr)))+(estimated?`<span class="est">${t('t_est')}</span>`:''); }
/* A visa's validity is a RANGE (entry date unknown): floor = issue + مدة الإقامة,
   ceiling = issue + مدة الإقامة + صلاحية الدخول. Three phases — active (today<floor) ·
   expiring/uncertain (floor..ceiling; may already be expired, depends on entry date) · expired (today>ceiling). */
function phaseChip(status){
  if(status==='expired') return statusChip({k:'expired',ic:'✕',txt:t('expired')});
  if(status==='expiring'){
    const note=LANG==='ar'?'قد تكون منتهية — بحسب تاريخ الدخول':'may have expired — depends on entry date';
    return statusChip({k:'soon',ic:'!',txt:(LANG==='ar'?'قارب الانتهاء':'Expiring')})
      +`<span class="est" title="${esc(note)}">${LANG==='ar'?'بحسب الدخول':'per entry'}</span>`; }
  return statusChip({k:'valid',ic:'✓',txt:t('valid')});   // active — definitely valid
}
function visaPhase(v){
  const fl=v&&v.visa_valid_floor, ce=v&&v.visa_valid_ceiling;
  if(!fl||!ce) return statusChip(statusFromDays(null));   // missing inputs → honest gray (OCR gate prevents this going forward)
  const dFloor=daysTo(fl), dCeil=daysTo(ce);
  return phaseChip(dFloor>0?'active':(dCeil>=0?'expiring':'expired'));
}
async function openEmployee(pid){
  const [pr,vr,lr,dr]=await Promise.all([
    sb.from('persons').select('*').eq('person_id',pid).maybeSingle(),
    sb.from('visas').select('*').eq('person_id',pid),
    sb.from('legal_batch_members').select('*, batch:legal_batches(*)').eq('person_id',pid),
    // retired (superseded) PASSPORTS = the renewal history. person_documents is the PASSPORT SCD-2
    // ledger only; visas keep their own history in the `visas` table (a person can hold several valid
    // visas at once, which the single-current ledger can't model) — shown by visaHistCard below.
    sb.from('person_documents').select('doc_type,doc_no,issue_date,expiry_date,valid_to,scan_path')
      .eq('person_id',pid).eq('doc_type','passport').not('valid_to','is',null).order('valid_to',{ascending:false})]);
  const p=pr.data; if(!p){toast('—');return}
  const vs=(vr.data||[]).slice().sort((a,b)=>String(a.visa_expiry||'~').localeCompare(String(b.visa_expiry||'~')));
  const legal=lr.data||[];
  await loadLegalLinks(legal.map(m=>(m.batch&&m.batch.batch_id)||m.batch_id));
  CURRENT_P=p; CURRENT_VS=vs; CURRENT_LEGAL=legal;   // subject of the print dossier
  renderDetail(p,vs,legal,(dr&&dr.data)||[]); $('#detail').classList.add('on'); document.body.style.overflow='hidden';
  const av=$('#detail .d-face');
  // the big avatar loads the 480px crop (sharp at 152px), thumb as a fallback, initials if both
  // fail — never a broken icon. clickable+dataset.url is set only once an image truly loads, so a
  // missing crop can't open an empty lightbox. (the original scan is a PDF → never an <img> src.)
  loadFace(av, fullFace(p.photo), true, p.photo);
}
function closeEmployee(){$('#detail').classList.remove('on');document.body.style.overflow=''}
function openLightbox(url){if(!url)return;
  $('#lightbox').innerHTML=`<img src="${url}" alt="" onerror="this.closest('#lightbox').classList.remove('on')">`;
  $('#lightbox').classList.add('on')}
// visas: CURRENT vs HISTORY. The status is now a RECORDED fact — `visas.is_current`, maintained by
// the DB trigger trg_visas_maintain_current (one current per person+country; a renewal supersedes the
// old row with a superseded_by link + retired_at). We READ that flag instead of re-guessing from expiry.
// Shared by the detail card AND the print dossier so both show the same split.
function splitVisas(vs){
  const arr = vs||[];
  if(arr.some(v=>typeof v.is_current==='boolean'))                 // recorded status (every row, post-backfill)
    return { cur:arr.filter(v=>v.is_current!==false), hist:arr.filter(v=>v.is_current===false) };
  // defensive fallback for a row that somehow predates the flag: newest expiry per country = current.
  const byC={}; arr.forEach(v=>{ const c=v.visa_country||'—';
    if(!byC[c] || String(v.visa_expiry||'')>String(byC[c].visa_expiry||'')) byC[c]=v; });
  const cur=new Set(Object.values(byC));
  return { cur:arr.filter(v=>cur.has(v)), hist:arr.filter(v=>!cur.has(v)) };
}
function histCard(hist){
  // retired PASSPORTS from renewals (person_documents = passport ledger) — muted, current stays the
  // hero. Visa history is a separate card (visaHistCard) sourced from the visas table. None → hidden.
  if(!hist||!hist.length)return '';
  const rows=hist.map(h=>`<div class="hx-row${h.scan_path?' hx-open':''}"${h.scan_path?` data-scan="${esc(h.scan_path)}" role="button" tabindex="0" title="${t('hx_open')}"`:''}>
    <span class="hx-tp">${h.doc_type==='visa'?t('t_visa'):t('t_passport')}</span>
    <span class="hx-no">${esc(h.doc_no||'—')}</span>
    <span class="hx-dt" dir="ltr">${esc(h.issue_date||'—')}${h.expiry_date?' → '+esc(h.expiry_date):''}</span>
    <span class="hx-tag">${t('hx_retired')}</span></div>`).join('');
  return `<div class="doc hx-card"><div class="doc-h"><span class="doc-t">${t('hx_title')}</span><span class="hx-count">${hist.length}</span></div>${rows}</div>`;
}
function visaHistCard(hist){
  // superseded visas (an older visa for a country that now has a newer one) — muted history.
  if(!hist||!hist.length)return '';
  const rows=hist.map(v=>`<div class="hx-row${v.visa_scan?' hx-open':''}"${v.visa_scan?` data-scan="${esc(v.visa_scan)}" role="button" tabindex="0" title="${t('hx_open')}"`:''}>
    <span class="hx-tp">${esc(v.visa_country?tv(v.visa_country):t('t_visa'))}</span>
    <span class="hx-no">${esc(v.visa_no||'—')}</span>
    <span class="hx-dt" dir="ltr">${esc(v.visa_issue||'—')}${v.visa_expiry?' → '+esc(v.visa_expiry):''}</span>
    <span class="hx-tag">${t('hx_retired')}</span></div>`).join('');
  return `<div class="doc hx-card"><div class="doc-h"><span class="doc-t">${t('vhx_title')}</span><span class="hx-count">${hist.length}</span></div>${rows}</div>`;
}
function renderDetail(p,vs,legal,hist){
  const name=p.name_latin||p.name_native||'—';
  const {cur:curVisas, hist:histVisas}=splitVisas(vs);   // current up front, superseded → history
  // the CORE signal: overall validity = the WORST status across passport + every CURRENT visa.
  // Use the current visas only (splitVisas) — a superseded/expired visa lives in history and must
  // NOT drag this badge to expired, so the detail top badge agrees with the roster (which already
  // ranks by the current visa per country). A missing visa still counts as an unknown slot, so
  // "no visa on record" surfaces as gray "Incomplete" here exactly as in the listing.
  const verdict = `<div class="d-verdict">${statusChip(worstStatus([p.passport_expiry,...(curVisas.length?curVisas.map(v=>v.visa_expiry):[null])]))}</div>`;
  const P=['passport_no','passport_type','passport_issue','passport_expiry','dob','sex','nationality','place_of_birth','issuing_country','issuing_authority','national_id_no'];
  const V=['visa_no','visa_type','visa_country','visa_issue','visa_expiry','visa_entry_days','visa_stay_days'];
  const passportCard = P.some(k=>p[k]) ? `<div class="doc">
      <div class="doc-h"><span class="doc-t">${t('t_passport')}</span>${badge(p.passport_expiry)}${docViewBtn(p.passport_scan||p.id_scan)}</div>
      <div class="grid">${P.map(k=>cell(k,p[k])).join('')}</div></div>` : '';
  const visaCards = curVisas.length ? curVisas.map(v=>`<div class="doc">
      <div class="doc-h"><span class="doc-t">${t('t_visa')}</span>${visaPhase(v)}${docViewBtn(v.visa_scan)}</div>
      <div class="grid">${V.map(k=>cell(k,v[k])).join('')}</div>${visaLegalCover(v)}</div>`).join('')
    : `<div class="doc empty2">${t('t_novisa')}</div>`;
  $('#detail').innerHTML=`
    <div class="d-scroll"><div class="d-sheet">
      <div class="d-head">
        <div class="d-face">${initials(name)}</div>
        <div class="d-name">${esc(name)}${p.name_native?`<span class="native">${esc(p.name_native)}</span>`:''}</div>
        <div class="d-sub">${esc(p.nationality?tv(p.nationality):'—')}</div>
        ${verdict}
        <div class="d-acts">
          <button class="b-print d-print"><span style="font-size:15px">⎙</span> ${t('t_print')}</button>
          <button class="b-exit d-close">✕ ${t('t_close')}</button>
        </div>
      </div>
      ${passportCard}${visaCards}${legalCard(legal)}${histCard(hist)}${visaHistCard(histVisas)}${legalHistCard(legal)}
    </div></div>`;
  // عرض buttons (passport/visa cards) + retired-doc history rows → open the original scan in a new tab
  $('#detail').querySelectorAll('[data-scan]').forEach(el=>el.onclick=()=>openDocScan(el.getAttribute('data-scan')));
}
function docViewBtn(scan){ return scan?`<button class="doc-view" data-scan="${esc(scan)}" title="${LANG==='ar'?'عرض المستند الأصلي':'View the original document'}">${t('lg_view')} ›</button>`:''; }
async function openDocScan(path){ try{ if(!path)return; const u=await docUrl(path); if(u)window.open(u,'_blank','noopener'); }catch(_){} }

/* ── print dossier: cover → contents → details report (w/ photo) → raw passport → raw visa ──
   The raw scans live in the private `documents` bucket and are often PDFs, so a PDF is
   rasterized to an image via pdf.js. Everything degrades gracefully: no scan / no access
   → that page is simply omitted (a viewer without documents-read still gets cover+report). */
async function docUrl(path){ if(!path)return null;
  try{ const {data}=await sb.storage.from('documents').createSignedUrl(path,600);
    return (data&&data.signedUrl)||null; }catch(_){ return null; } }
// ── Word/Excel rendered IN-APP (docx-preview vendored + SheetJS), lazy-loaded on first use so the app
//    stays light. Used by the legal review viewer AND the print dossier — the browser then prints it. ──
const _libP={};
function _loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=()=>rej(new Error('script load failed: '+src)); document.head.appendChild(s); }); }
// load ONE lib on demand (cached). Per-format so a broken docx-preview can't stop Excel from rendering.
function ensureLib(kind){
  const G={jszip:'JSZip',xlsx:'XLSX',docx:'docx'}[kind];
  if(typeof window[G]!=='undefined') return Promise.resolve();
  if(!_libP[kind]){ const S={
      jszip:'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
      xlsx :'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
      docx :'assets/docx-preview.min.js?v=1' }[kind];
    _libP[kind]=_loadScript(S).catch(e=>{ _libP[kind]=null; throw e; }); }
  return _libP[kind];
}
// render the .docx/.xlsx at `path` into `el`. true = rendered; false = caller shows a download fallback.
// Logs the REAL reason on failure (console) so a prod-only issue is diagnosable, not silent.
async function renderOfficeDoc(path, el){
  if(!/\.(docx|xlsx)$/i.test(path||'')) return false;
  try{
    const url=await docUrl(path); if(!url){ console.warn('[office] no signed URL for', path); return false; }
    const buf=await (await fetch(url)).arrayBuffer();
    el.innerHTML='';
    if(/\.docx$/i.test(path)){
      await ensureLib('jszip'); await ensureLib('docx');
      await window.docx.renderAsync(new Blob([buf]), el, null,
        {className:'dxp', inWrapper:true, ignoreWidth:false, ignoreHeight:false, breakPages:true, experimental:true});
    }else{
      await ensureLib('xlsx');   // xlsx.full.min.js bundles its own unzip → no JSZip needed
      const wb=window.XLSX.read(buf,{type:'array'});
      // XSS note: sheet_to_html renders USER-uploaded Excel cells straight to HTML — it relies on SheetJS's
      // own cell HTML-escaping (standard behaviour). We trust that here; if SheetJS is ever swapped, re-verify.
      el.innerHTML=wb.SheetNames.map(n=>`<div class="xl-sheet">${window.XLSX.utils.sheet_to_html(wb.Sheets[n],{editable:false})}</div>`).join('');
    }
    return el.childElementCount>0;
  }catch(e){ console.warn('[office] render failed for', path, e); return false; }
}
function ensureDocLibs(){ return Promise.resolve(); }   // kept for compatibility; libs now load per-format
// render a .docx/.xlsx to an HTML STRING for the print dossier (rendered off-screen, then embedded so
// the browser's own print engine paginates it — no rasterizing, no server).
async function officeDocHtml(path){
  const el=document.createElement('div');
  return (await renderOfficeDoc(path, el)) ? el.innerHTML : null;
}
async function scanImage(path){
  if(!path)return null;
  if(/\.(xlsx|docx)$/i.test(path)) return null;      // Word/Excel isn't an image → rendered as its own office page
  const url=await docUrl(path); if(!url)return null;
  if(!/\.pdf$/i.test(path)) return url;              // already an image → use directly
  try{
    await ensurePdfjs();
    if(!window.pdfjsLib)return null;
    const buf=await (await fetch(url)).arrayBuffer();
    const pdf=await pdfjsLib.getDocument({data:buf}).promise;
    const page=await pdf.getPage(1);
    const vp=page.getViewport({scale:3.5});
    const c=document.createElement('canvas'); c.width=vp.width; c.height=vp.height;
    await page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
    return c.toDataURL('image/jpeg',0.95);
  }catch(e){ console.warn('pdf render',e); return null; }
}
/* render EVERY page of a scan (not just page 1). A legal تعهد/استمارة is a multi-page table — an
   employee can be on page 2+, so his row must be printed to PROVE he's in it (and to have a place to
   highlight). Returns an array of page images; a plain image is a single-element array. */
// SMART rotation: `upright` auto-detects a sideways page (landscape when a legal paper should be
// portrait) and stands ONLY that page up — a page already upright is never touched (no byproduct).
// rot = extra degrees the USER asked for (0/90/180/270), added to the page's own rotation. No auto-guess:
// a fallible detector wrongly flips upright TABLES (grid lines look like vertical text), so the human drives it.
async function scanImagesAll(path, rot, scale){
  rot=rot||0; scale=scale||3.5;                       // print uses 3.5; the review passes a higher DPI for deeper sharp zoom
  if(!path)return [];
  if(/\.(xlsx|docx)$/i.test(path)) return [];         // Word/Excel isn't an image → rendered as its own office page
  const url=await docUrl(path); if(!url)return [];
  if(!/\.pdf$/i.test(path)) return [url];             // already an image → one page
  try{
    await ensurePdfjs();
    if(!window.pdfjsLib)return [];
    const buf=await (await fetch(url)).arrayBuffer();
    const pdf=await pdfjsLib.getDocument({data:buf}).promise;
    const out=[];
    for(let n=1;n<=pdf.numPages;n++){
      const page=await pdf.getPage(n);
      const r=(((page.rotate||0)+rot)%360+360)%360;
      let vp=page.getViewport({scale, rotation:r});
      const mx=Math.max(vp.width,vp.height);          // clamp the canvas for memory (a big table at high DPI)
      if(mx>6800) vp=page.getViewport({scale:scale*6800/mx, rotation:r});
      const c=document.createElement('canvas'); c.width=vp.width; c.height=vp.height;
      await page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
      out.push(c.toDataURL('image/jpeg',0.95));
      c.width=c.height=0;                             // free the canvas promptly (multi-page big rosters)
    }
    return out;
  }catch(e){ console.warn('pdf render all',e); return []; }
}
/* ── printable-document REGISTRY ─────────────────────────────────────────────
   ADD A MOLD HERE and it flows automatically into the details report (a card),
   the raw-scan pages, AND the table of contents — no other edit to the print code.
     title/scanTitle — i18n keys for the report card heading + the raw-scan page/TOC row
     records(p,vs)   — the record(s) this doc reads from (one report card per record)
     has(r)          — include this card? (skips empty/absent documents)
     fields          — field keys to print, in order (labels resolve from FL)
     expiry/estimated(r) — drive the validity badge (optional)
     scan(r)         — Storage pointer to the raw scan → its own page (optional)
     empty           — i18n key for a "none on record" note when records is empty (optional) */
const PRINT_DOCS=[
  { title:'t_passport', scanTitle:'pv_passport',
    records:(p,vs)=>[p],
    has:r=>['passport_no','passport_type','passport_issue','passport_expiry','dob','sex','nationality','place_of_birth','issuing_country','issuing_authority','national_id_no'].some(k=>r[k]),
    fields:['passport_no','passport_type','passport_issue','passport_expiry','dob','sex','nationality','place_of_birth','issuing_country','issuing_authority','national_id_no'],
    expiry:r=>r.passport_expiry, scan:r=>r.passport_scan||r.id_scan },
  { title:'t_visa', scanTitle:'pv_visa', empty:'t_novisa',
    records:(p,vs)=>splitVisas(vs).cur, has:()=>true,   // CURRENT visas only — superseded ones are history, not printed
    fields:['visa_no','visa_type','visa_country','visa_issue','visa_expiry','visa_entry_days','visa_stay_days'],
    expiry:r=>r.visa_expiry, estimated:r=>r.visa_expiry_basis==='estimated', scan:r=>r.visa_scan },
];
async function buildDossier(){
  const p=CURRENT_P, vs=CURRENT_VS||[]; if(!p)return '';
  const name=p.name_latin||p.name_native||'—';
  const curVs=splitVisas(vs).cur;   // the dossier's overall status reflects CURRENT visas, not superseded ones
  const st=worstStatus([p.passport_expiry,...(curVs.length?curVs.map(v=>v.visa_expiry):[null])]);
  const face=await faceUrl(fullFace(p.photo)).then(u=>u||faceUrl(p.photo)).catch(()=>null);
  // the PRINT moment, in LOCAL time — date and time must agree (toISOString is UTC and drifts a day at night)
  let today='—', time=''; try{ const d=new Date(), p=n=>String(n).padStart(2,'0');
    today=`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; time=`${p(d.getHours())}:${p(d.getMinutes())}`; }catch(_){}
  const native=p.name_native?`<span class="native">${esc(p.name_native)}</span>`:'';
  const nat=p.nationality?esc(tv(p.nationality)):'—';
  const run=`<div class="pv-run"><b>ICCMC</b><span>${esc(name)}</span></div>`;  // running head
  // walk the registry → report cards + raw-scan tasks (each mold contributes both)
  let cards=''; const scanTasks=[];
  for(const d of PRINT_DOCS){
    const recs=d.records(p,vs).filter(r=>r&&d.has(r));
    if(!recs.length){ if(d.empty)cards+=`<div class="doc empty2">${t(d.empty)}</div>`; continue; }
    const multi=recs.length>1;
    recs.forEach((r,i)=>{ const tag=multi?` ${i+1}`:'';
      cards+=`<div class="doc"><div class="doc-h"><span class="doc-t">${t(d.title)}${tag}</span>${d.expiry?badge(d.expiry(r),d.estimated&&d.estimated(r)):''}</div><div class="grid">${d.fields.map(k=>cell(k,r[k])).join('')}</div></div>`;
      const sp=d.scan&&d.scan(r); if(sp)scanTasks.push({title:t(d.scanTitle)+tag, path:sp, isPassport:d.scanTitle==='pv_passport'});
    });
  }
  // LEGAL FILE — his batches (own list shape; appended after the passport/visa cards).
  // legalCard() only renders HIS batches with HIS serial, so in print each row is highlighted
  // yellow = "he is covered here". Any attached تعهد/استمارة/منح scans print as their own pages.
  const legal=CURRENT_LEGAL||[];
  if(legal.length){
    cards+=legalCard(legal);
    const seenB={};
    // clean TOC: just the paper name (التعهد / الاستمارة / المنح) — no ⚖, no batch number. The id is
    // appended plainly ONLY if this employee sits in more than one batch (to keep them apart).
    const multiB=new Set(legal.map(m=>(m.batch&&m.batch.batch_id)||m.batch_id)).size>1;
    legal.forEach(m=>{ const b=m.batch||{}; const id=b.batch_id||m.batch_id; if(seenB[id])return; seenB[id]=1;
      // legal papers are multi-page tables → print ALL pages (multi:true), so a worker on page 2+ is shown.
      // `hl` = where HIS row sits on that paper (from the member's boxes) → a yellow band in print.
      const bx=m.boxes||{}, rot=b.rot||{}, sfx=multiB?` ${id}`:'';
      if(b.taahud_scan)   scanTasks.push({title:`${t('lg_taahud')}${sfx}`,   path:_printPath(b.taahud_scan),   multi:true, rotDeg:rot.taahud||0, hl:bx.taahud});
      // الاستمارة may arrive sideways → the human's stored turn (rot) stands it up; its box isn't mapped to
      // that frame yet, so alongside the upright scan we keep a gentle professional NOTE of his serial.
      if(b.istimara_scan) scanTasks.push({title:`${t('lg_istimara')}${sfx}`, path:_printPath(b.istimara_scan), multi:true, rotDeg:rot.istimara||0,
                                          note:(m.serial!=null?t('pv_legal_note',name,m.serial):null)});
      if(b.manh_scan)     scanTasks.push({title:`${t('lg_manh')}${sfx}`,     path:_printPath(b.manh_scan),     multi:true, rotDeg:rot.manh||0});
    });
  }
  // render each scan → its page image(s). Legal scans render EVERY page (at their upright rotation);
  // passport/visa stay page 1.
  // personal photo → its own page «الصورة الشخصية», right AFTER the original passport scan.
  // uses the pre-resolved full-res face url; skipped when the employee has no photo.
  if(face){ const _pi=scanTasks.findIndex(s=>s.isPassport); scanTasks.splice(_pi>=0?_pi+1:0, 0, {title:t('pv_photo'), img:face, photo:true}); }
  const perTask=await Promise.all(scanTasks.map(s=>
    s.img ? Promise.resolve([s.img])
    : s.multi ? scanImagesAll(s.path, s.rotDeg||0) : scanImage(s.path).then(i=>i?[i]:[])));
  // flatten to printable pages, labelling a multi-page scan «title (p/N)»; carry the highlight onto its page
  const scanPages=[];
  scanTasks.forEach((s,i)=>{ const imgs=(perTask[i]||[]).filter(Boolean);
    imgs.forEach((img,pi)=>scanPages.push({title:imgs.length>1?`${s.title} (${pi+1}/${imgs.length})`:s.title, img,
      base:s.title, first:pi===0, photo:!!s.photo,
      hl: (s.hl && (s.hl.page||1)===(pi+1)) ? s.hl : null, note:s.note||null})); });
  // page numbers: cover 1 · contents 2 · report 3 · scans 4… — so the reader can track where he is
  const officeTasks=scanTasks.filter(s=>/\.(docx|xlsx)$/i.test(s.path||''));   // Word/Excel legal scans → office pages
  const total=3+scanPages.length+officeTasks.length;
  const foot=n=>`<div class="pv-foot"><span>${today}${time?` · ${time}`:''}</span><span class="pgn">${n} / ${total}</span></div>`;
  const report=`<div class="pg report">${run}<div class="pv-body">
      <div class="pv-head"><div class="pv-face">${face?`<img src="${face}" alt="">`:esc(initials(name))}</div>
        <div><div class="pv-name">${esc(name)}${native}</div>
          <div class="pv-sub">${nat}</div>${statusChip(st)}</div></div>
      ${cards}</div>${foot(3)}</div>`;
  // TOC: the report, then ONE row per activity at its FIRST page — a multi-page paper is listed once
  // (التعهد → its first page), never «(1/2) (2/2)». The pages themselves still show (p/N) to place the reader.
  const toc=[{k:t('pv_report'), pg:3}]; let scans='', pg=3;
  scanPages.forEach(s=>{ pg++;
    if(s.first) toc.push({k:s.base, pg});     // one clean entry per activity, at its first page
    if(s.photo){                              // the personal photo → centered portrait, not a full-bleed scan
      scans+=`<div class="pg scan">${run}<div class="pv-body"><div class="pv-h2">${esc(s.title)}</div>
        <div class="pv-photowrap"><img class="pv-photoimg" src="${s.img}" alt=""></div></div>${foot(pg)}</div>`;
      return;
    }
    // a yellow band across HIS row: a small vertical pad around the passport's y-range, full width
    const band=s.hl?`<div class="pv-hl" style="top:${Math.max(0,(s.hl.y0*100)-0.8).toFixed(2)}%;height:${(((s.hl.y1-s.hl.y0)*100)+1.6).toFixed(2)}%"></div>`:'';
    const note=s.note?`<div class="pv-note">${esc(s.note)}</div>`:'';
    scans+=`<div class="pg scan">${run}<div class="pv-body"><div class="pv-h2">${esc(s.title)}</div>
      ${note}<div class="pv-scanwrap">${band}<img class="pv-scan" src="${s.img}" alt=""></div></div>${foot(pg)}</div>`; });
  const tocRows=toc.map(e=>`<li><span>${e.k}</span><span class="tp">${e.pg}</span></li>`).join('');
  const cover=`<div class="pg cover">
      <div class="cv-top"><img class="cv-logo" src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjQ3IDE2MCA0ODIgMjU2Ij4KICA8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMjkuOC4yLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogMi4xLjEgQnVpbGQgMykgIC0tPgogIDxkZWZzPgogICAgPHN0eWxlPgogICAgICAuc3QwIHsKICAgICAgICBmaWxsOiAjZmZmOwogICAgICB9CiAgICA8L3N0eWxlPgogIDwvZGVmcz4KICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNTA3LjI1LDI4Mi4xMmwtMTIuNC4xNC0uMjYsMTYuMmMtLjI1LDE1LjM5LS4zMiwxNi4zNC0xLjQsMTkuMDYtNC4zNSwxMC45LTIxLjkxLDkuOTktMjUuMjctMS4zMS0xLjM0LTQuNTEtMS4wOC0xMTAuMDIuMjgtMTEzLjY2LDIuMjMtNS45NSw1LjQ1LTguMDQsMTIuNDQtOC4wNCwxMS4zOSwwLDEzLjk0LDQuNCwxMy45NiwyMy45NiwwLDguMjYuMTcsMTEuNjYuNiwxMi4wOC44NS44NiwyNC4zOC44NiwyNS4yMiwwLDEuNC0xLjQuMzctMjYuNzUtMS4zNy0zMy41NS01LjA5LTE5Ljk2LTIyLjE0LTMwLjI5LTQ1LjY0LTI3LjY0LTE5LjI3LDIuMTctMzAuOTIsMTMuOTctMzMuNjMsMzQuMDQtLjg4LDYuNTUtLjcsMTA4LjA3LjIsMTE0LDIuNTMsMTYuNTQsMTEuMSwyNi45NywyNS4zNiwzMC45NiwzLjY2LDEuMDQsNy43MSwxLjY0LDEyLjEyLDEuODEsNi41Ni4yNSwxMi4zOC0uMzUsMTcuNDgtMS44MSwxMy4xLTMuNzMsMjEuMzMtMTMuMSwyNC42NC0yOC4wNywxLjQtNi4zMiwyLjA2LTM2LjY1LjgzLTM3LjY4LS41Ny0uNDctMy44Mi0uNTgtMTMuMTYtLjQ5WiIvPgogIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0xMjkuODksMzQ4LjM2YzguMTcsMi44MSwxNy43NSwzLjExLDI3Ljk0LjQ5LjYxLS4xNiwxLjIxLS4zMiwxLjgtLjQ5LDE4Ljg2LTUuNDgsMjUuMjktMTcuODksMjUuNzMtNDguNzFsLjI1LTE3LTEuMTgtLjMyYy0xLjY1LS40NC0yMy40OC0uMzgtMjQuMTkuMDYtLjQuMjUtLjYzLDQuOTYtLjc4LDE2LjA3LS4xOSwxNS4wMS0uMjUsMTUuODQtMS4zNiwxOC42OS00LjE0LDEwLjYzLTIwLjMxLDExLjAzLTI1LjAyLjYybC0xLjE5LTIuNjF2LTExMS4xOGwxLjQxLTIuODdjMy4xMS02LjM0LDExLjUzLTguODUsMTguNzItNS41OCw2LjE2LDIuOCw3LjE1LDUuNzgsNy40MywyMi41M2wuMiwxMi41OWgxLjgzYzEsMCw2LjQyLjAzLDEyLjA0LjA1LDUuNjMuMDIsMTAuNjQsMCwxMS4xNSwwLDEuNDYtLjA3Ljk0LTI1LjctLjY0LTMxLjk1LTUuODUtMjMuMjEtMjUuODQtMzQuMTktNTEuMzktMjguMjMtNy4wNiwxLjY0LTE0LjUzLDUuNTktMTcuNjUsOS4zNC01LjM4LDYuNDUtNy42OSwxMS4wMi05LjY3LDE5LjE0LTEuMzMsNS40NC0xLjMsMTE2LjMyLjAzLDEyMS43NywzLjM1LDEzLjc4LDEyLjM5LDIzLjQ0LDI0LjUzLDI3LjZaIi8+CiAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTgzLjM0LDM0OC4zNnYtODguNzRjMC02Ljc0LDAtMTMuNDksMC0yMC4wN3YtNjguMzVoLTEzLjc4Yy0xLjgsMC0zLjYsMC01LjMsMGgtOS40NXY4OC45OWMwLDQuOCwwLDkuNTksMCwxNC4zM3Y3My44NWgyOC41MloiLz4KICA8Zz4KICAgIDxnPgogICAgICA8cmVjdCBjbGFzcz0ic3QwIiB4PSI1NC44MSIgeT0iMzkyLjM0IiB3aWR0aD0iMS43MiIgaGVpZ2h0PSIxMS41NSIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNjQuNywzOTguNjN2NS4yNmgxLjY2di01LjM4YzAtMS4wMi0uMy0xLjgxLS45LTIuMzUtLjYxLS41Ni0xLjQ4LS44NC0yLjYzLS44NC0xLjMsMC0yLjQ5LjI2LTMuNTkuNzd2Ny43OWgxLjY3di02Ljc0Yy41Ny0uMjgsMS4yMi0uNDIsMS45My0uNDIsMS4yNCwwLDEuODcuNjMsMS44NywxLjg5WiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNzEuNzIsNDA0LjA5Yy40NSwwLC44OS0uMDUsMS4zNC0uMTZsLS4xLTEuMzVjLS4yOC4wNy0uNjEuMTEtLjk2LjExLS44NiwwLTEuMjktLjUyLTEuMjktMS41NHYtNC4yN2gyLjA2di0xLjM2aC0yLjA2di0xLjk5bC0xLjY3LjA4djEuOTFoLTEuMTh2MS4zNmgxLjE4djQuMjljMCwxLjk1Ljg5LDIuOTIsMi42OCwyLjkyWiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNzUuMTIsMzk2LjUzYy0uNzIuODEtMS4wNywxLjg2LTEuMDcsMy4xNywwLDEuMzguMzksMi40NSwxLjE4LDMuMjIuNzguNzgsMS44NCwxLjE2LDMuMTcsMS4xNiwxLjA3LDAsMi4wMS0uMTksMi44NC0uNTdsLS4yOC0xLjM1Yy0uODEuMzQtMS42LjUxLTIuNDEuNTEtMS42OSwwLTIuNjMtLjg1LTIuNzktMi41N2g1LjYzYy4wNS0uNDIuMDYtLjc5LjA2LTEuMSwwLTEuMDgtLjMxLTEuOTYtLjkzLTIuNjQtLjYxLS42OC0xLjQ3LTEuMDItMi41Mi0xLjAyLTEuMjEsMC0yLjE2LjQtMi44OCwxLjIxWk03OS44NSwzOTguNzZjMCwuMTEsMCwuMi0uMDIuMjdoLTQuMDVjLjA3LS43My4zMS0xLjMuNjktMS43MS4zOC0uNDIuODktLjYyLDEuNTMtLjYyLjYsMCwxLjA2LjIsMS4zOC41OS4zMS4zOS40Ny44OC40NywxLjQ3WiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNODUuMjQsMzk3LjE2Yy41NC0uMjgsMS4xOC0uNDIsMS45Mi0uNDIuMzEsMCwuNi4wMy44My4xMWwuMjMtMS40MWMtLjM1LS4wNy0uNzUtLjExLTEuMTctLjExLTEuMzYsMC0yLjUyLjI3LTMuNDcuOHY3Ljc3aDEuNjd2LTYuNzRaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik05MS40MSwzOTcuMTZjLjU3LS4yOCwxLjIyLS40MiwxLjkzLS40MiwxLjI0LDAsMS44Ni42MywxLjg2LDEuODl2NS4yNmgxLjY3di01LjM4YzAtMS4wMi0uMzEtMS44MS0uOTEtMi4zNS0uNi0uNTYtMS40Ny0uODQtMi42Mi0uODQtMS4zLDAtMi41LjI2LTMuNi43N3Y3Ljc5aDEuNjd2LTYuNzRaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0xMDIuMDUsNDA0LjA5YzEuMzUsMCwyLjQ4LS4yNCwzLjM4LS43NnYtNC43M2MwLTEuMDYtLjI5LTEuODYtLjg2LTIuNDMtLjU2LS41Ni0xLjQyLS44NC0yLjU0LS44NC0xLjAzLDAtMS45My4xNi0yLjcuNDhsLjMyLDEuMzRjLjY3LS4yNywxLjQxLS40LDIuMjItLjQsMS4yOCwwLDEuOTMuNTksMS45MywxLjc4di42OWMtLjUzLS4xMi0xLjEyLS4xOS0xLjc0LS4xOS0uOTgsMC0xLjc3LjIyLTIuMzYuNjYtLjYuNDQtLjg5LDEuMDctLjg5LDEuODksMCwuNzYuMjgsMS4zNi44NCwxLjgxLjU2LjQ3LDEuMzYuNjksMi40Mi42OVpNMTAyLjI0LDQwMC4xM2MuNSwwLDEuMDIuMDYsMS41NS4ydjIuMTZjLS4zOS4yMy0uOTMuMzUtMS42LjM1LTEuMTYsMC0xLjczLS40NC0xLjczLTEuMzJzLjU5LTEuMzksMS43OC0xLjM5WiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMTA4LjEyLDQwMS4xN2MwLDEuOTUuODksMi45MiwyLjY3LDIuOTIuNDUsMCwuOS0uMDUsMS4zNC0uMTZsLS4xLTEuMzVjLS4yOC4wNy0uNi4xMS0uOTYuMTEtLjg1LDAtMS4yOC0uNTItMS4yOC0xLjU0di00LjI3aDIuMDZ2LTEuMzZoLTIuMDZ2LTEuOTlsLTEuNjcuMDh2MS45MWgtMS4xOXYxLjM2aDEuMTl2NC4yOVoiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTExNS4zNywzOTIuMzNjLS4xOS0uMTktLjQ0LS4yNy0uNzUtLjI3cy0uNTcuMDgtLjc2LjI3Yy0uMTkuMTktLjI4LjQzLS4yOC43MiwwLC4zMS4wOS41Ni4yNy43NS4xOC4xOC40NC4yNy43Ny4yN3MuNTYtLjEuNzUtLjI3Yy4xOC0uMTkuMjctLjQ0LjI3LS43NSwwLS4yOS0uMS0uNTMtLjI3LS43MloiLz4KICAgICAgPHJlY3QgY2xhc3M9InN0MCIgeD0iMTEzLjc5IiB5PSIzOTUuNTIiIHdpZHRoPSIxLjY3IiBoZWlnaHQ9IjguMzciLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTEyNS40MSwzOTkuN2MwLTEuMzItLjM1LTIuMzktMS4wNS0zLjE4LS43LS44MS0xLjY2LTEuMi0yLjg4LTEuMnMtMi4xNy4zOS0yLjg3LDEuMmMtLjY5Ljc5LTEuMDUsMS44NS0xLjA1LDMuMThzLjM1LDIuMzksMS4wNSwzLjE5Yy43LjgsMS42NiwxLjE5LDIuODcsMS4xOXMyLjE4LS4zOSwyLjg4LTEuMTljLjctLjgsMS4wNS0xLjg2LDEuMDUtMy4xOVpNMTIzLjE0LDQwMS44OWMtLjM2LjUyLS45Mi44LTEuNjUuOHMtMS4yNy0uMjctMS42NS0uOGMtLjM3LS41NC0uNTYtMS4yNy0uNTYtMi4xOXMuMTktMS42NC41Ni0yLjE3Yy4zOS0uNTQuOTMtLjgsMS42NS0uOHMxLjI3LjI2LDEuNjQuNzhjLjM4LjUzLjU2LDEuMjYuNTYsMi4xOHMtLjE5LDEuNjYtLjU2LDIuMTlaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0xMzEuMDksMzk1LjMzYy0xLjMsMC0yLjQ5LjI2LTMuNTkuNzd2Ny43OWgxLjY3di02Ljc0Yy41Ny0uMjgsMS4yMi0uNDIsMS45My0uNDIsMS4yNSwwLDEuODcuNjMsMS44NywxLjg5djUuMjZoMS42N3YtNS4zOGMwLTEuMDItLjMxLTEuODEtLjkxLTIuMzUtLjYtLjU2LTEuNDgtLjg0LTIuNjMtLjg0WiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMTM5Ljc4LDQwNC4wOWMxLjM3LDAsMi41LS4yNCwzLjM5LS43NnYtNC43M2MwLTEuMDYtLjI5LTEuODYtLjg2LTIuNDMtLjU3LS41Ni0xLjQyLS44NC0yLjU0LS44NC0xLjA0LDAtMS45NC4xNi0yLjcxLjQ4bC4zMywxLjM0Yy42Ny0uMjcsMS40MS0uNCwyLjIxLS40LDEuMjksMCwxLjkzLjU5LDEuOTMsMS43OHYuNjljLS41NC0uMTItMS4xMi0uMTktMS43Ni0uMTktLjk4LDAtMS43Ni4yMi0yLjM1LjY2LS42LjQ0LS44OSwxLjA3LS44OSwxLjg5LDAsLjc2LjI4LDEuMzYuODUsMS44MS41Ni40NywxLjM2LjY5LDIuNC42OVpNMTM5Ljk5LDQwMC4xM2MuNTEsMCwxLjAyLjA2LDEuNTYuMnYyLjE2Yy0uMzkuMjMtLjkzLjM1LTEuNi4zNS0xLjE2LDAtMS43NC0uNDQtMS43NC0xLjMycy42LTEuMzksMS43OC0xLjM5WiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMTQ1LjY0LDM5Mi4wNHY5LjJjMCwxLjkuNzcsMi44NCwyLjM1LDIuODQuMzEsMCwuNjMtLjAzLjk0LS4xMWwtLjE0LTEuMzRjLS4xNC4wMy0uMjkuMDYtLjQ4LjA2LS4zNiwwLS42My0uMTItLjc3LS4zNS0uMTUtLjI0LS4yMy0uNi0uMjMtMS4xMnYtOS4yOGwtMS42Ny4xWiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMTU5LjM1LDM5My42N2MuNjIsMCwxLjQzLjE4LDIuMzkuNTNsLjM5LTEuNDljLS45NC0uMzgtMS44OC0uNTctMi44MS0uNTctMS43MiwwLTMuMDUuNTYtMy45NSwxLjY3LS45LDEuMS0xLjM2LDIuNTktMS4zNiw0LjQycy40NiwzLjIzLDEuMzgsNC4yOGMuOTIsMS4wNSwyLjIzLDEuNTcsMy45MywxLjU3LDEuMDksMCwyLjA2LS4yMSwyLjkxLS42NWwtLjM1LTEuNWMtLjg0LjQxLTEuNjcuNjItMi40OS42Mi0xLjIyLDAtMi4xMS0uMzgtMi43MS0xLjE0LS42LS43Ni0uODktMS44My0uODktMy4yMXMuMjktMi40OS44Ny0zLjNjLjU4LS44MiwxLjQ3LTEuMjMsMi42OC0xLjIzWiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMTcxLjM2LDQwMy44OXYtNS4zOGMwLTEuMDEtLjMtMS43OC0uODktMi4zNS0uNi0uNTYtMS40My0uODQtMi40Ny0uODQtLjc4LDAtMS40OC4xNi0yLjEuNDh2LTMuODZsLTEuNjcuMDh2MTEuODdoMS42N3YtNi42N2MuNTYtLjMxLDEuMTktLjQ4LDEuODYtLjQ4LDEuMjcsMCwxLjkyLjY0LDEuOTIsMS45djUuMjVoMS42OFoiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTE3NS40OSwzOTIuMzNjLS4xOS0uMTktLjQ0LS4yNy0uNzYtLjI3cy0uNTcuMDgtLjc2LjI3Yy0uMTkuMTktLjI3LjQzLS4yNy43MiwwLC4zMS4wOS41Ni4yNy43NS4xOS4xOC40NC4yNy43Ny4yN3MuNTctLjEuNzYtLjI3Yy4xOC0uMTkuMjctLjQ0LjI3LS43NSwwLS4yOS0uMDktLjUzLS4yNy0uNzJaIi8+CiAgICAgIDxyZWN0IGNsYXNzPSJzdDAiIHg9IjE3My45MSIgeT0iMzk1LjUyIiB3aWR0aD0iMS42NiIgaGVpZ2h0PSI4LjM3Ii8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0xNzguMTgsMzk2LjF2Ny43OWgxLjY3di02Ljc0Yy41Ny0uMjgsMS4yMi0uNDIsMS45My0uNDIsMS4yNCwwLDEuODYuNjMsMS44NiwxLjg5djUuMjZoMS42N3YtNS4zOGMwLTEuMDItLjMxLTEuODEtLjkxLTIuMzUtLjYtLjU2LTEuNDctLjg0LTIuNjItLjg0LTEuMywwLTIuNS4yNi0zLjYuNzdaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0xOTEuNjYsNDA0LjA5YzEuMDcsMCwyLjAyLS4xOSwyLjg0LS41N2wtLjI3LTEuMzVjLS44MS4zNC0xLjYuNTEtMi40MS41MS0xLjcsMC0yLjYzLS44NS0yLjc5LTIuNTdoNS42M2MuMDUtLjQyLjA2LS43OS4wNi0xLjEsMC0xLjA4LS4zMS0xLjk2LS45My0yLjY0LS42My0uNjgtMS40Ny0xLjAyLTIuNTQtMS4wMi0xLjE5LDAtMi4xNS40LTIuODcsMS4yMS0uNzIuODEtMS4wNywxLjg2LTEuMDcsMy4xNywwLDEuMzguMzksMi40NSwxLjE4LDMuMjIuNzkuNzgsMS44NSwxLjE2LDMuMTgsMS4xNlpNMTg5LjczLDM5Ny4zMmMuMzgtLjQyLjg5LS42MiwxLjUyLS42MnMxLjA2LjIsMS4zOC41OWMuMzEuMzkuNDguODguNDgsMS40NywwLC4xMSwwLC4yLS4wMi4yN2gtNC4wNGMuMDctLjczLjMtMS4zLjY5LTEuNzFaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yMDAuMTQsNDAyLjQxYy0uMjkuMTktLjY5LjI4LTEuMTguMjgtLjg1LDAtMS43MS0uMTgtMi42LS41MmwtLjI0LDEuNGMuODEuMzUsMS43Ni41MSwyLjg0LjUxLjk4LDAsMS43Ny0uMiwyLjM2LS42My42LS40My44OS0xLjA0Ljg5LTEuODUsMC0uNjktLjIyLTEuMjMtLjY2LTEuNi0uNDQtLjM4LTEuMTQtLjctMi4xMy0uOTgtLjU5LS4xOC0xLS4zNS0xLjI0LS41MS0uMjUtLjE3LS4zNy0uNDMtLjM3LS43NywwLS42OS40OS0xLjAyLDEuNDgtMS4wMi41NiwwLDEuMy4xMywyLjIxLjRsLjItMS4zN2MtLjcxLS4yOS0xLjU1LS40NC0yLjUzLS40NHMtMS42OS4yMS0yLjIyLjY0Yy0uNTMuNDItLjgsMS4wMy0uOCwxLjgzLDAsLjY4LjIxLDEuMjEuNjIsMS41OC40Mi4zNywxLjAxLjY4LDEuOC45Ljc3LjIzLDEuMjkuNDIsMS41Ny41OS4yOC4xOC40My40My40My43N3MtLjE1LjU4LS40NC43N1oiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTIxMC42OCw0MDMuNTFsLS4yOC0xLjM1Yy0uODEuMzQtMS42LjUxLTIuNDIuNTEtMS42OSwwLTIuNjItLjg1LTIuNzgtMi41N2g1LjYzYy4wNC0uNDIuMDYtLjc5LjA2LTEuMSwwLTEuMDgtLjMxLTEuOTYtLjkzLTIuNjQtLjYzLS42OC0xLjQ3LTEuMDItMi41NC0xLjAyLTEuMTksMC0yLjE2LjQtMi44NywxLjIxLS43Mi44MS0xLjA4LDEuODYtMS4wOCwzLjE3LDAsMS4zOC40LDIuNDUsMS4xOCwzLjIyLjc5Ljc4LDEuODUsMS4xNiwzLjE4LDEuMTYsMS4wNywwLDIuMDEtLjE5LDIuODQtLjU3Wk0yMDUuOSwzOTcuMzJjLjM4LS40Mi44OS0uNjIsMS41Mi0uNjJzMS4wNi4yLDEuMzguNTljLjMyLjM5LjQ4Ljg4LjQ4LDEuNDcsMCwuMTEsMCwuMi0uMDIuMjdoLTQuMDRjLjA4LS43My4zMS0xLjMuNjktMS43MVoiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTIyMS43MSwzOTMuNjdjLjY0LDAsMS40My4xOCwyLjM5LjUzbC40LTEuNDljLS45My0uMzgtMS44Ny0uNTctMi44LS41Ny0xLjczLDAtMy4wNS41Ni0zLjk2LDEuNjctLjkxLDEuMS0xLjM1LDIuNTktMS4zNSw0LjQycy40NSwzLjIzLDEuMzgsNC4yOGMuOTEsMS4wNSwyLjIyLDEuNTcsMy45MywxLjU3LDEuMDcsMCwyLjA0LS4yMSwyLjktLjY1bC0uMzUtMS41Yy0uODQuNDEtMS42Ny42Mi0yLjQ5LjYyLTEuMjEsMC0yLjExLS4zOC0yLjcxLTEuMTRzLS44OS0xLjgzLS44OS0zLjIxLjI5LTIuNDkuODYtMy4zYy41Ny0uODIsMS40Ny0xLjIzLDIuNjgtMS4yM1oiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTIyNi43MywzOTYuNTNjLS43Ljc5LTEuMDUsMS44NS0xLjA1LDMuMThzLjM1LDIuMzksMS4wNSwzLjE5Yy43LjgsMS42NSwxLjE5LDIuODcsMS4xOXMyLjE4LS4zOSwyLjg4LTEuMTljLjY5LS44LDEuMDUtMS44NiwxLjA1LTMuMTlzLS4zNS0yLjM5LTEuMDUtMy4xOGMtLjctLjgxLTEuNjYtMS4yLTIuODgtMS4ycy0yLjE3LjM5LTIuODcsMS4yWk0yMzEuMjUsMzk3LjUyYy4zNy41My41NiwxLjI2LjU2LDIuMThzLS4xOCwxLjY2LS41NSwyLjE5Yy0uMzcuNTItLjkzLjgtMS42Ni44cy0xLjI3LS4yNy0xLjY0LS44Yy0uMzktLjU0LS41Ny0xLjI3LS41Ny0yLjE5cy4xOS0xLjY0LjU3LTIuMTdjLjM4LS41NC45My0uOCwxLjY0LS44czEuMjcuMjYsMS42NS43OFoiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTI0NC4zMSwzOTUuMzNjLS45NywwLTEuOTEuMjYtMi44MS43Ni0uNTctLjUtMS4zNi0uNzYtMi4zNi0uNzYtMS4yNiwwLTIuNDMuMjYtMy41NC43N3Y3Ljc5aDEuNjd2LTYuNzRjLjU1LS4yOCwxLjE0LS40MiwxLjgtLjQyLDEuMTksMCwxLjc4LjYzLDEuNzgsMS44OXY1LjI2aDEuNjR2LTUuMDljMC0uNTgtLjA3LTEuMDgtLjIyLTEuNTEuNTktLjM4LDEuMjUtLjU2LDEuOTktLjU2LDEuMTksMCwxLjc5LjYzLDEuNzksMS44OXY1LjI2aDEuNjd2LTUuMzhjMC0xLjAxLS4yOC0xLjc4LS44Ni0yLjM1LS41OC0uNTYtMS40Mi0uODQtMi41NC0uODRaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yNTEuODcsNDAzLjc1Yy41Mi4yMiwxLjA4LjMzLDEuNjcuMzMsMS4yOSwwLDIuMjgtLjQxLDIuOTgtMS4yNC42OS0uODIsMS4wNS0xLjkzLDEuMDUtMy4zLDAtMS4zLS4zNS0yLjMyLTEuMDctMy4wOC0uNzItLjc2LTEuNzItMS4xNC0zLjAyLTEuMTQtMS4xNywwLTIuMjYuMjUtMy4yNi43NHYxMC45aDEuNjZ2LTMuMjJaTTI1MS44NywzOTcuMDdjLjUtLjIzLDEtLjM0LDEuNTItLjM0LjgyLDAsMS40My4yNSwxLjg0Ljc3LjQuNTIuNiwxLjIxLjYsMi4wNywwLDIuMDctLjg1LDMuMTEtMi41MiwzLjExLS40NSwwLS45My0uMTItMS40NC0uMzZ2LTUuMjVaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yNjIuMywzOTkuMDNjLS45OCwwLTEuNzYuMjItMi4zNS42Ni0uNi40NC0uODksMS4wNy0uODksMS44OSwwLC43Ni4yOCwxLjM2Ljg1LDEuODEuNTYuNDcsMS4zNi42OSwyLjQuNjksMS4zNywwLDIuNS0uMjQsMy4zOS0uNzZ2LTQuNzNjMC0xLjA2LS4yOS0xLjg2LS44Ni0yLjQzLS41Ny0uNTYtMS40Mi0uODQtMi41NC0uODQtMS4wNCwwLTEuOTQuMTYtMi43MS40OGwuMzMsMS4zNGMuNjctLjI3LDEuNC0uNCwyLjIxLS40LDEuMjksMCwxLjkzLjU5LDEuOTMsMS43OHYuNjljLS41NS0uMTItMS4xMi0uMTktMS43Ni0uMTlaTTI2NC4wNiw0MDIuNDljLS4zOS4yMy0uOTMuMzUtMS42LjM1LTEuMTUsMC0xLjczLS40NC0xLjczLTEuMzJzLjYtMS4zOSwxLjc4LTEuMzljLjUxLDAsMS4wMi4wNiwxLjU2LjJ2Mi4xNloiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTI3NS4zMSw0MDMuODl2LTUuMzhjMC0xLjAyLS4zLTEuODEtLjktMi4zNS0uNjEtLjU2LTEuNDgtLjg0LTIuNjMtLjg0LTEuMywwLTIuNS4yNi0zLjU5Ljc3djcuNzloMS42N3YtNi43NGMuNTYtLjI4LDEuMjItLjQyLDEuOTMtLjQyLDEuMjQsMCwxLjg3LjYzLDEuODcsMS44OXY1LjI2aDEuNjZaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yNzcuMTYsNDA1LjVsLjI4LDEuNDRjMS43Ni0uMzUsMy4yMS0xLjUyLDQuMzQtMy41MSwxLjQ3LTIuNjUsMi4zNi01LjI5LDIuNjUtNy45MWgtMS42N2MtLjEyLDEuMzUtLjMzLDIuNTMtLjY0LDMuNTUtLjMsMS4wMi0uNzMsMi4wOS0xLjI3LDMuMTktLjYzLTEuMDYtMS4xNC0yLjExLTEuNTEtMy4xNy0uMzktMS4wNi0uNjQtMi4yNC0uNzYtMy41N2gtMS42OGMuMTYsMS41Ni40OCwyLjk2Ljk4LDQuMjIuNDgsMS4yNiwxLjE4LDIuNTMsMi4wOSwzLjgtLjY0LDEuMDYtMS41OCwxLjcyLTIuODIsMS45NloiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTI5MC4yNyw0MDMuODloMS42N3YtNy4wMWgyLjExdi0xLjM2aC0yLjExdi0uN2MwLTEuMDcuNDMtMS42LDEuMjgtMS42LjE5LDAsLjUxLjAzLjk0LjExbC4yOC0xLjMyYy0uNTctLjEzLTEuMDctLjE5LTEuNDgtLjE5LS45LDAtMS41OC4yNy0yLjAyLjgxLS40NS41NC0uNjcsMS4yOC0uNjcsMi4yM3YuNjdoLTEuMTl2MS4zNmgxLjE5djcuMDFaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yOTguODcsNDA0LjA5YzEuMjIsMCwyLjE4LS4zOSwyLjg4LTEuMTkuNy0uOCwxLjA1LTEuODYsMS4wNS0zLjE5cy0uMzUtMi4zOS0xLjA1LTMuMThjLS42OS0uODEtMS42Ni0xLjItMi44OC0xLjJzLTIuMTcuMzktMi44NiwxLjJjLS43Ljc5LTEuMDYsMS44NS0xLjA2LDMuMThzLjM1LDIuMzksMS4wNiwzLjE5Yy42OS44LDEuNjUsMS4xOSwyLjg2LDEuMTlaTTI5Ny4yMywzOTcuNTNjLjM3LS41NC45Mi0uOCwxLjY0LS44czEuMjguMjYsMS42NS43OGMuMzcuNTMuNTYsMS4yNi41NiwyLjE4cy0uMTksMS42Ni0uNTYsMi4xOWMtLjM2LjUyLS45Mi44LTEuNjUuOHMtMS4yNy0uMjctMS42NC0uOGMtLjM5LS41NC0uNTctMS4yNy0uNTctMi4xOXMuMTktMS42NC41Ny0yLjE3WiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzA2LjU5LDM5Ny4xNmMuNTUtLjI4LDEuMTgtLjQyLDEuOTItLjQyLjMyLDAsLjU5LjAzLjgzLjExbC4yMy0xLjQxYy0uMzUtLjA3LS43NC0uMTEtMS4xNy0uMTEtMS4zNywwLTIuNTIuMjctMy40Ny44djcuNzdoMS42NnYtNi43NFoiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTMyNS4yOCw0MDMuODloMS42MXYtMTEuNTVoLTEuOGMtMS4wOCwyLjY0LTIuNDQsNS4yOS00LjA5LDcuOTUtMS43MS0yLjczLTMuMDktNS4zOC00LjE0LTcuOTVoLTEuNzh2MTEuNTVoMS42di02LjY4YzAtLjcyLS4wMy0xLjM3LS4xLTEuOTUsMS4wNCwyLjI2LDIuMjcsNC41MiwzLjcyLDYuNzVoMS40YzEuNS0yLjM0LDIuNzItNC41OSwzLjY3LTYuNzQtLjA2LjY2LS4wOCwxLjMtLjA4LDEuOTN2Ni42OFoiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTMzNi41LDM5OC45OWMwLTEuMDgtLjMyLTEuOTYtLjkzLTIuNjQtLjYzLS42OC0xLjQ3LTEuMDItMi41NC0xLjAyLTEuMTksMC0yLjE2LjQtMi44NywxLjIxLS43Mi44MS0xLjA3LDEuODYtMS4wNywzLjE3LDAsMS4zOC4zOSwyLjQ1LDEuMTgsMy4yMi43OS43OCwxLjg1LDEuMTYsMy4xOCwxLjE2LDEuMDcsMCwyLjAxLS4xOSwyLjg0LS41N2wtLjI4LTEuMzVjLS44MS4zNC0xLjYxLjUxLTIuNDEuNTEtMS42OSwwLTIuNjMtLjg1LTIuNzktMi41N2g1LjYzYy4wNC0uNDIuMDctLjc5LjA3LTEuMVpNMzM0Ljg3LDM5OS4wM2gtNC4wNWMuMDgtLjczLjMxLTEuMy42OS0xLjcxLjM4LS40Mi44OS0uNjIsMS41Mi0uNjJzMS4wNi4yLDEuMzguNTljLjMxLjM5LjQ4Ljg4LjQ4LDEuNDcsMCwuMTEsMCwuMi0uMDIuMjdaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0zNDQuMzIsNDAyLjIyYy0uNjQuMzEtMS4yNy40Ny0xLjg5LjQ3LS44OCwwLTEuNTMtLjI2LTEuOTgtLjc2LS40NS0uNTItLjY5LTEuMjUtLjY5LTIuMjJzLjIzLTEuNjUuNjUtMi4xOGMuNDQtLjU0LDEuMDUtLjgsMS44NS0uOC42NCwwLDEuMy4xNCwxLjk4LjQybC4zMy0xLjMzYy0uNzItLjM0LTEuNTItLjUtMi40My0uNS0xLjI4LDAtMi4yNy40LTMsMS4yMXMtMS4wOCwxLjg3LTEuMDgsMy4yMi4zNywyLjQzLDEuMTEsMy4yYy43NC43NiwxLjc5LDEuMTQsMy4xMywxLjE0Ljg4LDAsMS42NS0uMTYsMi4zMS0uNTFsLS4zLTEuMzVaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0zNTMuNjYsNDAzLjg5di01LjM4YzAtMS4wMS0uMy0xLjc4LS45LTIuMzUtLjYtLjU2LTEuNDItLjg0LTIuNDctLjg0LS43OCwwLTEuNDcuMTYtMi4wOS40OHYtMy44NmwtMS42Ny4wOHYxMS44N2gxLjY3di02LjY3Yy41Ny0uMzEsMS4xOC0uNDgsMS44Ni0uNDgsMS4yNywwLDEuOTIuNjQsMS45MiwxLjl2NS4yNWgxLjY4WiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzYyLjIxLDQwMy4zM3YtNC43M2MwLTEuMDYtLjI4LTEuODYtLjg1LTIuNDMtLjU3LS41Ni0xLjQyLS44NC0yLjU1LS44NC0xLjAzLDAtMS45My4xNi0yLjcxLjQ4bC4zMywxLjM0Yy42Ny0uMjcsMS40MS0uNCwyLjIxLS40LDEuMywwLDEuOTMuNTksMS45MywxLjc4di42OWMtLjU0LS4xMi0xLjEyLS4xOS0xLjc1LS4xOS0uOTgsMC0xLjc3LjIyLTIuMzYuNjYtLjU5LjQ0LS44OSwxLjA3LS44OSwxLjg5LDAsLjc2LjI3LDEuMzYuODQsMS44MS41Ni40NywxLjM3LjY5LDIuNDEuNjksMS4zNiwwLDIuNS0uMjQsMy4zOC0uNzZaTTM1Ny4yNSw0MDEuNTJjMC0uOTIuNTktMS4zOSwxLjc4LTEuMzkuNTEsMCwxLjAyLjA2LDEuNTUuMnYyLjE2Yy0uMzkuMjMtLjkzLjM1LTEuNi4zNS0xLjE1LDAtMS43Mi0uNDQtMS43Mi0xLjMyWiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzcxLjgzLDQwMy44OXYtNS4zOGMwLTEuMDItLjMxLTEuODEtLjkxLTIuMzUtLjYtLjU2LTEuNDctLjg0LTIuNjItLjg0LTEuMywwLTIuNTEuMjYtMy42Ljc3djcuNzloMS42N3YtNi43NGMuNTctLjI4LDEuMjItLjQyLDEuOTMtLjQyLDEuMjQsMCwxLjg2LjYzLDEuODYsMS44OXY1LjI2aDEuNjdaIi8+CiAgICAgIDxyZWN0IGNsYXNzPSJzdDAiIHg9IjM3NC4zNyIgeT0iMzk1LjUyIiB3aWR0aD0iMS42NyIgaGVpZ2h0PSI4LjM3Ii8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0zNzUuOTUsMzkyLjMzYy0uMTgtLjE5LS40NC0uMjctLjc1LS4yN3MtLjU3LjA4LS43Ni4yN2MtLjE5LjE5LS4yOC40My0uMjguNzIsMCwuMzEuMDkuNTYuMjcuNzUuMTguMTguNDQuMjcuNzcuMjdzLjU3LS4xLjc1LS4yN2MuMTktLjE5LjI3LS40NC4yNy0uNzUsMC0uMjktLjA5LS41My0uMjctLjcyWiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzgyLjM1LDM5Ni43NGMuNjMsMCwxLjMuMTQsMS45Ny40MmwuMzMtMS4zM2MtLjcxLS4zNC0xLjUyLS41LTIuNDMtLjUtMS4yOCwwLTIuMjcuNC0yLjk5LDEuMjEtLjczLjgxLTEuMDksMS44Ny0xLjA5LDMuMjJzLjM3LDIuNDMsMS4xMiwzLjJjLjc0Ljc2LDEuNzgsMS4xNCwzLjEzLDEuMTQuODgsMCwxLjY0LS4xNiwyLjMxLS41MWwtLjMxLTEuMzVjLS42NC4zMS0xLjI3LjQ3LTEuODkuNDctLjg3LDAtMS41Mi0uMjYtMS45Ny0uNzYtLjQ2LS41Mi0uNjktMS4yNS0uNjktMi4yMnMuMjItMS42NS42NS0yLjE4Yy40NC0uNTQsMS4wNS0uOCwxLjg1LS44WiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzg5LjkzLDQwMi40MWMtLjI5LjE5LS42OS4yOC0xLjE4LjI4LS44NSwwLTEuNzEtLjE4LTIuNi0uNTJsLS4yNCwxLjRjLjgxLjM1LDEuNzcuNTEsMi44NS41MS45OCwwLDEuNzctLjIsMi4zNi0uNjMuNi0uNDMuODktMS4wNC44OS0xLjg1LDAtLjY5LS4yMy0xLjIzLS42Ni0xLjYtLjQ0LS4zOC0xLjE1LS43LTIuMTMtLjk4LS41OS0uMTgtMS4wMS0uMzUtMS4yNS0uNTEtLjI1LS4xNy0uMzgtLjQzLS4zOC0uNzcsMC0uNjkuNS0xLjAyLDEuNDktMS4wMi41NiwwLDEuMy4xMywyLjIxLjRsLjItMS4zN2MtLjctLjI5LTEuNTUtLjQ0LTIuNTItLjQ0cy0xLjcuMjEtMi4yMy42NGMtLjUyLjQyLS43OSwxLjAzLS43OSwxLjgzLDAsLjY4LjIxLDEuMjEuNjIsMS41OC40MS4zNywxLjAxLjY4LDEuNzkuOS43Ny4yMywxLjMuNDIsMS41OC41OS4yNy4xOC40Mi40My40Mi43N3MtLjE1LjU4LS40NC43N1oiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTQwMC4yOCwzOTkuMDNjLS45OCwwLTEuNzYuMjItMi4zNi42Ni0uNTkuNDQtLjg5LDEuMDctLjg5LDEuODksMCwuNzYuMjgsMS4zNi44NSwxLjgxLjU2LjQ3LDEuMzYuNjksMi40LjY5LDEuMzcsMCwyLjUtLjI0LDMuMzgtLjc2di00LjczYzAtMS4wNi0uMjgtMS44Ni0uODUtMi40My0uNTctLjU2LTEuNDItLjg0LTIuNTQtLjg0LTEuMDQsMC0xLjk0LjE2LTIuNzIuNDhsLjMzLDEuMzRjLjY4LS4yNywxLjQyLS40LDIuMjItLjQsMS4yOSwwLDEuOTMuNTksMS45MywxLjc4di42OWMtLjUzLS4xMi0xLjEyLS4xOS0xLjc1LS4xOVpNNDAyLjAzLDQwMi40OWMtLjM5LjIzLS45My4zNS0xLjYuMzUtMS4xNSwwLTEuNzMtLjQ0LTEuNzMtMS4zMnMuNi0xLjM5LDEuNzgtMS4zOWMuNTEsMCwxLjAyLjA2LDEuNTUuMnYyLjE2WiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNDExLjYyLDQwMy44OWgxLjY3di01LjM4YzAtMS4wMi0uMy0xLjgxLS45LTIuMzUtLjYxLS41Ni0xLjQ4LS44NC0yLjYzLS44NC0xLjMsMC0yLjQ5LjI2LTMuNTkuNzd2Ny43OWgxLjY3di02Ljc0Yy41Ny0uMjgsMS4yMi0uNDIsMS45My0uNDIsMS4yNCwwLDEuODYuNjMsMS44NiwxLjg5djUuMjZaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik00MTUuMjksMzk5Ljg1YzAsMS4zMi4zOSwyLjM2LDEuMTYsMy4xMS43Ny43NiwxLjgxLDEuMTMsMy4xMywxLjEzLDEuMjIsMCwyLjIzLS4yMywzLjA4LS42OXYtMTEuNDRsLTEuNjcuMDh2My40OGMtLjQ0LS4xMy0uODctLjE5LTEuMzEtLjE5LTEuMzcsMC0yLjQzLjQxLTMuMjIsMS4yMy0uNzguODItMS4xNywxLjkyLTEuMTcsMy4yOVpNNDE3LjcsMzk3LjUyYy40OC0uNTIsMS4xNi0uNzgsMi4wNi0uNzguNDEsMCwuODEuMDgsMS4yMy4yNnY1LjM4Yy0uMzYuMjEtLjg0LjMxLTEuNDIuMzEtLjgsMC0xLjQyLS4yNi0xLjg5LS43Ni0uNDctLjUyLS42OS0xLjIzLS42OS0yLjE1LDAtLjk4LjIzLTEuNzMuNzEtMi4yNloiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTQzNi41Nyw0MDEuOTNjLS44NC40MS0xLjY3LjYyLTIuNDkuNjItMS4yMiwwLTIuMTEtLjM4LTIuNzEtMS4xNHMtLjg5LTEuODMtLjg5LTMuMjEuMjktMi40OS44Ny0zLjNjLjU4LS44MiwxLjQ3LTEuMjMsMi42OC0xLjIzLjYyLDAsMS40My4xOCwyLjM5LjUzbC4zOS0xLjQ5Yy0uOTQtLjM4LTEuODgtLjU3LTIuODEtLjU3LTEuNzIsMC0zLjA0LjU2LTMuOTUsMS42Ny0uOSwxLjEtMS4zNiwyLjU5LTEuMzYsNC40MnMuNDYsMy4yMywxLjM4LDQuMjhjLjkyLDEuMDUsMi4yMywxLjU3LDMuOTMsMS41NywxLjA5LDAsMi4wNi0uMjEsMi45MS0uNjVsLS4zNS0xLjVaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik00NDEuOSw0MDQuMDljMS4yMiwwLDIuMTgtLjM5LDIuODgtMS4xOS43LS44LDEuMDUtMS44NiwxLjA1LTMuMTlzLS4zNS0yLjM5LTEuMDUtMy4xOGMtLjctLjgxLTEuNjYtMS4yLTIuODgtMS4ycy0yLjE3LjM5LTIuODcsMS4yYy0uNjkuNzktMS4wNSwxLjg1LTEuMDUsMy4xOHMuMzUsMi4zOSwxLjA1LDMuMTljLjcuOCwxLjY1LDEuMTksMi44NywxLjE5Wk00NDAuMjUsMzk3LjUzYy4zOS0uNTQuOTMtLjgsMS42NS0uOHMxLjI3LjI2LDEuNjQuNzhjLjM4LjUzLjU2LDEuMjYuNTYsMi4xOHMtLjE5LDEuNjYtLjU2LDIuMTljLS4zNy41Mi0uOTIuOC0xLjY1LjhzLTEuMjctLjI3LTEuNjUtLjhjLS4zNy0uNTQtLjU2LTEuMjctLjU2LTIuMTlzLjE5LTEuNjQuNTYtMi4xN1oiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTQ1NS4wNCw0MDMuODl2LTUuMzhjMC0xLjAyLS4zMS0xLjgxLS45MS0yLjM1LS42LS41Ni0xLjQ4LS44NC0yLjYzLS44NC0xLjMsMC0yLjUuMjYtMy41OS43N3Y3Ljc5aDEuNjd2LTYuNzRjLjU3LS4yOCwxLjIxLS40MiwxLjkzLS40MiwxLjI1LDAsMS44Ny42MywxLjg3LDEuODl2NS4yNmgxLjY3WiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNDYwLjg5LDQwMi40MWMtLjI5LjE5LS42OS4yOC0xLjE4LjI4LS44NSwwLTEuNzEtLjE4LTIuNi0uNTJsLS4yNCwxLjRjLjgxLjM1LDEuNzcuNTEsMi44NS41MS45OCwwLDEuNzctLjIsMi4zNi0uNjMuNTktLjQzLjg5LTEuMDQuODktMS44NSwwLS42OS0uMjMtMS4yMy0uNjctMS42LS40NC0uMzgtMS4xNC0uNy0yLjEyLS45OC0uNTktLjE4LTEuMDEtLjM1LTEuMjUtLjUxLS4yNS0uMTctLjM3LS40My0uMzctLjc3LDAtLjY5LjQ5LTEuMDIsMS40OC0xLjAyLjU2LDAsMS4zLjEzLDIuMjIuNGwuMi0xLjM3Yy0uNzEtLjI5LTEuNTUtLjQ0LTIuNTMtLjQ0cy0xLjcuMjEtMi4yMi42NGMtLjUzLjQyLS44LDEuMDMtLjgsMS44MywwLC42OC4yMSwxLjIxLjYyLDEuNTguNDEuMzcsMS4wMS42OCwxLjc5LjkuNzcuMjMsMS4zLjQyLDEuNTguNTkuMjcuMTguNDIuNDMuNDIuNzdzLS4xNS41OC0uNDQuNzdaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik00NjQuOTIsMzkzLjYxdjEuOTFoLTEuMTl2MS4zNmgxLjE5djQuMjljMCwxLjk1Ljg5LDIuOTIsMi42OCwyLjkyLjQ1LDAsLjg5LS4wNSwxLjM0LS4xNmwtLjEtMS4zNWMtLjI5LjA3LS42LjExLS45Ni4xMS0uODUsMC0xLjI5LS41Mi0xLjI5LTEuNTR2LTQuMjdoMi4wNnYtMS4zNmgtMi4wNnYtMS45OWwtMS42Ny4wOFoiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTQ3NC4xOCwzOTYuNzRjLjMyLDAsLjYuMDMuODMuMTFsLjIzLTEuNDFjLS4zNS0uMDctLjc0LS4xMS0xLjE3LS4xMS0xLjM2LDAtMi41Mi4yNy0zLjQ3Ljh2Ny43N2gxLjY3di02Ljc0Yy41NC0uMjgsMS4xOC0uNDIsMS45Mi0uNDJaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik00NzYuNjgsMzk1LjUydjUuMzRjMCwyLjE2LDEuMTQsMy4yMywzLjM4LDMuMjMsMS4zNSwwLDIuNTctLjI2LDMuNjUtLjc4di03Ljc5aC0xLjY3djYuNzJjLS41Ny4zMS0xLjIzLjQ1LTEuOTUuNDUtMS4xNiwwLTEuNzUtLjYxLTEuNzUtMS44NHYtNS4zNGgtMS42N1oiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTQ4OS45OSwzOTYuNzRjLjY0LDAsMS4zLjE0LDEuOTguNDJsLjMzLTEuMzNjLS43Mi0uMzQtMS41Mi0uNS0yLjQzLS41LTEuMjgsMC0yLjI3LjQtMywxLjIxLS43My44MS0xLjA4LDEuODctMS4wOCwzLjIycy4zNywyLjQzLDEuMTIsMy4yYy43My43NiwxLjc4LDEuMTQsMy4xMywxLjE0Ljg3LDAsMS42NC0uMTYsMi4zLS41MWwtLjMtMS4zNWMtLjY0LjMxLTEuMjcuNDctMS44OS40Ny0uODgsMC0xLjUzLS4yNi0xLjk4LS43Ni0uNDUtLjUyLS42OC0xLjI1LS42OC0yLjIycy4yMi0xLjY1LjY1LTIuMThjLjQ0LS41NCwxLjA1LS44LDEuODQtLjhaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik00OTQuNDIsMzkzLjYxdjEuOTFoLTEuMTl2MS4zNmgxLjE5djQuMjljMCwxLjk1Ljg5LDIuOTIsMi42OCwyLjkyLjQ1LDAsLjg5LS4wNSwxLjMzLS4xNmwtLjA5LTEuMzVjLS4yOS4wNy0uNi4xMS0uOTcuMTEtLjg1LDAtMS4yOC0uNTItMS4yOC0xLjU0di00LjI3aDIuMDZ2LTEuMzZoLTIuMDZ2LTEuOTlsLTEuNjcuMDhaIi8+CiAgICAgIDxyZWN0IGNsYXNzPSJzdDAiIHg9IjUwMC4wOSIgeT0iMzk1LjUyIiB3aWR0aD0iMS42NyIgaGVpZ2h0PSI4LjM3Ii8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik01MDEuNjcsMzkyLjMzYy0uMTgtLjE5LS40NC0uMjctLjc1LS4yN3MtLjU3LjA4LS43Ni4yN2MtLjE5LjE5LS4yOC40My0uMjguNzIsMCwuMzEuMDkuNTYuMjcuNzUuMTguMTguNDQuMjcuNzcuMjdzLjU3LS4xLjc1LS4yN2MuMTktLjE5LjI3LS40NC4yNy0uNzUsMC0uMjktLjA5LS41My0uMjctLjcyWiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNTExLjcxLDM5OS43YzAtMS4zMi0uMzUtMi4zOS0xLjA1LTMuMTgtLjctLjgxLTEuNjUtMS4yLTIuODgtMS4ycy0yLjE3LjM5LTIuODcsMS4yYy0uNjkuNzktMS4wNSwxLjg1LTEuMDUsMy4xOHMuMzUsMi4zOSwxLjA1LDMuMTljLjcuOCwxLjY2LDEuMTksMi44NywxLjE5czIuMTgtLjM5LDIuODgtMS4xOWMuNy0uOCwxLjA1LTEuODYsMS4wNS0zLjE5Wk01MDkuNDUsNDAxLjg5Yy0uMzcuNTItLjkyLjgtMS42Ni44cy0xLjI3LS4yNy0xLjY0LS44Yy0uMzgtLjU0LS41Ny0xLjI3LS41Ny0yLjE5cy4xOS0xLjY0LjU3LTIuMTdjLjM4LS41NC45My0uOCwxLjY0LS44czEuMjcuMjYsMS42NC43OGMuMzguNTMuNTYsMS4yNi41NiwyLjE4cy0uMTksMS42Ni0uNTUsMi4xOVoiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTUxNy4zOCwzOTUuMzNjLTEuMywwLTIuNDkuMjYtMy41OS43N3Y3Ljc5aDEuNjd2LTYuNzRjLjU3LS4yOCwxLjIyLS40MiwxLjkzLS40MiwxLjI1LDAsMS44Ny42MywxLjg3LDEuODl2NS4yNmgxLjY3di01LjM4YzAtMS4wMi0uMy0xLjgxLS45LTIuMzUtLjYtLjU2LTEuNDgtLjg0LTIuNjQtLjg0WiIvPgogICAgPC9nPgogICAgPGc+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik02MCwzNzcuMzFjLS43OCwwLTEuNDMtLjI3LTEuOTMtLjgxLS41MS0uNTQtLjc3LTEuMTYtLjc3LTEuODlzLjI0LTEuMjYuNzMtMS42OWMuNS0uNDMsMS4xMi0uNjUsMS44OS0uNjUuNTgsMCwxLjM3LjE0LDIuMzguMzhsLjY0LTIuMDJjLTEuMi0uNDYtMi4zNy0uNjgtMy40OS0uNjgtMS4yNywwLTIuMzQuNDEtMy4yMSwxLjIyLS44NS44MS0xLjI4LDEuODktMS4yOCwzLjI2LDAsLjg1LjE5LDEuNjUuNTcsMi4zNy4zOC43My45NiwxLjI3LDEuNzQsMS42NS0uOC4zMS0xLjYyLjY0LTIuNDYuOTlsLjY4LDIuMTZjMi44LTEuMTUsNS44My0yLjEsOS4wNy0yLjg0bC0uNDctMi4yNmMtMi4xMi41NC0zLjQ5LjgxLTQuMDguODFaIi8+CiAgICAgIDxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iODYuMzEgMzY4LjE4IDg0LjM2IDM2Ni40OCA4Mi43NyAzNjguMzcgODQuNjcgMzY5Ljk5IDg2LjMxIDM2OC4xOCIvPgogICAgICA8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjkyLjY1IDM4NS4zNCA5NC41NyAzODYuOTcgOTYuMiAzODUuMTUgOTQuMjUgMzgzLjQ1IDkyLjY1IDM4NS4zNCIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMTA3LjAzLDM2Mi4yOWMuMDcsNC43Ny4xMSw4LjMyLjExLDEwLjYyLDAsMS44OS0uMDcsMy41Ni0uMTksNC45OS0xLC4yNi0yLjExLjM5LTMuMzMuMzloLS4zOWMtMS42OCwwLTIuOTgtLjIyLTMuOTQtLjY5LjE5LS42NC4yOC0xLjQ3LjI4LTIuNDl2LTMuNDNsLTIuMzcuMTl2My40OGMwLC45OS0uMjYsMS43Mi0uNzgsMi4yMi0uNTQuNDktMS42Ni43My0zLjM1LjczaC0uNmMtMS42OCwwLTIuOTktLjIyLTMuOTUtLjY5LjItLjY0LjMtMS40Ny4zLTIuNDl2LTMuNDNsLTIuMzcuMTl2My40OGMwLC45OS0uMjYsMS43Mi0uOCwyLjIyLS41NC40OS0xLjY0LjczLTMuMzQuNzNoLTguOTJjLTEuMTksMC0yLjA2LS4zLTIuNi0uOTEtLjU0LS42MS0uODEtMS42NC0uODEtMy4xMXYtMTIuMmwtMi41LjIydjEyLjQ0YzAsMi4wOC40MSwzLjY4LDEuMTksNC43My43OCwxLjA3LDIuMTYsMS42LDQuMTQsMS42aDkuNjhjMi4xOSwwLDMuNzctLjQzLDQuNzctMS4zNCwxLjE4LjkxLDIuOCwxLjM0LDQuODcsMS4zNGgxLjExYzIuMTksMCwzLjc5LS40Myw0Ljc3LTEuMzQsMS4xOC45MSwyLjgsMS4zNCw0Ljg2LDEuMzRoLjcyYy45NywwLDEuOTctLjExLDIuOTktLjMyLDEuMDMtLjIyLDEuODQtLjQ5LDIuNDEtLjguMjYtLjg5LjQzLTEuODUuNS0yLjg5LjA3LTEuMDMuMDktMi42MS4wOS00Ljc3cy0uMDEtNS41NC0uMDctMTAuMmwtMi40OS4yMloiLz4KICAgICAgPHBvbHlnb24gY2xhc3M9InN0MCIgcG9pbnRzPSIxMTMuNCAzODEuMDYgMTE1Ljg2IDM4MS4wNiAxMTUuODYgMzYyLjA3IDExMy40IDM2Mi4yOSAxMTMuNCAzODEuMDYiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTEyNC4yOSwzNjkuOTljLTEuNDYsMC0yLjY0LjU4LTMuNTgsMS43Ni0uOTMsMS4xOC0xLjM5LDIuNjItMS4zOSw0LjM4LDAsMS40OS4zNywyLjY0LDEuMDgsMy40Ni43Mi44MiwxLjk1LDEuMjMsMy42NSwxLjIzLDEuMiwwLDIuMzMtLjE5LDMuNDEtLjU4LS4xMiwxLjA4LS42NSwyLjAzLTEuNTgsMi44Ny0uOTUuODQtMi4zNywxLjI2LTQuMjMsMS4yNi0uODQsMC0xLjYxLS4wNy0yLjMtLjIybC0uMjcsMi4zMWMuOTEuMjYsMS44NS4zNywyLjg0LjM3LDIuNTYsMCw0LjUyLS43Myw1Ljg3LTIuMjMsMS4zNS0xLjQ5LDIuMDItMy42LDIuMDItNi4zMiwwLTIuNTItLjUtNC41My0xLjUzLTYuMDMtMS0xLjUtMi4zMy0yLjI2LTMuOTgtMi4yNlpNMTI0LjkzLDM3OC4zMWMtMS4yOCwwLTIuMTktLjIyLTIuNzMtLjY2LS41MS0uNDMtLjc3LTEuMDctLjc3LTEuOTFzLjIzLTEuNTcuNy0yLjI0Yy40Ny0uNjgsMS4xNS0xLjAxLDIuMDQtMS4wMSwxLjAxLDAsMS44My41NSwyLjQzLDEuNjUuNTksMS4xMS45MiwyLjM5Ljk3LDMuODctLjg5LjItMS43Ny4zMS0yLjY1LjMxWiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMTUxLjYzLDM3MS4zNmMwLS44LS42Mi0xLjM5LTEuODQtMS43Ni0xLjA1LS4zMi0xLjU4LS42LTEuNTgtLjg0LDAtLjI2LjIzLS41LjY2LS43LjQzLS4xOS45Mi0uMjgsMS40My0uMjguMzgsMCwuNzIuMDMsMSwuMDlsLjM3LTEuNjhjLS4zMi0uMDctLjctLjExLTEuMS0uMTEtMS4wOCwwLTEuOTcuMjgtMi42Ni44Ny0uNy41OC0xLjA0LDEuMjgtMS4wNCwyLjEsMCwuNS4xNi44OC40NywxLjE4LjMyLjI3LjgyLjUxLDEuNS42OC45MS4yOCwxLjM3LjU0LDEuMzcuOCwwLC4yNC0uNDIuNDUtMS4yNC42Mi0uODQuMTYtMS43NC4yNC0yLjcyLjI0djEuNTdjMS43MiwwLDMuMDMtLjI0LDMuOTYtLjc3Ljk1LS41MSwxLjQyLTEuMTgsMS40Mi0yWiIvPgogICAgICA8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjE2OS4wNSAzODUuMzIgMTcwLjgzIDM4Ni44MyAxNzIuMzYgMzg1LjE1IDE3MC41NSAzODMuNTYgMTY5LjA1IDM4NS4zMiIvPgogICAgICA8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjE2NS40NCAzODUuNCAxNjcuMjIgMzg2LjkxIDE2OC43NCAzODUuMjQgMTY2Ljk0IDM4My42NCAxNjUuNDQgMzg1LjQiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTE4MC42NSwzNzEuMzljLjQ5LDEuODUuNzQsMy43My43NCw1LjY0LDAsLjI2LS4wMS40Ni0uMDQuNjEtMS4wNS40My0yLjQzLjY1LTQuMTIuNjVoLS4zYy0xLjY4LDAtMi45OC0uMjItMy45NC0uNjkuMTktLjY0LjI4LTEuNDcuMjgtMi40OXYtMy40M2wtMi4zNy4xOXYzLjQ4YzAsLjk5LS4yNiwxLjcyLS44LDIuMjItLjUzLjQ5LTEuNjUuNzMtMy4zNC43M2gtNS41M2MtMS4zOCwwLTIuMzctLjI4LTIuOTUtLjg3LS42LS41OC0uODgtMS41Ny0uODgtMi45OXYtMTIuMzZsLTIuNDYuMjJ2MTIuOTZjMCwuNTctLjA4LDEuMDUtLjIzLDEuMzktLjE1LjM3LS40My43LS44NywxLjAxLS40My4zMi0xLjA3LjU1LTEuOTUuNjktLjg1LjE0LTEuOTcuMi0zLjM0LjJzLTIuNTQtLjA4LTMuNDUtLjI2Yy0uODktLjE4LTEuNTgtLjQ1LTIuMDQtLjg0LS40Ni0uMzctLjc4LS43Ny0uOTUtMS4yMi0uMTYtLjQyLS4yNC0uOTctLjI0LTEuNjQsMC0uOC4xOS0xLjkyLjU3LTMuMzdsLTIuMTQtLjQ2Yy0uNjQsMS44OC0uOTUsMy41Mi0uOTUsNC45LDAsLjg1LjEyLDEuNi4zNSwyLjI0LjIzLjY0LjY2LDEuMjMsMS4yNiwxLjc5LjYxLjU1LDEuNS45NiwyLjY4LDEuMjMsMS4xOC4yOCwyLjY1LjQzLDQuMzguNDMsNC4zMSwwLDcuMDYtLjc3LDguMjQtMi4zNC44OSwxLjM3LDIuNDIsMi4wNCw0LjU3LDIuMDRoNi4xYzIuMTksMCwzLjc5LS40Myw0Ljc3LTEuMzQsMS4xOC45MSwyLjc5LDEuMzQsNC44NSwxLjM0aC42NGMyLjM1LDAsNC4zMy0uNDcsNS45Mi0xLjQxLjMtMSwuNDUtMi4yMi40NS0zLjY4LDAtMS43Mi0uMjItMy40My0uNjItNS4xNGwtMi4zMS41NVoiLz4KICAgICAgPHBvbHlnb24gY2xhc3M9InN0MCIgcG9pbnRzPSIxODEuMTggMzY3LjgyIDE3OS4yMyAzNjYuMTEgMTc3LjYzIDM2Ny45OSAxNzkuNTUgMzY5LjYzIDE4MS4xOCAzNjcuODIiLz4KICAgICAgPHBvbHlnb24gY2xhc3M9InN0MCIgcG9pbnRzPSIyMDUuOTMgMzg1LjQgMjA3LjcxIDM4Ni45MSAyMDkuMjQgMzg1LjI0IDIwNy40MyAzODMuNjQgMjA1LjkzIDM4NS40Ii8+CiAgICAgIDxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iMjA5LjU1IDM4NS4zMiAyMTEuMzMgMzg2LjgzIDIxMi44NiAzODUuMTUgMjExLjA0IDM4My41NiAyMDkuNTUgMzg1LjMyIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yNDkuMTksMzYyLjI5Yy4wNyw0Ljc3LjA5LDguMzIuMDksMTAuNjIsMCwxLjg5LS4wNSwzLjU2LS4xOCw0Ljk5LS45OS4yNi0yLjExLjM5LTMuMzMuMzloLS40NmMtMS4zNSwwLTIuMzMtLjMtMi45MS0uODktLjU3LS41OS0uODUtMS41OC0uODUtMi45NnYtMTIuMzZsLTIuNDcuMjJ2MTIuNDRjMCwuNjQtLjAzLDEuMTQtLjA4LDEuNDktLjA0LjM1LS4xOC43LS4zOSwxLjA3LS4yLjM3LS41NC42NC0xLC43OC0uNDYuMTQtMS4wOC4yMi0xLjg1LjIyaC0xLjE0Yy0uODcsMC0xLjQ5LS4xNi0xLjg1LS40OS0uMzgtLjMyLS42Ni0uOTktLjg5LTEuOTktLjQ1LTEuNzktMS4wMy0zLjE0LTEuNzYtNC4wNC0uNzQtLjkxLTEuNzQtMS4zNS0zLjAyLTEuMzVzLTIuMjYuMzItMywuOTljLS43NC42Ni0xLjQ3LDEuNjUtMi4xNiwzLS43NCwxLjQ3LTEuMzUsMi40OS0xLjg3LDMuMDRzLTEuMi44NC0yLjEuODRoLS41NWMtMS42NiwwLTIuOTgtLjIyLTMuOTItLjY5LjE5LS42NC4yNy0xLjQ3LjI3LTIuNDl2LTMuNDNsLTIuMzUuMTl2My40OGMwLC45OS0uMjcsMS43Mi0uOCwyLjIyLS41My40OS0xLjY1LjczLTMuMzQuNzNoLS40MnMtLjA0LDAtLjA1LjAxaDBzLS4zNC0uMDEtLjM0LS4wMWMtLjI0LDAtLjQ3LS4wMS0uNjYtLjA1LS4xOS0uMDMtLjM3LS4wOS0uNTUtLjE5LS4xNi0uMDktLjMxLS4xOC0uNDItLjI2LS4xMi0uMDctLjI2LS4yLS40MS0uMzgtLjE0LS4xOC0uMjYtLjMyLS4zMi0uNDMtLjA4LS4xMi0uMTktLjMtLjM3LS41NS0uMTgtLjI3LS4zLS40Ny0uMzktLjYxLS40OS0uNzQtLjg0LTEuMjgtMS4wNy0xLjY0LS4yMy0uMzUtLjY0LS44OS0xLjIzLTEuNjItLjYtLjcyLTEuMjYtMS4zOS0yLjAyLTItLjc2LS42MS0xLjYyLTEuMi0yLjYxLTEuNzksMi43Ni0xLjk1LDUuNzctMy4zOCw5LjAzLTQuMjZ2LTIuNjFjLTQuMjEsMS4xNC03LjkxLDIuOTMtMTEuMTMsNS40djMuMTJjLjkyLjYyLDEuNzksMS4yLDIuNiwxLjczLjguNTQsMS40NywxLjE0LDIuMDMsMS43Ni41NS42Mi45OSwxLjE4LDEuMywxLjY1LjMyLjQ3LjY5LDEuMDEsMS4wOCwxLjYyLTEuNzYuNzQtNC4yMywxLjExLTcuNDEsMS4xMWgtLjg0Yy0xLjE5LDAtMi4wNi0uMy0yLjYtLjkxLS41NC0uNjEtLjgxLTEuNjQtLjgxLTMuMTF2LTEyLjJsLTIuNDkuMjJ2MTIuNDRjMCwyLjA4LjM5LDMuNjgsMS4xOCw0LjczLjgsMS4wNywyLjE2LDEuNiw0LjE0LDEuNmgxLjUxYzMuNjYsMCw2LjU1LS41NCw4LjY4LTEuNjQuODIsMS4xLDIuMDYsMS42NCwzLjY5LDEuNjRoMS4wN2MyLjE5LDAsMy43OS0uNDMsNC43Ny0xLjM0LDEuMTguOTEsMi43OSwxLjM0LDQuODUsMS4zNGguNzZjMS40MywwLDIuNjEtLjQ3LDMuNDktMS40MSwxLjUuOTYsMy4zMSwxLjQzLDUuNDQsMS40MywxLjcyLDAsMy4xOC0uMzcsNC40LTEuMTIuNzQuNzQsMS44NSwxLjEsMy4zNywxLjFoMS4wMWMyLjQ5LDAsNC4xMi0uNjQsNC45NC0xLjkzLjkxLDEuMywyLjM5LDEuOTMsNC40NCwxLjkzaC44NGMuOTcsMCwxLjk3LS4xMSwzLS4zMiwxLjAxLS4yMiwxLjgxLS40OSwyLjM5LS44LjI3LS44OS40My0xLjg1LjUtMi44OS4wOC0xLjAzLjExLTIuNjEuMTEtNC43N3MtLjAzLTUuNTQtLjA4LTEwLjJsLTIuNDkuMjJaTTIyNy4wMiwzNzguNTNjLTEuNSwwLTIuOTItLjMyLTQuMjYtLjkzbC42OC0xLjIzYy42OC0xLjM0LDEuMjYtMi4yNiwxLjc2LTIuNzMuNS0uNDcsMS4xLS42OSwxLjc3LS42OS44MiwwLDEuNDUuMzUsMS44NywxLjA3LjQyLjcyLjg0LDEuOTcsMS4yNiwzLjc3bC4wMy4wOGMtLjgyLjQzLTEuODUuNjYtMy4xLjY2WiIvPgogICAgICA8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjI3Mi41MSAzNjQuNjcgMjcwLjcgMzYzLjA3IDI2OS4yMSAzNjQuODMgMjcwLjk4IDM2Ni4zNCAyNzIuNTEgMzY0LjY3Ii8+CiAgICAgIDxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iMjY4Ljg5IDM2NC43NSAyNjcuMDcgMzYzLjE0IDI2NS41OSAzNjQuOTEgMjY3LjM3IDM2Ni40MiAyNjguODkgMzY0Ljc1Ii8+CiAgICAgIDxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iMjgyLjMzIDM4NS4zMiAyODQuMTIgMzg2LjgzIDI4NS42MyAzODUuMTUgMjgzLjgyIDM4My41NiAyODIuMzMgMzg1LjMyIi8+CiAgICAgIDxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iMjc4LjcxIDM4NS40IDI4MC40OSAzODYuOTEgMjgyLjAxIDM4NS4yNCAyODAuMjEgMzgzLjY0IDI3OC43MSAzODUuNCIvPgogICAgICA8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjI5NC43OSAzNjguMTggMjkyLjg0IDM2Ni40OCAyOTEuMjQgMzY4LjM3IDI5My4xNiAzNjkuOTkgMjk0Ljc5IDM2OC4xOCIvPgogICAgICA8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjMwMC4yMSAzODUuNCAzMDEuOTkgMzg2LjkxIDMwMy41MiAzODUuMjQgMzAxLjcgMzgzLjY0IDMwMC4yMSAzODUuNCIvPgogICAgICA8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjMwMy44MyAzODUuMzIgMzA1LjYyIDM4Ni44MyAzMDcuMTUgMzg1LjE1IDMwNS4zMiAzODMuNTYgMzAzLjgzIDM4NS4zMiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzQyLjI0LDM2Mi4yOWMuMDcsNC43Ny4wOSw4LjMyLjA5LDEwLjYyLDAsMS44OS0uMDcsMy41Ni0uMTgsNC45OS0xLC4yNi0yLjExLjM5LTMuMzQuMzloLS43NmMtLjk5LDAtMS45NS0uMTQtMi44My0uMzkuMTItLjYxLjE4LTEuMy4xOC0yLjA0LDAtMS44NC0uNTEtMy4zMS0xLjUzLTQuNDUtMS0xLjEyLTIuNDEtMS42OS00LjE3LTEuNjktMS45MywwLTMuNzYuNi01LjQ2LDEuODEtMS42OSwxLjItMy4zNSwzLjE1LTUsNS44NC0uNDItLjE0LS43Mi0uMjYtLjkyLS4zNC4xMS0uNjQuMTYtMS4zNS4xNi0yLjE2di0zLjE5bC0yLjM1LjE5djMuNDhjMCwuOTktLjI0LDEuNzItLjcsMi4yMi0uNDYuNDktMS40Ny43My0zLC43M2gtLjczYy0xLjY2LDAtMi45OC0uMjItMy45NS0uNjkuMi0uNjQuMy0xLjQ3LjMtMi40OXYtMy40M2wtMi4zNS4xOXYzLjQ4YzAsLjk5LS4yNywxLjcyLS44LDIuMjItLjU0LjQ5LTEuNjUuNzMtMy4zNC43M2gtLjYyYy0xLjY1LDAtMi45Ni0uMjItMy45NC0uNjkuMTktLjY0LjMtMS40Ny4zLTIuNDl2LTMuNDNsLTIuMzUuMTl2My40OGMwLC45OS0uMjcsMS43Mi0uODEsMi4yMi0uNTMuNDktMS42NS43My0zLjM0LjczaC0uNjFjLTEuNjUsMC0yLjk2LS4yMi0zLjk0LS42OS4xOS0uNjQuMy0xLjQ3LjMtMi40OXYtMy40M2wtMi4zNy4xOXYzLjQ4YzAsLjk5LS4yNywxLjcyLS44LDIuMjItLjUzLjQ5LTEuNjUuNzMtMy4zNC43M2gtNC43NmMtMS4wOCwwLTEuODQtLjE4LTIuMjYtLjU0LS40MS0uMzctLjYyLS45Ny0uNjItMS44N3YtNy42MWMtMi43NywwLTUuMTQuNjgtNy4xMywyLjAzLTEuOTksMS4zNy0yLjk4LDMuMTItMi45OCw1LjI5LDAsMS4xOS41LDIuMDcsMS41LDIuNjYuOTkuNTgsMi4zNy44OCw0LjExLjg4Ljg0LDAsMS43NC0uMDUsMi43LS4xNi42MSwxLjQxLDEuOTMsMi4xLDMuOTYsMi4xaDUuNjRjMi4xOSwwLDMuNzktLjQzLDQuNzctMS4zNCwxLjE4LjkxLDIuOCwxLjM0LDQuODUsMS4zNGgxLjE0YzIuMTksMCwzLjc3LS40Myw0Ljc3LTEuMzQsMS4xNi45MSwyLjc5LDEuMzQsNC44NCwxLjM0aDEuMTRjMi4xOCwwLDMuNzctLjQzLDQuNzctMS4zNCwxLjE4LjkxLDIuNzksMS4zNCw0Ljg2LDEuMzRoMS4wNGMyLjMzLDAsMy45NS0uNTEsNC44OC0xLjU2LDEuMTEuNTQsMi4zMS45NSwzLjYsMS4yMiwxLjI3LjI4LDIuOTUuNDIsNSwuNDIsMy4zOSwwLDYuMDctLjM5LDguMDMtMS4xOCwxLjEuNzQsMi40NywxLjEsNC4xNCwxLjFoLjczYy45OSwwLDEuOTktLjExLDMtLjMyLDEuMDMtLjIyLDEuODMtLjQ5LDIuNDEtLjguMjYtLjg5LjQzLTEuODUuNS0yLjg5LjA3LTEuMDMuMDktMi42MS4wOS00Ljc3cy0uMDMtNS41NC0uMDgtMTAuMmwtMi40Ny4yMlpNMjcwLjE3LDM3Ni42MWMtLjYyLjA1LTEuMjMuMDgtMS43OS4wOC0xLjMxLDAtMi4zMS0uMTYtMi45OC0uNDctLjY4LS4zMi0xLjAxLS43NC0xLjAxLTEuMjcsMC0uODQuNTQtMS43LDEuNjEtMi41NCwxLjA3LS44MiwyLjQ1LTEuMzQsNC4xNy0xLjV2NS43MVpNMzMzLjE1LDM3Ny41Yy0xLjguNTctNC4wNC44NC02LjcyLjg0LTEuOTcsMC0zLjYxLS4xNC00LjkyLS40MSwxLjQ5LTIuMDYsMi44MS0zLjUsMy45OS00LjM0LDEuMTYtLjg0LDIuNDUtMS4yNiwzLjgzLTEuMjYsMS4xOSwwLDIuMTIuMzksMi44MSwxLjE2LjY4Ljc3LDEuMDEsMS45MywxLjAxLDMuNDh2LjUzWiIvPgogICAgICA8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjM0OC42IDM4MS4wNiAzNTEuMDcgMzgxLjA2IDM1MS4wNyAzNjIuMDcgMzQ4LjYgMzYyLjI5IDM0OC42IDM4MS4wNiIvPgogICAgICA8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjM2Ny44NyAzNjQuNzUgMzY2LjA2IDM2My4xNCAzNjQuNTYgMzY0LjkxIDM2Ni4zNCAzNjYuNDIgMzY3Ljg3IDM2NC43NSIvPgogICAgICA8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjM3MS41IDM2NC42NyAzNjkuNjggMzYzLjA3IDM2OC4xOCAzNjQuODMgMzY5Ljk3IDM2Ni4zNCAzNzEuNSAzNjQuNjciLz4KICAgICAgPHBvbHlnb24gY2xhc3M9InN0MCIgcG9pbnRzPSIzNzguMTkgMzg1LjMyIDM3OS45NyAzODYuODMgMzgxLjQ5IDM4NS4xNSAzNzkuNjcgMzgzLjU2IDM3OC4xOSAzODUuMzIiLz4KICAgICAgPHBvbHlnb24gY2xhc3M9InN0MCIgcG9pbnRzPSIzNzQuNTYgMzg1LjQgMzc2LjM1IDM4Ni45MSAzNzcuODYgMzg1LjI0IDM3Ni4wNiAzODMuNjQgMzc0LjU2IDM4NS40Ii8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0zODkuODYsMzYyLjI5Yy4wNyw0Ljc3LjExLDguMzIuMTEsMTAuNjIsMCwxLjg5LS4wNywzLjU2LS4xOSw0Ljk5LTEsLjI2LTIuMTEuMzktMy4zMy4zOWgtLjQxYy0xLjY1LDAtMi45Ni0uMjItMy45Mi0uNjkuMTktLjY0LjI4LTEuNDcuMjgtMi40OXYtMy40M2wtMi4zNy4xOXYzLjQ4YzAsLjk5LS4yNywxLjcyLS44LDIuMjItLjUzLjQ5LTEuNjUuNzMtMy4zNC43M2gtMS42M2MtMS4wOCwwLTEuODMtLjE4LTIuMjYtLjU0LS40Mi0uMzctLjYyLS45Ny0uNjItMS44N3YtNy42MWMtMi43NiwwLTUuMTQuNjgtNy4xMSwyLjAzLTEuOTksMS4zNy0yLjk5LDMuMTItMi45OSw1LjI5LDAsMS4xOS41LDIuMDcsMS40OSwyLjY2LDEuMDEuNTgsMi4zOC44OCw0LjEyLjg4Ljg1LDAsMS43NC0uMDUsMi43LS4xNi41NiwxLjMsMS43NywxLjk2LDMuNTUsMi4wNnYuMDRoMi45MmMyLjE5LDAsMy43OS0uNDMsNC43Ny0xLjM0LDEuMTguOTEsMi44LDEuMzQsNC44NiwxLjM0aC43MmMuOTcsMCwxLjk3LS4xMSwzLS4zMiwxLjAzLS4yMiwxLjgzLS40OSwyLjQxLS44LjI2LS44OS40Mi0xLjg1LjQ5LTIuODkuMDctMS4wMy4xMS0yLjYxLjExLTQuNzdzLS4wMy01LjU0LS4wOC0xMC4ybC0yLjQ5LjIyWk0zNjkuMTYsMzc2LjYxYy0uNjQuMDUtMS4yMi4wOC0xLjc5LjA4LTEuMzEsMC0yLjMtLjE2LTIuOTgtLjQ3LS42Ni0uMzItMS0uNzQtMS0xLjI3LDAtLjg0LjUzLTEuNywxLjU4LTIuNTQsMS4wNy0uODIsMi40Ni0xLjM0LDQuMTgtMS41djUuNzFaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik00MDAuODIsMzY5Ljk5Yy0xLjQ2LDAtMi42Ni41OC0zLjU4LDEuNzYtLjkzLDEuMTgtMS40MSwyLjYyLTEuNDEsNC4zOCwwLDEuNDkuMzUsMi42NCwxLjEsMy40Ni43Mi44MiwxLjkzLDEuMjMsMy42NSwxLjIzLDEuMTksMCwyLjMzLS4xOSwzLjQxLS41OC0uMTIsMS4wOC0uNjUsMi4wMy0xLjYsMi44Ny0uOTUuODQtMi4zNSwxLjI2LTQuMjMsMS4yNi0uODIsMC0xLjYxLS4wNy0yLjMxLS4yMmwtLjI2LDIuMzFjLjkyLjI2LDEuODcuMzcsMi44NC4zNywyLjU3LDAsNC41My0uNzMsNS44Ny0yLjIzLDEuMzUtMS40OSwyLjAzLTMuNiwyLjAzLTYuMzIsMC0yLjUyLS41MS00LjUzLTEuNTMtNi4wMy0xLjAxLTEuNS0yLjM0LTIuMjYtMy45OC0yLjI2Wk00MDEuNDcsMzc4LjMxYy0xLjMsMC0yLjItLjIyLTIuNzMtLjY2LS41MS0uNDMtLjc4LTEuMDctLjc4LTEuOTFzLjIzLTEuNTcuNy0yLjI0Yy40Ny0uNjgsMS4xNS0xLjAxLDIuMDYtMS4wMSwxLDAsMS44MS41NSwyLjQyLDEuNjUuNjEsMS4xMS45MywyLjM5Ljk5LDMuODctLjg5LjItMS43OC4zMS0yLjY1LjMxWiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNDI1LjU2LDM2Mi4yOWMuMDcsNC43Ny4wOSw4LjMyLjA5LDEwLjYyLDAsMS44OS0uMDUsMy41Ni0uMTgsNC45OS0xLC4yNi0yLjExLjM5LTMuMzMuMzloLS40NmMtLjgsMC0xLjM3LS4xNi0xLjcyLS41MS0uMzQtLjM0LS43NC0xLjExLTEuMjItMi4zMS0xLjItMi45Ni0yLjYtNS4yOS00LjE1LTYuOTlsLTEuNzksMS43NmMxLjcsMiwyLjk5LDQuMSwzLjg0LDYuM2wuNDcsMS4yYy0xLjMxLjUxLTIuOTkuNzYtNS4wNC43Ni0uOTEsMC0xLjk3LS4wNC0zLjE5LS4xMnYyLjc2Yy45Mi4xNCwxLjk5LjIsMy4xOS4yLDIuMzgsMCw0LjQ1LS40OSw2LjE5LTEuNDcuNjguOCwxLjY5LDEuMiwzLjEsMS4yaC43M2MuOTksMCwxLjk5LS4xMSwzLS4zMiwxLjAzLS4yMiwxLjgzLS40OSwyLjQxLS44LjI2LS44OS40My0xLjg1LjUtMi44OS4wNy0xLjAzLjA5LTIuNjEuMDktNC43N3MtLjAzLTUuNTQtLjA3LTEwLjJsLTIuNDkuMjJaIi8+CiAgICAgIDxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iNDMxLjkzIDM4MS4wNiA0MzQuMzkgMzgxLjA2IDQzNC4zOSAzNjIuMDcgNDMxLjkzIDM2Mi4yOSA0MzEuOTMgMzgxLjA2Ii8+CiAgICAgIDxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iNDUxLjc1IDM2NC43NSA0NDkuOTQgMzYzLjE0IDQ0OC40NCAzNjQuOTEgNDUwLjIzIDM2Ni40MiA0NTEuNzUgMzY0Ljc1Ii8+CiAgICAgIDxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iNDU1LjM3IDM2NC42NyA0NTMuNTYgMzYzLjA3IDQ1Mi4wNiAzNjQuODMgNDUzLjg0IDM2Ni4zNCA0NTUuMzcgMzY0LjY3Ii8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik00NzEuMzIsMzc3LjY4YzAtMS45Ny0uNjEtMy43My0xLjg1LTUuMjktMS4yMy0xLjU2LTMuMDMtMi44My01LjQxLTMuNzksMi42NC0xLjg1LDUuNi0zLjIyLDguODQtNC4xdi0yLjYxYy00LjE5LDEuMTQtNy45LDIuOTItMTEuMDksNS4zNHYzLjE4YzIuMDIuNjksMy42NiwxLjY1LDQuOTQsMi44OCwxLjI3LDEuMjMsMi4wMywyLjU4LDIuMjcsNC4wNC0yLjA3LjY0LTQuNjMuOTUtNy42OC45NWgtMy4xOGMtMS4xLDAtMS44NC0uMTgtMi4yNi0uNTQtLjQzLS4zNy0uNjQtLjk3LS42NC0xLjg3di03LjYxYy0yLjc2LDAtNS4xNC42OC03LjExLDIuMDMtMS45OSwxLjM3LTIuOTksMy4xMi0yLjk5LDUuMjksMCwxLjE5LjUsMi4wNywxLjQ5LDIuNjYsMS4wMS41OCwyLjM4Ljg4LDQuMTIuODguODUsMCwxLjc0LS4wNSwyLjctLjE2LjYxLDEuNDEsMS45MywyLjEsMy45NiwyLjFoMy45OWM0LjM1LDAsNy42MS0uNTcsOS43Ni0xLjcyLjA4LS41LjEyLTEuMDUuMTItMS42NlpNNDUzLjAzLDM3Ni42MWMtLjY0LjA1LTEuMjIuMDgtMS43OS4wOC0xLjMxLDAtMi4zLS4xNi0yLjk4LS40Ny0uNjYtLjMyLTEtLjc0LTEtMS4yNywwLS44NC41My0xLjcsMS42LTIuNTQsMS4wNS0uODIsMi40NS0xLjM0LDQuMTctMS41djUuNzFaIi8+CiAgICAgIDxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iNDk1LjkzIDM2OC43OSA0OTQuMTUgMzY3LjI0IDQ5Mi42NyAzNjguOTggNDk0LjQzIDM3MC40NyA0OTUuOTMgMzY4Ljc5Ii8+CiAgICAgIDxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iNDk3LjQ1IDM2NS43NSA0OTUuNzQgMzY0LjI1IDQ5NC4zNSAzNjUuOTEgNDk2LjA0IDM2Ny4zNCA0OTcuNDUgMzY1Ljc1Ii8+CiAgICAgIDxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iNDk4LjA1IDM3MC4zMyA0OTkuNTQgMzY4LjY2IDQ5Ny43NiAzNjcuMSA0OTYuMyAzNjguODQgNDk4LjA1IDM3MC4zMyIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNTEyLjA4LDM2Mi4yOWMuMDgsNC43Ny4xMiw4LjMyLjEyLDEwLjYyLDAsMS44OS0uMDcsMy41Ni0uMiw0Ljk5LS45OS4yNi0yLjEuMzktMy4zMy4zOWgtLjVjLTEuNzIsMC0yLjk1LS4yOC0zLjY2LS44NC4wOC0uNTMuMTItMS4wNS4xMi0xLjZ2LTMuNDJsLTIuMjIuMjJ2My4zM2MwLDEuNTQtLjg1LDIuMzEtMi41NCwyLjMxcy0yLjQ1LS43OC0yLjQ1LTIuMzd2LTMuMDNsLTIuMjMuMTV2Mi43NmMwLC44NC0uMzEsMS40Ni0uOTUsMS44OC0uNjUuNDItMS40MS42NC0yLjMzLjY0LTEuMDUsMC0xLjkzLS4yMy0yLjY4LS42OC4xOC0uNTQuMjgtMS4yLjM0LTJsLjE0LTIuMzUtMi4yMy4xOC0uMTYsMi4wMmMtLjA3LDEuMS0uMzEsMS44NC0uNzQsMi4yMi0uNDUuMzktMS4xLjYtMS45OS42aC0xLjQxYy0xLjg1LDAtMy4wMy0uNzQtMy41NC0yLjIzLS4yMy0uNTQtLjY2LTEuOTktMS4yNC00LjMzbC0yLjMuNjhjLjczLDIuNzksMS4wOCw0Ljc2LDEuMDgsNS45MSwwLDEuMDQtLjE2LDItLjQ5LDIuODgtLjMyLjg4LS44OSwxLjYyLTEuNjksMi4yMi0uODEuNjEtMS44LjkxLTIuOTkuOTEtLjUzLDAtMS0uMDUtMS40Mi0uMTJsLS4yNiwyLjMzYy43Ny4xNSwxLjUuMjMsMi4xOC4yMywxLjk1LDAsMy41Mi0uNjIsNC42OS0xLjg4LDEuMTgtMS4yNiwxLjg3LTIuOTksMi4wNy01LjE3LjgyLjkxLDIuMDQsMS4zNSwzLjY1LDEuMzVoMS4yNmMxLjQ1LDAsMi42MS0uMzQsMy40OC0xLjA0LDEuMDUuOCwyLjQ1LDEuMiw0LjE2LDEuMi44NywwLDEuNy0uMTQsMi41Mi0uNDIuODItLjI4LDEuNDMtLjcyLDEuODUtMS4zLjcsMS4wOCwxLjg4LDEuNjQsMy41NCwxLjY0czIuOTItLjQ3LDMuNzUtMS40MmMxLjI4LjkxLDIuNzksMS4zNCw0LjQ5LDEuMzRoLjY5Yy45NywwLDEuOTctLjExLDIuOTktLjMyLDEuMDMtLjIyLDEuODQtLjQ5LDIuNDEtLjguMjYtLjg5LjQzLTEuODUuNS0yLjg5LjA3LTEuMDMuMDktMi42MS4wOS00Ljc3cy0uMDEtNS41NC0uMDctMTAuMmwtMi41LjIyWiIvPgogICAgICA8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjUxOC40NiAzNjIuMjkgNTE4LjQ2IDM4MS4wNiA1MjAuOTIgMzgxLjA2IDUyMC45MiAzNjIuMDcgNTE4LjQ2IDM2Mi4yOSIvPgogICAgPC9nPgogICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTIyOS4yOSwzNDguMzZjMy42OSwxLjAxLDcuNzgsMS42LDEyLjMsMS43Nyw2LjM4LjI1LDEyLjA4LS4zNSwxNy4wOC0xLjc3LDE0Ljk1LTQuMjUsMjMuNjctMTUuODksMjUuNTItMzQuMzguOTktOS44Mi42OS0zMC44NS0uNDUtMzEuNDYtMS40OS0uOC0yNC4xOS0uNjktMjQuODYuMTItLjM0LjQxLS41OCw2LjQtLjY5LDE2LjgyLS4xNSwxNS42OC0uMTksMTYuMjctMS4zLDE4LjY4LTQuNzcsMTAuMzctMjEuNjcsOS4yNi0yNS4wNC0xLjY0LTEuMTktMy44NS0xLjYxLTEwOC4wNy0uNDYtMTEyLjM2LDMuMTgtMTEuODUsMTkuNjQtMTMuOTMsMjUuMy0zLjIxbDEuMzQsMi41Ni4xNSwxMy4yMWMuMTMsMTEuNTQuMjUsMTMuMjkuOTcsMTMuODMsMS4yMS45MiwyMy41MS44OSwyNC43OC0uMDQsMS4wNC0uNzYuOS0yMS45NC0uMTktMjguOS0yLjUtMTUuOTUtMTEuODYtMjYuOS0yNi40MS0zMC44OC01LjUyLTEuNTEtMTkuNTUtMS43My0yNS4yMi0uNC0xNi43NSwzLjk0LTI1LjA3LDEzLjY3LTI4LjQyLDMzLjIzLTEuMzUsNy45My0uODMsMTEwLjQyLjYsMTE2LjY1LDMuNTIsMTUuMzQsMTEuNiwyNC41MywyNC45OSwyOC4xN1oiLz4KICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0zNDMuNTIsMzE3LjE1Yy41NCwzLjU3LDEuNjgsMTEuMTksMi41MiwxNi45NS44NSw1Ljc2LDEuNzEsMTEuMTQsMS45MiwxMS45NmwuMzgsMS41LDExLjE1LjEzYzYuMTMuMDgsMTEuMzMtLjA0LDExLjU1LS4yNi40Ni0uNDYsMS41Mi02LjI3LDIuNjQtMTQuNTguNDMtMy4xNSwxLjEyLTcuODYsMS41NC0xMC40NywxLjI3LTcuOTcsNy4yMi00Ny40MSw5LjIxLTYxLjA3LjgtNS40OSwxLjgxLTEyLjIyLDIuMjMtMTQuOTUuNDMtMi43NSwxLjIxLTcuOTEsMS43NS0xMS40Ny41My0zLjU2LDEuMTEtNy4yNiwxLjI3LTguMjIsMS40Ni04LjMyLDEuNDctNy40OSwxLjczLDgyLjUxbC4wNywzOS4xOGgyNi44OWMtLjAzLTIzLjE3LS4wNC00OC40NC0uMDQtNzUuMjksMC03Ny41NC0uMTMtMTAwLjY4LS41OS0xMDEuMTQtLjY4LS42Ny0zNy42LS44OC0zOC41OS0uMjItLjMuMi0uNywxLjYtLjg4LDMuMTEtLjUxLDQuMjEtMS4xLDguMzItMi43NCwxOS40NS0uODMsNS42Mi0yLjE5LDE1LjM3LTMuMDMsMjEuNjgtLjgzLDYuMzEtMS43NSwxMi45Mi0yLjAyLDE0LjcxLS4yOCwxLjc4LTEuNjMsMTEuMzItMywyMS4xOC0xLjM4LDkuODctMi44NCwyMC4zLTMuMjYsMjMuMTgtLjQyLDIuODgtMS4wNyw3LjctMS40NywxMC43MS0xLjc1LDEzLjQ4LTIuMTIsMTMuNTgtMy43NCwxLS41My00LjEyLTEuMjktOS43Mi0xLjctMTIuNDctMS4yOC04LjczLTIuNy0xOC42Ni00LjAyLTI4LjQyLS43MS01LjIxLTEuNjEtMTEuNi0yLjAyLTE0LjItLjM5LTIuNjEtLjk1LTYuNjQtMS4yNC04Ljk4LS4yOS0yLjMzLS43My01LjU4LTEtNy4yMi0uNDgtMi45NS0xLjA2LTcuMS0xLjk3LTEzLjk2LS43Mi01LjM3LTIuNDgtMTguMS0yLjk3LTIxLjQ0LS4yNC0xLjY0LS41OS00LjExLS43Ny01LjQ3LS4xNy0xLjM3LS41OC0yLjY1LS45Mi0yLjg2LS45My0uNTktMzcuMTMtLjQ4LTM4LjI2LjEyLS45NS41MS0uOTcsMi4xNy0uOTcsMTAxLjE5LDAsMzcuMDgsMCw2MC41MS0uMDYsNzUuMzNoMjQuODhsLjEtMzkuNjhjLjI4LTk5LjgyLjA5LTk1LjI2LDMtNzQuMDQuNTUsMy45NywxLjEsNy41NiwxLjIzLDcuOTcuMTIuNDIsMS4wMiw2LjI2LDEuOTksMTIuOTcsMS43NCwxMi4wNiwyLjQ4LDE3LjAzLDUsMzMuNjQuNzEsNC42NywxLjczLDExLjQsMi4yNiwxNC45Ni41MywzLjU2LDEuNCw5LjQsMS45NSwxMi45NloiLz4KICA8L2c+Cjwvc3ZnPg==" alt=""><div class="cv-co">${t('pv_company')}</div></div>
      <div class="cv-mid"><div class="cv-kicker">${t('pv_title')}</div>
        <div class="cv-name">${esc(name)}</div>${p.name_native?`<div class="cv-native">${esc(p.name_native)}</div>`:''}
        <div class="cv-meta">${nat}</div><div class="cv-status">${statusChip(st)}</div></div>
      <div class="cv-foot"><div>${t('pv_generated')} ${today}${time?` · ${time}`:''}</div><div class="pgn">1 / ${total}</div></div></div>`;
  const contents=`<div class="pg toc">${run}<div class="pv-body"><div class="pv-h2">${t('pv_contents')}</div><ol class="toc-list">${tocRows}</ol></div>${foot(2)}</div>`;
  for(const s of officeTasks){ const oh=await officeDocHtml(s.path); if(!oh)continue; pg++;   // the actual Word/Excel page, rendered in-app
    scans+=`<div class="pg scan office">${run}<div class="pv-body"><div class="pv-h2">${esc(s.title)}</div><div class="pv-office" dir="ltr">${oh}</div></div>${foot(pg)}</div>`; }
  return cover+contents+report+scans;
}
// THE RULE (systematic, every file type): عرض = the ORIGINAL intake file (scan_path, opened/downloaded
// as-is); REVIEW + PRINT = the PDF. This helper does the swap: an .xlsx/.docx → its rendered .pdf sibling
// (same path, .pdf); a PDF or image is already its own "PDF form" → returned unchanged. So a PDF drop is
// used as-is in review/print (Word-printed PDF = exact), and office docs are shown via their LibreOffice PDF.
function _printPath(p){ return /\.(xlsx|docx)$/i.test(p||'') ? p.replace(/\.(xlsx|docx)$/i, '.pdf') : (p||null); }
// A WIDE scan (a landscape form — e.g. an استمارة) should print BIG on a landscape page, not shrunk
// onto a portrait sheet. After the scans rasterise, flag the wide ones so the print CSS turns just
// those pages landscape (portrait passports/visas are untouched).
function _flipWidePages(){
  try{ document.querySelectorAll('#print .pg.scan').forEach(pg=>{
    const im=pg.querySelector('.pv-scan');
    if(im && im.naturalWidth && im.naturalWidth > im.naturalHeight*1.15) pg.classList.add('land');
  }); }catch(_){}
}
function waitImages(root){
  const imgs=[...root.querySelectorAll('img')];
  return Promise.all(imgs.map(im=>im.complete?1:new Promise(r=>{im.onload=im.onerror=r})));
}
async function printEmployee(){
  try{
    const html=await buildDossier(); if(!html){window.print();return}
    $('#print').innerHTML=html; await waitImages($('#print'));
    window.print();
  }catch(e){ console.warn('print',e); window.print(); }
}

/* ── BATCH dossier — a pro print of the LEGAL PAPERS THEMSELVES (from the Law batch view).
   Cover (logo + «الأوراق القانونية للمنح رقم X») → contents → the roster table → ALL pages of the
   3 scans. Reuses the same print sheet machinery as the employee dossier. */
async function buildBatchDossier(b){
  const id=b.batch_id;
  let today='—', time=''; try{ const d=new Date(), p=n=>String(n).padStart(2,'0');
    today=`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; time=`${p(d.getHours())}:${p(d.getMinutes())}`; }catch(_){}
  const run=`<div class="pv-run"><b>ICCMC</b><span>⚖ ${esc(id)}</span></div>`;
  const tl=Object.fromEntries(ptKeys().map(k=>[k,ptLabel(k)]));   // registry-driven labels (G6)
  const scanTasks=[];
  const brot=b.rot||{};
  if(b.taahud_scan)   scanTasks.push({title:tl.taahud,   path:_printPath(b.taahud_scan),   rotDeg:brot.taahud||0});
  if(b.istimara_scan) scanTasks.push({title:tl.istimara, path:_printPath(b.istimara_scan), rotDeg:brot.istimara||0});
  if(b.manh_scan)     scanTasks.push({title:tl.manh,     path:_printPath(b.manh_scan),     rotDeg:brot.manh||0});
  const officeTasks=scanTasks.filter(s=>/\.(docx|xlsx)$/i.test(s.path||''));   // any Office scan without a PDF render → fallback
  const perTask=await Promise.all(scanTasks.map(s=>scanImagesAll(s.path, s.rotDeg||0)));
  const scanPages=[];
  scanTasks.forEach((s,i)=>{ const imgs=(perTask[i]||[]).filter(Boolean);
    imgs.forEach((img,pi)=>scanPages.push({title:imgs.length>1?`${s.title} (${pi+1}/${imgs.length})`:s.title, img})); });
  // PAGINATE the roster so a long list flows across proper pages — never overflow one page into a
  // half-empty trailing sheet. ~22 rows fit an A4 with the header + footer.
  const PER=22, chunks=[];
  for(let i=0;i<b.members.length;i+=PER) chunks.push(b.members.slice(i,i+PER));
  if(!chunks.length) chunks.push([]);
  const total=2+chunks.length+scanPages.length+officeTasks.length;        // cover · contents · roster page(s) · scans · office pages
  const foot=n=>`<div class="pv-foot"><span>${today}${time?` · ${time}`:''}</span><span class="pgn">${n} / ${total}</span></div>`;
  const cover=`<div class="pg cover">
      <div class="cv-top"><img class="cv-logo" src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjQ3IDE2MCA0ODIgMjU2Ij4KICA8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMjkuOC4yLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogMi4xLjEgQnVpbGQgMykgIC0tPgogIDxkZWZzPgogICAgPHN0eWxlPgogICAgICAuc3QwIHsKICAgICAgICBmaWxsOiAjZmZmOwogICAgICB9CiAgICA8L3N0eWxlPgogIDwvZGVmcz4KICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNTA3LjI1LDI4Mi4xMmwtMTIuNC4xNC0uMjYsMTYuMmMtLjI1LDE1LjM5LS4zMiwxNi4zNC0xLjQsMTkuMDYtNC4zNSwxMC45LTIxLjkxLDkuOTktMjUuMjctMS4zMS0xLjM0LTQuNTEtMS4wOC0xMTAuMDIuMjgtMTEzLjY2LDIuMjMtNS45NSw1LjQ1LTguMDQsMTIuNDQtOC4wNCwxMS4zOSwwLDEzLjk0LDQuNCwxMy45NiwyMy45NiwwLDguMjYuMTcsMTEuNjYuNiwxMi4wOC44NS44NiwyNC4zOC44NiwyNS4yMiwwLDEuNC0xLjQuMzctMjYuNzUtMS4zNy0zMy41NS01LjA5LTE5Ljk2LTIyLjE0LTMwLjI5LTQ1LjY0LTI3LjY0LTE5LjI3LDIuMTctMzAuOTIsMTMuOTctMzMuNjMsMzQuMDQtLjg4LDYuNTUtLjcsMTA4LjA3LjIsMTE0LDIuNTMsMTYuNTQsMTEuMSwyNi45NywyNS4zNiwzMC45NiwzLjY2LDEuMDQsNy43MSwxLjY0LDEyLjEyLDEuODEsNi41Ni4yNSwxMi4zOC0uMzUsMTcuNDgtMS44MSwxMy4xLTMuNzMsMjEuMzMtMTMuMSwyNC42NC0yOC4wNywxLjQtNi4zMiwyLjA2LTM2LjY1LjgzLTM3LjY4LS41Ny0uNDctMy44Mi0uNTgtMTMuMTYtLjQ5WiIvPgogIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0xMjkuODksMzQ4LjM2YzguMTcsMi44MSwxNy43NSwzLjExLDI3Ljk0LjQ5LjYxLS4xNiwxLjIxLS4zMiwxLjgtLjQ5LDE4Ljg2LTUuNDgsMjUuMjktMTcuODksMjUuNzMtNDguNzFsLjI1LTE3LTEuMTgtLjMyYy0xLjY1LS40NC0yMy40OC0uMzgtMjQuMTkuMDYtLjQuMjUtLjYzLDQuOTYtLjc4LDE2LjA3LS4xOSwxNS4wMS0uMjUsMTUuODQtMS4zNiwxOC42OS00LjE0LDEwLjYzLTIwLjMxLDExLjAzLTI1LjAyLjYybC0xLjE5LTIuNjF2LTExMS4xOGwxLjQxLTIuODdjMy4xMS02LjM0LDExLjUzLTguODUsMTguNzItNS41OCw2LjE2LDIuOCw3LjE1LDUuNzgsNy40MywyMi41M2wuMiwxMi41OWgxLjgzYzEsMCw2LjQyLjAzLDEyLjA0LjA1LDUuNjMuMDIsMTAuNjQsMCwxMS4xNSwwLDEuNDYtLjA3Ljk0LTI1LjctLjY0LTMxLjk1LTUuODUtMjMuMjEtMjUuODQtMzQuMTktNTEuMzktMjguMjMtNy4wNiwxLjY0LTE0LjUzLDUuNTktMTcuNjUsOS4zNC01LjM4LDYuNDUtNy42OSwxMS4wMi05LjY3LDE5LjE0LTEuMzMsNS40NC0xLjMsMTE2LjMyLjAzLDEyMS43NywzLjM1LDEzLjc4LDEyLjM5LDIzLjQ0LDI0LjUzLDI3LjZaIi8+CiAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTgzLjM0LDM0OC4zNnYtODguNzRjMC02Ljc0LDAtMTMuNDksMC0yMC4wN3YtNjguMzVoLTEzLjc4Yy0xLjgsMC0zLjYsMC01LjMsMGgtOS40NXY4OC45OWMwLDQuOCwwLDkuNTksMCwxNC4zM3Y3My44NWgyOC41MloiLz4KICA8Zz4KICAgIDxnPgogICAgICA8cmVjdCBjbGFzcz0ic3QwIiB4PSI1NC44MSIgeT0iMzkyLjM0IiB3aWR0aD0iMS43MiIgaGVpZ2h0PSIxMS41NSIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNjQuNywzOTguNjN2NS4yNmgxLjY2di01LjM4YzAtMS4wMi0uMy0xLjgxLS45LTIuMzUtLjYxLS41Ni0xLjQ4LS44NC0yLjYzLS44NC0xLjMsMC0yLjQ5LjI2LTMuNTkuNzd2Ny43OWgxLjY3di02Ljc0Yy41Ny0uMjgsMS4yMi0uNDIsMS45My0uNDIsMS4yNCwwLDEuODcuNjMsMS44NywxLjg5WiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNzEuNzIsNDA0LjA5Yy40NSwwLC44OS0uMDUsMS4zNC0uMTZsLS4xLTEuMzVjLS4yOC4wNy0uNjEuMTEtLjk2LjExLS44NiwwLTEuMjktLjUyLTEuMjktMS41NHYtNC4yN2gyLjA2di0xLjM2aC0yLjA2di0xLjk5bC0xLjY3LjA4djEuOTFoLTEuMTh2MS4zNmgxLjE4djQuMjljMCwxLjk1Ljg5LDIuOTIsMi42OCwyLjkyWiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNzUuMTIsMzk2LjUzYy0uNzIuODEtMS4wNywxLjg2LTEuMDcsMy4xNywwLDEuMzguMzksMi40NSwxLjE4LDMuMjIuNzguNzgsMS44NCwxLjE2LDMuMTcsMS4xNiwxLjA3LDAsMi4wMS0uMTksMi44NC0uNTdsLS4yOC0xLjM1Yy0uODEuMzQtMS42LjUxLTIuNDEuNTEtMS42OSwwLTIuNjMtLjg1LTIuNzktMi41N2g1LjYzYy4wNS0uNDIuMDYtLjc5LjA2LTEuMSwwLTEuMDgtLjMxLTEuOTYtLjkzLTIuNjQtLjYxLS42OC0xLjQ3LTEuMDItMi41Mi0xLjAyLTEuMjEsMC0yLjE2LjQtMi44OCwxLjIxWk03OS44NSwzOTguNzZjMCwuMTEsMCwuMi0uMDIuMjdoLTQuMDVjLjA3LS43My4zMS0xLjMuNjktMS43MS4zOC0uNDIuODktLjYyLDEuNTMtLjYyLjYsMCwxLjA2LjIsMS4zOC41OS4zMS4zOS40Ny44OC40NywxLjQ3WiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNODUuMjQsMzk3LjE2Yy41NC0uMjgsMS4xOC0uNDIsMS45Mi0uNDIuMzEsMCwuNi4wMy44My4xMWwuMjMtMS40MWMtLjM1LS4wNy0uNzUtLjExLTEuMTctLjExLTEuMzYsMC0yLjUyLjI3LTMuNDcuOHY3Ljc3aDEuNjd2LTYuNzRaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik05MS40MSwzOTcuMTZjLjU3LS4yOCwxLjIyLS40MiwxLjkzLS40MiwxLjI0LDAsMS44Ni42MywxLjg2LDEuODl2NS4yNmgxLjY3di01LjM4YzAtMS4wMi0uMzEtMS44MS0uOTEtMi4zNS0uNi0uNTYtMS40Ny0uODQtMi42Mi0uODQtMS4zLDAtMi41LjI2LTMuNi43N3Y3Ljc5aDEuNjd2LTYuNzRaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0xMDIuMDUsNDA0LjA5YzEuMzUsMCwyLjQ4LS4yNCwzLjM4LS43NnYtNC43M2MwLTEuMDYtLjI5LTEuODYtLjg2LTIuNDMtLjU2LS41Ni0xLjQyLS44NC0yLjU0LS44NC0xLjAzLDAtMS45My4xNi0yLjcuNDhsLjMyLDEuMzRjLjY3LS4yNywxLjQxLS40LDIuMjItLjQsMS4yOCwwLDEuOTMuNTksMS45MywxLjc4di42OWMtLjUzLS4xMi0xLjEyLS4xOS0xLjc0LS4xOS0uOTgsMC0xLjc3LjIyLTIuMzYuNjYtLjYuNDQtLjg5LDEuMDctLjg5LDEuODksMCwuNzYuMjgsMS4zNi44NCwxLjgxLjU2LjQ3LDEuMzYuNjksMi40Mi42OVpNMTAyLjI0LDQwMC4xM2MuNSwwLDEuMDIuMDYsMS41NS4ydjIuMTZjLS4zOS4yMy0uOTMuMzUtMS42LjM1LTEuMTYsMC0xLjczLS40NC0xLjczLTEuMzJzLjU5LTEuMzksMS43OC0xLjM5WiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMTA4LjEyLDQwMS4xN2MwLDEuOTUuODksMi45MiwyLjY3LDIuOTIuNDUsMCwuOS0uMDUsMS4zNC0uMTZsLS4xLTEuMzVjLS4yOC4wNy0uNi4xMS0uOTYuMTEtLjg1LDAtMS4yOC0uNTItMS4yOC0xLjU0di00LjI3aDIuMDZ2LTEuMzZoLTIuMDZ2LTEuOTlsLTEuNjcuMDh2MS45MWgtMS4xOXYxLjM2aDEuMTl2NC4yOVoiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTExNS4zNywzOTIuMzNjLS4xOS0uMTktLjQ0LS4yNy0uNzUtLjI3cy0uNTcuMDgtLjc2LjI3Yy0uMTkuMTktLjI4LjQzLS4yOC43MiwwLC4zMS4wOS41Ni4yNy43NS4xOC4xOC40NC4yNy43Ny4yN3MuNTYtLjEuNzUtLjI3Yy4xOC0uMTkuMjctLjQ0LjI3LS43NSwwLS4yOS0uMS0uNTMtLjI3LS43MloiLz4KICAgICAgPHJlY3QgY2xhc3M9InN0MCIgeD0iMTEzLjc5IiB5PSIzOTUuNTIiIHdpZHRoPSIxLjY3IiBoZWlnaHQ9IjguMzciLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTEyNS40MSwzOTkuN2MwLTEuMzItLjM1LTIuMzktMS4wNS0zLjE4LS43LS44MS0xLjY2LTEuMi0yLjg4LTEuMnMtMi4xNy4zOS0yLjg3LDEuMmMtLjY5Ljc5LTEuMDUsMS44NS0xLjA1LDMuMThzLjM1LDIuMzksMS4wNSwzLjE5Yy43LjgsMS42NiwxLjE5LDIuODcsMS4xOXMyLjE4LS4zOSwyLjg4LTEuMTljLjctLjgsMS4wNS0xLjg2LDEuMDUtMy4xOVpNMTIzLjE0LDQwMS44OWMtLjM2LjUyLS45Mi44LTEuNjUuOHMtMS4yNy0uMjctMS42NS0uOGMtLjM3LS41NC0uNTYtMS4yNy0uNTYtMi4xOXMuMTktMS42NC41Ni0yLjE3Yy4zOS0uNTQuOTMtLjgsMS42NS0uOHMxLjI3LjI2LDEuNjQuNzhjLjM4LjUzLjU2LDEuMjYuNTYsMi4xOHMtLjE5LDEuNjYtLjU2LDIuMTlaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0xMzEuMDksMzk1LjMzYy0xLjMsMC0yLjQ5LjI2LTMuNTkuNzd2Ny43OWgxLjY3di02Ljc0Yy41Ny0uMjgsMS4yMi0uNDIsMS45My0uNDIsMS4yNSwwLDEuODcuNjMsMS44NywxLjg5djUuMjZoMS42N3YtNS4zOGMwLTEuMDItLjMxLTEuODEtLjkxLTIuMzUtLjYtLjU2LTEuNDgtLjg0LTIuNjMtLjg0WiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMTM5Ljc4LDQwNC4wOWMxLjM3LDAsMi41LS4yNCwzLjM5LS43NnYtNC43M2MwLTEuMDYtLjI5LTEuODYtLjg2LTIuNDMtLjU3LS41Ni0xLjQyLS44NC0yLjU0LS44NC0xLjA0LDAtMS45NC4xNi0yLjcxLjQ4bC4zMywxLjM0Yy42Ny0uMjcsMS40MS0uNCwyLjIxLS40LDEuMjksMCwxLjkzLjU5LDEuOTMsMS43OHYuNjljLS41NC0uMTItMS4xMi0uMTktMS43Ni0uMTktLjk4LDAtMS43Ni4yMi0yLjM1LjY2LS42LjQ0LS44OSwxLjA3LS44OSwxLjg5LDAsLjc2LjI4LDEuMzYuODUsMS44MS41Ni40NywxLjM2LjY5LDIuNC42OVpNMTM5Ljk5LDQwMC4xM2MuNTEsMCwxLjAyLjA2LDEuNTYuMnYyLjE2Yy0uMzkuMjMtLjkzLjM1LTEuNi4zNS0xLjE2LDAtMS43NC0uNDQtMS43NC0xLjMycy42LTEuMzksMS43OC0xLjM5WiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMTQ1LjY0LDM5Mi4wNHY5LjJjMCwxLjkuNzcsMi44NCwyLjM1LDIuODQuMzEsMCwuNjMtLjAzLjk0LS4xMWwtLjE0LTEuMzRjLS4xNC4wMy0uMjkuMDYtLjQ4LjA2LS4zNiwwLS42My0uMTItLjc3LS4zNS0uMTUtLjI0LS4yMy0uNi0uMjMtMS4xMnYtOS4yOGwtMS42Ny4xWiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMTU5LjM1LDM5My42N2MuNjIsMCwxLjQzLjE4LDIuMzkuNTNsLjM5LTEuNDljLS45NC0uMzgtMS44OC0uNTctMi44MS0uNTctMS43MiwwLTMuMDUuNTYtMy45NSwxLjY3LS45LDEuMS0xLjM2LDIuNTktMS4zNiw0LjQycy40NiwzLjIzLDEuMzgsNC4yOGMuOTIsMS4wNSwyLjIzLDEuNTcsMy45MywxLjU3LDEuMDksMCwyLjA2LS4yMSwyLjkxLS42NWwtLjM1LTEuNWMtLjg0LjQxLTEuNjcuNjItMi40OS42Mi0xLjIyLDAtMi4xMS0uMzgtMi43MS0xLjE0LS42LS43Ni0uODktMS44My0uODktMy4yMXMuMjktMi40OS44Ny0zLjNjLjU4LS44MiwxLjQ3LTEuMjMsMi42OC0xLjIzWiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMTcxLjM2LDQwMy44OXYtNS4zOGMwLTEuMDEtLjMtMS43OC0uODktMi4zNS0uNi0uNTYtMS40My0uODQtMi40Ny0uODQtLjc4LDAtMS40OC4xNi0yLjEuNDh2LTMuODZsLTEuNjcuMDh2MTEuODdoMS42N3YtNi42N2MuNTYtLjMxLDEuMTktLjQ4LDEuODYtLjQ4LDEuMjcsMCwxLjkyLjY0LDEuOTIsMS45djUuMjVoMS42OFoiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTE3NS40OSwzOTIuMzNjLS4xOS0uMTktLjQ0LS4yNy0uNzYtLjI3cy0uNTcuMDgtLjc2LjI3Yy0uMTkuMTktLjI3LjQzLS4yNy43MiwwLC4zMS4wOS41Ni4yNy43NS4xOS4xOC40NC4yNy43Ny4yN3MuNTctLjEuNzYtLjI3Yy4xOC0uMTkuMjctLjQ0LjI3LS43NSwwLS4yOS0uMDktLjUzLS4yNy0uNzJaIi8+CiAgICAgIDxyZWN0IGNsYXNzPSJzdDAiIHg9IjE3My45MSIgeT0iMzk1LjUyIiB3aWR0aD0iMS42NiIgaGVpZ2h0PSI4LjM3Ii8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0xNzguMTgsMzk2LjF2Ny43OWgxLjY3di02Ljc0Yy41Ny0uMjgsMS4yMi0uNDIsMS45My0uNDIsMS4yNCwwLDEuODYuNjMsMS44NiwxLjg5djUuMjZoMS42N3YtNS4zOGMwLTEuMDItLjMxLTEuODEtLjkxLTIuMzUtLjYtLjU2LTEuNDctLjg0LTIuNjItLjg0LTEuMywwLTIuNS4yNi0zLjYuNzdaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0xOTEuNjYsNDA0LjA5YzEuMDcsMCwyLjAyLS4xOSwyLjg0LS41N2wtLjI3LTEuMzVjLS44MS4zNC0xLjYuNTEtMi40MS41MS0xLjcsMC0yLjYzLS44NS0yLjc5LTIuNTdoNS42M2MuMDUtLjQyLjA2LS43OS4wNi0xLjEsMC0xLjA4LS4zMS0xLjk2LS45My0yLjY0LS42My0uNjgtMS40Ny0xLjAyLTIuNTQtMS4wMi0xLjE5LDAtMi4xNS40LTIuODcsMS4yMS0uNzIuODEtMS4wNywxLjg2LTEuMDcsMy4xNywwLDEuMzguMzksMi40NSwxLjE4LDMuMjIuNzkuNzgsMS44NSwxLjE2LDMuMTgsMS4xNlpNMTg5LjczLDM5Ny4zMmMuMzgtLjQyLjg5LS42MiwxLjUyLS42MnMxLjA2LjIsMS4zOC41OWMuMzEuMzkuNDguODguNDgsMS40NywwLC4xMSwwLC4yLS4wMi4yN2gtNC4wNGMuMDctLjczLjMtMS4zLjY5LTEuNzFaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yMDAuMTQsNDAyLjQxYy0uMjkuMTktLjY5LjI4LTEuMTguMjgtLjg1LDAtMS43MS0uMTgtMi42LS41MmwtLjI0LDEuNGMuODEuMzUsMS43Ni41MSwyLjg0LjUxLjk4LDAsMS43Ny0uMiwyLjM2LS42My42LS40My44OS0xLjA0Ljg5LTEuODUsMC0uNjktLjIyLTEuMjMtLjY2LTEuNi0uNDQtLjM4LTEuMTQtLjctMi4xMy0uOTgtLjU5LS4xOC0xLS4zNS0xLjI0LS41MS0uMjUtLjE3LS4zNy0uNDMtLjM3LS43NywwLS42OS40OS0xLjAyLDEuNDgtMS4wMi41NiwwLDEuMy4xMywyLjIxLjRsLjItMS4zN2MtLjcxLS4yOS0xLjU1LS40NC0yLjUzLS40NHMtMS42OS4yMS0yLjIyLjY0Yy0uNTMuNDItLjgsMS4wMy0uOCwxLjgzLDAsLjY4LjIxLDEuMjEuNjIsMS41OC40Mi4zNywxLjAxLjY4LDEuOC45Ljc3LjIzLDEuMjkuNDIsMS41Ny41OS4yOC4xOC40My40My40My43N3MtLjE1LjU4LS40NC43N1oiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTIxMC42OCw0MDMuNTFsLS4yOC0xLjM1Yy0uODEuMzQtMS42LjUxLTIuNDIuNTEtMS42OSwwLTIuNjItLjg1LTIuNzgtMi41N2g1LjYzYy4wNC0uNDIuMDYtLjc5LjA2LTEuMSwwLTEuMDgtLjMxLTEuOTYtLjkzLTIuNjQtLjYzLS42OC0xLjQ3LTEuMDItMi41NC0xLjAyLTEuMTksMC0yLjE2LjQtMi44NywxLjIxLS43Mi44MS0xLjA4LDEuODYtMS4wOCwzLjE3LDAsMS4zOC40LDIuNDUsMS4xOCwzLjIyLjc5Ljc4LDEuODUsMS4xNiwzLjE4LDEuMTYsMS4wNywwLDIuMDEtLjE5LDIuODQtLjU3Wk0yMDUuOSwzOTcuMzJjLjM4LS40Mi44OS0uNjIsMS41Mi0uNjJzMS4wNi4yLDEuMzguNTljLjMyLjM5LjQ4Ljg4LjQ4LDEuNDcsMCwuMTEsMCwuMi0uMDIuMjdoLTQuMDRjLjA4LS43My4zMS0xLjMuNjktMS43MVoiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTIyMS43MSwzOTMuNjdjLjY0LDAsMS40My4xOCwyLjM5LjUzbC40LTEuNDljLS45My0uMzgtMS44Ny0uNTctMi44LS41Ny0xLjczLDAtMy4wNS41Ni0zLjk2LDEuNjctLjkxLDEuMS0xLjM1LDIuNTktMS4zNSw0LjQycy40NSwzLjIzLDEuMzgsNC4yOGMuOTEsMS4wNSwyLjIyLDEuNTcsMy45MywxLjU3LDEuMDcsMCwyLjA0LS4yMSwyLjktLjY1bC0uMzUtMS41Yy0uODQuNDEtMS42Ny42Mi0yLjQ5LjYyLTEuMjEsMC0yLjExLS4zOC0yLjcxLTEuMTRzLS44OS0xLjgzLS44OS0zLjIxLjI5LTIuNDkuODYtMy4zYy41Ny0uODIsMS40Ny0xLjIzLDIuNjgtMS4yM1oiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTIyNi43MywzOTYuNTNjLS43Ljc5LTEuMDUsMS44NS0xLjA1LDMuMThzLjM1LDIuMzksMS4wNSwzLjE5Yy43LjgsMS42NSwxLjE5LDIuODcsMS4xOXMyLjE4LS4zOSwyLjg4LTEuMTljLjY5LS44LDEuMDUtMS44NiwxLjA1LTMuMTlzLS4zNS0yLjM5LTEuMDUtMy4xOGMtLjctLjgxLTEuNjYtMS4yLTIuODgtMS4ycy0yLjE3LjM5LTIuODcsMS4yWk0yMzEuMjUsMzk3LjUyYy4zNy41My41NiwxLjI2LjU2LDIuMThzLS4xOCwxLjY2LS41NSwyLjE5Yy0uMzcuNTItLjkzLjgtMS42Ni44cy0xLjI3LS4yNy0xLjY0LS44Yy0uMzktLjU0LS41Ny0xLjI3LS41Ny0yLjE5cy4xOS0xLjY0LjU3LTIuMTdjLjM4LS41NC45My0uOCwxLjY0LS44czEuMjcuMjYsMS42NS43OFoiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTI0NC4zMSwzOTUuMzNjLS45NywwLTEuOTEuMjYtMi44MS43Ni0uNTctLjUtMS4zNi0uNzYtMi4zNi0uNzYtMS4yNiwwLTIuNDMuMjYtMy41NC43N3Y3Ljc5aDEuNjd2LTYuNzRjLjU1LS4yOCwxLjE0LS40MiwxLjgtLjQyLDEuMTksMCwxLjc4LjYzLDEuNzgsMS44OXY1LjI2aDEuNjR2LTUuMDljMC0uNTgtLjA3LTEuMDgtLjIyLTEuNTEuNTktLjM4LDEuMjUtLjU2LDEuOTktLjU2LDEuMTksMCwxLjc5LjYzLDEuNzksMS44OXY1LjI2aDEuNjd2LTUuMzhjMC0xLjAxLS4yOC0xLjc4LS44Ni0yLjM1LS41OC0uNTYtMS40Mi0uODQtMi41NC0uODRaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yNTEuODcsNDAzLjc1Yy41Mi4yMiwxLjA4LjMzLDEuNjcuMzMsMS4yOSwwLDIuMjgtLjQxLDIuOTgtMS4yNC42OS0uODIsMS4wNS0xLjkzLDEuMDUtMy4zLDAtMS4zLS4zNS0yLjMyLTEuMDctMy4wOC0uNzItLjc2LTEuNzItMS4xNC0zLjAyLTEuMTQtMS4xNywwLTIuMjYuMjUtMy4yNi43NHYxMC45aDEuNjZ2LTMuMjJaTTI1MS44NywzOTcuMDdjLjUtLjIzLDEtLjM0LDEuNTItLjM0LjgyLDAsMS40My4yNSwxLjg0Ljc3LjQuNTIuNiwxLjIxLjYsMi4wNywwLDIuMDctLjg1LDMuMTEtMi41MiwzLjExLS40NSwwLS45My0uMTItMS40NC0uMzZ2LTUuMjVaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yNjIuMywzOTkuMDNjLS45OCwwLTEuNzYuMjItMi4zNS42Ni0uNi40NC0uODksMS4wNy0uODksMS44OSwwLC43Ni4yOCwxLjM2Ljg1LDEuODEuNTYuNDcsMS4zNi42OSwyLjQuNjksMS4zNywwLDIuNS0uMjQsMy4zOS0uNzZ2LTQuNzNjMC0xLjA2LS4yOS0xLjg2LS44Ni0yLjQzLS41Ny0uNTYtMS40Mi0uODQtMi41NC0uODQtMS4wNCwwLTEuOTQuMTYtMi43MS40OGwuMzMsMS4zNGMuNjctLjI3LDEuNC0uNCwyLjIxLS40LDEuMjksMCwxLjkzLjU5LDEuOTMsMS43OHYuNjljLS41NS0uMTItMS4xMi0uMTktMS43Ni0uMTlaTTI2NC4wNiw0MDIuNDljLS4zOS4yMy0uOTMuMzUtMS42LjM1LTEuMTUsMC0xLjczLS40NC0xLjczLTEuMzJzLjYtMS4zOSwxLjc4LTEuMzljLjUxLDAsMS4wMi4wNiwxLjU2LjJ2Mi4xNloiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTI3NS4zMSw0MDMuODl2LTUuMzhjMC0xLjAyLS4zLTEuODEtLjktMi4zNS0uNjEtLjU2LTEuNDgtLjg0LTIuNjMtLjg0LTEuMywwLTIuNS4yNi0zLjU5Ljc3djcuNzloMS42N3YtNi43NGMuNTYtLjI4LDEuMjItLjQyLDEuOTMtLjQyLDEuMjQsMCwxLjg3LjYzLDEuODcsMS44OXY1LjI2aDEuNjZaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yNzcuMTYsNDA1LjVsLjI4LDEuNDRjMS43Ni0uMzUsMy4yMS0xLjUyLDQuMzQtMy41MSwxLjQ3LTIuNjUsMi4zNi01LjI5LDIuNjUtNy45MWgtMS42N2MtLjEyLDEuMzUtLjMzLDIuNTMtLjY0LDMuNTUtLjMsMS4wMi0uNzMsMi4wOS0xLjI3LDMuMTktLjYzLTEuMDYtMS4xNC0yLjExLTEuNTEtMy4xNy0uMzktMS4wNi0uNjQtMi4yNC0uNzYtMy41N2gtMS42OGMuMTYsMS41Ni40OCwyLjk2Ljk4LDQuMjIuNDgsMS4yNiwxLjE4LDIuNTMsMi4wOSwzLjgtLjY0LDEuMDYtMS41OCwxLjcyLTIuODIsMS45NloiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTI5MC4yNyw0MDMuODloMS42N3YtNy4wMWgyLjExdi0xLjM2aC0yLjExdi0uN2MwLTEuMDcuNDMtMS42LDEuMjgtMS42LjE5LDAsLjUxLjAzLjk0LjExbC4yOC0xLjMyYy0uNTctLjEzLTEuMDctLjE5LTEuNDgtLjE5LS45LDAtMS41OC4yNy0yLjAyLjgxLS40NS41NC0uNjcsMS4yOC0uNjcsMi4yM3YuNjdoLTEuMTl2MS4zNmgxLjE5djcuMDFaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yOTguODcsNDA0LjA5YzEuMjIsMCwyLjE4LS4zOSwyLjg4LTEuMTkuNy0uOCwxLjA1LTEuODYsMS4wNS0zLjE5cy0uMzUtMi4zOS0xLjA1LTMuMThjLS42OS0uODEtMS42Ni0xLjItMi44OC0xLjJzLTIuMTcuMzktMi44NiwxLjJjLS43Ljc5LTEuMDYsMS44NS0xLjA2LDMuMThzLjM1LDIuMzksMS4wNiwzLjE5Yy42OS44LDEuNjUsMS4xOSwyLjg2LDEuMTlaTTI5Ny4yMywzOTcuNTNjLjM3LS41NC45Mi0uOCwxLjY0LS44czEuMjguMjYsMS42NS43OGMuMzcuNTMuNTYsMS4yNi41NiwyLjE4cy0uMTksMS42Ni0uNTYsMi4xOWMtLjM2LjUyLS45Mi44LTEuNjUuOHMtMS4yNy0uMjctMS42NC0uOGMtLjM5LS41NC0uNTctMS4yNy0uNTctMi4xOXMuMTktMS42NC41Ny0yLjE3WiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzA2LjU5LDM5Ny4xNmMuNTUtLjI4LDEuMTgtLjQyLDEuOTItLjQyLjMyLDAsLjU5LjAzLjgzLjExbC4yMy0xLjQxYy0uMzUtLjA3LS43NC0uMTEtMS4xNy0uMTEtMS4zNywwLTIuNTIuMjctMy40Ny44djcuNzdoMS42NnYtNi43NFoiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTMyNS4yOCw0MDMuODloMS42MXYtMTEuNTVoLTEuOGMtMS4wOCwyLjY0LTIuNDQsNS4yOS00LjA5LDcuOTUtMS43MS0yLjczLTMuMDktNS4zOC00LjE0LTcuOTVoLTEuNzh2MTEuNTVoMS42di02LjY4YzAtLjcyLS4wMy0xLjM3LS4xLTEuOTUsMS4wNCwyLjI2LDIuMjcsNC41MiwzLjcyLDYuNzVoMS40YzEuNS0yLjM0LDIuNzItNC41OSwzLjY3LTYuNzQtLjA2LjY2LS4wOCwxLjMtLjA4LDEuOTN2Ni42OFoiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTMzNi41LDM5OC45OWMwLTEuMDgtLjMyLTEuOTYtLjkzLTIuNjQtLjYzLS42OC0xLjQ3LTEuMDItMi41NC0xLjAyLTEuMTksMC0yLjE2LjQtMi44NywxLjIxLS43Mi44MS0xLjA3LDEuODYtMS4wNywzLjE3LDAsMS4zOC4zOSwyLjQ1LDEuMTgsMy4yMi43OS43OCwxLjg1LDEuMTYsMy4xOCwxLjE2LDEuMDcsMCwyLjAxLS4xOSwyLjg0LS41N2wtLjI4LTEuMzVjLS44MS4zNC0xLjYxLjUxLTIuNDEuNTEtMS42OSwwLTIuNjMtLjg1LTIuNzktMi41N2g1LjYzYy4wNC0uNDIuMDctLjc5LjA3LTEuMVpNMzM0Ljg3LDM5OS4wM2gtNC4wNWMuMDgtLjczLjMxLTEuMy42OS0xLjcxLjM4LS40Mi44OS0uNjIsMS41Mi0uNjJzMS4wNi4yLDEuMzguNTljLjMxLjM5LjQ4Ljg4LjQ4LDEuNDcsMCwuMTEsMCwuMi0uMDIuMjdaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0zNDQuMzIsNDAyLjIyYy0uNjQuMzEtMS4yNy40Ny0xLjg5LjQ3LS44OCwwLTEuNTMtLjI2LTEuOTgtLjc2LS40NS0uNTItLjY5LTEuMjUtLjY5LTIuMjJzLjIzLTEuNjUuNjUtMi4xOGMuNDQtLjU0LDEuMDUtLjgsMS44NS0uOC42NCwwLDEuMy4xNCwxLjk4LjQybC4zMy0xLjMzYy0uNzItLjM0LTEuNTItLjUtMi40My0uNS0xLjI4LDAtMi4yNy40LTMsMS4yMXMtMS4wOCwxLjg3LTEuMDgsMy4yMi4zNywyLjQzLDEuMTEsMy4yYy43NC43NiwxLjc5LDEuMTQsMy4xMywxLjE0Ljg4LDAsMS42NS0uMTYsMi4zMS0uNTFsLS4zLTEuMzVaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0zNTMuNjYsNDAzLjg5di01LjM4YzAtMS4wMS0uMy0xLjc4LS45LTIuMzUtLjYtLjU2LTEuNDItLjg0LTIuNDctLjg0LS43OCwwLTEuNDcuMTYtMi4wOS40OHYtMy44NmwtMS42Ny4wOHYxMS44N2gxLjY3di02LjY3Yy41Ny0uMzEsMS4xOC0uNDgsMS44Ni0uNDgsMS4yNywwLDEuOTIuNjQsMS45MiwxLjl2NS4yNWgxLjY4WiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzYyLjIxLDQwMy4zM3YtNC43M2MwLTEuMDYtLjI4LTEuODYtLjg1LTIuNDMtLjU3LS41Ni0xLjQyLS44NC0yLjU1LS44NC0xLjAzLDAtMS45My4xNi0yLjcxLjQ4bC4zMywxLjM0Yy42Ny0uMjcsMS40MS0uNCwyLjIxLS40LDEuMywwLDEuOTMuNTksMS45MywxLjc4di42OWMtLjU0LS4xMi0xLjEyLS4xOS0xLjc1LS4xOS0uOTgsMC0xLjc3LjIyLTIuMzYuNjYtLjU5LjQ0LS44OSwxLjA3LS44OSwxLjg5LDAsLjc2LjI3LDEuMzYuODQsMS44MS41Ni40NywxLjM3LjY5LDIuNDEuNjksMS4zNiwwLDIuNS0uMjQsMy4zOC0uNzZaTTM1Ny4yNSw0MDEuNTJjMC0uOTIuNTktMS4zOSwxLjc4LTEuMzkuNTEsMCwxLjAyLjA2LDEuNTUuMnYyLjE2Yy0uMzkuMjMtLjkzLjM1LTEuNi4zNS0xLjE1LDAtMS43Mi0uNDQtMS43Mi0xLjMyWiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzcxLjgzLDQwMy44OXYtNS4zOGMwLTEuMDItLjMxLTEuODEtLjkxLTIuMzUtLjYtLjU2LTEuNDctLjg0LTIuNjItLjg0LTEuMywwLTIuNTEuMjYtMy42Ljc3djcuNzloMS42N3YtNi43NGMuNTctLjI4LDEuMjItLjQyLDEuOTMtLjQyLDEuMjQsMCwxLjg2LjYzLDEuODYsMS44OXY1LjI2aDEuNjdaIi8+CiAgICAgIDxyZWN0IGNsYXNzPSJzdDAiIHg9IjM3NC4zNyIgeT0iMzk1LjUyIiB3aWR0aD0iMS42NyIgaGVpZ2h0PSI4LjM3Ii8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0zNzUuOTUsMzkyLjMzYy0uMTgtLjE5LS40NC0uMjctLjc1LS4yN3MtLjU3LjA4LS43Ni4yN2MtLjE5LjE5LS4yOC40My0uMjguNzIsMCwuMzEuMDkuNTYuMjcuNzUuMTguMTguNDQuMjcuNzcuMjdzLjU3LS4xLjc1LS4yN2MuMTktLjE5LjI3LS40NC4yNy0uNzUsMC0uMjktLjA5LS41My0uMjctLjcyWiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzgyLjM1LDM5Ni43NGMuNjMsMCwxLjMuMTQsMS45Ny40MmwuMzMtMS4zM2MtLjcxLS4zNC0xLjUyLS41LTIuNDMtLjUtMS4yOCwwLTIuMjcuNC0yLjk5LDEuMjEtLjczLjgxLTEuMDksMS44Ny0xLjA5LDMuMjJzLjM3LDIuNDMsMS4xMiwzLjJjLjc0Ljc2LDEuNzgsMS4xNCwzLjEzLDEuMTQuODgsMCwxLjY0LS4xNiwyLjMxLS41MWwtLjMxLTEuMzVjLS42NC4zMS0xLjI3LjQ3LTEuODkuNDctLjg3LDAtMS41Mi0uMjYtMS45Ny0uNzYtLjQ2LS41Mi0uNjktMS4yNS0uNjktMi4yMnMuMjItMS42NS42NS0yLjE4Yy40NC0uNTQsMS4wNS0uOCwxLjg1LS44WiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzg5LjkzLDQwMi40MWMtLjI5LjE5LS42OS4yOC0xLjE4LjI4LS44NSwwLTEuNzEtLjE4LTIuNi0uNTJsLS4yNCwxLjRjLjgxLjM1LDEuNzcuNTEsMi44NS41MS45OCwwLDEuNzctLjIsMi4zNi0uNjMuNi0uNDMuODktMS4wNC44OS0xLjg1LDAtLjY5LS4yMy0xLjIzLS42Ni0xLjYtLjQ0LS4zOC0xLjE1LS43LTIuMTMtLjk4LS41OS0uMTgtMS4wMS0uMzUtMS4yNS0uNTEtLjI1LS4xNy0uMzgtLjQzLS4zOC0uNzcsMC0uNjkuNS0xLjAyLDEuNDktMS4wMi41NiwwLDEuMy4xMywyLjIxLjRsLjItMS4zN2MtLjctLjI5LTEuNTUtLjQ0LTIuNTItLjQ0cy0xLjcuMjEtMi4yMy42NGMtLjUyLjQyLS43OSwxLjAzLS43OSwxLjgzLDAsLjY4LjIxLDEuMjEuNjIsMS41OC40MS4zNywxLjAxLjY4LDEuNzkuOS43Ny4yMywxLjMuNDIsMS41OC41OS4yNy4xOC40Mi40My40Mi43N3MtLjE1LjU4LS40NC43N1oiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTQwMC4yOCwzOTkuMDNjLS45OCwwLTEuNzYuMjItMi4zNi42Ni0uNTkuNDQtLjg5LDEuMDctLjg5LDEuODksMCwuNzYuMjgsMS4zNi44NSwxLjgxLjU2LjQ3LDEuMzYuNjksMi40LjY5LDEuMzcsMCwyLjUtLjI0LDMuMzgtLjc2di00LjczYzAtMS4wNi0uMjgtMS44Ni0uODUtMi40My0uNTctLjU2LTEuNDItLjg0LTIuNTQtLjg0LTEuMDQsMC0xLjk0LjE2LTIuNzIuNDhsLjMzLDEuMzRjLjY4LS4yNywxLjQyLS40LDIuMjItLjQsMS4yOSwwLDEuOTMuNTksMS45MywxLjc4di42OWMtLjUzLS4xMi0xLjEyLS4xOS0xLjc1LS4xOVpNNDAyLjAzLDQwMi40OWMtLjM5LjIzLS45My4zNS0xLjYuMzUtMS4xNSwwLTEuNzMtLjQ0LTEuNzMtMS4zMnMuNi0xLjM5LDEuNzgtMS4zOWMuNTEsMCwxLjAyLjA2LDEuNTUuMnYyLjE2WiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNDExLjYyLDQwMy44OWgxLjY3di01LjM4YzAtMS4wMi0uMy0xLjgxLS45LTIuMzUtLjYxLS41Ni0xLjQ4LS44NC0yLjYzLS44NC0xLjMsMC0yLjQ5LjI2LTMuNTkuNzd2Ny43OWgxLjY3di02Ljc0Yy41Ny0uMjgsMS4yMi0uNDIsMS45My0uNDIsMS4yNCwwLDEuODYuNjMsMS44NiwxLjg5djUuMjZaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik00MTUuMjksMzk5Ljg1YzAsMS4zMi4zOSwyLjM2LDEuMTYsMy4xMS43Ny43NiwxLjgxLDEuMTMsMy4xMywxLjEzLDEuMjIsMCwyLjIzLS4yMywzLjA4LS42OXYtMTEuNDRsLTEuNjcuMDh2My40OGMtLjQ0LS4xMy0uODctLjE5LTEuMzEtLjE5LTEuMzcsMC0yLjQzLjQxLTMuMjIsMS4yMy0uNzguODItMS4xNywxLjkyLTEuMTcsMy4yOVpNNDE3LjcsMzk3LjUyYy40OC0uNTIsMS4xNi0uNzgsMi4wNi0uNzguNDEsMCwuODEuMDgsMS4yMy4yNnY1LjM4Yy0uMzYuMjEtLjg0LjMxLTEuNDIuMzEtLjgsMC0xLjQyLS4yNi0xLjg5LS43Ni0uNDctLjUyLS42OS0xLjIzLS42OS0yLjE1LDAtLjk4LjIzLTEuNzMuNzEtMi4yNloiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTQzNi41Nyw0MDEuOTNjLS44NC40MS0xLjY3LjYyLTIuNDkuNjItMS4yMiwwLTIuMTEtLjM4LTIuNzEtMS4xNHMtLjg5LTEuODMtLjg5LTMuMjEuMjktMi40OS44Ny0zLjNjLjU4LS44MiwxLjQ3LTEuMjMsMi42OC0xLjIzLjYyLDAsMS40My4xOCwyLjM5LjUzbC4zOS0xLjQ5Yy0uOTQtLjM4LTEuODgtLjU3LTIuODEtLjU3LTEuNzIsMC0zLjA0LjU2LTMuOTUsMS42Ny0uOSwxLjEtMS4zNiwyLjU5LTEuMzYsNC40MnMuNDYsMy4yMywxLjM4LDQuMjhjLjkyLDEuMDUsMi4yMywxLjU3LDMuOTMsMS41NywxLjA5LDAsMi4wNi0uMjEsMi45MS0uNjVsLS4zNS0xLjVaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik00NDEuOSw0MDQuMDljMS4yMiwwLDIuMTgtLjM5LDIuODgtMS4xOS43LS44LDEuMDUtMS44NiwxLjA1LTMuMTlzLS4zNS0yLjM5LTEuMDUtMy4xOGMtLjctLjgxLTEuNjYtMS4yLTIuODgtMS4ycy0yLjE3LjM5LTIuODcsMS4yYy0uNjkuNzktMS4wNSwxLjg1LTEuMDUsMy4xOHMuMzUsMi4zOSwxLjA1LDMuMTljLjcuOCwxLjY1LDEuMTksMi44NywxLjE5Wk00NDAuMjUsMzk3LjUzYy4zOS0uNTQuOTMtLjgsMS42NS0uOHMxLjI3LjI2LDEuNjQuNzhjLjM4LjUzLjU2LDEuMjYuNTYsMi4xOHMtLjE5LDEuNjYtLjU2LDIuMTljLS4zNy41Mi0uOTIuOC0xLjY1LjhzLTEuMjctLjI3LTEuNjUtLjhjLS4zNy0uNTQtLjU2LTEuMjctLjU2LTIuMTlzLjE5LTEuNjQuNTYtMi4xN1oiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTQ1NS4wNCw0MDMuODl2LTUuMzhjMC0xLjAyLS4zMS0xLjgxLS45MS0yLjM1LS42LS41Ni0xLjQ4LS44NC0yLjYzLS44NC0xLjMsMC0yLjUuMjYtMy41OS43N3Y3Ljc5aDEuNjd2LTYuNzRjLjU3LS4yOCwxLjIxLS40MiwxLjkzLS40MiwxLjI1LDAsMS44Ny42MywxLjg3LDEuODl2NS4yNmgxLjY3WiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNDYwLjg5LDQwMi40MWMtLjI5LjE5LS42OS4yOC0xLjE4LjI4LS44NSwwLTEuNzEtLjE4LTIuNi0uNTJsLS4yNCwxLjRjLjgxLjM1LDEuNzcuNTEsMi44NS41MS45OCwwLDEuNzctLjIsMi4zNi0uNjMuNTktLjQzLjg5LTEuMDQuODktMS44NSwwLS42OS0uMjMtMS4yMy0uNjctMS42LS40NC0uMzgtMS4xNC0uNy0yLjEyLS45OC0uNTktLjE4LTEuMDEtLjM1LTEuMjUtLjUxLS4yNS0uMTctLjM3LS40My0uMzctLjc3LDAtLjY5LjQ5LTEuMDIsMS40OC0xLjAyLjU2LDAsMS4zLjEzLDIuMjIuNGwuMi0xLjM3Yy0uNzEtLjI5LTEuNTUtLjQ0LTIuNTMtLjQ0cy0xLjcuMjEtMi4yMi42NGMtLjUzLjQyLS44LDEuMDMtLjgsMS44MywwLC42OC4yMSwxLjIxLjYyLDEuNTguNDEuMzcsMS4wMS42OCwxLjc5LjkuNzcuMjMsMS4zLjQyLDEuNTguNTkuMjcuMTguNDIuNDMuNDIuNzdzLS4xNS41OC0uNDQuNzdaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik00NjQuOTIsMzkzLjYxdjEuOTFoLTEuMTl2MS4zNmgxLjE5djQuMjljMCwxLjk1Ljg5LDIuOTIsMi42OCwyLjkyLjQ1LDAsLjg5LS4wNSwxLjM0LS4xNmwtLjEtMS4zNWMtLjI5LjA3LS42LjExLS45Ni4xMS0uODUsMC0xLjI5LS41Mi0xLjI5LTEuNTR2LTQuMjdoMi4wNnYtMS4zNmgtMi4wNnYtMS45OWwtMS42Ny4wOFoiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTQ3NC4xOCwzOTYuNzRjLjMyLDAsLjYuMDMuODMuMTFsLjIzLTEuNDFjLS4zNS0uMDctLjc0LS4xMS0xLjE3LS4xMS0xLjM2LDAtMi41Mi4yNy0zLjQ3Ljh2Ny43N2gxLjY3di02Ljc0Yy41NC0uMjgsMS4xOC0uNDIsMS45Mi0uNDJaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik00NzYuNjgsMzk1LjUydjUuMzRjMCwyLjE2LDEuMTQsMy4yMywzLjM4LDMuMjMsMS4zNSwwLDIuNTctLjI2LDMuNjUtLjc4di03Ljc5aC0xLjY3djYuNzJjLS41Ny4zMS0xLjIzLjQ1LTEuOTUuNDUtMS4xNiwwLTEuNzUtLjYxLTEuNzUtMS44NHYtNS4zNGgtMS42N1oiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTQ4OS45OSwzOTYuNzRjLjY0LDAsMS4zLjE0LDEuOTguNDJsLjMzLTEuMzNjLS43Mi0uMzQtMS41Mi0uNS0yLjQzLS41LTEuMjgsMC0yLjI3LjQtMywxLjIxLS43My44MS0xLjA4LDEuODctMS4wOCwzLjIycy4zNywyLjQzLDEuMTIsMy4yYy43My43NiwxLjc4LDEuMTQsMy4xMywxLjE0Ljg3LDAsMS42NC0uMTYsMi4zLS41MWwtLjMtMS4zNWMtLjY0LjMxLTEuMjcuNDctMS44OS40Ny0uODgsMC0xLjUzLS4yNi0xLjk4LS43Ni0uNDUtLjUyLS42OC0xLjI1LS42OC0yLjIycy4yMi0xLjY1LjY1LTIuMThjLjQ0LS41NCwxLjA1LS44LDEuODQtLjhaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik00OTQuNDIsMzkzLjYxdjEuOTFoLTEuMTl2MS4zNmgxLjE5djQuMjljMCwxLjk1Ljg5LDIuOTIsMi42OCwyLjkyLjQ1LDAsLjg5LS4wNSwxLjMzLS4xNmwtLjA5LTEuMzVjLS4yOS4wNy0uNi4xMS0uOTcuMTEtLjg1LDAtMS4yOC0uNTItMS4yOC0xLjU0di00LjI3aDIuMDZ2LTEuMzZoLTIuMDZ2LTEuOTlsLTEuNjcuMDhaIi8+CiAgICAgIDxyZWN0IGNsYXNzPSJzdDAiIHg9IjUwMC4wOSIgeT0iMzk1LjUyIiB3aWR0aD0iMS42NyIgaGVpZ2h0PSI4LjM3Ii8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik01MDEuNjcsMzkyLjMzYy0uMTgtLjE5LS40NC0uMjctLjc1LS4yN3MtLjU3LjA4LS43Ni4yN2MtLjE5LjE5LS4yOC40My0uMjguNzIsMCwuMzEuMDkuNTYuMjcuNzUuMTguMTguNDQuMjcuNzcuMjdzLjU3LS4xLjc1LS4yN2MuMTktLjE5LjI3LS40NC4yNy0uNzUsMC0uMjktLjA5LS41My0uMjctLjcyWiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNTExLjcxLDM5OS43YzAtMS4zMi0uMzUtMi4zOS0xLjA1LTMuMTgtLjctLjgxLTEuNjUtMS4yLTIuODgtMS4ycy0yLjE3LjM5LTIuODcsMS4yYy0uNjkuNzktMS4wNSwxLjg1LTEuMDUsMy4xOHMuMzUsMi4zOSwxLjA1LDMuMTljLjcuOCwxLjY2LDEuMTksMi44NywxLjE5czIuMTgtLjM5LDIuODgtMS4xOWMuNy0uOCwxLjA1LTEuODYsMS4wNS0zLjE5Wk01MDkuNDUsNDAxLjg5Yy0uMzcuNTItLjkyLjgtMS42Ni44cy0xLjI3LS4yNy0xLjY0LS44Yy0uMzgtLjU0LS41Ny0xLjI3LS41Ny0yLjE5cy4xOS0xLjY0LjU3LTIuMTdjLjM4LS41NC45My0uOCwxLjY0LS44czEuMjcuMjYsMS42NC43OGMuMzguNTMuNTYsMS4yNi41NiwyLjE4cy0uMTksMS42Ni0uNTUsMi4xOVoiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTUxNy4zOCwzOTUuMzNjLTEuMywwLTIuNDkuMjYtMy41OS43N3Y3Ljc5aDEuNjd2LTYuNzRjLjU3LS4yOCwxLjIyLS40MiwxLjkzLS40MiwxLjI1LDAsMS44Ny42MywxLjg3LDEuODl2NS4yNmgxLjY3di01LjM4YzAtMS4wMi0uMy0xLjgxLS45LTIuMzUtLjYtLjU2LTEuNDgtLjg0LTIuNjQtLjg0WiIvPgogICAgPC9nPgogICAgPGc+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik02MCwzNzcuMzFjLS43OCwwLTEuNDMtLjI3LTEuOTMtLjgxLS41MS0uNTQtLjc3LTEuMTYtLjc3LTEuODlzLjI0LTEuMjYuNzMtMS42OWMuNS0uNDMsMS4xMi0uNjUsMS44OS0uNjUuNTgsMCwxLjM3LjE0LDIuMzguMzhsLjY0LTIuMDJjLTEuMi0uNDYtMi4zNy0uNjgtMy40OS0uNjgtMS4yNywwLTIuMzQuNDEtMy4yMSwxLjIyLS44NS44MS0xLjI4LDEuODktMS4yOCwzLjI2LDAsLjg1LjE5LDEuNjUuNTcsMi4zNy4zOC43My45NiwxLjI3LDEuNzQsMS42NS0uOC4zMS0xLjYyLjY0LTIuNDYuOTlsLjY4LDIuMTZjMi44LTEuMTUsNS44My0yLjEsOS4wNy0yLjg0bC0uNDctMi4yNmMtMi4xMi41NC0zLjQ5LjgxLTQuMDguODFaIi8+CiAgICAgIDxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iODYuMzEgMzY4LjE4IDg0LjM2IDM2Ni40OCA4Mi43NyAzNjguMzcgODQuNjcgMzY5Ljk5IDg2LjMxIDM2OC4xOCIvPgogICAgICA8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjkyLjY1IDM4NS4zNCA5NC41NyAzODYuOTcgOTYuMiAzODUuMTUgOTQuMjUgMzgzLjQ1IDkyLjY1IDM4NS4zNCIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMTA3LjAzLDM2Mi4yOWMuMDcsNC43Ny4xMSw4LjMyLjExLDEwLjYyLDAsMS44OS0uMDcsMy41Ni0uMTksNC45OS0xLC4yNi0yLjExLjM5LTMuMzMuMzloLS4zOWMtMS42OCwwLTIuOTgtLjIyLTMuOTQtLjY5LjE5LS42NC4yOC0xLjQ3LjI4LTIuNDl2LTMuNDNsLTIuMzcuMTl2My40OGMwLC45OS0uMjYsMS43Mi0uNzgsMi4yMi0uNTQuNDktMS42Ni43My0zLjM1LjczaC0uNmMtMS42OCwwLTIuOTktLjIyLTMuOTUtLjY5LjItLjY0LjMtMS40Ny4zLTIuNDl2LTMuNDNsLTIuMzcuMTl2My40OGMwLC45OS0uMjYsMS43Mi0uOCwyLjIyLS41NC40OS0xLjY0LjczLTMuMzQuNzNoLTguOTJjLTEuMTksMC0yLjA2LS4zLTIuNi0uOTEtLjU0LS42MS0uODEtMS42NC0uODEtMy4xMXYtMTIuMmwtMi41LjIydjEyLjQ0YzAsMi4wOC40MSwzLjY4LDEuMTksNC43My43OCwxLjA3LDIuMTYsMS42LDQuMTQsMS42aDkuNjhjMi4xOSwwLDMuNzctLjQzLDQuNzctMS4zNCwxLjE4LjkxLDIuOCwxLjM0LDQuODcsMS4zNGgxLjExYzIuMTksMCwzLjc5LS40Myw0Ljc3LTEuMzQsMS4xOC45MSwyLjgsMS4zNCw0Ljg2LDEuMzRoLjcyYy45NywwLDEuOTctLjExLDIuOTktLjMyLDEuMDMtLjIyLDEuODQtLjQ5LDIuNDEtLjguMjYtLjg5LjQzLTEuODUuNS0yLjg5LjA3LTEuMDMuMDktMi42MS4wOS00Ljc3cy0uMDEtNS41NC0uMDctMTAuMmwtMi40OS4yMloiLz4KICAgICAgPHBvbHlnb24gY2xhc3M9InN0MCIgcG9pbnRzPSIxMTMuNCAzODEuMDYgMTE1Ljg2IDM4MS4wNiAxMTUuODYgMzYyLjA3IDExMy40IDM2Mi4yOSAxMTMuNCAzODEuMDYiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTEyNC4yOSwzNjkuOTljLTEuNDYsMC0yLjY0LjU4LTMuNTgsMS43Ni0uOTMsMS4xOC0xLjM5LDIuNjItMS4zOSw0LjM4LDAsMS40OS4zNywyLjY0LDEuMDgsMy40Ni43Mi44MiwxLjk1LDEuMjMsMy42NSwxLjIzLDEuMiwwLDIuMzMtLjE5LDMuNDEtLjU4LS4xMiwxLjA4LS42NSwyLjAzLTEuNTgsMi44Ny0uOTUuODQtMi4zNywxLjI2LTQuMjMsMS4yNi0uODQsMC0xLjYxLS4wNy0yLjMtLjIybC0uMjcsMi4zMWMuOTEuMjYsMS44NS4zNywyLjg0LjM3LDIuNTYsMCw0LjUyLS43Myw1Ljg3LTIuMjMsMS4zNS0xLjQ5LDIuMDItMy42LDIuMDItNi4zMiwwLTIuNTItLjUtNC41My0xLjUzLTYuMDMtMS0xLjUtMi4zMy0yLjI2LTMuOTgtMi4yNlpNMTI0LjkzLDM3OC4zMWMtMS4yOCwwLTIuMTktLjIyLTIuNzMtLjY2LS41MS0uNDMtLjc3LTEuMDctLjc3LTEuOTFzLjIzLTEuNTcuNy0yLjI0Yy40Ny0uNjgsMS4xNS0xLjAxLDIuMDQtMS4wMSwxLjAxLDAsMS44My41NSwyLjQzLDEuNjUuNTksMS4xMS45MiwyLjM5Ljk3LDMuODctLjg5LjItMS43Ny4zMS0yLjY1LjMxWiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMTUxLjYzLDM3MS4zNmMwLS44LS42Mi0xLjM5LTEuODQtMS43Ni0xLjA1LS4zMi0xLjU4LS42LTEuNTgtLjg0LDAtLjI2LjIzLS41LjY2LS43LjQzLS4xOS45Mi0uMjgsMS40My0uMjguMzgsMCwuNzIuMDMsMSwuMDlsLjM3LTEuNjhjLS4zMi0uMDctLjctLjExLTEuMS0uMTEtMS4wOCwwLTEuOTcuMjgtMi42Ni44Ny0uNy41OC0xLjA0LDEuMjgtMS4wNCwyLjEsMCwuNS4xNi44OC40NywxLjE4LjMyLjI3LjgyLjUxLDEuNS42OC45MS4yOCwxLjM3LjU0LDEuMzcuOCwwLC4yNC0uNDIuNDUtMS4yNC42Mi0uODQuMTYtMS43NC4yNC0yLjcyLjI0djEuNTdjMS43MiwwLDMuMDMtLjI0LDMuOTYtLjc3Ljk1LS41MSwxLjQyLTEuMTgsMS40Mi0yWiIvPgogICAgICA8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjE2OS4wNSAzODUuMzIgMTcwLjgzIDM4Ni44MyAxNzIuMzYgMzg1LjE1IDE3MC41NSAzODMuNTYgMTY5LjA1IDM4NS4zMiIvPgogICAgICA8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjE2NS40NCAzODUuNCAxNjcuMjIgMzg2LjkxIDE2OC43NCAzODUuMjQgMTY2Ljk0IDM4My42NCAxNjUuNDQgMzg1LjQiLz4KICAgICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTE4MC42NSwzNzEuMzljLjQ5LDEuODUuNzQsMy43My43NCw1LjY0LDAsLjI2LS4wMS40Ni0uMDQuNjEtMS4wNS40My0yLjQzLjY1LTQuMTIuNjVoLS4zYy0xLjY4LDAtMi45OC0uMjItMy45NC0uNjkuMTktLjY0LjI4LTEuNDcuMjgtMi40OXYtMy40M2wtMi4zNy4xOXYzLjQ4YzAsLjk5LS4yNiwxLjcyLS44LDIuMjItLjUzLjQ5LTEuNjUuNzMtMy4zNC43M2gtNS41M2MtMS4zOCwwLTIuMzctLjI4LTIuOTUtLjg3LS42LS41OC0uODgtMS41Ny0uODgtMi45OXYtMTIuMzZsLTIuNDYuMjJ2MTIuOTZjMCwuNTctLjA4LDEuMDUtLjIzLDEuMzktLjE1LjM3LS40My43LS44NywxLjAxLS40My4zMi0xLjA3LjU1LTEuOTUuNjktLjg1LjE0LTEuOTcuMi0zLjM0LjJzLTIuNTQtLjA4LTMuNDUtLjI2Yy0uODktLjE4LTEuNTgtLjQ1LTIuMDQtLjg0LS40Ni0uMzctLjc4LS43Ny0uOTUtMS4yMi0uMTYtLjQyLS4yNC0uOTctLjI0LTEuNjQsMC0uOC4xOS0xLjkyLjU3LTMuMzdsLTIuMTQtLjQ2Yy0uNjQsMS44OC0uOTUsMy41Mi0uOTUsNC45LDAsLjg1LjEyLDEuNi4zNSwyLjI0LjIzLjY0LjY2LDEuMjMsMS4yNiwxLjc5LjYxLjU1LDEuNS45NiwyLjY4LDEuMjMsMS4xOC4yOCwyLjY1LjQzLDQuMzguNDMsNC4zMSwwLDcuMDYtLjc3LDguMjQtMi4zNC44OSwxLjM3LDIuNDIsMi4wNCw0LjU3LDIuMDRoNi4xYzIuMTksMCwzLjc5LS40Myw0Ljc3LTEuMzQsMS4xOC45MSwyLjc5LDEuMzQsNC44NSwxLjM0aC42NGMyLjM1LDAsNC4zMy0uNDcsNS45Mi0xLjQxLjMtMSwuNDUtMi4yMi40NS0zLjY4LDAtMS43Mi0uMjItMy40My0uNjItNS4xNGwtMi4zMS41NVoiLz4KICAgICAgPHBvbHlnb24gY2xhc3M9InN0MCIgcG9pbnRzPSIxODEuMTggMzY3LjgyIDE3OS4yMyAzNjYuMTEgMTc3LjYzIDM2Ny45OSAxNzkuNTUgMzY5LjYzIDE4MS4xOCAzNjcuODIiLz4KICAgICAgPHBvbHlnb24gY2xhc3M9InN0MCIgcG9pbnRzPSIyMDUuOTMgMzg1LjQgMjA3LjcxIDM4Ni45MSAyMDkuMjQgMzg1LjI0IDIwNy40MyAzODMuNjQgMjA1LjkzIDM4NS40Ii8+CiAgICAgIDxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iMjA5LjU1IDM4NS4zMiAyMTEuMzMgMzg2LjgzIDIxMi44NiAzODUuMTUgMjExLjA0IDM4My41NiAyMDkuNTUgMzg1LjMyIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yNDkuMTksMzYyLjI5Yy4wNyw0Ljc3LjA5LDguMzIuMDksMTAuNjIsMCwxLjg5LS4wNSwzLjU2LS4xOCw0Ljk5LS45OS4yNi0yLjExLjM5LTMuMzMuMzloLS40NmMtMS4zNSwwLTIuMzMtLjMtMi45MS0uODktLjU3LS41OS0uODUtMS41OC0uODUtMi45NnYtMTIuMzZsLTIuNDcuMjJ2MTIuNDRjMCwuNjQtLjAzLDEuMTQtLjA4LDEuNDktLjA0LjM1LS4xOC43LS4zOSwxLjA3LS4yLjM3LS41NC42NC0xLC43OC0uNDYuMTQtMS4wOC4yMi0xLjg1LjIyaC0xLjE0Yy0uODcsMC0xLjQ5LS4xNi0xLjg1LS40OS0uMzgtLjMyLS42Ni0uOTktLjg5LTEuOTktLjQ1LTEuNzktMS4wMy0zLjE0LTEuNzYtNC4wNC0uNzQtLjkxLTEuNzQtMS4zNS0zLjAyLTEuMzVzLTIuMjYuMzItMywuOTljLS43NC42Ni0xLjQ3LDEuNjUtMi4xNiwzLS43NCwxLjQ3LTEuMzUsMi40OS0xLjg3LDMuMDRzLTEuMi44NC0yLjEuODRoLS41NWMtMS42NiwwLTIuOTgtLjIyLTMuOTItLjY5LjE5LS42NC4yNy0xLjQ3LjI3LTIuNDl2LTMuNDNsLTIuMzUuMTl2My40OGMwLC45OS0uMjcsMS43Mi0uOCwyLjIyLS41My40OS0xLjY1LjczLTMuMzQuNzNoLS40MnMtLjA0LDAtLjA1LjAxaDBzLS4zNC0uMDEtLjM0LS4wMWMtLjI0LDAtLjQ3LS4wMS0uNjYtLjA1LS4xOS0uMDMtLjM3LS4wOS0uNTUtLjE5LS4xNi0uMDktLjMxLS4xOC0uNDItLjI2LS4xMi0uMDctLjI2LS4yLS40MS0uMzgtLjE0LS4xOC0uMjYtLjMyLS4zMi0uNDMtLjA4LS4xMi0uMTktLjMtLjM3LS41NS0uMTgtLjI3LS4zLS40Ny0uMzktLjYxLS40OS0uNzQtLjg0LTEuMjgtMS4wNy0xLjY0LS4yMy0uMzUtLjY0LS44OS0xLjIzLTEuNjItLjYtLjcyLTEuMjYtMS4zOS0yLjAyLTItLjc2LS42MS0xLjYyLTEuMi0yLjYxLTEuNzksMi43Ni0xLjk1LDUuNzctMy4zOCw5LjAzLTQuMjZ2LTIuNjFjLTQuMjEsMS4xNC03LjkxLDIuOTMtMTEuMTMsNS40djMuMTJjLjkyLjYyLDEuNzksMS4yLDIuNiwxLjczLjguNTQsMS40NywxLjE0LDIuMDMsMS43Ni41NS42Mi45OSwxLjE4LDEuMywxLjY1LjMyLjQ3LjY5LDEuMDEsMS4wOCwxLjYyLTEuNzYuNzQtNC4yMywxLjExLTcuNDEsMS4xMWgtLjg0Yy0xLjE5LDAtMi4wNi0uMy0yLjYtLjkxLS41NC0uNjEtLjgxLTEuNjQtLjgxLTMuMTF2LTEyLjJsLTIuNDkuMjJ2MTIuNDRjMCwyLjA4LjM5LDMuNjgsMS4xOCw0LjczLjgsMS4wNywyLjE2LDEuNiw0LjE0LDEuNmgxLjUxYzMuNjYsMCw2LjU1LS41NCw4LjY4LTEuNjQuODIsMS4xLDIuMDYsMS42NCwzLjY5LDEuNjRoMS4wN2MyLjE5LDAsMy43OS0uNDMsNC43Ny0xLjM0LDEuMTguOTEsMi43OSwxLjM0LDQuODUsMS4zNGguNzZjMS40MywwLDIuNjEtLjQ3LDMuNDktMS40MSwxLjUuOTYsMy4zMSwxLjQzLDUuNDQsMS40MywxLjcyLDAsMy4xOC0uMzcsNC40LTEuMTIuNzQuNzQsMS44NSwxLjEsMy4zNywxLjFoMS4wMWMyLjQ5LDAsNC4xMi0uNjQsNC45NC0xLjkzLjkxLDEuMywyLjM5LDEuOTMsNC40NCwxLjkzaC44NGMuOTcsMCwxLjk3LS4xMSwzLS4zMiwxLjAxLS4yMiwxLjgxLS40OSwyLjM5LS44LjI3LS44OS40My0xLjg1LjUtMi44OS4wOC0xLjAzLjExLTIuNjEuMTEtNC43N3MtLjAzLTUuNTQtLjA4LTEwLjJsLTIuNDkuMjJaTTIyNy4wMiwzNzguNTNjLTEuNSwwLTIuOTItLjMyLTQuMjYtLjkzbC42OC0xLjIzYy42OC0xLjM0LDEuMjYtMi4yNiwxLjc2LTIuNzMuNS0uNDcsMS4xLS42OSwxLjc3LS42OS44MiwwLDEuNDUuMzUsMS44NywxLjA3LjQyLjcyLjg0LDEuOTcsMS4yNiwzLjc3bC4wMy4wOGMtLjgyLjQzLTEuODUuNjYtMy4xLjY2WiIvPgogICAgICA8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjI3Mi41MSAzNjQuNjcgMjcwLjcgMzYzLjA3IDI2OS4yMSAzNjQuODMgMjcwLjk4IDM2Ni4zNCAyNzIuNTEgMzY0LjY3Ii8+CiAgICAgIDxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iMjY4Ljg5IDM2NC43NSAyNjcuMDcgMzYzLjE0IDI2NS41OSAzNjQuOTEgMjY3LjM3IDM2Ni40MiAyNjguODkgMzY0Ljc1Ii8+CiAgICAgIDxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iMjgyLjMzIDM4NS4zMiAyODQuMTIgMzg2LjgzIDI4NS42MyAzODUuMTUgMjgzLjgyIDM4My41NiAyODIuMzMgMzg1LjMyIi8+CiAgICAgIDxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iMjc4LjcxIDM4NS40IDI4MC40OSAzODYuOTEgMjgyLjAxIDM4NS4yNCAyODAuMjEgMzgzLjY0IDI3OC43MSAzODUuNCIvPgogICAgICA8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjI5NC43OSAzNjguMTggMjkyLjg0IDM2Ni40OCAyOTEuMjQgMzY4LjM3IDI5My4xNiAzNjkuOTkgMjk0Ljc5IDM2OC4xOCIvPgogICAgICA8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjMwMC4yMSAzODUuNCAzMDEuOTkgMzg2LjkxIDMwMy41MiAzODUuMjQgMzAxLjcgMzgzLjY0IDMwMC4yMSAzODUuNCIvPgogICAgICA8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjMwMy44MyAzODUuMzIgMzA1LjYyIDM4Ni44MyAzMDcuMTUgMzg1LjE1IDMwNS4zMiAzODMuNTYgMzAzLjgzIDM4NS4zMiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzQyLjI0LDM2Mi4yOWMuMDcsNC43Ny4wOSw4LjMyLjA5LDEwLjYyLDAsMS44OS0uMDcsMy41Ni0uMTgsNC45OS0xLC4yNi0yLjExLjM5LTMuMzQuMzloLS43NmMtLjk5LDAtMS45NS0uMTQtMi44My0uMzkuMTItLjYxLjE4LTEuMy4xOC0yLjA0LDAtMS44NC0uNTEtMy4zMS0xLjUzLTQuNDUtMS0xLjEyLTIuNDEtMS42OS00LjE3LTEuNjktMS45MywwLTMuNzYuNi01LjQ2LDEuODEtMS42OSwxLjItMy4zNSwzLjE1LTUsNS44NC0uNDItLjE0LS43Mi0uMjYtLjkyLS4zNC4xMS0uNjQuMTYtMS4zNS4xNi0yLjE2di0zLjE5bC0yLjM1LjE5djMuNDhjMCwuOTktLjI0LDEuNzItLjcsMi4yMi0uNDYuNDktMS40Ny43My0zLC43M2gtLjczYy0xLjY2LDAtMi45OC0uMjItMy45NS0uNjkuMi0uNjQuMy0xLjQ3LjMtMi40OXYtMy40M2wtMi4zNS4xOXYzLjQ4YzAsLjk5LS4yNywxLjcyLS44LDIuMjItLjU0LjQ5LTEuNjUuNzMtMy4zNC43M2gtLjYyYy0xLjY1LDAtMi45Ni0uMjItMy45NC0uNjkuMTktLjY0LjMtMS40Ny4zLTIuNDl2LTMuNDNsLTIuMzUuMTl2My40OGMwLC45OS0uMjcsMS43Mi0uODEsMi4yMi0uNTMuNDktMS42NS43My0zLjM0LjczaC0uNjFjLTEuNjUsMC0yLjk2LS4yMi0zLjk0LS42OS4xOS0uNjQuMy0xLjQ3LjMtMi40OXYtMy40M2wtMi4zNy4xOXYzLjQ4YzAsLjk5LS4yNywxLjcyLS44LDIuMjItLjUzLjQ5LTEuNjUuNzMtMy4zNC43M2gtNC43NmMtMS4wOCwwLTEuODQtLjE4LTIuMjYtLjU0LS40MS0uMzctLjYyLS45Ny0uNjItMS44N3YtNy42MWMtMi43NywwLTUuMTQuNjgtNy4xMywyLjAzLTEuOTksMS4zNy0yLjk4LDMuMTItMi45OCw1LjI5LDAsMS4xOS41LDIuMDcsMS41LDIuNjYuOTkuNTgsMi4zNy44OCw0LjExLjg4Ljg0LDAsMS43NC0uMDUsMi43LS4xNi42MSwxLjQxLDEuOTMsMi4xLDMuOTYsMi4xaDUuNjRjMi4xOSwwLDMuNzktLjQzLDQuNzctMS4zNCwxLjE4LjkxLDIuOCwxLjM0LDQuODUsMS4zNGgxLjE0YzIuMTksMCwzLjc3LS40Myw0Ljc3LTEuMzQsMS4xNi45MSwyLjc5LDEuMzQsNC44NCwxLjM0aDEuMTRjMi4xOCwwLDMuNzctLjQzLDQuNzctMS4zNCwxLjE4LjkxLDIuNzksMS4zNCw0Ljg2LDEuMzRoMS4wNGMyLjMzLDAsMy45NS0uNTEsNC44OC0xLjU2LDEuMTEuNTQsMi4zMS45NSwzLjYsMS4yMiwxLjI3LjI4LDIuOTUuNDIsNSwuNDIsMy4zOSwwLDYuMDctLjM5LDguMDMtMS4xOCwxLjEuNzQsMi40NywxLjEsNC4xNCwxLjFoLjczYy45OSwwLDEuOTktLjExLDMtLjMyLDEuMDMtLjIyLDEuODMtLjQ5LDIuNDEtLjguMjYtLjg5LjQzLTEuODUuNS0yLjg5LjA3LTEuMDMuMDktMi42MS4wOS00Ljc3cy0uMDMtNS41NC0uMDgtMTAuMmwtMi40Ny4yMlpNMjcwLjE3LDM3Ni42MWMtLjYyLjA1LTEuMjMuMDgtMS43OS4wOC0xLjMxLDAtMi4zMS0uMTYtMi45OC0uNDctLjY4LS4zMi0xLjAxLS43NC0xLjAxLTEuMjcsMC0uODQuNTQtMS43LDEuNjEtMi41NCwxLjA3LS44MiwyLjQ1LTEuMzQsNC4xNy0xLjV2NS43MVpNMzMzLjE1LDM3Ny41Yy0xLjguNTctNC4wNC44NC02LjcyLjg0LTEuOTcsMC0zLjYxLS4xNC00LjkyLS40MSwxLjQ5LTIuMDYsMi44MS0zLjUsMy45OS00LjM0LDEuMTYtLjg0LDIuNDUtMS4yNiwzLjgzLTEuMjYsMS4xOSwwLDIuMTIuMzksMi44MSwxLjE2LjY4Ljc3LDEuMDEsMS45MywxLjAxLDMuNDh2LjUzWiIvPgogICAgICA8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjM0OC42IDM4MS4wNiAzNTEuMDcgMzgxLjA2IDM1MS4wNyAzNjIuMDcgMzQ4LjYgMzYyLjI5IDM0OC42IDM4MS4wNiIvPgogICAgICA8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjM2Ny44NyAzNjQuNzUgMzY2LjA2IDM2My4xNCAzNjQuNTYgMzY0LjkxIDM2Ni4zNCAzNjYuNDIgMzY3Ljg3IDM2NC43NSIvPgogICAgICA8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjM3MS41IDM2NC42NyAzNjkuNjggMzYzLjA3IDM2OC4xOCAzNjQuODMgMzY5Ljk3IDM2Ni4zNCAzNzEuNSAzNjQuNjciLz4KICAgICAgPHBvbHlnb24gY2xhc3M9InN0MCIgcG9pbnRzPSIzNzguMTkgMzg1LjMyIDM3OS45NyAzODYuODMgMzgxLjQ5IDM4NS4xNSAzNzkuNjcgMzgzLjU2IDM3OC4xOSAzODUuMzIiLz4KICAgICAgPHBvbHlnb24gY2xhc3M9InN0MCIgcG9pbnRzPSIzNzQuNTYgMzg1LjQgMzc2LjM1IDM4Ni45MSAzNzcuODYgMzg1LjI0IDM3Ni4wNiAzODMuNjQgMzc0LjU2IDM4NS40Ii8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0zODkuODYsMzYyLjI5Yy4wNyw0Ljc3LjExLDguMzIuMTEsMTAuNjIsMCwxLjg5LS4wNywzLjU2LS4xOSw0Ljk5LTEsLjI2LTIuMTEuMzktMy4zMy4zOWgtLjQxYy0xLjY1LDAtMi45Ni0uMjItMy45Mi0uNjkuMTktLjY0LjI4LTEuNDcuMjgtMi40OXYtMy40M2wtMi4zNy4xOXYzLjQ4YzAsLjk5LS4yNywxLjcyLS44LDIuMjItLjUzLjQ5LTEuNjUuNzMtMy4zNC43M2gtMS42M2MtMS4wOCwwLTEuODMtLjE4LTIuMjYtLjU0LS40Mi0uMzctLjYyLS45Ny0uNjItMS44N3YtNy42MWMtMi43NiwwLTUuMTQuNjgtNy4xMSwyLjAzLTEuOTksMS4zNy0yLjk5LDMuMTItMi45OSw1LjI5LDAsMS4xOS41LDIuMDcsMS40OSwyLjY2LDEuMDEuNTgsMi4zOC44OCw0LjEyLjg4Ljg1LDAsMS43NC0uMDUsMi43LS4xNi41NiwxLjMsMS43NywxLjk2LDMuNTUsMi4wNnYuMDRoMi45MmMyLjE5LDAsMy43OS0uNDMsNC43Ny0xLjM0LDEuMTguOTEsMi44LDEuMzQsNC44NiwxLjM0aC43MmMuOTcsMCwxLjk3LS4xMSwzLS4zMiwxLjAzLS4yMiwxLjgzLS40OSwyLjQxLS44LjI2LS44OS40Mi0xLjg1LjQ5LTIuODkuMDctMS4wMy4xMS0yLjYxLjExLTQuNzdzLS4wMy01LjU0LS4wOC0xMC4ybC0yLjQ5LjIyWk0zNjkuMTYsMzc2LjYxYy0uNjQuMDUtMS4yMi4wOC0xLjc5LjA4LTEuMzEsMC0yLjMtLjE2LTIuOTgtLjQ3LS42Ni0uMzItMS0uNzQtMS0xLjI3LDAtLjg0LjUzLTEuNywxLjU4LTIuNTQsMS4wNy0uODIsMi40Ni0xLjM0LDQuMTgtMS41djUuNzFaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik00MDAuODIsMzY5Ljk5Yy0xLjQ2LDAtMi42Ni41OC0zLjU4LDEuNzYtLjkzLDEuMTgtMS40MSwyLjYyLTEuNDEsNC4zOCwwLDEuNDkuMzUsMi42NCwxLjEsMy40Ni43Mi44MiwxLjkzLDEuMjMsMy42NSwxLjIzLDEuMTksMCwyLjMzLS4xOSwzLjQxLS41OC0uMTIsMS4wOC0uNjUsMi4wMy0xLjYsMi44Ny0uOTUuODQtMi4zNSwxLjI2LTQuMjMsMS4yNi0uODIsMC0xLjYxLS4wNy0yLjMxLS4yMmwtLjI2LDIuMzFjLjkyLjI2LDEuODcuMzcsMi44NC4zNywyLjU3LDAsNC41My0uNzMsNS44Ny0yLjIzLDEuMzUtMS40OSwyLjAzLTMuNiwyLjAzLTYuMzIsMC0yLjUyLS41MS00LjUzLTEuNTMtNi4wMy0xLjAxLTEuNS0yLjM0LTIuMjYtMy45OC0yLjI2Wk00MDEuNDcsMzc4LjMxYy0xLjMsMC0yLjItLjIyLTIuNzMtLjY2LS41MS0uNDMtLjc4LTEuMDctLjc4LTEuOTFzLjIzLTEuNTcuNy0yLjI0Yy40Ny0uNjgsMS4xNS0xLjAxLDIuMDYtMS4wMSwxLDAsMS44MS41NSwyLjQyLDEuNjUuNjEsMS4xMS45MywyLjM5Ljk5LDMuODctLjg5LjItMS43OC4zMS0yLjY1LjMxWiIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNDI1LjU2LDM2Mi4yOWMuMDcsNC43Ny4wOSw4LjMyLjA5LDEwLjYyLDAsMS44OS0uMDUsMy41Ni0uMTgsNC45OS0xLC4yNi0yLjExLjM5LTMuMzMuMzloLS40NmMtLjgsMC0xLjM3LS4xNi0xLjcyLS41MS0uMzQtLjM0LS43NC0xLjExLTEuMjItMi4zMS0xLjItMi45Ni0yLjYtNS4yOS00LjE1LTYuOTlsLTEuNzksMS43NmMxLjcsMiwyLjk5LDQuMSwzLjg0LDYuM2wuNDcsMS4yYy0xLjMxLjUxLTIuOTkuNzYtNS4wNC43Ni0uOTEsMC0xLjk3LS4wNC0zLjE5LS4xMnYyLjc2Yy45Mi4xNCwxLjk5LjIsMy4xOS4yLDIuMzgsMCw0LjQ1LS40OSw2LjE5LTEuNDcuNjguOCwxLjY5LDEuMiwzLjEsMS4yaC43M2MuOTksMCwxLjk5LS4xMSwzLS4zMiwxLjAzLS4yMiwxLjgzLS40OSwyLjQxLS44LjI2LS44OS40My0xLjg1LjUtMi44OS4wNy0xLjAzLjA5LTIuNjEuMDktNC43N3MtLjAzLTUuNTQtLjA3LTEwLjJsLTIuNDkuMjJaIi8+CiAgICAgIDxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iNDMxLjkzIDM4MS4wNiA0MzQuMzkgMzgxLjA2IDQzNC4zOSAzNjIuMDcgNDMxLjkzIDM2Mi4yOSA0MzEuOTMgMzgxLjA2Ii8+CiAgICAgIDxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iNDUxLjc1IDM2NC43NSA0NDkuOTQgMzYzLjE0IDQ0OC40NCAzNjQuOTEgNDUwLjIzIDM2Ni40MiA0NTEuNzUgMzY0Ljc1Ii8+CiAgICAgIDxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iNDU1LjM3IDM2NC42NyA0NTMuNTYgMzYzLjA3IDQ1Mi4wNiAzNjQuODMgNDUzLjg0IDM2Ni4zNCA0NTUuMzcgMzY0LjY3Ii8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik00NzEuMzIsMzc3LjY4YzAtMS45Ny0uNjEtMy43My0xLjg1LTUuMjktMS4yMy0xLjU2LTMuMDMtMi44My01LjQxLTMuNzksMi42NC0xLjg1LDUuNi0zLjIyLDguODQtNC4xdi0yLjYxYy00LjE5LDEuMTQtNy45LDIuOTItMTEuMDksNS4zNHYzLjE4YzIuMDIuNjksMy42NiwxLjY1LDQuOTQsMi44OCwxLjI3LDEuMjMsMi4wMywyLjU4LDIuMjcsNC4wNC0yLjA3LjY0LTQuNjMuOTUtNy42OC45NWgtMy4xOGMtMS4xLDAtMS44NC0uMTgtMi4yNi0uNTQtLjQzLS4zNy0uNjQtLjk3LS42NC0xLjg3di03LjYxYy0yLjc2LDAtNS4xNC42OC03LjExLDIuMDMtMS45OSwxLjM3LTIuOTksMy4xMi0yLjk5LDUuMjksMCwxLjE5LjUsMi4wNywxLjQ5LDIuNjYsMS4wMS41OCwyLjM4Ljg4LDQuMTIuODguODUsMCwxLjc0LS4wNSwyLjctLjE2LjYxLDEuNDEsMS45MywyLjEsMy45NiwyLjFoMy45OWM0LjM1LDAsNy42MS0uNTcsOS43Ni0xLjcyLjA4LS41LjEyLTEuMDUuMTItMS42NlpNNDUzLjAzLDM3Ni42MWMtLjY0LjA1LTEuMjIuMDgtMS43OS4wOC0xLjMxLDAtMi4zLS4xNi0yLjk4LS40Ny0uNjYtLjMyLTEtLjc0LTEtMS4yNywwLS44NC41My0xLjcsMS42LTIuNTQsMS4wNS0uODIsMi40NS0xLjM0LDQuMTctMS41djUuNzFaIi8+CiAgICAgIDxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iNDk1LjkzIDM2OC43OSA0OTQuMTUgMzY3LjI0IDQ5Mi42NyAzNjguOTggNDk0LjQzIDM3MC40NyA0OTUuOTMgMzY4Ljc5Ii8+CiAgICAgIDxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iNDk3LjQ1IDM2NS43NSA0OTUuNzQgMzY0LjI1IDQ5NC4zNSAzNjUuOTEgNDk2LjA0IDM2Ny4zNCA0OTcuNDUgMzY1Ljc1Ii8+CiAgICAgIDxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iNDk4LjA1IDM3MC4zMyA0OTkuNTQgMzY4LjY2IDQ5Ny43NiAzNjcuMSA0OTYuMyAzNjguODQgNDk4LjA1IDM3MC4zMyIvPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNTEyLjA4LDM2Mi4yOWMuMDgsNC43Ny4xMiw4LjMyLjEyLDEwLjYyLDAsMS44OS0uMDcsMy41Ni0uMiw0Ljk5LS45OS4yNi0yLjEuMzktMy4zMy4zOWgtLjVjLTEuNzIsMC0yLjk1LS4yOC0zLjY2LS44NC4wOC0uNTMuMTItMS4wNS4xMi0xLjZ2LTMuNDJsLTIuMjIuMjJ2My4zM2MwLDEuNTQtLjg1LDIuMzEtMi41NCwyLjMxcy0yLjQ1LS43OC0yLjQ1LTIuMzd2LTMuMDNsLTIuMjMuMTV2Mi43NmMwLC44NC0uMzEsMS40Ni0uOTUsMS44OC0uNjUuNDItMS40MS42NC0yLjMzLjY0LTEuMDUsMC0xLjkzLS4yMy0yLjY4LS42OC4xOC0uNTQuMjgtMS4yLjM0LTJsLjE0LTIuMzUtMi4yMy4xOC0uMTYsMi4wMmMtLjA3LDEuMS0uMzEsMS44NC0uNzQsMi4yMi0uNDUuMzktMS4xLjYtMS45OS42aC0xLjQxYy0xLjg1LDAtMy4wMy0uNzQtMy41NC0yLjIzLS4yMy0uNTQtLjY2LTEuOTktMS4yNC00LjMzbC0yLjMuNjhjLjczLDIuNzksMS4wOCw0Ljc2LDEuMDgsNS45MSwwLDEuMDQtLjE2LDItLjQ5LDIuODgtLjMyLjg4LS44OSwxLjYyLTEuNjksMi4yMi0uODEuNjEtMS44LjkxLTIuOTkuOTEtLjUzLDAtMS0uMDUtMS40Mi0uMTJsLS4yNiwyLjMzYy43Ny4xNSwxLjUuMjMsMi4xOC4yMywxLjk1LDAsMy41Mi0uNjIsNC42OS0xLjg4LDEuMTgtMS4yNiwxLjg3LTIuOTksMi4wNy01LjE3LjgyLjkxLDIuMDQsMS4zNSwzLjY1LDEuMzVoMS4yNmMxLjQ1LDAsMi42MS0uMzQsMy40OC0xLjA0LDEuMDUuOCwyLjQ1LDEuMiw0LjE2LDEuMi44NywwLDEuNy0uMTQsMi41Mi0uNDIuODItLjI4LDEuNDMtLjcyLDEuODUtMS4zLjcsMS4wOCwxLjg4LDEuNjQsMy41NCwxLjY0czIuOTItLjQ3LDMuNzUtMS40MmMxLjI4LjkxLDIuNzksMS4zNCw0LjQ5LDEuMzRoLjY5Yy45NywwLDEuOTctLjExLDIuOTktLjMyLDEuMDMtLjIyLDEuODQtLjQ5LDIuNDEtLjguMjYtLjg5LjQzLTEuODUuNS0yLjg5LjA3LTEuMDMuMDktMi42MS4wOS00Ljc3cy0uMDEtNS41NC0uMDctMTAuMmwtMi41LjIyWiIvPgogICAgICA8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjUxOC40NiAzNjIuMjkgNTE4LjQ2IDM4MS4wNiA1MjAuOTIgMzgxLjA2IDUyMC45MiAzNjIuMDcgNTE4LjQ2IDM2Mi4yOSIvPgogICAgPC9nPgogICAgPHBhdGggY2xhc3M9InN0MCIgZD0iTTIyOS4yOSwzNDguMzZjMy42OSwxLjAxLDcuNzgsMS42LDEyLjMsMS43Nyw2LjM4LjI1LDEyLjA4LS4zNSwxNy4wOC0xLjc3LDE0Ljk1LTQuMjUsMjMuNjctMTUuODksMjUuNTItMzQuMzguOTktOS44Mi42OS0zMC44NS0uNDUtMzEuNDYtMS40OS0uOC0yNC4xOS0uNjktMjQuODYuMTItLjM0LjQxLS41OCw2LjQtLjY5LDE2LjgyLS4xNSwxNS42OC0uMTksMTYuMjctMS4zLDE4LjY4LTQuNzcsMTAuMzctMjEuNjcsOS4yNi0yNS4wNC0xLjY0LTEuMTktMy44NS0xLjYxLTEwOC4wNy0uNDYtMTEyLjM2LDMuMTgtMTEuODUsMTkuNjQtMTMuOTMsMjUuMy0zLjIxbDEuMzQsMi41Ni4xNSwxMy4yMWMuMTMsMTEuNTQuMjUsMTMuMjkuOTcsMTMuODMsMS4yMS45MiwyMy41MS44OSwyNC43OC0uMDQsMS4wNC0uNzYuOS0yMS45NC0uMTktMjguOS0yLjUtMTUuOTUtMTEuODYtMjYuOS0yNi40MS0zMC44OC01LjUyLTEuNTEtMTkuNTUtMS43My0yNS4yMi0uNC0xNi43NSwzLjk0LTI1LjA3LDEzLjY3LTI4LjQyLDMzLjIzLTEuMzUsNy45My0uODMsMTEwLjQyLjYsMTE2LjY1LDMuNTIsMTUuMzQsMTEuNiwyNC41MywyNC45OSwyOC4xN1oiLz4KICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0zNDMuNTIsMzE3LjE1Yy41NCwzLjU3LDEuNjgsMTEuMTksMi41MiwxNi45NS44NSw1Ljc2LDEuNzEsMTEuMTQsMS45MiwxMS45NmwuMzgsMS41LDExLjE1LjEzYzYuMTMuMDgsMTEuMzMtLjA0LDExLjU1LS4yNi40Ni0uNDYsMS41Mi02LjI3LDIuNjQtMTQuNTguNDMtMy4xNSwxLjEyLTcuODYsMS41NC0xMC40NywxLjI3LTcuOTcsNy4yMi00Ny40MSw5LjIxLTYxLjA3LjgtNS40OSwxLjgxLTEyLjIyLDIuMjMtMTQuOTUuNDMtMi43NSwxLjIxLTcuOTEsMS43NS0xMS40Ny41My0zLjU2LDEuMTEtNy4yNiwxLjI3LTguMjIsMS40Ni04LjMyLDEuNDctNy40OSwxLjczLDgyLjUxbC4wNywzOS4xOGgyNi44OWMtLjAzLTIzLjE3LS4wNC00OC40NC0uMDQtNzUuMjksMC03Ny41NC0uMTMtMTAwLjY4LS41OS0xMDEuMTQtLjY4LS42Ny0zNy42LS44OC0zOC41OS0uMjItLjMuMi0uNywxLjYtLjg4LDMuMTEtLjUxLDQuMjEtMS4xLDguMzItMi43NCwxOS40NS0uODMsNS42Mi0yLjE5LDE1LjM3LTMuMDMsMjEuNjgtLjgzLDYuMzEtMS43NSwxMi45Mi0yLjAyLDE0LjcxLS4yOCwxLjc4LTEuNjMsMTEuMzItMywyMS4xOC0xLjM4LDkuODctMi44NCwyMC4zLTMuMjYsMjMuMTgtLjQyLDIuODgtMS4wNyw3LjctMS40NywxMC43MS0xLjc1LDEzLjQ4LTIuMTIsMTMuNTgtMy43NCwxLS41My00LjEyLTEuMjktOS43Mi0xLjctMTIuNDctMS4yOC04LjczLTIuNy0xOC42Ni00LjAyLTI4LjQyLS43MS01LjIxLTEuNjEtMTEuNi0yLjAyLTE0LjItLjM5LTIuNjEtLjk1LTYuNjQtMS4yNC04Ljk4LS4yOS0yLjMzLS43My01LjU4LTEtNy4yMi0uNDgtMi45NS0xLjA2LTcuMS0xLjk3LTEzLjk2LS43Mi01LjM3LTIuNDgtMTguMS0yLjk3LTIxLjQ0LS4yNC0xLjY0LS41OS00LjExLS43Ny01LjQ3LS4xNy0xLjM3LS41OC0yLjY1LS45Mi0yLjg2LS45My0uNTktMzcuMTMtLjQ4LTM4LjI2LjEyLS45NS41MS0uOTcsMi4xNy0uOTcsMTAxLjE5LDAsMzcuMDgsMCw2MC41MS0uMDYsNzUuMzNoMjQuODhsLjEtMzkuNjhjLjI4LTk5LjgyLjA5LTk1LjI2LDMtNzQuMDQuNTUsMy45NywxLjEsNy41NiwxLjIzLDcuOTcuMTIuNDIsMS4wMiw2LjI2LDEuOTksMTIuOTcsMS43NCwxMi4wNiwyLjQ4LDE3LjAzLDUsMzMuNjQuNzEsNC42NywxLjczLDExLjQsMi4yNiwxNC45Ni41MywzLjU2LDEuNCw5LjQsMS45NSwxMi45NloiLz4KICA8L2c+Cjwvc3ZnPg==" alt=""><div class="cv-co">${t('pv_company')}</div></div>
      <div class="cv-mid"><div class="cv-kicker">${t('law_kicker')}</div>
        <div class="cv-name">${esc(t('law_cover',id))}</div>
        <div class="cv-meta">${t('law_covers')} ${esc(b.interval_from??'—')}–${esc(b.interval_to??'—')} · ${t('law_members',b.members.length)}${b.manh_date?` · ${esc(b.manh_date)}`:''}</div></div>
      <div class="cv-foot"><div>${t('pv_generated')} ${today}${time?` · ${time}`:''}</div><div class="pgn">1 / ${total}</div></div></div>`;
  const rosterTitle=i=>t('law_roster')+(chunks.length>1?` (${i+1}/${chunks.length})`:'');
  // ONE clean TOC entry per SECTION at its FIRST page (القائمة once; each scan document once) — never
  // «(1/2)(2/2)», consistent with the employee dossier. The pages themselves still show (p/N) headers.
  const toc=[{k:t('law_roster'), pg:3}]; let _sp=3+chunks.length;
  scanTasks.forEach((s,ti)=>{ const office=/\.(docx|xlsx)$/i.test(s.path||'');   // office scans render as 1 page each (no image)
    const n=office?1:(perTask[ti]||[]).filter(Boolean).length; if(n){ toc.push({k:s.title, pg:_sp}); _sp+=n; } });
  const tocRows=toc.map(e=>`<li><span>${e.k}</span><span class="tp">${e.pg}</span></li>`).join('');
  const contents=`<div class="pg toc">${run}<div class="pv-body"><div class="pv-h2">${t('pv_contents')}</div><ol class="toc-list">${tocRows}</ol></div>${foot(2)}</div>`;
  const thead=`<thead><tr><th>${t('lg_serial')}</th><th>${fieldLabel('name_latin')}</th><th>${fieldLabel('passport_no')}</th><th>${t('law_emp')}</th></tr></thead>`;
  let pages='', pg=2;
  chunks.forEach((chunk,ci)=>{ pg++;
    const rr=chunk.map(m=>`<tr><td>${esc(m.serial??'—')}</td><td>${esc(m.name_as_written||'—')}</td><td>${esc(m.passport_no||'—')}</td><td>${m.person_id?esc(m.person_id):'—'}</td></tr>`).join('');
    pages+=`<div class="pg report">${run}<div class="pv-body"><div class="pv-h2">${rosterTitle(ci)}</div>
      <table class="lb-print">${thead}<tbody>${rr}</tbody></table></div>${foot(pg)}</div>`; });
  scanPages.forEach(s=>{ pg++; pages+=`<div class="pg scan bleed"><img class="pv-scan" src="${s.img}" alt=""></div>`; });   // the legal paper fills the whole page (no chrome), max space
  for(const s of officeTasks){ const oh=await officeDocHtml(s.path); if(!oh)continue; pg++;   // the actual Word/Excel page, rendered in-app
    pages+=`<div class="pg scan office">${run}<div class="pv-body"><div class="pv-h2">${esc(s.title)}</div><div class="pv-office" dir="ltr">${oh}</div></div>${foot(pg)}</div>`; }
  return cover+contents+pages;
}
async function printBatch(b){
  try{ const html=await buildBatchDossier(b); if(!html){window.print();return}
    $('#print').innerHTML=html; await waitImages($('#print')); window.print();
  }catch(e){ console.warn('batch print',e); window.print(); }
}

/* ── add-employee intake: drop → validate → upload to Storage → OCR line picks up ──
   Throw any files (1+ employees, any format). Each file is its own row with its own
   state (queued → uploading%→ done / failed+reason, retryable). Uploads land in the
   `intake` bucket; the Python OCR worker consumes them and the scan board shows OCR
   live. Keeps the proven OCR brain — only the intake source moved off the local folder. */
const IK_BUCKET='intake', IK_MAX=200*1024*1024, IK_OK=/^(image\/|application\/pdf)/;
const IK_CONC=6;                 // upload at most 6 at once — drop UNLIMITED files, they queue behind
                                 // (6 ≈ the browser's per-host connection limit; more won't parallelise
                                 //  against one Supabase host anyway).
const IK_PIPELINE=12;            // BACKPRESSURE: at most 12 files IN THE WORKER PIPELINE at once
                                 // (uploaded but not yet landed). Uploads finish in ~1s but the
                                 // Cloud Run worker needs ~20s each; without this cap a 35-file drop
                                 // fires 35 webhooks in seconds and overflows Cloud Run → 429. Set to
                                 // the worker's max-instances (12). A rare self-heal re-fire that brushes
                                 // capacity now 429-retries with JITTERED backoff, so no cushion needed.
const IK_STUCK_MS=45000;         // a file 'processing' this long with NO job = its webhook was dropped
const IK_TRIES=3;                // …(429/missed) → re-fire it, up to this many times (self-heal)
const IK_RESUMABLE=6*1024*1024;  // ≥6MB → chunked resumable (TUS) upload; smaller → one-shot POST
let IK=[], _ikSeq=0, _ikPending={}, _ikCh=null, _ikRecTimer=null, _ikPoll=null;
// THE GATE LIVES HERE NOW. The Cloud-Run worker fills the mold and parks a CLEAN scan at
// 'staged' — it NEVER writes to persons/visas ("only the gate commits"). The board used to
// be that gate; the board is gone, so v2 IS the gate: it auto-commits staged jobs to the
// registry. Open by default (the owner's standing valve; the OCR inbox is curated).
let GATE_OPEN=true, ADOPT_OPEN=true;
const _ikCommitting=new Set();            // job_ids mid-commit → never double-commit
function openIntake(){$('#intake').classList.add('on');document.body.style.overflow='hidden';ikWatch();ikSweepStaged();}
function closeIntake(){$('#intake').classList.remove('on');document.body.style.overflow=''}
/* the file's SHA-256 == the worker's scan_jobs.image_hash → correlate an upload to its
   OCR job, so the row ticks only when the employee is truly COMMITTED, not just uploaded. */
async function sha256(file){
  try{ const b=await file.arrayBuffer(); const d=await crypto.subtle.digest('SHA-256',b);
    return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,'0')).join(''); }
  catch(_){ return null; }
}
/* D2 · the reconcile query must never grow with the batch.
   `.in('image_hash',…)` is a URL parameter and each hash is 64 hex characters, so ~200-250 pending
   files exceed the URL limit and the request fails outright — a wall, not a slowdown. Two defences:
     1. the set itself now stays small, because a file parked for a human leaves _ikPending (above);
     2. and even so we never send more than IK_RECON_CHUNK hashes in one request.
   Belt AND braces on purpose: (1) is a design property that a future change could quietly undo,
   while (2) is a hard bound that holds regardless. */
const IK_RECON_CHUNK=80;
async function ikReconcile(){
  const hashes=Object.keys(_ikPending); if(!hashes.length)return;
  // newest job per hash wins — so an OLD committed job from a previous drop of the same
  // file can't tick a NEW upload that is still being read. Tick only when the CURRENT
  // job is truly committed (the board's مُودَع column = status committed/done).
  const chunks=[];
  for(let i=0;i<hashes.length;i+=IK_RECON_CHUNK) chunks.push(hashes.slice(i,i+IK_RECON_CHUNK));
  const parts=await Promise.all(chunks.map(c=>sb.from('scan_jobs')
    .select('job_id,image_hash,status,error_msg,created_at,doc_type,image_path,fields,field_conf,flagged')
    .in('image_hash',c)
    .order('created_at',{ascending:false})
    .then(r=>r.data||[], ()=>[])));          // one bad chunk must not blind the others
  const data=parts.flat();
  if(!data.length)return;
  const latest={};
  for(const r of data){                       // newest per hash still wins across chunks
    const p=latest[r.image_hash];
    if(!p || new Date(r.created_at)>new Date(p.created_at)) latest[r.image_hash]=r;
  }
  let changed=false;
  for(const h of Object.keys(_ikPending)){
    const r=latest[h]; if(!r)continue;
    const j=_ikPending[h];
    // Two files with IDENTICAL content share ONE image_hash, so _ikPending holds only the last of them.
    // Resolve EVERY card with this hash together (twins), or a duplicate freezes at 'processing' forever
    // while its (same) job is already committed — the "status never syncs" bug.
    const twins=IK.filter(x=>x.hash===h);
    if(r.status==='committed'||r.status==='done'){          // landed in the registry → ✓
      twins.forEach(x=>{x.state='landed';x.stage=null;}); delete _ikPending[h]; changed=true;
    } else if(r.status==='failed'){                          // quality gate / read refused it → ✕
      twins.forEach(x=>{x.state='refused';x.err=r.error_msg||'';}); delete _ikPending[h]; changed=true;
    } else if(r.source==='packet' || r.doc_type==='packet'){
      // the packet «zero line»: while it is being cut show «in the splitter», then a terminal
      // «split into N» summary. The parent card is NEVER committed — its child documents flow
      // on their own through the normal gate — so it uses the dedicated 'packet-split' status.
      if(r.status==='packet-split'){
        j.state='split'; j.summary=r.fields||{}; j.splitN=(j.summary.children)||0;
        if(j.pkOpen===undefined)j.pkOpen=true; j.kidsSettled=false;
        delete _ikPending[h]; changed=true; ikEnsurePoll();     // keep polling for the children
      } else if(j.stage!=='splitting'){ j.stage='splitting'; changed=true; }
    } else if(r.status==='pending-review'||r.status==='needs-linking'){
      // Parked for a human. It USED to stay in _ikPending "until it commits", which meant every
      // reviewed file was polled forever — so on a big drop the pending set grew without bound and
      // the reconcile query grew with it (D2: the hash list is a URL parameter and breaks around
      // 200-250 files). It never needed polling: a commit from the drawer sets the card to
      // 'landed' directly, and the DB-backed «الوارد» section is now the surface for these.
      // needsBoard = the rare orphan/ambiguous case the quick-review may not auto-resolve.
      // resolve TWINS together, like the landed/refused branches — a duplicate-content card left
      // on the old state would freeze at 'processing' once its hash stops being polled
      twins.forEach(x=>{ x.job=r; x.needsBoard=(r.status==='needs-linking');
                         if(x.state!=='review'){ x.state='review'; changed=true; } });
      delete _ikPending[h];                       // stop watching → the set stays small
    } else if(r.status==='legal-review'){
      // a legal paper (تعهد/استمارة/منح) — parked in its OWN pool for the § assembler, never a
      // person/visa. Terminal for the intake board: it shows «§ legal review», no auto-commit.
      // Same as review: terminal for THIS board, so stop polling it (the legal commit path sets
      // the card to 'landed' itself — see the batch commit).
      twins.forEach(x=>{ if(x.state!=='legal'){ x.state='legal'; changed=true; } });
      delete _ikPending[h];
    } else if(r.status==='staged'||r.status==='skipped'||r.status==='approved'){
      // CLEAN and parked at the gate. The worker doesn't commit — v2 does. Auto-commit it
      // now (gate open by default); on success it becomes 'done' → the row flips to ✓.
      if(GATE_OPEN && !_ikCommitting.has(r.job_id)) ikAutoCommit(h, r);
    } else {
      // an INTERMEDIATE OCR-line stage (captured → raw-uploaded → reading → scored). Surface it on the
      // row so the paper's movement down the line is visible, not a frozen "processing".
      if(j.stage!==r.status){ j.stage=r.status; changed=true; }
    }
  }
  // SELF-HEAL: a file that has sat 'processing' with NO job at all is one whose webhook was dropped
  // (429/missed). After a grace period, re-queue it (a fresh upload re-fires the webhook), a few times.
  const now=Date.now();
  for(const h of Object.keys(_ikPending)){
    const j=_ikPending[h];
    if(j.state==='processing' && !latest[h] && j.sentAt && (now-j.sentAt)>IK_STUCK_MS && (j.tries||0)<IK_TRIES){
      j.tries=(j.tries||0)+1; j.sentAt=0; delete _ikPending[h]; j.state='queued'; changed=true;
    }
  }
  if(changed)ikRender();
  ikPump();                    // a landed / re-queued file freed a pipeline slot → feed the next
}
/* v2 IS the commit gate now. A clean scan the worker parked at 'staged' is committed here,
   automatically — the same faithful path (ikCommitJob) a reviewed one takes. */
async function ikAutoCommit(hash, r){
  _ikCommitting.add(r.job_id);
  try{
    const res=await ikCommitSerial(r, {...(r.fields||{})});
    const j=_ikPending[hash];
    if(res&&res.ok){
      if(j){ j.state='landed'; delete _ikPending[hash]; ikRender(); ikPump(); }   // freed a slot → next
      search($('#q')?$('#q').value:'');            // surface the new employee at once
    } else if(res&&res.defer){
      // a clean scan we still can't anchor (rare orphan/ambiguous) → surface for a human
      if(j){ j.job=r; j.needsBoard=true; j.state='review'; ikRender(); }
    }
  }catch(_){ /* transient (RLS/network) → a later reconcile or sweep retries */ }
  finally{ _ikCommitting.delete(r.job_id); }
}
/* Sweep every clean job parked at the gate — even ones this browser didn't upload (a file
   scanned while v2 was closed). Runs whenever the intake opens: v2 = the open gate. */
/* ── D3 · drain the BACKLOG from the database, not from this browser ─────────────────────────
   A file the worker finished cleanly parks at 'staged' and waits for v2 to commit it. That sweep
   only ran when someone OPENED the intake panel — so after a reload, or if nobody opens it, a
   perfectly good file waits forever. Measured on the live board: 2 clean files stranded for
   24 hours, in none of the three buckets. That is precisely the dead end the premise forbids.

   So it now runs from the DATABASE side, on sign-in and when the tab becomes visible, with no
   dependence on what this browser happens to remember.

   Note it cannot resume UPLOADS: a file that was never uploaded exists only as a File object in
   the page and is genuinely gone after a reload. What resumes is everything that reached the DB.  */
const IK_SWEEP_PAGE=50, IK_SWEEP_MAX_PAGES=40;      // ≤2000 per drain; a cap, not a limit on work
let _ikDraining=false;
async function ikSweepStaged(){
  if(!GATE_OPEN || _ikDraining) return 0;
  _ikDraining=true;
  let committed=0, hitCap=true;         // assume capped until a page proves we drained
  try{
    for(let page=0; page<IK_SWEEP_MAX_PAGES; page++){
      const {data,error}=await sb.from('scan_jobs')
        .select('job_id,doc_type,image_path,fields,field_conf,flagged,status')
        // 'approved'/'skipped' are parked-and-clean too — the reconciler already auto-commits
        // them, so a sweep that only knew 'staged' left those stranded by omission.
        .in('status',['staged','approved','skipped'])
        .order('created_at',{ascending:true})       // oldest first: the longest-waiting file goes first
        .limit(IK_SWEEP_PAGE);
      if(error) break;
      const rows=(data||[]).filter(r=>!_ikCommitting.has(r.job_id));
      if(!rows.length){ hitCap=false; break; }        // drained: nothing left to take
      rows.forEach(r=>_ikCommitting.add(r.job_id));
      // Dispatch through the POOL instead of awaiting each in turn. Awaiting one at a time here
      // would re-impose the very serialisation D1 removed, on the exact path that handles bulk.
      const res=await Promise.all(rows.map(r=>
        ikCommitSerial(r,{...(r.fields||{})})
          .then(x=>!!(x&&x.ok), ()=>false)
          .finally(()=>_ikCommitting.delete(r.job_id))));
      committed+=res.filter(Boolean).length;
      if(!res.some(Boolean)){ hitCap=false; break; }  // nothing moved → stop rather than spin
    }
    if(committed) search($('#q')?$('#q').value:'');
  }catch(_){}
  finally{ _ikDraining=false; }
  // A backlog bigger than one pass (3000 files > the 2000 ceiling) must not stop halfway and
  // wait for some unrelated trigger — that is a silent stall, which is the thing we are
  // removing everywhere else. If we stopped because of the page cap and work still moved,
  // continue on the next tick until the queue is genuinely empty.
  if(hitCap && committed) setTimeout(()=>ikSweepStaged(), 0);
  return committed;
}
/* Realtime may be off for scan_jobs — poll while uploads are in flight so the staged
   transition (and its auto-commit) is caught within seconds regardless. */
function ikEnsurePoll(){
  if(_ikPoll)return;
  _ikPoll=setInterval(async ()=>{
    if(PERF.idlePoll && document.hidden) return;   // #3: pause the reconcile poll while the tab is hidden (resumes next tick when visible)
    let live=false;
    if(Object.keys(_ikPending).length){ ikReconcile(); live=true; }   // uploads in flight
    try{ if(await ikRefreshFamilies())live=true; }catch(_){}          // a packet's children still moving
    if(!live){ clearInterval(_ikPoll); _ikPoll=null; }
  }, 4000);
}
function ikWatch(){                                  // flip 'processing' → 'landed' on commit, live
  if(_ikCh)return;
  _ikCh=sb.channel('ik_jobs')
    .on('postgres_changes',{event:'*',schema:'public',table:'scan_jobs'},
      ()=>{clearTimeout(_ikRecTimer);_ikRecTimer=setTimeout(()=>{ikReconcile();ikRefreshFamilies();},400)})
    .subscribe();
}
/* SELF-HEAL after a background / session lapse. The realtime socket (_ikCh) is subscribed ONCE and
   never re-armed if it dies while the tab is backgrounded; and a reconcile fetch silently no-ops on
   an expired token (Cloudflare Access / Supabase). Either can freeze a pending card at its last-seen
   stage even though the worker already finished server-side. On regaining focus — or right after
   Supabase refreshes the token — we re-arm realtime and force ONE reconcile, so every pending card
   snaps to its TRUE db state. No-op when nothing is pending (zero cost), and it invents NO status:
   a card only resolves to what the DB already says (✓ landed / ✕ refused / review). */
function ikResync(){
  // D3: the BACKLOG lives in the database, so drain it whether or not this browser remembers
  // anything. The old early-return below meant a reload (which empties _ikPending) skipped the
  // drain entirely — how 2 clean files sat stranded for 24 hours.
  ikSweepStaged();
  if(!Object.keys(_ikPending).length) return;          // nothing THIS page uploaded → no card to heal
  if(_ikCh){ try{ sb.removeChannel(_ikCh); }catch(_){} _ikCh=null; }   // drop a possibly-dead socket
  ikWatch();          // re-subscribe realtime
  ikEnsurePoll();     // ensure the 4s reconcile poll is alive
  ikReconcile();      // and snap to truth now (the token is fresh after a refresh/focus)
}
/* Files can arrive from OUTSIDE this browser — the folder uploader puts them straight into the
   bucket, so the worker reads them and parks the clean ones at 'staged' with nothing on this page
   knowing they exist. Realtime doesn't help: it is only subscribed when THIS page has uploads in
   flight, and ikReconcile keys off _ikPending, which is empty in that case. So the app would sit
   open, apparently working, and commit nothing — worse than closing and reopening it, which at
   least triggers a sweep.
   A slow heartbeat closes that: one cheap query while the tab is visible, doing nothing when the
   queue is empty and draining it when it is not. */
const IK_DRAIN_MS=20000;
let _ikDrainTimer=null;
function ikWatchBacklog(){
  if(_ikDrainTimer) return;
  _ikDrainTimer=setInterval(()=>{
    if(document.visibilityState==='visible' && !_ikDraining) ikSweepStaged();
  }, IK_DRAIN_MS);
}
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') ikResync(); });
if(sb) sb.auth.onAuthStateChange(ev=>{ if(ev==='TOKEN_REFRESHED'||ev==='SIGNED_IN'){ ikResync(); ikWatchBacklog(); loadPaperTypes(); } });   // (app.js has no LIVE flag — sb is always created)

// the OCR-line stages, shown live on a processing row so the paper's movement is visible
const IK_STAGE_L={'captured':['التُقط','captured'],'raw-uploaded':['حُفظت الصورة','image saved'],
  'preprocessed-&-seen':['قيد القراءة…','reading…'],'scored':['قيد التقييم…','scoring…'],
  'sorted':['قيد الفرز…','sorting…'],'needs-linking':['بحاجة ربط','needs linking'],
  'splitting':['في المُقسِّم…','in the splitter…']};   // a packet on the «zero line» being split
function ikStageTxt(s){ const m=IK_STAGE_L[s]; return m?(LANG==='ar'?m[0]:m[1]):t('ik_processing'); }
function ikStateTxt(j){
  if(j.state==='queued')return t('ik_queued');
  if(j.state==='uploading')return j.pct+'%';
  if(j.state==='processing')return j.stage?ikStageTxt(j.stage):t('ik_processing');
  if(j.state==='landed')return '✓ '+t('ik_landed');
  if(j.state==='split')return '✓ '+t('ik_split',j.splitN||0);   // a packet: split into N documents (its children flow on their own)
  if(j.state==='refused')return '✕ '+t('ik_refused');
  if(j.state==='review')return '';                    // the Review button fills the slot instead
  if(j.state==='legal')return '';                     // the «§ legal review» button fills the slot
  return '✕ '+(j.err||t('ik_failed'));
}
// concise + language-aware reason. The worker stores only the Arabic text, so in
// English we recognise the (small, fixed) quality-gate reasons and render them in EN,
// keeping the key numbers. Arabic mode shows the worker's own first clause.
function ikReason(err){
  const s=String(err||'').trim(); if(!s)return '';
  if(LANG==='ar') return s.split(/[.\n—]/)[0].trim().slice(0,80);
  const dims=(s.match(/(\d+\s*[×x]\s*\d+)/)||[])[1];
  if(/ليس صورة|openable/i.test(s))          return 'Not an openable image — use a photo, PDF or screenshot';
  if(/صغيرة|too small/i.test(s))            return `Too small${dims?` (${dims}px)`:''} — use a higher-resolution scan`;
  if(/واضحة|مشو|sharp|blur/i.test(s))       return 'Not sharp — use a clearer scan';
  if(/إضاءة|انعكاس|glare|expos/i.test(s))   return 'Glare / over-exposed — reduce reflection';
  return 'Low quality — use a clearer scan';
}
function ikThumb(j){return j.file.type.startsWith('image/')?`<img src="${URL.createObjectURL(j.file)}" alt="">`:'📄'}
function ikSyncRow(j){                              // cheap per-row update during upload
  const el=document.querySelector(`.ik-row[data-id="${j.id}"]`); if(!el)return;
  el.className=`ik-row ${j.state}`;
  const bar=el.querySelector('.ik-bar2 i'); if(bar)bar.style.width=j.pct+'%';
  const st=el.querySelector('.ik-state'); if(st)st.textContent=ikStateTxt(j);
}
/* One row per dropped file, written at upload so nothing can be invisible. Idempotent by hash:
   a retry of the same file must not add a second row. Returns false if the ledger refused it —
   the caller then fails the card rather than pumping a file the count can never see. */
async function ikLedgerRow(job, path){
  if(!job.hash || job._ledger) return true;
  try{
    const {data:seen}=await sb.from('scan_jobs').select('job_id')
      .eq('image_hash',job.hash).limit(1);
    if(seen&&seen.length){ job._ledger=true; return true; }      // worker or a prior try got there first
    const {error}=await sb.from('scan_jobs').insert({
      batch_id:job.batch||null, source:'intake', status:'received', doc_type:'unknown',
      image_hash:job.hash, image_path:path,
      fields:{_original_filename:job.file.name}});
    if(error) throw error;
    job._ledger=true; return true;
  }catch(e){ job._ledgerErr=(e&&e.message)||'ledger'; return false; }
}
async function ikUpload(job){
  job.state='uploading'; job.pct=0; ikSyncRow(job);
  try{
    if(job.hash===undefined) job.hash=await sha256(job.file);   // = the worker's image_hash
    const {data:{session}}=await sb.auth.getSession();
    if(!session)throw new Error(t('ik_auth'));
    const safe=job.file.name.replace(/[^\w.\-]+/g,'_');   // \w is ASCII → Arabic is stripped to '_'
    // …so a legal roster's TYPE (تعهد/استمارة) would be lost. Carry it as an ASCII marker the worker
    // reads back (its filename check looks for taahud/istimara). Empty for passports/visas → no effect.
    const _lt=/استمارة|istimara/i.test(job.file.name)?'istimara-':(/تعهد|taahud/i.test(job.file.name)?'taahud-':'');
    const path=`${Date.now().toString(36)}-${job.id}-${_lt}${safe}`;
    // ── the LEDGER ROW, written BEFORE the file exists ───────────────────────────────────────
    // A file used to become visible only when the WORKER created its row, so a dropped webhook
    // left the file in the bucket with no row at all — in the system, but in none of the three
    // buckets. Five files sat like that for 27-35 minutes and no count could see them.
    // The order matters: uploading first would let the webhook fire and the worker insert its own
    // row before ours lands, giving TWO rows for one file. Writing it first means the worker's
    // find_by_hash always finds this row and reuses it (status 'received' is ranked below any real
    // read, so it neither blocks a fresh file nor lets a re-drop of a committed one look new).
    if(!await ikLedgerRow(job, path))
      throw new Error(t('ik_ledger')||('لم يُسجَّل الملف في السجل — '+(job._ledgerErr||'')));
    if(job.file.size>=IK_RESUMABLE) await ikResumable(job,path,session);   // big → chunked
    else await new Promise((res,rej)=>{                                    // small → one-shot POST
      const xhr=new XMLHttpRequest();
      xhr.open('POST',`${SUPA_URL}/storage/v1/object/${IK_BUCKET}/${path}`);
      xhr.setRequestHeader('apikey',SUPA_KEY);                 // Supabase gateway requires this
      xhr.setRequestHeader('Authorization',`Bearer ${session.access_token}`);
      xhr.setRequestHeader('x-upsert','true');
      if(job.file.type)xhr.setRequestHeader('Content-Type',job.file.type);
      xhr.upload.onprogress=e=>{if(e.lengthComputable){job.pct=Math.round(e.loaded/e.total*100);ikSyncRow(job)}};
      xhr.onload=()=>(xhr.status>=200&&xhr.status<300)?res():rej(new Error(`HTTP ${xhr.status} ${(xhr.responseText||'').replace(/["{}]/g,'').slice(0,70)}`));
      xhr.onerror=()=>rej(new Error('network'));
      xhr.send(job.file);
    });
    job.pct=100; job.state='processing'; job.sentAt=Date.now();   // uploaded → in the worker pipeline
    if(job.hash){ _ikPending[job.hash]=job; ikWatch(); ikEnsurePoll(); ikReconcile(); }
  }catch(e){ job.state='failed'; job.err=(e&&e.message)||'error'; }
  ikRender(); ikPump();                             // free a slot → start the next queued file
}
/* Chunked resumable upload (Supabase TUS) — the pro way for a BIG file: sent in 6MB chunks so a
   drop doesn't ride on one fragile request, and progress is real. The bucket's own file-size
   limit still governs the total (raise it in Supabase for very large files). */
async function ikResumable(job,path,session){
  const file=job.file, size=file.size, CH=IK_RESUMABLE;
  const b64=s=>btoa(unescape(encodeURIComponent(s)));
  const md=`bucketName ${b64(IK_BUCKET)},objectName ${b64(path)},contentType ${b64(file.type||'application/octet-stream')},cacheControl ${b64('3600')}`;
  const auth={apikey:SUPA_KEY, Authorization:`Bearer ${session.access_token}`};
  const cr=await fetch(`${SUPA_URL}/storage/v1/upload/resumable`,{method:'POST',
    headers:{...auth,'Tus-Resumable':'1.0.0','Upload-Length':String(size),'Upload-Metadata':md,'x-upsert':'true'}});
  if(cr.status!==201) throw new Error(`resumable ${cr.status}`);
  let loc=cr.headers.get('Location')||cr.headers.get('location');
  if(!loc) throw new Error('resumable: no upload url (CORS?)');
  if(loc.startsWith('/')) loc=SUPA_URL+loc;
  let offset=0;
  while(offset<size){
    const chunk=file.slice(offset, Math.min(offset+CH,size));
    const pr=await fetch(loc,{method:'PATCH',
      headers:{...auth,'Tus-Resumable':'1.0.0','Upload-Offset':String(offset),'Content-Type':'application/offset+octet-stream'},
      body:chunk});
    if(pr.status!==204) throw new Error(`chunk ${pr.status}`);
    offset=parseInt(pr.headers.get('Upload-Offset')||String(offset+chunk.size),10);
    job.pct=Math.round(offset/size*100); ikSyncRow(job);
  }
}
/* the queue: drop as many files as you like — only IK_CONC upload at once, the rest wait. */
function ikPump(){
  const uploading=IK.filter(j=>j.state==='uploading').length;
  // in-flight = still moving THROUGH the worker (uploading or uploaded-awaiting-worker). A file
  // parked for a human (review/legal) or finished (landed/refused/failed) has LEFT the pipeline.
  const inflight=IK.filter(j=>j.state==='uploading'||j.state==='processing').length;
  if(uploading>=IK_CONC || inflight>=IK_PIPELINE) return;   // backpressure → never overflow Cloud Run
  const next=IK.find(j=>j.state==='queued');
  if(next){ ikUpload(next); ikPump(); }
}
/* ════════════════════════════════════════════════════════════════════════════════════════════
   THE QUEUE — a window onto the database
   ════════════════════════════════════════════════════════════════════════════════════════════
   Every row here comes from `v_intake_ledger`. Nothing is kept in browser memory, so refreshing
   or closing the tab changes only what is DISPLAYED — the work itself never disappears. That was
   the old failure: the intake list was built from `_ikPending` (this session's drops), so after a
   reload the reconciler returned immediately and pending files became unreachable while still
   sitting in the database.

   Two buckets, because both need a home: قيد المراجعة (work owed) and مرفوض (with its reason).
   Committed files need no surface here — they are already employees, searchable in the app.  */
const PQ_SIZE=50;
const PQ={bucket:'review', kind:'all', page:0, rows:[], total:0, counts:[], countsLoaded:false, seq:0, loading:false, timer:null};
const PQ_KINDS=[['all','pq_all'],['legal','pq_legal'],['passport','pq_pass'],['visa','pq_visa']];

async function pqOpen(){ $('#pend').classList.add('on'); document.body.style.overflow='hidden';
  PQ.loading=true; pqRender(); await pqLoad(); pqLive(); }
function pqClose(){ $('#pend').classList.remove('on'); document.body.style.overflow='';
  if(PQ.timer){ clearInterval(PQ.timer); PQ.timer=null; } }
/* Files arrive from OUTSIDE this browser — the folder uploader puts them in the bucket and the
   worker files them — so a section that only refreshed on a click showed a stale queue and made
   the uploader feel disconnected from the app. While it is OPEN and the tab is VISIBLE, re-read
   every few seconds. Skipped when hidden, so it costs nothing in the background. */
const PQ_LIVE_MS=5000;
function pqLive(){
  if(PQ.timer) return;
  PQ.timer=setInterval(()=>{
    if(document.visibilityState!=='visible') return;
    if(!$('#pend').classList.contains('on')){ clearInterval(PQ.timer); PQ.timer=null; return; }
    if(!PQ.loading) pqLoad();          // refreshes the counts too, so the chips stay honest
  }, PQ_LIVE_MS);
}

/* Why this is shaped the way it is — the first version FELT slow on every chip click:
     · it re-fetched the COUNTS on each click, though counts don't change when you change a
       filter — only when the data changes;
     · the two requests ran one after the other, so the wait was their SUM;
     · nothing repainted until both returned, so a click looked ignored;
     · and `if(PQ.busy) return` silently DROPPED any click made during a load, which reads as
       the UI being stuck rather than busy.
   Now: repaint instantly from what we already know, fetch only the rows, and let the latest
   request win instead of blocking. `counts` refreshes on open/refresh and after a mutation. */
async function pqLoad(opts){
  const seq=++PQ.seq;                                   // last click wins; none are swallowed
  // Default is TO fetch; only an explicit {counts:false} skips it. Written as `opts && …` this
  // was inverted: pqLoad() with no argument (open, refresh, and after every delete/retry) skipped
  // the counts entirely, so the chips all read 0 while the list below showed the real rows.
  if(!opts || opts.counts!==false){
    try{ const {data,error}=await sb.from('v_intake_counts').select('bucket,kind,n');
         if(error) throw error; PQ.counts=data||[]; PQ.countsLoaded=true; }
    catch(e){ PQ.countsLoaded=false; }
    if(seq!==PQ.seq) return;
  }
  try{
    // BOUNDED by construction: one page at a time, ordered oldest-first (fairest queue), so the
    // request size never grows with the batch. The old reconciler sent every pending hash as a
    // URL parameter and broke around 200-250 files.
    let q=sb.from('v_intake_ledger')
      .select('job_id,doc_type,kind,bucket,status,image_path,image_hash,fields,fail_reason,fail_kind,error_msg,created_at,batch_id',
              {count:'exact'})
      .eq('bucket',PQ.bucket).order('created_at',{ascending:true})
      .range(PQ.page*PQ_SIZE, PQ.page*PQ_SIZE+PQ_SIZE-1);
    if(PQ.kind!=='all') q=q.eq('kind',PQ.kind);
    const {data,count,error}=await q;
    if(seq!==PQ.seq) return;                            // a newer click already superseded this
    if(error) throw error;
    PQ.rows=data||[]; PQ.total=count||0;
  }catch(e){ if(seq!==PQ.seq) return; PQ.rows=[]; PQ.total=0; toast((e&&e.message)||'load failed'); }
  finally{ if(seq===PQ.seq){ PQ.loading=false; pqRender(); } }
}

/* Returns null until the counts have actually arrived. A chip that prints a confident "0" before
   its number loads is a lie in the same family as the empty list that hid the مرفوض rows: the
   reader cannot tell "none" from "not known yet". Callers render '' for null. */
function pqCount(b,k){
  if(!PQ.countsLoaded) return null;
  return PQ.counts.filter(c=>c.bucket===b&&(k==='all'||c.kind===k))
                  .reduce((s,c)=>s+(c.n||0),0);
}
const pqN=v=>v==null?'':v;                 // what a chip actually prints

function pqBadge(){
  const n=pqCount('review','all'), el=$('#pq-badge');
  if(el){ el.textContent=pqN(n); el.hidden=(n==null||!n); }
}

function pqRender(){
  const B=$('#pq-buckets'), K=$('#pq-kinds'), L=$('#pq-list'), P=$('#pq-pager');
  if(!B) return;
  const isRev=PQ.bucket==='review';
  // ── WHERE AM I ────────────────────────────────────────────────────────────────────────────
  const hero=$('.pq-hero'); if(hero) hero.classList.toggle('refused',!isRev);
  $('#pq-hero-ic').textContent = isRev?'⏳':'✕';
  $('#pq-hero-t').textContent  = t(isRev?'pq_rev':'pq_ref');
  $('#pq-hero-s').textContent  = t(isRev?'pq_rev_s':'pq_ref_s');
  $('#pq-bar-h').textContent   = t('pq_h');

  // chips in the app's own filter language (.fchip/.fc), same look and place as the
  // employees + legal filters, so this section reads as part of the app and not a bolt-on
  B.innerHTML=[['review','⏳ '+t('pq_rev')],['refused','✕ '+t('pq_ref')]]
    .map(([b,lab])=>`<button class="fchip${PQ.bucket===b?' on':''}" data-pqb="${b}">${lab}
      <span class="fc">${pqN(pqCount(b,'all'))}</span></button>`).join('');
  // kinds only qualify REVIEW — a refusal is about the file, not the paper type
  K.style.display=isRev?'flex':'none';
  K.innerHTML=!isRev?'':PQ_KINDS.map(([k,key])=>{
      const n=pqCount('review',k);
      // an unknown count (still loading) must NOT hide the chip — only a known zero may
      if(k!=='all' && n===0) return '';                    // hide an empty kind, as the legal bar does
      return `<button class="fchip${PQ.kind===k?' on':''}" data-pqk="${k}">${t(key)}
        <span class="fc">${pqN(n)}</span></button>`; }).join('');
  const cnt=$('#pq-count');
  if(cnt) cnt.textContent = PQ.total ? t('n_res',PQ.total) : '';

  if(!PQ.rows.length){
    // "loading" and "genuinely empty" must not look identical — otherwise a slow fetch reads as
    // "there is nothing here", which is exactly how the مرفوض bug presented itself.
    L.innerHTML=PQ.loading
      ? `<div class="pq-empty">…</div>`
      : `<div class="pq-empty">${t(isRev?'pq_none_rev':'pq_none_ref')}</div>`;
  } else {
    L.innerHTML=PQ.rows.map(r=>{
      const nm=esc((r.fields&&r.fields._original_filename)||r.image_path||r.job_id.slice(0,8));
      const when=new Date(r.created_at).toLocaleString(LANG==='ar'?'ar':'en-GB');
      const kindTag=esc(r.kind||'—');
      // Rows refused BEFORE Phase A carry their reason in the older `error_msg`; without this
      // fallback every one of them would show only "failed" and explain nothing.
      const reason=r.fail_reason||r.error_msg||'';
      const why=r.bucket==='refused'
        ? `<div class="pq-why">${esc(reason||t('pq_noreason'))}${
             r.fail_kind?` · ${esc(r.fail_kind)}`:''}</div>` : '';
      const act=r.bucket==='review'
        ? `<button class="pq-act" data-pqopen="${r.job_id}">${t('pq_review')} ›</button>`
        : `<button class="pq-act" data-pqretry="${r.job_id}">${t('pq_retry')} ⟳</button>`;
      return `<div class="pq-row ${r.bucket}">
        <span class="pq-kindtag">${kindTag}</span>
        <div class="pq-meta"><div class="pq-nm">${nm}</div>
          <div class="pq-sub">${esc(r.status)} · ${esc(when)}</div>${why}</div>
        ${act}
        <button class="pq-del" data-pqdel="${r.job_id}" title="${t('pq_del')}">🗑</button>
      </div>`;
    }).join('');
  }
  const pages=Math.max(1,Math.ceil(PQ.total/PQ_SIZE));
  P.innerHTML=PQ.total>PQ_SIZE
    ? `<button ${PQ.page<=0?'disabled':''} data-pqp="-1">‹</button>
       <span class="pq-sub">${PQ.page+1} / ${pages} · ${PQ.total}</span>
       <button ${PQ.page>=pages-1?'disabled':''} data-pqp="1">›</button>` : '';
  pqBadge();          // keep the top-bar badge tied to the RENDER, not to one code path —
}

/* The conservation-law badge that used to sit in this header is gone. It reported the LAST
   SETTLED batch, which is not what someone reading this list is asking about — they are looking
   at the files in front of them, and each row already carries its own state. A number describing
   a different, older batch beside those rows invited exactly the wrong reading. */

/* Real deletion — the section IS the window onto the database, so removing a card removes the
   row. Safe because NOTHING in review or refused is in the registry yet: no employee, no visa,
   no link. The guard is the bucket itself — a committed row is never listed here, and the
   database policy still refuses anyone below editor. */
async function pqDelete(jobId){
  const r=PQ.rows.find(x=>x.job_id===jobId); if(!r) return;
  if(r.bucket==='committed'){ toast(t('pq_nocommit')); return; }
  const nm=(r.fields&&r.fields._original_filename)||jobId.slice(0,8);
  if(!confirm(t('pq_delq',nm))) return;
  const {error}=await sb.from('scan_jobs').delete().eq('job_id',jobId)
                        .not('status','in','(done,committed)');   // belt and braces
  if(error){ toast(error.message); return; }
  toast(t('pq_deleted')); await pqLoad();
}

/* Retry a refused file. The line dedups by content hash, so the row must GO before the same file
   can be read again — otherwise a re-drop is a silent no-op, which is exactly what made the
   re-drops during the first mass pump look like they did nothing. */
async function pqRetry(jobId){
  const r=PQ.rows.find(x=>x.job_id===jobId); if(!r) return;
  if(r.fail_kind==='deterministic'){
    toast(t('pq_nodet'));
    return;
  }
  const {error}=await sb.from('scan_jobs').delete().eq('job_id',jobId)
                        .not('status','in','(done,committed)');
  if(error){ toast(error.message); return; }
  toast(t('pq_cleared'));
  await pqLoad();
}

/* ── the DROP BATCH — how many files this drop is sending ────────────────────────────────────
   The conservation law (N pumped = committed + review + refused) needs ONE number that comes from
   OUTSIDE the database. Comparing rows against the sum of their own buckets can never fail — every
   row is in a bucket by construction — so it would report 500 = 500 even if 200 files never
   arrived. `declared_total` is that outside number: the client says what it is about to send, and
   settle_batches() compares it to what actually reached the ledger.
   Best-effort: if the stamp fails the files still pump — we lose the verdict, not the work. */
async function ikStampBatch(n){
  const id=`B${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  try{
    const {data:{user}}=await sb.auth.getUser();
    await sb.from('intake_batches').insert({batch_id:id, declared_total:n, declared_by:user?.email||null});
  }catch(_){ /* no verdict for this batch; the pump is unaffected */ }
  return id;
}
/* ── the hand-off: a browser is the wrong place to hold hours of pending work ────────────────
   With a big drop only IK_PIPELINE files are moving and the rest are File handles in this page's
   memory. Refresh and the browser revokes them — not a bug we can fix, it is the browser refusing
   to let a page re-read your disk without you choosing again. (Google's own Cloud Console cancels
   an upload on refresh for the same reason.) So above a threshold we stop and offer the folder
   uploader, where the queue is files on a disk instead.
   It is a BLOCK, not a suggestion. It used to be a choice — «تابع من المتصفح» sat beside the
   download — but an option we already know loses the queue is not a kindness when the batch is
   big enough for that loss to hurt. The threshold is the pipeline width, so nothing is blocked
   that the browser can actually carry. */
// EXACTLY the pipeline width + 1. Up to IK_PIPELINE every file is genuinely in flight; the
// first file beyond it is only a File handle in this page's memory, which the browser revokes on
// refresh. So this is not a taste threshold — it is the precise point where the browser stops
// being able to keep its promise, and where the folder queue starts being the honest answer.
const IK_BIG=IK_PIPELINE+1;
/* Above IK_PIPELINE the browser cannot keep its promise, so this is a GATE, not a suggestion:
   the tool, or cancel. It used to offer "continue in the browser", and that option was the
   problem — it let someone choose the path we already know loses their queue on a refresh, and
   the cost lands later, on a batch big enough to hurt.

   HAVE IT → the primary action OPENS it, through the iccmc-uploader: protocol the tool claims for
   itself on first run. A page cannot start a program any other way; this is the one route browsers
   sanction, and if the protocol is not registered the navigation simply does nothing — which is
   why a "didn't open?" fallback appears a moment later instead of leaving the user staring.

   DON'T → download it.

   "Has it" is remembered locally when the download is taken. That is a guess, not knowledge — the
   browser is not allowed to look at the disk — so the fallback is always reachable. */
const AGENT_KEY='iccmc_agent_downloaded';
const AGENT_VER_KEY='iccmc_agent_version';
/* The version of the uploader this site ships. Keep it equal to TOOL_VERSION in pump.py.
   Storing which version was taken turns one hopeful guess ("they probably have it") into three
   honest states: they have nothing, they have an OLD one, or they have this one. */
const TOOL_V='1.1';

function agentHave(){ try{ return localStorage.getItem(AGENT_KEY)==='1'; }catch(_){ return false; } }
function agentVer(){ try{ return localStorage.getItem(AGENT_VER_KEY)||''; }catch(_){ return ''; } }
function agentGot(){ try{ localStorage.setItem(AGENT_KEY,'1');
                          localStorage.setItem(AGENT_VER_KEY,TOOL_V); }catch(_){} }
/* three states, one line */
function agentState(){
  if(!agentHave()) return 'none';
  return agentVer()===TOOL_V ? 'current' : 'stale';
}

function paintAgentLink(){
  const a=document.querySelector('.dz-agent'); if(!a) return;
  const ic=a.querySelector('.dz-agent-i'), lb=a.querySelector('#dz-agent-t');
  const st=agentState();
  const asDownload=()=>{ a.setAttribute('download','افتح أداة الرفع.pyw');
                         a.setAttribute('href','ICCMC-uploader.pyw'); };
  if(st==='current'){
    if(ic)ic.textContent='⇱'; if(lb)lb.textContent=t('dz_agent_open');
    a.removeAttribute('download'); a.removeAttribute('href');   // JS opens it, see openAgent
  }else if(st==='stale'){
    if(ic)ic.textContent='⟳'; if(lb)lb.textContent=t('dz_agent_new');
    asDownload();
  }else{
    if(ic)ic.textContent='⤓'; if(lb)lb.textContent=t('dz_agent');
    asDownload();
  }
  if(!a._wired){ a._wired=1; a.addEventListener('click',e=>{
    if(agentState()!=='current'){ agentGot(); setTimeout(paintAgentLink,600); return; }  // downloading
    // An <a href="custom-scheme:"> is NOT reliable: Chrome drops the navigation silently when it
    // dislikes the context — it never even reaches the "Open this app?" prompt, so the user gets a
    // dead click and the browser records no decision. Assigning location.href inside the click is
    // the form browsers actually honour.
    e.preventDefault();
    openAgent(a);
  }); }
}
function openAgent(anchor){
  const lb=anchor.querySelector('#dz-agent-t'), was=lb?lb.textContent:'';
  if(lb)lb.textContent=t('big_opening');
  let left=false;
  const mark=()=>{left=true;};
  window.addEventListener('blur',mark,{once:true});
  document.addEventListener('visibilitychange',mark,{once:true});
  try{ location.href='iccmc-uploader://open'; }catch(_){}
  setTimeout(()=>{
    window.removeEventListener('blur',mark);
    if(left){ if(lb)lb.textContent=was; return; }        // it opened — put the label back
    if(lb)lb.textContent=t('dz_agent_nope');             // it did not — offer the file
    anchor.setAttribute('download','افتح أداة الرفع.pyw');
    anchor.setAttribute('href','ICCMC-uploader.pyw');
    const ic=anchor.querySelector('.dz-agent-i'); if(ic)ic.textContent='⤓';
  },2500);
}
function agentHave(){ try{ return localStorage.getItem(AGENT_KEY)==='1'; }catch(_){ return false; } }
function agentGot(){ try{ localStorage.setItem(AGENT_KEY,'1'); }catch(_){} }

function ikBigDropAsk(n){
  return new Promise(resolve=>{
    const have=agentHave();
    const w=document.createElement('div'); w.className='ikbig-w';
    w.innerHTML=`<div class="ikbig">
      <div class="ikbig-h">${n} ${t('big_files')}</div>
      <div class="ikbig-s">${have?t('big_have'):t('big_why')}</div>
      <div class="ikbig-b">
        ${have ? `<button class="ikbig-go" data-open>⇱ ${t('big_open')}</button>`
               : `<a class="ikbig-go" href="ICCMC-uploader.pyw" download="افتح أداة الرفع.pyw">⤓ ${t('big_get')}</a>`}
        <button class="ikbig-alt">${t('big_anyway')}</button>
      </div>
      <div class="ikbig-n">${t('big_note')}</div>
    </div>`;
    document.body.appendChild(w);
    const close=v=>{ w.remove(); resolve(v); };
    w.querySelector('.ikbig-alt').onclick=()=>close(false);       // cancel — nothing is added
    const go=w.querySelector('.ikbig-go');
    if(have){
      go.onclick=()=>{
        go.textContent=t('big_opening'); go.disabled=true;
        // Losing focus is the one signal the page DOES get when another program takes over. It is
        // not proof, but it is far better than the old unconditional fallback, which announced
        // "didn't open?" even when the window was already up.
        let left=false; const mark=()=>{left=true;};
        window.addEventListener('blur',mark,{once:true});
        document.addEventListener('visibilitychange',mark,{once:true});
        try{ location.href='iccmc-uploader://open'; }catch(_){}
        setTimeout(()=>{
          window.removeEventListener('blur',mark);
          if(left){ go.textContent='⇱ '+t('big_open'); go.disabled=false; return; }
          const n2=w.querySelector('.ikbig-n');
          if(n2) n2.innerHTML=`<a class="ikbig-re" href="ICCMC-uploader.pyw" download="افتح أداة الرفع.pyw">${t('big_nope')}</a>`;
          go.textContent='⇱ '+t('big_open'); go.disabled=false;
        },2500);
      };
    }else{
      go.onclick=()=>{ agentGot(); paintAgentLink();
                       setTimeout(()=>close(false),400); };   // let the download start
    }
    w.onclick=e=>{ if(e.target===w) close(false); };
  });
}
async function ikAdd(files){
  const list=Array.from(files);
  if(list.length>=IK_BIG && !await ikBigDropAsk(list.length)) return;
  const batch=await ikStampBatch(list.length);
  for(const f of list){
    const job={id:++_ikSeq, file:f, state:'queued', pct:0, err:'', batch};
    if(!IK_OK.test(f.type) && !/\.(xlsx|docx)$/i.test(f.name)) {job.state='failed'; job.err=t('ik_bad')}  // .xlsx/.docx by name: some OSes give them an empty MIME
    else if(f.size>IK_MAX) {job.state='failed'; job.err=t('ik_big')}
    IK.push(job);
  }
  ikRender(); ikPump();                              // queue drains IK_CONC at a time
}
async function ikRemove(id){
  const j=IK.find(x=>x.id===id); if(!j) return;
  IK=IK.filter(x=>x.id!==id); if(j.hash) delete _ikPending[j.hash]; ikRender();   // dismiss the card now (responsive)
  // A LANDED card is a committed employee — dismissing just HIDES it; NEVER delete the person.
  // A NON-terminal card (processing / review / legal / split / refused) still has a scan_jobs row on
  // the worker's board — dismissing must clear THAT too, or the row lingers as a DB leftover (exactly
  // the residue we had to sweep by hand). Server-side + CONFIRMED: if the delete fails (e.g. an expired
  // token) we RESTORE the card so a retry removes it for real — never a silent orphan.
  if(j.state==='landed' || !j.hash || !sb) return;
  try{
    const {error}=await sb.from('scan_jobs').delete()
      .eq('image_hash',j.hash).not('status','in','(done,committed)');   // never a committed employee
    if(error) throw error;
  }catch(_){
    IK.push(j); _ikPending[j.hash]=j; ikRender(); toast(t('ik_rm_fail'));   // undo the dismiss → a retry cleans it
  }
}
function ikRetry(id){const j=IK.find(x=>x.id===id);if(j){j.state='queued';j.err='';ikUpload(j)}}
/* ── packet «family»: show the split children grouped under their packet row ──
   Every split child carries parent_packet = the packet file's hash (= the packet IK
   row's own hash), so we gather a packet's children with one query and nest them.
   Minimal: the packet on top, its documents beneath, each with its status + a review
   action — the same review drawer a normal scan uses. */
let _ikKids={};                     // job_id → a synthetic review-job wrapper for a child
function kidClsLabel(cls){ const m={passport:'ik_cls_passport',visa:'ik_cls_visa',legal:'ik_cls_legal'}[cls];
  return m?t(m):String(cls||'—').toUpperCase(); }
function kidName(k){ const f=k.fields||{}, cls=(k.split_class||'').toLowerCase();
  if(cls==='legal'){ const pt=f.paper_type||String(k.doc_type||'').replace('legal_','');   // تعهد / استمارة / منح
    return t('lg_'+pt) || kidClsLabel('legal'); }
  return f.name_latin||f.name_native||kidClsLabel(cls); }
/* A child renders as a REAL .ik-row — so name (.ik-nm), status (.ik-state), spinner and the
   review buttons (.ik-review-btn / .lglaw) are IDENTICAL to the regular line. The state class
   (landed/refused/review/legal/processing) drives the exact same colours. The only additions
   are the type chip (.ik-kid-cls) and the nesting rail (.ik-fam). */
function kidRow(k){
  const cls=(k.split_class||'').toLowerCase(), s=k.status;
  let st, body;
  if(s==='committed'||s==='done'){            st='landed';     body=`<span class="ik-state">✓ ${esc(t('ik_committed'))}</span>`; }
  else if(s==='failed'){                       st='refused';    body=`<span class="ik-state">✕ ${esc(t('ik_refused'))}</span>`; }
  else if(s==='pending-review'||s==='needs-linking'){ st='review'; body=`<button class="ik-review-btn" data-kidreview="${esc(String(k.job_id))}">${t('ik_review')}</button>`; }
  else if(s==='legal-review'){                 st='legal';      body=`<button class="ik-review-btn lglaw" data-legalreview="${esc(k.image_hash||(k.fields&&k.fields.scan_hash)||'')}"><span class="lgmark">⚖</span> ${t('ik_legal')} ›</button>`; }
  else {                                       st='processing'; body=`<span class="ik-state">${esc(ikStageTxt(s))}</span>`; }
  return `<div class="ik-row ik-kid ${st} ${cls}">`
    + `<span class="ik-kid-cls ${cls}">${esc(kidClsLabel(cls))}</span>`
    + `<div class="ik-meta"><div class="ik-nm">${esc(kidName(k))}</div></div>`
    + `${body}</div>`;
}
function ikKidsHtml(j){
  if(j.state!=='split')return '';
  const kids=j.kids||[], skip=(j.summary&&j.summary.noise)||0;
  const body=kids.map(kidRow).join('');
  const skipHtml=skip?`<div class="ik-row ik-kid skip"><span class="ik-kid-cls">—</span><div class="ik-meta"><div class="ik-nm">${esc(t('ik_pk_skip',skip))}</div></div></div>`:'';
  const wait=(!kids.length&&!skip)?`<div class="ik-row ik-kid skip"><div class="ik-meta"><div class="ik-nm">…</div></div></div>`:'';
  return `<div class="ik-fam${j.pkOpen===false?' closed':''}">${body}${skipHtml}${wait}</div>`;
}
async function ikRefreshFamilies(){
  const packs=IK.filter(j=>j.state==='split'&&j.hash);
  if(!packs.length)return false;
  let pending=false, staged=false;
  for(const j of packs){
    if(j.kidsSettled)continue;
    try{
      const {data}=await sb.from('scan_jobs')
        .select('job_id,image_hash,split_class,status,doc_type,fields,field_conf,flagged,error_msg,person_id,image_path')
        .eq('parent_packet',j.hash).order('created_at');
      j.kids=data||[];
      for(const k of j.kids){ _ikKids[k.job_id]={id:'k'+k.job_id,job:k,hash:null,state:'review',_kid:true,
        file:{name:kidName(k)}}; }   // the review drawer reads jk.file.name — a child has no upload, so use its person name
      if(j.kids.some(k=>k.status==='staged'))staged=true;
      // Keep WATCHING until every child is truly terminal. A legal-review child flips to ✓ once the
      // § assembler commits its batch (an external event); a pending-review one when it's reviewed.
      const _term=st=>st==='committed'||st==='done'||st==='failed';
      const allDone=j.kids.length>0 && (!j.splitN||j.kids.length>=j.splitN) && j.kids.every(k=>_term(k.status));
      if(allDone) j.kidsSettled=true; else pending=true;
    }catch(_){ pending=true; }
  }
  if(staged)ikSweepStaged();          // a clean child parked at the gate → commit it live
  ikRender();
  return pending;
}
function openKidReview(jobId){
  const jk=_ikKids[jobId]; if(!jk||!jk.job)return;
  _rvJob=jk; _rvJob._scanUrl=null; _rvShowAll=false;
  ikBuildReview(); $('#ikreview').classList.add('on'); document.body.style.overflow='hidden';
}
const IK_COMPACT_AT=20;                // ≥ this many files in ONE intake → auto-compact (a screenful, above the 12-wide pipe)
let _ikView='auto';                    // 'auto' | 'compact' | 'detailed' — the count picks the default, the user overrides either way
function ikCompact(){ return _ikView==='compact' || (_ikView==='auto' && IK.length>=IK_COMPACT_AT); }
/* one card = one file row — extracted so compact + detailed render the EXACT same card. */
function ikRowHtml(j){ return `<div class="ik-row ${j.state}" data-id="${j.id}">
    <div class="ik-th">${ikThumb(j)}</div>
    <div class="ik-meta"><div class="ik-nm">${esc(j.file.name)}</div>
      <div class="ik-sz">${(j.file.size/1048576).toFixed(1)} MB</div>
      ${j.state==='refused'&&j.err?`<div class="ik-why" title="${esc(j.err)}">${esc(ikReason(j.err))}</div>`:''}
      ${j.state==='review'?`<div class="ik-ask">${j.needsBoard?t('rv_asklink'):t('rv_ask')}</div>`:''}
      <div class="ik-bar2"><i style="width:${j.pct}%"></i></div></div>
    <span class="ik-state">${ikStateTxt(j)}</span>
    ${j.state==='split'?`<button class="ik-pk-toggle" data-pktoggle="${j.id}">${j.pkOpen===false?'▸':'▾'}</button>`:''}
    ${j.state==='review'?`<button class="ik-review-btn" data-review="${j.id}">${t('ik_review')}</button>`:''}
    ${j.state==='legal'?`<button class="ik-review-btn lglaw" data-legalreview="${esc(j.hash||'')}"><span class="lgmark">⚖</span> ${t('ik_legal')} ›</button>`:''}
    ${j.state==='failed'?`<button class="ik-retry" data-retry="${j.id}">${t('ik_retry')}</button>`:''}
    <button class="ik-x" data-rm="${j.id}" title="${t('t_close')}">✕</button>
  </div>${ikKidsHtml(j)}`; }
function ikRender(){
  // review/legal cards pin to the TOP (never buried); stable sort keeps upload order otherwise.
  const rank=j=>(j.state==='review'||j.state==='legal')?0:1;
  const sorted=IK.map((j,i)=>[j,i]).sort((a,b)=>rank(a[0])-rank(b[0])||a[1]-b[1]).map(p=>p[0]);
  const compact=ikCompact();
  const landed=IK.filter(j=>j.state==='landed').length, split=IK.filter(j=>j.state==='split').length;
  const review=IK.filter(j=>j.state==='review'||j.state==='legal').length;
  const fail=IK.filter(j=>j.state==='failed'||j.state==='refused').length;
  const busy=IK.filter(j=>j.state==='uploading'||j.state==='queued').length;
  const proc=IK.filter(j=>j.state==='processing').length;
  const total=IK.length, committed=landed+split, working=busy+proc;
  const toggle=total?`<button class="ik-viewtoggle" data-ikview="${compact?'detailed':'compact'}">${t(compact?'ik_v_detailed':'ik_v_compact')} ›</button>`:'';
  // COMPACT = only the cards a human must act on; committed ones collapse into the bar + legend.
  const isExc=j=>j.state==='review'||j.state==='legal'||j.state==='refused'||j.state==='failed';
  const cards=(compact?sorted.filter(isExc):sorted).map(ikRowHtml).join('');
  let header='';
  if(compact){
    // a single segmented progress bar shows the whole breakdown at a glance; a quiet legend names it.
    const seg=(c,n)=>n?`<span class="seg ${c}" style="flex:${n}"></span>`:'';
    const lg =(c,n,w)=>`<span class="lg"><i class="d ${c}"></i><b class="lg-n">${n}</b><span class="lg-w">${w}</span></span>`;
    header=`<div class="ik-compact${working?' work':''}">
      <div class="ik-pbar">${seg('ok',committed)}${seg('rev',review)}${seg('ref',fail)}${seg('track',working)}</div>
      <div class="ik-legend">${lg('ok',committed,t('ik_committed'))}${review?lg('rev',review,t('ik_lg_rev')):''}${fail?lg('ref',fail,t('ik_refused')):''}${working?lg('track',working,t('ik_busy')):''}<span class="ik-lg-spacer"></span>${toggle}</div>
    </div>${(!cards&&!working&&total)?`<div class="ik-allclear">${t('ik_allclear')}</div>`:''}`;
  } else if(toggle){ header=`<div class="ik-viewbar">${toggle}</div>`; }
  $('#ik-list').innerHTML=header+cards;
  // DETAILED keeps the honest text footer; in COMPACT the ring IS the summary, so the footer clears.
  let f='';
  if(!compact && total){ const sent=proc+landed;
    f=`<b>${sent}</b> ${t('ik_sent')}`;
    if(landed)f+=` · <b>${landed}</b> ${t('ik_committed')}`;
    if(busy)f+=` · ${busy} ${t('ik_busy')}`;
    if(fail)f+=` · <b>${fail}</b> ${t('ik_fail')}`;
    if(sent&&!busy)f+=`<br>${t('ik_next2')}`; }
  $('#ik-foot').innerHTML=f;
}

/* ── wiring ──────────────────────────────────────────────────────────────── */
$('#signin').addEventListener('click',signIn);
$('#pass').addEventListener('keydown',e=>{if(e.key==='Enter')signIn()});
$('#glang').addEventListener('click',()=>setLang(LANG==='ar'?'en':'ar'));
$('#tlang').addEventListener('click',()=>setLang(LANG==='ar'?'en':'ar'));
paintSort();   // render the sort control once; delegated click (survives repaints)
{ const _sb=$('#sortbar'); if(_sb)_sb.addEventListener('click',e=>{const b=e.target.closest('[data-sort]');if(b)setSort(b.dataset.sort);}); }
$('#ttheme').addEventListener('click',toggleTheme);
$('#tout').addEventListener('click',async()=>{if(confirm(t('out'))){await sb.auth.signOut();location.reload()}});
$('#add').addEventListener('click',openIntake);
$('#blaw').addEventListener('click',()=>setLaw(!LAWMODE));
$('#intake .ik-close').addEventListener('click',closeIntake);
/* ── the queue: one delegated listener, so re-rendering never leaks handlers ── */
$('#bpend').addEventListener('click',pqOpen);
$('#pend .pq-close').addEventListener('click',pqClose);
$('#pq-refresh').addEventListener('click',()=>pqLoad());
$('#pend').addEventListener('click',e=>{
  const b=e.target.closest('[data-pqb]'), k=e.target.closest('[data-pqk]'),
        p=e.target.closest('[data-pqp]'), o=e.target.closest('[data-pqopen]'),
        d=e.target.closest('[data-pqdel]'), r=e.target.closest('[data-pqretry]');
  // Repaint FIRST, fetch second. The chip highlight, the header and the count all come from state
  // we already hold, so they can change on the same frame as the click; only the rows need the
  // network. Waiting for the round-trip before drawing anything is what felt sluggish.
  // Reset the kind when the bucket changes. Kinds do NOT carry across buckets: refused files are
  // kind='other', which isn't even a tab — so keeping a kind filter made مرفوض come up empty while
  // its chip still counted 5. That was the bug.
  if(b){ PQ.bucket=b.dataset.pqb; PQ.kind='all'; PQ.page=0; PQ.rows=[]; PQ.loading=true;
         pqRender(); pqLoad({counts:false}); }
  else if(k){ PQ.kind=k.dataset.pqk; PQ.page=0; PQ.rows=[]; PQ.loading=true;
              pqRender(); pqLoad({counts:false}); }
  else if(p){ PQ.page=Math.max(0,PQ.page+ +p.dataset.pqp); PQ.rows=[]; PQ.loading=true;
              pqRender(); pqLoad({counts:false}); }
  else if(d){ pqDelete(d.dataset.pqdel); }
  else if(r){ pqRetry(r.dataset.pqretry); }
  else if(o){ pqReview(o.dataset.pqopen); }
});
/* Open a queued card in the SAME review drawer the intake list uses, so a file reviewed here
   takes the identical commit path (anchor ladder, whitelists, gates) — one behaviour, not two. */
async function pqReview(jobId){
  const r=PQ.rows.find(x=>x.job_id===jobId); if(!r) return;
  if(String(r.status)==='legal-review'){ pqClose(); openLegalReview(r.image_hash||''); return; }
  const {data}=await sb.from('scan_jobs').select('*').eq('job_id',jobId).limit(1);
  const job=data&&data[0];
  if(!job){ toast(t('pq_gone')); await pqLoad(); return; }
  // ADOPT the row into the IK list so `openIkReview` — and therefore the whole commit path
  // (anchor ladder, whitelists, mandatory-field gate) — is literally the same code. A second
  // commit implementation is how two behaviours drift apart.
  let jk=IK.find(x=>x.hash===job.image_hash);
  if(!jk){
    jk={id:++_ikSeq, hash:job.image_hash, batch:job.batch_id, pct:100, err:'', _ledger:true,
        // a synthetic file stub: the drawer only reads name/size/type (thumb falls back to 📄)
        file:{name:(job.fields||{})._original_filename||job.image_path||job.job_id.slice(0,8),
              size:0, type:''}};
    IK.push(jk);
  }
  jk.job=job; jk.state='review'; jk.needsBoard=(job.status==='needs-linking');
  pqClose(); openIkReview(jk.id);
}
$('#dz-input').addEventListener('change',e=>{ikAdd(e.target.files);e.target.value=''});
(()=>{ const dz=$('#dz');
  ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('over')}));
  dz.addEventListener('dragleave',e=>{if(!dz.contains(e.relatedTarget))dz.classList.remove('over')});
  dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('over');
    if(e.dataTransfer&&e.dataTransfer.files.length)ikAdd(e.dataTransfer.files)});
})();
/* ── quick-review: a stuck pic (pending-review / needs-linking) is checked and
   inserted right here, mirroring the ocr-line drawer. The COMMIT rules below are a
   faithful port of ocr.js `commitJob` — same tables, same whitelists, same anchor
   ladder (passport_no first, name NEVER alone). The rare branches a human must
   arbitrate — a duplicate passport number, a probable name+dob match, an orphan with
   nothing to anchor on — are NOT guessed here; they defer to the scan board. Keep in
   step with ocr.js if that commit path ever changes. */
const REQ_BY_TYPE={passport:['passport_no','passport_expiry','name_latin','dob','place_of_birth','nationality','sex'],
  visa:['visa_no','visa_expiry'], national_id:['national_id_no','name_latin'], unknown:[]};
const RV_ORDER=['passport_no','name_latin','name_native','dob','sex','nationality','place_of_birth',
  'passport_type','passport_issue','passport_expiry','issuing_country','issuing_authority','national_id_no',
  'visa_no','visa_type','visa_country','visa_issue','visa_expiry','visa_entry_days','visa_stay_days'];
// the full field set per document type — «Show all fields» reveals ALL of these (even empty), so a
// reviewer can supply the IDENTITY (name / passport no.) an orphan doc needs to become an employee.
const TYPE_FIELDS={
  passport:['name_latin','name_native','passport_no','dob','sex','nationality','place_of_birth',
    'passport_type','passport_issue','passport_expiry','issuing_country','issuing_authority','national_id_no'],
  visa:['name_latin','name_native','passport_no','dob','visa_no','visa_type','visa_country',
    'visa_issue','visa_expiry','visa_entry_days','visa_stay_days'],
  national_id:['name_latin','name_native','national_id_no','dob','sex','nationality'],
};
const PERSON_DB=['person_id','name_latin','name_native','dob','sex','nationality','place_of_birth',
  'national_id_no','passport_no','passport_type','passport_issue','passport_expiry',
  'issuing_country','issuing_authority','mrz','id_scan','passport_scan','photo'];
const VISA_DB=['person_id','visa_no','visa_type','visa_issue','visa_expiry','visa_country','visa_scan',
  'visa_expiry_basis','visa_entry_days','visa_stay_days','visa_entry_date'];
function pickDb(src,keys){const o={};keys.forEach(k=>{const v=src[k];if(v!==undefined&&v!==null&&String(v).trim()!=='')o[k]=v});return o}
const _nameTokens=s=>new Set(String(s||'').toUpperCase().split(/[^A-Z]+/).filter(x=>x.length>1));
function _sameName(a,b){const A=_nameTokens(a),B=_nameTokens(b);if(!A.size||A.size!==B.size)return false;for(const x of A)if(!B.has(x))return false;return true}
/* Ask the DATABASE for the next id. This used to be select-max-then-add-one here in the client,
   which is only safe while exactly one commit runs at a time — the real reason commits were
   chained, and therefore the reason throughput fell from 18.4/min to 1.3/min across a batch.
   A sequence hands out each number once however many callers ask together, so commits can now
   run in parallel. person_id is the primary key, so any surprise still fails loudly. */
async function _nextPersonId(){
  const {data,error}=await sb.rpc('next_person_id');
  if(error)throw error;
  if(!data)throw new Error('next_person_id returned nothing');
  return data;
}
async function _resolveAnchor(f){
  const no=String(f.passport_no||'').trim();
  if(no){ const {data,error}=await sb.from('persons').select('person_id,passport_no').eq('passport_no',no).limit(3);
    if(error)throw error;
    if(data&&data.length===1)return {person_id:data[0].person_id,how:'passport_no'};
    if(data&&data.length>1)return {ambiguous:1};            // two people, one number → human
  }
  // COMPOSITE identity anchor: national ID (priority 1) → else name+DOB+place+nationality+sex weighed
  // together. 'auto' = confident → link (the caller files the old doc into history). 'flag' = uncertain
  // → the board confirms. ANY error falls through to the exact name+dob check below — never a regression.
  if(f.name_latin||f.name_native||f.national_id_no){
    try{
      const {data:mm}=await sb.rpc('match_person',{p_name:f.name_latin||f.name_native||'',
        p_dob:f.dob||null, p_place:f.place_of_birth||null, p_national_id:f.national_id_no||null,
        p_nationality:f.nationality||null, p_sex:f.sex||null});
      const top=(mm&&mm[0])||null;
      if(top&&top.verdict==='auto') return {person_id:top.person_id, how:top.id_hit?'national_id':'match'};
      if(top&&top.verdict==='flag') return {person_id:top.person_id, how:'match', confirm:1};
    }catch(_){/* fall through to the exact name+dob check below */}
  }
  if(f.name_latin&&f.dob){ const {data}=await sb.from('persons').select('person_id,name_latin,dob').eq('dob',f.dob).limit(25);
    const hits=(data||[]).filter(p=>_sameName(p.name_latin,f.name_latin));
    if(hits.length===1)return {person_id:hits[0].person_id,how:'name+dob',confirm:1};
  }
  return null;
}
/* Does an EXISTING person's stored identity CONTRADICT this scan? Two people must never merge, so a
   different national ID (digits-compared, so 12345-6789012-3 == 1234567890123) or a different birthday
   is a hard STOP → the caller defers to a human. A lookup hiccup never blocks a legitimate commit. */
async function _identityConflict(pid,f){
  try{
    const {data}=await sb.from('persons').select('national_id_no,dob').eq('person_id',pid).limit(1);
    const p=data&&data[0]; if(!p)return false;
    if(p.national_id_no&&f.national_id_no&&
       String(p.national_id_no).replace(/\D/g,'')!==String(f.national_id_no).replace(/\D/g,''))return true;
    if(p.dob&&f.dob&&String(p.dob).slice(0,10)!==String(f.dob).slice(0,10))return true;
    return false;
  }catch(_){ return false; }
}
/* SERIALIZE every commit — the gate must write ONE job at a time. Two staged scans of the SAME
   passport, committed concurrently, would each resolveAnchor to "none" (neither has inserted yet)
   and each create a person → a duplicate. Chaining makes job B's anchor lookup run AFTER job A's
   insert, so B finds A and updates instead. All three commit paths (auto, sweep, review) use this. */
/* ── D1 · commits run in a POOL, not a single file ───────────────────────────────────────────
   Every commit used to be chained onto one promise, so however many uploads ran in parallel the
   whole pump collapsed to the commit rate: measured 18.4/min for the first 25 files and 1.3/min
   for the last 25 — a 14x decay, which is the "it gets weak after 30" you felt.

   Why it HAD to be serial until now: person ids were minted client-side by reading the max and
   adding one, so two concurrent commits would mint the same EMP-####. That is fixed at the root
   (next_person_id() is a DB sequence, verified unique across 200 concurrent allocations), so the
   ordering constraint is gone and a pool is safe.

   Kept modest at 4: each commit is several round-trips, and the aim is a STEADY rate, not a
   burst that competes with the uploads for the same connection. */
const COMMIT_PAR=4;
let _commitActive=0; const _commitQ=[];
function _commitDrain(){
  while(_commitActive<COMMIT_PAR && _commitQ.length){
    const it=_commitQ.shift(); _commitActive++;
    Promise.resolve().then(()=>ikCommitJob(it.j,it.f,it.forcePid))
      .then(it.resolve, it.reject)
      .finally(()=>{ _commitActive--; _commitDrain(); });
  }
}
/* Name kept: every call site means "commit this safely", and that contract is unchanged — only
   the scheduling is. A failed commit still cannot stall the others; it just frees its slot. */
function ikCommitSerial(j,f,forcePid){
  return new Promise((resolve,reject)=>{ _commitQ.push({j,f,forcePid,resolve,reject}); _commitDrain(); });
}
async function ikCommitJob(j,f,forcePid){
  const type=j.doc_type||'unknown';
  // forcePid = a human confirmed "this is EMP-xxxx" on the board → link straight to that person.
  const anchor=forcePid?{person_id:forcePid,how:'confirmed'}:await _resolveAnchor(f);
  if(anchor&&anchor.ambiguous)return {defer:1};             // duplicate passport # → board
  if(anchor&&anchor.confirm)return {defer:1};               // probable name+dob → let the board confirm
  // IDENTITY GUARD — never write a document onto an EXISTING person whose identity CONTRADICTS this scan.
  // The hard stop against a wrong link (a mis-confirmed renewal, a bad anchor, a race resolving to the
  // wrong person): a passport joins EMP-x only if EMP-x's national ID and birthday do not conflict with
  // it. On a conflict we DEFER to a human — we NEVER merge two different people. (A brand-new person has
  // nothing to conflict with, so this only gates links to an existing one.)
  if(anchor&&anchor.person_id&&await _identityConflict(anchor.person_id,f))return {defer:1};
  let pid=anchor?anchor.person_id:null, created=false;
  if(type==='visa'){
    if(!pid){                                               // human confirmed → create the person from this visa
      if(!f.name_latin&&!f.name_native)return {defer:1};
      const prow=pickDb(f,PERSON_DB); pid=await _nextPersonId(); prow.person_id=pid;
      const {error:pe}=await sb.from('persons').upsert(prow,{onConflict:'person_id'}); if(pe)throw pe; created=true;
    }
    const row=pickDb(f,VISA_DB); row.person_id=pid; if(j.image_path)row.visa_scan=j.image_path;
    if(row.visa_no){ const {data:dup}=await sb.from('visas').select('visa_id').eq('person_id',pid).eq('visa_no',row.visa_no).limit(1);
      if(dup&&dup.length){ await _ikMarkDone(j,pid,f); return {ok:1,pid,created,dup:1}; } }
    const {error}=await sb.from('visas').insert(row); if(error)throw error;
  }else{
    if(!pid){ pid=await _nextPersonId(); created=true; }
    const row=pickDb(f,PERSON_DB); row.person_id=pid;
    if(j.image_path){ if(type==='national_id')row.id_scan=j.image_path; else row.passport_scan=j.image_path; }
    if(!row.name_latin&&!row.name_native)return {defer:1};
    const {error}=await sb.from('persons').upsert(row,{onConflict:'person_id'}); if(error)throw error;
    // file this passport into the person's document history (SCD-2): a NEW number supersedes the old.
    if(type!=='national_id'&&row.passport_no){ try{ await sb.rpc('record_person_document',{p_person_id:pid,
      p_doc_type:'passport', p_doc_no:row.passport_no, p_issue:row.passport_issue||null,
      p_expiry:row.passport_expiry||null, p_scan:row.passport_scan||null}); }catch(_){} }
  }
  // ORPHAN LEGAL BACKFILL — if this passport was waiting in any legal batch, connect it now.
  if(f.passport_no){ try{ await sb.rpc('legal_link_person',{p_person_id:pid,p_passport_no:String(f.passport_no).trim()}); }catch(_){} }
  await _ikMarkDone(j,pid,f);
  return {ok:1,pid,created};
}
async function _ikMarkDone(j,pid,f){
  // the corrected fields ride back to scan_jobs — the person row uses them, and each
  // correction becomes a labelled example stored next to its image (free training later).
  const row={status:'done',person_id:pid,error_msg:null,fields:f,flagged:[]};
  // WHO confirmed this? Until now `reviewed_by` was NULL on every row — including committed ones —
  // so "did a person actually check this record?" had no answer. A commit that a human drove
  // through the drawer is stamped; an automatic one is deliberately left blank, so the two stay
  // distinguishable rather than both looking reviewed.
  if(_rvJob && _rvJob.job && _rvJob.job.job_id===j.job_id){
    try{ const {data:{user}}=await sb.auth.getUser();
         row.reviewed_by=user?.email||'human'; row.reviewed_at=new Date().toISOString(); }catch(_){}
  }
  await sb.from('scan_jobs').update(row).eq('job_id',j.job_id);
}

let _rvJob=null,_rvShowAll=false;
function fieldLabel(k){return FL[k]?(LANG==='ar'?FL[k][0]:FL[k][1]):k}
/* HUMAN DATE ENTRY — the safe pattern (reuse for ANY surface that takes a human date).
   A free-text date box is a silent-corruption trap: "7/7/2025" is ambiguous (7 Jul vs Jul 7)
   AND won't parse into the validity engine, which needs ISO YYYY-MM-DD. So every date field is
   a native <input type="date"> — a d/m/y picker whose .value is ALWAYS ISO, locale-independent.
   Plus a LOGICAL guard (`validateDates`): an issue date can't fall after its expiry, and a
   birth date can't be in the future. Add a new date field → just list its key in DATE_FIELDS. */
const DATE_FIELDS=new Set(['dob','passport_issue','passport_expiry','visa_issue','visa_expiry','visa_entry_date']);
function isoDate(v){
  const s=String(v||'').trim(); if(!s)return '';
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;                       // already ISO (the OCR's own output)
  const m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);  // tolerate a typed d/m/y
  if(m){ let d=+m[1], mo=+m[2], y=m[3].length===2?2000+ +m[3]:+m[3];
    if(mo>12&&d<=12){const t=d;d=mo;mo=t;}                         // disambiguate by the >12 part
    if(mo>=1&&mo<=12&&d>=1&&d<=31)return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
  return '';                                                       // unparseable → empty picker, user sets it
}
function validateDates(f){
  const after=(a,b)=>a&&b&&a>b;                                    // ISO strings sort chronologically
  let today=''; try{today=new Date().toISOString().slice(0,10);}catch(_){}
  if(after(f.passport_issue,f.passport_expiry)) return t('dv_order',fieldLabel('passport_issue'),fieldLabel('passport_expiry'));
  if(after(f.visa_issue,f.visa_expiry))         return t('dv_order',fieldLabel('visa_issue'),fieldLabel('visa_expiry'));
  if(today&&f.dob&&f.dob>today)                 return t('dv_future',fieldLabel('dob'));
  return null;
}
function ikBuildReview(){
  const jk=_rvJob, j=jk.job;
  const fl=(j.flagged||[]).filter(k=>k!=='doc_type' && k!=='mrz');    // what needs checking (mrz is machine-only — a human can't retype it, so never a fill field)
  const present=k=>j.fields&&j.fields[k]!=null&&String(j.fields[k]).trim()!=='';
  const typeSet=jk._fields||TYPE_FIELDS[j.doc_type]||RV_ORDER;        // every field this doc can carry (استمارة review = only its columns)
  const filled=typeSet.filter(k=>present(k)||fl.includes(k));         // what's read or flagged
  const keys=jk._fields?typeSet:(_rvShowAll?typeSet:(fl.length?fl:filled.slice(0,5)));   // استمارة shows its columns; else flagged/show-all
  const hidden=typeSet.length-keys.length;
  const rows=keys.map(k=>{
    const val=(j.fields&&j.fields[k])??''; const conf=j.field_conf&&j.field_conf[k];
    const miss=val===''||val==null, flag=fl.includes(k);
    const tag=miss?t('rv_missing'):(conf!=null?Math.round(conf*100)+'%':'');
    const inp=DATE_FIELDS.has(k)                                     // dates: a picker, never free text
      ? `<input type="date" data-k="${esc(k)}" value="${flag?'':esc(isoDate(val))}">`
      : `<input data-k="${esc(k)}" value="${flag?'':esc(val)}" placeholder="${miss?'—':''}">`;
    return `<div class="rfield${miss?' miss':flag?' flag':''}">
      <label>${esc(fieldLabel(k))} <span class="cf">${tag}</span></label>
      ${inp}</div>`;
  }).join('');
  const more=(!_rvShowAll&&hidden>0)?`<button class="rvw-more" id="rvw-more">${t('rv_all')} (${hidden})</button>`
    :(_rvShowAll?`<button class="rvw-more" id="rvw-more">${t('rv_less')}</button>`:'');
  const foot=`<button class="rvw-add" id="rvw-add">${t('rv_add')}</button>`;
  $('#ikreview').innerHTML=`
    <div class="rvw-bar"><button class="icon ik-close" id="rvw-close" title="${t('t_close')}">✕</button>
      <span class="rvw-t">${t('rv_h')}</span><span style="flex:1"></span>
      <span class="rvw-fn">${esc(jk.file.name)}</span></div>
    <div class="rvw-body">
      <div class="rvw-scan" id="rvw-scan">${t('rv_loading')}</div>
      <div class="rvw-side">
        <div class="rvw-check-h">${fl.length?t('rv_check'):t('rv_clean')}</div>
        <div id="rvw-fields">${rows}</div>${more}
      </div>
    </div>
    <div class="rvw-foot"><div id="rvw-renewal"></div>${foot}</div>`;
  $('#rvw-close').onclick=closeIkReview;
  const mb=$('#rvw-more'); if(mb)mb.onclick=()=>{_rvShowAll=!_rvShowAll;ikBuildReview();};
  const add=$('#rvw-add'); if(add)add.onclick=()=>ikDoAdd();
  ikPaintScan(j);
  ikRenewalHint();          // async: if this scan matches an existing person, offer a one-tap confirm
}
// If the doc under review likely belongs to an existing employee (composite anchor), show a gentle
// "confirm renewal → EMP-xxxx" banner. One tap links it to that person (old doc → history). Best-effort.
async function ikRenewalHint(){
  try{
    const jk=_rvJob, j=jk&&jk.job; if(!j||j.doc_type==='visa')return;   // passports for now
    const f=j.fields||{}; if(!(f.name_latin||f.name_native||f.national_id_no))return;
    const {data:mm}=await sb.rpc('match_person',{p_name:f.name_latin||f.name_native||'',
      p_dob:f.dob||null,p_place:f.place_of_birth||null,p_national_id:f.national_id_no||null,
      p_nationality:f.nationality||null,p_sex:f.sex||null});
    const top=(mm&&mm[0])||null;
    if(!top||(top.verdict!=='auto'&&top.verdict!=='flag'))return;
    const box=$('#rvw-renewal'); if(!box||!_rvJob||_rvJob.job!==j)return;   // overlay still on same job
    box.innerHTML=`<div class="rvw-renewal-card"><span class="rr-txt">${t('rv_renewal')}
      <b>${esc(top.name_latin||top.person_id)}</b> · ${esc(top.person_id)}</span>
      <button class="rvw-add rr-yes" id="rvw-renew-yes">${t('rv_renew_do')}</button></div>`;
    const y=$('#rvw-renew-yes'); if(y)y.onclick=()=>ikDoAdd(top.person_id);
  }catch(_){/* no banner on any hiccup — the normal Add button is unaffected */}
}
async function ikPaintScan(j){
  const box=$('#rvw-scan'); if(!box)return;
  if(!j.image_path){ box.textContent=t('rv_noscan'); return; }
  if(!_rvJob._scanUrl) _rvJob._scanUrl=await docUrl(j.image_path);
  const url=_rvJob._scanUrl;
  if(!url){ box.textContent=t('rv_noscan'); return; }
  box.innerHTML=/\.pdf$/i.test(j.image_path)
    ? `<iframe src="${url}#navpanes=0" title="scan"></iframe>`
    : `<img src="${url}" alt="scan">`;
  const pk=j.fields&&j.fields.photo;
  if(pk){ const fu=await faceUrl(pk); if(fu)box.insertAdjacentHTML('beforeend',
    `<img class="rvw-face" src="${fu}" alt="${t('rv_face')}" title="${t('rv_face')}">`); }
}
function openIkReview(id){
  const jk=IK.find(x=>x.id===id); if(!jk||!jk.job)return;
  _rvJob=jk; _rvJob._scanUrl=null; _rvShowAll=false;
  ikBuildReview();
  $('#ikreview').classList.add('on'); document.body.style.overflow='hidden';
}
function closeIkReview(){ $('#ikreview').classList.remove('on'); document.body.style.overflow='';
  if(_rvJob)_rvJob._scanUrl=null; _rvJob=null; }
async function ikDoAdd(forcePid){
  const fpid=(typeof forcePid==='string')?forcePid:undefined;   // guard: onclick may pass an event
  const jk=_rvJob, j=jk.job, f={...(j.fields||{})};
  document.querySelectorAll('#rvw-fields input').forEach(inp=>{ f[inp.dataset.k]=inp.value.trim(); });
  // MANDATORY: a field this document REQUIRES cannot be committed empty — the reviewer opened
  // this because it was missing/unsure, so a hand-typed value is required before continuing.
  const _need=(jk._req||REQ_BY_TYPE[j.doc_type]||[]).filter(k=>!String(f[k]||'').trim());
  if(_need.length){ toast(t('rv_need')+' '+_need.map(fieldLabel).join('، ')); return; }
  // logical date check — refuse an impossible ordering with a clear reason, before any write
  const derr=validateDates(f); if(derr){ toast(derr); return; }
  // The reviewer's eye is the gate — never hard-block on an empty flagged field (a visa grant
  // letter has no visa number; its expiry is estimated). ikCommitJob is the real floor: it
  // commits when it can, and DEFERS with a clear reason only when it truly can't anchor.
  const btn=$('#rvw-add'); if(btn){btn.disabled=true;btn.textContent=t('rv_adding');}
  try{
    const r=await ikCommitSerial(j,f,fpid);
    if(r.defer){ toast(t('rv_defer')); const b=$('#rvw-add'); if(b){b.disabled=false;b.textContent=t('rv_add');} return; }
    const _kidJid=(jk._kid&&jk.job)?jk.job.job_id:null;     // capture BEFORE jk.job is cleared
    if(jk._istRow){ Object.assign(jk._istRow,{name:f.name_latin||'', nationality:f.nationality||'', passport_no:f.passport_no||'', passport_expiry:f.passport_expiry||'', _status:'landed', _job:null}); if(typeof istRenderRows==='function')istRenderRows(); }  // corrected data → back into the استمارة row
    jk.state='landed'; jk.job=null; if(jk.hash)delete _ikPending[jk.hash];
    toast(t('rv_added')+(r.pid||'')); closeIkReview(); ikRender();
    if(_kidJid){                                            // a packet child was reviewed → flip it to ✓ NOW + re-confirm from DB
      for(const fam of IK){ if(fam.state==='split'&&fam.kids){ const kk=fam.kids.find(k=>k.job_id===_kidJid);
        if(kk){ kk.status='done'; fam.kidsSettled=false; } } }   // optimistic tick + un-stick the family so it re-queries
      ikRender(); ikRefreshFamilies();
    }
    search($('#q')?$('#q').value:'');                       // reflect the new employee at once (Realtime also fires)
  }catch(e){ toast(t('rv_addfail')+((e&&e.message)||e)); if(btn){btn.disabled=false;btn.textContent=t('rv_add');} }
}

/* ══ LEGAL BATCH — build & commit one منح/تعهد/استمارة set (the first LIST document) ══
   Identity = the منح NUMBER, HUMAN-typed (never OCR'd — the one thing that must be perfect).
   The roster anchors to people BY PASSPORT: a passport not yet on file parks as an orphan
   member (person_id NULL) and connects the moment that passport is scanned (legal_link_person,
   also fired from ikCommitJob). The stamp checkboxes are the trust gate carried on each row. */
const PP_RE=/\b([A-Z]{1,2}\d{6,9})\b/;              // passport token: 1–2 letters + 6–9 digits
function parseRoster(text){
  const out=[];
  String(text||'').split(/\r?\n/).forEach(line=>{
    const s=line.trim(); if(!s)return;
    const pm=s.match(PP_RE); const passport=pm?pm[1]:'';
    let rest=passport?s.replace(passport,' '):s;
    const sm=rest.match(/^\s*(\d{1,4})\b/); const serial=sm?+sm[1]:null;
    if(sm)rest=rest.slice(rest.indexOf(sm[1])+sm[1].length);
    const name=rest.replace(/[·|,\t]+/g,' ').replace(/\s+/g,' ').trim();
    if(!passport&&!name)return;                     // a blank / junk line
    out.push({serial,passport,name});
  });
  return out;
}
async function legalOpen(){
  const chk=(id,lab)=>`<label class="lg-chk"><input type="checkbox" id="${id}"><span>${esc(lab)}</span></label>`;
  $('#legalform').innerHTML=`
    <div class="rvw-bar"><button class="icon ik-close" id="lg-close" title="${t('t_close')}">✕</button>
      <span class="rvw-t">⚖ ${t('lg_h')}</span><span style="flex:1"></span></div>
    <div class="lg-body">
      <p class="lg-sub">${t('lg_sub')}</p>
      <div class="lg-grid">
        <label class="lg-f lg-wide"><span>${t('lg_id')}</span>
          <input id="lg-id" inputmode="numeric" placeholder="${esc(t('lg_id_ph'))}"></label>
        <label class="lg-f"><span>${t('lg_date')}</span><input id="lg-date" type="date"></label>
        <label class="lg-f"><span>${t('lg_from')} / ${t('lg_to')}</span>
          <span style="display:flex;gap:8px"><input id="lg-from" type="number" min="1" placeholder="1">
          <input id="lg-to" type="number" min="1" placeholder="35"></span></label>
      </div>
      <div class="lg-stamps"><div class="lg-sh">${t('lg_stamps')}</div>
        ${chk('lg-s-taahud',t('lg_st_taahud'))}${chk('lg-s-istco',t('lg_st_ist_co'))}
        ${chk('lg-s-istmo',t('lg_st_ist_mo'))}${chk('lg-s-manh',t('lg_st_manh'))}</div>
      <label class="lg-f lg-wide"><span>${t('lg_roster')} <em id="lg-count" class="lg-count"></em></span>
        <textarea id="lg-roster" rows="8" spellcheck="false" placeholder="${esc(t('lg_roster_ph'))}"></textarea></label>
    </div>
    <div class="rvw-foot"><button class="rvw-add" id="lg-commit">${t('lg_commit')}</button></div>`;
  $('#lg-close').onclick=legalClose;
  $('#lg-commit').onclick=legalCommit;
  const ta=$('#lg-roster'), cnt=$('#lg-count');
  const upd=()=>{const n=parseRoster(ta.value).length; cnt.textContent=n?t('lg_parsed',n):'';};
  ta.addEventListener('input',upd); upd();
  $('#legalform').classList.add('on'); document.body.style.overflow='hidden';
}
function legalClose(){ $('#legalform').classList.remove('on'); document.body.style.overflow=''; }

/* ═══ استمارة BUILDER (S1+S2) — a WYSIWYG A4 government-form workspace. The page IS the editor:
   header fields land live into the draft, the photo embeds. The table is fed by the OCR line (S3),
   and export (PDF/Excel/Word) is S4. Nothing here touches the registry / OCR-commit path. ═══ */
let _IST=null;   // the draft: {header:{...}, photo:dataURL|null, rows:[{name,nationality,passport_no,passport_expiry}]}
function istFresh(paper){ return {paper:paper||'istimara',
  header:{company:'',company_nat:'',addr:'',purpose:'',stay:'',visatype:'',authorized:'',project:''},
  photo:null, rows:[], _dirty:false}; }
/* ── the PAPER REGISTRY — one workspace, one entry per legal paper we BUILD ──────────────
   Each paper names its own header fields + table columns; everything else (the OCR feeder,
   the ⤓ fill-down, the review/reject, the draft, the PDF export) is shared. Adding a paper =
   a row here + a Word template on the worker (`worker/templates/<key>.docx`). The EDITOR only
   has to be comfortable — the exported PDF's fidelity comes from that Word template. */
const IST_PAPERS={
  istimara:{ h:'ist_h', title:'ist_title', photo:true, land:true,
    fields:[{k:'company',lab:'ist_company',ph:'ist_company_ph'},{k:'company_nat',lab:'ist_company_nat'},
            {k:'addr',lab:'ist_addr'},{k:'purpose',lab:'ist_purpose'},{k:'stay',lab:'ist_stay'},{k:'visatype',lab:'ist_visatype'}],
    cols:[{k:'_ser',lab:'ist_c_ser'},{k:'name',lab:'ist_c_name'},{k:'nationality',lab:'ist_c_nat'},
          {k:'passport_no',lab:'ist_c_pass'},{k:'passport_expiry',lab:'ist_c_exp'},
          {k:'addr_iraq',lab:'ist_c_addr',hand:1},{k:'border',lab:'ist_c_border',hand:1},{k:'profession',lab:'ist_c_prof',hand:1},
          {k:'res_country',lab:'ist_c_country',hand:1},{k:'visited',lab:'ist_c_visited',hand:1}] },
  // تعهد — the WHOLE form is STATIC (letterhead logo, the «الى…»/«م/ تعهد» heads, the «نحن…»
  // sentence, the undertaking body, the manager signature). ONLY THE TABLE IS BUILT.
  // Its wording is the DEFAULT and stays CHANGEABLE — `texts` are editable lines (copper = editable,
  // our standing affordance) pre-filled with the original sentences; only the logo, «م/ تعهد» and the
  // manager signature are truly fixed. Empty → the worker restores the original wording.
  taahud:{ h:'taa_h', title:'taa_title', photo:false, land:false, logo:'assets/taahud-logo.jpg',
    fields:[], texts:[{k:'to_line',d:'taa_to',cls:'to'},{k:'intro',d:'taa_intro'},{k:'body',d:'taa_body'}],
    cols:[{k:'_ser',lab:'taa_c_ser'},{k:'name',lab:'ist_c_name'},{k:'passport_no',lab:'ist_c_pass'}] },
};
function istPaper(){ return IST_PAPERS[(_IST&&_IST.paper)||'istimara']||IST_PAPERS.istimara; }
function istimaraOpen(paper){
  if(!_IST) _IST=istLoadDraft(paper)||istFresh(paper);   // restore a saved draft so the user sees his work again
  if(paper && _IST.paper!==paper) _IST=istFresh(paper);  // switching paper → a fresh sheet of that kind
  const P=istPaper(), H=_IST.header;
  const frow=f=>`<div class="ist-frow"><span class="ist-lbl">${t(f.lab)}:</span>`
    +`<input class="ist-in" data-h="${f.k}" value="${esc(H[f.k]||'')}" placeholder="${f.ph?esc(t(f.ph)):''}"></div>`;
  // an EDITABLE text line of the form: the paper's original wording is the DEFAULT, and the copper
  // affordance (our "you can type here" convention) says out loud that it can be changed.
  const txt=i=>{ const x=(P.texts||[])[i]; if(!x) return '';
    const v = (H[x.k]!=null && H[x.k]!=='') ? H[x.k] : t(x.d);
    return `<div class="ist-tx${x.cls?' '+x.cls:''}" contenteditable="plaintext-only" data-h="${x.k}"
      title="${esc(t('taa_editable'))}">${esc(v)}</div>`; };
  const photoBox = P.photo ? `<div class="ist-photo${_IST.photo?' has-img':''}" id="ist-photo">
          ${_IST.photo?`<img src="${_IST.photo}" alt=""><button class="ist-ph-x" id="ist-ph-x" title="${t('t_close')}">✕</button>`
                       :`<span class="ist-ph-hint">${t('ist_photo')}<br>＋</span>`}
        </div>` : '';
  // the استمارة carries its undertaking + a 2-name signature block; the تعهد's body text and
  // signature are STATIC in the Word template, so the editor shows the manager block only.
  // the تعهد's body text sits ABOVE its table (a static line, see P.statics) → nothing after the table
  const undertaking = _IST.paper==='taahud' ? ''
    : `<div class="ist-undertaking">${t('ist_undertaking_pre')} <input class="ist-in ist-in-name" data-h="authorized" value="${esc(H.authorized||'')}"> ${t('ist_undertaking_post')}</div>`;
  const authSig = _IST.paper==='taahud' ? '' :
    `<div class="ist-sig"><div class="ist-sig-lbl">${t('ist_sig_auth')}</div>
            <input class="ist-in ist-in-name ist-sig-name" data-h="authorized" value="${esc(H.authorized||'')}"></div>`;
  const heads=P.cols.map(c=>`<th${c.hand?' class="ist-hcol"':''}>${t(c.lab)}</th>`).join('');
  const cgroup=P.cols.map(c=>`<col class="c-${c.k}">`).join('');
  $('#istimara').innerHTML=`
    <div class="ist-wrap">
      <div class="ist-bar">
        <button class="icon" id="ist-close" title="${t('t_close')}">✕</button>
        <span class="ist-t">📄 ${t(P.h)}</span><span class="spacer"></span>
        <button class="ist-exp" id="ist-export" title="${esc(t('ist_export_tip'))}">🖨 ${t('ist_export')}</button>
      </div>
      <div class="ist-stage"><div class="ist-page${P.land?'':' portrait'}" id="ist-page">
        <div class="ist-body">
        ${photoBox}
        ${P.logo?`<img class="ist-logo" src="${P.logo}" alt="">`:''}
        ${txt(0)}
        <div class="ist-title">${t(P.title)}</div>
        ${P.fields.length?`<div class="ist-fields">${P.fields.map(frow).join('')}</div>`:''}
        ${(P.texts||[]).slice(1).map((x,i)=>txt(i+1)).join('')}
        <table class="ist-table ${_IST.paper}">
          <colgroup>${cgroup}</colgroup>
          <thead><tr>${heads}</tr></thead>
          <tbody id="ist-tbody"></tbody>
        </table>
        ${undertaking}
        </div><!-- /ist-body : content grows to push the signature footer to the page bottom -->
        <div class="ist-foot">
          <div class="ist-sig">${_IST.paper==='taahud'?'':`<div class="ist-sig-lbl">${t('ist_sig_mgr')}</div>`}
            <div class="ist-sig-sub">${t('ist_sig_mgr_title')}</div>
            <div class="ist-sig-sub ist-sig-name-static">${t(_IST.paper==='taahud'?'taa_mgr_name':'ist_mgr_name')}</div>
            <div class="ist-sig-sub">${t('ist_mgr_role')}</div></div>
          ${authSig}
        </div>
      </div></div>
    </div>`;
  istRenderRows();
  $('#istimara').querySelectorAll('.ist-in[data-h]').forEach(inp=>inp.addEventListener('input',()=>{
    const k=inp.dataset.h; _IST.header[k]=inp.value; _IST._dirty=true;
    $('#istimara').querySelectorAll('.ist-in[data-h="'+k+'"]').forEach(o=>{ if(o!==inp) o.value=inp.value; });  // sync twins (المخول shows in the undertaking AND the footer)
  }));
  // the editable TEXT lines (the تعهد's sentences) — typed text lands in the draft like any field
  $('#istimara').querySelectorAll('.ist-tx[data-h]').forEach(el=>el.addEventListener('input',()=>{
    _IST.header[el.dataset.h]=el.textContent; _IST._dirty=true; }));
  $('#ist-close').onclick=istRequestClose;   // guard unsaved work
  { const ex=$('#ist-export'); if(ex) ex.onclick=istExport; }   // S4 — build the PDF on the worker + download
  istWarmWorker();      // wake the renderer NOW, so it is warm by the time Export is pressed
  // HEAL: rows saved while the line was still reading (workspace closed, tab reloaded) catch up now.
  if(istPending().length){ istEnsureWatch(); istReconcile().catch(()=>{}); }
  istWirePhoto();
  $('#istimara').classList.add('on'); document.body.style.overflow='hidden';
}
function istimaraClose(){ $('#istimara').classList.remove('on'); document.body.style.overflow=''; }
/* ── unsaved-work guard: closing with edits asks Save / Discard / Cancel. Save → localStorage draft,
   restored on re-open (see his work again, even before exporting). Discard → wipe it. ── */
const IST_KEY='iccmc_istimara_draft';                       // a draft per paper: <key>_<paper>
function istKey(paper){ return IST_KEY+'_'+(paper||(_IST&&_IST.paper)||'istimara'); }
function istIsDirty(){ return !!(_IST && _IST._dirty); }
function istSaveDraft(){
  try{ const keep=(_IST.rows||[]).filter(r=>r.passport_no||r.name).map(r=>({name:r.name||'',nationality:r.nationality||'',passport_no:r.passport_no||'',passport_expiry:r.passport_expiry||'',
      addr_iraq:r.addr_iraq||'',border:r.border||'',profession:r.profession||'',res_country:r.res_country||'',visited:r.visited||'',
      _status:(r._status==='review'?'review':'landed')}));
    localStorage.setItem(istKey(), JSON.stringify({paper:_IST.paper, header:_IST.header, photo:_IST.photo, rows:keep}));
    _IST._dirty=false; return true; }catch(_){ return false; }
}
function istLoadDraft(paper){ try{ const s=localStorage.getItem(istKey(paper)); if(!s)return null; const d=JSON.parse(s);
  d.rows=d.rows||[]; d.paper=d.paper||paper||'istimara'; d._dirty=false; return d; }catch(_){ return null; } }
function istClearDraft(){ try{ localStorage.removeItem(istKey()); }catch(_){} _IST=null; }
function istRequestClose(){
  if(!istIsDirty()){ istimaraClose(); return; }         // nothing new → just close
  const dlg=document.createElement('div'); dlg.className='ist-dlg-wrap';
  dlg.innerHTML=`<div class="ist-dlg"><div class="ist-dlg-t">${esc(t('ist_close_q'))}</div>
    <div class="ist-dlg-btns"><button class="ist-btn primary" data-a="save">${esc(t('ist_save'))}</button>
      <button class="ist-btn" data-a="discard">${esc(t('ist_discard'))}</button>
      <button class="ist-btn ghost" data-a="cancel">${esc(t('ist_cancel'))}</button></div></div>`;
  $('#istimara').appendChild(dlg);
  const done=()=>dlg.remove();
  dlg.querySelector('[data-a="save"]').onclick=()=>{ if(istSaveDraft()){ done(); istimaraClose(); toast(t('ist_saved')); } else toast(t('ist_read_fail')); };
  dlg.querySelector('[data-a="discard"]').onclick=()=>{ istClearDraft(); done(); istimaraClose(); };
  dlg.querySelector('[data-a="cancel"]').onclick=done;
  dlg.onclick=e=>{ if(e.target===dlg) done(); };        // click backdrop = cancel (safest)
}
function istRenderRows(){
  const tb=$('#ist-tbody'); if(!tb)return;
  const COLS=istPaper().cols, N=COLS.length;               // the columns THIS paper carries
  const dataHtml=_IST.rows.map((r,i)=>{
    if(r._status==='uploading'||r._status==='processing'||r._status==='committing')   // busy → the OCR-line stage text (same as the drop box)
      return `<tr class="ist-row-busy"><td>${i+1}</td><td colspan="${N-1}">${esc(istRowStatusTxt(r))}</td></tr>`;
    if(r._status==='refused')
      return `<tr class="ist-row-err"><td>${i+1}</td><td colspan="${N-2}">${esc(r._err||t('ist_read_fail'))}</td><td><button class="ist-rowx" data-rmrow="${i}" title="${t('ist_remove')}">✕ ${esc(t('ist_remove'))}</button></td></tr>`;
    // a pending-review row: review-and-commit (⚑) OR reject it (✕) — an uncommitted item must be removable
    const badge = r._status==='review'
      ? ` <button class="ist-review" data-istreview="${i}" title="${esc(t('rv_ask'))}">⚑ ${esc(t('ik_review'))}</button><button class="ist-rowx sm" data-rmrow="${i}" title="${esc(t('ist_remove'))}">✕</button>`
      : '';   // clickable → opens the OCR review pane to fix/confirm
    // a HAND-TYPED column (NOT from the OCR line) = an editable cell + a ⤓ fill-down button
    // (copies this cell's value to every row below it, like Excel's fill handle).
    const cell=c=>{
      if(c.hand) return `<td class="ist-hcell"><input class="ist-hin" data-ri="${i}" data-rk="${c.k}" value="${esc(r[c.k]||'')}"><button class="ist-fill" data-fi="${i}" data-fk="${c.k}" tabindex="-1" title="${esc(t('ist_filldown'))}">⤓</button></td>`;
      if(c.k==='_ser')            return `<td>${i+1}</td>`;
      if(c.k==='name')            return `<td>${esc(r.name||'—')}${badge}</td>`;
      if(c.k==='nationality')     return `<td>${esc(r.nationality?tv(r.nationality):'—')}</td>`;
      if(c.k==='passport_expiry') return `<td>${esc(istFmtDate(r.passport_expiry)||'—')}</td>`;
      return `<td>${esc(r[c.k]||'—')}</td>`;
    };
    return `<tr>${COLS.map(cell).join('')}</tr>`;
  }).join('');
  // the add-zone IS the table body — a clickable + droppable box, like the OCR upload box. No separate button.
  const drop = _IST.rows.length
    ? `<tr class="ist-addrow"><td colspan="${N}" id="ist-drop" class="ist-drop slim">＋ ${esc(t('ist_add_pc'))}</td></tr>`
    : `<tr class="ist-addrow"><td colspan="${N}" id="ist-drop" class="ist-drop"><span class="ist-drop-hint">⬆<br>${esc(t('ist_add_pc'))}<br><em>${esc(t('ist_drop_sub'))}</em></span></td></tr>`;
  tb.innerHTML=dataHtml+drop;
  // hand columns: type into a cell (kept live in the row, no re-render → focus stays); ⤓ fills the value DOWN
  tb.querySelectorAll('.ist-hin').forEach(inp=>inp.oninput=()=>{ const r=_IST.rows[+inp.dataset.ri]; if(r){ r[inp.dataset.rk]=inp.value; _IST._dirty=true; } });
  tb.querySelectorAll('.ist-fill').forEach(b=>b.onclick=()=>{ const i=+b.dataset.fi, k=b.dataset.fk, r0=_IST.rows[i]; if(!r0)return;
    const v=r0[k]||''; for(let j=i+1;j<_IST.rows.length;j++){ if(_IST.rows[j]) _IST.rows[j][k]=v; }   // carry this value to every row below
    _IST._dirty=true; istRenderRows(); });
  // remove an UNCOMMITTED row (refused / pending-review): also clear its worker scan_jobs row so nothing
  // lingers in the review queue — no leaks. (The storage blob is swept by the janitor, sweep_orphan_files,
  // which is hash-protected so it never deletes a committed document's shared scan.) A committed/landed row
  // is never removed here — it has no _hash left to purge and keeps its registry record.
  tb.querySelectorAll('[data-rmrow]').forEach(b=>b.onclick=async()=>{
    const i=+b.dataset.rmrow, row=_IST.rows[i]; if(!row)return; b.disabled=true;
    if(row._hash && sb && row._status!=='landed'){
      try{ await sb.from('scan_jobs').delete().eq('image_hash',row._hash).not('status','in','(done,committed)'); }
      catch(_){ /* best-effort; the janitor still reconciles the queue */ }
    }
    _IST.rows.splice(i,1); _IST._dirty=true; istRenderRows();
  });
  tb.querySelectorAll('[data-istreview]').forEach(b=>b.onclick=()=>istOpenReview(+b.dataset.istreview));   // ⚑ → open the OCR review pane
  const dz=$('#ist-drop'); if(dz){
    dz.onclick=istPickFiles;
    dz.ondragover=e=>{ e.preventDefault(); dz.classList.add('over'); };
    dz.ondragleave=()=>dz.classList.remove('over');
    dz.ondrop=e=>{ e.preventDefault(); dz.classList.remove('over'); if(e.dataTransfer&&e.dataTransfer.files.length) istAddFromPC(e.dataTransfer.files); };
  }
}
function istPickFiles(){ const inp=document.createElement('input'); inp.type='file'; inp.multiple=true; inp.accept='image/*,application/pdf';
  inp.onchange=()=>{ if(inp.files&&inp.files.length) istAddFromPC(inp.files); }; inp.click(); }
// ⚑ مراجعة → open the SAME OCR review pane on this scan (see the passport, fix the number, confirm). On commit,
// ikDoAdd writes the corrected data back into this استمارة row (via _rvJob._istRow) and flips it to done.
function istOpenReview(i){
  const row=_IST.rows[i]; if(!row||!row._job){ toast(t('ist_read_fail')); return; }
  // FULL review, exactly like the regular OCR line: fill ALL the important passport data (place of birth, dob, sex, …)
  // so the registry record is complete — even the fields the استمارة table doesn't show. (No _fields/_req override.)
  _rvJob={ id:'ist-'+i, job:row._job, file:row._file||{name:(row.name||row.passport_no||'passport')}, _scanUrl:null, _istRow:row }; _rvShowAll=false;
  ikBuildReview(); $('#ikreview').classList.add('on'); document.body.style.overflow='hidden';
}
// the استمارة date format: day/month/year, zero-padded (dd/mm/yyyy). Handles ISO (yyyy-mm-dd) or an
// already d/m/y value; anything else is shown as-is (never guessed).
function istFmtDate(s){
  s=String(s||'').trim(); if(!s) return '';
  let d,m,y, iso=s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if(iso){ y=iso[1]; m=iso[2]; d=iso[3]; }
  else{ const p=s.split(/[-/.]/); if(p.length!==3||!/^\d{1,2}$/.test(p[0])) return s; d=p[0]; m=p[1]; y=p[2]; }
  if(!(+d&&+m&&y)) return s;
  const pad=x=>String(+x).padStart(2,'0');
  return `${pad(d)}/${pad(m)}/${y.length===2?'20'+y:y}`;
}
// the SAME status texting the OCR drop box uses (ikStageTxt / ik_* keys)
function istRowStatusTxt(r){
  if(r._status==='uploading')  return (r._pct||0)+'%';
  if(r._status==='committing') return t('ik_processing');
  if(r._status==='processing') return r._stage?ikStageTxt(r._stage):t('ik_processing');
  return '';
}
/* S3 — the PC feeder (the heart): a SECOND DOOR to the OCR line. Each passport goes through the exact same
   pipeline — uploaded → worker reads it → the fields fill a row → and it's COMMITTED to the registry via the
   intake's own commit (ikCommitSerial). If the scan needs a human (defer / pending-review) the row PENDS for
   review (⚑), same as the drop box; the person is finalised when it's reviewed in the OCR board. */
// Accept EXACTLY what the OCR drop box accepts — a passport the line would read must never be turned
// away here. A file outside those limits still gets a ROW with the reason (it used to vanish silently).
function istAddFromPC(files){
  const all=Array.from(files), queue=[]; if(all.length) _IST._dirty=true;
  for(const file of all){
    const okType=IK_OK.test(file.type)||/\.pdf$/i.test(file.name), okSize=file.size<=IK_MAX;
    const row={name:'',nationality:'',passport_no:'',passport_expiry:'',_status:'uploading',_pct:0,_stage:'',_err:''};
    _IST.rows.push(row);
    if(!okType||!okSize){ row._status='refused'; row._err=okSize?t('ik_bad'):t('ik_big'); istRenderRows(); continue; }
    queue.push([file,row]);
  }
  istRenderRows();
  istDrainUploads(queue);
}
// Upload a few at a time, not all at once. Firing 20 simultaneous uploads only floods storage and
// the worker's webhook — the queue behind them is the same length either way, and a steadier stream
// is far less likely to have its webhooks dropped. (The watchdog covers any that still are.)
let _istUp=0;
async function istDrainUploads(queue){
  while(queue.length){
    while(_istUp>=4) await new Promise(r=>setTimeout(r,250));
    const [file,row]=queue.shift(); _istUp++;
    istIngest(file,row)
      .catch(e=>{ row._status='refused'; row._err=(e&&e.message)||t('ist_read_fail'); istRenderRows(); })
      .finally(()=>{ _istUp--; });
  }
}
async function istIngest(file,row){
  const hash=await sha256(file); if(!hash) throw new Error('hash'); row._hash=hash; row._file=file;   // keep the file so the review header can name it
  const {data:{session}}=await sb.auth.getSession(); if(!session) throw new Error(t('ik_auth'));
  const safe=file.name.replace(/[^\w.\-]+/g,'_');
  const path=`${Date.now().toString(36)}-ist-${safe}`;   // plain passport name (NO istimara-/taahud- marker — that would make the worker treat it as a legal FORM)
  await new Promise((res,rej)=>{ const xhr=new XMLHttpRequest();
    xhr.open('POST',`${SUPA_URL}/storage/v1/object/${IK_BUCKET}/${encodeURIComponent(path)}`);
    xhr.setRequestHeader('apikey',SUPA_KEY); xhr.setRequestHeader('Authorization',`Bearer ${session.access_token}`);
    xhr.setRequestHeader('x-upsert','true'); if(file.type)xhr.setRequestHeader('Content-Type',file.type);
    xhr.upload.onprogress=e=>{ if(e.lengthComputable){ row._pct=Math.round(e.loaded/e.total*100); istRenderRows(); } };
    xhr.onload=()=>(xhr.status>=200&&xhr.status<300)?res():rej(new Error('HTTP '+xhr.status));
    xhr.onerror=()=>rej(new Error('network')); xhr.send(file); });
  row._status='processing'; row._stage=''; istRenderRows();
  istEnsureWatch();          // hand this row to the ONE shared reconciler (see below)
}
/* ── ONE reconciler for the whole table (the drop box's design) ─────────────────────────────────
   Pumping 20 passports used to mean 20 independent pollers, each hitting the database every couple
   of seconds — a thundering herd for exactly the case that is already slow. Now a SINGLE timer asks
   once for ALL pending hashes and hands each answer to its row. It also runs on OPEN, so rows saved
   in a draft heal themselves even if the workspace was closed while the line was still reading. */
let _istWatch=null;
function istPending(){ return ((_IST&&_IST.rows)||[]).filter(r=>r._hash && r._status==='processing'); }
function istEnsureWatch(){
  if(_istWatch) return;
  const t0=Date.now();
  _istWatch=setInterval(async ()=>{
    if(!_IST || !istPending().length){ clearInterval(_istWatch); _istWatch=null; return; }
    if(document.hidden) return;                                   // idle while the tab is away
    const waited=Date.now()-t0;
    if(waited>180000 && (waited/2500)%3>=1) return;                // ease off on a long queue
    try{ await istReconcile(); }catch(_){}
  }, 2500);
}
async function istReconcile(){
  const pend=istPending(); if(!pend.length) return;
  const hashes=[...new Set(pend.map(r=>r._hash))];
  let jobs=[];
  try{ const {data}=await sb.from('scan_jobs')
        .select('job_id,status,fields,doc_type,image_path,field_conf,flagged,error_msg,image_hash')
        .in('image_hash',hashes).order('created_at',{ascending:false}); jobs=data||[]; }catch(_){ return; }
  const byHash={}; for(const j of jobs) if(!byHash[j.image_hash]) byHash[j.image_hash]=j;   // newest per hash
  let dirty=false;
  for(const row of pend){
    const j=byHash[row._hash]; if(!j) continue;
    if(await istApply(row,j)) dirty=true;
  }
  if(dirty) istRenderRows();
}
// Decide what ONE row's job means. Returns true if the row changed. (Same rules as before — this is
// only a move from a per-file loop to the shared pass.)
async function istApply(row,j){
  if(row._stage!==j.status){ row._stage=j.status; }
  if(j.status==='failed'){ row._status='refused'; row._err=j.error_msg||t('ist_read_fail'); return true; }
  // this door is for PASSPORTS ONLY. If the OCR line read the file as a LEGAL paper (تعهد/منح/استمارة),
  // refuse it clearly instead of waiting for a passport number that will never come — and BEFORE the
  // name check below, so a legal roster's names never slip into a passport commit. (The paper is still
  // captured by the legal pipeline; it simply doesn't belong in this table — handle it in المعاملات.)
  if(j.status==='legal-review' || String(j.doc_type||'').startsWith('legal')){
    row._status='refused'; row._err=t('ist_not_passport'); row._job=j;   // keep the job so ✕ can purge it (no leak)
    return true;
  }
  const f=j.fields||{};
  if(f.passport_no||f.name_latin){
    Object.assign(row,{name:f.name_latin||'', nationality:f.nationality||'', passport_no:f.passport_no||'', passport_expiry:f.passport_expiry||''});
    if(j.status==='pending-review'||j.status==='needs-linking'){ row._status='review'; row._job=j; return true; }   // worker parked it → pend for review
    if(row._committing) return true;                           // a commit is already in flight for this row
    row._committing=true; row._status='committing'; istRenderRows();
    try{ const res=await ikCommitSerial(j,{...f});              // register in the registry — the same commit the drop box uses
         if(res&&res.defer){ row._status='review'; row._job=j; } else row._status='landed'; }   // defer = needs a human → pend, keep the job so ⚑ opens the review
    catch(_){ row._status='landed'; }                          // the data still shows; a later intake sweep retries the commit
    row._committing=false;
    return true;
  }
  return true;      // still reading — the stage text moved, so repaint
}
/* S4 — export the استمارة to PDF. The `.ist-page` on screen is ALREADY the pixel-faithful A4 form
   (Arial bold, 14pt title, 58mm label column, black table borders — matched to the official Word doc),
   so we print IT directly (WYSIWYG) rather than rebuilding a static mirror that could drift. A
   `body.ist-print` class flips the print CSS: show the form, strip every screen-only cue (the copper
   underlines, the upload drop-zone, the ⚑ review badges, the empty photo hint) and lay it on a LANDSCAPE
   A4 page. The user prints → then physically stamps + signs → scans → submits. */
// Export = download a real PDF FILE (not the browser print dialog, which stamps its own date/title/URL
// header). We snapshot the live .ist-page (already a pixel-faithful landscape A4, footer at the bottom)
// with html2canvas, strip the screen-only cues on the CLONE (onclone — the live form is untouched), and
// place the image on a landscape A4 via jsPDF (slicing onto more pages if a long roster overflows). The
// user then opens/prints the downloaded file himself.
// Export = a clean PDF that IS the real government form. The web page here is only the EDITOR;
// on export we send its data to the worker, which fills the ORIGINAL استمارة Word file (docxtpl —
// every font/border/margin kept) and renders it to PDF with LibreOffice, then we download it.
// Flow: insert an istimara_renders row → a DB trigger wakes the worker → poll the row → download.
/* The renderer is a SCALE-TO-ZERO worker: it sleeps (costing nothing) until something wakes it, and
   that cold start — not the rendering — is most of the wait on the first export. So we WAKE IT EARLY:
   opening the workspace pings its health endpoint, and it boots while the user is still filling the
   form. By the time Export is pressed it is usually already warm. Cheap (the same instance the export
   would have started anyway), and never blocks the UI. */
const IST_WORKER='https://iccmc-ocr-597451901566.europe-west1.run.app/';
let _istWarmed=0;
function istWarmWorker(){
  if(Date.now()-_istWarmed < 240000) return;          // already warmed recently — the instance lives ~a few min
  _istWarmed=Date.now();
  try{ fetch(IST_WORKER,{mode:'no-cors',cache:'no-store'}).catch(()=>{}); }catch(_){}
}
async function istExport(){
  if(!_IST || !(_IST.rows||[]).some(r=>r.passport_no||r.name)){ toast(t('ist_export_empty')); return; }
  if(!sb){ toast(t('ist_pdf_fail')); return; }
  const btn=document.getElementById('ist-export'), old=btn?btn.innerHTML:'';
  // a real spinner + a staged, honest message — a silent 20s button looks broken
  const ov=document.createElement('div'); ov.className='ist-wait';
  ov.innerHTML=`<div class="ist-wait-box"><div class="ist-spin"></div>
    <div class="ist-wait-t">${esc(t('ist_pdf_working'))}</div>
    <div class="ist-wait-s" id="ist-wait-s">${esc(t('ist_pdf_step1'))}</div></div>`;
  $('#istimara').appendChild(ov);
  const step=k=>{ const e=document.getElementById('ist-wait-s'); if(e)e.textContent=t(k); };
  if(btn){ btn.disabled=true; btn.innerHTML=`<span class="ist-spin sm"></span> ${t('ist_export')}`; }
  try{
    const H=_IST.header;
    const data={ paper:_IST.paper||'istimara',                              // picks the Word template on the worker
      company:H.company||'', company_nat:H.company_nat||'', addr:H.addr||'', purpose:H.purpose||'',
      stay:H.stay||'', visatype:H.visatype||'', authorized:H.authorized||'', project:H.project||'',
      to_line:H.to_line||'', intro:H.intro||'', body:H.body||'',   // تعهد's editable sentences (empty → worker restores the original)
      photo:_IST.photo||'',   // user's photo → replaces the template default
      rows:(_IST.rows||[]).filter(r=>r.passport_no||r.name).map(r=>({    // the DISPLAY values, exactly as the table shows
        name:r.name||'', nationality:r.nationality?tv(r.nationality):'', passport_no:r.passport_no||'',
        passport_expiry:istFmtDate(r.passport_expiry)||'', addr_iraq:r.addr_iraq||'', border:r.border||'',
        profession:r.profession||'', res_country:r.res_country||'', visited:r.visited||'' })) };
    const {data:ins,error:ie}=await sb.from('istimara_renders').insert({data}).select('id').single();
    if(ie||!ins) throw new Error((ie&&ie.message)||'insert');
    const id=ins.id;
    step('ist_pdf_step2');
    let row=null;                                        // poll: tight at first (a WARM worker answers in ~3-6s)
    for(let i=0;i<70;i++){
      await new Promise(r=>setTimeout(r,i<12?600:1500));
      const {data:r2}=await sb.from('istimara_renders').select('status,pdf_path,error').eq('id',id).single();
      if(r2){ row=r2; if(row.status==='done'&&row.pdf_path) break; if(row.status==='error') throw new Error(row.error||'render'); }
      if(i===8) step('ist_pdf_step3');                   // still going → say why (the worker is waking up)
    }
    if(!(row&&row.status==='done'&&row.pdf_path)) throw new Error('timeout');
    step('ist_pdf_step4');
    const {data:sig,error:se}=await sb.storage.from('documents').createSignedUrl(row.pdf_path,120);
    if(se||!sig) throw new Error('sign');
    const resp=await fetch(sig.signedUrl); const blob=await resp.blob();   // download the finished file
    const url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=(_IST.paper==='taahud'?'تعهد':'استمارة')+'.pdf'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),4000);
    toast(t('ist_pdf_done'));
  }catch(e){ console.warn('istExport',e); toast(t('ist_pdf_fail')); }
  finally{ ov.remove(); if(btn){ btn.disabled=false; btn.innerHTML=old; } }
}
function istWirePhoto(){
  const box=$('#ist-photo'); if(!box)return;
  const x=$('#ist-ph-x'); if(x) x.onclick=e=>{ e.stopPropagation(); _IST.photo=null; _IST._dirty=true; istimaraOpen(); };  // remove → rebuild
  box.onclick=()=>{ const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
    inp.onchange=()=>{ const f=inp.files&&inp.files[0]; if(!f)return;
      const rd=new FileReader(); rd.onload=()=>{ _IST.photo=rd.result; _IST._dirty=true; istimaraOpen(); }; rd.readAsDataURL(f); };
    inp.click(); };
}
/* ONE commit path — used by BOTH the manual composer AND the OCR assembler. Writes the clean,
   self-navigable model: legal_batches (identity+stamps+scan pointers) + legal_batch_members (roster
   anchored to persons by passport) + MOVES each scan into legal/<batch_id>/<type> so Storage is
   browsable by batch id + marks the source legal_papers committed. DB and Storage stay reachable
   both ways; the UI is just a view. Returns {ok,linked,total}. */
const LEGAL_DIR='legal';
async function commitLegalBatch(d){
  const id=String(d.batch_id||'').trim(); if(!id)throw new Error(t('lg_need_id'));
  const rows=(d.rows||[]).filter(r=>r&&(r.passport||r.name));
  // move each scan into the batch folder → storage becomes browsable as legal/<id>/<type>
  const scans=d.scans||{}, scanPtr={};
  for(const type of ['taahud','istimara','manh']){
    const path=scans[type]; if(!path){ scanPtr[type]=d[type+'_scan']||null; continue; }
    const ext=(String(path).match(/\.[a-z0-9]+$/i)||['.pdf'])[0].toLowerCase();
    const dest=`${LEGAL_DIR}/${id}/${type}${ext}`;
    if(path===dest){ scanPtr[type]=dest; continue; }
    try{ const {error}=await sb.storage.from('documents').move(path,dest); scanPtr[type]=error?path:dest; }
    catch(_){ scanPtr[type]=path; }                       // move failed → keep old path (still reachable)
  }
  const rowAt=n=>rows.find(r=>r.serial===n);
  let iFrom=d.interval_from??null, iTo=d.interval_to??null;
  if(iFrom!=null&&iTo!=null&&iFrom>iTo){const s=iFrom;iFrom=iTo;iTo=s;}
  const batch={ batch_id:id, manh_date:d.manh_date||null, interval_from:iFrom, interval_to:iTo,
    first_passport:d.first_passport||((iFrom!=null&&rowAt(iFrom))?rowAt(iFrom).passport:null)||null,
    last_passport: d.last_passport ||((iTo  !=null&&rowAt(iTo ))?rowAt(iTo ).passport:null)||null,
    member_count:rows.length, first_name:d.first_name||null, last_name:d.last_name||null, status:(d.provisional?'provisional':'active'),
    taahud_scan:scanPtr.taahud, istimara_scan:scanPtr.istimara, manh_scan:scanPtr.manh,
    taahud_stamp:!!(d.stamps&&d.stamps.taahud), istimara_company_stamp:!!(d.stamps&&d.stamps.istco),
    istimara_ministry_stamp:!!(d.stamps&&d.stamps.istmo), manh_stamp:!!(d.stamps&&d.stamps.manh) };
  if(d.rot) batch.rot=d.rot;                          // the review's rotation → cascades to the print
  let up=await sb.from('legal_batches').upsert(batch,{onConflict:'batch_id'});
  if(up.error && batch.rot){ delete batch.rot; up=await sb.from('legal_batches').upsert(batch,{onConflict:'batch_id'}); } // column not added → save without it
  if(up.error)throw up.error;
  // anchor members to persons BY PASSPORT (unmatched → orphan waits; backfills when scanned)
  const pps=[...new Set(rows.map(r=>r.passport).filter(Boolean))], byPp={};
  if(pps.length){ const {data}=await sb.from('persons').select('person_id,passport_no').in('passport_no',pps);
    (data||[]).forEach(p=>{ byPp[p.passport_no]=p.person_id; }); }
  const members=rows.map(r=>({ batch_id:id, serial:r.serial??null, passport_no:r.passport||null,
    name_as_written:r.name||null, person_id:r.passport?(byPp[r.passport]||null):null,
    istimara_expiry:r.expiry||null, profession:r.profession||null, boxes:r.boxes||null }));
  // Authoritative rewrite: the rows we just assembled ARE the batch. Wipe the old member set first so a
  // commit can SHRINK to the truth (old null-serial duplicates, dropped serials) — an upsert alone only
  // ever grows it, because serial=NULL never conflicts on (batch_id,serial). Delete+insert is idempotent.
  if(members.length){
    try{ await sb.from('legal_batch_members').delete().eq('batch_id',id); }catch(_){}
    const {error:me}=await sb.from('legal_batch_members').upsert(members,{onConflict:'batch_id,serial'}); if(me)throw me; }
  // close out the source papers → committed, pointing at this batch (reachable in the pool)
  if(d.paperIds&&d.paperIds.length){
    try{ await sb.from('legal_papers').update({batch_id:id,match_status:'committed'}).in('paper_id',d.paperIds); }catch(_){}
    // …and advance the OCR-line BOARD: the scan_jobs tracking rows for these papers move to 'done' so a
    // committed legal paper flows to the مُودَع column, instead of sitting forever in § legal-review.
    try{ const {data:pp}=await sb.from('legal_papers').select('scan_hash').in('paper_id',d.paperIds);
      const hs=(pp||[]).map(x=>x&&x.scan_hash).filter(Boolean);
      if(hs.length) await sb.from('scan_jobs').update({status:'done'}).in('image_hash',hs); }catch(_){}
  }
  return {ok:1, linked:members.filter(m=>m.person_id).length, total:members.length};
}
async function legalCommit(){
  const id=$('#lg-id').value.trim();
  if(!id){ toast(t('lg_need_id')); return; }
  const rows=parseRoster($('#lg-roster').value);
  if(!rows.length){ toast(t('lg_need_rows')); return; }
  const from=parseInt($('#lg-from').value,10), to=parseInt($('#lg-to').value,10);
  const btn=$('#lg-commit'); btn.disabled=true; btn.textContent=t('lg_saving');
  try{
    const res=await commitLegalBatch({ batch_id:id, manh_date:$('#lg-date').value||null,
      interval_from:isFinite(from)?from:null, interval_to:isFinite(to)?to:null, rows,
      stamps:{taahud:$('#lg-s-taahud').checked,istco:$('#lg-s-istco').checked,
              istmo:$('#lg-s-istmo').checked,manh:$('#lg-s-manh').checked} });
    toast(t('lg_saved')+id+`  ·  ${res.linked}/${res.total}`);
    legalClose(); search($('#q')?$('#q').value:'');
  }catch(e){ toast(t('lg_savefail')+((e&&e.message)||e)); btn.disabled=false; btn.textContent=t('lg_commit'); }
}
/* the employee's LEGAL FILE card in the dossier — his batches + each paper's honest status.
   A paper is PRESENT when its scan OR its confirmed stamp is on file; TRUSTED (green ✓) only
   when the required stamp(s) passed; PRESENT-without-stamp shows ⚑; absent shows a gray –. */
/* ── batch classification: given his CURRENT visa, place each batch — live | past | awaiting | flag ──
   connected+expired → past ; connected+active/expiring → live ; static → judged by منح-vs-current-visa-issue. */
function _daysBetween(aIso,bIso){ return Math.round((new Date(aIso+'T00:00:00') - new Date(bIso+'T00:00:00'))/864e5); }
function _visaRef(v){   // a visa row → {phase, issue}; phase active|expiring|expired, or null
  if(!v) return null;
  const fl=v.visa_valid_floor, ce=v.visa_valid_ceiling;
  let phase=null; if(fl&&ce){ const dF=daysTo(fl), dC=daysTo(ce); phase = dF>0?'active':(dC>=0?'expiring':'expired'); }
  return {phase, issue:v.visa_issue_d||null};
}
function _curVisaRef(){   // HIS current visa (from the open employee's CURRENT_VS)
  const v=(CURRENT_VS||[]).filter(x=>x.is_current!==false)
    .sort((a,b)=>String(b.visa_issue_d||'').localeCompare(String(a.visa_issue_d||'')))[0];
  return _visaRef(v);
}
const BATCH_WINDOW=60;   // منح→visa window with slack (nominal 45, tolerate up to 60)
function _classVsVisa(b,cv){   // classify a STATIC batch against a given current-visa ref
  if(!cv || !cv.phase || cv.phase==='expired' || !cv.issue || !b || !b.manh_date) return 'awaiting';   // no live anchor → wait
  const gap=_daysBetween(cv.issue, b.manh_date);   // issue − منح  (positive = منح before the visa)
  if(gap > BATCH_WINDOW) return 'past';            // منح well older than the current visa's window → past
  if(gap >= 0) return 'flag';                      // sits inside/near the window yet didn't connect → illogical
  return cv.phase==='expiring' ? 'awaiting' : 'flag';   // منح newer than issue: expiring→coming renewal; active→too early→flag
}
function _batchClass(id,b){
  const l=_LBL[id];
  if(l && l.connected) return l.status==='expired' ? 'past' : 'live';   // has its own visa
  return _classVsVisa(b, _curVisaRef());                                // static → judge vs HIS current visa
}
function _batchFlagged(b){   // Review: a static batch that is illogical vs SOME member's ACTIVE visa (uses _LVISA)
  if(!b) return false;
  const l=_LBL[b.batch_id]; if(l && l.connected) return false;          // connected → not a flag
  return (b.members||[]).some(m=>{ if(!m.person_id) return false;
    return _classVsVisa(b, _visaRef(_LVISA[m.person_id]))==='flag'; });
}
function batchMarker(id,b,cls){
  if(cls==='live') return legalStatusChip(id);
  if(cls==='awaiting') return `<span class="lg-await" title="${LANG==='ar'?'لم تصل فيزا تربطه بعد':'no visa has linked it yet'}">${LANG==='ar'?'⏳ بانتظار الفيزا':'⏳ awaiting visa'}</span>`;
  if(cls==='flag') return `<span class="lg-flag2" title="${LANG==='ar'?'غير منطقي — دفعة قرب فيزا سارية؛ راجعها':'illogical — batch sits near a valid visa; review'}">⚑ ${LANG==='ar'?'راجع':'review'}</span>`;
  return '';
}
function legalHistCard(legal){   // PAST presences: a batch classified 'past' (its visa expired, or a static one older than the current visa's window)
  const seen={}, items=[];
  (legal||[]).slice().sort((a,b)=>String((b.batch&&b.batch.manh_date)||'').localeCompare(String((a.batch&&a.batch.manh_date)||''))).forEach(m=>{
    const b=m.batch||{}, id=b.batch_id||m.batch_id, l=_LBL[id];
    if(seen[id] || _batchClass(id,b)!=='past')return; seen[id]=1;
    const expired=!!(l&&l.connected&&l.status==='expired'); items.push({m,b,id,l,expired}); });
  if(!items.length) return '';
  const rows=items.map(({m,b,id,l,expired})=>`<div class="hx-row hx-open" data-lawgo="${esc(id)}" role="button" tabindex="0" style="cursor:pointer" title="${LANG==='ar'?'افتح الدفعة':'open batch'}">
      <span class="hx-tp">⚖ ${esc(id)}</span>
      <span class="hx-no">${esc(t('lg_serial'))} ${esc(m.serial??'—')}</span>
      <span class="hx-dt" dir="ltr">${esc(b.manh_date||'—')}${(expired&&l&&l.batch_expiry)?' → '+esc(l.batch_expiry):''}</span>
      <span class="hx-tag">${expired?(LANG==='ar'?'منتهٍ':'expired'):(LANG==='ar'?'سابقة':'past')}</span></div>`).join('');
  return `<div class="doc hx-card"><div class="doc-h"><span class="doc-t">${LANG==='ar'?'سجل الملف القانوني':'Legal history'}</span><span class="hx-count">${items.length}</span></div>${rows}</div>`;
}
function legalCard(legal){
  if(!legal||!legal.length) return `<div class="doc empty2">${t('lg_none')}</div>`;
  const seen={}, items=[];
  // newest first (by منح date). Each batch is CLASSIFIED vs his current visa: past→history; live/awaiting/flag→here.
  legal.slice().sort((a,b)=>String((b.batch&&b.batch.manh_date)||'').localeCompare(String((a.batch&&a.batch.manh_date)||''))).forEach(m=>{
    const b=m.batch||{}; const id=b.batch_id||m.batch_id; if(seen[id])return;
    const cls=_batchClass(id,b);
    if(cls==='past') return;                    // past → history card
    seen[id]=1; items.push({m,b,cls}); });
  if(!items.length) return '';
  const paper=(present,trusted)=> !present ? `<span class="lg-miss">–</span>`
    : (trusted?`<span class="lg-ok">✓</span>`:`<span class="lg-warn" title="${t('lg_nostamp')}">⚑</span>`);
  const rows=items.map(({m,b,cls})=>`<div class="lg-row">
      <div class="lg-bid" data-lawgo="${esc(b.batch_id||m.batch_id)}" style="cursor:pointer">⚖ ${esc(batchName(b.batch_id?b:{...b,batch_id:m.batch_id}))} ${batchMarker(b.batch_id||m.batch_id,b,cls)}</div>
      <div class="lg-meta">${t('lg_serial')} ${esc(m.serial??'—')}${(b.interval_from!=null&&b.interval_to!=null)?` · ${t('lg_covered')} ${esc(b.interval_from)}–${esc(b.interval_to)}`:''}</div>
      <div class="lg-papers">
        ${ptKeys().map(k=>{ const x=batchPaper(b,k); return `<span>${ptLabel(k)} ${paper(x.present,x.trusted)}</span>`; }).join('')}
      </div></div>`).join('');
  return `<div class="doc"><div class="doc-h"><span class="doc-t">${t('lg_file')}</span></div>${rows}</div>`;
}

/* ══ THE MATCHING BRAIN — assemble papers that arrive one-at-a-time, any order ══════════
   Each paper's identity is a CONTENT-SIGNATURE: {first person, last person, count}. The منح
   prints exactly this ("starts at (1) SAMPLE NAME, ends at (35) ANOTHER NAME"), so a document
   hands us its own fingerprint. Two papers are the SAME batch only when BOTH endpoints agree
   (first AND last) — passport match (globally unique) counts double, name match counts single;
   count/serial-range are tiebreakers. Serials alone are never trusted (each batch restarts at 1).
   These are PURE functions (no DB / no DOM) → unit-tested below; the legal-review assembler (next)
   consumes them. A paper shape: {type:'manh'|'taahud'|'istimara', roster?:[{serial,name,passport}],
   manh_number?, interval_from?, interval_to?, first_name?, last_name?}. */
function legalNameKey(s){                                   // order-independent token set: "SAMPLE NAME" == "NAME SAMPLE"
  return [...new Set(String(s||'').toUpperCase().split(/[^A-Z一-鿿]+/).filter(x=>x.length>1))].sort().join(' '); }
function legalNameEq(a,b){ const A=legalNameKey(a),B=legalNameKey(b); return !!A&&A===B; }
function legalSig(p){
  if(p.type==='manh'){
    const c=(p.interval_from!=null&&p.interval_to!=null)?(p.interval_to-p.interval_from+1):null;
    return {from:p.interval_from,to:p.interval_to,count:c,
      firstName:p.first_name,firstPass:null,lastName:p.last_name,lastPass:null,hasPass:false}; }
  const r=(p.roster||[]).slice().filter(x=>x&&(x.serial!=null||x.passport||x.name))
                        .sort((a,b)=>(a.serial||0)-(b.serial||0));
  const f=r[0]||{}, l=r[r.length-1]||{};
  return {from:f.serial,to:l.serial,count:r.length,
    firstName:f.name,firstPass:f.passport,lastName:l.name,lastPass:l.passport,hasPass:true}; }
/* score how strongly two signatures describe the SAME batch. ends = how many endpoints agree
   (need BOTH = 2 to be confident). score is for ranking/tiebreak only. */
function legalMatch(a,b){
  let s=0,ends=0;
  const pF=a.firstPass&&b.firstPass&&a.firstPass===b.firstPass;
  const pL=a.lastPass &&b.lastPass &&a.lastPass ===b.lastPass;
  if(pF){s+=2;ends++;} else if(legalNameEq(a.firstName,b.firstName)){s+=1;ends++;}
  if(pL){s+=2;ends++;} else if(legalNameEq(a.lastName,b.lastName)){s+=1;ends++;}
  if(a.count!=null&&b.count!=null&&a.count===b.count)s+=1;
  if(a.from!=null&&b.from!=null&&a.from===b.from&&a.to===b.to)s+=0.5;
  return {score:s,ends}; }
const LEGAL_CONFIDENT=2;                                    // both endpoints must agree
const LEGAL_OVERLAP=0.6;                                    // OR ≥60% of the smaller passport set shared
/* passport-set overlap — the robust signal when endpoints OCR poorly (the messy استمارة). Two roster
   papers describing the same 35 people share almost all passports even if a couple of rows are garbled. */
function legalPassports(p){ return new Set((p.roster||[]).map(r=>r&&r.passport).filter(Boolean)); }
function legalOverlap(a,b){
  const A=legalPassports(a), B=legalPassports(b); if(!A.size||!B.size)return 0;
  let s=0; for(const x of A) if(B.has(x)) s++; return s/Math.min(A.size,B.size); }
/* assemble a pile of papers into proposed batches. Returns:
   { batches:[{manh?, papers:[...], memberSource?}], ambiguous:[{paper,candidates}], pending:[] }.
   A منح anchors a batch (it owns the number). A roster attaches by (1) both endpoints agreeing with the
   منح, else (2) strong passport-overlap with a roster already in the batch — so the messy استمارة still
   lands even when its own endpoints didn't read. >1 confident منح → ambiguous (human picks). Leftovers
   with no منح → provisional pairing (تعهد+استمارة) by endpoints OR overlap. Order-independent. */
function legalAssemble(papers){
  const S=papers.map(p=>({p,sig:legalSig(p)}));
  const manhs=S.filter(x=>x.p.type==='manh');
  const rosters=S.filter(x=>x.p.type!=='manh');
  const batches=manhs.map(m=>({manh:m.p,manhSig:m.sig,papers:[m.p]}));
  const ambiguous=[], attached=new Set();
  // pass 1 — endpoint match to a منح (it carries the endpoint NAMES)
  rosters.forEach(r=>{
    const hits=batches.map(b=>({b,mm:legalMatch(b.manhSig,r.sig)})).filter(x=>x.mm.ends>=LEGAL_CONFIDENT);
    if(hits.length===1){ hits[0].b.papers.push(r.p); hits[0].b.memberSource=hits[0].b.memberSource||r.p; attached.add(r); }
    else if(hits.length>1){ ambiguous.push({paper:r.p,candidates:hits.map(h=>h.b.manh.manh_number)}); attached.add(r); }
  });
  // pass 2 — remaining rosters attach by PASSPORT-SET OVERLAP with a roster already in a batch
  let changed=true;
  while(changed){ changed=false;
    rosters.forEach(r=>{ if(attached.has(r))return;
      for(const b of batches){
        if(b.papers.some(p=>p!==r.p && legalOverlap(r.p,p)>=LEGAL_OVERLAP)){
          b.papers.push(r.p); b.memberSource=b.memberSource||r.p; attached.add(r); changed=true; break; } }
    });
  }
  // pass 3 — leftovers with NO منح → provisional pairing by endpoints OR overlap
  const left=rosters.filter(r=>!attached.has(r)), taken=new Set(), prov=[];
  for(let i=0;i<left.length;i++){ if(taken.has(i))continue;
    const group=[left[i].p]; taken.add(i);
    for(let j=i+1;j<left.length;j++){ if(taken.has(j))continue;
      if(legalMatch(left[i].sig,left[j].sig).ends>=LEGAL_CONFIDENT || legalOverlap(left[i].p,left[j].p)>=LEGAL_OVERLAP){
        group.push(left[j].p); taken.add(j); } }
    prov.push({provisional:true, papers:group, memberSource:group.find(g=>g.type==='taahud')||group[0]}); }
  return {batches:batches.concat(prov), ambiguous, pending:[]}; }

/* ══ THE ASSEMBLER UI — pending scanned papers → proposals → confirm → commit ══════════
   Reads the legal_papers pool (what the worker parked), runs legalAssemble, and renders a
   confirm card per proposed batch. The human types/confirms the منح number (never OCR'd) +
   ticks the detected stamps, then commits through the SAME commitLegalBatch path as the manual
   composer. _legalMock lets us verify the whole surface here without the worker/DB. */
let _legalProps=[], _legalMock=null;
function mapPaperRow(r){
  return {paper_id:r.paper_id, type:r.paper_type, scan_path:r.scan_path, scan_hash:r.scan_hash||'',
    roster:r.roster||null, manh_number:r.manh_number||'', manh_date:r.manh_date||null,
    interval_from:r.interval_from, interval_to:r.interval_to,
    first_name:r.first_name, last_name:r.last_name,
    stamp_company:r.stamp_company, stamp_ministry:r.stamp_ministry}; }
async function loadLegalPending(){
  try{ const {data,error}=await sb.from('legal_papers').select('*').is('batch_id',null).neq('match_status','committed');
    if(error)return []; return (data||[]).map(mapPaperRow); }catch(_){ return []; } }
/* merge a proposal's papers into one roster: تعهد gives names+passports (trusted), استمارة enriches
   the same person (matched by passport) with expiry+profession. */
function proposalRows(prop){
  const taahud=prop.papers.find(p=>p.type==='taahud'), ist=prop.papers.find(p=>p.type==='istimara');
  const base=(taahud&&taahud.roster)||(ist&&ist.roster)||[];
  const byPass={}; if(ist&&ist.roster)ist.roster.forEach(r=>{ if(r.passport)byPass[r.passport]=r; });
  const taByPass={}; if(taahud&&taahud.roster)taahud.roster.forEach(r=>{ if(r.passport)taByPass[r.passport]=r; });
  return base.map(r=>{ const e=r.passport&&byPass[r.passport];
    // where his row sits on each paper (for the print highlight): تعهد box + استمارة box, by passport
    const tbox=(taByPass[r.passport]||r).box, ibox=e&&e.box, boxes={};
    if(tbox)boxes.taahud=tbox; if(ibox)boxes.istimara=ibox;
    return {serial:r.serial, name:r.name, passport:r.passport,
      expiry:(e&&e.expiry)||r.expiry||null, profession:(e&&e.profession)||r.profession||null,
      boxes:Object.keys(boxes).length?boxes:null}; }); }
function stampPre(prop){
  const g=type=>prop.papers.find(p=>p.type===type)||{};
  return {taahud:!!g('taahud').stamp_company, istco:!!g('istimara').stamp_company,
          istmo:!!g('istimara').stamp_ministry, manh:!!g('manh').stamp_ministry}; }
/* ── PROVISIONAL BATCHES + منح ADOPTION ─────────────────────────────────────
   A batch's identity is its two ENDPOINTS (first & last person) — the one thing all three papers
   share (منح has no passport). Serials restart at 1 per batch, so serial ALONE isn't unique; serial
   +NAME is. تعهد+استمارة commit alone under a synthetic key «~first|serial|last|serial» (NORMALISED
   names → OCR spacing/order never splits a batch); a later منح matches by those same endpoints and
   RE-KEYS the batch to its grant number (members+papers cascade via the ON UPDATE CASCADE migration). */
function legalEndpoints(rows){
  // A legal batch numbers its people 1..N. FIRST endpoint = the person at the smallest serial; LAST =
  // the person at the largest. But the OCR often drops the TRAILING serials, so when the roster has
  // MORE named people than the biggest serial it read, the true end is the COUNT (and the last NAMED
  // row is that person) — keeping «1 → 34» instead of «1 → 31». Serial-less middle rows are ignored
  // for the endpoints but still counted.
  // The SERIAL is the position, so the interval's start/end come from the smallest/largest serial
  // PRESENT — even if the OCR failed to read that row's NAME. A nameless row #1 must NOT make the batch
  // look like it starts at #2. The name is for display, with the passport as a fallback when the name
  // wasn't read; a trailing-serial drop still lifts the end to the COUNT. Rows with neither name nor
  // passport nor serial are ignored.
  const all=(rows||[]).filter(x=>x&&(x.name||x.passport||(x.serial!=null&&isFinite(+x.serial))));
  if(!all.length) return {fSerial:null,fName:'',fPass:null,lSerial:null,lName:'',lPass:null};
  const S=x=>(x.serial!=null&&isFinite(+x.serial))?+x.serial:null;
  const serialed=all.filter(x=>S(x)!=null), named=all.filter(x=>x.name);
  const count=all.length;                              // TRUE roster size — EVERY member counts (a badly-read
                                                       // tail must not shrink 1→34 to 1→31)
  const minS=serialed.length?Math.min(...serialed.map(S)):null;
  const maxS=serialed.length?Math.max(...serialed.map(S)):null;
  const lSerial=Math.max(maxS!=null?maxS:count,count); // last position = bigger of (max read serial, member count)
  const first=(minS!=null&&all.find(x=>S(x)===minS))||named[0]||all[0];
  // LAST endpoint is KNOWN only if a NAMED row sits at the final position (serial===lSerial) OR the roster is
  // named end-to-end (only trailing SERIALS dropped, names intact → last doc-order row IS the last person).
  // Otherwise the OCR dropped the tail (serial AND name) → the last person is UNIDENTIFIED: report the true
  // end NUMBER with no name (→ passport/؟ + flag), not the last KNOWN person mislabelled as the endpoint.
  const last=all.find(x=>S(x)===lSerial && x.name) || (named.length>=count ? named[named.length-1] : null);
  // Names stored HONESTLY: the real name, or '' when the OCR didn't read it — NEVER the passport in the
  // name's place (the منح matcher has no passports; a passport-as-name would silently fail). DISPLAY falls
  // back to the passport (in _lgLabel); the ANCHOR stays truthful.
  return {fSerial:minS!=null?minS:1, fName:first.name||'', fPass:first.passport||null,
          lSerial, lName:last?(last.name||''):'', lPass:last?(last.passport||null):null}; }
function provKey(ep){ return '~'+[legalNameKey(ep.fName)||ep.fPass||'?',ep.fSerial??'?',legalNameKey(ep.lName)||ep.lPass||'?',ep.lSerial??'?'].join('|'); }
function _lgName(s){ return String(s||'').trim(); }   // verbatim — exactly as on the passport (UPPERCASE), never re-cased
function _lgLabel(fS,fN,fP,lS,lN,lP){ return `\u2066${fS??'?'} (${_lgName(fN)||_lgName(fP)||'؟'}) — ${lS??'?'} (${_lgName(lN)||_lgName(lP)||'؟'})\u2069`; }
function provLabel(ep){ return _lgLabel(ep.fSerial,ep.fName,ep.fPass,ep.lSerial,ep.lName,ep.lPass); }
function batchLabel(b){ return _lgLabel(b.interval_from,b.first_name,b.first_passport,b.interval_to,b.last_name,b.last_passport); }
function batchSig(b){ return {from:b.interval_from,to:b.interval_to,count:b.member_count,
  firstName:b.first_name,firstPass:b.first_passport,lastName:b.last_name,lastPass:b.last_passport,
  hasPass:!!(b.first_passport||b.last_passport)}; }
async function loadProvisionalBatches(){
  try{ const {data}=await sb.from('legal_batches').select('*').is('manh_scan',null); return data||[]; }catch(_){ return []; } }
function _nameOverlap(a,b){                          // % of endpoint-name tokens shared (typo-tolerant)
  const A=[...new Set(legalNameKey(a).split(' ').filter(Boolean))], B=new Set(legalNameKey(b).split(' ').filter(Boolean));
  if(!A.length||!B.size) return 0; let s=0; for(const t of A) if(B.has(t)) s++; return s/Math.max(A.length,B.size); }
function manhCandidates(manhPaper, provBatches){    // which provisional batches this منح completes
  // منح carries NO passports → match on the INTERVAL + a PERCENTAGE overlap of the two endpoint NAMES
  // (mirrors the passport-% used for تعهد/استمارة), so a typo in a name still lands. Same interval +
  // both endpoints ≥50% token-overlap ⇒ confident; an exact both-endpoint match also qualifies.
  const sig=legalSig(manhPaper);
  return (provBatches||[]).filter(b=>{ const bs=batchSig(b);
    const iv = sig.from!=null && bs.from!=null && Math.abs(+sig.from-+bs.from)<=1 && Math.abs(+sig.to-+bs.to)<=1;
    const hasNames = !!(sig.firstName||sig.lastName);
    if(!hasNames) return iv;                        // منح that prints ONLY an interval → interval alone
    // an endpoint whose name the batch doesn't KNOW yet (OCR missed it, awaiting a human fill) can't
    // block the match — treat it as neutral so the interval + the KNOWN endpoint still connect the منح.
    const fo=bs.firstName?_nameOverlap(sig.firstName,bs.firstName):0.5, lo=bs.lastName?_nameOverlap(sig.lastName,bs.lastName):0.5;
    return (iv && fo>=0.5 && lo>=0.5) || legalMatch(bs,sig).ends>=LEGAL_CONFIDENT; }); }
let _legalManhs=[], _provBatches=[];
async function findMergeTarget(rows){        // does this roster belong to an existing batch — provisional OR منح-anchored?
  const newPass=new Set((rows||[]).map(r=>r&&r.passport).filter(Boolean));
  if(!newPass.size) return null;             // no passports (a منح) → handled by adoptManh, not here
  // ALL batches, not only provisional ones: a roster arriving AFTER its منح already anchored the batch
  // (e.g. the تعهد landing after منح+استمارة) still joins by PASSPORT-SET overlap. Passports are globally
  // unique, so this is the most reliable link and a منح already on the batch must never block it. (The
  // old provisional-only scope is exactly why the تعهد fell out into its own batch.)
  let prov; try{ const {data}=await sb.from('legal_batches').select('*'); prov=data||[]; }catch(_){ return null; }
  if(!prov.length) return null;
  let by={}; try{ const {data}=await sb.from('legal_batch_members').select('batch_id,passport_no').in('batch_id',prov.map(b=>b.batch_id));
    (data||[]).forEach(m=>{ if(m.passport_no)(by[m.batch_id]=by[m.batch_id]||new Set()).add(m.passport_no); }); }catch(_){ return null; }
  let best=null,bestOv=0;
  for(const b of prov){ const set=by[b.batch_id]; if(!set||!set.size)continue;
    let s=0; for(const p of newPass) if(set.has(p)) s++;
    const ov=s/Math.min(newPass.size,set.size);
    if(ov>=LEGAL_OVERLAP && ov>bestOv){ best=b; bestOv=ov; } }
  return best; }
async function findWaitingManh(ep, rows){   // a منح committed BEFORE its roster → an (near-)empty batch WITH
  // a منح scan, matching this roster's interval + endpoints. The roster merges INTO it so the batch becomes
  // whole. Fixes: منح committed first spawns a lone batch and the later roster never looked back for it.
  if(!ep || ep.fSerial==null || ep.lSerial==null) return null;
  let data; try{ ({data}=await sb.from('legal_batches').select('*').not('manh_scan','is',null)); }catch(_){ return null; }
  const need=(rows||[]).length;
  for(const b of (data||[])){
    if((b.member_count||0) >= need) continue;                 // already carries its roster
    const iv = b.interval_from!=null && Math.abs(+b.interval_from-+ep.fSerial)<=1 && Math.abs(+b.interval_to-+ep.lSerial)<=1;
    if(!iv) continue;
    const fo = b.first_name ? _nameOverlap(b.first_name, ep.fName||'') : 1;   // منح w/o endpoint names → interval alone
    const lo = b.last_name  ? _nameOverlap(b.last_name,  ep.lName||'') : 1;
    if(fo>=0.5 && lo>=0.5) return b;
  }
  return null; }
async function commitMerged(papers, rows, tgt, stamps){   // union this paper into tgt; keep its scans; recompute endpoints
  let mem=[]; try{ const {data}=await sb.from('legal_batch_members')
    .select('serial,name_as_written,passport_no,istimara_expiry,profession,boxes').eq('batch_id',tgt.batch_id); mem=data||[]; }catch(_){}
  // SERIAL-SPINE de-dup. The استمارة roster numbers its people 1..N and that serial IS the identity within the
  // batch — exactly ONE member per serial, and two DIFFERENT serials are NEVER merged even when the OCR
  // read the same passport for both (two roster rows can share one mis-read passport number — they
  // stay two people, kept apart by serial). A passport-only row (from التعهد, no serial) FOLDS INTO the
  // serial row that already carries its passport, filling gaps; a passport-only row that matches no serial
  // survives as an extra (someone on التعهد but not الاستمارة), itself de-duped by passport. So the
  // count is the true roster and serial 1 is never lost → the interval stays 1..N.
  const _npp=p=>p?String(p).toUpperCase().replace(/[^A-Z0-9]/g,''):'';
  const bySerial={}, noSerial=[];
  const add=r=>{ const sn=(r.serial!=null&&isFinite(+r.serial))?+r.serial:null;
    if(sn==null){ noSerial.push(r); return; }
    const e=bySerial[sn]||(bySerial[sn]={}); for(const k in r){ if(r[k]!=null&&r[k]!=='') e[k]=r[k]; } };
  mem.forEach(m=>add({serial:m.serial,name:m.name_as_written,passport:m.passport_no,expiry:m.istimara_expiry,profession:m.profession,boxes:m.boxes}));
  (rows||[]).forEach(add);
  const serialByPass={}; for(const sn in bySerial){ const p=_npp(bySerial[sn].passport); if(p&&!(p in serialByPass)) serialByPass[p]=bySerial[sn]; }
  const extra={}; let _ex=0;
  noSerial.forEach(r=>{ const p=_npp(r.passport), hit=p&&serialByPass[p];
    if(hit){ for(const k in r){ if(r[k]!=null&&r[k]!=='' && (hit[k]==null||hit[k]==='')) hit[k]=r[k]; } }   // fill the gap
    else { const ek=p||('_'+(_ex++)); const e=extra[ek]||(extra[ek]={}); for(const k in r){ if(r[k]!=null&&r[k]!=='') e[k]=r[k]; } } });
  // When a serial spine exists (an استمارة is in the batch) it IS the roster — passport-only rows only
  // FILL gaps; any that matched no serial are OCR-variant duplicates of roster people and are dropped
  // (keeping them would re-inflate the count). With NO spine yet (التعهد committed first) the passport-only
  // rows ARE the provisional roster, so they stand.
  const union = Object.keys(bySerial).length ? Object.values(bySerial) : Object.values(extra);
  const ep=legalEndpoints(union);
  // THE منح OWNS THE SPAN. It prints the granted interval + endpoint names ("1→35, DING JIA … LI CHUNTING").
  // A roster fills MEMBERS; it must never SHRINK the interval or ERASE a known endpoint. Bug it fixes: a
  // short/misread استمارة (34 rows, last row garbled) overwrote 1→35/LI CHUNTING with 1→34/REN LIXIN, so the
  // next correct تعهد no longer matched and fell into its own batch. Rule: on a منح-anchored batch keep the
  // widest interval (never below the grant), and take the endpoint NAME from the fullest roster (ep) but
  // fall back to the batch's when this roster didn't read it — a blank never erases a known name.
  const anchored=!!tgt.manh_scan;
  const iFrom = anchored && tgt.interval_from!=null ? Math.min(tgt.interval_from, ep.fSerial??tgt.interval_from) : ep.fSerial;
  const iTo   = anchored && tgt.interval_to  !=null ? Math.max(tgt.interval_to,   ep.lSerial??tgt.interval_to)   : ep.lSerial;
  const fName = ep.fName || (anchored?tgt.first_name:'') || ep.fName;
  const lName = ep.lName || (anchored?tgt.last_name :'') || ep.lName;
  const fPass = ep.fPass || (anchored?tgt.first_passport:null) || ep.fPass;
  const lPass = ep.lPass || (anchored?tgt.last_passport :null) || ep.lPass;
  const scans={ taahud:tgt.taahud_scan, istimara:tgt.istimara_scan, manh:tgt.manh_scan };
  (papers||[]).forEach(p=>{ if(p&&p.scan_path) scans[p.type]=p.scan_path; });   // add THIS paper's scan, keep the others
  const st={ taahud:tgt.taahud_stamp||!!(stamps&&stamps.taahud), istco:tgt.istimara_company_stamp||!!(stamps&&stamps.istco),
             istmo:tgt.istimara_ministry_stamp||!!(stamps&&stamps.istmo), manh:tgt.manh_stamp||!!(stamps&&stamps.manh) };
  return commitLegalBatch({ batch_id:tgt.batch_id, interval_from:iFrom, interval_to:iTo,
    rows:union, scans, stamps:st, first_name:fName, last_name:lName, first_passport:fPass, last_passport:lPass,
    manh_date:tgt.manh_date||null, provisional:!tgt.manh_scan, rot:reviewRot(tgt.rot),   // merge review turns onto the batch's saved ones
    paperIds:(papers||[]).map(p=>p.paper_id).filter(Boolean) }); }
async function adoptManh(manhPaper, oldId, rot){    // attach a منح to a provisional batch + RE-KEY to its number
  if(!manhPaper){ return; }
  const newId=String(manhPaper.manh_number||'').trim();
  if(!newId){ toast(t('lg_manh_need')); return; }
  let ptr=manhPaper.scan_path;
  if(ptr){ const ext=(String(ptr).match(/\.[a-z0-9]+$/i)||['.pdf'])[0].toLowerCase();
    const dest=`${LEGAL_DIR}/${newId}/manh${ext}`;
    if(ptr===dest){ /* already in place */ }
    else{ try{ const {error}=await sb.storage.from('documents').move(ptr,dest);
      if(!error){ ptr=dest; }
      // a PRIOR failed commit may have already moved the file to dest → the source is gone. Don't
      // point manh_scan at the vanished source; if dest holds the file, use it (idempotent retry).
      else{ const {data:_ex}=await sb.storage.from('documents').createSignedUrl(dest,60); if(_ex&&_ex.signedUrl)ptr=dest; }
    }catch(_){} } }
  const patch={ batch_id:newId, manh_scan:ptr, manh_stamp:!!manhPaper.stamp_ministry,
    manh_date:manhPaper.manh_date||null, status:'active' };
  if(rot)patch.rot=rot;                              // the reviewer's منح rotation → merged onto the batch, cascades to print/عرض
  if(manhPaper.interval_from!=null)patch.interval_from=manhPaper.interval_from;
  if(manhPaper.interval_to  !=null)patch.interval_to  =manhPaper.interval_to;
  const {error}=await sb.from('legal_batches').update(patch).eq('batch_id',oldId);   // members+papers cascade
  if(error){ throw new Error((error&&error.message)||String(error)); }   // LOUD: propagate so the caller shows the failure and NEVER optimistically marks the card committed
  try{ await sb.from('legal_papers').update({batch_id:newId,match_status:'committed'}).eq('paper_id',manhPaper.paper_id); }catch(_){}
  // advance the OCR-line board: the منح's own scan row → 'done' (flows to مُودَع, out of § legal-review)
  try{ if(manhPaper.scan_hash) await sb.from('scan_jobs').update({status:'done'}).eq('image_hash',manhPaper.scan_hash); }catch(_){}
  toast(t('lg_adopted')+newId);
  await legalReload(); search($('#q')?$('#q').value:'');
}
function renderLegalProposals(papers){
  const {batches,ambiguous}=legalAssemble(papers);
  const tl=Object.fromEntries(ptKeys().map(k=>[k,ptLabel(k)]));   // registry-driven labels (G6)
  const chk=(k,lab,on)=>`<label class="lg-chk"><input type="checkbox" data-st="${k}" ${on?'checked':''}><span>${esc(lab)}</span></label>`;
  // a lone منح that matches an already-committed PROVISIONAL batch → an adopt (1 match) or clarify (>1) card
  const normal=[]; let adoptHtml=''; _legalManhs=[];
  batches.forEach(b=>{
    const mp=b.papers.find(p=>p.type==='manh');
    if(mp && b.papers.length===1){
      const cands=manhCandidates(mp,_provBatches);
      if(cands.length){ const mi=_legalManhs.push(mp)-1;
        if(cands.length===1){
          adoptHtml+=`<div class="lg-prop lg-adopt"><div class="lg-prop-h"><b>${t('lg_manh')} ${esc(mp.manh_number||'')}</b><span class="lg-tag">${esc(t('lg_adopt',mp.manh_number||'',batchLabel(cands[0])))}</span></div>`
            +`<button class="rvw-add lg-adopt-btn" data-mi="${mi}" data-bid="${esc(cands[0].batch_id)}">${t('lg_adopt_do')}</button></div>`;
        }else{
          adoptHtml+=`<div class="lg-prop lg-amb"><div class="lg-prop-h"><b>${t('lg_manh')} ${esc(mp.manh_number||'')}</b><span class="lg-tag warn">${t('lg_adopt_amb')}</span></div>`
            +`<div class="lg-adopt-choices">${cands.map(c=>`<button class="lg-adopt-btn lg-choice" data-mi="${mi}" data-bid="${esc(c.batch_id)}">${esc(batchLabel(c))}</button>`).join('')}</div></div>`;
        }
        return; }
    }
    normal.push(b);
  });
  _legalProps=normal;
  let html='';
  normal.forEach((b,i)=>{
    const rows=proposalRows(b), st=stampPre(b), num=b.manh?b.manh.manh_number:'', prov=!b.papers.some(p=>p.type==='manh');
    const chips=b.papers.map(p=>`<span class="lg-chip"${p.scan_path?` data-view="${esc(p.scan_path)}"`:''}>${tl[p.type]||p.type}${p.scan_path?` <em>${t('lg_view')}</em>`:''}</span>`).join('');
    html+=`<div class="lg-prop" data-i="${i}">
      <div class="lg-prop-h"><b>${t('lg_proposal')}</b>${prov?`<span class="lg-tag">${t('lg_provisional')}</span>`:''}</div>
      <div class="lg-prop-papers">${t('lg_papers_lbl')} ${chips}</div>
      <div class="lg-prop-row">
        <input class="lg-pnum" inputmode="numeric" value="${esc(num)}" placeholder="${esc(prov?t('lg_manh_opt'):t('lg_manh_need'))}">
        <span class="lg-count">${t('lg_names_ocr',rows.length)}</span></div>
      <div class="lg-prop-stamps">${chk('taahud',t('lg_st_taahud'),st.taahud)}${chk('istco',t('lg_st_ist_co'),st.istco)}${chk('istmo',t('lg_st_ist_mo'),st.istmo)}${chk('manh',t('lg_st_manh'),st.manh)}</div>
      <button class="rvw-add lg-commit-prop" data-i="${i}">${prov?t('lg_anchor'):t('lg_confirm_commit')}</button></div>`;
  });
  ambiguous.forEach(a=>{ html+=`<div class="lg-prop lg-amb">
    <div class="lg-prop-h"><b>${esc((a.paper.first_name||'?')+' … '+(a.paper.last_name||'?'))}</b><span class="lg-tag warn">${t('lg_ambiguous')}</span></div>
    <div class="lg-prop-papers">${esc(a.candidates.join(' · '))}</div></div>`; });
  return (adoptHtml+html)||`<div class="lg-empty">${t('lg_no_pending')}</div>`;
}
async function legalViewScan(path, rotDeg){ if(!path)return; rotDeg=+rotDeg||0;
  // عرض must match the PRINT: when the human stored a turn for this paper, render its pages upright with
  // the SAME machinery the printout uses (scanImagesAll) instead of opening the raw PDF at its filed
  // orientation. No stored turn → keep the fast raw-PDF-in-a-new-tab view.
  if(rotDeg){ try{ const imgs=(await scanImagesAll(path, rotDeg)||[]).filter(Boolean);
    if(imgs.length){ $('#lightbox').innerHTML=`<div class="lb-scanview">${imgs.map(u=>`<img src="${u}" alt="">`).join('')}</div>`;
      $('#lightbox').classList.add('on'); return; } }catch(_){} }
  const u=await docUrl(path); if(u)window.open(u,'_blank'); }
async function legalReload(){
  const box=$('#lg-proposals'); if(!box)return;
  const papers=_legalMock||await loadLegalPending();
  _provBatches=_legalMock?[]:await loadProvisionalBatches();
  box.innerHTML=`<div class="lg-sh">${t('lg_pending')}</div>`+renderLegalProposals(papers);
  box.querySelectorAll('.lg-commit-prop').forEach(b=>b.onclick=()=>commitProposal(+b.dataset.i));
  box.querySelectorAll('.lg-adopt-btn').forEach(b=>b.onclick=()=>adoptManh(_legalManhs[+b.dataset.mi], b.dataset.bid).catch(e=>toast(t('lg_savefail')+((e&&e.message)||e))));
  box.querySelectorAll('[data-view]').forEach(c=>c.onclick=()=>legalViewScan(c.getAttribute('data-view')));
}
async function commitProposal(i){
  const prop=_legalProps[i]; if(!prop)return;
  const card=document.querySelector(`.lg-prop[data-i="${i}"]`); if(!card)return;
  const rows=proposalRows(prop);
  const ep=legalEndpoints(rows);
  const hasManh=prop.papers.some(p=>p.type==='manh');
  let id=(card.querySelector('.lg-pnum').value||'').trim();
  const st={}; card.querySelectorAll('[data-st]').forEach(c=>st[c.dataset.st]=c.checked);
  if(!id){
    if(hasManh){ toast(t('lg_need_id')); return; }
    let tgt=await findMergeTarget(rows);                                 // shares passports with a committed provisional batch?
    if(!tgt) tgt=await findWaitingManh(ep, rows);                        // OR a منح that committed BEFORE its roster (waiting)
    if(tgt){ const b0=card.querySelector('.lg-commit-prop'); if(b0){b0.disabled=true;b0.textContent=t('lg_saving');}
      try{ const res=await commitMerged(prop.papers, rows, tgt, st);
        toast(t('lg_merged')+batchLabel(tgt)+`  ·  ${res.linked}/${res.total}`);
        if(_legalMock)_legalMock=_legalMock.filter(p=>!prop.papers.includes(p));
        await legalReload(); search($('#q')?$('#q').value:''); }
      catch(e){ toast(t('lg_savefail')+((e&&e.message)||e)); if(b0){b0.disabled=false;b0.textContent=t('lg_confirm_commit');} }
      return; }
    id=provKey(ep);                                                      // else anchor a new provisional batch
  }
  if(hasManh && prop.papers.length===1 && id){          // a lone منح → complete a matching provisional batch
    const cands=manhCandidates(prop.papers[0], await loadProvisionalBatches());
    if(cands.length===1){ const b0=card.querySelector('.lg-commit-prop'); if(b0){b0.disabled=true;b0.textContent=t('lg_saving');}
      try{ prop.papers[0].manh_number=id; await adoptManh(prop.papers[0], cands[0].batch_id);
        if(_legalMock)_legalMock=_legalMock.filter(p=>!prop.papers.includes(p)); }
      catch(e){ toast(t('lg_savefail')+((e&&e.message)||e)); if(b0){b0.disabled=false;b0.textContent=t('lg_confirm_commit');} }
      return; } }
  const manh=prop.papers.find(p=>p.type==='manh')||{};
  const scans={ taahud:(prop.papers.find(p=>p.type==='taahud')||{}).scan_path,
    istimara:(prop.papers.find(p=>p.type==='istimara')||{}).scan_path, manh:manh.scan_path };
  const btn=card.querySelector('.lg-commit-prop'); btn.disabled=true; btn.textContent=t('lg_saving');
  try{
    const res=await commitLegalBatch({ batch_id:id, manh_date:manh.manh_date||null,
      interval_from:manh.interval_from??ep.fSerial, interval_to:manh.interval_to??ep.lSerial, rows, scans, stamps:st,
      first_name:ep.fName, last_name:ep.lName, first_passport:ep.fPass, last_passport:ep.lPass, provisional:!hasManh,
      paperIds:prop.papers.map(p=>p.paper_id).filter(Boolean) });
    toast((hasManh?t('lg_saved')+id:t('lg_saved_prov')+provLabel(ep))+`  ·  ${res.linked}/${res.total}`);
    if(_legalMock)_legalMock=_legalMock.filter(p=>!prop.papers.includes(p));
    await legalReload(); search($('#q')?$('#q').value:'');
  }catch(e){ toast(t('lg_savefail')+((e&&e.message)||e)); btn.disabled=false; btn.textContent=t('lg_confirm_commit'); }
}

/* ══ INLINE LEGAL REVIEW — click a «§ legal review» row → passport-style overlay (scan + confirm) ══
   The § assembler brought INLINE, where you dropped the files (owner's ask): reviews the whole BATCH
   from any of its papers — the raw scan on one side (a tab per paper to switch), the confirm panel on
   the other (type the منح number, tick the stamps), one save. Same commitLegalBatch path. */
let _lrBatch=null, _lrIdx=0, _lrRot={}, _lrZoom=1;   // _lrRot[type] = the user's manual turn per paper; _lrZoom = review-pane magnification
// The review-pane rotations as a registry-keyed map (degrees), merged NON-DESTRUCTIVELY onto a batch's
// existing rotation so a rotation set in review CARRIES INTO print + عرض (both raster from legal_batches.rot).
// A paper the human turned this session is authoritative; a paper left untouched keeps its stored rotation.
// `k in _lrRot` is true only once the rotate button was pressed for that paper → untouched papers never clobber.
function reviewRot(existing){
  const m={...(existing||{})};
  ptKeys().forEach(k=>{ if(k in _lrRot) m[k]=(+_lrRot[k]||0); });
  const out={}; Object.keys(m).forEach(k=>{ if(+m[k]) out[k]=+m[k]; });   // keep only real (non-zero) turns
  return Object.keys(out).length?out:null;
}
// ── review-pane VIEWER (modern document-viewer pattern) ──────────────────────────────────────────
// A PDF page is RE-RENDERED at the current zoom (scale × devicePixelRatio) so text stays razor-sharp at
// any magnification — never a stretched bitmap. It sits in a normal SCROLLABLE pane (the up/down slider
// is back), with grab-to-pan and Ctrl/⌘-wheel + pinch zoom-to-cursor. A raw image scan uses the same
// shell but css-scales (a photo has no more detail to render). One glass toolbar for both.
const LR_ZMIN=1, LR_ZMAX=10;
function _lrToolsHtml(){
  return `<div class="lr-bar">`
    + `<button class="lr-b" id="lr-rot" title="${t('lr_rotate')}">⟳</button><i class="lr-sep"></i>`
    + `<button class="lr-b" data-lz="out" title="−">−</button><span class="lz-lbl">100%</span>`
    + `<button class="lr-b" data-lz="in" title="+">+</button>`
    + `<button class="lr-b" data-lz="fit" title="⊡">⊡</button></div>`; }
// shared interaction: rotate · buttons · Ctrl-wheel zoom-to-cursor · grab-pan · pinch. api={zoomAt(cx,cy,f),reset()}.
function _lrWire(box, paper, api){
  const pan=box.querySelector('.lr-pan'); if(!pan)return;
  const rb=box.querySelector('#lr-rot'); if(rb)rb.onclick=()=>{ if(api&&api.rotate){ api.rotate(); return; }   // instant css-rotate path
    _lrRot[paper.type]=((_lrRot[paper.type]||0)+90)%360; lrPaintScan(paper); };                                 // fallback: re-render (office no-PDF)
  box.querySelectorAll('[data-lz]').forEach(b=>b.onclick=()=>{ const a=b.dataset.lz, r=pan.getBoundingClientRect();
    if(a==='in')api.zoomAt(r.width/2,r.height/2,1.25); else if(a==='out')api.zoomAt(r.width/2,r.height/2,1/1.25); else api.reset(); });
  pan.addEventListener('wheel',e=>{ if(!(e.ctrlKey||e.metaKey))return;      // plain wheel SCROLLS (slider); Ctrl/⌘-wheel zooms
    e.preventDefault(); const r=pan.getBoundingClientRect(); api.zoomAt(e.clientX-r.left,e.clientY-r.top, e.deltaY<0?1.15:1/1.15); },{passive:false});
  const pts=new Map(); let pinch=0, sl=0, st=0, sx=0, sy=0;                  // 1 pointer = grab-pan (scroll), 2 = pinch-zoom
  pan.addEventListener('pointerdown',e=>{ if(e.target.closest('.lr-bar'))return; pan.setPointerCapture(e.pointerId);
    pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); pan.classList.add('grabbing');
    if(pts.size===1){ sl=pan.scrollLeft; st=pan.scrollTop; sx=e.clientX; sy=e.clientY; }
    else if(pts.size===2){ const [a,b]=[...pts.values()]; pinch=Math.hypot(a.x-b.x,a.y-b.y); } });
  pan.addEventListener('pointermove',e=>{ const p=pts.get(e.pointerId); if(!p)return; p.x=e.clientX; p.y=e.clientY;
    if(pts.size===1){ pan.scrollLeft=sl-(e.clientX-sx); pan.scrollTop=st-(e.clientY-sy); }
    else if(pts.size===2){ const [a,b]=[...pts.values()], d=Math.hypot(a.x-b.x,a.y-b.y), r=pan.getBoundingClientRect();
      if(pinch) api.zoomAt((a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top, d/pinch); pinch=d; } });
  const up=e=>{ pts.delete(e.pointerId); if(pts.size<2)pinch=0; if(!pts.size)pan.classList.remove('grabbing'); };
  pan.addEventListener('pointerup',up); pan.addEventListener('pointercancel',up);
}
async function _lrPdfView(box, url, rot, paper){        // sharp: re-renders each page at the chosen zoom
  await ensurePdfjs();
  if(!window.pdfjsLib) return false;
  let pdf; try{ const buf=await (await fetch(url)).arrayBuffer(); pdf=await pdfjsLib.getDocument({data:buf}).promise; }
  catch(e){ console.warn('pdf view',e); return false; }
  box.innerHTML=`<div class="lr-pan pdf"><div class="lr-stage"></div></div>${_lrToolsHtml()}`;
  const pan=box.querySelector('.lr-pan'), stage=box.querySelector('.lr-stage'), lbl=box.querySelector('.lz-lbl');
  const dpr=Math.min(window.devicePixelRatio||1, 2), base=paper.type==='manh'?1.5:1;
  const rotOf=p=>(((p.rotate||0)+rot)%360+360)%360, pages=[];
  for(let n=1;n<=pdf.numPages;n++){ const p=await pdf.getPage(n); const c=document.createElement('canvas'); c.className='lr-page'; stage.appendChild(c); pages.push({p,c}); }
  let z=base;
  const fit=()=>{ const w=pan.clientWidth-16, vp1=pages[0].p.getViewport({scale:1,rotation:rotOf(pages[0].p)}); return Math.max(.15, w/vp1.width); };
  const cssSizes=cs=>{ for(const {p,c} of pages){ const vp1=p.getViewport({scale:1,rotation:rotOf(p)}); c.style.width=(cs*vp1.width)+'px'; c.style.height=(cs*vp1.height)+'px'; } };
  let tok=0;
  // SUPERSAMPLE: render the bitmap at ~3.5x the CSS size (matching the old fixed-3.5 raster that looked
  // crisp) so text is sharp AT THE DEFAULT view too — not just when zoomed. dpr only raises it further.
  const SS=Math.max(3.5, dpr), CAP=5200;
  async function sharp(){ const my=++tok, cs=fit()*z;
    for(const {p,c} of pages){ if(my!==tok)return; const r=rotOf(p), vp1=p.getViewport({scale:1,rotation:r});
      c.style.width=(cs*vp1.width)+'px'; c.style.height=(cs*vp1.height)+'px';           // logical size = the zoom
      let s=cs*SS, vp=p.getViewport({scale:s,rotation:r}); const mx=Math.max(vp.width,vp.height);
      if(mx>CAP) vp=p.getViewport({scale:s*CAP/mx,rotation:r});                          // cap the bitmap (memory safety at extreme zoom)
      c.width=Math.floor(vp.width); c.height=Math.floor(vp.height);
      try{ await p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise; }catch(_){} } }
  let deb=0; const sharpen=()=>{ clearTimeout(deb); deb=setTimeout(sharp,150); };
  function zoomTo(nz,cx,cy){ nz=Math.min(LR_ZMAX,Math.max(LR_ZMIN,nz)); if(Math.abs(nz-z)<1e-3)return;
    const r=nz/z, l=pan.scrollLeft, tp=pan.scrollTop; z=nz; cssSizes(fit()*z);           // instant: stretch the current bitmap
    pan.scrollLeft=(l+cx)*r-cx; pan.scrollTop=(tp+cy)*r-cy;                              // keep the point under the cursor put
    if(lbl)lbl.textContent=Math.round(z*100)+'%'; _lrZoom=z; sharpen(); }
  _lrWire(box, paper, { zoomAt:(cx,cy,f)=>zoomTo(z*f,cx,cy),
    reset:()=>{ zoomTo(base, pan.clientWidth/2, pan.clientHeight/2); pan.scrollTop=0; pan.scrollLeft=paper.type==='manh'?pan.scrollWidth:0; } });
  await sharp(); cssSizes(fit()*z); if(lbl)lbl.textContent=Math.round(z*100)+'%';
  if(paper.type==='manh') requestAnimationFrame(()=>{ pan.scrollLeft=pan.scrollWidth; });   // open on the top-right العدد (RTL)
  return true;
}
function _lrImgView(box, urls, paper){                   // rasterized pages → scroll + css-zoom + INSTANT css-rotate
  box.innerHTML=`<div class="lr-pan imgv"><div class="lr-stage">${urls.map(u=>`<div class="lr-cell"><img class="lr-page" src="${esc(u)}" alt="scan"></div>`).join('')}</div></div>${_lrToolsHtml()}`;
  const pan=box.querySelector('.lr-pan'), lbl=box.querySelector('.lz-lbl'), cells=[...box.querySelectorAll('.lr-cell')];
  const base=paper.type==='manh'?1.5:1; let z=base;
  let rot=(((+_lrRot[paper.type]||0)%360)+360)%360;      // the saved manual turn (persists across paper switches)
  // size each page so its POST-rotation width fills the pane, rotate the (already-sharp) bitmap via CSS,
  // and give the cell the rotated bounding box so stacked pages never overlap — all instant, no re-raster.
  const apply=()=>{ const W=pan.clientWidth*z, swap=(rot===90||rot===270);
    cells.forEach(cell=>{ const im=cell.querySelector('img'), nw=im.naturalWidth||1, nh=im.naturalHeight||1, ar=nh/nw;
      let dw,dh; if(swap){ dh=W; dw=W/ar; } else { dw=W; dh=W*ar; }
      im.style.width=dw+'px'; im.style.height=dh+'px'; im.style.transform=rot?`rotate(${rot}deg)`:'';
      cell.style.width=(swap?dh:dw)+'px'; cell.style.height=(swap?dw:dh)+'px'; });
    if(lbl)lbl.textContent=Math.round(z*100)+'%'; _lrZoom=z; };
  cells.forEach(cell=>{ const im=cell.querySelector('img'); if(!im.complete) im.addEventListener('load',apply,{once:true}); });  // re-fit once natural size is known
  function zoomTo(nz,cx,cy){ nz=Math.min(LR_ZMAX,Math.max(LR_ZMIN,nz)); if(Math.abs(nz-z)<1e-3)return;
    const r=nz/z, l=pan.scrollLeft, tp=pan.scrollTop; z=nz; apply(); pan.scrollLeft=(l+cx)*r-cx; pan.scrollTop=(tp+cy)*r-cy; }
  _lrWire(box, paper, { zoomAt:(cx,cy,f)=>zoomTo(z*f,cx,cy),
    reset:()=>{ z=base; apply(); pan.scrollTop=0; pan.scrollLeft=paper.type==='manh'?pan.scrollWidth:0; },
    rotate:()=>{ rot=(rot+90)%360; _lrRot[paper.type]=rot; apply(); pan.scrollTop=0; pan.scrollLeft=0; } });  // ⟳ = instant flip
  apply();
  if(paper.type==='manh') requestAnimationFrame(()=>{ pan.scrollLeft=pan.scrollWidth; });
}
// office fallback WITH the full viewer chrome — used when a docx/xlsx has NO rendered PDF sibling (so the
// sharp image path can't run). Renders the doc in-app (docx-preview/SheetJS) then wraps it in the SAME
// grab-pan + zoom machinery as the image/pdf viewers via a CSS transform, so the review is NEVER a dead,
// un-scrollable, un-zoomable pane. Returns false if the doc itself can't be rendered (→ download panel).
async function _lrOfficeView(box, paper){
  // the PAN is the LTR scroll container (predictable scrollLeft for the pan math); the DOC content's own
  // reading direction is detected from its script so an Arabic form reads RIGHT-TO-LEFT like the original.
  box.innerHTML=`<div class="lr-pan office" dir="ltr"><div class="lr-ofit"><div class="lr-doc"></div></div></div>${_lrToolsHtml()}`;
  const pan=box.querySelector('.lr-pan'), fit=box.querySelector('.lr-ofit'), doc=box.querySelector('.lr-doc'), lbl=box.querySelector('.lz-lbl');
  fit.style.cssText='position:relative;margin:0 auto';
  doc.style.cssText='position:absolute;top:0;left:0;transform-origin:top left';
  const ok=await renderOfficeDoc(paper.scan_path, doc);
  if(!ok) return false;
  // FIX 1 (direction): honor the document's own direction. docx-preview often emits no explicit dir, so the
  // content inherited the pane's LTR and an Arabic form showed left-to-right. Detect the dominant script and
  // set the content direction (Arabic/Hebrew → rtl), so the layout matches the original Word doc.
  const _txt=(doc.textContent||'').slice(0,4000);
  const _rtl=((_txt.match(/[֐-ࣿ]/g)||[]).length) > ((_txt.match(/[A-Za-z]/g)||[]).length);
  doc.style.direction=_rtl?'rtl':'ltr';
  doc.style.transform='none';                                              // measure natural size unscaled
  const natW=Math.max(1, doc.offsetWidth||doc.scrollWidth), natH=Math.max(1, doc.offsetHeight||doc.scrollHeight);
  let z=1;
  // FIX 2 (rotate): apply the review rotation (_lrRot[type]) as a CSS rotate, with the bounding box + fit
  // recomputed per angle (90/270 swap width/height), so rotating an office paper actually turns the page —
  // and z=1 still means fit-to-width for whichever side now faces across the pane.
  const apply=()=>{ const r=(((+_lrRot[paper.type]||0)%360)+360)%360;
    const alongW=(r===90||r===270)?natH:natW;                             // the dimension now spanning the pane
    const s=Math.max(.05,(pan.clientWidth-2)/alongW)*z;
    const W=natW*s, H=natH*s; let tx=0,ty=0,bw=W,bh=H;
    if(r===90){ tx=H; bw=H; bh=W; } else if(r===180){ tx=W; ty=H; } else if(r===270){ ty=W; bw=H; bh=W; }
    doc.style.transform=`translate(${tx}px,${ty}px) rotate(${r}deg) scale(${s})`;
    fit.style.width=bw+'px'; fit.style.height=bh+'px';
    if(lbl)lbl.textContent=Math.round(z*100)+'%'; _lrZoom=z; };
  function zoomTo(nz,cx,cy){ nz=Math.min(LR_ZMAX,Math.max(LR_ZMIN,nz)); if(Math.abs(nz-z)<1e-3)return;
    const r=nz/z, l=pan.scrollLeft, tp=pan.scrollTop; z=nz; apply(); pan.scrollLeft=(l+cx)*r-cx; pan.scrollTop=(tp+cy)*r-cy; }
  _lrWire(box, paper, { zoomAt:(cx,cy,f)=>zoomTo(z*f,cx,cy), reset:()=>{ z=1; apply(); pan.scrollTop=0; pan.scrollLeft=0; } });
  apply();
  return true;
}
// each paper's OWN expected stamp(s) — reviewing a paper shows ONLY these, defaulting to present (the
// STANDARD): تعهد=company · استمارة=company+ministry · منح=ministry. The human unticks a missing one.
const PAPER_STAMPS={taahud:[['taahud','lg_st_taahud']],
  istimara:[['istco','lg_st_ist_co'],['istmo','lg_st_ist_mo']], manh:[['manh','lg_st_manh']]};
async function openLegalReview(hash){
  const papers=_legalMock||await loadLegalPending();
  if(!papers.length){ toast(t('lg_no_pending')); return; }
  const {batches}=legalAssemble(papers);
  let bi=batches.findIndex(b=>b.papers.some(p=>p.scan_hash&&p.scan_hash===hash));
  if(bi<0)bi=0;
  _lrBatch=batches[bi]; _lrBatch._num=undefined; _lrBatch._stamps={}; _lrRot={}; _lrZoom=1;
  // fixed logical order تعهد · استمارة · منح; the DOM order + `dir` make it read right-to-left in AR,
  // left-to-right in EN automatically (the segmented control is a flex row that follows the language).
  _lrBatch.papers.sort((a,b)=>ptOrd(a.type)-ptOrd(b.type));   // registry order (G6)
  _lrIdx=Math.max(0,_lrBatch.papers.findIndex(p=>p.scan_hash===hash));
  renderLegalReview();
  $('#ikreview').classList.add('on'); document.body.style.overflow='hidden';
}
function _lrRead(){ const b=_lrBatch; if(!b)return;
  const n=$('#lr-num'); if(n){ b._num=n.value; if(b.manh)b.manh.manh_number=n.value; }
  const md=$('#lr-mdate'); if(md){ b._mdate=md.value; if(b.manh)b.manh.manh_date=md.value; }
  b._stamps=b._stamps||{};
  document.querySelectorAll('#ikreview [data-st]').forEach(c=>{ b._stamps[c.dataset.st]=c.checked; }); // merge — keep other papers' ticks
  b._epFill=b._epFill||{};   // endpoint names the OCR missed, typed here this review
  document.querySelectorAll('#ikreview .lr-epname').forEach(inp=>{ const v=inp.value.trim(); if(v)b._epFill[+inp.dataset.ser]=v; else delete b._epFill[+inp.dataset.ser]; }); }
function renderLegalReview(){
  const b=_lrBatch; if(!b)return;
  const papers=b.papers, cur=papers[_lrIdx]||papers[0];
  const rows=proposalRows(b), st=b._stamps||{};
  // endpoint-name GAPS: the OCR missed a first/last name and we fell back to the passport. Ask for THESE
  // ONLY (required, like the منح number). Names read fine are NOT fielded here — the «عرض جميع الحقول»
  // toggle reveals the full roster read-only for an optional eyeball (mirrors the passport/visa drawer).
  b._epFill=b._epFill||{};
  const _rowsF=rows.map(r=>{ const f=r.serial!=null&&b._epFill[+r.serial]; return f?{...r,name:f}:r; });
  const _epRaw=legalEndpoints(rows), _epGaps=[];
  if(!_epRaw.fName && _epRaw.fSerial!=null) _epGaps.push({serial:_epRaw.fSerial, pass:_epRaw.fPass});
  if(!_epRaw.lName && _epRaw.lSerial!=null && _epRaw.lSerial!==_epRaw.fSerial) _epGaps.push({serial:_epRaw.lSerial, pass:_epRaw.lPass});
  const _loneManh=b.papers.length===1 && b.papers[0].type==='manh';
  const _canConn=(_epRaw.fSerial!=null&&_epRaw.lSerial!=null)&&!!(_epRaw.fName||_epRaw.lName);   // منح-matchable
  const gapFields=(_epGaps.length&&!_loneManh&&!_canConn)?`<div class="lr-gaps">${_epGaps.map(g=>`<div class="rfield lr-gap"><label>⚑ ${t('lr_endname')} · ${t('lg_serial')} ${g.serial}</label><input class="lr-epname" data-ser="${g.serial}" value="${esc(b._epFill[g.serial]||'')}" placeholder="${esc(g.pass||t('law_addname'))}"></div>`).join('')}</div>`:'';
  const allBtn=`<button class="lr-allbtn" id="lr-all">${b._showAll?t('rv_less'):t('rv_all')}</button>`;
  const allList=b._showAll?`<div class="lr-allroster">${_rowsF.map(r=>`<div class="lr-arow"><span class="s">${esc(r.serial??'—')}</span><span class="n${r.name?'':' miss'}">${esc(r.name||('⚑ '+(r.passport||'—')))}</span><span class="p">${esc(r.passport||'—')}</span></div>`).join('')}</div>`:'';
  const num=b._num!=null?b._num:(b.manh?b.manh.manh_number:''), mdate=b._mdate!=null?b._mdate:(b.manh?(b.manh.manh_date||''):''), hasManh=b.papers.some(p=>p.type==='manh');
  const tl=Object.fromEntries(ptKeys().map(k=>[k,ptLabel(k)]));   // registry-driven labels (G6)
  // the paper switch = a clear SEGMENTED CONTROL at the top of the confirm panel; it drives BOTH the
  // scan shown AND which stamps you confirm.
  const seg=papers.map((p,i)=>`<button class="lr-seg${i===_lrIdx?' on':''}" data-lr="${i}">${tl[p.type]||p.type}</button>`).join('');
  // ONLY this paper's expected stamp(s), OFF by default — the human verifies each on the scan, then
  // ticks it (nothing is auto-trusted). We zoom to what needs checking; the human confirms.
  const stampChk=(PAPER_STAMPS[cur.type]||[]).map(([k,lab])=>{
    const on=(k in st)?st[k]:false;
    return `<label class="lg-chk"><input type="checkbox" data-st="${k}" ${on?'checked':''}><span>${esc(t(lab))}</span></label>`; }).join('');
  const isManh=cur.type==='manh';
  $('#ikreview').innerHTML=`
    <div class="rvw-bar"><button class="icon ik-close" id="lr-close" title="${t('t_close')}">✕</button>
      <span class="rvw-t">⚖ ${t('lg_h')}${b.provisional?` · ${t('lg_provisional')}`:''}</span>
      <span style="flex:1"></span><span class="rvw-fn">${t('lg_names_ocr',rows.length)}</span></div>
    <div class="rvw-body">
      <div class="rvw-scan" id="lr-scan">${t('rv_loading')}</div>
      <div class="rvw-side">
        <div class="lr-seg-wrap">${seg}</div>
        ${isManh?`<div class="rfield"><label>${t('lg_id')}</label>
          <input id="lr-num" inputmode="numeric" value="${esc(num)}" placeholder="${esc(t('lg_manh_need'))}"></div>
          <div class="rfield"><label>${LANG==='ar'?'تاريخ المنح':'Grant date'}</label><input id="lr-mdate" type="date" value="${esc(isoDate(mdate))}"></div>`
          :`<div class="lr-hint">${num?`${esc(t('lg_id'))}: <b>${esc(num)}</b>`:esc(hasManh?t('lg_manh_need'):t('lg_manh_opt'))}</div>`}
        ${gapFields}
        <div class="rvw-check-h">${t('lg_stamps')} — ${tl[cur.type]||cur.type}</div>
        <div class="lr-stamps">${stampChk}</div>
        ${allBtn}${allList}
      </div>
    </div>
    <div class="rvw-foot"><button class="rvw-add" id="lr-save">${(hasManh||num)?t('lg_confirm_commit'):t('lg_anchor')}</button></div>`;
  $('#lr-close').onclick=closeIkReview;
  $('#lr-save').onclick=lrCommit;
  { const ab=$('#lr-all'); if(ab)ab.onclick=()=>{ _lrRead(); _lrBatch._showAll=!_lrBatch._showAll; renderLegalReview(); }; }
  $('#ikreview').querySelectorAll('[data-lr]').forEach(btn=>btn.onclick=()=>{ _lrRead(); _lrIdx=+btn.dataset.lr; renderLegalReview(); });
  lrPaintScan(cur);
}
async function lrPaintScan(paper){
  const box=$('#lr-scan'); if(!box)return;
  if(!paper||!paper.scan_path){ box.textContent=t('rv_noscan'); return; }
  const isOffice=/\.(xlsx|docx)$/i.test(paper.scan_path);
  // office → the SAME faithful LibreOffice PDF the PRINT feature uses. Render it with the SAME proven path
  // the print uses — scanImagesAll → page images (renders Word AND Excel faithfully) — then wrap it in the
  // scroll + zoom viewer. This replaces the pdf.js canvas re-render, which mis-rendered the text (spaced /
  // disconnected glyphs, EN + AR). scanImagesAll rasterizes a PDF and passes a raw image scan straight through.
  const src=isOffice ? _printPath(paper.scan_path) : paper.scan_path;
  // raster ONCE at rot=0 — the user's manual turn is applied as an INSTANT css transform inside _lrImgView
  // (no pdf.js re-render per press → the flip is immediate; print still bakes the saved rot independently).
  const imgs = src ? await scanImagesAll(src, 0, 6) : [];   // 6× DPI for the review → deeper sharp zoom (a big roster's cells)
  if(imgs.length){ _lrImgView(box, imgs, paper); return; }
  // FALLBACK — no PDF sibling yet (or an .xlsx that didn't render): the in-app docx-preview, now wrapped in
  // the SAME grab-pan + zoom viewer as the image path so the review is never a dead pane. Only if the doc
  // itself won't render do we drop to the download panel.
  if(isOffice){
    box.innerHTML=`<div class="lr-pan office" dir="ltr"><div class="lr-doc-loading">${t('rv_loading')}</div></div>`;
    if(await _lrOfficeView(box, paper)) return;                            // rendered in-app WITH zoom + pan
    const _doc=/\.docx$/i.test(paper.scan_path), _k=_doc?'Word':'Excel', _ic=_doc?'📄':'📊', u=await docUrl(paper.scan_path);
    box.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100%;gap:16px;text-align:center;padding:34px 24px">
        <div style="font-size:46px;line-height:1">${_ic}</div>
        <div style="line-height:1.6;color:var(--ink2);font-size:15px">${t('lr_xlsx').replace('{k}',_k)}</div>
        ${u?`<a href="${esc(u)}" download target="_blank" rel="noopener" style="padding:10px 18px;background:var(--copper);color:#15201d;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">⬇ ${t('lr_xlsx_dl').replace('{k}',_k)}</a>`:''}
      </div>`;
    return;
  }
  box.textContent=t('rv_noscan');
}
async function lrCommit(){
  const b=_lrBatch; if(!b)return; _lrRead();
  let rows=proposalRows(b);
  if(b._epFill) rows=rows.map(r=>{ const f=r.serial!=null&&b._epFill[+r.serial]; return f?{...r,name:f}:r; });   // apply the filled endpoint names
  const ep=legalEndpoints(rows), hasManh=b.papers.some(p=>p.type==='manh');
  const _loneManh=b.papers.length===1 && b.papers[0].type==='manh';
  const _canConn=(ep.fSerial!=null&&ep.lSerial!=null)&&!!(ep.fName||ep.lName);   // منح-matchable: interval + ≥1 endpoint name
  if(!_loneManh && !_canConn){ toast(t('lr_endname_need'));   // block only when NOTHING can connect (no interval / both ends blank)
    const inp=[...document.querySelectorAll('#ikreview .lr-epname')].find(x=>!x.value.trim()); if(inp)inp.focus(); return; }
  let id=(b._num||'').trim();
  const s=b._stamps||{};
  const stamps={ taahud:!!s.taahud, istco:!!s.istco, istmo:!!s.istmo, manh:!!s.manh };
  if(!id){
    if(hasManh){ toast(t('lg_need_id'));               // a منح is here → jump to it to type the number
      const mi=b.papers.findIndex(p=>p.type==='manh'); if(mi>=0){_lrIdx=mi; renderLegalReview();} return; }
    let tgt=await findMergeTarget(rows);               // shares passports with a committed provisional batch?
    if(!tgt) tgt=await findWaitingManh(ep, rows);       // OR a منح that committed BEFORE its roster (waiting)
    if(tgt){ const b0=$('#lr-save'); if(b0){b0.disabled=true;b0.textContent=t('lg_saving');}
      try{ const res=await commitMerged(b.papers, rows, tgt, stamps);
        b.papers.forEach(p=>{ const jk=IK.find(x=>x.hash&&x.hash===p.scan_hash); if(jk){jk.state='landed'; if(jk.hash)delete _ikPending[jk.hash];} });
        toast(t('lg_merged')+batchLabel(tgt)+`  ·  ${res.linked}/${res.total}`);
        closeIkReview(); ikRender(); search($('#q')?$('#q').value:''); }
      catch(e){ toast(t('lg_savefail')+((e&&e.message)||e)); if(b0){b0.disabled=false;b0.textContent=t('lg_confirm_commit');} }
      return; }
    id=provKey(ep); }
  if(hasManh && b.papers.length===1 && id){             // a lone منح → complete a matching provisional batch
    const cands=manhCandidates(b.papers[0], await loadProvisionalBatches());
    if(cands.length===1){ const b0=$('#lr-save'); if(b0){b0.disabled=true;b0.textContent=t('lg_saving');}
      try{ b.papers[0].manh_number=id; await adoptManh(b.papers[0], cands[0].batch_id, reviewRot(cands[0].rot));
        b.papers.forEach(p=>{ const jk=IK.find(x=>x.hash&&x.hash===p.scan_hash); if(jk){jk.state='landed'; if(jk.hash)delete _ikPending[jk.hash];} });
        closeIkReview(); ikRender(); search($('#q')?$('#q').value:''); }
      catch(e){ toast(t('lg_savefail')+((e&&e.message)||e)); if(b0){b0.disabled=false;b0.textContent=t('lg_confirm_commit');} }
      return; } }
  const manh=b.papers.find(p=>p.type==='manh')||{};
  const scans={taahud:(b.papers.find(p=>p.type==='taahud')||{}).scan_path,
    istimara:(b.papers.find(p=>p.type==='istimara')||{}).scan_path, manh:manh.scan_path};
  const btn=$('#lr-save'); if(btn){btn.disabled=true;btn.textContent=t('lg_saving');}
  try{
    const res=await commitLegalBatch({batch_id:id, manh_date:(b._mdate||manh.manh_date)||null,
      interval_from:manh.interval_from??ep.fSerial, interval_to:manh.interval_to??ep.lSerial, rows, scans, stamps,
      first_name:ep.fName, last_name:ep.lName, first_passport:ep.fPass, last_passport:ep.lPass, provisional:!hasManh,
      rot: reviewRot(null),                              // the reviewer's rotations → saved so print/عرض match
      paperIds:b.papers.map(p=>p.paper_id).filter(Boolean)});
    b.papers.forEach(p=>{ const jk=IK.find(x=>x.hash&&x.hash===p.scan_hash); if(jk){jk.state='landed'; if(jk.hash)delete _ikPending[jk.hash];} });
    toast((hasManh?t('lg_saved')+id:t('lg_saved_prov')+provLabel(ep))+`  ·  ${res.linked}/${res.total}`);
    closeIkReview(); ikRender(); search($('#q')?$('#q').value:'');
  }catch(e){ toast(t('lg_savefail')+((e&&e.message)||e)); if(btn){btn.disabled=false;btn.textContent=t('lg_confirm_commit');} }
}

$('#ik-list').addEventListener('click',e=>{
  const vt=e.target.closest('[data-ikview]'); if(vt){ _ikView=vt.dataset.ikview; ikRender(); return }   // compact ⇄ detailed
  const lr=e.target.closest('[data-legalreview]'); if(lr){openLegalReview(lr.getAttribute('data-legalreview'));return}
  const kr=e.target.closest('[data-kidreview]'); if(kr){openKidReview(kr.getAttribute('data-kidreview'));return}   // a packet child's review
  const pt=e.target.closest('[data-pktoggle]'); if(pt){ const jj=IK.find(x=>x.id===+pt.dataset.pktoggle);          // collapse/expand a family
    if(jj){ jj.pkOpen=(jj.pkOpen===false); ikRender(); } return }
  const rv=e.target.closest('[data-review]'); if(rv){openIkReview(+rv.dataset.review);return}
  const rm=e.target.closest('[data-rm]'); if(rm){ikRemove(+rm.dataset.rm);return}
  const rt=e.target.closest('[data-retry]'); if(rt)ikRetry(+rt.dataset.retry);
});
$('#q').addEventListener('input',onType);
$('#filters').addEventListener('click',e=>{
  const sub=e.target.closest('[data-inc]'); if(sub){ INC_SIDE=sub.dataset.inc; render(LAST); return; }   // pick passport/visa side
  const c=e.target.closest('[data-f]'); if(c){ if(c.dataset.f!=='incomplete') INC_SIDE='all'; FILTER=c.dataset.f; render(LAST); }  // leaving incomplete resets the side
});
$('#results').addEventListener('click',e=>{
  const pr=e.target.closest('[data-lawprint]');       // print straight from the card, without opening it
  if(pr){ const b=(LAWLAST||[]).find(x=>String(x.batch_id)===String(pr.dataset.lawprint)); if(b)printBatch(b); return; }
  const lb=e.target.closest('[data-batch]'); if(lb){openLawBatch(lb.dataset.batch);return}
  const row=e.target.closest('.row'); if(row&&row.dataset.id)openEmployee(row.dataset.id);});
$('#detail').addEventListener('click',e=>{const _lg=e.target.closest('[data-lawgo]');if(_lg){gotoLawBatch(_lg.dataset.lawgo);return;}if(e.target.closest('.d-close'))closeEmployee();if(e.target.closest('.d-print'))printEmployee();
  const f=e.target.closest('.d-face');if(f&&f.dataset.url)openLightbox(f.dataset.url)});
$('#lightbox').addEventListener('click',()=>$('#lightbox').classList.remove('on'));
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;
  if($('#lightbox').classList.contains('on'))$('#lightbox').classList.remove('on');
  else if($('#istimara').classList.contains('on'))istRequestClose();
  else if($('#legalform').classList.contains('on'))legalClose();
  else if($('#ikreview').classList.contains('on'))closeIkReview();
  else if($('#detail').classList.contains('on'))closeEmployee();
  else if($('#intake').classList.contains('on'))closeIntake()});
applyLang();
/* resume a remembered session */
(async()=>{try{const {data:{session}}=await sb.auth.getSession();if(session&&session.user)enterApp()}catch(_){}})();
/* BOOT-BEACON — the LAST line. It is true ONLY if the whole script executed with no mid-file halt
   (e.g. a ReferenceError before the button wiring). After ANY load-time change, verify window.__APP_BOOTED
   === true: it can't be fooled by hoisting the way "typeof fn === 'function'" can. Do not move it. */
window.__APP_BOOTED = true;
try{ if(typeof PERF!=='undefined' && !PERF.lazyPdf) ensurePdfjs(); }catch(_){}   // #5: flag off => eager-load like before
// ── BUILD STAMP: the version of the app.js ACTUALLY LOADED. Must match the ?v in index.html. If the
//    login screen shows an older build than what was just pushed, the DEPLOY is stale (not the code). ──
window.__APP_VER = 'v163';
try{ const _av=document.getElementById('appver'); if(_av)_av.textContent='build '+window.__APP_VER;
     console.info('%cICCMC dashboard '+window.__APP_VER,'color:#c5956b;font-weight:700'); }catch(_){}
