import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import calculator from '../flyback-calculator.js';

const { calculate, fit, formatResult, kHzToHz, uHToH, percentToRatio } = calculator;

const exactInput = {
  vinDcMinV: 120,
  vinDcMaxV: 375,
  outputVoltageV: 24,
  outputCurrentA: 2.5,
  planningEfficiencyPct: 85,
  switchingFrequencyKHz: 120,
  targetDutyPct: 45,
  magnetizingInductanceUh: 300,
  diodeForwardDropV: 0.7,
  outputRipplePct: 1,
};

test('unit helpers convert values explicitly', () => {
  assert.equal(kHzToHz(100), 100000);
  assert.equal(uHToH(300), 0.0003);
  assert.equal(percentToRatio(85), 0.85);
  assert.equal(formatResult(NaN), '—');
  assert.equal(formatResult(Infinity), '—');
});

test('exact DC-bus input validates and calculates', () => {
  const r = calculate(exactInput);
  assert.equal(r.errors.length, 0);
  assert.equal(r.inputValidity, 'Valid');
  assert.equal(r.suitability, 'Strong');
  assert.ok(Math.abs(r.po - 60) < 1e-9);
  assert.ok(Math.abs(r.pin - 70.5882352941) < 1e-6);
  assert.ok(r.ip > 0.5);
  assert.ok(!r.errors.some((error) => error.includes('vacMin')));
});

test('invalid inputs and impossible bobbin width are reported', () => {
  const invalid = calculate({ ...exactInput, vinDcMinV: 0 });
  assert.ok(invalid.errors.includes('Minimum DC bus is required.'));
  assert.equal(invalid.suitability, 'Not evaluated');
  assert.equal(invalid.score, undefined);
  assert.equal(fit(10, 0.001, 0.002).perLayer, 0);
  const r = calculate({ ...exactInput, pwire: 11 });
  assert.match(r.status, /^Red/);
});

test('warning thresholds identify duty, flux, gap, and switch stress concerns', () => {
  const r = calculate({ ...exactInput, targetDutyPct: 60, blim: 0.05 });
  assert.ok(r.warnings.some((warning) => warning.includes('Low-line duty cycle exceeds 50%')));
  assert.ok(r.warnings.some((warning) => warning.includes('Flux swing exceeds 70%')));
});

test('12 MHz input is rejected as outside the supported range', () => {
  const r = calculate({ ...exactInput, switchingFrequencyKHz: 12000 });
  assert.ok(r.errors.includes('Switching frequency outside supported range.'));
  assert.equal(r.primaryIssue, 'Switching frequency outside supported range.');
  assert.match(r.status, /^Red/);
  assert.equal(r.inputValidity, 'Invalid');
});

test('regression case stays physically plausible at 100 kHz', () => {
  const r = calculate({ ...exactInput, switchingFrequencyKHz: 100 });

  assert.equal(r.errors.length, 0);
  assert.ok(Math.abs(r.po - 60) < 1e-9);
  assert.ok(Math.abs(r.pin - 70.5882352941) < 1e-6);
  assert.ok(r.ip > 0.5);
  assert.ok(['Reasonable', 'Strong'].includes(r.suitability));
  assert.ok(r.score > 0);
  assert.notEqual(r.primaryIssue, 'Switching frequency outside supported range.');
  assert.ok(r.estimatedDissipation < r.pin);
});

test('UTF-8 punctuation renders correctly in the SMPS shell', () => {
  const html = fs.readFileSync(new URL('../smps-calculator.html', import.meta.url), 'utf8');
  assert.ok(html.includes('What these tools do—and do not—establish'));
  assert.ok(!html.includes('What these tools doâ€”and do notâ€”establish'));
  assert.ok(html.includes('Discuss a converter concept <span>→</span>'));
});
