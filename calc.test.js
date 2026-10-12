'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Calc = require('../calc.js');
const State = require('../state.js');

const ev = (expr, angle = 'deg') => Calc.evaluate(expr, { angle });
const code = (expr, angle = 'deg') => {
  try {
    ev(expr, angle);
  } catch (e) {
    return e.code;
  }
  return null;
};

/* ------------------------------------------------------------------ */
test('الأساسيات وأولوية العمليات', () => {
  assert.equal(ev('1+2*3'), 7);
  assert.equal(ev('(1+2)*3'), 9);
  assert.equal(ev('10-4-3'), 3); // يسار إلى يمين
  assert.equal(ev('2*3+4*5'), 26);
  assert.equal(ev('8/4/2'), 1);
  assert.equal(ev('12×3÷4'), 9); // رموز العرض
  assert.equal(ev('5−2'), 3);
});

test('أخطاء الفاصلة العائمة تتصلح', () => {
  assert.equal(ev('0.1+0.2'), 0.3);
  assert.equal(ev('0.7+0.1'), 0.8);
  assert.equal(ev('1.1*1.1'), 1.21);
  assert.equal(ev('2/3*3'), 2);
  assert.equal(Calc.formatResult(ev('1/3')), '0.333333333333333');
});

test('الأرقام التي تبدأ بصفر ليست octal (كان eval يعطي 9)', () => {
  assert.equal(ev('010+1'), 11);
  assert.equal(ev('08+1'), 9);
  assert.equal(ev('007'), 7);
});

test('أرقام سالبة', () => {
  assert.equal(ev('5*-3'), -15);
  assert.equal(ev('-5+2'), -3);
  assert.equal(ev('2--3'), 5);
  assert.equal(ev('-2^2'), -4); // السالب أضعف من ^
  assert.equal(ev('2^-2'), 0.25);
  assert.equal(ev('(-2)^2'), 4);
});

test('الأُسّ يمين-إلى-يسار', () => {
  assert.equal(ev('2^3^2'), 512);
  assert.equal(ev('2^10'), 1024);
});

test('النسبة المئوية الذكية', () => {
  assert.equal(ev('50%'), 0.5);
  assert.equal(ev('200+10%'), 220);
  assert.equal(ev('200-10%'), 180);
  assert.equal(ev('200*10%'), 20);
  assert.equal(ev('200/50%'), 400);
  assert.equal(ev('100+50+10%'), 165);
  assert.equal(ev('200+(10%)'), 200.1);
});

test('الضرب الضمني والأقواس', () => {
  assert.equal(ev('2(3)'), 6);
  assert.equal(ev('(1+2)(3+4)'), 21);
  assert.equal(ev('2π'), Number((2 * Math.PI).toPrecision(15)));
  assert.equal(ev('3sqrt(4)'), 6);
  assert.equal(ev('(2+3'), 5); // إغلاق تلقائي
});

test('القسمة على صفر وأخطاء النطاق تُرجع أكواداً واضحة', () => {
  assert.equal(code('5/0'), 'DIV_ZERO');
  assert.equal(code('0/0'), 'DIV_ZERO');
  assert.equal(code('0^-1'), 'DIV_ZERO');
  assert.equal(code('sqrt(-4)'), 'DOMAIN');
  assert.equal(code('ln(0)'), 'DOMAIN');
  assert.equal(code('log(-1)'), 'DOMAIN');
  assert.equal(code('(-8)^(1/3)'), 'DOMAIN');
  assert.equal(code('asin(2)'), 'DOMAIN');
  assert.equal(code('tan(90)'), 'DOMAIN');
  assert.equal(code('171!'), 'OVERFLOW');
  assert.equal(code('2.5!'), 'DOMAIN');
  assert.equal(code('10^400'), 'OVERFLOW');
});

test('أخطاء الصيغة', () => {
  for (const bad of ['5+', '*5', '1.2.3', '5)', '()', '2 3', 'abc', '1+*2', '1,5']) {
    assert.equal(code(bad), 'SYNTAX', bad);
  }
  assert.equal(code(''), 'EMPTY');
  assert.equal(code('('.repeat(20000)), 'SYNTAX'); // لا يطيح الصفحة
});

test('الدوال العلمية بالدرجات', () => {
  assert.equal(ev('sin(30)'), 0.5);
  assert.equal(ev('cos(60)'), 0.5);
  assert.equal(ev('tan(45)'), 1);
  assert.equal(ev('sin(180)'), 0); // وليس 1.2e-16
  assert.equal(ev('cos(90)'), 0);
  assert.equal(ev('sin(270)'), -1);
  assert.equal(ev('asin(0.5)'), 30);
  assert.equal(ev('acos(0)'), 90);
  assert.equal(ev('atan(1)'), 45);
});

test('الدوال العلمية بالراديان', () => {
  assert.equal(ev('sin(π)', 'rad'), 0);
  assert.equal(ev('cos(π)', 'rad'), -1);
  assert.equal(ev('sin(π/2)', 'rad'), 1);
  assert.equal(code('tan(π/2)', 'rad'), 'DOMAIN');
  assert.equal(ev('atan(1)*4', 'rad'), Number(Math.PI.toPrecision(15)));
});

