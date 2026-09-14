import { api, auth } from './platform';

type Service = { id:string; name:string; premium?:boolean; featured?:boolean; expiresAt?:string; active?:boolean };

type Plan = { key:'weekly'|'monthly'|'quarterly'; name:string; days:number; price:number; badge?:string; note:string };

const plans:Plan[] = [
  { key:'weekly', name:'أسبوعي', days:7, price:5, note:'لتجربة الظهور المميز' },
  { key:'monthly', name:'شهري', days:30, price:15, badge:'الأكثر اختيارًا', note:'أفضل توازن بين السعر والانتشار' },
  { key:'quarterly', name:'ربع سنوي', days:90, price:35, badge:'أفضل قيمة', note:'للمهنيين الذين يريدون حضورًا مستمرًا' },
];

const css = `
.px-backdrop{position:fixed;inset:0;z-index:12000;background:rgba(2,7,18,.72);backdrop-filter:blur(14px);display:grid;place-items:center;padding:18px;direction:rtl}
.px-modal{width:min(980px,100%);max-height:min(900px,94vh);overflow:auto;background:linear-gradient(145deg,#0b1220,#111827 58%,#17120a);border:1px solid rgba(255,255,255,.12);border-radius:30px;box-shadow:0 35px 100px rgba(0,0,0,.55);color:#fff;padding:28px}
.px-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.px-kicker{color:#fbbf24;font-weight:900;font-size:12px;letter-spacing:.08em}.px-head h2{margin:6px 0;font-size:clamp(25px,4vw,38px)}.px-head p{margin:0;color:#aeb9ca}.px-close{border:0;background:#ffffff10;color:#fff;width:42px;height:42px;border-radius:50%;font-size:24px;cursor:pointer}
.px-current{margin:22px 0;padding:16px 18px;border:1px solid rgba(251,191,36,.28);background:linear-gradient(90deg,rgba(251,191,36,.12),rgba(255,255,255,.035));border-radius:18px;display:flex;justify-content:space-between;gap:15px;align-items:center;flex-wrap:wrap}.px-current strong{color:#fcd34d}.px-current small{color:#c5cfdd}
.px-plans{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:18px 0}.px-plan{position:relative;text-align:right;padding:22px;border:1px solid rgba(255,255,255,.1);border-radius:22px;background:rgba(255,255,255,.045);cursor:pointer;transition:.2s}.px-plan:hover,.px-plan.selected{transform:translateY(-2px);border-color:#fbbf24;background:rgba(251,191,36,.08)}.px-plan-badge{position:absolute;top:12px;left:12px;font-size:11px;background:#fbbf24;color:#17120a;padding:5px 8px;border-radius:999px;font-weight:900}.px-plan h3{margin:0 0 8px}.px-price{font-size:30px;font-weight:950}.px-price small{font-size:13px;color:#aeb9ca}.px-plan p{color:#aeb9ca;font-size:13px;min-height:36px}
.px-field{margin-top:18px}.px-field label{display:block;font-weight:800;margin-bottom:7px}.px-select{width:100%;padding:13px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:#0b1220;color:#fff;font:inherit}.px-submit{width:100%;margin-top:18px;padding:14px 18px;border:0;border-radius:15px;background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#17120a;font-weight:950;font-size:16px;cursor:pointer}.px-submit:disabled{opacity:.55;cursor:not-allowed}.px-foot{margin-top:14px;text-align:center;color:#8995a8;font-size:12px}.px-benefits{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px}.px-benefit{padding:14px;border-radius:16px;background:#ffffff05;border:1px solid #ffffff0d}.px-benefit b{display:block;margin-bottom:4px}.px-benefit span{font-size:12px;color:#9eabbf}
@media(max-width:720px){.px-modal{padding:20px;border-radius:22px}.px-plans,.px-benefits{grid-template-columns:1fr}.px-plan p{min-height:0}}
`;

function installStyle(){ if(document.getElementById('premium-style')) return; const s=document.createElement('style');s.id='premium-style';s.textContent=css;document.head.appendChild(s); }
function esc(v:string){return v.replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]||c));}
function activePremium(s:Service){return Boolean(s.premium && (!s.expiresAt || new Date(s.expiresAt).getTime()>Date.now()));}

