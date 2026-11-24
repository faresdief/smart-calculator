'use strict';
/* اختبارات التطويرات الأربعة: الذاكرة، تصدير السجل، وتكامل حالة الحاسبة. */
const test = require('node:test');
const assert = require('node:assert/strict');
const State = require('./state.js');

const type = (keys, angle = 'deg') =>
    keys.reduce((s, k) => State.press(s, k, { angle }), State.initialState());

/* ---------------- الذاكرة: تخزين القيمة الظاهرة ---------------- */
test('memoryOperand: النتيجة والرقم المكتوب قيم صالحة، والخطأ ليس كذلك', () => {
    assert.equal(State.memoryOperand(type(['5', '+', '3', 'equals'])), '8');
    assert.equal(State.memoryOperand(type(['1', '2', '.', '5'])), '12.5');
    assert.equal(State.memoryOperand(State.initialState()), '0'); // الشاشة الفارغة تعرض 0
    assert.equal(State.memoryOperand(type(['1', '/', '0', 'equals'])), null); // خطأ قسمة على صفر
});

test('mem_add و mem_sub: جمع وطرح تراكمي مع تنظيف أخطاء الفاصلة', () => {
    const s = type(['0', '.', '1', 'equals']);
    let r = State.memoryApply(s, 'mem_add', null);
    assert.equal(r.memory, 0.1);
    r = State.memoryApply(type(['0', '.', '2', 'equals']), 'mem_add', r.memory);
    assert.equal(r.memory, 0.3); // ليس 0.30000000000000004
    r = State.memoryApply(s, 'mem_sub', r.memory);
    assert.equal(r.memory, 0.2);
    // الخطأ لا يغيّر الذاكرة
    const err = type(['1', '/', '0', 'equals']);
    r = State.memoryApply(err, 'mem_add', 5);
    assert.equal(r.memory, 5);
});

test('mem_clear يفرّغ الذاكرة', () => {
    const r = State.memoryApply(type(['9', 'equals']), 'mem_clear', 42);
    assert.equal(r.memory, null);
    assert.equal(r.state.expr, '9'); // الحالة نفسها لا تتغير
});

test('mem_recall: إدخال القيمة مثل رقم مكتوب', () => {
    // شاشة فارغة
    let r = State.memoryApply(State.initialState(), 'mem_recall', 7);
    assert.equal(r.state.expr, '7');
    // بعد "=" يبدأ عملية جديدة
    r = State.memoryApply(type(['2', '+', '2', 'equals']), 'mem_recall', 7);
    assert.equal(r.state.expr, '7');
    assert.equal(r.state.done, false);
    // بعد عملية: إكمال التعبير، بما فيه القيمة السالبة
    r = State.memoryApply(type(['5', '+']), 'mem_recall', -3);
    assert.equal(r.state.expr, '5+-3');
    // بعد قيمة: ضرب ضمني
    r = State.memoryApply(type(['2']), 'mem_recall', 3);
    assert.equal(r.state.expr, '2*3');
    // ذاكرة فارغة: لا شيء
    r = State.memoryApply(type(['2']), 'mem_recall', null);
    assert.equal(r.state.expr, '2');
});

test('mem_recall يحترم الحد الأقصى لطول التعبير', () => {
    const long = '1'.repeat(State.MAX_LEN - 1);
    const s = State.initialState();
    s.expr = long + '+';
    const r = State.memoryApply(s, 'mem_recall', 123456);
    assert.equal(r.state.expr, long + '+'); // لم يتغير
});

test('دورة كاملة: حساب → تخزين → مسح → استرجاع → حساب', () => {
    let s = type(['1', '2', '+', '8', 'equals']); // 20
    const mem = State.memoryApply(s, 'mem_add', null).memory;
    s = State.press(s, 'clear', {});
    s = State.memoryApply(s, 'mem_recall', mem).state;
    s = State.press(State.press(s, '/', {}), '4', {});
    s = State.press(s, 'equals', {});
    assert.equal(s.expr, '5'); // 20/4
});

