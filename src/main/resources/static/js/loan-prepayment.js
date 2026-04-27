(function () {
    'use strict';

    var CURRENCIES = [
        { code: 'INR', symbol: '\u20b9', name: 'Indian Rupee', locale: 'en-IN' },
        { code: 'USD', symbol: '$',      name: 'US Dollar',    locale: 'en-US' },
        { code: 'EUR', symbol: '\u20ac', name: 'Euro',         locale: 'de-DE' }
    ];
    var activeCurrency = CURRENCIES[0];
    var tenureMode     = 'years';
    var strategy       = 'tenure';   // 'tenure' | 'emi'
    var STORAGE_KEY    = 'nw_lp_v1';
    var amortChart     = null;
    var lastTheme      = null;

    function el(id) { return document.getElementById(id); }
    function num(v) { var n = parseFloat(String(v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }

    function fmt(n) {
        if (!isFinite(n) || n < 0) return activeCurrency.symbol + '0';
        return activeCurrency.symbol + Math.round(n).toLocaleString(activeCurrency.locale);
    }

    function fmtMonths(m) {
        m = Math.round(m);
        if (m <= 0) return '0 months';
        var y = Math.floor(m / 12);
        var mo = m % 12;
        var parts = [];
        if (y > 0)  parts.push(y  + (y  === 1 ? ' yr'  : ' yrs'));
        if (mo > 0) parts.push(mo + (mo === 1 ? ' mo'  : ' mos'));
        return parts.join(' ') + ' (' + m + ' mo)';
    }

    function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
    function chartColors() {
        var dark = isDark();
        return {
            text: dark ? '#a9b7c9' : '#475569',
            grid: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
        };
    }

    // ── Core math ────────────────────────────────────────────────────

    function calcEMI(P, annualRate, months) {
        if (P <= 0 || months <= 0) return 0;
        if (annualRate <= 0) return P / months;
        var r = annualRate / 100 / 12;
        return P * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
    }

    // New tenure (months) when keeping same EMI after prepayment
    function calcNewTenure(emi, P_new, annualRate) {
        if (P_new <= 0) return 0;
        if (annualRate <= 0) return Math.ceil(P_new / emi);
        var r = annualRate / 100 / 12;
        var denom = emi - P_new * r;
        if (denom <= 0) return Infinity;       // EMI can't cover even the interest
        return Math.ceil(Math.log(emi / denom) / Math.log(1 + r));
    }

    // Monthly balance schedule sampled at yearly intervals
    function buildYearlyBalances(P, annualRate, n) {
        if (P <= 0 || n <= 0) return [0];
        var r   = annualRate / 100 / 12;
        var emi = calcEMI(P, annualRate, n);
        var bal = P;
        var out = [Math.round(P)];
        for (var m = 1; m <= n; m++) {
            var interest = bal * r;
            bal = Math.max(0, bal - (emi - interest));
            if (m % 12 === 0) out.push(Math.round(bal));
        }
        if (n % 12 !== 0) out.push(0);  // ensure the line reaches zero
        return out;
    }

    // ── Persistence ───────────────────────────────────────────────────

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                loanAmount:    el('loanAmount').value,
                interestRate:  el('interestRate').value,
                tenure:        el('tenure').value,
                prepayment:    el('prepayment').value,
                tenureMode:    tenureMode,
                strategy:      strategy,
                currencyCode:  activeCurrency.code
            }));
        } catch (e) {}
    }

    function loadState() {
        try {
            var s = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (!s) return;

            var cur = CURRENCIES.filter(function (c) { return c.code === s.currencyCode; })[0];
            if (cur) activeCurrency = cur;

            if (s.strategy) {
                strategy = s.strategy;
                document.querySelectorAll('.lp-strategy-btn').forEach(function (b) {
                    b.classList.toggle('active', b.dataset.strategy === strategy);
                });
            }

            if (s.tenureMode === 'months') {
                tenureMode = 'months';
                var tsl = el('tenure-slider'), tinp = el('tenure');
                if (tsl)  { tsl.min = 1; tsl.max = 360; tsl.step = 1; }
                if (tinp) { tinp.min = 1; tinp.max = 360; }
                var yb = el('tenure-years-btn'), mb = el('tenure-months-btn');
                if (yb) yb.classList.remove('active');
                if (mb) mb.classList.add('active');
                updateTenureTicks();
            }

            var sliderMap = {
                loanAmount:   'loan-slider',
                interestRate: 'rate-slider',
                prepayment:   'prepay-slider'
            };
            ['loanAmount', 'interestRate', 'prepayment'].forEach(function (f) {
                if (s[f] === undefined) return;
                var inp = el(f);
                var sld = el(sliderMap[f]);
                if (inp) inp.value = s[f];
                if (sld) sld.value = Math.min(Math.max(parseFloat(s[f]) || 0, parseFloat(sld.min)), parseFloat(sld.max));
            });
            if (s.tenure !== undefined) {
                el('tenure').value = s.tenure;
                var ts = el('tenure-slider');
                if (ts) ts.value = Math.min(parseFloat(s.tenure) || 0, parseFloat(ts.max));
            }
        } catch (e) {}
    }

    // ── Recalc ────────────────────────────────────────────────────────

    function recalc() {
        var P          = num(el('loanAmount').value);
        var rate       = num(el('interestRate').value);
        var tenureVal  = num(el('tenure').value);
        var prepay     = num(el('prepayment').value);

        var months     = tenureMode === 'years' ? tenureVal * 12 : tenureVal;
        var P_new      = Math.max(0, P - prepay);
        var paidOff    = P_new <= 0;

        // Original loan metrics
        var emi            = calcEMI(P, rate, months);
        var totalOrig      = emi * months;
        var interestOrig   = Math.max(0, totalOrig - P);

        // After prepayment
        var interestNew, tenureSaved, newEMI, newTenure;
        if (paidOff) {
            interestNew  = 0;
            tenureSaved  = months;
            newEMI       = 0;
            newTenure    = 0;
        } else if (strategy === 'tenure') {
            newTenure    = calcNewTenure(emi, P_new, rate);
            var totalNew = emi * newTenure;
            interestNew  = Math.max(0, totalNew - P_new);
            tenureSaved  = Math.max(0, months - newTenure);
            newEMI       = emi;
        } else {
            newTenure    = months;
            newEMI       = calcEMI(P_new, rate, months);
            var totalNew2 = newEMI * months;
            interestNew  = Math.max(0, totalNew2 - P_new);
            tenureSaved  = 0;
        }

        var interestSaved = Math.max(0, interestOrig - interestNew);
        var remainingPct  = interestOrig > 0
            ? Math.max(0, Math.min(100, (interestNew / interestOrig) * 100))
            : 0;

        // ── Display updates ──
        el('display-loan').textContent    = fmt(P);
        el('display-rate').textContent    = num(el('interestRate').value).toFixed(1) + '%';
        el('display-tenure').textContent  = tenureMode === 'years'
            ? tenureVal + (tenureVal === 1 ? ' Year'  : ' Years')
            : tenureVal + (tenureVal === 1 ? ' Month' : ' Months');
        el('display-prepay').textContent  = fmt(prepay);

        // Results card
        el('lp-savings-value').textContent = fmt(interestSaved);
        el('r-emi').textContent            = fmt(emi);
        el('r-interest-orig').textContent  = fmt(interestOrig);
        el('r-interest-new').textContent   = fmt(interestNew);
        el('r-interest-saved').textContent = fmt(interestSaved);

        if (strategy === 'tenure') {
            el('lp-row-new-tenure').style.display   = paidOff ? 'none' : '';
            el('lp-row-tenure-saved').style.display = '';
            el('lp-row-new-emi').style.display      = 'none';
            el('lp-row-emi-saved').style.display    = 'none';
            if (paidOff) {
                el('r-tenure-saved').textContent = 'Loan fully paid off!';
            } else {
                el('r-new-tenure').textContent   = fmtMonths(newTenure);
                el('r-tenure-saved').textContent = tenureSaved > 0 ? fmtMonths(tenureSaved) : '—';
            }
        } else {
            el('lp-row-new-tenure').style.display   = 'none';
            el('lp-row-tenure-saved').style.display = 'none';
            el('lp-row-new-emi').style.display      = '';
            el('lp-row-emi-saved').style.display    = '';
            el('r-new-emi').textContent   = fmt(newEMI);
            el('r-emi-saved').textContent = fmt(Math.max(0, emi - newEMI)) + '/mo';
        }

        // Breakdown bar
        el('lp-bar-remaining').style.width         = remainingPct.toFixed(1) + '%';
        el('legend-remaining-pct').textContent     = Math.round(remainingPct) + '%';
        el('legend-saved-pct').textContent         = Math.round(100 - remainingPct) + '%';

        // Mobile bar
        var mbSaved = el('mb-saved');
        var mbEmi   = el('mb-emi');
        if (mbSaved) mbSaved.textContent = fmt(interestSaved);
        if (mbEmi)   mbEmi.textContent   = fmt(emi);

        renderChart(P, P_new, rate, months, newTenure, paidOff);
        saveState();
    }

    // ── Chart ─────────────────────────────────────────────────────────

    function renderChart(P, P_new, rate, months, newTenure, paidOff) {
        var ctx = el('chartAmort');
        if (!ctx) return;

        // Build yearly balance snapshots
        var origBalances = buildYearlyBalances(P, rate, months);
        var maxYears     = Math.ceil(months / 12);

        var newBalances;
        if (paidOff) {
            newBalances = new Array(maxYears + 1).fill(0);
            newBalances[0] = 0;
        } else if (strategy === 'tenure') {
            var raw = buildYearlyBalances(P_new, rate, newTenure);
            // Pad to original length with zeros
            newBalances = [P_new];                          // Year 0 = balance after prepayment
            for (var i = 1; i <= maxYears; i++) {
                newBalances.push(raw[i] !== undefined ? raw[i] : 0);
            }
        } else {
            newBalances = buildYearlyBalances(P_new, rate, months);
        }

        var labels = [];
        for (var y = 0; y <= maxYears; y++) { labels.push('Yr ' + y); }

        var theme = isDark() ? 'dark' : 'light';
        if (amortChart && theme !== lastTheme) { amortChart.destroy(); amortChart = null; }
        lastTheme = theme;

        var cc = chartColors();

        if (amortChart) {
            amortChart.options.scales.x.ticks.color         = cc.text;
            amortChart.options.scales.y.ticks.color         = cc.text;
            amortChart.options.scales.x.grid.color          = cc.grid;
            amortChart.options.scales.y.grid.color          = cc.grid;
            amortChart.options.plugins.legend.labels.color  = cc.text;
            amortChart.data.labels                           = labels;
            amortChart.data.datasets[0].data                = origBalances;
            amortChart.data.datasets[1].data                = newBalances;
            amortChart.update();
            return;
        }

        amortChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Without Prepayment',
                        data: origBalances,
                        borderColor: 'rgba(239,68,68,0.85)',
                        backgroundColor: 'rgba(239,68,68,0.08)',
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 5,
                        fill: true,
                        tension: 0.25
                    },
                    {
                        label: 'With Prepayment',
                        data: newBalances,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59,130,246,0.10)',
                        borderWidth: 2.5,
                        pointRadius: 2,
                        pointHoverRadius: 5,
                        fill: true,
                        tension: 0.25
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: cc.text,
                            font: { size: 12, weight: '600' },
                            usePointStyle: true,
                            pointStyleWidth: 10,
                            boxHeight: 6
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                return ctx.dataset.label + ': ' + activeCurrency.symbol +
                                    Math.round(ctx.parsed.y).toLocaleString(activeCurrency.locale);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: cc.text, font: { size: 11 }, maxTicksLimit: 12 },
                        grid: { color: cc.grid }
                    },
                    y: {
                        ticks: {
                            color: cc.text,
                            font: { size: 11 },
                            callback: function (v) {
                                var sym = activeCurrency.symbol;
                                if (activeCurrency.code === 'INR') {
                                    if (v >= 10000000) return sym + (v / 10000000).toFixed(1) + 'Cr';
                                    if (v >= 100000)   return sym + (v / 100000).toFixed(1)   + 'L';
                                    if (v >= 1000)     return sym + (v / 1000).toFixed(0)     + 'K';
                                } else {
                                    if (v >= 1000000)  return sym + (v / 1000000).toFixed(1)  + 'M';
                                    if (v >= 1000)     return sym + (v / 1000).toFixed(0)     + 'K';
                                }
                                return sym + v;
                            }
                        },
                        grid: { color: cc.grid }
                    }
                }
            }
        });
    }

    // ── Slider helpers ────────────────────────────────────────────────

    function setSliderFill(slider) {
        var min = parseFloat(slider.min);
        var max = parseFloat(slider.max);
        var pct = ((parseFloat(slider.value) - min) / (max - min)) * 100;
        slider.style.background =
            'linear-gradient(to right, var(--color-primary) ' + pct + '%, var(--color-bg-light) ' + pct + '%)';
    }

    function clampToSlider(v, slider) {
        return Math.min(Math.max(v, parseFloat(slider.min)), parseFloat(slider.max));
    }

    function bindSlider(sliderId, inputId) {
        var slider = el(sliderId);
        var input  = el(inputId);
        if (!slider || !input) return;
        slider.addEventListener('input', function () {
            input.value = this.value;
            setSliderFill(this);
            recalc();
        });
        input.addEventListener('input', function () {
            slider.value = clampToSlider(num(this.value), slider);
            setSliderFill(slider);
            recalc();
        });
        input.addEventListener('blur', function () {
            var v = clampToSlider(num(this.value), slider);
            this.value = v; slider.value = v;
            setSliderFill(slider);
        });
        setSliderFill(slider);
    }

    function setupTenureToggle() {
        var yrsBtn = el('tenure-years-btn');
        var moBtn  = el('tenure-months-btn');
        var slider = el('tenure-slider');
        var input  = el('tenure');

        yrsBtn.addEventListener('click', function () {
            if (tenureMode === 'years') return;
            var years = Math.min(30, Math.max(1, Math.round(num(input.value) / 12)));
            tenureMode = 'years';
            slider.min = 1; slider.max = 30; slider.step = 1;
            input.min  = 1; input.max  = 30;
            slider.value = years; input.value = years;
            setSliderFill(slider); updateTenureTicks();
            yrsBtn.classList.add('active'); moBtn.classList.remove('active');
            recalc();
        });

        moBtn.addEventListener('click', function () {
            if (tenureMode === 'months') return;
            var mos = Math.min(360, Math.max(1, num(input.value) * 12));
            tenureMode = 'months';
            slider.min = 1; slider.max = 360; slider.step = 1;
            input.min  = 1; input.max  = 360;
            slider.value = mos; input.value = mos;
            setSliderFill(slider); updateTenureTicks();
            moBtn.classList.add('active'); yrsBtn.classList.remove('active');
            recalc();
        });

        slider.addEventListener('input', function () {
            input.value = this.value; setSliderFill(this); recalc();
        });
        input.addEventListener('input', function () {
            var max = tenureMode === 'years' ? 30 : 360;
            slider.value = Math.min(Math.max(num(this.value), 1), max);
            setSliderFill(slider); recalc();
        });
        input.addEventListener('blur', function () {
            var max = tenureMode === 'years' ? 30 : 360;
            var v = Math.min(Math.max(num(this.value), 1), max);
            this.value = v; slider.value = v; setSliderFill(slider);
        });

        setSliderFill(slider);
    }

    function updateTenureTicks() {
        var ticks = el('tenure-ticks');
        ticks.innerHTML = tenureMode === 'years'
            ? '<span>1 yr</span><span>8 yrs</span><span>15 yrs</span><span>22 yrs</span><span>30 yrs</span>'
            : '<span>1 mo</span><span>90 mo</span><span>180 mo</span><span>270 mo</span><span>360 mo</span>';
    }

    function bindStrategyButtons() {
        document.querySelectorAll('.lp-strategy-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                strategy = btn.dataset.strategy;
                document.querySelectorAll('.lp-strategy-btn').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                recalc();
            });
        });
    }

    function renderCurrencySelector() {
        var bar = el('currencyBar');
        var label = document.createElement('span');
        label.className = 'currency-bar-label';
        label.textContent = 'Currency';
        bar.appendChild(label);

        var pills = document.createElement('div');
        pills.className = 'currency-pills';
        CURRENCIES.forEach(function (c) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'currency-pill' + (c === activeCurrency ? ' active' : '');
            btn.textContent = c.code + ' (' + c.symbol + ')';
            btn.addEventListener('click', function () {
                activeCurrency = c;
                document.querySelectorAll('.currency-pill').forEach(function (p) { p.classList.remove('active'); });
                btn.classList.add('active');
                recalc();
            });
            pills.appendChild(btn);
        });
        bar.appendChild(pills);

        document.querySelectorAll('.currency-pill').forEach(function (p) {
            p.classList.toggle('active', p.textContent.startsWith(activeCurrency.code));
        });
    }

    function init() {
        loadState();
        renderCurrencySelector();
        bindSlider('loan-slider',   'loanAmount');
        bindSlider('rate-slider',   'interestRate');
        bindSlider('prepay-slider', 'prepayment');
        setupTenureToggle();
        bindStrategyButtons();

        new MutationObserver(function () {
            if (amortChart) { amortChart.destroy(); amortChart = null; }
            recalc();
        }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        if (window.visualViewport) {
            function positionMobileBar() {
                var bar = el('lpMobileBar');
                if (!bar) return;
                var vp  = window.visualViewport;
                var gap = window.innerHeight - vp.offsetTop - vp.height;
                bar.style.bottom = Math.max(0, gap) + 'px';
            }
            window.visualViewport.addEventListener('resize', positionMobileBar);
            window.visualViewport.addEventListener('scroll', positionMobileBar);
            positionMobileBar();
        }

        recalc();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
