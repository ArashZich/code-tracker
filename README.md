# ردیاب کد برای VSCode

<p align="center">
  <img src="/vscode-extension/code.png" alt="لوگوی ردیاب کد" width="200">
</p>

<p align="center">
  ابزاری هوشمند برای پیگیری فعالیت‌های کدنویسی و نمایش آمار و ارقام در محیط VSCode
</p>

## معرفی

ردیاب کد یک افزونه قدرتمند برای VSCode است که به شما امکان می‌دهد فعالیت‌های کدنویسی خود را ردیابی کنید و الگوهای کاری و بهره‌وری خود را تحلیل کنید. با استفاده از این افزونه می‌توانید به راحتی مشاهده کنید که روی کدام پروژه‌ها، زبان‌ها و فایل‌ها وقت صرف می‌کنید و از این داده‌ها برای بهبود عادات کدنویسی خود استفاده کنید.

## امکانات

- **ردیابی زنده**: ضبط فعالیت‌های کدنویسی در زمان واقعی
- **داشبورد زیبا**: نمایش مصور داده‌های کدنویسی با نمودارهای متنوع
- **تفکیک زبان‌ها**: مشاهده آمار استفاده از زبان‌های برنامه‌نویسی مختلف
- **تحلیل پروژه‌ها**: زمان صرف شده روی هر پروژه
- **شاخص‌های بهره‌وری**: معیارهایی برای بهینه‌سازی زمان کدنویسی
- **همگام‌سازی ابری**: ذخیره و دسترسی به داده‌ها از چندین دستگاه
- **سبک و سریع**: تاثیر حداقلی روی عملکرد VSCode

## نصب و راه‌اندازی

### نصب افزونه VSCode

