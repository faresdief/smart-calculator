/*
 * script.js — واجهة الحاسبة (DOM فقط). المنطق في calc.js و state.js.
 */
(function () {
    'use strict';

    const Calc = window.CalcEngine;
    const State = window.CalcState;

    /** اللغة الافتراضية لأول زيارة. غيّرها إلى 'en' (وفي <head> داخل index.html أيضاً) لو أردت الإنجليزية. */
    const DEFAULT_LANG = 'ar';
    const HISTORY_LIMIT = 50;
    const STORE_PREFIX = 'smartcalc.';

    /* ------------------------------------------------------------------ */
    /* النصوص (عربي / English)                                            */
    /* ------------------------------------------------------------------ */
    const STRINGS = {
        ar: {
            title: 'الحاسبة الذكية',
            history: 'السجل',
            sci: 'الوضع العلمي',
            angle_deg: 'الزوايا بالدرجات — اضغط للتحويل إلى راديان',
            angle_rad: 'الزوايا بالراديان — اضغط للتحويل إلى درجات',
            digits: 'أرقام هندية (٠١٢٣)',
            lang: 'التبديل إلى الإنجليزية',
            theme_light: 'التبديل إلى الوضع الفاتح',
            theme_dark: 'التبديل إلى الوضع الداكن',
            copy: 'نسخ النتيجة',
            clear: 'مسح الكل',
            del: 'حذف',
            percent: 'نسبة مئوية',
            divide: 'قسمة',
            multiply: 'ضرب',
            minus: 'طرح',
            plus: 'جمع',
            paren: 'قوس',
            equals: 'يساوي',
            decimal: 'فاصلة عشرية',
            second: '2nd — الدوال العكسية',
            sin: 'جيب',
            cos: 'جيب التمام',
            tan: 'ظل',
            asin: 'معكوس الجيب',
            acos: 'معكوس جيب التمام',
            atan: 'معكوس الظل',
            pi: 'باي',
            ln: 'لوغاريتم طبيعي',
            log: 'لوغاريتم عشري',
            sqrt: 'الجذر التربيعي',
            square: 'مربع',
            power: 'أُس',
            lparen: 'قوس مفتوح',
            rparen: 'قوس مغلق',
            fact: 'مضروب',
            inv: 'مقلوب',
            euler: 'ثابت أويلر',
            history_empty: 'لا توجد عمليات سابقة بعد.',
            history_clear: 'مسح السجل',
            history_close: 'إغلاق السجل',
            h_load: 'تحميل العملية',
            h_use: 'استخدام النتيجة',
            copied: 'تم نسخ النتيجة',
            copy_failed: 'تعذّر النسخ',
            paste_failed: 'تعذّر لصق هذا النص',
            history_cleared: 'تم مسح السجل',
            offline: 'التطبيق جاهز للعمل بدون إنترنت',
            errors: {
                SYNTAX: 'صيغة غير صحيحة',
                DIV_ZERO: 'لا يمكن القسمة على صفر',
                DOMAIN: 'قيمة غير مسموحة لهذه العملية',
                OVERFLOW: 'الرقم كبير جدًا',
                EMPTY: 'صيغة غير صحيحة'
            }
        },
        en: {
            title: 'Smart Calculator',
            history: 'History',
            sci: 'Scientific mode',
            angle_deg: 'Angles in degrees — tap for radians',
            angle_rad: 'Angles in radians — tap for degrees',
            digits: 'Arabic-Indic digits (٠١٢٣)',
            lang: 'Switch to Arabic',
            theme_light: 'Switch to light mode',
            theme_dark: 'Switch to dark mode',
            copy: 'Copy result',
            clear: 'Clear all',
            del: 'Backspace',
            percent: 'Percent',
            divide: 'Divide',
            multiply: 'Multiply',
            minus: 'Subtract',
            plus: 'Add',
            paren: 'Parenthesis',
            equals: 'Equals',
            decimal: 'Decimal point',
            second: '2nd — inverse functions',
            sin: 'Sine',
            cos: 'Cosine',
            tan: 'Tangent',
            asin: 'Inverse sine',
            acos: 'Inverse cosine',
            atan: 'Inverse tangent',
            pi: 'Pi',
            ln: 'Natural logarithm',
            log: 'Base-10 logarithm',
            sqrt: 'Square root',
            square: 'Square',
            power: 'Power',
            lparen: 'Open parenthesis',
            rparen: 'Close parenthesis',
            fact: 'Factorial',
            inv: 'Reciprocal',
            euler: "Euler's number",
            history_empty: 'No calculations yet.',
            history_clear: 'Clear history',
            history_close: 'Close history',
            h_load: 'Load expression',
            h_use: 'Use result',
            copied: 'Result copied',
            copy_failed: 'Copy failed',
            paste_failed: "Couldn't paste that text",
            history_cleared: 'History cleared',
            offline: 'Ready to work offline',
            errors: {
                SYNTAX: 'Invalid expression',
                DIV_ZERO: 'Cannot divide by zero',
                DOMAIN: 'Invalid input for this operation',
                OVERFLOW: 'Number too large',
                EMPTY: 'Invalid expression'
            }
        }
    };

    /* ------------------------------------------------------------------ */
    /* تخزين محلي آمن (قد يفشل في التصفح الخاص)                            */
    /* ------------------------------------------------------------------ */
    const store = {
        get(key, fallback) {
            try {
                const v = window.localStorage.getItem(STORE_PREFIX + key);
                return v === null ? fallback : v;
            } catch (e) {
                return fallback;
            }
        },
        set(key, value) {
            try {
                window.localStorage.setItem(STORE_PREFIX + key, value);
            } catch (e) {
                /* ignore */
            }
        }
    };

    /* ------------------------------------------------------------------ */
    /* الحالة والإعدادات                                                   */
    /* ------------------------------------------------------------------ */
    const root = document.documentElement;
    const $ = (sel, scope) => (scope || document).querySelector(sel);
    const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));

    const prefersLight = () => window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;

    const settings = {
        lang: store.get('lang', DEFAULT_LANG) === 'en' ? 'en' : 'ar',
        theme: store.get('theme', null) || (prefersLight() ? 'light' : 'dark'),
        digits: store.get('digits', 'latin') === 'arabic' ? 'arabic' : 'latin',
        angle: store.get('angle', 'deg') === 'rad' ? 'rad' : 'deg',
        sci: store.get('sci', '0') === '1',
        inv: false
    };

    let calc = State.initialState();
    let history = loadHistory();

    const els = {
        calculator: $('#calculator'),
        expr: $('#expr'),
        result: $('#result'),
        copy: $('#btn-copy'),
        sci: $('#sci'),
        btnSci: $('#btn-sci'),
        btn2nd: $('#btn-2nd'),
        btnAngle: $('#btn-angle'),
        btnDigits: $('#btn-digits'),
        btnLang: $('#btn-lang'),
        btnTheme: $('#btn-theme'),
        btnHistory: $('#btn-history'),
        history: $('#history-panel'),
        historyList: $('#history-list'),
        historyEmpty: $('#history-empty'),
        historyClear: $('#btn-history-clear'),
        historyClose: $('#btn-history-close'),
        toast: $('#toast'),
        themeColor: $('meta[name="theme-color"]')
    };
    const panelParts = () => [$('.toolbar'), $('.display'), els.sci, $('.keys'), $('#converter'), $('#keyboard-hint')];

    const t = (key) => {
        const dict = STRINGS[settings.lang];
        const value = key.split('.').reduce((o, k) => (o ? o[k] : undefined), dict);
        return value === undefined ? key : value;
    };

    /** يحوّل الأرقام إلى هندية إن كان الخيار مفعلاً. */
    const loc = (s) => (settings.digits === 'arabic' ? Calc.localizeNumerals(s) : s);

    /* ------------------------------------------------------------------ */
    /* العرض                                                               */
    /* ------------------------------------------------------------------ */
    function fitResult() {
        const el = els.result;
        el.style.fontSize = '';
        if (el.classList.contains('is-error')) return;
        const max = parseFloat(window.getComputedStyle(el).fontSize);
        const min = 16;
        if (el.scrollWidth <= el.clientWidth) return;
        let size = Math.max(min, Math.floor((max * el.clientWidth) / el.scrollWidth));
        el.style.fontSize = size + 'px';
        while (el.scrollWidth > el.clientWidth && size > min) {
            size -= 1;
            el.style.fontSize = size + 'px';
        }
    }

    function render() {
        const v = State.view(calc, { angle: settings.angle });

        els.expr.textContent = loc(v.top);
        els.expr.scrollLeft = els.expr.scrollWidth; // نُبقي آخر ما كُتب ظاهراً

        const isError = Boolean(v.error);
        els.result.classList.toggle('is-error', isError);
        els.result.dir = isError ? root.dir : 'ltr';
        const text = isError ? t('errors.' + v.error) : loc(v.main) || ' ';
        if (els.result.textContent !== text) els.result.textContent = text;
        fitResult();

        els.copy.disabled = !v.raw;
        els.copy.dataset.raw = v.raw;
    }

    let toastTimer = 0;
    function toast(message) {
        els.toast.textContent = message;
        els.toast.classList.add('show');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => els.toast.classList.remove('show'), 1800);
    }

    /* ------------------------------------------------------------------ */
    /* الإدخال                                                             */
    /* ------------------------------------------------------------------ */
    function press(key) {
        const before = calc.seq;
        calc = State.press(calc, key, { angle: settings.angle });
        if (calc.seq !== before && calc.entry) pushHistory(calc.entry);
        render();
    }

    function flash(key) {
        const btn = $('[data-key="' + (window.CSS && CSS.escape ? CSS.escape(key) : key) + '"]');
        if (!btn) return;
        btn.classList.add('pressed');
        window.setTimeout(() => btn.classList.remove('pressed'), 110);
    }

    els.calculator.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-key]');
        if (!btn || !els.calculator.contains(btn)) return;
        let key = btn.dataset.key;
        if (settings.inv && btn.dataset.keyInv) {
            key = btn.dataset.keyInv;
            setInv(false); // مثل حاسبات الهاتف: الدالة العكسية لمرة واحدة
        }
        press(key);
        if (e.detail > 0) btn.blur(); // بعد النقر بالماوس لا نترك الزر في الـ focus حتى لا يعيد Enter ضغطه
    });

    // اهتزاز خفيف على اللمس
    els.calculator.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch' && e.target.closest('[data-key]') && navigator.vibrate) {
            try {
                navigator.vibrate(8);
            } catch (err) {
                /* ignore */
            }
        }
    });

    function keyFromEvent(e) {
        const k = e.key;
        if (/^[۰-۹]$/.test(k)) return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(k));
        if (/^[0-9]$/.test(k)) return k;
        if (/^[٠-٩]$/.test(k)) return String('٠١٢٣٤٥٦٧٨٩'.indexOf(k));
        switch (k) {
            case '.':
            case ',':
            case '٫':
            case 'Decimal':
                return '.';
            case '+':
            case '-':
            case '*':
            case '/':
            case '^':
            case '%':
            case '!':
            case '(':
            case ')':
                return k;
            case 'x':
            case 'X':
                return '*';
            case 'Enter':
            case '=':
                return 'equals';
            case 'Backspace':
                return 'del';
            case 'Delete':
            case 'Escape':
                return 'clear';
            case 'p':
            case 'P':
                return 'pi';
            case 'e':
                return 'e';
            default:
                return null;
        }
    }

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
        if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable], summary')) return;

        if (!els.history.hidden) {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeHistory();
            }
            return;
        }

        // Enter/Space على زر عليه focus (تنقل بالكيبورد) = ضغط الزر نفسه
        if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('button')) return;

        const key = keyFromEvent(e);
        if (!key) return;
        e.preventDefault();
        flash(key);
        press(key);
    });

    /* ------------------------------------------------------------------ */
    /* لصق / نسخ                                                           */
    /* ------------------------------------------------------------------ */
    function sanitizePaste(text) {
        let s = Calc.delocalizeNumerals(String(text)).replace(/\s+/g, '').replace(/=$/, '').replace(/,/g, '');
        if (!s) return null;
        try {
            s = Calc.canonicalize(s);
        } catch (err) {
            return null;
        }
        return s && s.length <= State.MAX_LEN ? s : null;
    }

    document.addEventListener('paste', (e) => {
        if (!els.history.hidden || (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]'))) return;
        const data = e.clipboardData || window.clipboardData;
        if (!data) return;
        e.preventDefault();
        const expr = sanitizePaste(data.getData('text'));
        if (expr === null) {
            toast(t('paste_failed'));
            return;
        }
        calc = Object.assign({}, calc, { expr: expr, done: false, lastExpr: '', error: null });
        render();
    });

    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            /* نجرب الطريقة القديمة */
        }
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            ta.remove();
            return ok;
        } catch (err) {
            return false;
        }
    }

    els.copy.addEventListener('click', async () => {
        const raw = els.copy.dataset.raw;
        if (!raw) return;
        toast((await copyText(raw)) ? t('copied') : t('copy_failed'));
    });

    /* ------------------------------------------------------------------ */
    /* السجل                                                               */
    /* ------------------------------------------------------------------ */
    function loadHistory() {
        try {
            const arr = JSON.parse(store.get('history', '[]'));
            if (!Array.isArray(arr)) return [];
            return arr
                .filter((x) => x && typeof x.expr === 'string' && typeof x.result === 'string')
                .slice(0, HISTORY_LIMIT);
        } catch (err) {
            return [];
        }
    }

    function saveHistory() {
        store.set('history', JSON.stringify(history));
    }

    function pushHistory(entry) {
        const top = history[0];
        if (top && top.expr === entry.expr && top.result === entry.result) return;
        history.unshift({ expr: entry.expr, result: entry.result });
        history = history.slice(0, HISTORY_LIMIT);
        saveHistory();
        if (!els.history.hidden) renderHistory();
    }

    function renderHistory() {
        els.historyList.textContent = '';
        els.historyEmpty.hidden = history.length > 0;
        els.historyClear.disabled = history.length === 0;
        history.forEach((item, i) => {
            const li = document.createElement('li');
            li.dir = 'ltr'; // الأرقام والعمليات دائماً من اليسار لليمين حتى في الواجهة العربية

            const exprBtn = document.createElement('button');
            exprBtn.type = 'button';
            exprBtn.className = 'h-btn h-expr';
            exprBtn.dataset.index = String(i);
            exprBtn.dataset.action = 'load';
            exprBtn.textContent = loc(Calc.formatExpression(item.expr)) + ' =';
            exprBtn.setAttribute('aria-label', t('h_load') + ': ' + exprBtn.textContent);

            const resBtn = document.createElement('button');
            resBtn.type = 'button';
            resBtn.className = 'h-btn h-res';
            resBtn.dataset.index = String(i);
            resBtn.dataset.action = 'use';
            resBtn.textContent = loc(Calc.formatExpression(item.result));
            resBtn.setAttribute('aria-label', t('h_use') + ': ' + resBtn.textContent);

            li.append(exprBtn, resBtn);
            els.historyList.appendChild(li);
        });
    }

    function openHistory() {
        renderHistory();
        els.history.hidden = false;
        els.btnHistory.setAttribute('aria-expanded', 'true');
        panelParts().forEach((p) => p && p.setAttribute('inert', ''));
        els.historyClose.focus();
    }

    function closeHistory() {
        els.history.hidden = true;
        els.btnHistory.setAttribute('aria-expanded', 'false');
        panelParts().forEach((p) => p && p.removeAttribute('inert'));
        els.btnHistory.focus();
    }

    els.btnHistory.addEventListener('click', () => (els.history.hidden ? openHistory() : closeHistory()));
    els.historyClose.addEventListener('click', closeHistory);
    els.historyClear.addEventListener('click', () => {
        history = [];
        saveHistory();
        renderHistory();
        toast(t('history_cleared'));
    });
    els.historyList.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-index]');
        if (!btn) return;
        const item = history[Number(btn.dataset.index)];
        if (!item) return;
        if (btn.dataset.action === 'load') {
            calc = Object.assign(State.initialState(), { seq: calc.seq, expr: item.expr });
        } else {
            calc = Object.assign(State.initialState(), { seq: calc.seq, expr: item.result, done: true, lastExpr: item.expr });
        }
        render();
        closeHistory();
    });

    /* ------------------------------------------------------------------ */
    /* الإعدادات: ثيم / لغة / أرقام / زوايا / وضع علمي                      */
    /* ------------------------------------------------------------------ */
    function applyTheme() {
        root.setAttribute('data-theme', settings.theme);
        if (els.themeColor) els.themeColor.setAttribute('content', settings.theme === 'light' ? '#f1f2ee' : '#141716');
        els.btnTheme.setAttribute('aria-label', t(settings.theme === 'dark' ? 'theme_light' : 'theme_dark'));
        els.btnTheme.title = els.btnTheme.getAttribute('aria-label');
    }

    function applyAngle() {
        els.btnAngle.textContent = settings.angle === 'deg' ? 'DEG' : 'RAD';
        const label = t(settings.angle === 'deg' ? 'angle_deg' : 'angle_rad');
        els.btnAngle.setAttribute('aria-label', label);
        els.btnAngle.title = label;
    }

    function applyDigits() {
        els.btnDigits.setAttribute('aria-pressed', String(settings.digits === 'arabic'));
        $$('[data-digit]').forEach((b) => {
            b.textContent = loc(b.dataset.digit);
        });
    }

    function applySci() {
        els.sci.hidden = !settings.sci;
        els.btnSci.setAttribute('aria-pressed', String(settings.sci));
    }

    function setInv(on) {
        settings.inv = on;
        els.btn2nd.setAttribute('aria-pressed', String(on));
        $$('[data-key-inv]').forEach((b) => {
            b.textContent = on ? b.dataset.labelInv : b.dataset.label;
            const k = on ? b.dataset.i18nLabelInv : b.dataset.i18nLabel;
            b.setAttribute('aria-label', t(k));
            b.title = t(k);
        });
    }

    function applyLang() {
        const lang = settings.lang;
        root.lang = lang;
        root.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.title = lang === 'ar' ? 'الحاسبة الذكية | Smart Calculator' : 'Smart Calculator | الحاسبة الذكية';
        $$('[data-i18n]').forEach((el) => {
            el.textContent = t(el.dataset.i18n);
        });
        $$('[data-i18n-label]').forEach((el) => {
            const k = settings.inv && el.dataset.i18nLabelInv ? el.dataset.i18nLabelInv : el.dataset.i18nLabel;
            el.setAttribute('aria-label', t(k));
            // تلميح عند التمرير للأزرار الصغيرة فقط
            if (el.classList.contains('icon-btn') || el.classList.contains('btn-sci')) el.title = t(k);
        });
        els.btnLang.textContent = lang === 'ar' ? 'EN' : 'ع';
        els.btnLang.setAttribute('aria-label', t('lang'));
        els.btnLang.title = t('lang');
        els.btnLang.lang = lang === 'ar' ? 'en' : 'ar';
        applyTheme();
        applyAngle();
        if (!els.history.hidden) renderHistory();
    }

    els.btnTheme.addEventListener('click', () => {
        settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
        store.set('theme', settings.theme);
        applyTheme();
    });

    els.btnLang.addEventListener('click', () => {
        settings.lang = settings.lang === 'ar' ? 'en' : 'ar';
        store.set('lang', settings.lang);
        applyLang();
        render();
    });

    els.btnDigits.addEventListener('click', () => {
        settings.digits = settings.digits === 'arabic' ? 'latin' : 'arabic';
        store.set('digits', settings.digits);
        applyDigits();
        if (!els.history.hidden) renderHistory();
        render();
    });

    els.btnAngle.addEventListener('click', () => {
        settings.angle = settings.angle === 'deg' ? 'rad' : 'deg';
        store.set('angle', settings.angle);
        applyAngle();
        render();
    });

    els.btnSci.addEventListener('click', () => {
        settings.sci = !settings.sci;
        store.set('sci', settings.sci ? '1' : '0');
        applySci();
        render();
    });

    els.btn2nd.addEventListener('click', () => setInv(!settings.inv));

    // لو لم يختر المستخدم ثيماً بنفسه نتبع إعداد النظام
    if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: light)');
        const onChange = () => {
            if (store.get('theme', null) === null) {
                settings.theme = mq.matches ? 'light' : 'dark';
                applyTheme();
            }
        };
        if (mq.addEventListener) mq.addEventListener('change', onChange);
    }

    window.addEventListener('resize', fitResult);

    /* ------------------------------------------------------------------ */
    /* تشغيل                                                               */
    /* ------------------------------------------------------------------ */
    applyLang();
    applyDigits();
    applySci();
    setInv(false);
    render();

    // PWA: يعمل بدون إنترنت بعد أول زيارة (فقط عبر http/https)
    if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch(() => {});
        });
    }
})();

