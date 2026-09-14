import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type User } from '@supabase/supabase-js';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
const clean = (v: unknown) => String(v ?? '').trim();
const json = (res: VercelResponse, status: number, body: unknown) => res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').json(body);
const error = (res: VercelResponse, message: string, status = 400) => json(res, status, { error: message });
const bodyOf = (req: VercelRequest) => typeof req.body === 'object' && req.body ? req.body as Record<string, unknown> : {};

interface ServiceRecord { id:string; providerId:string; providerName:string; name:string; premium?:boolean; featured?:boolean; expiresAt?:string; active:boolean }
interface PremiumOrder { id:string; serviceId:string; providerId:string; providerName:string; plan:'weekly'|'monthly'|'quarterly'; price:number; days:number; status:'pending'|'paid'|'rejected'; createdAt:string; paidAt?:string; expiresAt?:string; paymentRef?:string; payUrl?:string; orderId?:string }

const PLANS:Record<string,{price:number;days:number}> = {
  weekly:{price:5,days:7}, monthly:{price:15,days:30}, quarterly:{price:35,days:90}
};
const BINANCE_HOST = 'https://bpay.binanceapi.com';

async function rows<T>(table:string){ const {data,error:e}=await supabase.from(table).select('*').range(0,9999); if(e) throw e; return (data||[]) as T[]; }
async function one<T>(table:string,id:string){ const {data,error:e}=await supabase.from(table).select('*').eq('id',id).maybeSingle(); if(e) throw e; return data as T|null; }
async function add<T extends Record<string,unknown>>(table:string,record:T){ const {data,error:e}=await supabase.from(table).insert(record).select('id').single(); if(e) throw e; return data?.id as string; }
async function update(table:string,id:string,record:Record<string,unknown>){ const {error:e}=await supabase.from(table).update(record).eq('id',id); if(e) throw e; }
async function getUser(req:VercelRequest):Promise<User|null>{ const auth=clean(req.headers.authorization); if(!auth.toLowerCase().startsWith('bearer ')) return null; const {data,error:e}=await supabase.auth.getUser(auth.slice(7).trim()); return e||!data.user?null:data.user; }
async function requireUser(req:VercelRequest,res:VercelResponse){ const user=await getUser(req); if(!user){error(res,'يجب تسجيل الدخول',401);return null;} return user; }
function nonce(){ return randomBytes(16).toString('hex'); }
function signedHeaders(body:string){
  const certificate=clean(process.env.BINANCE_PAY_CERTIFICATE_SN), secret=clean(process.env.BINANCE_PAY_API_SECRET);
  if(!certificate||!secret) throw new Error('BINANCE_PAY_NOT_CONFIGURED');
  const timestamp=String(Date.now()), n=nonce();
  const payload=`${timestamp}\n${n}\n${body}\n`;
  const signature=createHmac('sha512',secret).update(payload).digest('hex').toUpperCase();
  return {'Content-Type':'application/json','BinancePay-Timestamp':timestamp,'BinancePay-Nonce':n,'BinancePay-Certificate-SN':certificate,'BinancePay-Signature':signature};
}
function validWebhookSignature(req:VercelRequest,raw:string){
  const secret=clean(process.env.BINANCE_PAY_API_SECRET); if(!secret)return false;
  const timestamp=clean(req.headers['binancepay-timestamp']), n=clean(req.headers['binancepay-nonce']), supplied=clean(req.headers['binancepay-signature']);
  if(!timestamp||!n||!supplied)return false;
  const expected=createHmac('sha512',secret).update(`${timestamp}\n${n}\n${raw}\n`).digest('hex').toUpperCase();
  try{return timingSafeEqual(Buffer.from(expected),Buffer.from(supplied.toUpperCase()));}catch{return false;}
}
function originOf(req:VercelRequest){ const proto=clean(req.headers['x-forwarded-proto'])||'https'; return `${proto}://${clean(req.headers.host)}`; }

async function activate(order:PremiumOrder, transactionId?:string){
  if(order.status==='paid') return order.expiresAt||null;
  const service=await one<ServiceRecord>('services',order.serviceId); if(!service) throw new Error('SERVICE_NOT_FOUND');
  const current=service.expiresAt && new Date(service.expiresAt).getTime()>Date.now() ? new Date(service.expiresAt).getTime() : Date.now();
  const expiresAt=new Date(current+order.days*86400000).toISOString();
  await update('services',service.id,{premium:true,featured:true,expiresAt});
  await update('premium_orders',order.id,{status:'paid',paidAt:new Date().toISOString(),expiresAt,paymentRef:transactionId||order.paymentRef});
  return expiresAt;
}

