(function () {
    'use strict';

    var CURRENCIES = [
        { code: 'INR', symbol: '\u20b9', name: 'Indian Rupee', locale: 'en-IN' },
        { code: 'USD', symbol: '$',      name: 'US Dollar',    locale: 'en-US' },
        { code: 'EUR', symbol: '\u20ac', name: 'Euro',         locale: 'de-DE' }
    ];
    var activeCurrency = CURRENCIES[0];
    var STORAGE_KEY    = 'nw_rvb_v1';
    var wealthChart    = null;
    var lastTheme      = null;

    function el(id) { return document.getElementById(id); }
    function num(v) { var n = parseFloat(String(v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }

    function fmt(n) {
        if (!isFinite(n)) return activeCurrency.symbol + '0';
        var abs = Math.round(Math.abs(n));
        return (n < 0 ? '\u2212' : '') + activeCurrency.symbol + abs.toLocaleString(activeCurrency.locale);
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

    // Outstanding principal after paidMonths payments
    function outstandingAfter(P, annualRate, totalMonths, paidMonths) {
        if (P <= 0 || totalMonths <= 0) return 0;
        if (paidMonths >= totalMonths) return 0;
        if (annualRate <= 0) return Math.max(0, P - (P / totalMonths) * paidMonths);
        var r    = annualRate / 100 / 12;
        var emi  = calcEMI(P, annualRate, totalMonths);
        var powK = Math.pow(1 + r, paidMonths);
        return Math.max(0, P * powK - emi * (powK - 1) / r);
    }

    // ── Persistence ───────────────────────────────────────────────────

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                propertyPrice:       el('propertyPrice').value,
                downPaymentPct:      el('downPaymentPct').value,
                loanRate:            el('loanRate').value,
                loanTenure:          el('loanTenure').value,
                monthlyRent:         el('monthlyRent').value,
                maintenance:         el('maintenance').value,
                stampDutyPct:        el('stampDutyPct').value,
                rentGrowth:          el('rentGrowth').value,
                appreciation:        el('appreciation').value,
                investReturn:        el('investReturn').value,
                timeHorizon:         el('timeHorizon').value,
                currencyCode:        activeCurrency.code
            }));
        } catch (e) {}
    }

    var SLIDER_MAP = {
        propertyPrice:  'price-slider',
        downPaymentPct: 'down-slider',
        loanRate:       'rate-slider',
        loanTenure:     'tenure-slider',
        monthlyRent:    'rent-slider',
        maintenance:    'maintenance-slider',
        stampDutyPct:   'stamp-slider',
        rentGrowth:     'rent-growth-slider',
        appreciation:   'appreciation-slider',
        investReturn:   'invest-return-slider',
        timeHorizon:    'horizon-slider'
    };

    function loadState() {
        try {
            var s = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (!s) return;

            var cur = CURRENCIES.filter(function (c) { return c.code === s.currencyCode; })[0];
            if (cur) activeCurrency = cur;

            Object.keys(SLIDER_MAP).forEach(function (f) {
                if (s[f] === undefined) return;
                var inp = el(f);
                var sld = el(SLIDER_MAP[f]);
                if (inp) inp.value = s[f];
                if (sld) sld.value = Math.min(Math.max(parseFloat(s[f]) || 0, parseFloat(sld.min)), parseFloat(sld.max));
            });
        } catch (e) {}
    }

    // ── Recalc ────────────────────────────────────────────────────────

    function recalc() {
        var price        = num(el('propertyPrice').value);
        var downPct      = num(el('downPaymentPct').value);
        var rate         = num(el('loanRate').value);
        var tenureYears  = num(el('loanTenure').value);
        var rent         = num(el('monthlyRent').value);
        var maintenance  = num(el('maintenance').value);
        var stampDutyPct = num(el('stampDutyPct').value);
        var rentGrowth   = num(el('rentGrowth').value);
        var appreciation = num(el('appreciation').value);
        var investReturn = num(el('investReturn').value);
        var horizon      = Math.round(num(el('timeHorizon').value));

        var downPayment   = price * downPct / 100;
        var loanAmount    = price - downPayment;
        var tenureMonths  = tenureYears * 12;
        var stampDutyAmt  = price * stampDutyPct / 100;
        var emi           = calcEMI(loanAmount, rate, tenureMonths);
        var buyerMonthly  = emi + maintenance;
        var horizonMonths = horizon * 12;
        var monthlyInvRate = investReturn / 100 / 12;

        // Display input values
        el('display-price').textContent       = fmt(price);
        el('display-down-pct').textContent    = downPct.toFixed(0) + '%';
        el('display-rate').textContent        = rate.toFixed(1) + '%';
        el('display-tenure').textContent      = tenureYears + (tenureYears === 1 ? ' Year' : ' Years');
        el('display-rent').textContent        = fmt(rent);
        el('display-maintenance').textContent = fmt(maintenance);
        el('display-stamp-duty').textContent  = stampDutyPct.toFixed(1) + '%';
        el('display-rent-growth').textContent = rentGrowth.toFixed(1) + '%';
        el('display-appreciation').textContent = appreciation.toFixed(1) + '%';
        el('display-invest-return').textContent = investReturn.toFixed(1) + '%';
        el('display-horizon').textContent     = horizon + (horizon === 1 ? ' Year' : ' Years');

        // Computed loan info
        var downInfoEl = el('display-down-info');
        if (downInfoEl) {
            el('info-down-amt').textContent  = fmt(downPayment);
            el('info-loan-amt').textContent  = fmt(loanAmount);
            el('info-stamp-amt').textContent = fmt(stampDutyAmt);
        }

        // Month-by-month simulation
        // Renter invests: down payment + stamp duty as initial corpus
        var renterCorpus        = downPayment + stampDutyAmt;
        var buyerWealthByYear   = [];
        var renterWealthByYear  = [];

        for (var m = 1; m <= horizonMonths; m++) {
            var year         = Math.floor((m - 1) / 12);
            var rentThisMonth = rent * Math.pow(1 + rentGrowth / 100, year);
            // Monthly surplus buyer spends over renter — renter invests this
            var surplus      = buyerMonthly - rentThisMonth;
            renterCorpus     = renterCorpus * (1 + monthlyInvRate) + surplus;

            if (m % 12 === 0) {
                var yr          = m / 12;
                var propValue   = price * Math.pow(1 + appreciation / 100, yr);
                var paid        = Math.min(m, tenureMonths);
                var outstanding = outstandingAfter(loanAmount, rate, tenureMonths, paid);
                var sellingCost = propValue * 0.02;
                buyerWealthByYear.push(Math.round(propValue - outstanding - sellingCost));
                renterWealthByYear.push(Math.round(renterCorpus));
            }
        }

        var buyerFinal  = buyerWealthByYear[buyerWealthByYear.length - 1] || 0;
        var renterFinal = renterWealthByYear[renterWealthByYear.length - 1] || 0;
        var diff        = buyerFinal - renterFinal;
        var buyerWins   = diff >= 0;

        // Find break-even year
        var breakevenYear = null;
        for (var i = 0; i < buyerWealthByYear.length; i++) {
            if (buyerWealthByYear[i] >= renterWealthByYear[i]) {
                breakevenYear = i + 1;
                break;
            }
        }

        // Final property metrics
        var finalPropValue  = price * Math.pow(1 + appreciation / 100, horizon);
        var finalOutstanding = outstandingAfter(loanAmount, rate, tenureMonths, Math.min(horizonMonths, tenureMonths));
        var currentRent     = rent * Math.pow(1 + rentGrowth / 100, Math.max(0, horizon - 1));

        // ── Results card ──────────────────────────────────────────────
        el('rvb-results-label').textContent  = buyerWins ? 'Buying is better by' : 'Renting is better by';
        el('rvb-diff-value').textContent     = fmt(Math.abs(diff));
        el('rvb-verdict-sub').textContent    = 'over ' + horizon + ' years at current assumptions';

        var badge = el('rvb-verdict-badge');
        badge.textContent = buyerWins ? 'BUY' : 'RENT';
        badge.className   = 'rvb-verdict-badge ' + (buyerWins ? 'rvb-buy' : 'rvb-rent');

        el('r-buyer-wealth').textContent  = fmt(buyerFinal);
        el('r-renter-wealth').textContent = fmt(renterFinal);
        el('r-emi').textContent           = fmt(emi);
        el('r-buyer-monthly').textContent = fmt(buyerMonthly);
        el('r-renter-monthly').textContent = fmt(rent);
        el('r-rent-at-horizon').textContent = fmt(currentRent);
        el('r-prop-value').textContent    = fmt(finalPropValue);
        el('r-outstanding').textContent   = fmt(finalOutstanding);

        if (breakevenYear !== null) {
            el('r-breakeven').textContent = 'Year ' + breakevenYear;
            el('r-breakeven').classList.remove('rvb-accent');
        } else if (!buyerWins) {
            el('r-breakeven').textContent = 'Beyond ' + horizon + ' yrs';
            el('r-breakeven').classList.add('rvb-accent');
        } else {
            el('r-breakeven').textContent = 'From year 1';
            el('r-breakeven').classList.remove('rvb-accent');
        }

        // Breakdown bar: buying share of max
        var maxWealth  = Math.max(Math.abs(buyerFinal), Math.abs(renterFinal));
        var buyerShare = maxWealth > 0 ? Math.max(0, Math.min(100, (buyerFinal / maxWealth) * 100)) : 50;
        el('rvb-bar-buy').style.width = buyerShare.toFixed(1) + '%';

        var buyerPctNum  = maxWealth > 0 ? Math.round(buyerFinal / maxWealth * 100) : 0;
        var renterPctNum = 100 - buyerPctNum;
        el('legend-buy-pct').textContent  = Math.max(0, buyerPctNum) + '%';
        el('legend-rent-pct').textContent = Math.max(0, renterPctNum) + '%';

        // Mobile bar
        var mbVerdict = el('mb-verdict');
        var mbDiff    = el('mb-diff');
        if (mbVerdict) mbVerdict.textContent = buyerWins ? 'Buy' : 'Rent';
        if (mbDiff)    mbDiff.textContent    = fmt(Math.abs(diff));

        renderChart(buyerWealthByYear, renterWealthByYear, horizon);

        saveState();
    }

    // ── Chart ─────────────────────────────────────────────────────────

    function renderChart(buyerData, renterData, horizon) {
        var ctx = el('chartWealth');
        if (!ctx) return;

        var labels = [];
        for (var y = 1; y <= horizon; y++) labels.push('Yr ' + y);

        var theme = isDark() ? 'dark' : 'light';
        if (wealthChart && theme !== lastTheme) {
            wealthChart.destroy();
            wealthChart = null;
        }
        lastTheme = theme;

        if (wealthChart) {
            var cc = chartColors();
            wealthChart.options.scales.x.ticks.color                    = cc.text;
            wealthChart.options.scales.x.grid.color                     = cc.grid;
            wealthChart.options.scales.y.ticks.color                    = cc.text;
            wealthChart.options.scales.y.grid.color                     = cc.grid;
            wealthChart.options.plugins.legend.labels.color             = cc.text;
            wealthChart.data.labels                                      = labels;
            wealthChart.data.datasets[0].data                           = buyerData;
            wealthChart.data.datasets[1].data                           = renterData;
            wealthChart.update();
            return;
        }

        wealthChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Buying (Net Equity)',
                        data: buyerData,
                        borderColor: '#c8a96b',
                        backgroundColor: 'rgba(200,169,107,0.10)',
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 0,
                        pointHoverRadius: 5
                    },
                    {
                        label: 'Renting (Investment Corpus)',
                        data: renterData,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59,130,246,0.08)',
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 0,
                        pointHoverRadius: 5
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
                            color: chartColors().text,
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
                        ticks: { color: chartColors().text, font: { size: 11 }, maxTicksLimit: 12 },
                        grid:  { color: chartColors().grid }
                    },
                    y: {
                        ticks: {
                            color: chartColors().text,
                            font: { size: 11 },
                            callback: function (v) {
                                if (v >= 10000000)  return activeCurrency.symbol + (v / 10000000).toFixed(1) + 'Cr';
                                if (v >= 100000)    return activeCurrency.symbol + (v / 100000).toFixed(1) + 'L';
                                if (v >= 1000)      return activeCurrency.symbol + (v / 1000).toFixed(0) + 'K';
                                if (v <= -10000000) return '\u2212' + activeCurrency.symbol + (Math.abs(v) / 10000000).toFixed(1) + 'Cr';
                                if (v <= -100000)   return '\u2212' + activeCurrency.symbol + (Math.abs(v) / 100000).toFixed(1) + 'L';
                                return activeCurrency.symbol + v;
                            }
                        },
                        grid: { color: chartColors().grid }
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
            this.value = v;
            slider.value = v;
            setSliderFill(slider);
        });

        setSliderFill(slider);
    }

    // ── Currency selector ─────────────────────────────────────────────

    function renderCurrencySelector() {
        var bar = el('currencyBar');
        if (!bar) return;

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

    // ── Init ──────────────────────────────────────────────────────────

    function init() {
        loadState();
        renderCurrencySelector();

        new MutationObserver(function () {
            if (wealthChart) { wealthChart.destroy(); wealthChart = null; }
            recalc();
        }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        bindSlider('price-slider',        'propertyPrice');
        bindSlider('down-slider',         'downPaymentPct');
        bindSlider('rate-slider',         'loanRate');
        bindSlider('tenure-slider',       'loanTenure');
        bindSlider('rent-slider',         'monthlyRent');
        bindSlider('maintenance-slider',  'maintenance');
        bindSlider('stamp-slider',        'stampDutyPct');
        bindSlider('rent-growth-slider',  'rentGrowth');
        bindSlider('appreciation-slider', 'appreciation');
        bindSlider('invest-return-slider','investReturn');
        bindSlider('horizon-slider',      'timeHorizon');

        if (window.visualViewport) {
            function positionMobileBar() {
                var bar = el('rvbMobileBar');
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