/* ---------------- تصدير السجل ---------------- */
test('exportHistoryText: تنسيق كل عملية في سطر مع ترويسة', () => {
    const text = State.exportHistoryText(
        [
            { expr: '5+3', result: '8' },
            { expr: '2*2', result: '4' },
        ],
        'الحاسبة الذكية — السجل (2026-11-24)'
    );
    assert.equal(text, 'الحاسبة الذكية — السجل (2026-11-24)\n\n5+3 = 8\n2×2 = 4\n');
});

test('exportHistoryText: يتجاهل الإدخالات المعطوبة ويتعامل مع الفراغ', () => {
    assert.equal(State.exportHistoryText([], 'H'), 'H\n\n');
    assert.equal(State.exportHistoryText([], ''), '');
    assert.equal(State.exportHistoryText(null), '');
    assert.equal(
        State.exportHistoryText([{ expr: '1+1' }, { result: '2' }, null, { expr: '1+1', result: '2' }]),
        '1+1 = 2\n'
    );
});

test('exportHistoryText يحافظ على ترتيب السجل (الأحدث أولاً)', () => {
    const items = [
        { expr: '9-1', result: '8' },
        { expr: '1+1', result: '2' },
    ];
    assert.ok(State.exportHistoryText(items).indexOf('9−1 = 8') < State.exportHistoryText(items).indexOf('1+1 = 2'));
});

/* ---------------- حاسبة النسب ---------------- */
test('percentCalc: خصم وإكرامية وضريبة ونسب', () => {
    assert.deepEqual(State.percentCalc('discount', '200', '15'), { saved: 30, final: 170 });
    assert.deepEqual(State.percentCalc('discount', '٢٠٠', '١٥'), { saved: 30, final: 170 });
    assert.equal(State.percentCalc('discount', '200', '101'), null);
    assert.equal(State.percentCalc('discount', '-5', '10'), null);
    assert.deepEqual(State.percentCalc('tip', '120.5', '12.5', '3'), { tip: 15.06, total: 135.56, people: 3, perPerson: 45.19 });
    assert.equal(State.percentCalc('tip', '100', '10', '0'), null);
    assert.equal(State.percentCalc('tip', '100', '10', '2.5'), null);
    assert.equal(State.percentCalc('tip', '100', '10', '101'), null);
    assert.equal(State.percentCalc('tip', '100', '10').people, 1);
    assert.deepEqual(State.percentCalc('tax_add', '100', '14'), { tax: 14, total: 114 });
    assert.deepEqual(State.percentCalc('tax_incl', '114', '14'), { net: 100, tax: 14 });
    assert.deepEqual(State.percentCalc('what', '25', '200'), { percent: 12.5 });
    assert.deepEqual(State.percentCalc('change', '80', '100'), { percent: 25 });
    assert.deepEqual(State.percentCalc('change', '100', '80'), { percent: -20 });
    assert.deepEqual(State.percentCalc('what', '5', '0'), { error: 'ZERO' });
    assert.deepEqual(State.percentCalc('change', '0', '5'), { error: 'ZERO' });
    for (const bad of ['', 'abc', '1e5', '1.2.3', '--1']) assert.equal(State.percentCalc('discount', bad, '10'), null);
    assert.equal(State.percentCalc('unknown', '1', '1'), null);
    assert.equal(State.percentCalc('tax_add', '1e13', '10'), null);
});

/* ---------------- المفضلة ---------------- */
test('toggleFavorite: إضافة في الأول ثم حذف عند التكرار بدون تعديل الأصل', () => {
    const base = [{ expr: '1+1', result: '2' }];
    const a = State.toggleFavorite(base, { expr: '2*3', result: '6' });
    assert.deepEqual(a.map((x) => x.result), ['6', '2']);
    assert.equal(base.length, 1);
    assert.deepEqual(State.toggleFavorite(a, { expr: '2*3', result: '6' }), base);
    assert.equal(State.favoriteIndex(a, { expr: '1+1', result: '2' }), 1);
    assert.equal(State.favoriteIndex(a, { expr: '1+1', result: '3' }), -1);
    assert.equal(State.toggleFavorite(null, null).length, 0);
    const many = Array.from({ length: 5 }, (_, i) => ({ expr: String(i), result: String(i) }));
    assert.equal(State.toggleFavorite(many, { expr: 'x', result: 'y' }, 5).length, 5);
});
