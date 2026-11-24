'use strict';
/* اختبارات حاسبة التواريخ وبحث السجل (منطق نقي). */
const test = require('node:test');
const assert = require('node:assert/strict');
const State = require('./state.js');

test('dateDifference: أيام وأسابيع وسنوات/أشهر/أيام', () => {
    const d = State.dateDifference('2024-01-01', '2024-12-31');
    assert.equal(d.days, 365); // 2024 كبيسة
    assert.equal(d.weeks, 52);
    assert.equal(d.restDays, 1);
    assert.deepEqual([d.years, d.months, d.restMonthDays], [0, 11, 30]);
    assert.equal(State.dateDifference('2023-01-01', '2024-01-01').days, 365);
    assert.equal(State.dateDifference('2024-01-01', '2025-01-01').days, 366);
    assert.equal(State.dateDifference('2000-01-01', '2000-01-01').days, 0);
});

test('dateDifference: ترتيب معكوس يعطي نفس القيمة مع علامة', () => {
    const f = State.dateDifference('2024-03-10', '2026-05-15');
    const r = State.dateDifference('2026-05-15', '2024-03-10');
    assert.equal(f.negative, false);
    assert.equal(r.negative, true);
    assert.equal(f.days, r.days);
    assert.deepEqual([f.years, f.months, f.restMonthDays], [2, 2, 5]);
    assert.deepEqual([r.years, r.months, r.restMonthDays], [2, 2, 5]);
});

test('dateDifference: حدود الأشهر وفبراير والاستعارة', () => {
    const a = State.dateDifference('2024-01-31', '2024-03-01');
    assert.equal(a.days, 30);
    assert.deepEqual([a.years, a.months, a.restMonthDays], [0, 1, 1]);
    const b = State.dateDifference('2023-12-25', '2024-01-05');
    assert.equal(b.days, 11);
    assert.deepEqual([b.years, b.months, b.restMonthDays], [0, 0, 11]);
    assert.equal(State.dateDifference('0001-01-01', '9999-12-31').days, 3652058);
});

test('تواريخ غير صالحة ترجع null', () => {
    for (const bad of ['', '2024-02-30', '2023-02-29', '2024-13-01', '2024-1-1', 'abc', '0000-01-01', '10000-01-01']) {
        assert.equal(State.parseDate(bad), null, bad);
        assert.equal(State.dateDifference(bad, '2024-01-01'), null, bad);
    }
    assert.deepEqual(State.parseDate('2024-02-29'), { y: 2024, m: 2, d: 29 });
});

test('addDays: إضافة وطرح، كبيسة، عبور السنة، يوم الأسبوع', () => {
    assert.equal(State.addDays('2024-02-28', 1, 1).date, '2024-02-29');
    assert.equal(State.addDays('2023-02-28', 1, 1).date, '2023-03-01');
    assert.equal(State.addDays('2024-12-31', 1, 1).date, '2025-01-01');
    assert.equal(State.addDays('2025-01-01', 1, -1).date, '2024-12-31');
    assert.equal(State.addDays('2026-11-24', 0, 1).date, '2026-11-24');
    assert.equal(State.addDays('2026-11-24', 100, 1).date, '2027-03-04');
    assert.equal(State.addDays('2026-11-24', 365, -1).date, '2025-11-24');
    // 2026-11-24 يوم الثلاثاء (2)
    assert.equal(State.addDays('2026-11-24', 0, 1).weekday, 2);
    assert.equal(State.addDays('1970-01-01', 0, 1).weekday, 4); // الخميس
    assert.equal(State.addDays('2000-01-01', 0, 1).weekday, 6); // السبت
});

test('addDays: حدود النطاق والمدخلات السيئة', () => {
    assert.equal(State.addDays('9999-12-31', 1, 1), null);
    assert.equal(State.addDays('0001-01-01', 1, -1), null);
    assert.equal(State.addDays('2024-01-01', 1000001, 1), null);
    assert.equal(State.addDays('nope', 5, 1), null);
    assert.equal(State.addDays('2024-01-01', 1.5, 1), null);
});

test('الجمع ثم الفرق متسقان على مجموعة تواريخ', () => {
    for (const start of ['1999-12-31', '2024-02-29', '2100-02-28', '1600-02-29']) {
        for (const n of [0, 1, 59, 366, 1461, 40000]) {
            const out = State.addDays(start, n, 1);
            assert.equal(State.dateDifference(start, out.date).days, n);
            assert.equal(State.addDays(out.date, n, -1).date, start);
        }
    }
});

test('parseDayCount: أرقام هندية وفواصل وحد أقصى', () => {
    assert.equal(State.parseDayCount('45'), 45);
    assert.equal(State.parseDayCount('٤٥'), 45);
    assert.equal(State.parseDayCount(' 1,000 '), 1000);
    assert.equal(State.parseDayCount('0'), 0);
    for (const bad of ['', '-5', '1.5', 'x', '1000001', '12345678']) assert.equal(State.parseDayCount(bad), null, bad);
    assert.equal(State.parseDayCount('1000000'), 1000000);
});

test('searchHistory: يطابق التعبير والنتيجة والعلامات المعروضة والأرقام الهندية', () => {
    const items = [
        { expr: '12*5', result: '60' },
        { expr: '1000/8', result: '125' },
        { expr: 'sqrt(81)', result: '9' },
        { expr: '1234+1', result: '1235' },
    ];
    assert.deepEqual(State.searchHistory(items, ''), [0, 1, 2, 3]);
    assert.deepEqual(State.searchHistory(items, '60'), [0]);
    assert.deepEqual(State.searchHistory(items, '12 × 5'), [0]);
    assert.deepEqual(State.searchHistory(items, '÷'), [1]);
    assert.deepEqual(State.searchHistory(items, '١٢٥'), [1]);
    assert.deepEqual(State.searchHistory(items, '1,234'), [3]);
    assert.deepEqual(State.searchHistory(items, 'SQRT'), [2]);
    assert.deepEqual(State.searchHistory(items, 'zzz'), []);
    assert.deepEqual(State.searchHistory(null, 'a'), []);
    assert.deepEqual(State.searchHistory([null, { expr: 1 }, { expr: '2+2', result: '4' }], '4'), [2]);
});
