"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { evaluate, formatNumber, CalcError } = require("./calculator.js");

const calc = (text, options) => formatNumber(evaluate(text, options));

test("order of operations", () => {
  assert.strictEqual(calc("2+3*4"), "14");
  assert.strictEqual(calc("-2^2"), "-4");
  assert.strictEqual(calc("2^3^2"), "512");
});

test("rounding noise is hidden", () => {
  assert.strictEqual(calc("0.1+0.2"), "0.3");
});

test("functions and angle modes", () => {
  assert.strictEqual(calc("sin(30)"), "0.5");
  assert.strictEqual(calc("sin(30", { angleMode: "DEG" }), "0.5");
  assert.strictEqual(calc("√(16)"), "4");
  assert.strictEqual(calc("5!"), "120");
});

test("bad input throws our own error", () => {
  assert.throws(() => evaluate("5/0"), CalcError);
  assert.throws(() => evaluate("eval(1)"), CalcError);
  assert.throws(() => evaluate("1.2.3"), CalcError);
  assert.throws(() => evaluate("9".repeat(201)), CalcError);
});

test("keys pressed next to each other", () => {
  assert.strictEqual(calc("esin(0)"), "0");
  assert.strictEqual(calc("Anse", { ans: 2 }), "5.43656365692");
});