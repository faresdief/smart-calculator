/*
 * state.js — منطق الإدخال (دالة نقية بدون DOM)
 * press(state, key) → state جديد. هذا الملف هو "عقل" الأزرار: منع تكرار العمليات،
 * الأصفار الزائدة، النقطة العشرية المكررة، الضرب الضمني، الأقواس الذكية، ...
 */
(function (root, factory) {
  'use strict';
  const engine = typeof module === 'object' && module.exports ? require('./calc.js') : root.CalcEngine;
  const api = factory(engine);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CalcState = api;
})(typeof self !== 'undefined' ? self : this, function (Calc) {
  'use strict';

  /** أقصى طول للتعبير (حماية من اللصق/الضغط المستمر). */
  const MAX_LEN = 120;

  /** مفتاح الزر → النص المُدخل. */
  const FUNCS = {
    sin: 'sin(',
    cos: 'cos(',
    tan: 'tan(',
    asin: 'asin(',
    acos: 'acos(',
    atan: 'atan(',
    ln: 'ln(',
    log: 'log(',
    sqrt: '√(',
    abs: 'abs(',
  };

  const OPERATORS = ['+', '-', '*', '/', '^'];
  const OPERAND_END = /[\d)%!πe]$/; // آخر محرف "قيمة": يلزمه ضرب ضمني قبل رقم/قوس/ثابت
  const FN_TAIL = /(?:asin|acos|atan|sin|cos|tan|ln|log|abs|√)\($/;

  const isDigitKey = (k) => /^\d$/.test(k);
  const isRestartKey = (k) => isDigitKey(k) || k === '.' || k === 'pi' || k === 'e' || k === '(' || k === 'paren' || k in FUNCS;

  function initialState() {
    return { expr: '', done: false, lastExpr: '', error: null, entry: null, seq: 0 };
  }

  /** آخر رقم يُكتب الآن (بدون الأُسّ في 1.5E+25). */
  function trailingNumber(e) {
    const m = /[\d.]+$/.exec(e);
    if (!m) return '';
    if (/\dE[+-]?$/.test(e.slice(0, m.index))) return '';
    return m[0];
  }

  function deleteLast(e) {
    const stripped = e.replace(FN_TAIL, '');
    return stripped !== e ? stripped : e.slice(0, -1);
  }

  function isPlainNumber(e) {
    return /^-?(?:\d+\.?\d*|\.\d+)(?:E[+-]?\d+)?$/.test(e);
  }

  /** يطبّق مفتاح عملية (+ − × ÷ ^) على النص. */
  function applyOperator(e, op) {
    if (e === '') return op === '-' ? '-' : e; // السالب فقط في البداية
    const last = e.slice(-1);
    if (last === '(') return op === '-' ? e + '-' : e;

    if (OPERATORS.includes(last)) {
      const run = /[+\-*/^]+$/.exec(e);
      const base = e.slice(0, run.index);
      if (base === '' || base.endsWith('(')) return e; // سالب أحادي وحده
      if (op === '-' && /[*/^]$/.test(e)) return e + '-'; // 5*-3
      if (op === '-' && last === '-') return e;
      return base + op; // استبدال العملية القديمة بالجديدة
    }
    return e.replace(/\.$/, '') + op;
  }

  function press(state, key, ctx = {}) {
    let s = { ...state, error: null };

    if (key === 'clear') return { ...initialState(), seq: s.seq };

    if (key === 'equals') return equals(s, ctx);

    if (key === 'del') {
      return { ...s, done: false, lastExpr: '', expr: deleteLast(s.expr) };
    }

    // بعد "=": الأرقام/الثوابت/الدوال تبدأ عملية جديدة، والعمليات تكمل من النتيجة.
    if (s.done) {
      if (isRestartKey(key)) s = { ...s, expr: '', done: false, lastExpr: '' };
      else {
        const wrap = s.expr.startsWith('-') && (key === '^' || key === '!' || key === 'square');
        s = { ...s, done: false, lastExpr: '', expr: wrap ? `(${s.expr})` : s.expr };
      }
    }

    let e = s.expr;
    const room = (str) => e.length + str.length <= MAX_LEN;
    const add = (str) => {
      if (room(str)) e += str;
    };
    const implicitTimes = () => {
      if (e.endsWith('.')) e = e.slice(0, -1);
      if (OPERAND_END.test(e)) add('*');
    };

    if (isDigitKey(key)) {
      if (/[)%!πe]$/.test(e)) add('*');
      if (trailingNumber(e) === '0') e = e.slice(0, -1); // 05 → 5
      add(key);
    } else if (key === '.') {
      const num = trailingNumber(e);
      if (num.includes('.')) return { ...s, expr: e };
      if (num !== '') add('.');
      else if (/\d$/.test(e)) return { ...s, expr: e }; // داخل أُسّ علمي
      else {
        if (/[)%!πe]$/.test(e)) add('*');
        add('0.');
      }
    } else if (OPERATORS.includes(key)) {
      e = applyOperator(e, key);
    } else if (key === '%') {
      if (/[\d)%!πe]$/.test(e)) add('%');
    } else if (key === '!') {
      if (/[\d)!]$/.test(e)) add('!');
    } else if (key === '(') {
      implicitTimes();
      add('(');
    } else if (key === ')') {
      if (Calc.openParens(e) > 0 && OPERAND_END.test(e)) add(')');
    } else if (key === 'paren') {
      if (Calc.openParens(e) > 0 && OPERAND_END.test(e)) add(')');
      else {
        implicitTimes();
        add('(');
      }
    } else if (key === 'pi' || key === 'e') {
      implicitTimes();
      add(key === 'pi' ? 'π' : 'e');
    } else if (key in FUNCS) {
      implicitTimes();
      add(FUNCS[key]);
    } else if (key === 'square') {
      if (OPERAND_END.test(e)) add('^2');
    } else if (key === 'inv') {
      const base = Calc.complete(e);
      const wrapped = base === '' ? '1/(' : `1/(${base})`;
      if (wrapped.length <= MAX_LEN) e = wrapped;
    }

    return { ...s, expr: e };
  }

  function equals(s, ctx) {
    const e = s.expr;
    if (e === '') return s;
    if (isPlainNumber(e)) return { ...s, done: true, lastExpr: e };
    const completed = Calc.complete(e);
    try {
      const value = Calc.evaluate(completed, { angle: ctx.angle });
      const result = Calc.formatResult(value);
      return {
        ...s,
        expr: result,
        done: true,
        lastExpr: completed,
        entry: { expr: completed, result },
        seq: s.seq + 1,
      };
    } catch (err) {
      if (err.code === 'EMPTY') return s;
      return { ...s, error: err.code || 'SYNTAX' };
    }
  }

  /**
   * ما يُعرض على الشاشة:
   *  top  : السطر الصغير (التعبير)         main : السطر الكبير (النتيجة/الرقم)
   *  raw  : نص خام بدون تنسيق للنسخ        error: كود الخطأ إن وُجد
   */
  function view(state, ctx = {}) {
    const f = (str) => Calc.formatExpression(str);
    if (state.error) return { top: f(state.expr), main: '', raw: '', error: state.error };
    if (state.done) {
      return {
        top: state.lastExpr ? `${f(Calc.complete(state.lastExpr))} =` : '',
        main: f(state.expr),
        raw: state.expr,
        error: null,
      };
    }
    if (!state.expr) return { top: '', main: '0', raw: '0', error: null };
    if (isPlainNumber(state.expr)) return { top: '', main: f(state.expr), raw: state.expr, error: null };
    try {
      const raw = Calc.formatResult(Calc.evaluate(Calc.complete(state.expr), { angle: ctx.angle }));
      return { top: f(state.expr), main: f(raw), raw, error: null };
    } catch (err) {
      return { top: f(state.expr), main: '', raw: '', error: null };
    }
  }

  return { MAX_LEN, FUNCS, initialState, press, view, isPlainNumber, deleteLast };
});