async function openPremium(){
  installStyle();
  if(!auth.isSignedIn()){ alert('سجّل الدخول أولاً لتفعيل Premium.'); return; }
  const root=document.createElement('div'); root.className='px-backdrop'; root.innerHTML=`<section class="px-modal" role="dialog" aria-modal="true" aria-label="Premium">
    <div class="px-head"><div><span class="px-kicker">خِدمة PRO</span><h2>اجعل خدمتك في المقدمة</h2><p>ظهور أعلى، شارة Premium، وثقة أكبر لدى العملاء.</p></div><button class="px-close" id="px-close">×</button></div>
    <div id="px-current"></div>
    <div class="px-plans">${plans.map((p,i)=>`<button type="button" class="px-plan ${i===1?'selected':''}" data-plan="${p.key}">${p.badge?`<span class="px-plan-badge">${p.badge}</span>`:''}<h3>${p.name}</h3><div class="px-price">${p.price}<small> د.ت</small></div><p>${p.note}</p><small>${p.days} يوم من Premium</small></button>`).join('')}</div>
    <div class="px-field"><label for="px-service">اختر الخدمة التي تريد تمييزها</label><select id="px-service" class="px-select"><option value="">جاري تحميل خدماتك…</option></select></div>
    <button id="px-submit" class="px-submit">متابعة إلى الدفع الآمن</button>
    <div class="px-benefits"><div class="px-benefit"><b>★ ظهور مميز</b><span>تظهر خدمتك قبل الخدمات العادية عند ترتيب النتائج.</span></div><div class="px-benefit"><b>✓ شارة Premium</b><span>هوية بصرية واضحة تساعد العميل على اكتشافك بسرعة.</span></div><div class="px-benefit"><b>⚡ تفعيل سريع</b><span>بعد نجاح الدفع يتم تفعيل المدة تلقائيًا.</span></div></div>
    <div class="px-foot">الدفع يتم عبر بوابة الدفع المهيأة للموقع. لا نحفظ بيانات البطاقة داخل خِدمة.</div>
  </section>`;
  document.body.appendChild(root);
  root.querySelector('#px-close')?.addEventListener('click',()=>root.remove());
  root.addEventListener('click',e=>{if(e.target===root)root.remove()});
  const current=root.querySelector('#px-current') as HTMLElement;
  const select=root.querySelector('#px-service') as HTMLSelectElement;
  try{
    const r=await api.get('/api/my-services'); const mine=(r.data.services||[]) as Service[];
    const premium=mine.filter(activePremium);
    current.innerHTML=premium.length?`<div class="px-current"><div><strong>Premium نشط</strong><br><small>${premium.map(s=>esc(s.name)).join('، ')}</small></div><small>ينتهي تلقائيًا حسب تاريخ الانتهاء</small></div>`:'<div class="px-current"><div><strong>Premium غير نشط</strong><br><small>اختر خدمة وخطة للبدء.</small></div></div>';
    const available=mine.filter(s=>s.active!==false && !activePremium(s));
    select.innerHTML=available.length?available.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} — ${esc(s.city||'')}</option>`).join(''):'<option value="">لا توجد خدمة مؤهلة حاليًا</option>';
    const submit=root.querySelector('#px-submit') as HTMLButtonElement; submit.disabled=!available.length;
    let selected:'weekly'|'monthly'|'quarterly'='monthly';
    root.querySelectorAll<HTMLElement>('[data-plan]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.plan as typeof selected;root.querySelectorAll('.px-plan').forEach(x=>x.classList.remove('selected'));b.classList.add('selected')}));
    submit.addEventListener('click',async()=>{
      if(!select.value)return; submit.disabled=true; submit.textContent='جاري إنشاء عملية الدفع…';
      try{ const response=await api.post('/api/premium-orders',{serviceId:select.value,plan:selected}); const payUrl=response.data?.payUrl; if(payUrl){ location.href=payUrl; return; } throw new Error(response.data?.error||'تعذر إنشاء الدفع'); }
      catch(e){ alert(e instanceof Error?e.message:'تعذر بدء الدفع. حاول مرة أخرى.'); submit.disabled=false; submit.textContent='متابعة إلى الدفع الآمن'; }
    });
  }catch{ current.innerHTML='<div class="px-current"><strong>تعذر تحميل خدماتك.</strong><small>حاول مرة أخرى.</small></div>'; }
}

function addPremiumButton(){
  if(document.getElementById('premium-launcher')) return;
  const b=document.createElement('button'); b.id='premium-launcher'; b.setAttribute('aria-label','فتح Premium'); b.textContent='♛ Premium';
  b.style.cssText='position:fixed;right:20px;bottom:20px;z-index:11000;border:1px solid #fbbf24aa;border-radius:999px;padding:12px 18px;background:linear-gradient(135deg,#111827,#3b2a0a);color:#fcd34d;font-weight:950;box-shadow:0 14px 35px #0006;cursor:pointer;direction:rtl';
  b.addEventListener('click',openPremium); document.body.appendChild(b);
}

function init(){installStyle();addPremiumButton();document.querySelectorAll<HTMLAnchorElement>('a[href="#premium"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();openPremium()}));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
`