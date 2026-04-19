(function () {
    'use strict';

    // ─── Default data ────────────────────────────────────────────────
    var DEF_ASSETS = [
        { name: 'Cash & Savings',     amount: '', growth: '' },
        { name: 'Fixed Deposits',     amount: '', growth: '6.5' },
        { name: 'Equity Investments', amount: '', growth: '11' },
        { name: 'Gold',               amount: '', growth: '8' },
        { name: 'Property',           amount: '', growth: '6' },
        { name: 'Other Assets',       amount: '', growth: '' }
    ];
    var DEF_LIABILITIES = [
        { name: 'Home Loan',         amount: '', rate: '' },
        { name: 'Car Loan',          amount: '', rate: '' },
        { name: 'Personal Loan',     amount: '', rate: '' },
        { name: 'Credit Card Due',   amount: '', rate: '' },
        { name: 'Other Liabilities', amount: '', rate: '' }
    ];
    var DEF_INCOME = [
        { name: 'Salary',          monthly: '', hike: '8' },
        { name: 'Rental Income',   monthly: '', hike: '5' },
        { name: 'Business Income', monthly: '', hike: '' },
        { name: 'Dividends',       monthly: '', hike: '' }
    ];
    var DEF_EXPENSES = [
        { name: 'Household Expenses', monthly: '', infl: '6' },
        { name: 'Rent / Housing',     monthly: '', infl: '5' },
        { name: 'Loan EMIs',          monthly: '', infl: '0' },
        { name: 'Insurance',          monthly: '', infl: '5' },
        { name: 'Other Expenses',     monthly: '', infl: '6' }
    ];

    // ─── Currencies ──────────────────────────────────────────────────
    // To add a new currency: append an entry to CURRENCIES. No other changes needed.
    var CURRENCIES = [
        { code: 'INR', symbol: '\u20b9', name: 'Indian Rupee', locale: 'en-IN' },
        { code: 'USD', symbol: '$',      name: 'US Dollar',    locale: 'en-US' },
        { code: 'EUR', symbol: '\u20ac', name: 'Euro',         locale: 'de-DE' }
    ];
    var activeCurrency = CURRENCIES[0];

    // ─── Utilities ───────────────────────────────────────────────────
    function num(v)  { var n = parseFloat(String(v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }
    function el(id)  { return document.getElementById(id); }

    function fmt(n) {
        if (!isFinite(n)) return activeCurrency.symbol + '0';
        var sign = n < 0 ? '-' : '';
        return sign + activeCurrency.symbol + Math.abs(Math.round(n)).toLocaleString(activeCurrency.locale);
    }

    // ─── DOM Builders ────────────────────────────────────────────────
    function inp(placeholder, val, isText) {
        var i = document.createElement('input');
        i.type = isText ? 'text' : 'number';
        i.className = 'nw-input';
        if (placeholder && placeholder.indexOf('{SYM}') !== -1) {
            i.setAttribute('data-tmpl', placeholder);
            i.placeholder = placeholder.replace(/\{SYM\}/g, activeCurrency.symbol);
        } else {
            i.placeholder = placeholder || '';
        }
        i.value = val || '';
        if (!isText) {
            i.min = '0';
            i.step = 'any';
            // Prevent scroll and arrow-key nudges from silently altering values
            i.addEventListener('wheel', function() { this.blur(); }, { passive: true });
        }
        return i;
    }

    function removeBtn(enabled) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'remove-btn';
        b.innerHTML = '&times;';
        b.title = 'Remove';
        b.disabled = !enabled;
        return b;
    }

    function labelSpan(text) {
        var s = document.createElement('span');
        s.className = 'nw-label';
        s.textContent = text;
        return s;
    }

    function header(cls, cols) {
        var d = document.createElement('div');
        d.className = 'row-header ' + cls;
        cols.forEach(function(t) {
            var s = document.createElement('span');
            s.className = 'col-head';
            if (t.indexOf('{SYM}') !== -1) {
                s.setAttribute('data-tmpl', t);
                s.textContent = t.replace(/\{SYM\}/g, activeCurrency.symbol);
            } else {
                s.textContent = t;
            }
            d.appendChild(s);
        });
        return d;
    }

    // ─── Row Factories ───────────────────────────────────────────────
    function assetRow(name, amount, growth, custom) {
        var row = document.createElement('div');
        row.className = 'nw-row';
        if (custom) row.dataset.custom = '1';

        var lbl = custom ? inp('Asset name', name, true) : labelSpan(name);
        var amt = inp('0', amount);
        var gr  = inp('0%', growth);
        var rb  = removeBtn(custom);

        if (custom) rb.addEventListener('click', function() { row.remove(); recalc(); });
        row.appendChild(lbl); row.appendChild(amt);
        row.appendChild(gr);  row.appendChild(rb);
        row.addEventListener('input', recalc);
        return row;
    }

    function liabilityRow(name, amount, rate, custom) {
        var row = document.createElement('div');
        row.className = 'nw-row';
        if (custom) row.dataset.custom = '1';

        var lbl = custom ? inp('Liability name', name, true) : labelSpan(name);
        var amt = inp('0', amount);
        var rt  = inp('0%', rate);
        var rb  = removeBtn(custom);

        if (custom) rb.addEventListener('click', function() { row.remove(); recalc(); });
        row.appendChild(lbl); row.appendChild(amt);
        row.appendChild(rt);  row.appendChild(rb);
        row.addEventListener('input', recalc);
        return row;
    }

    function incomeRow(name, monthly, hike, custom) {
        var row = document.createElement('div');
        row.className = 'str-row';
        if (custom) row.dataset.custom = '1';

        var lbl = custom ? inp('Income source', name, true) : labelSpan(name);
        var mo  = inp('Monthly {SYM}', monthly);
        var hk  = inp('Hike %', hike);
        var rb  = removeBtn(custom);

        if (custom) rb.addEventListener('click', function() { row.remove(); recalc(); });
        row.appendChild(lbl); row.appendChild(mo);
        row.appendChild(hk);  row.appendChild(rb);
        row.addEventListener('input', recalc);
        return row;
    }

    function expenseRow(name, monthly, infl, custom) {
        var row = document.createElement('div');
        row.className = 'str-row';
        if (custom) row.dataset.custom = '1';

        var lbl = custom ? inp('Expense name', name, true) : labelSpan(name);
        var mo  = inp('Monthly {SYM}', monthly);
        var inf = inp('Infl %', infl);
        var rb  = removeBtn(custom);

        if (custom) rb.addEventListener('click', function() { row.remove(); recalc(); });
        row.appendChild(lbl); row.appendChild(mo);
        row.appendChild(inf); row.appendChild(rb);
        row.addEventListener('input', recalc);
        return row;
    }

    function emiRow(name, monthly, endYear, endMonth, custom) {
        var row = document.createElement('div');
        row.className = 'emi-row';
        if (custom) row.dataset.custom = '1';

        var curYear = new Date().getFullYear();
        var lbl = custom ? inp('EMI name', name, true) : labelSpan(name);
        var mo  = inp('Monthly {SYM}', monthly);
        var ey  = inp('End year', endYear || String(curYear + 5));
        var em  = inp('Month (1\u201312)', endMonth || '12');
        if (em.type === 'number') { em.min = '1'; em.max = '12'; }
        var rb  = removeBtn(custom);

        rb.disabled = !custom;
        if (custom) rb.addEventListener('click', function() { row.remove(); recalc(); });
        row.appendChild(lbl); row.appendChild(mo);
        row.appendChild(ey);  row.appendChild(em); row.appendChild(rb);
        row.addEventListener('input', recalc);
        return row;
    }

    function sipRow(name, monthly, stepup, ret, custom) {
        var row = document.createElement('div');
        row.className = 'sip-row';
        if (custom) row.dataset.custom = '1';

        var lbl = custom ? inp('SIP name', name, true) : labelSpan(name);
        var mo  = inp('Monthly {SYM}', monthly);
        var su  = inp('Step-up %', stepup);
        var rt  = inp('Return %', ret);
        var rb  = removeBtn(custom);

        rb.disabled = !custom;
        if (custom) rb.addEventListener('click', function() { row.remove(); recalc(); });
        row.appendChild(lbl); row.appendChild(mo);
        row.appendChild(su);  row.appendChild(rt); row.appendChild(rb);
        row.addEventListener('input', recalc);
        return row;
    }

    // ─── Data Extraction ─────────────────────────────────────────────
    function rowsIn(containerId, rowClass, numCols) {
        var container = el(containerId);
        var rows = container.querySelectorAll('.' + rowClass);
        return Array.from(rows).map(function(row) {
            var nums   = row.querySelectorAll('input[type="number"]');
            var txtInp = row.querySelector('input[type="text"]');
            var lbl    = row.querySelector('.nw-label');
            var name   = txtInp ? txtInp.value : (lbl ? lbl.textContent : '');
            var vals   = [];
            for (var i = 0; i < numCols; i++) vals.push(nums[i] ? num(nums[i].value) : 0);
            return { name: name, vals: vals };
        });
    }

    function getAssets() {
        return rowsIn('assetRows', 'nw-row', 2).map(function(r) {
            return { name: r.name, amount: r.vals[0], growth: r.vals[1] };
        });
    }
    function getLiabilities() {
        return rowsIn('liabilityRows', 'nw-row', 2).map(function(r) {
            return { name: r.name, amount: r.vals[0], rate: r.vals[1] };
        });
    }
    function getIncome() {
        return rowsIn('incomeRows', 'str-row', 2).map(function(r) {
            return { name: r.name, monthly: r.vals[0], hike: r.vals[1] };
        });
    }
    function getExpenses() {
        return rowsIn('expenseRows', 'str-row', 2).map(function(r) {
            return { name: r.name, monthly: r.vals[0], infl: r.vals[1] };
        });
    }
    function getSIPs() {
        return rowsIn('sipRows', 'sip-row', 3).map(function(r) {
            return { name: r.name, monthly: r.vals[0], stepup: r.vals[1], ret: r.vals[2] };
        });
    }
    function getEMIs() {
        return rowsIn('emiRows', 'emi-row', 3).map(function(r) {
            return { name: r.name, monthly: r.vals[0], endYear: r.vals[1], endMonth: r.vals[2] };
        });
    }
    function getYears() {
        return Math.max(1, Math.min(40, num(el('projectionYears').value) || 10));
    }

    // ─── Financial Calculations ───────────────────────────────────────

    // Current totals
    function currentTotals(assets, liabilities) {
        var ta = assets.reduce(function(s, a) { return s + a.amount; }, 0);
        var tl = liabilities.reduce(function(s, l) { return s + l.amount; }, 0);
        return { assets: ta, liabilities: tl, nw: ta - tl };
    }

    // Projected assets: each grows at compound rate
    function futureAssets(assets, years) {
        return assets.reduce(function(s, a) {
            return s + a.amount * Math.pow(1 + a.growth / 100, years);
        }, 0);
    }

    // Projected liabilities: reduce by rate% of original each year (linear paydown)
    function futureLiabilities(liabilities, years) {
        return liabilities.reduce(function(s, l) {
            if (l.rate > 0) {
                return s + Math.max(0, l.amount * (1 - l.rate / 100 * years));
            }
            return s + l.amount;
        }, 0);
    }

    // SIP future value: year-by-year with step-up and monthly compounding.
    // Each year's monthly SIPs are compounded at the monthly rate for 12 months (annuity-due),
    // then grown at the annual rate for the remaining years.
    function sipFutureValue(sips, years) {
        return sips.reduce(function(total, sip) {
            if (sip.monthly <= 0 || years <= 0) return total;
            var r   = sip.ret / 100 / 12; // monthly rate
            var su  = sip.stepup / 100;   // annual step-up
            var ann = sip.ret / 100;      // annual rate for inter-year growth
            var fv  = 0;
            var mo  = sip.monthly;

            for (var y = 0; y < years; y++) {
                var yearFV = (r === 0)
                    ? mo * 12
                    : mo * ((Math.pow(1 + r, 12) - 1) / r) * (1 + r);
                yearFV *= Math.pow(1 + ann, years - y - 1);
                fv += yearFV;
                mo *= (1 + su);
            }
            return total + fv;
        }, 0);
    }


    // ─── Highlights & Interpretation ─────────────────────────────────
    function buildHighlights(assets, liabilities, sipFV, futureNW) {
        var chips = [];

        var bigAsset = assets.reduce(function(b, a) { return a.amount > b.amount ? a : b; },
                                     { name: '', amount: 0 });
        if (bigAsset.amount > 0)
            chips.push({ label: 'Largest Asset', val: bigAsset.name + ' (' + fmt(bigAsset.amount) + ')' });

        var bigLiab = liabilities.reduce(function(b, l) { return l.amount > b.amount ? l : b; },
                                         { name: '', amount: 0 });
        if (bigLiab.amount > 0)
            chips.push({ label: 'Largest Liability', val: bigLiab.name + ' (' + fmt(bigLiab.amount) + ')' });

        if (sipFV > 0 && futureNW > 0) {
            var pct = Math.round(sipFV / futureNW * 100);
            chips.push({ label: 'SIP Share of Future NW', val: pct + '%' });
        }

        return chips;
    }

    function buildInterpretation(currNW, futureNW, annIncome, annOutflows, surplus, sipFV, years) {
        var msgs = [];
        if (currNW > 0)
            msgs.push('You are currently in a positive financial position.');
        else if (currNW < 0)
            msgs.push('Your liabilities exceed your assets. Prioritise paying down high-interest debt.');

        if (futureNW > currNW * 2 && currNW > 0)
            msgs.push('Your projected net worth more than doubles over ' + years + ' years \u2014 strong trajectory.');
        else if (futureNW > currNW && currNW >= 0)
            msgs.push('Your projected net worth grows steadily over the selected period.');

        if (annIncome > 0 && annOutflows > annIncome)
            msgs.push('Your expenses and EMIs exceed your income. This deficit reduces your projected net worth over time.');
        else if (surplus > 0)
            msgs.push('You have ' + fmt(surplus) + '/yr in surplus after expenses and EMIs. This is counted as cash (0% return) in your projection. Add it to SIPs above to earn better returns on it.');

        if (sipFV > 0 && futureNW > 0 && sipFV / futureNW > 0.3)
            msgs.push('Your SIP contributions are a major driver of your projected future net worth.');

        return msgs;
    }

    // ─── DOM Update ──────────────────────────────────────────────────
    function setText(id, text) { el(id).textContent = text; }
    function setFmt(id, n)     { el(id).textContent = fmt(n); }

    function setValueEl(id, n) {
        var e = el(id);
        e.textContent = fmt(n);
        e.className = 'result-value ' + (n >= 0 ? 'nw-positive' : 'nw-negative');
    }

    function recalc() {
        var assets      = getAssets();
        var liabilities = getLiabilities();
        var income      = getIncome();
        var expenses    = getExpenses();
        var sips        = getSIPs();
        var emis        = getEMIs();
        var years       = getYears();

        var curr     = currentTotals(assets, liabilities);
        var fAssets  = futureAssets(assets, years);
        var fLiabs   = futureLiabilities(liabilities, years);
        var sipFV    = sipFutureValue(sips, years);

        var annInc       = income.reduce(function(s, i) { return s + i.monthly * 12; }, 0);
        var annExp       = expenses.reduce(function(s, e) { return s + e.monthly * 12; }, 0);
        var annEMI       = emis.reduce(function(s, emi) { return s + emi.monthly * 12; }, 0);
        var surplus      = annInc - annExp - annEMI;
        var surplusAccum = surplus * years;
        var futureNW     = fAssets + sipFV + surplusAccum - fLiabs;

        // Header totals
        el('totalAssetsDisplay').textContent      = fmt(curr.assets);
        el('totalLiabilitiesDisplay').textContent = fmt(curr.liabilities);
        el('totalIncomeDisplay').textContent      = fmt(annInc) + ' / yr';
        el('totalExpensesDisplay').textContent    = fmt(annExp) + ' / yr';
        var emiDisp = el('totalEMIDisplay');
        if (emiDisp) emiDisp.textContent          = fmt(annEMI) + ' / yr';

        // Results — current
        setFmt('r-totalAssets', curr.assets);
        setFmt('r-totalLiabilities', curr.liabilities);
        setValueEl('r-currentNW', curr.nw);

        // Results — future
        setText('r-futureGroupTitle', 'Projection (' + years + ' Years)');
        setFmt('r-futureAssets', fAssets);
        setFmt('r-futureLiabilities', fLiabs);
        setFmt('r-sipFV', sipFV);
        setValueEl('r-surplusAccum', surplusAccum);
        setValueEl('r-futureNW', futureNW);

        // Results — cashflow
        setFmt('r-annualIncome', annInc);
        setFmt('r-annualExpenses', annExp);
        var rEmiEl = el('r-annualEMI');
        if (rEmiEl) rEmiEl.textContent = fmt(annEMI);
        setValueEl('r-surplus', surplus);

        // Mobile compact bar
        var mbCur = el('mb-currentNW');
        var mbFut = el('mb-futureNW');
        if (mbCur) {
            mbCur.textContent = fmt(curr.nw);
            mbCur.className = 'nw-mobile-bar-value ' + (curr.nw >= 0 ? 'nw-positive' : 'nw-negative');
        }
        if (mbFut) {
            mbFut.textContent = fmt(futureNW);
            mbFut.className = 'nw-mobile-bar-value ' + (futureNW >= 0 ? 'nw-positive' : 'nw-negative');
        }

        // Highlights
        var hiEl = el('resultHighlights');
        hiEl.innerHTML = '';
        buildHighlights(assets, liabilities, sipFV, futureNW).forEach(function(h) {
            var d = document.createElement('div');
            d.className = 'highlight-chip';
            d.innerHTML = '<strong>' + h.label + '</strong>' + h.val;
            hiEl.appendChild(d);
        });

        // Interpretation
        var inEl = el('resultInterpretation');
        inEl.innerHTML = '';
        buildInterpretation(curr.nw, futureNW, annInc, annExp + annEMI, surplus, sipFV, years).forEach(function(m) {
            var p = document.createElement('p');
            p.className = 'interp-msg';
            p.textContent = m;
            inEl.appendChild(p);
        });
    }

    // ─── Currency ────────────────────────────────────────────────────
    function refreshCurrencyLabels() {
        var sym = activeCurrency.symbol;
        document.querySelectorAll('[data-tmpl]').forEach(function(node) {
            var text = node.getAttribute('data-tmpl').replace(/\{SYM\}/g, sym);
            if (node.tagName === 'INPUT') {
                node.placeholder = text;
            } else {
                node.textContent = text;
            }
        });
    }

    function renderCurrencySelector() {
        var bar = el('currencyBar');
        if (!bar) return;
        var lbl = document.createElement('span');
        lbl.className = 'currency-bar-label';
        lbl.textContent = 'Currency';
        bar.appendChild(lbl);
        var pills = document.createElement('div');
        pills.className = 'currency-pills';
        CURRENCIES.forEach(function(c) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'currency-pill' + (c.code === activeCurrency.code ? ' active' : '');
            btn.textContent = c.symbol + '\u00a0' + c.name;
            btn.addEventListener('click', function() {
                activeCurrency = c;
                pills.querySelectorAll('.currency-pill').forEach(function(p) { p.classList.remove('active'); });
                btn.classList.add('active');
                refreshCurrencyLabels();
                recalc();
            });
            pills.appendChild(btn);
        });
        bar.appendChild(pills);
    }

    // ─── Init ────────────────────────────────────────────────────────
    function init() {
        renderCurrencySelector();
        var aRows = el('assetRows');
        aRows.appendChild(header('rh-asset', ['Name', 'Amount ({SYM})', 'Growth %', '']));
        DEF_ASSETS.forEach(function(a) { aRows.appendChild(assetRow(a.name, a.amount, a.growth, false)); });

        var lRows = el('liabilityRows');
        lRows.appendChild(header('rh-asset', ['Name', 'Amount ({SYM})', 'Change % /yr', '']));
        DEF_LIABILITIES.forEach(function(l) { lRows.appendChild(liabilityRow(l.name, l.amount, l.rate, false)); });

        var iRows = el('incomeRows');
        iRows.appendChild(header('rh-stream', ['Name', 'Monthly ({SYM})', 'Hike %', '']));
        DEF_INCOME.forEach(function(i) { iRows.appendChild(incomeRow(i.name, i.monthly, i.hike, false)); });

        var eRows = el('expenseRows');
        eRows.appendChild(header('rh-stream', ['Name', 'Monthly ({SYM})', 'Inflation %', '']));
        DEF_EXPENSES.forEach(function(e) { eRows.appendChild(expenseRow(e.name, e.monthly, e.infl, false)); });

        var sRows = el('sipRows');
        sRows.appendChild(header('rh-sip', ['Name', 'Monthly ({SYM})', 'Step-up %', 'Return %', '']));

        var mRows = el('emiRows');
        mRows.appendChild(header('rh-emi', ['Name', 'Monthly ({SYM})', 'End Year', 'End Month', '']));

        // Add-row buttons
        el('addAssetBtn').addEventListener('click', function() {
            aRows.appendChild(assetRow('', '', '', true)); recalc();
        });
        el('addLiabilityBtn').addEventListener('click', function() {
            lRows.appendChild(liabilityRow('', '', '', true)); recalc();
        });
        el('addIncomeBtn').addEventListener('click', function() {
            iRows.appendChild(incomeRow('', '', '', true)); recalc();
        });
        el('addExpenseBtn').addEventListener('click', function() {
            eRows.appendChild(expenseRow('', '', '', true)); recalc();
        });
        el('addSipBtn').addEventListener('click', function() {
            sRows.appendChild(sipRow('', '', '', '', true)); recalc();
        });
        el('addEmiBtn').addEventListener('click', function() {
            mRows.appendChild(emiRow('', '', '', '', true)); recalc();
        });

        el('projectionYears').addEventListener('input', function() {
            el('projectionYearsDisplay').textContent = this.value;
            recalc();
        });

        // Reset: clear numeric inputs in default rows, remove all custom and SIP rows
        el('resetBtn').addEventListener('click', function() {
            document.querySelectorAll('.nw-row, .str-row, .sip-row, .emi-row').forEach(function(row) {
                if (row.dataset.custom) {
                    row.remove();
                } else {
                    row.querySelectorAll('input[type="number"]').forEach(function(i) { i.value = ''; });
                }
            });
            sRows.querySelectorAll('.sip-row').forEach(function(r) { r.remove(); });
            mRows.querySelectorAll('.emi-row').forEach(function(r) { r.remove(); });
            el('projectionYears').value = '10';
            el('projectionYearsDisplay').textContent = '10';
            recalc();
        });

        recalc();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
