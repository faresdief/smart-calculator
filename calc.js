/*
 * calc.js — محرك الحساب (بدون eval)
 * Calculation engine: tokenizer → recursive-descent parser → evaluator.
 *
 * يعمل في المتصفح (window.CalcEngine) وفي Node (require) لتسهيل الاختبار.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CalcEngine = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** عدد الأرقام المعنوية — يكفي لإزالة أخطاء الفاصلة العائمة (0.1 + 0.2) مع الحفاظ على الأعداد الصحيحة الكبيرة. */
  const PRECISION = 15;

  /** الدوال المدعومة. */
  const FUNCTIONS = ['asin', 'acos', 'atan', 'sqrt', 'sin', 'cos', 'tan', 'log', 'abs', 'ln'];
  /** أسماء نصية يتعرّف عليها المحلّل (الأطول أولاً حتى لا تتداخل: atan / tan). */
  const NAMES = [...FUNCTIONS, 'pi', 'e'];

  class CalcError extends Error {
    /** @param {'SYNTAX'|'DIV_ZERO'|'DOMAIN'|'OVERFLOW'|'EMPTY'} code */
    constructor(code) {
      super(code);
      this.name = 'CalcError';
      this.code = code;
    }
  }

  /* ------------------------------------------------------------------ */
  /* أدوات الأرقام                                                      */
  /* ------------------------------------------------------------------ */

  /** يقرّب إلى 15 رقماً معنوياً ويمنع Infinity / NaN / -0. */
  function clean(x) {
    if (!Number.isFinite(x)) throw new CalcError(Number.isNaN(x) ? 'DOMAIN' : 'OVERFLOW');
    const r = Number(x.toPrecision(PRECISION));
    return r === 0 ? 0 : r;
  }

  /** يحوّل رقماً إلى نص قابل لإعادة القراءة (الأرقام الكبيرة/الصغيرة بصيغة 1.5E+25). */
  function formatResult(n) {
    n = clean(n);
    const abs = Math.abs(n);
    if (abs !== 0 && (abs >= 1e15 || abs < 1e-6)) return n.toExponential().replace('e', 'E');
    return String(n);
  }

  /* ------------------------------------------------------------------ */
  /* التقطيع (Tokenizer)                                                */
  /* ------------------------------------------------------------------ */

  const NUMBER_RE = /^(?:\d+\.?\d*|\.\d+)(?:E[+-]?\d+)?/;

  function normalize(src) {
    return String(src)
      .replace(/[×·∗]/g, '*')
      .replace(/[÷∕]/g, '/')
      .replace(/[−–—]/g, '-');
  }

  /**
   * @returns {Array<{t:string, v?:any, raw?:string}>}
   * t: num | op | pct | fact | lp | rp | const | fn
   */
  function tokenize(src) {
    const s = normalize(src);
    const tokens = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];

      if (/\s/.test(c)) {
        i += 1; // المسافة فاصل فقط: "2 3" تبقى رقمين متتاليين → خطأ صياغة
        continue;
      }
      if ((c >= '0' && c <= '9') || c === '.') {
        const m = NUMBER_RE.exec(s.slice(i));
        if (!m) throw new CalcError('SYNTAX'); // نقطة وحدها
        tokens.push({ t: 'num', v: parseFloat(m[0]), raw: m[0] });
        i += m[0].length;
        continue;
      }
      if (c === '+' || c === '-' || c === '*' || c === '/' || c === '^') {
        tokens.push({ t: 'op', v: c });
      } else if (c === '%') tokens.push({ t: 'pct' });
      else if (c === '!') tokens.push({ t: 'fact' });
      else if (c === '(') tokens.push({ t: 'lp' });
      else if (c === ')') tokens.push({ t: 'rp' });
      else if (c === 'π') tokens.push({ t: 'const', v: 'pi' });
      else if (c === '√') tokens.push({ t: 'fn', v: 'sqrt' });
      else {
        const rest = s.slice(i);
        const name = NAMES.find((n) => rest.startsWith(n));
        if (!name) throw new CalcError('SYNTAX');
        if (name === 'pi' || name === 'e') tokens.push({ t: 'const', v: name });
        else tokens.push({ t: 'fn', v: name });
        i += name.length;
        continue;
      }
      i += 1;
    }
    return tokens;
  }

  /* ------------------------------------------------------------------ */
  /* المحلّل (Parser) → شجرة AST                                        */
  /* ------------------------------------------------------------------ */
  /*
   * expr    := term (('+'|'-') term)*
   * term    := unary (('*'|'/'|ضرب ضمني) unary)*
   * unary   := ('-'|'+') unary | power
   * power   := postfix ('^' unary)?          // يمين-إلى-يسار: 2^3^2 = 2^(3^2)
   * postfix := primary ('!' | '%')*
   * primary := num | const | '(' expr ')' | fn ( '(' expr ')' | operand )
   */
  function parse(tokens) {
    let p = 0;
    const peek = () => tokens[p];
    const take = () => tokens[p++];
    const fail = () => {
      throw new CalcError('SYNTAX');
    };
    const isOp = (tok, ...ops) => tok && tok.t === 'op' && ops.includes(tok.v);
    const startsOperand = (tok) => tok && (tok.t === 'num' || tok.t === 'const' || tok.t === 'fn' || tok.t === 'lp');

    function parseExpr() {
      let node = parseTerm();
      while (isOp(peek(), '+', '-')) {
        const op = take().v;
        node = { type: 'bin', op, left: node, right: parseTerm() };
      }
      return node;
    }

    function parseTerm() {
      let node = parseUnary();
      for (;;) {
        const tok = peek();
        if (isOp(tok, '*', '/')) {
          take();
          node = { type: 'bin', op: tok.v, left: node, right: parseUnary() };
        } else if (startsOperand(tok)) {
          // ضرب ضمني: 2π ، 2(3) ، (1+2)(3+4) — لكن "1.2.3" (رقمان متلاصقان) خطأ.
          if (tok.t === 'num' && tokens[p - 1].t === 'num') fail();
          node = { type: 'bin', op: '*', left: node, right: parseUnary() };
        } else break;
      }
      return node;
    }

    function parseUnary() {
      const tok = peek();
      if (isOp(tok, '-', '+')) {
        take();
        const arg = parseUnary();
        return tok.v === '-' ? { type: 'neg', arg } : arg;
      }
      return parsePower();
    }

    function parsePower() {
      const base = parsePostfix();
      if (isOp(peek(), '^')) {
        take();
        return { type: 'bin', op: '^', left: base, right: parseUnary() };
      }
      return base;
    }

    function parsePostfix() {
      let node = parsePrimary();
      for (;;) {
        const tok = peek();
        if (tok && tok.t === 'fact') {
          take();
          node = { type: 'fact', arg: node };
        } else if (tok && tok.t === 'pct') {
          take();
          node = { type: 'pct', arg: node };
        } else break;
      }
      return node;
    }

    function parseGroup() {
      const inner = parseExpr();
      const close = take();
      if (!close || close.t !== 'rp') fail();
      return inner;
    }

    /** معامل دالة بدون أقواس: √9 ، sin30 */
    function parseFnOperand() {
      const tok = peek();
      if (isOp(tok, '-')) {
        take();
        return { type: 'neg', arg: parseFnOperand() };
      }
      if (tok && (tok.t === 'num' || tok.t === 'const' || tok.t === 'fn')) return parsePrimary();
      return fail();
    }

    function parsePrimary() {
      const tok = take();
      if (!tok) return fail();
      switch (tok.t) {
        case 'num':
          return { type: 'num', value: tok.v };
        case 'const':
          return { type: 'const', name: tok.v };
        case 'lp':
          return { type: 'group', arg: parseGroup() };
        case 'fn': {
          let arg;
          if (peek() && peek().t === 'lp') {
            take();
            arg = parseGroup();
          } else arg = parseFnOperand();
          return { type: 'fn', name: tok.v, arg };
        }
        default:
          return fail();
      }
    }

    const ast = parseExpr();
    if (p !== tokens.length) fail();
    return ast;
  }

  /* ------------------------------------------------------------------ */
  /* التقييم                                                            */
  /* ------------------------------------------------------------------ */

  function power(a, b) {
    if (a === 0 && b < 0) throw new CalcError('DIV_ZERO');
    return clean(Math.pow(a, b)); // NaN (جذر زوجي لسالب) → DOMAIN داخل clean
  }

  function factorial(n) {
    if (!Number.isInteger(n) || n < 0) throw new CalcError('DOMAIN');
    if (n > 170) throw new CalcError('OVERFLOW');
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return clean(r);
  }

  function trig(name, x, angle) {
    // هل الزاوية مضاعف لـ 90° (أو π/2)؟ نتسامح مع تقريب الـ 15 رقماً: sin(π) = 0 و tan(π/2) غير معرّف
    const k = angle === 'deg' ? x / 90 : x / (Math.PI / 2);
    const r = Math.round(k);
    if (r !== 0 && Math.abs(k - r) < 1e-13 * Math.max(1, Math.abs(k))) {
      const q = ((r % 4) + 4) % 4;
      if (name === 'sin') return [0, 1, 0, -1][q];
      if (name === 'cos') return [1, 0, -1, 0][q];
      if (q % 2 === 1) throw new CalcError('DOMAIN'); // tan(90°)
      return 0;
    }
    const rad = angle === 'deg' ? (x * Math.PI) / 180 : x;
    if (name === 'sin') return Math.sin(rad);
    if (name === 'cos') return Math.cos(rad);
    return Math.tan(rad);
  }

  function applyFn(name, x, angle) {
    switch (name) {
      case 'sin':
      case 'cos':
      case 'tan':
        return clean(trig(name, x, angle));
      case 'asin':
      case 'acos': {
        if (x < -1 || x > 1) throw new CalcError('DOMAIN');
        const r = name === 'asin' ? Math.asin(x) : Math.acos(x);
        return clean(angle === 'deg' ? (r * 180) / Math.PI : r);
      }
      case 'atan': {
        const r = Math.atan(x);
        return clean(angle === 'deg' ? (r * 180) / Math.PI : r);
      }
      case 'ln':
        if (x <= 0) throw new CalcError('DOMAIN');
        return clean(Math.log(x));
      case 'log':
        if (x <= 0) throw new CalcError('DOMAIN');
        return clean(Math.log10(x));
      case 'sqrt':
        if (x < 0) throw new CalcError('DOMAIN');
        return clean(Math.sqrt(x));
      case 'abs':
        return clean(Math.abs(x));
      default:
        throw new CalcError('SYNTAX');
    }
  }

  function evalNode(node, ctx) {
    switch (node.type) {
      case 'num':
        return node.value;
      case 'const':
        return node.name === 'pi' ? Math.PI : Math.E;
      case 'group':
        return evalNode(node.arg, ctx);
      case 'neg':
        return -evalNode(node.arg, ctx);
      case 'pct':
        return clean(evalNode(node.arg, ctx) / 100);
      case 'fact':
        return factorial(evalNode(node.arg, ctx));
      case 'fn':
        return applyFn(node.name, evalNode(node.arg, ctx), ctx.angle);
      case 'bin': {
        const a = evalNode(node.left, ctx);
        // نسبة ذكية: 200 + 10% = 220 (النسبة من الرقم الأول) — مثل حاسبات الهاتف
        if ((node.op === '+' || node.op === '-') && node.right.type === 'pct') {
          const delta = clean((a * evalNode(node.right.arg, ctx)) / 100);
          return clean(node.op === '+' ? a + delta : a - delta);
        }
        const b = evalNode(node.right, ctx);
        switch (node.op) {
          case '+':
            return clean(a + b);
          case '-':
            return clean(a - b);
          case '*':
            return clean(a * b);
          case '/':
            if (b === 0) throw new CalcError('DIV_ZERO');
            return clean(a / b);
          default:
            return power(a, b);
        }
      }
      default:
        throw new CalcError('SYNTAX');
    }
  }

  /* ------------------------------------------------------------------ */
  /* واجهة الاستخدام                                                    */
  /* ------------------------------------------------------------------ */

  const TAIL_RE = /(?:asin\(|acos\(|atan\(|sqrt\(|sin\(|cos\(|tan\(|log\(|abs\(|ln\(|√\(|√|\(|[+\-*/^×÷−])$/;

  /** عدد الأقواس المفتوحة وغير المغلقة. */
  function openParens(expr) {
    let n = 0;
    for (const c of String(expr)) {
      if (c === '(') n += 1;
      else if (c === ')') n -= 1;
    }
    return Math.max(n, 0);
  }

  /**
   * يُكمل تعبيراً ناقصاً: يحذف العمليات/الأقواس المفتوحة الزائدة في النهاية ويغلق الأقواس.
   * "5+" → "5" ، "5×(3+" → "5×(3)" ، "sin(30" → "sin(30)".
   */
  function complete(expr) {
    let s = String(expr);
    let prev;
    do {
      prev = s;
      s = s.replace(TAIL_RE, '');
    } while (s !== prev);
    return s + ')'.repeat(openParens(s));
  }

  /** يقيّم تعبيراً ويُرجع رقماً، أو يرمي CalcError. */
  function evaluate(expr, opts = {}) {
    let tokens;
    try {
      tokens = tokenize(expr);
      if (!tokens.length) throw new CalcError('EMPTY');
      let depth = 0;
      for (const tok of tokens) {
        if (tok.t === 'lp') depth += 1;
        else if (tok.t === 'rp' && --depth < 0) throw new CalcError('SYNTAX');
      }
      while (depth-- > 0) tokens.push({ t: 'rp' });
      const ast = parse(tokens);
      return clean(evalNode(ast, { angle: opts.angle === 'rad' ? 'rad' : 'deg' }));
    } catch (err) {
      if (err instanceof CalcError) throw err;
      throw new CalcError('SYNTAX'); // مثل RangeError عند أقواس متداخلة بشكل مبالغ فيه
    }
  }

  /**
   * ينظّف نصاً (مثلاً من اللصق) إلى الصيغة الداخلية للحاسبة، أو يرمي SYNTAX.
   * "sqrt(9) × 2" → "√(9)*2"
   */
  function canonicalize(src) {
    return tokenize(src)
      .map((tok) => {
        switch (tok.t) {
          case 'num':
            return tok.raw;
          case 'op':
            return tok.v;
          case 'pct':
            return '%';
          case 'fact':
            return '!';
          case 'lp':
            return '(';
          case 'rp':
            return ')';
          case 'const':
            return tok.v === 'pi' ? 'π' : 'e';
          default:
            return tok.v === 'sqrt' ? '√' : tok.v;
        }
      })
      .join('');
  }

  /* ------------------------------------------------------------------ */
  /* العرض والتنسيق                                                     */
  /* ------------------------------------------------------------------ */

  const DISPLAY_RE = /(\d+\.?\d*|\.\d+)(E[+-]?\d+)?|asin\(|acos\(|atan\(|sqrt\(|[*/\-]/g;

  /** يضيف فواصل الآلاف للجزء الصحيح: 1234567 → 1,234,567 */
  function groupDigits(intPart, sep = ',') {
    return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  }

  /** ينسّق تعبيراً للعرض: × ÷ − √ وفواصل الآلاف. */
  function formatExpression(expr, opts = {}) {
    const group = opts.group !== false;
    return String(expr).replace(DISPLAY_RE, (m, num, exp) => {
      if (num !== undefined) {
        if (!group) return m;
        const dot = num.indexOf('.');
        const intPart = dot === -1 ? num : num.slice(0, dot);
        const rest = dot === -1 ? '' : num.slice(dot);
        return groupDigits(intPart) + rest + (exp || '');
      }
      switch (m) {
        case '*':
          return '×';
        case '/':
          return '÷';
        case '-':
          return '−';
        case 'sqrt(':
          return '√(';
        case 'asin(':
          return 'sin⁻¹(';
        case 'acos(':
          return 'cos⁻¹(';
        case 'atan(':
          return 'tan⁻¹(';
        default:
          return m;
      }
    });
  }

  /** يحوّل الأرقام اللاتينية إلى هندية (٠١٢٣) مع الفاصلة العشرية ٫ والآلاف ٬ */
  function localizeNumerals(str) {
    return String(str)
      .replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])
      .replace(/\./g, '٫')
      .replace(/,/g, '٬');
  }

  /** عكس localizeNumerals — مفيد عند اللصق. */
  function delocalizeNumerals(str) {
    return String(str)
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/[٫]/g, '.')
      .replace(/[٬]/g, ',');
  }

  return {
    CalcError,
    evaluate,
    complete,
    openParens,
    canonicalize,
    formatResult,
    formatExpression,
    groupDigits,
    localizeNumerals,
    delocalizeNumerals,
    tokenize,
  };
});
