(function () {
    'use strict';

    var symbol      = '\u20b9';
    var locale      = 'en-IN';
    var STORAGE_KEY = 'nw_af_v1';
    var incomeChart = null;
    var lastTheme   = null;

    function el(id) { return document.getElementById(id); }
    function num(v) { var n = parseFloat(String(v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }

    function fmt(n) {
        if (!isFinite(n) || n < 0) return symbol + '0';
        return symbol + Math.round(n).toLocaleString(locale);
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

    // Maximum loan principal given a fixed EMI, rate, and tenure
    function maxLoanFromEMI(emi, annualRate, months) {
        if (emi <= 0 || months <= 0) return 0;
        if (annualRate <= 0) return emi * months;
        var r   = annualRate / 100 / 12;
        var pow = Math.pow(1 + r, months);
        return emi * (pow - 1) / (r * pow);
    }

    function getComfort(freeCashRatio) {
        if (freeCashRatio >= 0.30) return { label: 'Comfortable', cls: 'comfortable' };
        if (freeCashRatio >= 0.18) return { label: 'Moderate',    cls: 'moderate' };
        if (freeCashRatio >= 0.08) return { label: 'Stretched',   cls: 'stretched' };
        return                            { label: 'Tight',        cls: 'tight' };
    }

    // ── Persistence ───────────────────────────────────────────────────

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                monthlyIncome:   el('monthlyIncome').value,
                monthlyExpenses: el('monthlyExpenses').value,
                existingEMIs:    el('existingEMIs').value,
                downPayment:     el('downPayment').value,
                loanRate:        el('loanRate').value,
                loanTenure:      el('loanTenure').value,
                foirLimit:       el('foirLimit').value
            }));
        } catch (e) {}
    }

    function loadState() {
        try {
            var s = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (!s) return;
            var sliderMap = {
                monthlyIncome:   'income-slider',
                monthlyExpenses: 'expenses-slider',
                existingEMIs:    'existing-slider',
                downPayment:     'down-slider',
                loanRate:        'rate-slider',
                loanTenure:      'tenure-slider',
                foirLimit:       'foir-slider'
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

    // ── Recalc ────────────────────────────────────────────────────────

    function recalc() {
        var income    = num(el('monthlyIncome').value);
        var expenses  = num(el('monthlyExpenses').value);
        var existing  = num(el('existingEMIs').value);
        var downPay   = num(el('downPayment').value);
        var rate      = num(el('loanRate').value);
        var tenure    = num(el('loanTenure').value);
        var foirPct   = num(el('foirLimit').value);

        var months    = tenure * 12;
        var foirAmt   = income * foirPct / 100;
        var maxEMI    = Math.max(0, foirAmt - existing);
        var loanAmt   = maxLoanFromEMI(maxEMI, rate, months);
        var maxProp   = loanAmt + downPay;
        var ltv       = maxProp > 0 ? (loanAmt / maxProp) * 100 : 0;
        var freeCash  = income - expenses - existing - maxEMI;
        var freeCashRatio = income > 0 ? freeCash / income : 0;
        var actualFOIR    = income > 0 ? (existing + maxEMI) / income * 100 : 0;

        // Warn when existing EMIs already exceed FOIR budget
        var foirBreached = existing >= foirAmt && income > 0;
        var warn = el('af-foir-warn');
        if (warn) warn.classList.toggle('visible', foirBreached);

        // ── Display input values ──
        el('display-income').textContent   = fmt(income);
        el('display-expenses').textContent = fmt(expenses);
        el('display-existing').textContent = fmt(existing);
        el('display-down').textContent     = fmt(downPay);
        el('display-rate').textContent     = rate.toFixed(1) + '%';
        el('display-tenure').textContent   = tenure + (tenure === 1 ? ' Year' : ' Years');
        el('display-foir').textContent     = foirPct.toFixed(0) + '%';

        // ── Results card ──────────────────────────────────────────────
        el('af-max-value').textContent    = fmt(maxProp);

        var comfort = getComfort(freeCashRatio);
        var badge   = el('af-comfort-badge');
        badge.textContent = comfort.label;
        badge.className   = 'af-comfort-badge ' + comfort.cls;

        el('r-max-loan').textContent    = fmt(loanAmt);
        el('r-max-emi').textContent     = fmt(maxEMI);
        el('r-down-pay').textContent    = fmt(downPay);
        el('r-ltv').textContent         = ltv.toFixed(1) + '%';
        el('r-foir').textContent        = actualFOIR.toFixed(1) + '% of income';
        el('r-free-cash').textContent   = fmt(Math.max(0, freeCash));

        // ── Budget breakdown bar ──────────────────────────────────────
        // Segments as % of income (cap each at available width)
        var existingPct  = income > 0 ? Math.min(100, (existing / income) * 100) : 0;
        var emiPct       = income > 0 ? Math.min(100 - existingPct, (maxEMI / income) * 100) : 0;
        var expPct       = income > 0 ? Math.min(100 - existingPct - emiPct, (expenses / income) * 100) : 0;
        // Free segment fills the rest via flex:1 — no explicit width needed

        el('af-seg-existing').style.width = existingPct.toFixed(1) + '%';
        el('af-seg-emi').style.width      = emiPct.toFixed(1) + '%';
        el('af-seg-expenses').style.width = expPct.toFixed(1) + '%';

        // Legend percentages
        el('legend-pct-existing').textContent = Math.round(existingPct) + '%';
        el('legend-pct-emi').textContent      = Math.round(emiPct) + '%';
        el('legend-pct-expenses').textContent = Math.round(expPct) + '%';
        var freePct = Math.max(0, 100 - existingPct - emiPct - expPct);
        el('legend-pct-free').textContent     = Math.round(freePct) + '%';

        // ── Mobile bar ──────────────────────────────────────────────
        var mbProp = el('mb-max-prop');
        var mbEMI  = el('mb-max-emi');
        if (mbProp) mbProp.textContent = fmt(maxProp);
        if (mbEMI)  mbEMI.textContent  = fmt(maxEMI);

        renderChart(existing, maxEMI, expenses, Math.max(0, freeCash), income);

        saveState();
    }

    // ── Chart ─────────────────────────────────────────────────────────

    function renderChart(existing, newEMI, expenses, freeCash, income) {
        var ctx = el('chartIncome');
        if (!ctx) return;

        var total   = income > 0 ? income : 1;
        var data    = [
            Math.round((existing  / total) * 100),
            Math.round((newEMI    / total) * 100),
            Math.round((expenses  / total) * 100),
            Math.round((freeCash  / total) * 100)
        ];

        var theme = isDark() ? 'dark' : 'light';
        if (incomeChart && theme !== lastTheme) {
            incomeChart.destroy();
            incomeChart = null;
        }
        lastTheme = theme;

        var cc = chartColors();
        var bgColors  = ['#f97316', '#60a5fa', isDark() ? 'rgba(255,255,255,0.22)' : 'rgba(100,116,139,0.25)', '#c8a96b'];
        var labels    = ['Existing EMIs', 'Home Loan EMI', 'Monthly Expenses', 'Free Cash'];

        if (incomeChart) {
            incomeChart.data.datasets[0].data            = data;
            incomeChart.data.datasets[0].backgroundColor = bgColors;
            incomeChart.options.plugins.legend.labels.color = cc.text;
            incomeChart.update();
            return;
        }

        incomeChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: bgColors,
                    borderWidth: 2,
                    borderColor: isDark() ? '#1e293b' : '#f8fafc',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '62%',
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: cc.text,
                            font: { size: 12, weight: '600' },
                            usePointStyle: true,
                            pointStyleWidth: 10,
                            boxHeight: 8,
                            padding: 16
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                return ' ' + ctx.label + ': ' + ctx.parsed + '% of income';
                            }
                        }
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
            this.value   = v;
            slider.value = v;
            setSliderFill(slider);
        });

        setSliderFill(slider);
    }

    // ── Init ──────────────────────────────────────────────────────────

    function init() {
        loadState();

        new MutationObserver(function () {
            if (incomeChart) { incomeChart.destroy(); incomeChart = null; }
            recalc();
        }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        bindSlider('income-slider',   'monthlyIncome');
        bindSlider('expenses-slider', 'monthlyExpenses');
        bindSlider('existing-slider', 'existingEMIs');
        bindSlider('down-slider',     'downPayment');
        bindSlider('rate-slider',     'loanRate');
        bindSlider('tenure-slider',   'loanTenure');
        bindSlider('foir-slider',     'foirLimit');

        if (window.visualViewport) {
            function positionMobileBar() {
                var bar = el('afMobileBar');
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
