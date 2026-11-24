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

  /* ------------------------------------------------------------------ */
  /* الذاكرة (M+ / M- / MR / MC) — منطق نقي بدون DOM                     */
  /* ------------------------------------------------------------------ */

  /** القيمة الظاهرة حالياً كنص خام صالح للحفظ في الذاكرة، أو null عند خطأ. */
  function memoryOperand(state, ctx = {}) {
    const v = view(state, ctx);
    if (v.error || v.raw === '') return null;
    return Number.isFinite(Number(v.raw)) ? v.raw : null;
  }

  /**
   * عمليات الذاكرة. memory رقم محفوظ أو null (فارغة).
   * key: mem_add | mem_sub | mem_recall | mem_clear
   * ترجع { state, memory } — الحالة لا تتغير إلا في الاسترجاع.
   */
  function memoryApply(state, key, memory, ctx = {}) {
    if (key === 'mem_clear') return { state, memory: null };

    if (key === 'mem_add' || key === 'mem_sub') {
      const raw = memoryOperand(state, ctx);
      if (raw === null) return { state, memory };
      const delta = Number(raw);
      // formatResult ينظّف أخطاء الفاصلة العائمة (0.1+0.2) مع كل خطوة
      const next = Number(Calc.formatResult((memory || 0) + (key === 'mem_add' ? delta : -delta)));
      if (!Number.isFinite(next)) return { state, memory };
      return { state, memory: next };
    }

    if (key === 'mem_recall') {
      if (memory === null || !Number.isFinite(memory)) return { state, memory };
      const text = Calc.formatResult(memory);
      let s = { ...state, error: null };
      if (s.done) s = { ...s, expr: '', done: false, lastExpr: '' };
      let e = s.expr;
      if (OPERAND_END.test(e)) e += '*'; // ضرب ضمني مثل إدخال رقم بعد قيمة
      if (e.length + text.length > MAX_LEN) return { state, memory };
      return { state: { ...s, expr: e + text }, memory };
    }

    return { state, memory };
  }

  /* ------------------------------------------------------------------ */
  /* تصدير السجل — نص نقي بدون DOM                                        */
  /* ------------------------------------------------------------------ */

  /**
   * ينسّق السجل كملف نصي: سطر ترويسة اختياري ثم "التعبير = النتيجة" لكل عملية.
   * يتجاهل الإدخالات المعطوبة. بدون عمليات يرجع الترويسة فقط (أو نصاً فارغاً).
   */
  function exportHistoryText(items, header = '') {
    const lines = (Array.isArray(items) ? items : [])
      .filter((x) => x && typeof x.expr === 'string' && typeof x.result === 'string')
      .map((x) => `${Calc.formatExpression(x.expr)} = ${x.result}`);
    const out = header ? [header, ''].concat(lines) : lines;
    return out.length ? out.join('\n') + '\n' : '';
  }

  /* ------------------------------------------------------------------ */
  /* البحث في السجل — نص نقي بدون DOM                                     */
  /* ------------------------------------------------------------------ */

  /** يوحّد نص البحث: أرقام لاتينية، بدون مسافات/فواصل آلاف، وعلامات العمليات المعروضة. */
  function normalizeSearch(text) {
    return Calc.delocalizeNumerals(String(text))
      .toLowerCase()
      .replace(/[×·∗]/g, '*')
      .replace(/[÷∕]/g, '/')
      .replace(/[−–]/g, '-')
      .replace(/[\s,]/g, '');
  }

  /** يرجع فهارس عناصر السجل المطابقة (بترتيبها الأصلي). البحث فارغ = كل العناصر. */
  function searchHistory(items, query) {
    const list = Array.isArray(items) ? items : [];
    const q = normalizeSearch(query || '');
    const out = [];
    list.forEach((x, i) => {
      if (!x || typeof x.expr !== 'string' || typeof x.result !== 'string') return;
      if (q === '' || normalizeSearch(x.expr + '|' + x.result).includes(q)) out.push(i);
    });
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* حاسبة التواريخ (التقويم الميلادي) — أيام صحيحة بدون كائن Date        */
  /* ------------------------------------------------------------------ */

  const MAX_DAY_COUNT = 1000000;
  const MIN_YEAR = 1;
  const MAX_YEAR = 9999;

  const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const daysInMonth = (y, m) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  const pad = (n, w) => String(n).padStart(w, '0');

  /** 'YYYY-MM-DD' → {y,m,d} أو null إن لم يكن تاريخاً حقيقياً داخل النطاق. */
  function parseDate(str) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str).trim());
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (y < MIN_YEAR || y > MAX_YEAR || mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
    return { y, m: mo, d };
  }

  function formatDate(dt) {
    return `${pad(dt.y, 4)}-${pad(dt.m, 2)}-${pad(dt.d, 2)}`;
  }

  /** عدد الأيام منذ 1970-01-01 (خوارزمية civil-from-days). */
  function toDays(dt) {
    const y = dt.m <= 2 ? dt.y - 1 : dt.y;
    const era = Math.floor(y / 400);
    const yoe = y - era * 400;
    const doy = Math.floor((153 * (dt.m + (dt.m > 2 ? -3 : 9)) + 2) / 5) + dt.d - 1;
    const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
    return era * 146097 + doe - 719468;
  }

  function fromDays(n) {
    const z = n + 719468;
    const era = Math.floor(z / 146097);
    const doe = z - era * 146097;
    const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
    const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
    const mp = Math.floor((5 * doy + 2) / 153);
    const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
    const m = mp < 10 ? mp + 3 : mp - 9;
    return { y: yoe + era * 400 + (m <= 2 ? 1 : 0), m, d };
  }

  /** 0 = الأحد … 6 = السبت */
  function weekdayOf(dt) {
    return (((toDays(dt) + 4) % 7) + 7) % 7;
  }

  /**
   * الفرق بين تاريخين نصيين. يرجع null لو أحدهما غير صالح، وإلا:
   * { days (موجب دائماً), negative (الثاني أسبق), weeks, restDays, years, months, restMonthDays }
   */
  function dateDifference(a, b) {
    const da = parseDate(a);
    const db = parseDate(b);
    if (!da || !db) return null;
    const total = toDays(db) - toDays(da);
    const negative = total < 0;
    const [lo, hi] = negative ? [db, da] : [da, db];
    // أشهر كاملة من التاريخ الأقدم (مع تقليص اليوم لآخر الشهر القصير)، والباقي أيام.
    const anchor = (n) => {
      const idx = lo.y * 12 + (lo.m - 1) + n;
      const y = Math.floor(idx / 12);
      const m = (idx % 12) + 1;
      return { y, m, d: Math.min(lo.d, daysInMonth(y, m)) };
    };
    let wholeMonths = (hi.y - lo.y) * 12 + (hi.m - lo.m);
    if (toDays(anchor(wholeMonths)) > toDays(hi)) wholeMonths -= 1;
    const years = Math.floor(wholeMonths / 12);
    const months = wholeMonths % 12;
    const days = toDays(hi) - toDays(anchor(wholeMonths));
    const abs = Math.abs(total);
    return { days: abs, negative, weeks: Math.floor(abs / 7), restDays: abs % 7, years, months, restMonthDays: days };
  }

  /** يقرأ عدد أيام صحيحاً (أرقام لاتينية أو هندية). null لو غير صالح أو أكبر من الحد. */
  function parseDayCount(str) {
    const s = Calc.delocalizeNumerals(String(str)).replace(/[\s,]/g, '');
    if (!/^\d{1,7}$/.test(s)) return null;
    const n = Number(s);
    return n <= MAX_DAY_COUNT ? n : null;
  }

  /** يضيف (أو يطرح) أياماً لتاريخ نصي. null لو التاريخ/العدد غير صالح أو الناتج خارج السنوات 1–9999. */
  function addDays(dateStr, count, sign) {
    const dt = parseDate(dateStr);
    if (!dt || !Number.isInteger(count) || Math.abs(count) > MAX_DAY_COUNT) return null;
    const out = fromDays(toDays(dt) + (sign < 0 ? -count : count));
    if (out.y < MIN_YEAR || out.y > MAX_YEAR) return null;
    return { date: formatDate(out), weekday: weekdayOf(out), y: out.y, m: out.m, d: out.d };
  }

  return {
    MAX_LEN,
    FUNCS,
    initialState,
    press,
    view,
    isPlainNumber,
    deleteLast,
    memoryOperand,
    memoryApply,
    exportHistoryText,
    searchHistory,
    MAX_DAY_COUNT,
    parseDate,
    parseDayCount,
    dateDifference,
    addDays,
  };
});
