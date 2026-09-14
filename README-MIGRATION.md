# نقل خِدمة (Haja-Naar) خارج AppDeploy

هذا الإصدار يزيل الاعتماد البرمجي على `@appdeploy/client` و`@appdeploy/sdk` ويجهز المشروع للعمل مع:

- GitHub للمصدر
- Vercel للواجهة وAPI Functions
- Supabase للمصادقة وقاعدة البيانات والتخزين
- Konnect للدفع Premium (اختياري حتى تضبط الأسرار)

## 1) Supabase
1. أنشئ مشروع Supabase.
2. افتح SQL Editor وشغّل `supabase-schema.sql` كاملًا.
3. من Authentication فعّل Google OAuth واضبط Google Client ID/Secret في Supabase.
4. أضف عنوان موقع Vercel إلى Redirect URLs، مثل `https://YOUR-SITE.vercel.app/**`.
5. من Storage يجب أن ترى bucket باسم `haja-naar` وهو public.

## 2) Vercel environment variables
أضف القيم من `.env.example` في Vercel. لا تضع `SUPABASE_SERVICE_ROLE_KEY` أو مفاتيح Konnect داخل كود الواجهة.

## 3) GitHub
ارفع جميع ملفات المشروع، ثم اربط المستودع بـ Vercel. Build command: `npm run build`، وOutput: `dist`.

## 4) مهم جدًا: البيانات القديمة
ملف ZIP المصدر لا يحتوي بيانات قاعدة AppDeploy (الخدمات، التقييمات، الطلبات...). لذلك هذا النقل يحافظ على **الكود** لكنه لا ينقل البيانات القديمة تلقائيًا. قبل إيقاف AppDeploy، صدّر البيانات إن كانت لديك طريقة متاحة، أو انقلها يدويًا إلى جداول Supabase.

## 5) اختبار بعد النشر
- `/api/_healthcheck`
- الصفحة الرئيسية
- تسجيل Google
- إضافة خدمة
- التقييم والبلاغ
- لوحة الإدارة للحساب المصرح
- رفع صورة الملف ومعرض الأعمال
- Premium بعد ضبط Konnect

### ملاحظة
الإصدار الحالي متوافق مع نفس مسارات `/api/...` التي كان يستخدمها المشروع، لذلك لم نعد بحاجة إلى AppDeploy Client في الواجهة.
