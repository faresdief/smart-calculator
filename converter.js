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
