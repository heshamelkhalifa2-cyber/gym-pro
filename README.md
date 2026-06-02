# 🏋️ GymPro — نظام إدارة الجيم

نظام إدارة جيم متكامل مبني بـ HTML/CSS/JavaScript + Supabase، جاهز للنشر على Vercel.

---

## 📋 المميزات

| الميزة | الوصف |
|--------|-------|
| 👥 **إدارة الأعضاء** | إضافة / تعديل / حذف الأعضاء مع كامل البيانات |
| 📅 **الاشتراكات** | شهري / 3 شهور / سنوي مع حساب تاريخ الانتهاء تلقائياً |
| ✅ **تسجيل الحضور** | Check-in برقم الهاتف أو ID |
| 💰 **المدفوعات** | تسجيل الدفعات وعرض الإجماليات |
| 📊 **Dashboard** | إحصائيات فورية + تنبيهات الاشتراكات المنتهية |
| 🌐 **4 لغات** | عربي / إنجليزي / تاغالوغ / هندي مع RTL/LTR |
| 📱 **Responsive** | يعمل على الجوال والكمبيوتر |

---

## 🚀 التشغيل السريع (5 دقائق)

### الخطوة 1: إعداد Supabase

1. اذهب إلى [supabase.com](https://supabase.com) وأنشئ حساباً مجانياً
2. أنشئ **New Project**
3. اذهب إلى **SQL Editor** وانسخ محتوى ملف `supabase-schema.sql` وشغّله
4. اذهب إلى **Settings > API** وانسخ:
   - `Project URL` → هذا هو `SUPABASE_URL`
   - `anon public` → هذا هو `SUPABASE_ANON_KEY`

### الخطوة 2: إنشاء حساب Admin في Supabase

1. اذهب إلى **Authentication > Users**
2. اضغط **Add User** وأنشئ حساب الأدمن بالإيميل وكلمة المرور

### الخطوة 3: تكوين ملف `index.html`

افتح `index.html` وعدّل هذا القسم:

```javascript
window.ENV = {
  SUPABASE_URL: 'https://YOUR_PROJECT_ID.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_ANON_KEY_HERE'
};
```

### الخطوة 4: النشر على Vercel

#### الطريقة السهلة (Drag & Drop):
1. اذهب إلى [vercel.com](https://vercel.com)
2. سجّل الدخول بـ GitHub
3. اسحب مجلد المشروع إلى Vercel

#### الطريقة الاحترافية (GitHub):
```bash
# 1. ارفع المشروع على GitHub
git init
git add .
git commit -m "Initial commit: GymPro v1.0"
git remote add origin https://github.com/YOUR_USERNAME/gym-pro.git
git push -u origin main

# 2. على Vercel: Import Project من GitHub
# 3. أضف Environment Variables في Vercel Dashboard:
#    SUPABASE_URL = ...
#    SUPABASE_ANON_KEY = ...
```

---

## 🏃 التشغيل المحلي

```bash
# الطريقة الأبسط - استخدم أي HTTP server
npx serve .

# أو
python3 -m http.server 3000

# افتح المتصفح على:
# http://localhost:3000
```

> **ملاحظة:** المشروع يعمل في **وضع التجريب** تلقائياً إذا لم يتم تكوين Supabase. يمكنك تجربة كل المميزات بدون قاعدة بيانات حقيقية.

---

## 🗄️ هيكل قاعدة البيانات

```
members
├── id (UUID)
├── name (VARCHAR)
├── phone (VARCHAR, UNIQUE)
├── email (VARCHAR)
├── subscription_type (monthly|quarterly|yearly)
├── subscription_start (DATE)
├── subscription_end (DATE)
├── status (active|expired) ← يُحدَّث تلقائياً
├── notes (TEXT)
└── created_at, updated_at

payments
├── id (UUID)
├── member_id → members.id
├── amount (DECIMAL)
├── payment_date (DATE)
├── notes (TEXT)
└── created_at

checkins
├── id (UUID)
├── member_id → members.id
├── checkin_time (TIMESTAMPTZ)
└── date (DATE)
```

---

## 📁 هيكل الملفات

```
gym-pro/
├── index.html                 # الصفحة الرئيسية (SPA)
├── vercel.json                # إعدادات Vercel
├── supabase-schema.sql        # SQL لإنشاء الجداول
├── .env.example               # نموذج متغيرات البيئة
├── .gitignore
├── README.md
└── src/
    ├── app.js                 # منطق التطبيق الرئيسي
    ├── styles/
    │   └── main.css           # نظام التصميم الكامل
    ├── lib/
    │   ├── i18n.js            # نظام الترجمات
    │   └── utils.js           # دوال مساعدة
    └── i18n/
        ├── ar.json            # 🇸🇦 العربية
        ├── en.json            # 🇺🇸 English
        ├── tl.json            # 🇵🇭 Tagalog
        └── hi.json            # 🇮🇳 हिंदी
```

---

## 🔐 الأمان

- **Supabase Auth**: تسجيل الدخول الآمن
- **Row Level Security (RLS)**: البيانات محمية على مستوى قاعدة البيانات
- **Anon Key فقط**: لا service key في الكود
- **HTTPS**: Vercel يوفر SSL تلقائياً

---

## 🌐 إضافة لغة جديدة

1. انسخ `src/i18n/en.json` إلى `src/i18n/fr.json` مثلاً
2. ترجم جميع القيم
3. في `src/app.js` أضف في `LANG_DATA`:
   ```javascript
   fr: { flag: '🇫🇷', name: 'Français' }
   ```
4. في `index.html` أضف زر اللغة في dropdown

---

## 🗺️ خارطة الطريق (SaaS)

| المرحلة | المميزات |
|---------|----------|
| **v1.0** ✅ | MVP - الأساسيات كاملة |
| **v1.1** | Staff accounts + صلاحيات |
| **v1.2** | تقارير PDF قابلة للطباعة |
| **v1.3** | إشعارات SMS/WhatsApp للتجديد |
| **v2.0** | Multi-gym + SaaS billing |

---

## 📞 الدعم

للأسئلة والمشاكل: افتح Issue على GitHub

---

**بُني بـ ❤️ | GymPro v1.0**
