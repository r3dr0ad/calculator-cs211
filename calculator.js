"use strict";

/* ==========================================================
   PART 1: MATH ENGINE
   Reads text like "sin(30)+2^3" and calculates it safely.
   No eval(). Only the things we list below can ever run.
   Steps: tokenize (cut into pieces) -> parse (put in order)
          -> calculate (do the math, as we parse).
   ========================================================== */

const MAX_LENGTH = 200; // stops giant input
const MAX_FACTORIAL = 170; // 171! is too big for JavaScript numbers

// Our own error type. The app shows its message on screen.
class CalcError extends Error {}

const FUNCTIONS = new Set(["sin", "cos", "tan", "log", "ln", "sqrt"]);
const CONSTANTS = new Set(["pi", "e", "ans"]);

// Every allowed symbol, and what it means.
const SYMBOLS = {
  "+": "+",
  "-": "-",
  "−": "-",
  "*": "*",
  "×": "*",
  "/": "/",
  "÷": "/",
  "^": "^",
  "!": "!",
  "%": "%",
};

/* Step 1: TOKENIZER
   "2+sin(30)" -> [2] [+] [sin] [(] [30] [)] */
function tokenize(text) {
  const tokens = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (/\s/.test(ch)) {
      i++;
    } else if (/[0-9.]/.test(ch)) {
      const match = /^(?:\d+\.?\d*|\.\d+)/.exec(text.slice(i));
      if (!match) throw new CalcError("Syntax error");
      i += match[0].length;
      if (text[i] === ".") throw new CalcError("Syntax error"); // like 1.2.3
      tokens.push({ type: "num", value: Number(match[0]) });
    } else if (ch === "π") {
      tokens.push({ type: "const", value: "pi" });
      i++;
    } else if (ch === "√") {
      tokens.push({ type: "func", value: "sqrt" });
      i++;
    } else if (/[a-zA-Z]/.test(ch)) {
      const rest = text.slice(i).toLowerCase();
      const name = [...FUNCTIONS, ...CONSTANTS].find((n) => rest.startsWith(n));
      if (!name) throw new CalcError("Unknown word");
      tokens.push({ type: FUNCTIONS.has(name) ? "func" : "const", value: name });
      i += name.length;
    } else if (ch === "(") {
      tokens.push({ type: "lp" });
      i++;
    } else if (ch === ")") {
      tokens.push({ type: "rp" });
      i++;
    } else if (Object.hasOwn(SYMBOLS, ch)) {
      tokens.push({ type: "op", value: SYMBOLS[ch] });
      i++;
    } else {
      throw new CalcError("Syntax error");
    }
  }
  return tokens;
}

/* Step 2 and 3: PARSER + CALCULATOR
   Each parse function handles one level of priority.
   Low priority first, high priority last:
     + -   then   * /   then   unary minus   then   ^   then   ! %   then   numbers, ( ), functions
   That order is why 2+3*4 gives 14 and not 20. */