export default async function handler(req:VercelRequest,res:VercelResponse){
  try{
    const path='/' + (Array.isArray(req.query.path)?req.query.path.join('/'):clean(req.query.path));
    if(req.method==='POST'&&path==='/create'){
      const user=await requireUser(req,res); if(!user)return;
      const b=bodyOf(req), sid=clean(b.serviceId), plan=clean(b.plan); const selected=PLANS[plan];
      if(!selected)return error(res,'الخطة غير صالحة');
      const service=await one<ServiceRecord>('services',sid);
      if(!service||service.providerId!==user.id||!service.active)return error(res,'الخدمة غير موجودة أو غير مصرح بها',404);
      if(service.premium && (!service.expiresAt||new Date(service.expiresAt).getTime()>Date.now()))return error(res,'هذه الخدمة لديها Premium نشط بالفعل',409);
      const existing=(await rows<PremiumOrder>('premium_orders')).find(o=>o.serviceId===sid&&o.status==='pending');
      if(existing)return error(res,'لديك عملية دفع قيد التنفيذ',409);
      const merchantTradeNo=`HJN${Date.now()}${randomBytes(4).toString('hex').toUpperCase()}`.slice(0,32);
      const id=await add('premium_orders',{serviceId:sid,providerId:user.id,providerName:String(user.user_metadata?.full_name||user.user_metadata?.name||service.providerName),plan,price:selected.price,days:selected.days,status:'pending',createdAt:new Date().toISOString(),orderId:merchantTradeNo});
      try{
        const requestBody=JSON.stringify({env:{terminalType:'WEB'},merchantTradeNo,orderAmount:selected.price,currency:'USDT',goods:{goodsType:'02',goodsCategory:'D000',referenceGoodsId:sid,goodsName:`خِدمة TN Premium - ${plan}`,goodsDetail:`Premium ${selected.days} يوم`},buyer:{referenceBuyerId:user.id,buyerEmail:user.email||''},returnUrl:`${originOf(req)}/?premium=success&order=${encodeURIComponent(merchantTradeNo)}`,cancelUrl:`${originOf(req)}/?premium=cancelled&order=${encodeURIComponent(merchantTradeNo)}`});
        const response=await fetch(`${BINANCE_HOST}/binancepay/openapi/v2/order`,{method:'POST',headers:signedHeaders(requestBody),body:requestBody});
        const payment=await response.json() as {status?:string;code?:string;errorMessage?:string;data?:{prepayId?:string;checkoutUrl?:string;universalUrl?:string;deeplink?:string}};
        if(!response.ok||payment.status!=='SUCCESS'||!payment.data?.checkoutUrl) throw new Error(payment.errorMessage||`Binance Pay init failed: ${response.status}`);
        await update('premium_orders',id,{paymentRef:payment.data.prepayId||'',payUrl:payment.data.checkoutUrl});
        return json(res,201,{ok:true,id,price:selected.price,currency:'USDT',days:selected.days,paymentRef:payment.data.prepayId,payUrl:payment.data.checkoutUrl,universalUrl:payment.data.universalUrl||payment.data.checkoutUrl,webhook:`${originOf(req)}/api/binance/webhook`});
      }catch(e){ console.error(e); await update('premium_orders',id,{status:'rejected'}); if(e instanceof Error&&e.message==='BINANCE_PAY_NOT_CONFIGURED')return error(res,'Binance Pay غير مهيأ بعد على الخادم.',503); return error(res,'تعذر إنشاء رابط Binance Pay. تحقق من إعدادات Merchant API.',502); }
    }
    if(req.method==='POST'&&path==='/webhook'){
      const raw=typeof req.body==='string'?req.body:JSON.stringify(bodyOf(req));
      if(!validWebhookSignature(req,raw))return error(res,'توقيع Binance Pay غير صالح',401);
      const b=bodyOf(req), dataRaw=clean(b.data); let data:Record<string,unknown>={}; try{data=dataRaw?JSON.parse(dataRaw):{};}catch{return error(res,'بيانات webhook غير صالحة');}
      const merchantTradeNo=clean(data.merchantTradeNo), status=clean(b.bizStatus); if(!merchantTradeNo)return error(res,'merchantTradeNo مفقود');
      const order=(await rows<PremiumOrder>('premium_orders')).find(o=>o.orderId===merchantTradeNo); if(!order)return error(res,'الطلب غير معروف',404);
      if(status==='PAY_SUCCESS')await activate(order,clean(data.transactionId));
      else if(status==='PAY_CLOSED'&&order.status==='pending')await update('premium_orders',order.id,{status:'rejected'});
      return json(res,200,{returnCode:'SUCCESS',returnMessage:null});
    }
    if(req.method==='GET'&&path==='/status'){
      const user=await requireUser(req,res); if(!user)return;
      const orderId=clean(req.query.orderId); const order=(await rows<PremiumOrder>('premium_orders')).find(o=>o.providerId===user.id&&(o.id===orderId||o.orderId===orderId));
      if(!order)return error(res,'عملية الدفع غير موجودة',404);
      if(order.status==='pending'&&order.orderId){
        const requestBody=JSON.stringify({merchantTradeNo:order.orderId});
        const response=await fetch(`${BINANCE_HOST}/binancepay/openapi/order/query`,{method:'POST',headers:signedHeaders(requestBody),body:requestBody});
        const payload=await response.json() as {status?:string;data?:{status?:string;transactionId?:string;totalFee?:number|string;currency?:string}};
        const p=payload.data;
        if(payload.status==='SUCCESS'&&p?.status==='PAID'&&Number(p.totalFee)===order.price&&p.currency==='USDT')await activate(order,p.transactionId);
      }
      return json(res,200,{order:await one<PremiumOrder>('premium_orders',order.id)});
    }
    return error(res,'المسار غير موجود',404);
  }catch(e){console.error(e);return error(res,'حدث خطأ في خدمة Binance Pay',500);}
}
