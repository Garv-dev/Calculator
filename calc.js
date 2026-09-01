(function () {
  const historyEl = document.getElementById('history');
  const resultEl = document.getElementById('result');
  const tagShift = document.getElementById('tag-shift');
  const tagDeg = document.getElementById('tag-deg');
  const tagRad = document.getElementById('tag-rad');
  const tagAns = document.getElementById('tag-ans');
  const shiftBtn = document.getElementById('shiftBtn');

  let expr = '';
  let ans = 0;
  let hasAns = false;
  let shift = false;
  let degMode = true;
  let justEvaluated = false;

  const funcNames = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln', 'sqrt'];

  function updateTags() {
    tagShift.classList.toggle('on', shift);
    tagDeg.classList.toggle('on', degMode);
    tagRad.classList.toggle('on', !degMode);
    tagAns.classList.toggle('on', hasAns);
    shiftBtn.classList.toggle('active', shift);
  }

  function displayOp(t) {
    return { '+': '+', '-': '−', '*': '×', '/': '÷', '^': '^', '%': '%', '!': '!' }[t] || t;
  }

  function colorizeExpr(str) {
    const tokens = str.match(/Ans|asin|acos|atan|sin|cos|tan|log|ln|sqrt|\d+\.?\d*|\.\d+|\u03c0|e|[+\-*/^%!()]/g) || [];
    return tokens.map((t) => {
      if (t === 'Ans') return '<span class="ans-token">Ans</span>';
      if (funcNames.includes(t)) return '<span class="func-token">' + t + '</span>';
      if (t === '\u03c0' || t === 'e') return '<span class="func-token">' + t + '</span>';
      if (/^[+\-*/^%!()]$/.test(t)) return '<span class="op-token">' + displayOp(t) + '</span>';
      return '<span class="num-token">' + t + '</span>';
    }).join('');
  }

  function formatNumber(num) {
    if (!isFinite(num)) return 'Error';
    let str;
    if (Math.abs(num) >= 1e12 || (Math.abs(num) < 1e-9 && num !== 0)) {
      str = num.toExponential(6).replace(/e\+?/, 'E');
    } else {
      str = parseFloat(num.toPrecision(11)).toString();
    }
    return str;
  }

  function tokenize(str) {
    const re = /Ans|asin|acos|atan|sin|cos|tan|log|ln|sqrt|\d+\.?\d*|\.\d+|\u03c0|e|[+\-*/^%!()]/g;
    return str.match(re) || [];
  }

  function evaluate(str) {
    try {
      const tokens = tokenize(str);
      let pos = 0;

      function peek() { return tokens[pos]; }
      function next() { return tokens[pos++]; }

      function parseExpr() {
        let v = parseTerm();
        while (peek() === '+' || peek() === '-') {
          const op = next();
          const r = parseTerm();
          v = op === '+' ? v + r : v - r;
        }
        return v;
      }

      function parseTerm() {
        let v = parseUnary();
        while (peek() === '*' || peek() === '/' || peek() === '%') {
          const op = next();
          if (op === '%') {
            v = v / 100;
            continue;
          }
          const r = parseUnary();
          v = op === '*' ? v * r : v / r;
        }
        return v;
      }

      function parseUnary() {
        if (peek() === '-') {
          next();
          return -parseUnary();
        }
        if (peek() === '+') {
          next();
          return parseUnary();
        }
        return parsePower();
      }

      function parsePower() {
        let v = parsePostfix();
        if (peek() === '^') {
          next();
          const r = parseUnary();
          v = Math.pow(v, r);
        }
        return v;
      }

      function parsePostfix() {
        let v = parsePrimary();
        while (peek() === '!') {
          next();
          v = factorial(v);
        }
        return v;
      }

      function toRad(v) {
        return degMode ? v * Math.PI / 180 : v;
      }

      function fromRad(v) {
        return degMode ? v * 180 / Math.PI : v;
      }

      function parsePrimary() {
        const t = next();
        if (t === undefined) throw new Error('unexpected end');
        if (t === '(') {
          const v = parseExpr();
          if (peek() === ')') next();
          return v;
        }
        if (t === 'Ans') return hasAns ? ans : 0;
        if (t === '\u03c0') return Math.PI;
        if (t === 'e') return Math.E;
        if (funcNames.includes(t)) {
          let arg;
          if (peek() === '(') {
            next();
            arg = parseExpr();
            if (peek() === ')') next();
          } else {
            arg = parseUnary();
          }

          switch (t) {
            case 'sin': return Math.sin(toRad(arg));
            case 'cos': return Math.cos(toRad(arg));
            case 'tan': return Math.tan(toRad(arg));
            case 'asin': return fromRad(Math.asin(arg));
            case 'acos': return fromRad(Math.acos(arg));
            case 'atan': return fromRad(Math.atan(arg));
            case 'log': return Math.log10(arg);
            case 'ln': return Math.log(arg);
            case 'sqrt': return Math.sqrt(arg);
          }
        }
        if (/^[\d.]/.test(t)) return parseFloat(t);
        throw new Error('bad token ' + t);
      }

      function factorial(n) {
        n = Math.round(n);
        if (n < 0) return NaN;
        let r = 1;
        for (let i = 2; i <= n; i++) r *= i;
        return r;
      }

      const v = parseExpr();
      if (pos !== tokens.length) throw new Error('trailing tokens');
      if (isNaN(v)) return { ok: false };
      return { ok: true, value: v };
    } catch (e) {
      return { ok: false };
    }
  }

  function render(liveResult) {
    historyEl.innerHTML = expr ? colorizeExpr(expr) : '&nbsp;';
    resultEl.classList.remove('sign-pos', 'sign-neg', 'sign-neutral', 'is-ans');

    if (liveResult && liveResult.ok) {
      const v = liveResult.value;
      resultEl.textContent = formatNumber(v);
      if (v > 0) resultEl.classList.add('sign-pos');
      else if (v < 0) resultEl.classList.add('sign-neg');
      else resultEl.classList.add('sign-neutral');
    } else if (liveResult && !liveResult.ok && expr) {
      resultEl.textContent = 'Error';
      resultEl.classList.add('sign-neg');
    } else {
      resultEl.textContent = '0';
      resultEl.classList.add('sign-neutral');
    }
    updateTags();
  }

  function append(str) {
    if (justEvaluated) {
      if (/^[0-9.(]/.test(str) || funcNames.includes(str.replace('(', ''))) {
        expr = '';
      }
      justEvaluated = false;
    }
    expr += str;
    live();
  }

  function live() {
    if (!expr) {
      render(null);
      return;
    }
    const r = evaluate(expr);
    render(r);
  }

  function clearAll() {
    expr = '';
    justEvaluated = false;
    render(null);
  }

  function del() {
    if (justEvaluated) {
      clearAll();
      return;
    }

    const funcMatch = expr.match(/(asin|acos|atan|sin|cos|tan|log|ln|sqrt)\($/);
    if (funcMatch) {
      expr = expr.slice(0, -funcMatch[0].length);
    } else {
      expr = expr.slice(0, -1);
    }
    live();
  }

  function equals() {
    if (!expr) return;
    const r = evaluate(expr);
    if (r.ok) {
      ans = r.value;
      hasAns = true;
      historyEl.innerHTML = colorizeExpr(expr) + '<span class="op-token"> =</span>';
      resultEl.textContent = formatNumber(r.value);
      resultEl.classList.remove('sign-pos', 'sign-neg', 'sign-neutral');
      resultEl.classList.add(r.value > 0 ? 'sign-pos' : r.value < 0 ? 'sign-neg' : 'sign-neutral');
      resultEl.classList.add('is-ans');
      expr = formatNumber(r.value);
      justEvaluated = true;
      updateTags();
    } else {
      resultEl.textContent = 'Error';
      resultEl.classList.remove('sign-pos', 'sign-neutral');
      resultEl.classList.add('sign-neg');
    }
  }

  document.querySelectorAll('[data-num]').forEach((btn) => {
    btn.addEventListener('click', () => append(btn.dataset.num));
  });

  document.querySelectorAll('[data-op]').forEach((btn) => {
    btn.addEventListener('click', () => append(btn.dataset.op));
  });

  document.querySelectorAll('[data-trig]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const base = btn.dataset.trig;
      const name = shift ? 'a' + base : base;
      append(name + '(');
      if (shift) {
        shift = false;
        updateTags();
      }
    });
  });

  shiftBtn.addEventListener('click', () => {
    shift = !shift;
    updateTags();
  });

  document.querySelector('[data-action="clear"]').addEventListener('click', clearAll);
  document.querySelector('[data-action="del"]').addEventListener('click', del);
  document.querySelector('[data-action="equals"]').addEventListener('click', equals);
  document.querySelector('[data-action="decimal"]').addEventListener('click', () => append('.'));
  document.querySelector('[data-action="paren-open"]').addEventListener('click', () => append('('));
  document.querySelector('[data-action="paren-close"]').addEventListener('click', () => append(')'));
  document.querySelector('[data-action="pi"]').addEventListener('click', () => append('\u03c0'));
  document.querySelector('[data-action="euler"]').addEventListener('click', () => append('e'));
  document.querySelector('[data-action="log"]').addEventListener('click', () => append('log('));
  document.querySelector('[data-action="ln"]').addEventListener('click', () => append('ln('));
  document.querySelector('[data-action="sqrt"]').addEventListener('click', () => append('sqrt('));
  document.querySelector('[data-action="sq"]').addEventListener('click', () => append('^2'));
  document.querySelector('[data-action="cube"]').addEventListener('click', () => append('^3'));
  document.querySelector('[data-action="pow"]').addEventListener('click', () => append('^'));
  document.querySelector('[data-action="inv"]').addEventListener('click', () => append('^(-1)'));
  document.querySelector('[data-action="fact"]').addEventListener('click', () => append('!'));
  document.querySelector('[data-action="ans"]').addEventListener('click', () => append('Ans'));
  document.querySelector('[data-action="percent"]').addEventListener('click', () => append('%'));
  document.querySelector('[data-action="mode"]').addEventListener('click', () => {
    degMode = !degMode;
    updateTags();
  });
  document.querySelector('[data-action="negate"]').addEventListener('click', () => {
    const m = expr.match(/(\d+\.?\d*)$/);
    if (m) {
      const num = m[1];
      const startIdx = expr.length - num.length;
      const before = expr.slice(0, startIdx);
      if (before.endsWith('(-')) {
        expr = before.slice(0, -2) + num;
      } else if (before.endsWith('-') && !/[0-9)\u03c0e!]$/.test(before.slice(0, -1))) {
        expr = before.slice(0, -1) + num;
      } else {
        expr = before + '(-' + num + ')';
      }
      live();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key >= '0' && e.key <= '9') {
      append(e.key);
      return;
    }
    if (e.key === '.') {
      append('.');
      return;
    }
    if (['+', '-', '*', '/', '^', '%', '(', ')', '!'].includes(e.key)) {
      append(e.key);
      return;
    }
    if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      equals();
      return;
    }
    if (e.key === 'Backspace') {
      del();
      return;
    }
    if (e.key === 'Escape') {
      clearAll();
      return;
    }
  });

  render(null);
})();