function evaluate(text, { angleMode = "DEG", ans = 0 } = {}) {
  if (text.length > MAX_LENGTH) throw new CalcError("Too long");

  const tokens = tokenize(text);
  let pos = 0;

  const peek = () => tokens[pos];
  const isOp = (token, ...ops) => token && token.type === "op" && ops.includes(token.value);

  // expression: term (+|- term)*
  function parseExpression() {
    let value = parseTerm();
    while (isOp(peek(), "+", "-")) {
      const op = tokens[pos++].value;
      const right = parseTerm();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  }

  // term: unary (*|/ unary)*, also "2π" and "2(3)" (implicit multiply)
  function parseTerm() {
    let value = parseUnary();
    for (;;) {
      const token = peek();
      if (isOp(token, "*", "/")) {
        pos++;
        const right = parseUnary();
        if (token.value === "/") {
          if (right === 0) throw new CalcError("Divide by 0");
          value /= right;
        } else {
          value *= right;
        }
      } else if (token && ["num", "const", "func", "lp"].includes(token.type)) {
        value *= parsePower();
      } else {
        return value;
      }
    }
  }

  // unary: a leading + or - (so -2^2 = -4, like a real calculator)
  function parseUnary() {
    if (isOp(peek(), "-")) {
      pos++;
      return -parseUnary();
    }
    if (isOp(peek(), "+")) {
      pos++;
      return parseUnary();
    }
    return parsePower();
  }

  // power: postfix (^ unary)?   (2^3^2 = 2^9, right to left)
  function parsePower() {
    const base = parsePostfix();
    if (isOp(peek(), "^")) {
      pos++;
      const result = Math.pow(base, parseUnary());
      if (!Number.isFinite(result)) throw new CalcError("Math error");
      return result;
    }
    return base;
  }

  // postfix: primary (! | %)*
  function parsePostfix() {
    let value = parsePrimary();
    while (isOp(peek(), "!", "%")) {
      const op = tokens[pos++].value;
      value = op === "!" ? factorial(value) : value / 100;
    }
    return value;
  }

  // primary: number | constant | function(...) | (...)
  function parsePrimary() {
    const token = tokens[pos++];
    if (!token) throw new CalcError("Syntax error");

    if (token.type === "num") return token.value;

    if (token.type === "const") {
      if (token.value === "pi") return Math.PI;
      if (token.value === "e") return Math.E;
      return ans;
    }

    if (token.type === "func") {
      if (peek() && peek().type === "lp") pos++;
      else throw new CalcError("Syntax error");
      const inner = parseExpression();
      closeParen();
      return applyFunction(token.value, inner);
    }

    if (token.type === "lp") {
      const inner = parseExpression();
      closeParen();
      return inner;
    }

    throw new CalcError("Syntax error");
  }

  // A missing ")" at the very end is closed for you: sin(30 works.
  function closeParen() {
    if (peek() && peek().type === "rp") pos++;
    else if (pos < tokens.length) throw new CalcError("Syntax error");
  }

  function factorial(n) {
    if (!Number.isInteger(n) || n < 0 || n > MAX_FACTORIAL) {
      throw new CalcError("Math error");
    }
    let result = 1;
    for (let k = 2; k <= n; k++) result *= k;
    return result;
  }

  function applyFunction(name, x) {
    const toRadians = (v) => (angleMode === "DEG" ? (v * Math.PI) / 180 : v);
    // Tiny leftovers like 1.2e-16 are rounding noise. Show them as 0.
    const clean = (v) => (Math.abs(v) < 1e-12 ? 0 : v);

    switch (name) {
      case "sin":
        return clean(Math.sin(toRadians(x)));
      case "cos":
        return clean(Math.cos(toRadians(x)));
      case "tan":
        if (angleMode === "DEG" && Math.abs(x % 180) === 90) {
          throw new CalcError("Math error");
        }
        return clean(Math.tan(toRadians(x)));
      case "log":
        if (x <= 0) throw new CalcError("Math error");
        return Math.log10(x);
      case "ln":
        if (x <= 0) throw new CalcError("Math error");
        return Math.log(x);
      case "sqrt":
        if (x < 0) throw new CalcError("Math error");
        return Math.sqrt(x);
      default:
        throw new CalcError("Syntax error");
    }
  }

  const value = parseExpression();
  if (pos < tokens.length) throw new CalcError("Syntax error"); // leftover pieces
  if (!Number.isFinite(value)) throw new CalcError("Math error");
  return value;
}

/* Rounds to 12 digits so 0.1+0.2 shows 0.3, not 0.30000000000000004 */
function formatNumber(n) {
  if (Object.is(n, -0)) n = 0;
  return String(Number(n.toPrecision(12)));
}

/* ==========================================================
   PART 2: BUTTONS AND KEYBOARD
   Connects the page to the math engine.
   Only runs in a browser (so Part 1 can be tested alone).
   ========================================================== */

if (typeof document !== "undefined") {
  const exprEl = document.getElementById("expr");
  const resultEl = document.getElementById("result");
  const modeBtn = document.getElementById("mode");
  const keysEl = document.querySelector(".keys");
  const calcEl = document.getElementById("calc");
  const homeEl = document.getElementById("home");
  const homeBtn = document.getElementById("home-btn");
  const appBtn = document.getElementById("app-calc");
  const profileEl = document.getElementById("profile");
  const profileHomeBtn = document.getElementById("profile-home");
  const profileAppBtn = document.getElementById("app-profile");
  const clockTimeEl = document.getElementById("clock-time");
  const clockDateEl = document.getElementById("clock-date");

  const state = {
    expression: "", // what the user typed
    ans: 0, // last answer, used by the Ans key
    evalAns: 0, // the Ans value used in the last "=", so a repeat gives the same result
    angleMode: "DEG",
    justEvaluated: false, // true right after pressing =
  };

  function showResult(text, kind) {
    resultEl.textContent = text;
    resultEl.dataset.kind = kind;
    resultEl.dataset.long = String(text.length > 12);
  }

  function showExpression() {
    exprEl.textContent = state.expression;
    exprEl.scrollLeft = exprEl.scrollWidth; // keep the newest part visible
  }

  // Live preview: shows the answer in dim color while you type.
  // If the text is not finished yet (like "5+"), show nothing.
  function updatePreview() {
    showExpression();
    if (!state.expression) {
      showResult("0", "idle");
      return;
    }
    try {
      const value = evaluate(state.expression, state);
      showResult(formatNumber(value), "preview");
    } catch (error) {
      showResult("", "preview");
    }
  }

  function insert(text) {
    if (state.justEvaluated) {
      // After "=": an operator continues with the answer, a number starts fresh.
      const continuesAnswer = /^[+−×÷^!%]/.test(text);
      state.expression = continuesAnswer ? "Ans" : "";
      state.justEvaluated = false;
    }
    if (state.expression.length + text.length > MAX_LENGTH) return;
    state.expression += text;
    updatePreview();
  }

  function clearAll() {
    state.expression = "";
    state.justEvaluated = false;
    updatePreview();
  }

  function backspace() {
    // Remove whole pieces like "sin(" or "Ans" in one press.
    state.expression = state.expression.replace(
      /(?:sin\(|cos\(|tan\(|log\(|ln\(|√\(|Ans|.)$/u,
      "",
    );
    state.justEvaluated = false;
    updatePreview();
  }

  function equals() {
    if (!state.expression) return;
    showExpression();
    try {
      const ansForThis = state.justEvaluated ? state.evalAns : state.ans;
      const value = evaluate(state.expression, { angleMode: state.angleMode, ans: ansForThis });
      state.evalAns = ansForThis;
      state.ans = value;
      state.justEvaluated = true;
      showResult(formatNumber(value), "final");
    } catch (error) {
      // Only show messages we wrote. Never show raw error details.
      const message = error instanceof CalcError ? error.message : "Error";
      showResult(message, "error");
    }
  }

  function toggleMode() {
    state.angleMode = state.angleMode === "DEG" ? "RAD" : "DEG";
    modeBtn.textContent = state.angleMode;
    modeBtn.setAttribute(
      "aria-label",
      state.angleMode === "DEG"
        ? "Angle mode: degrees. Press to switch to radians."
        : "Angle mode: radians. Press to switch to degrees.",
    );
    if (state.justEvaluated) equals();
    else updatePreview();
  }

  // One listener for all keys (event delegation).
  keysEl.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    if (button.dataset.insert !== undefined) insert(button.dataset.insert);
    else if (button.dataset.action === "clear") clearAll();
    else if (button.dataset.action === "backspace") backspace();
    else if (button.dataset.action === "equals") equals();
  });

  modeBtn.addEventListener("click", toggleMode);

  function updateClock() {
    const now = new Date();
    clockTimeEl.textContent = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    clockDateEl.textContent = now.toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }

  // The calculator keeps its numbers while it is closed.
  function goHome(focusBtn) {
    calcEl.hidden = true;
    profileEl.hidden = true;
    homeEl.hidden = false;
    updateClock();
    focusBtn.focus();
  }

  function openProfile() {
    homeEl.hidden = true;
    profileEl.hidden = false;
    profileHomeBtn.focus();
  }

  function openCalculator() {
    homeEl.hidden = true;
    calcEl.hidden = false;
    homeBtn.focus();
  }

  homeBtn.addEventListener("click", () => goHome(appBtn));
  profileHomeBtn.addEventListener("click", () => goHome(profileAppBtn));
  appBtn.addEventListener("click", openCalculator);
  profileAppBtn.addEventListener("click", openProfile);
  setInterval(updateClock, 10000);

  // Keyboard typing
  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return; // keep browser shortcuts
    if (calcEl.hidden) return; // app is closed

    const key = event.key;
    const typed = { "-": "−", "*": "×", "/": "÷" };

    if (/^[0-9.()+^!%]$/.test(key)) {
      insert(key);
    } else if (Object.hasOwn(typed, key)) {
      event.preventDefault();
      insert(typed[key]);
    } else if (key === "Enter" || key === "=") {
      event.preventDefault(); // stops a focused button from also clicking
      equals();
    } else if (key === "Backspace") {
      backspace();
    } else if (key === "Escape") {
      clearAll();
    }
  });

  updatePreview();
}

// Lets Node load Part 1 for testing. Does nothing in the browser.
if (typeof module !== "undefined") {
  module.exports = { evaluate, formatNumber, CalcError };
}