/* Bundled converter: keep identical to converter.js for the existing deployment file list. */
(function (root, factory) {
    'use strict';
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.UnitConverter = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    const units = {
        length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 },
        mass: { mg: 0.000001, g: 0.001, kg: 1, t: 1000, oz: 0.028349523125, lb: 0.45359237 }
    };
    function number(value) {
        if (typeof value !== 'string' && typeof value !== 'number') throw new Error('INVALID');
        const s = String(value).trim().replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/٫/g, '.');
        if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(s)) throw new Error('INVALID');
        const n = Number(s);
        if (!Number.isFinite(n)) throw new Error('INVALID');
        return n;
    }
    function convert(value, category, from, to, rate) {
        const n = number(value);
        let result;
        if (category === 'currency') {
            if (!['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED'].includes(from) || !['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED'].includes(to)) throw new Error('INVALID');
            const r = from === to ? 1 : number(rate);
            if (r <= 0) throw new Error('RATE');
            result = n * r;
        } else {
            const group = units[category];
            if (!group || !Object.hasOwn(group, from) || !Object.hasOwn(group, to)) throw new Error('INVALID');
            result = n * (group[from] / group[to]);
        }
        if (!Number.isFinite(result) || (result === 0 && n !== 0)) throw new Error('RANGE');
        return Object.is(result, -0) ? 0 : result;
    }
    const currencies = ['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED'];
    const maxAge = 48 * 60 * 60 * 1000;
    function validateRates(data, now = Date.now()) {
        const updated = data && data.time_last_update_unix * 1000;
        if (!data || data.result !== 'success' || data.base_code !== 'USD' || !Number.isFinite(updated) ||
            updated > now + 5 * 60 * 1000 || now - updated > maxAge) throw new Error('STALE');
        const rates = {};
        for (const code of currencies) {
            const value = data.rates && data.rates[code];
            if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new Error('RATE');
            rates[code] = value;
        }
        if (rates.USD !== 1) throw new Error('RATE');
        return { result: 'success', base_code: 'USD', time_last_update_unix: updated / 1000, rates };
    }
    function exchangeRate(data, from, to, now = Date.now()) {
        const valid = validateRates(data, now);
        if (!currencies.includes(from) || !currencies.includes(to)) throw new Error('INVALID');
        const result = valid.rates[to] / valid.rates[from];
        if (!Number.isFinite(result) || result <= 0) throw new Error('RATE');
        return result;
    }
    return { units, number, convert, validateRates, exchangeRate };
});

