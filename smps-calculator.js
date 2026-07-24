(function () {
  'use strict';

  const fmt = (value, unit = '', sig = 3) => {
    if (!Number.isFinite(value)) return '—';
    const rounded = Number(value.toPrecision(sig));
    return `${rounded.toString()}${unit ? ` ${unit}` : ''}`;
  };

  const positive = (v) => Number.isFinite(v) && v > 0;
  const kHzToHz = (value) => Number(value) * 1000;
  const uHToH = (value) => Number(value) / 1e6;
  const mHToH = (value) => Number(value) / 1e3;
  const percentToRatio = (value) => Number(value) / 100;
  const mOhmToOhm = (value) => Number(value) / 1000;
  const formatResult = fmt;

  const calculators = {
    flyback: {
      label: 'Flyback',
      eyebrow: 'Isolated / low to medium power',
      description: 'Estimate primary current, duty cycle, switch stress and the first magnetic boundary.',
      fields: [
        ['vinDcMinV', 'Minimum DC bus', 'V', 120],
        ['vinDcMaxV', 'Maximum DC bus', 'V', 375],
        ['outputVoltageV', 'Output voltage', 'V', 24],
        ['outputCurrentA', 'Output current', 'A', 2.5],
        ['planningEfficiencyPct', 'Planning efficiency', '%', 85],
        ['switchingFrequencyKHz', 'Switching frequency', 'kHz', 100],
        ['targetDutyPct', 'Target duty', '%', 45],
        ['magnetizingInductanceUh', 'Magnetizing inductance', 'uH', 300],
        ['diodeForwardDropV', 'Diode forward drop', 'V', 0.7],
        ['outputRipplePct', 'Output ripple target', '%', 1],
      ],
      calculate: (x) => (globalThis.FlybackCalculator ? globalThis.FlybackCalculator.evaluate(x) : { errors: ['flyback-core'], warnings: [], status: 'Red - flyback calculator core not loaded' }),
    },
    activeClamp: {
      label: 'Active-clamp flyback',
      eyebrow: 'Isolated / improved flyback switching',
      description: 'Explore an active-clamp flyback operating point with the same first-pass magnetic boundary and reduced switching-loss outlook.',
      fields: [
        ['vinDcMinV', 'Minimum DC bus', 'V', 120],
        ['vinDcMaxV', 'Maximum DC bus', 'V', 375],
        ['outputVoltageV', 'Output voltage', 'V', 24],
        ['outputCurrentA', 'Output current', 'A', 2.5],
        ['planningEfficiencyPct', 'Planning efficiency', '%', 88],
        ['switchingFrequencyKHz', 'Switching frequency', 'kHz', 100],
        ['targetDutyPct', 'Target low-line duty', '%', 45],
        ['magnetizingInductanceUh', 'Magnetizing inductance', 'uH', 300],
        ['diodeForwardDropV', 'Diode forward drop', 'V', 0.7],
        ['outputRipplePct', 'Output ripple target', '%', 1],
      ],
      calculate: (x) => (globalThis.FlybackCalculator ? globalThis.FlybackCalculator.evaluate(x) : { errors: ['flyback-core'], warnings: [], status: 'Red - flyback calculator core not loaded' }),
    },
    buck: {
      label: 'Synchronous buck',
      eyebrow: 'Non-isolated step-down',
      description: 'Estimate duty, inductor ripple and current for a regulated step-down rail.',
      fields: [['vinMin', 'Minimum input', 'V', 24], ['vinMax', 'Maximum input', 'V', 36], ['vout', 'Output voltage', 'V', 12], ['iout', 'Output current', 'A', 10], ['eff', 'Planning efficiency assumption', '%', 94], ['fsw', 'Switching frequency', 'kHz', 400], ['inductance', 'Selected inductance', 'uH', 10]],
      calculate: (x) => {
        const f = kHzToHz(x.fsw);
        const l = uHToH(x.inductance);
        const p = x.vout * x.iout;
        const duty = x.vout / x.vinMax;
        const ripple = (x.vinMax - x.vout) * duty / (l * f);
        const pk = x.iout + ripple / 2;
        return {
          errors: [],
          warnings: [],
          status: 'Green - preliminary operating point is mathematically solvable',
          tone: 'green',
          fit: 'Strong',
          score: 86,
          groups: [
            ['Power boundary', [['Output power', fmt(p, 'W')], ['Maximum duty', fmt(duty * 100, '%')]]],
            ['Inductor', [['Ripple current', fmt(ripple, 'A')], ['Peak current', fmt(pk, 'A')], ['Ripple fraction', fmt(ripple / x.iout * 100, '%')]]],
          ],
          report: { inputSummary: [] },
          summary: [],
          notes: ['Validate MOSFET loss, inductor saturation, capacitor RMS current, loop stability, layout and thermal performance.'],
        };
      },
    },
    boost: {
      label: 'Boost',
      eyebrow: 'Non-isolated step-up',
      description: 'Explore the inductor and current demands of a first-pass boost stage.',
      fields: [['vinMin', 'Minimum input', 'V', 9], ['vinNom', 'Nominal input', 'V', 12], ['vout', 'Output voltage', 'V', 24], ['iout', 'Output current', 'A', 2], ['eff', 'Estimated efficiency', '%', 92], ['fsw', 'Switching frequency', 'kHz', 400], ['inductance', 'Selected inductance', 'uH', 10], ['rippleFraction', 'Target inductor ripple', '%', 30]],
      calculate: (x) => {
        const f = kHzToHz(x.fsw);
        const l = uHToH(x.inductance);
        const p = x.vout * x.iout;
        const duty = 1 - x.vinMin / x.vout;
        const avg = p / x.vinMin;
        const ripple = x.vinMin * duty / (l * f);
        const ideal = x.vinMin * duty / (avg * percentToRatio(x.rippleFraction) * f);
        const dcm = duty * duty * x.vinMin * x.vinMin / (2 * x.iout * x.vout * f - 2 * x.iout * x.vinMin * f);
        return {
          errors: [],
          warnings: [],
          status: x.vout > x.vinMin ? 'Green - preliminary operating point is mathematically solvable' : 'Red - output must exceed input for boost operation',
          tone: x.vout > x.vinMin ? 'green' : 'red',
          fit: x.vout > x.vinMin ? 'Reasonable' : 'Poor',
          score: x.vout > x.vinMin ? 78 : 0,
          groups: [
            ['Power boundary', [['Output power', fmt(p, 'W')], ['Load resistance', fmt(x.vout / x.iout, 'ohm')], ['Low-line duty', fmt(duty * 100, '%')]]],
            ['Inductor', [['Ideal inductance', fmt(ideal * 1e6, 'uH')], ['DCM-boundary inductance', fmt(dcm * 1e6, 'uH')], ['Average current', fmt(avg, 'A')], ['Ripple current', fmt(ripple, 'A')]]],
            ['Switch current', [['Inductor peak current', fmt(avg / percentToRatio(x.eff) + ripple / 2, 'A')], ['Nominal-input duty', fmt((1 - x.vinNom * percentToRatio(x.eff) / x.vout) * 100, '%')]]],
          ],
          notes: ['Validate switch/diode loss, capacitor RMS current, compensation, thermal behavior, EMI and layout.'],
        };
      },
    },
    pfc: {
      label: 'PFC boost',
      eyebrow: 'AC front end / regulated DC bus',
      description: 'Estimate the first current and duty boundary for a boost PFC stage.',
      fields: [['vacMin', 'Minimum AC input', 'V RMS', 90], ['vacMax', 'Maximum AC input', 'V RMS', 264], ['vout', 'DC bus target', 'V', 400], ['pout', 'Output power', 'W', 500], ['eff', 'Planning efficiency assumption', '%', 95], ['fsw', 'Switching frequency', 'kHz', 100], ['inductance', 'Boost inductance', 'uH', 500]],
      calculate: (x) => {
        const vin = x.vacMin * Math.SQRT2;
        const f = kHzToHz(x.fsw);
        const l = uHToH(x.inductance);
        const duty = 1 - vin / x.vout;
        const iavg = x.pout / vin;
        const ripple = vin * duty / (l * f);
        return {
          errors: [],
          warnings: [],
          status: 'Green - preliminary operating point is mathematically solvable',
          tone: 'green',
          fit: 'Reasonable',
          score: 78,
          groups: [
            ['Power boundary', [['Input peak at low line', fmt(vin, 'V')], ['Low-line duty', fmt(duty * 100, '%')], ['Output power', fmt(x.pout, 'W')]]],
            ['Inductor', [['Average input current', fmt(iavg, 'A')], ['Ripple current', fmt(ripple, 'A')], ['Peak current', fmt(iavg + ripple / 2, 'A')]]],
          ],
          notes: ['Verify power factor, line-current distortion, bridge loss, inductor saturation, EMI filter, boost-diode or synchronous-switch loss and thermal behavior.'],
        };
      },
    },
    llc: {
      label: 'LLC half bridge',
      eyebrow: 'Isolated / resonant conversion',
      description: 'Explore output current, required voltage gain and operating-frequency boundary for an LLC concept.',
      fields: [['vinMin', 'Minimum DC bus', 'V', 300], ['vinMax', 'Maximum DC bus', 'V', 420], ['vout', 'Output voltage', 'V', 24], ['pout', 'Output power', 'W', 500], ['eff', 'Planning efficiency assumption', '%', 95], ['fsw', 'Nominal resonant frequency', 'kHz', 150], ['turns', 'Secondary / primary turns ratio', '', 0.12]],
      calculate: (x) => {
        const iout = x.pout / x.vout;
        const gain = x.vout / (x.vinMin * x.turns);
        return {
          errors: [],
          warnings: [],
          status: 'Green - preliminary operating point is mathematically solvable',
          tone: 'green',
          fit: 'Strong',
          score: 88,
          groups: [
            ['Power boundary', [['Output current', fmt(iout, 'A')], ['Required low-line gain', fmt(gain, '', 3)], ['Input span', fmt(x.vinMax / x.vinMin, '')]]],
            ['Resonant outlook', [['Nominal frequency', fmt(x.fsw, 'kHz')], ['Output power', fmt(x.pout, 'W')]]],
          ],
          notes: ['Validate resonant tank design, gain range, ZVS region, synchronous rectifier behavior, magnetics, light-load control and thermal performance.'],
        };
      },
    },
    psfb: {
      label: 'Phase-shifted full bridge',
      eyebrow: 'Isolated / higher power',
      description: 'Estimate transformer current, duty, copper loss and the available loss budget for a PSFB concept.',
      fields: [['vinMin', 'Minimum DC bus', 'V', 300], ['vinTyp', 'Typical DC bus', 'V', 390], ['vout', 'Output voltage', 'V', 12], ['pout', 'Output power', 'W', 600], ['eff', 'Estimated efficiency', '%', 94], ['fsw', 'Switching frequency', 'kHz', 200], ['dmax', 'Maximum duty', '%', 80], ['turns', 'Secondary / primary turns ratio', '', 0.65], ['ripple', 'Output-inductor ripple', 'A', 10], ['lm', 'Magnetizing inductance', 'uH', 600], ['imag', 'Magnetizing-current ripple', 'A', 0.4], ['dcrP', 'Primary winding DCR', 'mOhm', 12], ['dcrS', 'Secondary winding DCR', 'mOhm', 1]],
      calculate: (x) => {
        const eta = percentToRatio(x.eff);
        const duty = x.vout * x.turns / x.vinTyp;
        const dmax = percentToRatio(x.dmax);
        const iout = x.pout / x.vout;
        const pk = ((x.pout / (x.vout * eta)) + x.ripple / 2) / x.turns + x.imag;
        const min = ((x.pout / (x.vout * eta)) - x.ripple / 2) / x.turns + x.imag;
        const prms = Math.sqrt(dmax * (pk * min + (pk - min) ** 2 / 3));
        const srms = Math.sqrt((dmax / 2) * (iout * (iout - x.ripple / 2) + (x.ripple / 2) ** 2 / 3));
        const loss = (x.pout * (1 - eta)) / eta;
        const copper = 2 * (prms ** 2 * mOhmToOhm(x.dcrP) + 2 * srms ** 2 * mOhmToOhm(x.dcrS));
        const mag = x.vinMin * dmax / (uHToH(x.lm) * kHzToHz(x.fsw));
        return {
          errors: [],
          warnings: [],
          status: 'Green - preliminary operating point is mathematically solvable',
          tone: 'green',
          fit: 'Strong',
          score: 86,
          groups: [
            ['Power boundary', [['Output current', fmt(iout, 'A')], ['Calculated duty', fmt(duty * 100, '%')], ['Loss budget', fmt(loss, 'W')]]],
            ['Transformer currents', [['Primary peak / minimum', `${fmt(pk, 'A')} / ${fmt(min, 'A')}`], ['Primary RMS', fmt(prms, 'A')], ['Secondary RMS', fmt(srms, 'A')], ['Magnetizing ripple', fmt(mag, 'A')]]],
            ['Loss estimate', [['Transformer copper loss', fmt(copper, 'W')], ['Remaining loss budget', fmt(loss - copper, 'W')]]],
          ],
          notes: [duty > 1 ? 'Calculated duty is above 100%; revise turns ratio or operating point.' : '', loss - copper < 0 ? 'Estimated transformer copper loss exceeds the efficiency loss budget.' : '', 'Validate ZVS range, dead time, leakage tuning, thermal behavior, loop stability, EMI and safety isolation.'].filter(Boolean),
        };
      },
    },
  };

  function renderTopographyReport(id, report) {
    if (id !== 'flyback' && id !== 'activeClamp') return '';
    if (!report.valid) {
      return `
        <section class="smps-status-layers">
          <h3>Architecture outlook</h3>
          <dl>
            <dt>Input validity</dt><dd class="bad">Invalid</dd>
            <dt>Primary issue</dt><dd>${report.primaryIssue || 'Not evaluated'}</dd>
            <dt>Electrical consistency</dt><dd class="bad">Withheld</dd>
            <dt>Magnetic feasibility</dt><dd>Withheld</dd>
            <dt>Thermal feasibility</dt><dd class="bad">Withheld</dd>
            <dt>Topology suitability</dt><dd class="bad">Not evaluated</dd>
          </dl>
        </section>`;
    }
    return `
      <section class="smps-efficiency">
        <h3>Efficiency and thermal outlook</h3>
        <dl>
          <dt>Planning efficiency</dt><dd>${fmt((report.po / report.pin) * 100, '%', 0)}</dd>
          <dt>Estimated total dissipation</dt><dd>${fmt(report.estimatedDissipation, 'W')}</dd>
          <dt>Input span</dt><dd>${fmt(report.inputSpan, '', 2)}</dd>
          <dt>Switching frequency</dt><dd>${report.frequencyDisplay}</dd>
          <dt>Target duty</dt><dd>${fmt(report.targetDutyPct, '%')}</dd>
          <dt>Current consistency</dt><dd>${report.mismatchPct <= 5 ? 'Consistent' : 'Review required'}</dd>
          <dt>Transferred power estimate</dt><dd>${fmt(report.transferredPowerEstimate, 'W')}</dd>
          <dt>Confidence</dt><dd>${report.valid ? 'Preliminary' : 'Withheld'}</dd>
        </dl>
      </section>
      <section class="smps-status-layers">
        <h3>Architecture outlook</h3>
        <dl>
          <dt>Input validity</dt><dd class="${report.inputValidity === 'Invalid' ? 'bad' : 'good'}">${report.inputValidity}</dd>
          <dt>Primary issue</dt><dd>${report.primaryIssue}</dd>
          <dt>Electrical consistency</dt><dd class="${report.electricalStatus === 'Withheld' ? 'bad' : 'good'}">${report.electricalStatus}</dd>
          <dt>Magnetic feasibility</dt><dd>${report.magneticStatus}</dd>
          <dt>Thermal feasibility</dt><dd class="${report.thermalStatus === 'Low confidence' ? 'bad' : ''}">${report.thermalStatus}</dd>
          <dt>Topology suitability</dt><dd class="${report.tone === 'red' ? 'bad' : report.tone === 'amber' ? 'amber' : 'good'}">${report.suitability} · ${report.score}/100</dd>
        </dl>
      </section>`;
  }

  function mount() {
    const tabs = document.querySelectorAll('[data-smps-topology]');
    if (!tabs.length) return;

    const render = (id) => {
      const c = calculators[id];
      const host = document.querySelector('#calculator-workspace');
      host.innerHTML = `
        <div class="smps-tool-head">
          <div>
            <p class="smps-tool-kicker">${c.eyebrow}</p>
            <h2>${c.label}<br><em>feasibility estimator.</em></h2>
            <p>${c.description}</p>
          </div>
          <button class="smps-reset" type="button">Restore example inputs</button>
        </div>
        <div class="smps-tool-grid">
          <form class="smps-form" novalidate>
            ${c.fields.map(([key, label, unit, value]) => `
              <label>
                <span>${label}</span>
                <span class="smps-input">
                  <input type="number" name="${key}" value="${value}" step="any" min="0">
                  <i>${unit || 'value'}</i>
                </span>
              </label>
            `).join('')}
          </form>
          <section class="smps-results" aria-live="polite"></section>
        </div>`;

      const form = host.querySelector('form');
      const results = host.querySelector('.smps-results');
      const reset = host.querySelector('.smps-reset');

      const update = () => {
        const x = Object.fromEntries(new FormData(form));
        const report = c.calculate(x);
        const verdict = report.errors && report.errors.length
          ? `<section class="smps-verdict smps-verdict--red"><strong>Invalid input</strong><p>${report.status}</p></section>`
          : report.tone === 'red'
            ? `<section class="smps-verdict smps-verdict--red"><strong>${id === 'flyback' || id === 'activeClamp' ? 'Equations are solvable; topology fit is poor' : 'Topological fit needs review'}</strong><p>${id === 'flyback' || id === 'activeClamp' ? 'This operating point is not a credible flyback design candidate. Check the frequency, current and magnetic boundary first.' : 'Review the operating point against the actual hardware constraints before building.'}</p></section>`
            : `<section class="smps-verdict smps-verdict--green"><strong>Preliminary operating point is mathematically solvable</strong><p>Continue with the review items below before selecting parts or building hardware.</p></section>`;

        const warnings = (report.warnings || report.notes || []).filter(Boolean);
        const warningMarkup = warnings.length ? `<section class="smps-warnings"><h3>Review before build</h3><ul>${warnings.map((warning) => `<li>${warning}</li>`).join('')}</ul></section>` : '';
        results.innerHTML = `${verdict}${report.groups.map(([title, items]) => `<section><h3>${title}</h3><dl>${items.map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join('')}</dl></section>`).join('')}${renderTopographyReport(id, report)}${warningMarkup}`;
      };

      form.addEventListener('input', update);
      reset.addEventListener('click', () => {
        c.fields.forEach(([key, , , value]) => { form.elements[key].value = value; });
        update();
      });
      update();
    };

    tabs.forEach((tab) => tab.addEventListener('click', () => {
      tabs.forEach((t) => t.setAttribute('aria-selected', 'false'));
      tab.setAttribute('aria-selected', 'true');
      render(tab.dataset.smpsTopology);
    }));

    render('flyback');
  }

  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', mount);
})();