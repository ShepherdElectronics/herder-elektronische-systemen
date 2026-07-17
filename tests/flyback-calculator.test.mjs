import test from 'node:test';
import assert from 'node:assert/strict';
import calculator from '../flyback-calculator.js';

const { calculate, fit, rm10 } = calculator;

test('RM10 preset reproduces documented flyback reference values', () => {
  const r = calculate(rm10);
  assert.equal(r.errors.length, 0);
  assert.ok(Math.abs(r.po - 5) < 1e-9);
  assert.ok(Math.abs(r.dl - 0.4658) < 0.001);
  assert.ok(Math.abs(r.ip - 0.206) < 0.002);
  assert.ok(Math.abs(r.be - 0.0444) < 0.001);
  assert.ok(Math.abs(r.bv - 0.0478) < 0.001);
  assert.ok(Math.abs(r.al * 1e9 - 174.85) < 0.1);
  assert.ok(Math.abs(r.gap * 1e3 - 0.676) < 0.002);
  assert.ok(Math.abs(r.radial * 1e3 - 2.177) < 0.002);
});

test('invalid inputs and impossible bobbin width are reported', () => {
  assert.ok(calculate({ ...rm10, lp: 0 }).errors.includes('lp'));
  assert.equal(fit(10, 0.001, 0.002).perLayer, 0);
  const r = calculate({ ...rm10, pwire: 11 });
  assert.match(r.status, /^Red/);
});

test('warning thresholds identify duty, flux, gap, and switch stress concerns', () => {
  const r = calculate({ ...rm10, duty: 40, blim: 0.05, rating: 350 });
  assert.ok(r.warnings.some((warning) => warning.includes('duty cycle exceeds the selected target')));
  assert.ok(r.warnings.some((warning) => warning.includes('Flux swing exceeds 70%')));
  assert.ok(r.warnings.some((warning) => warning.includes('MOSFET stress exceeds 80%')));
});
