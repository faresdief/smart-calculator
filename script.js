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
    const panelParts = () => [$('.toolbar'), $('.display'), els.sci, $('.keys')];

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
        if (!els.history.hidden) return;
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
        if (els.themeColor) els.themeColor.setAttribute('content', settings.theme === 'light' ? '#e6edfb' : '#0b1220');
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