test('لوغاريتمات وجذور وعاملي', () => {
  assert.equal(ev('ln(e)'), 1);
  assert.equal(ev('log(1000)'), 3);
  assert.equal(ev('sqrt(144)'), 12);
  assert.equal(ev('√9+1'), 4);
  assert.equal(ev('abs(-7)'), 7);
  assert.equal(ev('5!'), 120);
  assert.equal(ev('0!'), 1);
  assert.equal(ev('3!^2'), 36);
});

test('الأرقام الكبيرة والصغيرة والتنسيق', () => {
  assert.equal(Calc.formatResult(ev('123456789012345+1')), '123456789012346');
  assert.equal(Calc.formatResult(ev('99999999999*99999999999')), '9.9999999998E+21');
  assert.equal(Calc.formatResult(ev('1/1000000000')), '1E-9');
  assert.equal(ev('1.5E+3'), 1500); // النتيجة المنسّقة قابلة لإعادة القراءة
  assert.equal(Calc.formatResult(0), '0');
  assert.equal(Calc.formatResult(ev('0*-1')), '0'); // لا -0
  assert.equal(Calc.formatResult(ev('2^53')), '9.00719925474099E+15'); // 15 رقماً معنوياً
});

test('formatExpression: رموز وفواصل آلاف', () => {
  assert.equal(Calc.formatExpression('1234567.891*2'), '1,234,567.891×2');
  assert.equal(Calc.formatExpression('5-3/2'), '5−3÷2');
  assert.equal(Calc.formatExpression('1.5E-3+1'), '1.5E-3+1'); // الأُسّ لا يُمسّ
  assert.equal(Calc.formatExpression('asin(0.5)'), 'sin⁻¹(0.5)');
  assert.equal(Calc.formatExpression('1000.'), '1,000.');
  assert.equal(Calc.formatExpression('1234', { group: false }), '1234');
});

test('الأرقام الهندية', () => {
  assert.equal(Calc.localizeNumerals('1,234.5'), '١٬٢٣٤٫٥');
  assert.equal(Calc.delocalizeNumerals('١٬٢٣٤٫٥'), '1,234.5');
});

test('complete و canonicalize', () => {
  assert.equal(Calc.complete('5+'), '5');
  assert.equal(Calc.complete('5*-'), '5');
  assert.equal(Calc.complete('5×(3+'), '5×(3)');
  assert.equal(Calc.complete('sin(30'), 'sin(30)');
  assert.equal(Calc.complete('2+sin('), '2');
  assert.equal(Calc.canonicalize('sqrt(9) × 2 + pi'), '√(9)*2+π');
  assert.throws(() => Calc.canonicalize('hello'), { code: 'SYNTAX' });
});

/* ------------------------------------------------------------------ */
/* منطق الأزرار                                                        */
/* ------------------------------------------------------------------ */

function run(keys, ctx = {}) {
  let s = State.initialState();
  for (const k of keys) s = State.press(s, k, ctx);
  return s;
}
const expr = (keys, ctx) => run(keys, ctx).expr;
const keysOf = (str) => [...str];

test('أزرار: الأصفار والنقطة', () => {
  assert.equal(expr(keysOf('007')), '7');
  assert.equal(expr(keysOf('0.0')), '0.0');
  assert.equal(expr(keysOf('1.2.3')), '1.23');
  assert.equal(expr(['.']), '0.');
  assert.equal(expr(['5', '+', '.']), '5+0.');
  assert.equal(expr(['5', '+', '0', '7']), '5+7');
});

test('أزرار: العمليات المتتالية تُستبدل', () => {
  assert.equal(expr(['5', '+', '*']), '5*');
  assert.equal(expr(['5', '*', '-']), '5*-');
  assert.equal(expr(['5', '*', '-', '-']), '5*-');
  assert.equal(expr(['5', '*', '-', '+']), '5+');
  assert.equal(expr(['5', '-', '+']), '5+');
  assert.equal(expr(['5', '+', '-']), '5-');
  assert.equal(expr(['*']), '');
  assert.equal(expr(['-', '+', '5']), '-5');
  assert.equal(expr(['5', '.', '+']), '5+');
});

test('أزرار: أرقام سالبة تكتب طبيعياً', () => {
  const s = run(['5', '*', '-', '3', 'equals']);
  assert.equal(s.expr, '-15');
  assert.equal(run(['-', '5', '+', '2', 'equals']).expr, '-3');
});

test('أزرار: بعد = الرقم يبدأ عملية جديدة والعملية تكمل', () => {
  assert.equal(expr(['2', '+', '3', 'equals', '5']), '5'); // كان 55
  assert.equal(expr(['2', '+', '3', 'equals', '*', '2', 'equals']), '10');
  assert.equal(expr(['2', '+', '3', 'equals', 'sin']), 'sin(');
  assert.equal(expr(['2', '+', '3', 'equals', 'square']), '5^2');
  assert.equal(expr(['0', '-', '5', 'equals', 'square']), '(-5)^2');
});

