import test from 'node:test';
import assert from 'node:assert/strict';
import calculator from '../flyback-calculator.js';

const { calculate, fit, rm10, kHzToHz, uHToH, percentToRatio } = calculator;

test('unit helpers convert values explicitly', () => {
  assert.equal(kHzToHz(100), 100000);
  assert.equal(uHToH(300), 0.0003);
  assert.equal(percentToRatio(85), 0.85);
});

test('RM10 preset reproduces documented flyback reference values', () => {
  const r = calculate(rm10);
  assert.equal(r.errors.length, 0);
  assert.ok(Math.abs(r.po - 5) < 1e-9);
  assert.ok(Math.abs(r.dl - 0.45) < 0.001);
  assert.ok(Math.abs(r.ip - 0.206) < 0.002);
  assert.ok(Math.abs(r.be - 0.0444) < 0.001);
  assert.ok(Math.abs(r.bv - 0.0461) < 0.002);
  assert.ok(Math.abs(r.al * 1e9 - 174.85) < 0.1);
  assert.ok(Math.abs(r.gap * 1e3 - 0.676) < 0.002);
  assert.ok(Math.abs(r.radial - 2.177) < 0.002);
});

test('invalid inputs and impossible bobbin width are reported', () => {
  assert.ok(calculate({ ...rm10, lp: 0 }).errors.includes('lp'));
  assert.equal(fit(10, 0.001, 0.002).perLayer, 0);
  const r = calculate({ ...rm10, pwire: 11 });
  assert.match(r.status, /^Red/);
});

test('warning thresholds identify duty, flux, gap, and switch stress concerns', () => {
  const r = calculate({ ...rm10, fsw: 100, duty: 60, blim: 0.05, rating: 430 });
  assert.ok(r.warnings.some((warning) => warning.includes('Low-line duty cycle exceeds 50%')));
  assert.ok(r.warnings.some((warning) => warning.includes('Flux swing exceeds 70%')));
  assert.ok(r.warnings.some((warning) => warning.includes('Ideal switch stress')));
});

test('12 MHz input is rejected as outside the supported range', () => {
  const r = calculate({ ...rm10, fsw: 12000, vo: 24, io: 2.5, eff: 85, duty: 45, lp: 300, vf: 0.7 });
  assert.equal(r.errors.length, 1);
  assert.equal(r.primaryIssue, 'Switching frequency outside supported range.');
  assert.match(r.status, /^Red/);
  assert.equal(r.inputValidity, 'Invalid');
});

test('regression case stays physically plausible at 100 kHz', () => {
  const r = calculate({
    ...rm10,
    vacMin: 120,
    vacMax: 500,
    vo: 24,
    io: 2.5,
    eff: 85,
    fsw: 100,
    duty: 45,
    lp: 300,
    vf: 0.7,
    rating: 1000,
  });

  assert.equal(r.errors.length, 0);
  assert.ok(Math.abs(r.po - 60) < 1e-9);
  assert.ok(Math.abs(r.pin - 70.5882352941) < 1e-6);
  assert.ok(r.ip > 0.5);
  assert.ok(['Reasonable', 'Strong'].includes(r.suitability));
  assert.ok(r.score > 0);
  assert.notEqual(r.primaryIssue, 'Switching frequency outside supported range.');
  assert.ok(r.estimatedDissipation < r.pin);
});
