(function () {
    'use strict';

    var CURRENCIES = [
        { code: 'INR', symbol: '\u20b9', name: 'Indian Rupee', locale: 'en-IN' },
        { code: 'USD', symbol: '$',      name: 'US Dollar',    locale: 'en-US' },
        { code: 'EUR', symbol: '\u20ac', name: 'Euro',         locale: 'de-DE' }
    ];
    var activeCurrency = CURRENCIES[0];
    var coverageMonths = 6;
    var STORAGE_KEY = 'nw_ef_v1';
    var progressChart = null;

    function el(id) { return document.getElementById(id); }
    function num(v) { var n = parseFloat(String(v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }

    function fmt(n) {
        if (!isFinite(n) || n < 0) return activeCurrency.symbol + '0';
        return activeCurrency.symbol + Math.round(n).toLocaleString(activeCurrency.locale);
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                monthlyExpenses: el('monthlyExpenses').value,
                existingFund:    el('existingFund').value,
                monthlySavings:  el('monthlySavings').value,
                coverageMonths:  coverageMonths,
                currencyCode:    activeCurrency.code
            }));
        } catch (e) {}
    }

    function loadState() {
        try {
            var s = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (!s) return;

            var cur = CURRENCIES.filter(function (c) { return c.code === s.currencyCode; })[0];
            if (cur) activeCurrency = cur;

            if (s.coverageMonths) {
                coverageMonths = parseInt(s.coverageMonths, 10);
                document.querySelectorAll('.ef-coverage-btn').forEach(function (btn) {
                    btn.classList.toggle('active', parseInt(btn.dataset.months, 10) === coverageMonths);
                });
            }

            var sliderMap = {
                monthlyExpenses: 'expenses-slider',
                existingFund:    'existing-slider',
                monthlySavings:  'savings-slider'
            };
            Object.keys(sliderMap).forEach(function (f) {
                if (s[f] === undefined) return;
                var inp = el(f);
                var sld = el(sliderMap[f]);
                if (inp) inp.value = s[f];
                if (sld) sld.value = Math.min(Math.max(parseFloat(s[f]) || 0, parseFloat(sld.min)), parseFloat(sld.max));
            });
        } catch (e) {}
    }

    function setSliderFill(slider) {
        var min = parseFloat(slider.min);
        var max = parseFloat(slider.max);
        var pct = ((parseFloat(slider.value) - min) / (max - min)) * 100;
        slider.style.background =
            'linear-gradient(to right, var(--color-primary) ' + pct + '%, var(--color-bg-light) ' + pct + '%)';
    }

    function getInterpretation(fundedPct, gap, monthlySavings) {
        if (fundedPct >= 100) {
            return 'Your emergency fund is fully funded. Consider investing any extra savings in a liquid fund or short-term FD to earn returns while keeping the money accessible.';
        }
        if (fundedPct >= 75) {
            return 'You\'re almost there. A small consistent monthly contribution will complete your safety net soon.';
        }
        if (fundedPct >= 40) {
            if (monthlySavings > 0) {
                return 'Good progress. Keep your emergency fund in a high-yield savings account or liquid mutual fund so it earns returns while staying accessible.';
            }
            return 'Good progress — set a monthly savings target above to see how quickly you can close the gap.';
        }
        if (fundedPct > 0) {
            return 'You\'ve started, but you\'re still exposed to financial shocks. Prioritise building your emergency fund before locking money in long-term investments.';
        }
        return 'You have no emergency fund yet. A single unexpected event — job loss, medical emergency, urgent repair — could force you into high-interest debt. Start small and build consistently.';
    }

    function recalc() {
        var monthlyExp   = num(el('monthlyExpenses').value);
        var existing     = num(el('existingFund').value);
        var monthlySave  = num(el('monthlySavings').value);

        var target       = monthlyExp * coverageMonths;
        var gap          = Math.max(0, target - existing);
        var fundedPct    = target > 0 ? Math.min(100, (existing / target) * 100) : 0;
        var monthsToGoal = (gap > 0 && monthlySave > 0) ? Math.ceil(gap / monthlySave) : 0;
        var fullyFunded  = gap <= 0 && target > 0;

        // Display updates
        el('display-expenses').textContent  = fmt(monthlyExp);
        el('display-existing').textContent  = fmt(existing);
        el('display-savings').textContent   = fmt(monthlySave);

        // Results card
        el('ef-target-value').textContent   = fmt(target);

        var badge = el('ef-funded-badge');
        badge.style.display = fullyFunded ? 'inline-block' : 'none';

        el('ef-progress-fill').style.width  = fundedPct.toFixed(1) + '%';
        el('ef-progress-pct').textContent   = Math.round(fundedPct) + '% funded';

        el('r-monthlyExp').textContent      = fmt(monthlyExp);
        el('r-coverage').textContent        = coverageMonths + ' months';
        el('r-target').textContent          = fmt(target);
        el('r-existing').textContent        = fmt(existing);
        el('r-gap').textContent             = gap > 0 ? fmt(gap) : activeCurrency.symbol + '0';

        if (fullyFunded) {
            el('r-timeline').textContent    = 'Already funded!';
        } else if (gap > 0 && monthlySave <= 0) {
            el('r-timeline').textContent    = 'Set a monthly savings amount';
        } else if (monthsToGoal > 0) {
            var yrs  = Math.floor(monthsToGoal / 12);
            var mos  = monthsToGoal % 12;
            var parts = [];
            if (yrs > 0)  parts.push(yrs + (yrs === 1 ? ' yr' : ' yrs'));
            if (mos > 0)  parts.push(mos + (mos === 1 ? ' mo' : ' mos'));
            el('r-timeline').textContent    = parts.join(' ') + ' (' + monthsToGoal + ' months)';
        } else {
            el('r-timeline').textContent    = '—';
        }

        el('ef-interpretation').textContent = getInterpretation(fundedPct, gap, monthlySave);

        // Mobile bar
        var mbTarget = el('mb-target');
        var mbPct    = el('mb-pct');
        if (mbTarget) mbTarget.textContent = fmt(target);
        if (mbPct)    mbPct.textContent    = Math.round(fundedPct) + '% funded';

        renderChart(existing, monthlySave, target, monthsToGoal);

        saveState();
    }

    function renderChart(existing, monthlySave, target, monthsToGoal) {
        var ctx = el('chartProgress');
        if (!ctx) return;

        // Build data: monthly accumulated savings up to goal (or up to 36 months if no savings)
        var maxMonths = monthsToGoal > 0 ? Math.min(monthsToGoal, 60) : 36;
        var labels = [];
        var fundData = [];
        var targetData = [];

        for (var m = 0; m <= maxMonths; m++) {
            labels.push(m === 0 ? 'Now' : 'Mo ' + m);
            var accumulated = existing + (monthlySave * m);
            fundData.push(Math.round(Math.min(accumulated, target > 0 ? accumulated : accumulated)));
            targetData.push(Math.round(target));
        }

        if (progressChart) {
            progressChart.data.labels                  = labels;
            progressChart.data.datasets[0].data        = fundData;
            progressChart.data.datasets[1].data        = targetData;
            progressChart.update();
            return;
        }

        progressChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Your Fund',
                        data: fundData,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59,130,246,0.10)',
                        borderWidth: 2.5,
                        pointRadius: function (ctx) { return ctx.dataIndex === 0 || ctx.dataIndex === fundData.length - 1 ? 5 : 2; },
                        pointHoverRadius: 6,
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Target Fund',
                        data: targetData,
                        borderColor: '#c8a96b',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [6, 4],
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        fill: false,
                        tension: 0
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
                        ticks: {
                            color: 'var(--color-text-muted)',
                            font: { size: 11 },
                            maxTicksLimit: 10
                        },
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

    function bindCoverageButtons() {
        document.querySelectorAll('.ef-coverage-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                coverageMonths = parseInt(btn.dataset.months, 10);
                document.querySelectorAll('.ef-coverage-btn').forEach(function (b) { b.classList.remove('active'); });
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

        // Sync active pill with restored currency
        document.querySelectorAll('.currency-pill').forEach(function (p) {
            p.classList.toggle('active', p.textContent.startsWith(activeCurrency.code));
        });
    }

    function init() {
        loadState();
        renderCurrencySelector();
        bindSlider('expenses-slider', 'monthlyExpenses');
        bindSlider('existing-slider', 'existingFund');
        bindSlider('savings-slider',  'monthlySavings');
        bindCoverageButtons();

        if (window.visualViewport) {
            function positionMobileBar() {
                var bar = el('efMobileBar');
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
