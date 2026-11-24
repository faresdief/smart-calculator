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
    return { units, number, convert };
});

if (typeof document !== 'undefined') (function () {
    'use strict';
    const $ = (id) => document.getElementById(id);
    const words = {
        ar: {
            title: 'تحويل الوحدات', category: 'نوع التحويل', length: 'الطول', mass: 'الوزن', currency: 'العملات', amount: 'القيمة', from: 'من', to: 'إلى', swap: 'عكس الوحدات', rate: 'سعر الصرف', rateHint: 'أدخل سعر الصرف بنفسك. لا توجد أسعار مباشرة أو محفوظة. عند تغيير العملة أو عكسها أدخل السعر من جديد.', invalid: 'أدخل قيمة صحيحة وسعر صرف موجب عند الحاجة.', range: 'القيمة أكبر أو أصغر من النطاق المدعوم.', waiting: 'أدخل قيمة للتحويل', manual: 'تحويل تقريبي حسب السعر الذي أدخلته، بدون رسوم.', unit: { mm: 'مليمتر', cm: 'سنتيمتر', m: 'متر', km: 'كيلومتر', in: 'بوصة', ft: 'قدم', yd: 'ياردة', mi: 'ميل', mg: 'مليجرام', g: 'جرام', kg: 'كيلوجرام', t: 'طن', oz: 'أوقية', lb: 'رطل' }
        },
        en: {
            title: 'Unit converter', category: 'Conversion type', length: 'Length', mass: 'Weight', currency: 'Currency', amount: 'Amount', from: 'From', to: 'To', swap: 'Swap units', rate: 'Exchange rate', rateHint: 'Enter your own exchange rate. No live or saved rates. Changing or swapping currencies clears the rate.', invalid: 'Enter a valid amount and a positive exchange rate when needed.', range: 'Value is outside the supported range.', waiting: 'Enter an amount to convert', manual: 'Estimate using your rate, excluding fees.', unit: { mm: 'Millimeter', cm: 'Centimeter', m: 'Meter', km: 'Kilometer', in: 'Inch', ft: 'Foot', yd: 'Yard', mi: 'Mile', mg: 'Milligram', g: 'Gram', kg: 'Kilogram', t: 'Tonne', oz: 'Ounce', lb: 'Pound' }
        }
    };
    const panel = $('converter');
    const category = $('convert-category');
    const from = $('convert-from');
    const to = $('convert-to');
    const amount = $('convert-amount');
    const rate = $('convert-rate');
    const output = $('convert-result');
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
    category.addEventListener('change', () => { rate.value = ''; populate(true); render(); });
    [from, to].forEach((el) => el.addEventListener('change', () => { rate.value = ''; render(); }));
    [amount, rate].forEach((el) => el.addEventListener('input', render));
    $('convert-swap').addEventListener('click', () => {
        const old = from.value; from.value = to.value; to.value = old;
        rate.value = '';
        render();
    });
    new MutationObserver(translate).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    populate(true);
    translate();
})();
