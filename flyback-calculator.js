(function (root) {
  'use strict';

  const kHzToHz = (value) => Number(value) * 1000;
  const uHToH = (value) => Number(value) / 1e6;
  const mHToH = (value) => Number(value) / 1e3;
  const uFToF = (value) => Number(value) / 1e6;
  const percentToRatio = (value) => Number(value) / 100;
  const mmToM = (value) => Number(value) / 1000;
  const mm2ToM2 = (value) => Number(value) / 1e6;
  const mOhmToOhm = (value) => Number(value) / 1000;
  const positive = (value) => Number.isFinite(value) && value > 0;
  const finite = (value) => Number.isFinite(value);

  const fmt = (value, unit = '', digits = 2) => {
    if (!finite(value)) return '';
    const rounded = Number(value.toFixed(digits));
    return `${rounded.toString()}${unit ? ` ${unit}` : ''}`;
  };

  const fit = (turns, width, wire) => {
    const perLayer = Math.floor(Number(width) / Number(wire));
    if (!positive(turns) || !positive(width) || !positive(wire) || perLayer < 1) {
      return { perLayer, layers: 0, widthUsed: 0, copper: Infinity };
    }
    return {
      perLayer,
      layers: Math.ceil(Number(turns) / perLayer),
      widthUsed: Math.min(Number(turns), perLayer) * Number(wire),
      copper: Math.ceil(Number(turns) / perLayer) * Number(wire),
    };
  };

  function getNumberRecord(input) {
    return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, Number(value)]));
  }

  function formatFrequency(fswKHz, outOfRange) {
    if (!finite(fswKHz)) return '';
    if (fswKHz >= 1000) {
      const mhz = fswKHz / 1000;
      return `${fmt(mhz, 'MHz', mhz >= 10 ? 0 : 1)}${outOfRange ? '  outside supported range' : ''}`;
    }
    return `${fmt(fswKHz, 'kHz', fswKHz >= 100 ? 0 : 1)}${outOfRange ? '  outside supported range' : ''}`;
  }

  function evaluate(input) {
    const x = getNumberRecord(input);
    const required = ['vacMin', 'vacMax', 'vo', 'io', 'vf', 'eff', 'fsw', 'lp', 'np', 'ns', 'naux', 'ae', 'le', 'mur', 'blim', 'width', 'depth', 'pwire', 'swire', 'awire', 'tape', 'psections', 'boundaries', 'rating', 'duty'];
    const missing = required.filter((key) => !positive(x[key]));
    if (x.eff > 1) x.eff = percentToRatio(x.eff);
    if (!positive(x.eff) || x.eff > 1) missing.push('eff');
    if (missing.length) {
      return { valid: false, errors: missing, warnings: [], status: 'Red - ' + missing[0] + ' is required before this concept can be evaluated.', primaryIssue: missing[0], inputValidity: 'Invalid', electricalStatus: 'Withheld', magneticStatus: 'Withheld', thermalStatus: 'Withheld', suitability: 'Not evaluated', score: 0, tone: 'red', groups: [], lossRows: [] };
    }

    const fswKHz = x.fsw;
    const fswHz = kHzToHz(fswKHz);
    const inputSpan = x.vacMax / x.vacMin;
    const po = x.vo * x.io;
    const pin = po / x.eff;
    const vmin = x.vacMin * Math.SQRT2;
    const vmax = x.vacMax * Math.SQRT2;
    const targetDuty = percentToRatio(x.duty);
    const vsec = x.vo + x.vf;
    const ratio = vsec * (1 - targetDuty) / (targetDuty * x.vacMin);
    const dutyLowLine = vsec / (ratio * x.vacMin + vsec);
    const dutyHighLine = vsec / (ratio * x.vacMax + vsec);
    const ton = dutyLowLine / fswHz;
    const lmH = uHToH(x.lp);
    const ip = Math.sqrt((2 * pin) / (lmH * fswHz));
    const transferredPowerEstimate = 0.5 * lmH * ip * ip * fswHz;
    const mismatchPct = pin > 0 ? Math.abs(transferredPowerEstimate - pin) / pin * 100 : Infinity;
    const critLmH = (x.vacMin ** 2 * dutyLowLine ** 2 * x.eff) / (2 * po * fswHz);
    const areaM2 = mm2ToM2(x.ae);
    const be = (lmH * ip) / (x.np * areaM2);
    const bv = (vmin * ton) / (x.np * areaM2);
    const al = lmH / (x.np ** 2);
    const gap = (4 * Math.PI * 1e-7 * x.np ** 2 * areaM2 / lmH) - mmToM(x.le) / x.mur;
    const vaux = vsec * x.naux / x.ns;
    const stress = vmax + vsec / ratio;
    const estimatedDissipation = pin - po;
    const effEstimate = pin > 0 ? po / pin : 0;

    const primaryFit = fit(Math.ceil(x.np / x.psections), x.width, x.pwire);
    const secondaryFit = fit(x.ns, x.width, x.swire);
    const auxiliaryFit = fit(x.naux, x.width, x.awire);
    const copper = primaryFit.copper * x.psections + secondaryFit.copper + auxiliaryFit.copper;
    const insulation = x.tape * (primaryFit.layers * x.psections + secondaryFit.layers + auxiliaryFit.layers + Math.max(0, x.boundaries) + Math.max(0, x.psections - 1) * 2);
    const radial = copper + insulation;
    const used = radial / x.depth * 100;
    const secondaryRms = ip * ratio * Math.sqrt((1 - dutyLowLine) / 3);

    const warnings = [];
    const hardIssues = [];

    if (fswKHz > 2000) hardIssues.push('Switching frequency outside supported range.');
    else if (fswKHz > 500) warnings.push('Switching frequency is above the normal 20500 kHz planning range.');
    else if (fswKHz < 20) warnings.push('Switching frequency is below the normal 20500 kHz planning range.');

    if (x.vacMin >= x.vacMax) hardIssues.push('Minimum input voltage must be lower than maximum input voltage.');
    if (dutyLowLine > targetDuty) warnings.push('Low-line duty cycle exceeds the selected target.');
    if (dutyLowLine > 0.5) warnings.push('Low-line duty cycle exceeds 50%.');
    if (mismatchPct > 5 || (pin > 20 && ip < 0.1)) warnings.push('Current, inductance, frequency and required power are inconsistent.');
    if (positive(critLmH) && (lmH < critLmH / 4 || lmH > critLmH * 4)) warnings.push('Selected inductance is far from the critical inductance boundary.');
    if (Math.max(be, bv) > 0.7 * x.blim) warnings.push('Flux swing exceeds 70% of the selected preliminary limit.');
    if (Math.abs(be - bv) / Math.max(be, bv) > 0.15) warnings.push('The two flux estimates differ by more than 15%.');
    if (gap < 0) warnings.push('Estimated gap is negative; review core and inductance inputs.');
    if (stress > x.rating * 0.95) hardIssues.push('Ideal switch stress is too near the entered MOSFET rating.');
    else if (stress > x.rating * 0.75) warnings.push('Ideal switch stress is getting close to the entered MOSFET rating.');
    if (effEstimate < 0 || effEstimate > 1) hardIssues.push('Derived efficiency is outside the valid range.');
    if (estimatedDissipation > pin) hardIssues.push('Estimated dissipation exceeds input power.');
    if (primaryFit.perLayer < 1 || secondaryFit.perLayer < 1 || auxiliaryFit.perLayer < 1) hardIssues.push('A wire is wider than the bobbin winding width.');
    if (radial > x.depth) hardIssues.push('Estimated radial build exceeds available depth.');
    if (secondaryRms > 2 * x.io) warnings.push('Secondary RMS current is high relative to output current; review conductor and thermal design.');

    const primaryIssue = hardIssues[0] || warnings[0] || 'None';
    const valid = hardIssues.length === 0;
    const suitability = !valid
      ? 'Not evaluated'
      : (x.eff < 0.70 || estimatedDissipation > po
        ? 'Poor'
        : fswKHz > 500 || positive(critLmH) && (lmH < critLmH / 4 || lmH > critLmH * 4)
          ? 'Reasonable'
          : 'Strong');
    const score = !valid
      ? 0
      : Math.max(0, Math.min(100,
        92
        - (fswKHz > 500 ? 18 : 0)
        - (fswKHz < 20 ? 12 : 0)
        - (stress > x.rating * 0.85 ? 18 : 0)
        - (positive(critLmH) && (lmH < critLmH / 4 || lmH > critLmH * 4) ? 14 : 0)
        - (estimatedDissipation > po ? 35 : 0)
        - (targetDuty > 0.5 ? 10 : 0)
        - (x.eff < 0.70 ? 40 : 0)
      ));
    const tone = !valid || suitability === 'Poor' ? 'red' : suitability === 'Reasonable' ? 'amber' : 'green';

    const frequencyDisplay = formatFrequency(fswKHz, fswKHz > 500);
    const lossRows = [
      ['Transformer copper loss', 'Not evaluated'],
      ['Core loss', 'Not evaluated'],
      ['MOSFET conduction loss', 'Not evaluated'],
      ['MOSFET switching loss', 'Not evaluated'],
      ['Clamp / leakage loss', 'Not evaluated'],
      ['Output rectifier loss', 'Not evaluated'],
      ['Controller and miscellaneous', 'Not evaluated'],
      ['Estimated total dissipation', fmt(estimatedDissipation, 'W')],
    ];

    return {
      valid,
      errors: hardIssues.length ? ['fsw'] : [],
      warnings,
      status: !valid
        ? `Red - ${primaryIssue}`
        : warnings.length
          ? 'Amber - review required'
          : 'Green - preliminary operating point is mathematically solvable',
      primaryIssue,
      inputValidity: valid ? 'Valid' : 'Invalid',
      electricalStatus: valid ? 'Consistent' : 'Withheld',
      magneticStatus: valid ? 'Review required' : 'Withheld',
      thermalStatus: valid ? (estimatedDissipation > po || x.eff < 0.70 ? 'Low confidence' : 'Preliminary') : 'Withheld',
      suitability,
      score,
      tone,
      po,
      pin,
      vmin,
      vmax,
      inputSpan,
      frequencyDisplay,
      fswHz,
      targetDuty: x.duty,
      dl: dutyLowLine,
      dh: dutyHighLine,
      ratio,
      vref: vsec * ratio,
      dutyLowLine,
      dutyHighLine,
      ton,
      ip,
      ipr: ip * Math.sqrt(dutyLowLine / 3),
      isp: ip * ratio,
      isr: secondaryRms,
      transferredPowerEstimate,
      mismatchPct,
      critLmH,
      be,
      bv,
      al,
      gap,
      vaux,
      stress,
      estimatedDissipation,
      primaryFit,
      secondaryFit,
      auxiliaryFit,
      copper,
      insulation,
      radial,
      used,
      lossRows,
      groups: [
        ['Power boundary', [
          ['Output power', fmt(po, 'W')],
          ['Estimated input power', fmt(pin, 'W')],
          ['Input span', fmt(inputSpan, 'x', 2)],
          ['Switching frequency', frequencyDisplay],
          ['Target duty', fmt(x.duty, '%')],
        ]],
        ['Magnetics', [
          ['Required Ns/Np turns ratio', fmt(ratio, '', 3)],
          ['Critical Lm', fmt(critLmH * 1e6, 'uH')],
          ['Selected Lm', fmt(x.lp, 'uH')],
          ['Primary peak current', fmt(ip, 'A', 3)],
          ['Transferred power estimate', fmt(transferredPowerEstimate, 'W')],
        ]],
        ['Loss table', lossRows],
      ],
    };
  }

  const rm10 = {
    vacMin: 110, vacMax: 130, line: 60, vo: 5, io: 1, vf: 0.7, eff: 72, fsw: 132, duty: 45,
    lp: 2476, np: 119, ns: 5, naux: 5, ae: 96.6, le: 36.5, mur: 2000, blim: 0.35,
    width: 10, depth: 2.5, pwire: 0.240, swire: 0.717, awire: 0.200, tape: 0.025,
    psections: 2, boundaries: 4, rating: 400,
  };

  function mount() {
    const host = document.querySelector('[data-flyback-calculator]');
    if (!host) return;

    const fields = [
      ['Electrical requirements', 'vacMin', 'Minimum AC input voltage', 'V RMS'],
      ['', 'vacMax', 'Maximum AC input voltage', 'V RMS'],
      ['', 'line', 'Line frequency', 'Hz'],
      ['', 'vo', 'Output voltage', 'V'],
      ['', 'io', 'Output current', 'A'],
      ['', 'vf', 'Output-diode forward drop', 'V'],
      ['', 'eff', 'Estimated efficiency', '%'],
      ['', 'fsw', 'Switching frequency', 'kHz'],
      ['', 'duty', 'Target maximum duty cycle', '%'],
      ['Transformer and core', 'lp', 'Primary inductance', 'uH'],
      ['', 'np', 'Primary turns', 'turns'],
      ['', 'ns', 'Secondary turns', 'turns'],
      ['', 'naux', 'Auxiliary turns', 'turns'],
      ['', 'ae', 'Effective core area, Ae', 'mm^2'],
      ['', 'le', 'Effective magnetic path length, le', 'mm'],
      ['', 'mur', 'Relative permeability', ''],
      ['', 'blim', 'Conservative saturation-flux limit', 'T'],
      ['', 'rating', 'MOSFET voltage rating', 'V'],
      ['Bobbin and winding fit', 'width', 'Bobbin winding width', 'mm'],
      ['', 'depth', 'Available radial winding depth', 'mm'],
      ['', 'pwire', 'Primary wire outside diameter', 'mm'],
      ['', 'swire', 'Secondary wire outside diameter', 'mm'],
      ['', 'awire', 'Auxiliary wire outside diameter', 'mm'],
      ['', 'tape', 'Tape thickness', 'mm'],
      ['', 'psections', 'Number of primary sections', ''],
      ['', 'boundaries', 'Required interwinding insulation layers', ''],
    ];

    let html = '<section class="flyback-calc section-grid" aria-labelledby="flyback-title"><div class="container"><div class="flyback-head"><p class="transformer-kicker">Preliminary flyback estimator</p><h2 id="flyback-title">Explore a flyback<br><em>transformer concept.</em></h2><p>Estimate turns ratio, duty cycle, peak current, flux swing, air gap, winding fit, and idealized switch stress. Results are preliminary engineering estimates, not a substitute for magnetic characterization, insulation design, thermal validation, leakage-inductance measurement, or hardware testing.</p></div><div class="flyback-surface"><div class="flyback-tools"><form id="flyback-form" novalidate><div class="flyback-actions"><button type="button" id="rm10" class="button button-primary">Load 5 V / 1 A RM10 example</button><span>Example values only; not universal recommendations.</span></div>';

    let open = false;
    for (const [group, key, label, unit] of fields) {
      if (group) {
        if (open) html += '</section>';
        html += `<section class="flyback-input-section"><h3>${group}</h3><div class="flyback-field-grid">`;
        open = true;
      }
      html += `<label class="flyback-field"><span class="flyback-field-label">${label}</span><span class="flyback-control"><input name="${key}" type="number" step="any" required><span class="flyback-unit">${unit || 'value'}</span></span></label>`;
    }
    if (open) html += '</div></section>';

    html += '</form><div class="flyback-results" aria-live="polite"><div id="flyback-status" class="flyback-status"></div><div id="flyback-output"></div><div id="flyback-warnings"></div></div></div></div><details class="flyback-method"><summary>Method and limitations</summary><p class="flyback-limit"><strong>This estimator uses simplified first-pass flyback relationships.</strong> It does not model rectifier-bus ripple, controller-specific current limits, CCM behavior, leakage inductance, winding capacitance, proximity and skin effects, fringing near the air gap, core loss, copper loss, thermal rise, creepage, clearance, insulation-system qualification, EMI, snubber or clamp design, tolerance stack-up, or manufacturing variation. Final designs require component data, safety requirements, magnetic measurements, and bench validation.</p><div class="flyback-future"><strong>Future topology tools</strong><p>Additional topology-specific estimators for forward, push-pull, half-bridge, full-bridge, and LLC converters may be added later. Their equations are not interchangeable with this flyback estimator.</p></div></details></div></section><section class="flyback-inquiry-band"><div class="container"><div class="flyback-inquiry"><h3>Need this converted into a buildable transformer specification?</h3><p>A detailed engagement may include topology and operating-mode review, core and bobbin selection, winding structure, conductor and insulation planning, gap specification, loss and thermal estimates, prototype winding, measurements, and validation.</p><button id="flyback-email" class="button button-primary" type="button">Review inquiry summary</button></div></div></section>';
    host.innerHTML = html;

    const form = host.querySelector('form');
    const out = host.querySelector('#flyback-output');
    const warn = host.querySelector('#flyback-warnings');
    const status = host.querySelector('#flyback-status');

    const load = () => Object.entries(rm10).forEach(([key, value]) => { form.elements[key].value = value; });

    const update = () => {
      const report = evaluate(Object.fromEntries(new FormData(form)));
      status.textContent = report.status;
      status.className = `flyback-status ${report.tone === 'green' ? 'ok' : report.tone === 'amber' ? 'review' : 'alert'}`;

      if (report.errors.length) {
        out.innerHTML = '<section class="smps-verdict smps-verdict--red"><strong>Invalid input</strong><p>One or more inputs are outside the supported range. Correct the highlighted values before reviewing the concept.</p></section>';
        warn.innerHTML = `<h3>Primary issue</h3><p>${report.primaryIssue}</p>`;
        return;
      }

      out.innerHTML = `<section class="smps-verdict ${report.tone === 'red' ? 'smps-verdict--red' : 'smps-verdict--green'}"><strong>${report.valid ? 'Preliminary operating point is mathematically solvable' : 'Input requires review'}</strong><p>${report.valid ? 'Continue with the review items below before selecting parts or building hardware.' : 'This operating point needs correction before a design review can continue.'}</p></section>` +
        report.groups.map(([title, items]) => `<section><h3>${title}</h3><dl>${items.map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join('')}</dl></section>`).join('');

      warn.innerHTML = report.warnings.length
        ? `<h3>Engineering warnings</h3><ul>${report.warnings.map((warning) => `<li>${warning}</li>`).join('')}</ul>`
        : '<p>No selected preliminary warning thresholds were triggered.</p>';
    };

    load();
    update();

    let updateTimer;
    form.addEventListener('input', () => {
      clearTimeout(updateTimer);
      updateTimer = setTimeout(update, 120);
    });

    host.querySelector('#rm10').addEventListener('click', () => { load(); update(); });
    host.querySelector('#flyback-email').addEventListener('click', () => {
      const report = evaluate(Object.fromEntries(new FormData(form)));
      if (report.errors.length) { update(); return; }
      const body = `Flyback Transformer Feasibility Calculator - preliminary inquiry\n\nOutput: ${fmt(report.po, 'W')}\nInput range: ${form.elements.vacMin.value}-${form.elements.vacMax.value} V RMS\nTurns: Np ${form.elements.np.value}, Ns ${form.elements.ns.value}, Naux ${form.elements.naux.value}\nLow-line duty: ${fmt(report.dutyLowLine * 100, '%')}\nFlux estimates: ${fmt(report.be, 'T', 4)} / ${fmt(report.bv, 'T', 4)}\nGap: ${fmt(report.gap * 1000, 'mm', 3)}\nFit: ${report.used > 100 ? 'Does not fit' : report.used > 85 ? 'Borderline' : 'Fits'} (${fmt(report.used, '%')})\n\nPlease review this preliminary summary before sending.`;
      window.location.href = 'mailto:info@herdersystemen.com?subject=Flyback%20Transformer%20Concept&body=' + encodeURIComponent(body);
    });
  }

  const api = { evaluate, calculate: evaluate, fit, rm10, kHzToHz, uHToH, mHToH, uFToF, percentToRatio, mmToM, mm2ToM2, mOhmToOhm };
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', mount);
  if (typeof module !== 'undefined') module.exports = api;
  root.FlybackCalculator = api;
})(typeof window !== 'undefined' ? window : globalThis);