# الحاسبة الذكية — Smart Calculator

حاسبة ويب ثابتة (HTML + CSS + JavaScript) بدون أي مكتبات خارجية، بتصميم زجاجي (glassmorphism).

## المميزات

- **محرك حساب خاص بدون `eval()`**: أولوية العمليات، أرقام سالبة (`5×-3`)، أقواس تُغلق تلقائياً، ضرب ضمني (`2π` ، `2(3)`).
- **دقة صحيحة**: `0.1+0.2 = 0.3` ، `010+1 = 11` ، رسائل واضحة بدل `Infinity` / `NaN`.
- **نسبة مئوية ذكية**: `200 + 10% = 220` و `200 × 10% = 20`.
- **وضع علمي** (`fx`): `sin cos tan` وعكسها (`2nd`) ، `ln log √ x² xʸ n! 1/x π e` ، مع تبديل **DEG / RAD**.
- **سجل العمليات** (آخر 50 عملية، محفوظ في المتصفح) — اضغط على العملية لتحميلها أو على النتيجة لاستخدامها.
- **كيبورد كامل**: `0-9 . + - * / ^ % ! ( )` ، `Enter` أو `=` للنتيجة ، `Backspace` للحذف ، `Esc` أو `Delete` للمسح ، `P` = π ، ولصق تعبير بـ `Ctrl+V`.
- **شاشة بسطرين** مع معاينة حيّة للنتيجة، وتصغير تلقائي للخط، ونسخ النتيجة بزر واحد.
- **عربي / English** (RTL تلقائي) ، **وضع داكن / فاتح** ، **أرقام هندية** اختيارية (`١٢٣`).
- **إتاحة الاستخدام**: `aria-label` لكل زر، مؤشر focus واضح، دعم قارئات الشاشة، احترام `prefers-reduced-motion`.
- **PWA**: قابلة للتثبيت على الموبايل وتعمل بدون إنترنت.

## هيكل المشروع

| الملف | الوظيفة |
|---|---|
| `calc.js` | محرك الحساب (tokenizer → parser → evaluator) والتنسيق |
| `state.js` | منطق الأزرار (دالة نقية بدون DOM) |
| `script.js` | الواجهة: الأحداث، السجل، اللغة، الثيم |
| `style.css` | التصميم والثيمات والتجاوب |
| `sw.js` + `manifest.webmanifest` | PWA / العمل بدون إنترنت |
| `tests/` | اختبارات الوحدة (`node:test`) |

## التشغيل محلياً

افتح `index.html` مباشرة، أو شغّل سيرفراً بسيطاً (مطلوب لتجربة الـ PWA):

```bash
python3 -m http.server 8080   # ثم افتح http://localhost:8080
```

## الاختبارات

```bash
npm test      # يحتاج Node 18+ ، بدون تثبيت أي حزم
```

## النشر

الـ workflow في `.github/workflows/static.yml` يشغّل الاختبارات ثم ينشر الملفات المطلوبة فقط على GitHub Pages عند الدفع إلى `main`.

> ⚠️ **عند أي تعديل على الملفات** غيّر `VERSION` داخل `sw.js` (مثلاً `v2.0.1`) حتى يحصل المستخدمون على النسخة الجديدة بدل النسخة المخزنة.

## تخصيص

- **اللغة الافتراضية**: ثابت `DEFAULT_LANG` في `script.js` والسطر المقابل داخل `<head>` في `index.html`.
- **الألوان**: متغيرات CSS في أعلى `style.css` (`:root` للداكن و`:root[data-theme='light']` للفاتح).

---

Static, dependency-free smart calculator: custom expression engine (no `eval`), smart percentages, scientific mode with DEG/RAD,
history, full keyboard + paste support, Arabic/English (RTL), dark/light themes, optional Arabic-Indic digits, and an offline-capable PWA.
Run the tests with `npm test`.