test('أزرار: الخطأ لا يخرّب الإدخال التالي', () => {
  const s = run(['1', '/', '0', 'equals']);
  assert.equal(s.error, 'DIV_ZERO');
  assert.equal(s.expr, '1/0'); // يبقى التعبير للتعديل
  assert.equal(State.press(s, 'del').expr, '1/');
  assert.equal(State.press(s, 'del').error, null);
  assert.equal(State.press(s, 'clear').expr, '');
  // كان يعطي "Error5": الآن الإدخال التالي يمسح الخطأ ويكمل التعبير (الصفر الأخير يُستبدل)
  const next = State.press(s, '5');
  assert.equal(next.error, null);
  assert.equal(next.expr, '1/5');
});

test('أزرار: = مع تعبير ناقص يكمله', () => {
  assert.equal(run(['5', '+', 'equals']).expr, '5');
  assert.equal(run(['2', '*', '(', '3', '+', '1', 'equals']).expr, '8');
  assert.equal(run(['sin', '3', '0', 'equals']).expr, '0.5');
});

test('أزرار: الأقواس الذكية والضرب الضمني', () => {
  assert.equal(expr(['paren']), '(');
  assert.equal(expr(['paren', '2', '+', '3', 'paren']), '(2+3)');
  assert.equal(expr(['2', 'paren']), '2*(');
  assert.equal(expr(['2', ')']), '2'); // لا قوس مفتوح
  assert.equal(expr(['(', ')']), '('); // ) بعد ( ممنوعة
  assert.equal(expr(['2', 'pi']), '2*π');
  assert.equal(expr(['pi', '2']), 'π*2');
  assert.equal(expr(['(', '1', ')', '3']), '(1)*3');
  assert.equal(run(['2', 'pi', 'equals']).expr, '6.28318530717959');
});

test('أزرار: % ! وx² و1/x', () => {
  assert.equal(expr(['%']), '');
  assert.equal(expr(['5', '+', '%']), '5+');
  assert.equal(run(['2', '0', '0', '+', '1', '0', '%', 'equals']).expr, '220');
  assert.equal(run(['5', '!', 'equals']).expr, '120');
  assert.equal(run(['9', 'square', 'equals']).expr, '81');
  assert.equal(expr(['4', 'inv']), '1/(4)');
  assert.equal(run(['4', 'inv', 'equals']).expr, '0.25');
  assert.equal(run(['2', '+', '2', 'inv', 'equals']).expr, '0.25'); // 1/(2+2)
});

test('أزرار: الحذف يزيل الدالة كاملة', () => {
  assert.equal(expr(['5', '+', 'sin', 'del']), '5+');
  assert.equal(expr(['asin', 'del']), '');
  assert.equal(expr(['sqrt', 'del']), '');
  assert.equal(expr(['1', '2', 'del']), '1');
  assert.equal(expr(['del']), '');
});

test('أزرار: DEG / RAD تؤثر على النتيجة', () => {
  assert.equal(run(['sin', '9', '0', 'equals'], { angle: 'deg' }).expr, '1');
  assert.equal(run(['sin', '9', '0', 'equals'], { angle: 'rad' }).expr, '0.893996663600558');
});

test('أزرار: السجل يُسجَّل فقط عند حساب فعلي', () => {
  let s = run(['2', '+', '3', 'equals']);
  assert.deepEqual(s.entry, { expr: '2+3', result: '5' });
  assert.equal(s.seq, 1);
  s = run(['7', 'equals']); // رقم فقط
  assert.equal(s.seq, 0);
  s = run(['1', '/', '0', 'equals']); // خطأ
  assert.equal(s.seq, 0);
});

test('أزرار: حد أقصى للطول', () => {
  const s = run(Array(300).fill('9'));
  assert.equal(s.expr.length, State.MAX_LEN);
});

test('view: ما يظهر على الشاشة', () => {
  assert.deepEqual(State.view(State.initialState()), { top: '', main: '0', raw: '0', error: null });
  const typing = State.view(run(keysOf('12').concat(['+', '3'])));
  assert.equal(typing.top, '12+3');
  assert.equal(typing.main, '15');
  assert.equal(State.view(run(['1', '2', '3', '4'])).main, '1,234');
  assert.equal(State.view(run(['1', '2', '3', '4'])).top, '');
  const done = State.view(run(['1', '2', '*', '3', 'equals']));
  assert.equal(done.top, '12×3 =');
  assert.equal(done.main, '36');
  assert.equal(done.raw, '36');
  assert.equal(State.view(run(['5', '+'])).main, '5'); // معاينة حيّة مع عملية معلّقة
  assert.equal(State.view(run(['1', '/', '0', 'equals'])).error, 'DIV_ZERO');
  assert.equal(State.view(run(['sqrt', '-', '4'])).main, ''); // معاينة خاطئة → فارغة وليس خطأ
});
