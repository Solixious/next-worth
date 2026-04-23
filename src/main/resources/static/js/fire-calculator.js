(function () {
    'use strict';

    // ─── Currency ────────────────────────────────────────────────────────────

    var CURRENCIES = [
        { code: 'INR', symbol: '₹', label: '₹ INR' },
        { code: 'USD', symbol: '$', label: '$ USD' },
        { code: 'EUR', symbol: '€', label: '€ EUR' },
        { code: 'GBP', symbol: '£', label: '£ GBP' }
    ];
    var activeCurrency = CURRENCIES[0];

    function buildCurrencyBar() {
        var bar = document.getElementById('currencyBar');
        if (!bar) return;
        CURRENCIES.forEach(function (c) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'currency-btn' + (c.code === activeCurrency.code ? ' active' : '');
            btn.textContent = c.label;
            btn.addEventListener('click', function () {
                activeCurrency = c;
                bar.querySelectorAll('.currency-btn').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                recalc();
            });
            bar.appendChild(btn);
        });
    }

    function fmt(n) {
        if (!isFinite(n) || isNaN(n)) return activeCurrency.symbol + '—';
        return activeCurrency.symbol + Math.round(Math.abs(n)).toLocaleString('en-IN');
    }

    // ─── URL param pre-fill ───────────────────────────────────────────────────

    function getParam(name) {
        try {
            return new URLSearchParams(window.location.search).get(name);
        } catch (e) { return null; }
    }

    // ─── DOM helpers ─────────────────────────────────────────────────────────

    function el(id) { return document.getElementById(id); }
    function val(id) { return parseFloat(el(id).value) || 0; }
    function setText(id, text) { var e = el(id); if (e) e.textContent = text; }

    // ─── Slider ↔ manual input sync ──────────────────────────────────────────

    function bindSlider(sliderId, inputId, displayId, formatFn) {
        var slider = el(sliderId);
        var input  = el(inputId);
        var disp   = el(displayId);
        if (!slider || !input) return;

        function update(v) {
            slider.value = v;
            input.value  = v;
            if (disp) disp.textContent = formatFn ? formatFn(v) : v;
            recalc();
        }

        slider.addEventListener('input', function () { update(parseFloat(this.value)); });
        input.addEventListener('input', function () {
            var v = parseFloat(this.value);
            if (!isNaN(v)) { slider.value = v; if (disp) disp.textContent = formatFn ? formatFn(v) : v; recalc(); }
        });
        input.addEventListener('change', function () {
            var v = Math.min(Math.max(parseFloat(this.value) || 0, parseFloat(slider.min)), parseFloat(slider.max));
            update(v);
        });
    }

    // ─── SWR segmented buttons ───────────────────────────────────────────────

    var activeSWR = 4;

    function bindSWRButtons() {
        document.querySelectorAll('.fire-swr-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.fire-swr-btn').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                activeSWR = parseFloat(btn.dataset.swr);
                recalc();
            });
        });
    }

    // ─── Core maths ──────────────────────────────────────────────────────────

    function futureValue(corpus, monthly, monthlyRate, months) {
        if (Math.abs(monthlyRate) < 1e-10) return corpus + monthly * months;
        var g = Math.pow(1 + monthlyRate, months);
        return corpus * g + monthly * (g - 1) / monthlyRate * (1 + monthlyRate);
    }

    function monthsToFire(corpus, monthly, monthlyRate, target) {
        if (corpus >= target) return 0;
        if (monthly <= 0 && monthlyRate <= 0) return Infinity;
        // Binary search up to 1200 months (100 years)
        var lo = 0, hi = 1200;
        if (futureValue(corpus, monthly, monthlyRate, hi) < target) return Infinity;
        while (lo < hi - 1) {
            var mid = Math.floor((lo + hi) / 2);
            if (futureValue(corpus, monthly, monthlyRate, mid) >= target) hi = mid;
            else lo = mid + 1;
        }
        return hi;
    }

    function monthlyNeededForTarget(corpus, monthlyRate, target, months) {
        if (months <= 0) return Infinity;
        var g = Math.pow(1 + monthlyRate, months);
        var corpusGrown = corpus * g;
        if (corpusGrown >= target) return 0;
        if (Math.abs(monthlyRate) < 1e-10) return (target - corpusGrown) / months;
        return (target - corpusGrown) / ((g - 1) / monthlyRate * (1 + monthlyRate));
    }

    // ─── Recalc ──────────────────────────────────────────────────────────────

    function recalc() {
        var currentAge      = val('currentAge')  || 30;
        var targetAge       = val('targetAge')   || 0;
        var monthlyExp      = val('monthlyExpenses');
        var annualReturn    = val('returnRate') / 100;
        var inflation       = val('inflationRate') / 100;
        var corpus          = val('currentCorpus');
        var monthlyInvest   = val('monthlyInvestment');
        var swr             = activeSWR / 100;

        var annualExp       = monthlyExp * 12;

        // FIRE number in today's money (real-return approach)
        var fireNumber = annualExp > 0 ? annualExp / swr : 0;

        // Real (inflation-adjusted) return
        var realAnnual   = (1 + annualReturn) / (1 + inflation) - 1;
        var realMonthly  = Math.pow(1 + realAnnual, 1 / 12) - 1;

        // Years / months to FIRE
        var months       = fireNumber > 0 ? monthsToFire(corpus, monthlyInvest, realMonthly, fireNumber) : 0;
        var yearsToFire  = isFinite(months) ? months / 12 : Infinity;
        var retireAge    = isFinite(yearsToFire) ? currentAge + yearsToFire : Infinity;
        var retireYear   = isFinite(yearsToFire) ? (new Date().getFullYear() + yearsToFire) : Infinity;

        // Progress %
        var progress     = fireNumber > 0 ? Math.min(100, (corpus / fireNumber) * 100) : 0;

        // Monthly needed for target age (if set)
        var neededMonthly = 0;
        var targetGap     = 0;
        if (targetAge > currentAge && fireNumber > 0) {
            var targetMonths = (targetAge - currentAge) * 12;
            neededMonthly    = monthlyNeededForTarget(corpus, realMonthly, fireNumber, targetMonths);
            targetGap        = Math.max(0, neededMonthly - monthlyInvest);
        }

        // ── Update DOM ──
        var sym = activeCurrency.symbol;

        // FIRE number
        setText('r-fireNumber', fmt(fireNumber));

        // Progress bar
        var pctRounded = Math.round(progress);
        setText('r-progressPct', pctRounded + '%');
        var bar = el('fireProgressFill');
        if (bar) bar.style.width = Math.min(100, progress) + '%';

        // Stats
        setText('r-corpus',     fmt(corpus));
        if (isFinite(yearsToFire) && yearsToFire > 0) {
            var yrs = Math.floor(yearsToFire);
            var mos = Math.round((yearsToFire - yrs) * 12);
            setText('r-yearsToFire', yrs + ' yr' + (yrs !== 1 ? 's' : '') + (mos > 0 ? ' ' + mos + ' mo' : ''));
        } else if (yearsToFire === 0) {
            setText('r-yearsToFire', 'Already FIRE!');
        } else {
            setText('r-yearsToFire', 'Not enough data');
        }

        if (isFinite(retireAge) && retireAge > 0) {
            setText('r-retireAge', Math.round(retireAge * 10) / 10 + ' yrs');
        } else {
            setText('r-retireAge', '—');
        }

        if (isFinite(retireYear) && retireYear > 0) {
            setText('r-retireYear', Math.floor(retireYear).toString());
        } else {
            setText('r-retireYear', '—');
        }

        // Target age section
        var targetSection = el('targetAgeSection');
        if (targetAge > currentAge && fireNumber > 0 && targetSection) {
            targetSection.style.display = 'block';
            setText('r-neededMonthly', fmt(neededMonthly));
            var gapEl = el('r-targetGap');
            if (gapEl) {
                if (targetGap > 0) {
                    gapEl.textContent = fmt(targetGap) + ' more / mo needed';
                    gapEl.className = 'fire-gap-text fire-gap-over';
                } else {
                    gapEl.textContent = 'On track for target!';
                    gapEl.className = 'fire-gap-text fire-gap-ok';
                }
            }
        } else if (targetSection) {
            targetSection.style.display = 'none';
        }

        // Colour progress bar
        if (bar) {
            bar.className = 'fire-progress-fill';
            if (progress >= 100) bar.classList.add('fire-progress-done');
            else if (progress >= 50) bar.classList.add('fire-progress-mid');
        }
    }

    // ─── Init ─────────────────────────────────────────────────────────────────

    function init() {
        buildCurrencyBar();
        bindSWRButtons();

        // Pre-fill from URL params (passed by net-worth calculator)
        var pCorpus   = getParam('corpus');
        var pMonthly  = getParam('monthly');
        var pExpenses = getParam('expenses');

        if (pCorpus && !isNaN(pCorpus)) {
            var c = Math.max(0, Math.round(parseFloat(pCorpus)));
            var corpusInput  = el('currentCorpus');
            var corpusSlider = el('corpus-slider');
            if (corpusInput)  corpusInput.value  = c;
            if (corpusSlider) corpusSlider.value  = Math.min(c, parseFloat(corpusSlider.max));
            var corpusDisp = el('display-corpus');
            if (corpusDisp) corpusDisp.textContent = '₹' + c.toLocaleString('en-IN');
        }
        if (pMonthly && !isNaN(pMonthly)) {
            var m = Math.max(0, Math.round(parseFloat(pMonthly)));
            var investInput  = el('monthlyInvestment');
            var investSlider = el('invest-slider');
            if (investInput)  investInput.value  = m;
            if (investSlider) investSlider.value  = Math.min(m, parseFloat(investSlider.max));
            var investDisp = el('display-invest');
            if (investDisp) investDisp.textContent = '₹' + m.toLocaleString('en-IN');
        }
        if (pExpenses && !isNaN(pExpenses)) {
            var ex = Math.max(0, Math.round(parseFloat(pExpenses)));
            var expInput  = el('monthlyExpenses');
            var expSlider = el('expenses-slider');
            if (expInput)  expInput.value  = ex;
            if (expSlider) expSlider.value  = Math.min(ex, parseFloat(expSlider.max));
            var expDisp = el('display-expenses');
            if (expDisp) expDisp.textContent = '₹' + ex.toLocaleString('en-IN');
        }

        // Bind sliders
        bindSlider('expenses-slider', 'monthlyExpenses', 'display-expenses',
            function (v) { return activeCurrency.symbol + Math.round(v).toLocaleString('en-IN'); });
        bindSlider('corpus-slider', 'currentCorpus', 'display-corpus',
            function (v) { return activeCurrency.symbol + Math.round(v).toLocaleString('en-IN'); });
        bindSlider('invest-slider', 'monthlyInvestment', 'display-invest',
            function (v) { return activeCurrency.symbol + Math.round(v).toLocaleString('en-IN'); });
        bindSlider('return-slider', 'returnRate', 'display-return',
            function (v) { return parseFloat(v).toFixed(1) + '%'; });
        bindSlider('inflation-slider', 'inflationRate', 'display-inflation',
            function (v) { return parseFloat(v).toFixed(1) + '%'; });

        // Age inputs
        ['currentAge', 'targetAge'].forEach(function (id) {
            var inp = el(id);
            if (inp) inp.addEventListener('input', recalc);
        });

        recalc();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