if (typeof document !== 'undefined') (function () {
    'use strict';
    const $ = (id) => document.getElementById(id);
    const words = {
        ar: {
            title: 'تحويل الوحدات', category: 'نوع التحويل', length: 'الطول', mass: 'الوزن', currency: 'العملات', amount: 'القيمة', from: 'من', to: 'إلى', swap: 'عكس الوحدات', rate: 'سعر الصرف', rateHint: 'حدّث السعر اليومي من الإنترنت أو اكتبه بنفسك. ليس سعرًا لحظيًا. تغيير العملات يمسح السعر. السعر الآلي يُرفض بعد 48 ساعة.', invalid: 'أدخل قيمة صحيحة وسعر صرف موجب عند الحاجة.', range: 'القيمة أكبر أو أصغر من النطاق المدعوم.', waiting: 'أدخل قيمة للتحويل', manual: 'تحويل تقريبي حسب السعر الظاهر، بدون رسوم.', unit: { mm: 'مليمتر', cm: 'سنتيمتر', m: 'متر', km: 'كيلومتر', in: 'بوصة', ft: 'قدم', yd: 'ياردة', mi: 'ميل', mg: 'مليجرام', g: 'جرام', kg: 'كيلوجرام', t: 'طن', oz: 'أوقية', lb: 'رطل' }
        },
        en: {
            title: 'Unit converter', category: 'Conversion type', length: 'Length', mass: 'Weight', currency: 'Currency', amount: 'Amount', from: 'From', to: 'To', swap: 'Swap units', rate: 'Exchange rate', rateHint: 'Get a daily rate online or enter your own. Not real-time. Changing currencies clears the rate. Automatic rates older than 48 hours are rejected.', invalid: 'Enter a valid amount and a positive exchange rate when needed.', range: 'Value is outside the supported range.', waiting: 'Enter an amount to convert', manual: 'Estimate using the displayed rate, excluding fees.', unit: { mm: 'Millimeter', cm: 'Centimeter', m: 'Meter', km: 'Kilometer', in: 'Inch', ft: 'Foot', yd: 'Yard', mi: 'Mile', mg: 'Milligram', g: 'Gram', kg: 'Kilogram', t: 'Tonne', oz: 'Ounce', lb: 'Pound' }
        }
    };
    Object.assign(words.ar, { refresh: 'حدّث السعر', loading: 'جاري التحديث…', failed: 'تعذّر جلب سعر حديث. اكتب السعر يدويًا وحاول لاحقًا.', stale: 'المصدر أعاد بيانات قديمة أو غير صالحة. لم نستخدمها؛ اكتب السعر يدويًا.', automatic: 'سعر يومي تقريبي، بدون رسوم. تاريخ المصدر:', cached: 'نسخة محفوظة، تاريخ المصدر:', cooldown: 'انتظر دقيقة قبل طلب جديد.', attribution: 'أسعار الصرف من ExchangeRate-API', manualStatus: 'إدخال يدوي، لم يتم التحقق من السعر.' });
    Object.assign(words.en, { refresh: 'Update rate', loading: 'Updating…', failed: 'Could not get a recent rate. Enter a rate manually and try later.', stale: 'The source returned old or invalid data. It was not used. Enter a rate manually.', automatic: 'Daily estimate, excluding fees. Source updated:', cached: 'Saved rate. Source updated:', cooldown: 'Wait one minute before another request.', attribution: 'Rates by ExchangeRate-API', manualStatus: 'Manual entry. Rate not verified.' });
    const panel = $('converter');
    const category = $('convert-category');
    const from = $('convert-from');
    const to = $('convert-to');
    const amount = $('convert-amount');
    const rate = $('convert-rate');
    const output = $('convert-result');
    const refresh = $('convert-refresh');
    const status = $('convert-rate-status');
    const cacheKey = 'smart-calculator-rates-v1';
    let generation = 0, controller, busy = false, source = null, state = '', cached = null;
    let lastAttempt = 0;
    try { cached = UnitConverter.validateRates(JSON.parse(localStorage.getItem(cacheKey))); } catch (_) { /* optional cache */ }
    function resetRate() {
        generation++;
        if (controller) controller.abort();
        busy = false; source = null; state = ''; rate.value = '';
    }
    function rateStatus() {
        refresh.disabled = busy;
        refresh.textContent = busy ? text().loading : text().refresh;
        $('convert-attribution').textContent = text().attribution;
        if (source) {
            const stamp = new Date(source.data.time_last_update_unix * 1000);
            status.textContent = (source.cached ? text().cached : text().automatic) + ' ' +
                stamp.toLocaleString(document.documentElement.lang === 'en' ? 'en-GB' : 'ar-EG', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' UTC';
        } else status.textContent = text()[state] || '';
    }
    refresh.addEventListener('click', async () => {
        if (busy || category.value !== 'currency' || from.value === to.value) return;
        const ticket = ++generation;
        const a = from.value, b = to.value;
        function apply(data, saved) {
            rate.value = String(UnitConverter.exchangeRate(data, a, b));
            source = { data, cached: saved }; state = ''; render();
        }
        // Reuse only today's (UTC) data. A stale cache is never applied.
        if (cached && new Date(cached.time_last_update_unix * 1000).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)) {
            try { apply(cached, true); return; } catch (_) { cached = null; }
        }
        if (Date.now() - lastAttempt < 60000) { source = null; state = 'cooldown'; render(); return; }
        lastAttempt = Date.now();
        busy = true; source = null; state = 'loading'; render();
        controller = new AbortController();
        const activeController = controller;
        const timer = setTimeout(() => activeController.abort(), 8000);
        try {
            const response = await fetch('https://open.er-api.com/v6/latest/USD', { signal: activeController.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
            if (!response.ok) throw new Error('NETWORK');
            const data = UnitConverter.validateRates(await response.json());
            if (ticket !== generation) return;
            cached = data;
            try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch (_) { /* works without storage */ }
            apply(data, false);
        } catch (error) {
            if (ticket !== generation) return;
            source = null; state = ['STALE', 'RATE'].includes(error.message) ? 'stale' : 'failed';
        } finally {
            clearTimeout(timer);
            if (ticket === generation) { busy = false; controller = null; render(); }
        }
    });
    const text = () => words[document.documentElement.lang === 'en' ? 'en' : 'ar'];
    function options(select, values, selected) {
        select.textContent = '';
        values.forEach((value) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = (text().unit[value] || value) + (text().unit[value] ? ' (' + value + ')' : '');
            select.appendChild(option);
        });
        select.value = values.includes(selected) ? selected : values[0];
    }
    function populate(reset) {
        const currency = category.value === 'currency';
        const values = currency ? ['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED'] : Object.keys(UnitConverter.units[category.value]);
        options(from, values, reset ? (currency ? 'USD' : category.value === 'length' ? 'm' : 'kg') : from.value);
        options(to, values, reset ? (currency ? 'EGP' : category.value === 'length' ? 'cm' : 'g') : to.value);
    }
    function render() {
        const currency = category.value === 'currency';
        $('convert-rate-group').hidden = !currency || from.value === to.value;
        $('convert-note').hidden = !currency;
        $('convert-online').hidden = !currency || from.value === to.value;
        if (source) {
            try { UnitConverter.validateRates(source.data); } catch (_) { rate.value = ''; source = null; state = 'stale'; }
        }
        rateStatus();
        $('convert-rate-label').textContent = text().rate + ' (1 ' + from.value + ' = ? ' + to.value + ')';
        output.classList.remove('is-error');
        output.dir = document.documentElement.dir;
        if (!amount.value.trim()) { output.textContent = text().waiting; return; }
        try {
            const result = UnitConverter.convert(amount.value, category.value, from.value, to.value, rate.value);
            const value = Number(result.toPrecision(12)).toString();
            output.dir = 'ltr';
            output.textContent = value + ' ' + to.value;
        } catch (e) {
            output.classList.add('is-error');
            output.textContent = e.message === 'RANGE' ? text().range : text().invalid;
        }
    }
    function translate() {
        panel.querySelectorAll('[data-convert-text]').forEach((el) => { el.textContent = text()[el.dataset.convertText]; });
        populate(false);
        render();
    }
    category.addEventListener('change', () => { resetRate(); populate(true); render(); });
    [from, to].forEach((el) => el.addEventListener('change', () => { resetRate(); render(); }));
    amount.addEventListener('input', render);
    rate.addEventListener('input', () => {
        generation++; if (controller) controller.abort();
        busy = false; source = null; state = rate.value.trim() ? 'manualStatus' : ''; render();
    });
    $('convert-swap').addEventListener('click', () => {
        const old = from.value; from.value = to.value; to.value = old;
        resetRate();
        render();
    });
    setInterval(() => { if (source) render(); }, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && source) render(); });
    new MutationObserver(translate).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    populate(true);
    translate();
})();