1. افزونه را از [مارکت‌پلیس VSCode](https://marketplace.visualstudio.com) نصب کنید
2. VSCode را مجدداً راه‌اندازی کنید
3. با کلیک روی آیکون ردیاب کد در نوار فعالیت، داشبورد را باز کنید
4. با یک نام کاربری ثبت‌نام کنید یا وارد شوید

### راه‌اندازی سرور بک‌اند (اختیاری)

برای همگام‌سازی داده‌ها بین چندین دستگاه، می‌توانید سرور بک‌اند را راه‌اندازی کنید:

#### استفاده از داکر (پیشنهادی)

```bash
# کپی کردن فایل محیطی نمونه
cd server
cp .env.example .env

# ویرایش فایل .env با تنظیمات دلخواه

# راه‌اندازی با داکر کامپوز
docker-compose up -d
```

#### راه‌اندازی دستی

```bash
# نصب وابستگی‌ها
cd server
npm install

# کپی کردن فایل محیطی نمونه
cp .env.example .env

# ویرایش فایل .env با تنظیمات دلخواه

# شروع سرور
npm start
```

## پیکربندی

افزونه گزینه‌های پیکربندی زیر را دارد:

- `codeTracker.serverUrl`: آدرس سرور ردیاب کد
- `codeTracker.username`: نام کاربری منحصر به فرد شما برای ردیابی
- `codeTracker.trackingEnabled`: فعال یا غیرفعال‌سازی ردیابی
- `codeTracker.syncInterval`: فاصله زمانی همگام‌سازی داده‌ها با سرور (به دقیقه)

## استفاده

### دستورات

افزونه دستورات زیر را فراهم می‌کند:

- `Code Tracker: Start Tracking Coding Activity`: شروع ردیابی فعالیت کدنویسی
- `Code Tracker: Stop Tracking Coding Activity`: توقف ردیابی
- `Code Tracker: Show Dashboard`: نمایش داشبورد برای مشاهده آمار
- `Code Tracker: Login`: ورود با نام کاربری
- `Code Tracker: Register`: ثبت نام یک نام کاربری جدید

### داشبورد

داشبورد نماهای مختلفی را ارائه می‌دهد:

1. **جدول زمانی فعالیت‌ها**: مشاهده فعالیت کدنویسی در طول زمان
2. **زبان‌ها**: تفکیک زبان‌های استفاده شده
3. **پروژه‌ها**: زمان صرف شده روی پروژه‌های مختلف
4. **فایل‌ها**: فایل‌های با بیشترین فعالیت
5. **بهره‌وری**: درک زمان‌های اوج بهره‌وری شما
6. **مقایسه**: مقایسه فعالیت بین دوره‌های زمانی مختلف

## حریم خصوصی

داده‌های کدنویسی شما در موارد زیر ذخیره می‌شوند:

- به صورت محلی در دستگاه شما در حافظه افزونه
- روی سرور بک‌اند اگر یکی پیکربندی کرده باشید

هیچ داده‌ای به سرورهای ما ارسال نمی‌شود مگر اینکه سرور بک‌اند خود را راه‌اندازی کرده باشید.

## گسترش

افزونه ردیاب کد به گونه‌ای طراحی شده که قابل گسترش باشد. شما می‌توانید:

- با استفاده از داده‌های فعالیت، نمایش‌های بصری اضافی بسازید
- به ابزارهای تحلیلی خود متصل شوید
- گزارش‌های سفارشی برای بهره‌وری تیم ایجاد کنید

## ساختار پروژه

```
code-tracker/
├── vscode-extension/         # افزونه VSCode
│   ├── package.json          # تنظیمات افزونه
│   ├── extension.js          # نقطه ورود افزونه
│   ├── services/             # سرویس‌های افزونه
│   │   ├── api.js            # ارتباط با API
│   │   ├── tracker.js        # ردیابی فعالیت‌ها
│   │   └── auth.js           # احراز هویت
│   ├── views/                # نماهای افزونه
│   │   └── dashboard.js      # مدیریت داشبورد
│   └── web/                  # فایل‌های وب
│       ├── index.html        # HTML اصلی
│       ├── styles.css        # استایل‌ها
│       └── dashboard.js      # منطق داشبورد
└── server/                   # بک‌اند
    ├── package.json          # وابستگی‌های سرور
    ├── server.js             # نقطه ورود سرور
    ├── models/               # مدل‌های داده
    │   ├── user.js           # مدل کاربر
    │   └── activity.js       # مدل فعالیت
    ├── routes/               # مسیرهای API
    │   ├── auth.js           # مسیرهای احراز هویت
    │   └── activity.js       # مسیرهای فعالیت
    ├── services/             # سرویس‌ها
    │   ├── auth.js           # منطق احراز هویت
    │   └── analytics.js      # تحلیل داده‌ها
    ├── middleware/           # میان‌افزارها
    │   └── auth.js           # میان‌افزارهای احراز هویت
    ├── utils/                # توابع کمکی
    │   └── helpers.js        # توابع کمکی عمومی
    ├── docker-compose.yml    # پیکربندی داکر کامپوز
    └── Dockerfile            # داکرفایل
```

## نحوه مشارکت

مشارکت‌ها با استقبال مواجه می‌شوند! لطفاً از این مراحل پیروی کنید:

1. مخزن را فورک کنید
2. یک شاخه ویژگی ایجاد کنید (`git checkout -b feature/amazing-feature`)
3. تغییرات خود را کامیت کنید (`git commit -m 'Add some amazing feature'`)
4. به شاخه خود پوش کنید (`git push origin feature/amazing-feature`)
5. یک Pull Request باز کنید

## عیب‌یابی

### مشکلات رایج

1. **ردیابی شروع نمی‌شود**
   - بررسی کنید که `codeTracker.trackingEnabled` در تنظیمات VSCode فعال باشد
   - بررسی کنید که با موفقیت وارد شده باشید

2. **داده‌ها همگام‌سازی نمی‌شوند**
   - بررسی کنید که آدرس سرور در `codeTracker.serverUrl` درست باشد
   - بررسی کنید که سرور در حال اجرا باشد
   - لاگ‌های سرور را برای خطاهای احتمالی بررسی کنید

3. **داشبورد داده‌ها را نمایش نمی‌دهد**
   - بررسی کنید که اتصال اینترنت فعال باشد
   - دستور `Code Tracker: Show Dashboard` را مجدداً اجرا کنید

### گزارش مشکلات

اگر با مشکلی مواجه شدید، لطفاً یک [Issue جدید](https://github.com/yourusername/code-tracker/issues) باز کنید و اطلاعات زیر را فراهم کنید:

- نسخه VSCode
- نسخه افزونه ردیاب کد
- مراحلی که منجر به مشکل شدند
- خروجی کنسول VSCode (Help > Toggle Developer Tools)

## مجوز

این پروژه تحت مجوز MIT منتشر شده است - برای جزئیات به فایل LICENSE مراجعه کنید.

## تشکر و قدردانی

- از [Chart.js](https://www.chartjs.org/) برای ایجاد نمودارهای زیبا
- از [Express](https://expressjs.com/) برای چارچوب سرور
- از [MongoDB](https://www.mongodb.com/) برای ذخیره‌سازی داده‌ها

---

ساخته شده با ❤️ توسط آرش
برای اطلاعات بیشتر، به [وبسایت پروژه](https://your-website.com) مراجعه کنید یا با [ایمیل شما](mailto:your-email@example.com) تماس بگیرید.