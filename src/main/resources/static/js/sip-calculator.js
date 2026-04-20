(function () {
    'use strict';

    var CURRENCIES = [
        { code: 'INR', symbol: '\u20b9', name: 'Indian Rupee', locale: 'en-IN' },
        { code: 'USD', symbol: '$',      name: 'US Dollar',    locale: 'en-US' },
        { code: 'EUR', symbol: '\u20ac', name: 'Euro',         locale: 'de-DE' }
    ];
    var activeCurrency = CURRENCIES[0];
    var durationMode = 'years';

    function el(id) { return document.getElementById(id); }
    function num(v) { var n = parseFloat(String(v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }

    function fmt(n) {
        if (!isFinite(n) || n < 0) return activeCurrency.symbol + '0';
        return activeCurrency.symbol + Math.round(n).toLocaleString(activeCurrency.locale);
    }

    // SIP future value — annuity-due (investment at start of each period)
    function calcSIP(monthly, annualRate, months) {
        if (monthly <= 0 || months <= 0) return 0;
        if (annualRate <= 0) return monthly * months;
        var r = annualRate / 100 / 12;
        return monthly * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
    }

    function setSliderFill(slider) {
        var min = parseFloat(slider.min);
        var max = parseFloat(slider.max);
        var pct = ((parseFloat(slider.value) - min) / (max - min)) * 100;
        slider.style.background =
            'linear-gradient(to right, var(--color-primary) ' + pct + '%, var(--color-bg-light) ' + pct + '%)';
    }

    function recalc() {
        var monthly      = num(el('monthlyAmount').value);
        var annualRate   = num(el('returnRate').value);
        var durationVal  = num(el('duration').value);
        var months       = durationMode === 'years' ? durationVal * 12 : durationVal;

        var maturity     = calcSIP(monthly, annualRate, months);
        var invested     = monthly * months;
        var returns      = Math.max(0, maturity - invested);
        var investedPct  = maturity > 0 ? (invested / maturity) * 100 : 50;

        el('display-amount').textContent   = fmt(monthly);
        el('display-rate').textContent     = num(el('returnRate').value).toFixed(1) + '%';
        el('display-duration').textContent = durationMode === 'years'
            ? durationVal + (durationVal === 1 ? ' Year'  : ' Years')
            : durationVal + (durationVal === 1 ? ' Month' : ' Months');

        el('r-maturity').textContent = fmt(maturity);
        el('r-invested').textContent = fmt(invested);
        el('r-returns').textContent  = fmt(returns);
        el('r-total').textContent    = fmt(maturity);

        el('bar-invested').style.width           = investedPct.toFixed(1) + '%';
        el('legend-invested-pct').textContent    = Math.round(investedPct) + '%';
        el('legend-returns-pct').textContent     = Math.round(100 - investedPct) + '%';

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

    function setupDurationToggle() {
        var yrsBtn = el('duration-years-btn');
        var moBtn  = el('duration-months-btn');
        var slider = el('duration-slider');
        var input  = el('duration');

        yrsBtn.addEventListener('click', function () {
            if (durationMode === 'years') return;
            var years  = Math.min(40, Math.max(1, Math.round(num(input.value) / 12)));
            durationMode = 'years';
            slider.min = 1; slider.max = 40; slider.step = 1;
            input.min  = 1; input.max  = 40;
            slider.value = years; input.value = years;
            setSliderFill(slider);
            updateDurationTicks();
            yrsBtn.classList.add('active');
            moBtn.classList.remove('active');
            recalc();
        });

        moBtn.addEventListener('click', function () {
            if (durationMode === 'months') return;
            var months = Math.min(480, Math.max(1, num(input.value) * 12));
            durationMode = 'months';
            slider.min = 1; slider.max = 480; slider.step = 1;
            input.min  = 1; input.max  = 480;
            slider.value = months; input.value = months;
            setSliderFill(slider);
            updateDurationTicks();
            moBtn.classList.add('active');
            yrsBtn.classList.remove('active');
            recalc();
        });

        // Bind duration slider/input with mode-aware clamping
        slider.addEventListener('input', function () {
            input.value = this.value;
            setSliderFill(this);
            recalc();
        });
        input.addEventListener('input', function () {
            var max = durationMode === 'years' ? 40 : 480;
            slider.value = Math.min(Math.max(num(this.value), 1), max);
            setSliderFill(slider);
            recalc();
        });
        input.addEventListener('blur', function () {
            var max = durationMode === 'years' ? 40 : 480;
            var v   = Math.min(Math.max(num(this.value), 1), max);
            this.value = v;
            slider.value = v;
            setSliderFill(slider);
        });

        setSliderFill(slider);
    }

    function updateDurationTicks() {
        var ticks = el('duration-ticks');
        ticks.innerHTML = durationMode === 'years'
            ? '<span>1 yr</span><span>10 yrs</span><span>20 yrs</span><span>30 yrs</span><span>40 yrs</span>'
            : '<span>1 mo</span><span>120 mo</span><span>240 mo</span><span>360 mo</span><span>480 mo</span>';
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
        bindSliderInput('amount-slider', 'monthlyAmount');
        bindSliderInput('rate-slider', 'returnRate');
        setupDurationToggle();

        // visualViewport fix: keeps the mobile bar anchored to the visible bottom
        // even as the browser toolbar slides in/out on mobile.
        if (window.visualViewport) {
            function positionMobileBar() {
                var bar = el('sipMobileBar');
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
