(function () {
    'use strict';

    var CURRENCIES = [
        { code: 'INR', symbol: '\u20b9', name: 'Indian Rupee', locale: 'en-IN' },
        { code: 'USD', symbol: '$',      name: 'US Dollar',    locale: 'en-US' },
        { code: 'EUR', symbol: '\u20ac', name: 'Euro',         locale: 'de-DE' }
    ];
    var activeCurrency = CURRENCIES[0];
    var tenureMode = 'years';

    function el(id) { return document.getElementById(id); }
    function num(v) { var n = parseFloat(String(v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }

    function fmt(n) {
        if (!isFinite(n) || n < 0) return activeCurrency.symbol + '0';
        return activeCurrency.symbol + Math.round(n).toLocaleString(activeCurrency.locale);
    }

    function calcEMI(principal, annualRate, months) {
        if (principal <= 0 || months <= 0) return 0;
        if (annualRate <= 0) return principal / months;
        var r = annualRate / 100 / 12;
        var n = months;
        return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    }

    function setSliderFill(slider) {
        var min = parseFloat(slider.min);
        var max = parseFloat(slider.max);
        var pct = ((parseFloat(slider.value) - min) / (max - min)) * 100;
        slider.style.background =
            'linear-gradient(to right, var(--color-primary) ' + pct + '%, var(--color-bg-light) ' + pct + '%)';
    }

    function recalc() {
        var principal  = num(el('loanAmount').value);
        var annualRate = num(el('interestRate').value);
        var tenureVal  = num(el('tenure').value);
        var months     = tenureMode === 'years' ? tenureVal * 12 : tenureVal;

        var emi           = calcEMI(principal, annualRate, months);
        var totalPayment  = emi * months;
        var totalInterest = Math.max(0, totalPayment - principal);
        var principalPct  = totalPayment > 0 ? (principal / totalPayment) * 100 : 50;

        el('display-loan').textContent   = fmt(principal);
        el('display-rate').textContent   = num(el('interestRate').value).toFixed(1) + '%';
        el('display-tenure').textContent = tenureMode === 'years'
            ? tenureVal + (tenureVal === 1 ? ' Year'  : ' Years')
            : tenureVal + (tenureVal === 1 ? ' Month' : ' Months');

        el('r-emi').textContent       = fmt(emi);
        el('r-principal').textContent = fmt(principal);
        el('r-interest').textContent  = fmt(totalInterest);
        el('r-total').textContent     = fmt(totalPayment);

        el('bar-principal').style.width          = principalPct.toFixed(1) + '%';
        el('legend-principal-pct').textContent   = Math.round(principalPct) + '%';
        el('legend-interest-pct').textContent    = Math.round(100 - principalPct) + '%';

        var mb = el('mb-emi');
        if (mb) mb.textContent = fmt(emi);
    }

    function clampToSlider(v, slider) {
        return Math.min(Math.max(v, parseFloat(slider.min)), parseFloat(slider.max));
    }

    function bindSliderInput(sliderId, inputId) {
        var slider = el(sliderId);
        var input  = el(inputId);

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

    function setupTenureToggle() {
        var yrsBtn = el('tenure-years-btn');
        var moBtn  = el('tenure-months-btn');
        var slider = el('tenure-slider');
        var input  = el('tenure');

        yrsBtn.addEventListener('click', function () {
            if (tenureMode === 'years') return;
            var years  = Math.min(30, Math.max(1, Math.round(num(input.value) / 12)));
            tenureMode = 'years';
            slider.min = 1; slider.max = 30; slider.step = 1;
            input.min  = 1; input.max  = 30;
            slider.value = years; input.value = years;
            setSliderFill(slider);
            updateTenureTicks();
            yrsBtn.classList.add('active');
            moBtn.classList.remove('active');
            recalc();
        });

        moBtn.addEventListener('click', function () {
            if (tenureMode === 'months') return;
            var months = Math.min(360, Math.max(1, num(input.value) * 12));
            tenureMode = 'months';
            slider.min = 1; slider.max = 360; slider.step = 1;
            input.min  = 1; input.max  = 360;
            slider.value = months; input.value = months;
            setSliderFill(slider);
            updateTenureTicks();
            moBtn.classList.add('active');
            yrsBtn.classList.remove('active');
            recalc();
        });

        // Bind tenure slider/input manually (mode-aware clamping)
        slider.addEventListener('input', function () {
            input.value = this.value;
            setSliderFill(this);
            recalc();
        });
        input.addEventListener('input', function () {
            var max = tenureMode === 'years' ? 30 : 360;
            slider.value = Math.min(Math.max(num(this.value), 1), max);
            setSliderFill(slider);
            recalc();
        });
        input.addEventListener('blur', function () {
            var max = tenureMode === 'years' ? 30 : 360;
            var v   = Math.min(Math.max(num(this.value), 1), max);
            this.value = v;
            slider.value = v;
            setSliderFill(slider);
        });

        setSliderFill(slider);
    }

    function updateTenureTicks() {
        var ticks = el('tenure-ticks');
        ticks.innerHTML = tenureMode === 'years'
            ? '<span>1 yr</span><span>8 yrs</span><span>15 yrs</span><span>22 yrs</span><span>30 yrs</span>'
            : '<span>1 mo</span><span>90 mo</span><span>180 mo</span><span>270 mo</span><span>360 mo</span>';
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
    }

    function init() {
        renderCurrencySelector();
        bindSliderInput('loan-slider', 'loanAmount');
        bindSliderInput('rate-slider', 'interestRate');
        setupTenureToggle();

        // visualViewport fix: position: fixed; bottom: 0 is anchored to the layout
        // viewport, not the visual viewport, so the bar doesn't follow when the
        // browser toolbar hides on mobile. Compensate using the gap between them.
        if (window.visualViewport) {
            function positionMobileBar() {
                var bar = el('emiMobileBar');
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
