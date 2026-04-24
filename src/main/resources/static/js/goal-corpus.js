(function () {
    'use strict';

    var CURRENCIES = [
        { code: 'INR', symbol: '\u20b9', name: 'Indian Rupee', locale: 'en-IN' },
        { code: 'USD', symbol: '$',      name: 'US Dollar',    locale: 'en-US' },
        { code: 'EUR', symbol: '\u20ac', name: 'Euro',         locale: 'de-DE' }
    ];
    var activeCurrency = CURRENCIES[0];
    var STORAGE_KEY = 'nw_gc_v1';
    var growthChart = null;

    function el(id) { return document.getElementById(id); }
    function num(v) { var n = parseFloat(String(v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }

    function fmt(n) {
        if (!isFinite(n) || n < 0) return activeCurrency.symbol + '0';
        return activeCurrency.symbol + Math.round(n).toLocaleString(activeCurrency.locale);
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                goalAmount:     el('goalAmount').value,
                timeHorizon:    el('timeHorizon').value,
                returnRate:     el('returnRate').value,
                inflationRate:  el('inflationRate').value,
                existingCorpus: el('existingCorpus').value,
                currencyCode:   activeCurrency.code
            }));
        } catch (e) {}
    }

    function loadState() {
        try {
            var s = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (!s) return;

            var cur = CURRENCIES.filter(function (c) { return c.code === s.currencyCode; })[0];
            if (cur) activeCurrency = cur;

            var fields = ['goalAmount', 'timeHorizon', 'returnRate', 'inflationRate', 'existingCorpus'];
            var sliderMap = {
                goalAmount:     'goal-slider',
                timeHorizon:    'horizon-slider',
                returnRate:     'return-slider',
                inflationRate:  'inflation-slider',
                existingCorpus: 'existing-slider'
            };
            fields.forEach(function (f) {
                if (s[f] === undefined) return;
                var inp = el(f);
                var sld = el(sliderMap[f]);
                if (inp) inp.value = s[f];
                if (sld) sld.value = Math.min(Math.max(parseFloat(s[f]) || 0, parseFloat(sld.min)), parseFloat(sld.max));
            });
        } catch (e) {}
    }

    // Annuity-due SIP: amount needed each month to reach futureNeed in n months at monthly rate r
    function calcRequiredSIP(futureNeed, r, n) {
        if (futureNeed <= 0 || n <= 0) return 0;
        if (r <= 0) return futureNeed / n;
        return futureNeed * r / ((Math.pow(1 + r, n) - 1) * (1 + r));
    }

    // FV of lump sum
    function fvLump(pv, r, n) {
        return pv * Math.pow(1 + r, n);
    }

    function setSliderFill(slider) {
        var min = parseFloat(slider.min);
        var max = parseFloat(slider.max);
        var pct = ((parseFloat(slider.value) - min) / (max - min)) * 100;
        slider.style.background =
            'linear-gradient(to right, var(--color-primary) ' + pct + '%, var(--color-bg-light) ' + pct + '%)';
    }

    function recalc() {
        var goalAmt    = num(el('goalAmount').value);
        var years      = num(el('timeHorizon').value);
        var retRate    = num(el('returnRate').value);
        var infRate    = num(el('inflationRate').value);
        var existing   = num(el('existingCorpus').value);

        var n          = years * 12;                         // total months
        var rMonthly   = retRate / 100 / 12;                 // monthly return rate
        var iAnnual    = infRate / 100;

        // Inflation-adjusted future goal
        var futureGoal = goalAmt * Math.pow(1 + iAnnual, years);

        // FV of existing savings at expected return
        var existingFV = fvLump(existing, rMonthly, n);

        // Remaining gap to fill via SIP
        var gap        = Math.max(0, futureGoal - existingFV);

        // Monthly SIP required
        var monthlySIP = calcRequiredSIP(gap, rMonthly, n);

        // Lump sum today that would grow to fill the gap (no further contributions)
        var lumpSum    = gap > 0 ? gap / Math.pow(1 + rMonthly, n) : 0;

        // Funded percentage
        var fundedPct  = futureGoal > 0 ? Math.min(100, (existingFV / futureGoal) * 100) : 0;
        var onTrack    = gap <= 0;

        // Update displays
        el('display-goal').textContent     = fmt(goalAmt);
        el('display-horizon').textContent  = years + (years === 1 ? ' Year' : ' Years');
        el('display-return').textContent   = num(el('returnRate').value).toFixed(1) + '%';
        el('display-inflation').textContent = num(el('inflationRate').value).toFixed(1) + '%';
        el('display-existing').textContent = fmt(existing);

        // Results card
        if (onTrack) {
            el('gc-monthly-sip').textContent = activeCurrency.symbol + '0';
            var badge = el('gc-on-track-badge');
            if (badge) badge.style.display = 'inline-block';
        } else {
            el('gc-monthly-sip').textContent = fmt(monthlySIP);
            var badge2 = el('gc-on-track-badge');
            if (badge2) badge2.style.display = 'none';
        }

        el('gc-progress-fill').style.width = fundedPct.toFixed(1) + '%';
        el('gc-progress-pct').textContent  = Math.round(fundedPct) + '% funded';

        el('r-goalToday').textContent    = fmt(goalAmt);
        el('r-futureGoal').textContent   = fmt(futureGoal);
        el('r-existingFV').textContent   = fmt(existingFV);
        el('r-gap').textContent          = gap > 0 ? fmt(gap) : activeCurrency.symbol + '0';
        el('r-lumpSum').textContent      = gap > 0 ? fmt(lumpSum) : activeCurrency.symbol + '0';

        var mbSIP = el('mb-sip');
        if (mbSIP) mbSIP.textContent = onTrack ? activeCurrency.symbol + '0' : fmt(monthlySIP);

        renderChart(years, goalAmt, existing, rMonthly, iAnnual, futureGoal, monthlySIP);

        saveState();
    }

    function renderChart(years, goalAmt, existing, rMonthly, iAnnual, futureGoal, monthlySIP) {
        var labels = [];
        var corpusData = [];
        var goalData = [];

        for (var y = 0; y <= years; y++) {
            labels.push('Year ' + y);

            // Goal line (inflation-adjusted at each year)
            var g = goalAmt * Math.pow(1 + iAnnual, y);
            goalData.push(Math.round(g));

            // Corpus: existing FV + SIP FV up to year y
            var n = y * 12;
            var exFV = fvLump(existing, rMonthly, n);
            var sipFV = 0;
            if (monthlySIP > 0 && n > 0) {
                sipFV = monthlySIP * ((Math.pow(1 + rMonthly, n) - 1) / rMonthly) * (1 + rMonthly);
            }
            corpusData.push(Math.round(exFV + sipFV));
        }

        var ctx = el('chartGrowth');
        if (!ctx) return;

        if (growthChart) {
            growthChart.data.labels = labels;
            growthChart.data.datasets[0].data = corpusData;
            growthChart.data.datasets[1].data = goalData;
            growthChart.update();
            return;
        }

        growthChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Your Corpus',
                        data: corpusData,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59,130,246,0.10)',
                        borderWidth: 2.5,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        fill: true,
                        tension: 0.35
                    },
                    {
                        label: 'Inflation-Adjusted Goal',
                        data: goalData,
                        borderColor: '#f59e0b',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [6, 4],
                        pointRadius: 2,
                        pointHoverRadius: 5,
                        fill: false,
                        tension: 0.35
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
                            color: 'var(--color-text-muted)',
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
                        ticks: { color: 'var(--color-text-muted)', font: { size: 11 }, maxTicksLimit: 8 },
                        grid: { color: 'rgba(128,128,128,0.12)' }
                    },
                    y: {
                        ticks: {
                            color: 'var(--color-text-muted)',
                            font: { size: 11 },
                            callback: function (v) {
                                if (v >= 10000000) return activeCurrency.symbol + (v / 10000000).toFixed(1) + 'Cr';
                                if (v >= 100000)   return activeCurrency.symbol + (v / 100000).toFixed(1) + 'L';
                                if (v >= 1000)     return activeCurrency.symbol + (v / 1000).toFixed(0) + 'K';
                                return activeCurrency.symbol + v;
                            }
                        },
                        grid: { color: 'rgba(128,128,128,0.12)' }
                    }
                }
            }
        });
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

        // Sync active pill to restored currency
        document.querySelectorAll('.currency-pill').forEach(function (p) {
            p.classList.toggle('active', p.textContent.startsWith(activeCurrency.code));
        });
    }

    function init() {
        loadState();
        renderCurrencySelector();
        bindSlider('goal-slider',     'goalAmount');
        bindSlider('horizon-slider',  'timeHorizon');
        bindSlider('return-slider',   'returnRate');
        bindSlider('inflation-slider','inflationRate');
        bindSlider('existing-slider', 'existingCorpus');

        if (window.visualViewport) {
            function positionMobileBar() {
                var bar = el('gcMobileBar');
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
