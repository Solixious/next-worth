(function () {
    'use strict';

    var CURRENCIES = [
        { code: 'INR', symbol: '\u20b9', name: 'Indian Rupee', locale: 'en-IN' },
        { code: 'USD', symbol: '$',      name: 'US Dollar',    locale: 'en-US' },
        { code: 'EUR', symbol: '\u20ac', name: 'Euro',         locale: 'de-DE' }
    ];
    var activeCurrency = CURRENCIES[0];
    var tenureMode     = 'years';
    var compFreq       = 4; // quarterly by default

    function el(id) { return document.getElementById(id); }
    function num(v) { var n = parseFloat(String(v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }

    function fmt(n) {
        if (!isFinite(n) || n < 0) return activeCurrency.symbol + '0';
        return activeCurrency.symbol + Math.round(n).toLocaleString(activeCurrency.locale);
    }

    // Compound interest FD formula: A = P × (1 + r/n)^(n×t)
    function calcFD(principal, annualRate, months, freq) {
        if (principal <= 0 || months <= 0) return principal;
        if (annualRate <= 0) return principal;
        var r = annualRate / 100;
        var t = months / 12;
        var n = freq;
        return principal * Math.pow(1 + r / n, n * t);
    }

    function setSliderFill(slider) {
        var min = parseFloat(slider.min);
        var max = parseFloat(slider.max);
        var pct = ((parseFloat(slider.value) - min) / (max - min)) * 100;
        slider.style.background =
            'linear-gradient(to right, var(--color-primary) ' + pct + '%, var(--color-bg-light) ' + pct + '%)';
    }

    function recalc() {
        var principal  = num(el('principal').value);
        var annualRate = num(el('interestRate').value);
        var tenureVal  = num(el('tenure').value);
        var months     = tenureMode === 'years' ? tenureVal * 12 : tenureVal;

        var maturity      = calcFD(principal, annualRate, months, compFreq);
        var interest      = Math.max(0, maturity - principal);
        var principalPct  = maturity > 0 ? (principal / maturity) * 100 : 50;

        el('display-principal').textContent = fmt(principal);
        el('display-rate').textContent      = num(el('interestRate').value).toFixed(1) + '%';
        el('display-tenure').textContent    = tenureMode === 'years'
            ? tenureVal + (tenureVal === 1 ? ' Year'  : ' Years')
            : tenureVal + (tenureVal === 1 ? ' Month' : ' Months');

        el('r-maturity').textContent  = fmt(maturity);
        el('r-principal').textContent = fmt(principal);
        el('r-interest').textContent  = fmt(interest);
        el('r-total').textContent     = fmt(maturity);

        el('bar-principal').style.width         = principalPct.toFixed(1) + '%';
        el('legend-principal-pct').textContent  = Math.round(principalPct) + '%';
        el('legend-interest-pct').textContent   = Math.round(100 - principalPct) + '%';

        var mb = el('mb-maturity');
        if (mb) mb.textContent = fmt(maturity);
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
            var years  = Math.min(10, Math.max(1, Math.round(num(input.value) / 12)));
            tenureMode = 'years';
            slider.min = 1; slider.max = 10; slider.step = 1;
            input.min  = 1; input.max  = 10;
            slider.value = years; input.value = years;
            setSliderFill(slider);
            updateTenureTicks();
            yrsBtn.classList.add('active');
            moBtn.classList.remove('active');
            recalc();
        });

        moBtn.addEventListener('click', function () {
            if (tenureMode === 'months') return;
            var months = Math.min(120, Math.max(1, num(input.value) * 12));
            tenureMode = 'months';
            slider.min = 1; slider.max = 120; slider.step = 1;
            input.min  = 1; input.max  = 120;
            slider.value = months; input.value = months;
            setSliderFill(slider);
            updateTenureTicks();
            moBtn.classList.add('active');
            yrsBtn.classList.remove('active');
            recalc();
        });

        slider.addEventListener('input', function () {
            input.value = this.value;
            setSliderFill(this);
            recalc();
        });
        input.addEventListener('input', function () {
            var max = tenureMode === 'years' ? 10 : 120;
            slider.value = Math.min(Math.max(num(this.value), 1), max);
            setSliderFill(slider);
            recalc();
        });
        input.addEventListener('blur', function () {
            var max = tenureMode === 'years' ? 10 : 120;
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
            ? '<span>1 yr</span><span>3 yrs</span><span>5 yrs</span><span>8 yrs</span><span>10 yrs</span>'
            : '<span>1 mo</span><span>30 mo</span><span>60 mo</span><span>90 mo</span><span>120 mo</span>';
    }

    function setupFrequencySelector() {
        document.querySelectorAll('.freq-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.freq-btn').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                compFreq = parseInt(btn.getAttribute('data-freq'), 10);
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
    }

    function init() {
        renderCurrencySelector();
        bindSliderInput('principal-slider', 'principal');
        bindSliderInput('rate-slider', 'interestRate');
        setupTenureToggle();
        setupFrequencySelector();

        // visualViewport fix: keeps the mobile bar anchored to the visible bottom
        // even as the browser toolbar slides in/out on mobile.
        if (window.visualViewport) {
            function positionMobileBar() {
                var bar = el('fdMobileBar');
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
