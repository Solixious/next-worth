(function () {
    'use strict';

    // ─── Hierarchy Definition ────────────────────────────────────────
    var HIERARCHY = [
        {
            id: 'assets', name: 'Assets',
            totalId: 'totalAssetsDisplay', totalSuffix: '', totalClass: '',
            subcategories: [
                {
                    id: 'cash-savings', name: 'Cash & Savings', rowType: 'asset',
                    sections: [
                        { name: 'Bank Balance',   amount: '', growth: '' },
                        { name: 'Cash',           amount: '', growth: '' },
                        { name: 'Emergency Fund', amount: '', growth: '6.5' },
                        { name: 'Fixed Deposits', amount: '', growth: '6.5' }
                    ]
                },
                {
                    id: 'investments', name: 'Investments', rowType: 'asset',
                    sections: [
                        { name: 'Stocks',       amount: '', growth: '11' },
                        { name: 'Mutual Funds', amount: '', growth: '11' },
                        { name: 'ETFs',         amount: '', growth: '11' },
                        { name: 'Crypto',       amount: '', growth: '' }
                    ]
                },
                {
                    id: 'property-assets', name: 'Property & Assets', rowType: 'asset',
                    sections: [
                        { name: 'House',   amount: '', growth: '6' },
                        { name: 'Land',    amount: '', growth: '6' },
                        { name: 'Gold',    amount: '', growth: '8' },
                        { name: 'Vehicle', amount: '', growth: '' }
                    ]
                }
            ]
        },
        {
            id: 'liabilities', name: 'Liabilities',
            totalId: 'totalLiabilitiesDisplay', totalSuffix: '', totalClass: 'nw-negative',
            subcategories: [
                {
                    id: 'loans', name: 'Loans', rowType: 'liability',
                    sections: [
                        { name: 'Home Loan',      amount: '', rate: '' },
                        { name: 'Car Loan',       amount: '', rate: '' },
                        { name: 'Education Loan', amount: '', rate: '' }
                    ]
                },
                {
                    id: 'credit-debt', name: 'Credit & High Interest Debt', rowType: 'liability',
                    sections: [
                        { name: 'Credit Card',   amount: '', rate: '' },
                        { name: 'Personal Loan', amount: '', rate: '' },
                        { name: 'BNPL',          amount: '', rate: '' }
                    ]
                }
            ]
        },
        {
            id: 'income', name: 'Income Streams',
            totalId: 'totalIncomeDisplay', totalSuffix: ' / yr', totalClass: '',
            subcategories: [
                {
                    id: 'active-income', name: 'Active Income', rowType: 'income',
                    sections: [
                        { name: 'Salary',          monthly: '', hike: '8' },
                        { name: 'Business Income', monthly: '', hike: '' }
                    ]
                },
                {
                    id: 'passive-income', name: 'Passive Income', rowType: 'income',
                    sections: [
                        { name: 'Rental Income',  monthly: '', hike: '5' },
                        { name: 'Dividends',      monthly: '', hike: '' },
                        { name: 'Interest / FD',  monthly: '', hike: '' }
                    ]
                }
            ]
        },
        {
            id: 'outflows', name: 'Recurring Outflows',
            totalId: 'totalOutflowsDisplay', totalSuffix: ' / yr', totalClass: 'nw-negative',
            subcategories: [
                {
                    id: 'living-expenses', name: 'Living Expenses', rowType: 'expense',
                    sections: [
                        { name: 'Rent / Housing', monthly: '', infl: '5' },
                        { name: 'Groceries',      monthly: '', infl: '6' },
                        { name: 'Utilities',      monthly: '', infl: '6' },
                        { name: 'Insurance',      monthly: '', infl: '5' },
                        { name: 'Lifestyle',      monthly: '', infl: '6' }
                    ]
                },
                {
                    id: 'recurring-investments', name: 'Investments (SIP)', rowType: 'sip',
                    sections: []
                },
                {
                    id: 'loan-repayments', name: 'Loan Repayments (EMI)', rowType: 'emi',
                    sections: []
                }
            ]
        }
    ];

    // ─── Row type config ─────────────────────────────────────────────
    var ROW_CONFIG = {
        asset:     { headerClass: 'rh-asset',  cols: ['Name', 'Amount ({SYM})', 'Growth %', ''],               addLabel: '+ Add Asset' },
        liability: { headerClass: 'rh-asset',  cols: ['Name', 'Amount ({SYM})', 'Change % /yr', ''],           addLabel: '+ Add Liability' },
        income:    { headerClass: 'rh-stream', cols: ['Name', 'Monthly ({SYM})', 'Hike %', ''],                addLabel: '+ Add Income Source' },
        expense:   { headerClass: 'rh-stream', cols: ['Name', 'Monthly ({SYM})', 'Inflation %', ''],           addLabel: '+ Add Expense' },
        sip:       { headerClass: 'rh-sip',    cols: ['Name', 'Monthly ({SYM})', 'Return %', 'Step-up %', ''], addLabel: '+ Add SIP' },
        emi:       { headerClass: 'rh-emi',    cols: ['Name', 'Monthly ({SYM})', 'End Year', 'End Month', ''], addLabel: '+ Add EMI' }
    };

    // ─── Currencies ──────────────────────────────────────────────────
    // To add a new currency: append an entry to CURRENCIES. No other changes needed.
    var CURRENCIES = [
        { code: 'INR', symbol: '\u20b9', name: 'Indian Rupee', locale: 'en-IN' },
        { code: 'USD', symbol: '$',      name: 'US Dollar',    locale: 'en-US' },
        { code: 'EUR', symbol: '\u20ac', name: 'Euro',         locale: 'de-DE' }
    ];
    var activeCurrency = CURRENCIES[0];
    var NW_STORAGE_KEY = 'nw_networth_v1';

    // ─── Chart state ─────────────────────────────────────────────────
    var nwCharts    = { growth: null, assets: null, future: null };
    var nwLastTheme = null;

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
        row.appendChild(rt);  row.appendChild(su); row.appendChild(rb);
        row.addEventListener('input', recalc);
        return row;
    }

    function makeRow(rowType, section, custom) {
        section = section || {};
        switch (rowType) {
            case 'asset':     return assetRow(section.name || '', section.amount || '', section.growth || '', custom);
            case 'liability': return liabilityRow(section.name || '', section.amount || '', section.rate || '', custom);
            case 'income':    return incomeRow(section.name || '', section.monthly || '', section.hike || '', custom);
            case 'expense':   return expenseRow(section.name || '', section.monthly || '', section.infl || '', custom);
            case 'sip':       return sipRow(section.name || '', section.monthly || '', section.stepup || '', section.ret || '', custom);
            case 'emi':       return emiRow(section.name || '', section.monthly || '', section.endYear || '', section.endMonth || '', custom);
        }
    }

    // ─── Data Extraction ─────────────────────────────────────────────
    function collectFromContainers(containerClass, rowClass, numCols) {
        var result = [];
        document.querySelectorAll('.' + containerClass).forEach(function(container) {
            container.querySelectorAll('.' + rowClass).forEach(function(row) {
                var nums   = row.querySelectorAll('input[type="number"]');
                var txtInp = row.querySelector('input[type="text"]');
                var lbl    = row.querySelector('.nw-label');
                var name   = txtInp ? txtInp.value : (lbl ? lbl.textContent : '');
                var vals   = [];
                for (var i = 0; i < numCols; i++) vals.push(nums[i] ? num(nums[i].value) : 0);
                result.push({ name: name, vals: vals });
            });
        });
        return result;
    }

    function getAssets() {
        return collectFromContainers('subcat-rows-asset', 'nw-row', 2).map(function(r) {
            return { name: r.name, amount: r.vals[0], growth: r.vals[1] };
        });
    }
    function getLiabilities() {
        return collectFromContainers('subcat-rows-liability', 'nw-row', 2).map(function(r) {
            return { name: r.name, amount: r.vals[0], rate: r.vals[1] };
        });
    }
    function getIncome() {
        return collectFromContainers('subcat-rows-income', 'str-row', 2).map(function(r) {
            return { name: r.name, monthly: r.vals[0], hike: r.vals[1] };
        });
    }
    function getExpenses() {
        return collectFromContainers('subcat-rows-expense', 'str-row', 2).map(function(r) {
            return { name: r.name, monthly: r.vals[0], infl: r.vals[1] };
        });
    }
    function getSIPs() {
        return collectFromContainers('subcat-rows-sip', 'sip-row', 3).map(function(r) {
            return { name: r.name, monthly: r.vals[0], ret: r.vals[1], stepup: r.vals[2] };
        });
    }
    function getEMIs() {
        return collectFromContainers('subcat-rows-emi', 'emi-row', 3).map(function(r) {
            return { name: r.name, monthly: r.vals[0], endYear: r.vals[1], endMonth: r.vals[2] };
        });
    }
    function getYears() {
        return Math.max(1, Math.min(40, num(el('projectionYears').value) || 10));
    }

    // Sum of passive income subcategory for FIRE pre-fill
    function getLiquidPassiveIncome() {
        var total = 0;
        var container = el('rows-passive-income');
        if (!container) return 0;
        container.querySelectorAll('.str-row').forEach(function (row) {
            var nums = row.querySelectorAll('input[type="number"]');
            if (nums[0]) total += num(nums[0].value);
        });
        return total;
    }

    // Only liquid/investable assets (Cash & Savings + Investments) for FIRE corpus
    function getLiquidAssetsTotal() {
        var total = 0;
        ['cash-savings', 'investments'].forEach(function (subcatId) {
            var container = el('rows-' + subcatId);
            if (!container) return;
            container.querySelectorAll('.nw-row').forEach(function (row) {
                var nums = row.querySelectorAll('input[type="number"]');
                if (nums[0]) total += num(nums[0].value);
            });
        });
        return total;
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

    // Total accumulated amount for a stream that grows at an annual compound rate.
    // Sums: a + a*r + a*r^2 + ... + a*r^(n-1)  where r = 1 + ratePercent/100
    function geometricSum(annualAmount, ratePercent, years) {
        if (annualAmount <= 0 || years <= 0) return 0;
        if (ratePercent <= 0) return annualAmount * years;
        var r = 1 + ratePercent / 100;
        return annualAmount * (Math.pow(r, years) - 1) / (r - 1);
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

    // ─── Persistence ─────────────────────────────────────────────────

    function saveState() {
        try {
            var subcats = {};
            HIERARCHY.forEach(function (cat) {
                cat.subcategories.forEach(function (subcat) {
                    var container = el('rows-' + subcat.id);
                    if (!container) return;
                    var rowSel = { asset: '.nw-row', liability: '.nw-row', income: '.str-row',
                                   expense: '.str-row', sip: '.sip-row', emi: '.emi-row' }[subcat.rowType];
                    var rows = [];
                    container.querySelectorAll(rowSel).forEach(function (row) {
                        var nums    = row.querySelectorAll('input[type="number"]');
                        var textInp = row.querySelector('input[type="text"]');
                        var isCustom = !!row.dataset.custom;
                        var r = { custom: isCustom, v: [] };
                        nums.forEach(function (n) { r.v.push(n.value); });
                        if (isCustom && textInp) r.name = textInp.value;
                        rows.push(r);
                    });
                    subcats[subcat.id] = rows;
                });
            });
            var pyEl = el('projectionYears');
            localStorage.setItem(NW_STORAGE_KEY, JSON.stringify({
                v:        1,
                currency: activeCurrency.code,
                years:    pyEl ? pyEl.value : '10',
                subcats:  subcats
            }));
        } catch (e) {}
    }

    function loadState() {
        try {
            var s = JSON.parse(localStorage.getItem(NW_STORAGE_KEY));
            if (!s || s.v !== 1 || !s.subcats) return null;

            var cur = CURRENCIES.filter(function (c) { return c.code === s.currency; })[0];
            if (cur) activeCurrency = cur;

            // Patch HIERARCHY sections with saved non-custom row values
            HIERARCHY.forEach(function (cat) {
                cat.subcategories.forEach(function (subcat) {
                    var savedRows = s.subcats[subcat.id];
                    if (!savedRows) return;
                    var defaultCount = subcat.sections.length;
                    for (var i = 0; i < defaultCount; i++) {
                        var r = savedRows[i];
                        if (!r || r.custom) continue;
                        var sec = subcat.sections[i];
                        var v = r.v;
                        switch (subcat.rowType) {
                            case 'asset':     sec.amount = v[0] || ''; sec.growth  = v[1] || ''; break;
                            case 'liability': sec.amount = v[0] || ''; sec.rate    = v[1] || ''; break;
                            case 'income':    sec.monthly = v[0] || ''; sec.hike   = v[1] || ''; break;
                            case 'expense':   sec.monthly = v[0] || ''; sec.infl   = v[1] || ''; break;
                            case 'sip':       sec.monthly = v[0] || ''; sec.ret    = v[1] || ''; sec.stepup = v[2] || ''; break;
                            case 'emi':       sec.monthly = v[0] || ''; sec.endYear = v[1] || ''; sec.endMonth = v[2] || ''; break;
                        }
                    }
                });
            });

            return s; // return for custom row + years restoration after render
        } catch (e) { return null; }
    }

    function restoreCustomRows(saved) {
        if (!saved || !saved.subcats) return;
        HIERARCHY.forEach(function (cat) {
            cat.subcategories.forEach(function (subcat) {
                var savedRows = saved.subcats[subcat.id];
                if (!savedRows) return;
                var container = el('rows-' + subcat.id);
                if (!container) return;
                var defaultCount = subcat.sections.length;
                for (var i = defaultCount; i < savedRows.length; i++) {
                    var r = savedRows[i];
                    if (!r.custom) continue;
                    var sec = { name: r.name || '' };
                    var v = r.v || [];
                    switch (subcat.rowType) {
                        case 'asset':     sec.amount = v[0]; sec.growth  = v[1]; break;
                        case 'liability': sec.amount = v[0]; sec.rate    = v[1]; break;
                        case 'income':    sec.monthly = v[0]; sec.hike   = v[1]; break;
                        case 'expense':   sec.monthly = v[0]; sec.infl   = v[1]; break;
                        case 'sip':       sec.monthly = v[0]; sec.ret    = v[1]; sec.stepup = v[2]; break;
                        case 'emi':       sec.monthly = v[0]; sec.endYear = v[1]; sec.endMonth = v[2]; break;
                    }
                    container.appendChild(makeRow(subcat.rowType, sec, true));
                }
            });
        });
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

        var now       = new Date();
        var curYear   = now.getFullYear();
        var curMonth  = now.getMonth() + 1; // 1-indexed
        var projMonths = years * 12;

        var annInc = income.reduce(function(s, i) { return s + i.monthly * 12; }, 0);
        var annExp = expenses.reduce(function(s, e) { return s + e.monthly * 12; }, 0);
        var annSIP = sips.reduce(function(s, sip) { return s + sip.monthly * 12; }, 0);

        // Current-year EMI (for cashflow display): exclude EMIs whose end date has passed
        var annEMI = emis.reduce(function(s, emi) {
            var moLeft = (emi.endYear - curYear) * 12 + (emi.endMonth - curMonth);
            return moLeft > 0 ? s + emi.monthly * 12 : s;
        }, 0);

        // Total EMI payments actually made over the projection period
        var totalEMIOutflow = emis.reduce(function(s, emi) {
            var moLeft   = (emi.endYear - curYear) * 12 + (emi.endMonth - curMonth);
            var moActive = Math.min(Math.max(0, moLeft), projMonths);
            return s + moActive * emi.monthly;
        }, 0);

        // Accumulate each stream with its compound rate over the projection period
        var totalIncome = income.reduce(function(s, i) {
            return s + geometricSum(i.monthly * 12, i.hike, years);
        }, 0);
        var totalExpenses = expenses.reduce(function(s, e) {
            return s + geometricSum(e.monthly * 12, e.infl, years);
        }, 0);
        var totalSIPContrib = sips.reduce(function(s, sip) {
            return s + geometricSum(sip.monthly * 12, sip.stepup, years);
        }, 0);

        var surplus      = annInc - annExp - annEMI - annSIP;
        var surplusAccum = totalIncome - totalExpenses - totalEMIOutflow - totalSIPContrib;
        var futureNW     = fAssets + sipFV + surplusAccum - fLiabs;

        // Card header totals
        el('totalAssetsDisplay').textContent      = fmt(curr.assets);
        el('totalLiabilitiesDisplay').textContent = fmt(curr.liabilities);
        el('totalIncomeDisplay').textContent      = fmt(annInc) + ' / yr';
        el('totalOutflowsDisplay').textContent    = fmt(annExp + annEMI + annSIP) + ' / yr';

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
        var rSipEl = el('r-annualSIP');
        if (rSipEl) rSipEl.textContent = fmt(annSIP);
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
        buildInterpretation(curr.nw, futureNW, annInc, annExp + annEMI + annSIP, surplus, sipFV, years).forEach(function(m) {
            var p = document.createElement('p');
            p.className = 'interp-msg';
            p.textContent = m;
            inEl.appendChild(p);
        });

        updateAllCharts(assets, liabilities, sips, emis, income, expenses, years,
                        fAssets, fLiabs, sipFV, surplusAccum);

        // Update FIRE calculator deep-link with current results
        // Corpus = liquid assets only (Cash & Savings + Investments); property excluded
        // Passive income reduces the corpus the investments need to cover
        var fireLink = el('nwFireLink');
        if (fireLink) {
            var fireCorpus   = Math.max(0, Math.round(getLiquidAssetsTotal()));
            var fireMonthly  = Math.max(0, Math.round((surplus + annSIP) / 12));
            var fireExpenses = Math.max(0, Math.round(annExp / 12));
            var firePassive  = Math.max(0, Math.round(getLiquidPassiveIncome()));
            fireLink.href = '/fire-calculator?corpus='   + fireCorpus  +
                            '&monthly='  + fireMonthly  +
                            '&expenses=' + fireExpenses +
                            '&passive='  + firePassive;
        }

        saveState();
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

    // ─── Hierarchy Rendering ─────────────────────────────────────────
    function renderSubcategory(subcat) {
        var cfg = ROW_CONFIG[subcat.rowType];

        var wrapper = document.createElement('div');
        wrapper.className = 'subcat-wrapper';

        // Collapsible header
        var subcatHeader = document.createElement('div');
        subcatHeader.className = 'subcat-header';

        var toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'subcat-toggle';
        toggleBtn.setAttribute('aria-expanded', 'true');

        var arrow = document.createElement('span');
        arrow.className = 'subcat-arrow';
        arrow.textContent = '\u25be'; // ▾

        var nameSpan = document.createElement('span');
        nameSpan.textContent = subcat.name;

        toggleBtn.appendChild(arrow);
        toggleBtn.appendChild(nameSpan);
        subcatHeader.appendChild(toggleBtn);
        wrapper.appendChild(subcatHeader);

        // Collapsible body
        var body = document.createElement('div');
        body.className = 'subcat-body';

        var rowList = document.createElement('div');
        rowList.className = 'row-list subcat-rows-' + subcat.rowType;
        rowList.id = 'rows-' + subcat.id;

        rowList.appendChild(header(cfg.headerClass, cfg.cols));

        subcat.sections.forEach(function(sec) {
            rowList.appendChild(makeRow(subcat.rowType, sec, false));
        });

        body.appendChild(rowList);

        var addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'add-row-btn';
        addBtn.textContent = cfg.addLabel;
        addBtn.addEventListener('click', function() {
            rowList.appendChild(makeRow(subcat.rowType, {}, true));
            recalc();
        });
        body.appendChild(addBtn);

        wrapper.appendChild(body);

        toggleBtn.addEventListener('click', function() {
            var isExpanded = body.style.display !== 'none';
            body.style.display = isExpanded ? 'none' : '';
            toggleBtn.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
            arrow.textContent = isExpanded ? '\u25b8' : '\u25be'; // ▸ / ▾
        });

        return wrapper;
    }

    function renderCategory(cat) {
        var card = document.createElement('div');
        card.className = 'calc-card';
        card.id = 'card-' + cat.id;

        var cardHeader = document.createElement('div');
        cardHeader.className = 'calc-card-header';

        // Clickable title row (arrow + h2)
        var titleRow = document.createElement('div');
        titleRow.className = 'cat-title-row';

        var arrow = document.createElement('span');
        arrow.className = 'cat-arrow';
        arrow.textContent = '\u25be'; // ▾

        var titleEl = document.createElement('h2');
        titleEl.className = 'calc-card-title';
        titleEl.textContent = cat.name;

        titleRow.appendChild(arrow);
        titleRow.appendChild(titleEl);
        cardHeader.appendChild(titleRow);

        // Category total badge
        if (cat.totalId) {
            var total = document.createElement('span');
            total.className = 'calc-card-total' + (cat.totalClass ? ' ' + cat.totalClass : '');
            total.id = cat.totalId;
            total.textContent = activeCurrency.symbol + '0' + cat.totalSuffix;
            cardHeader.appendChild(total);
        }

        card.appendChild(cardHeader);

        // Collapsible body containing all subcategories
        var body = document.createElement('div');
        body.className = 'cat-body';

        cat.subcategories.forEach(function(subcat) {
            body.appendChild(renderSubcategory(subcat));
        });

        card.appendChild(body);

        titleRow.addEventListener('click', function() {
            var isExpanded = body.style.display !== 'none';
            body.style.display = isExpanded ? 'none' : '';
            arrow.textContent = isExpanded ? '\u25b8' : '\u25be'; // ▸ / ▾
        });

        return card;
    }

    // ─── Charts ──────────────────────────────────────────────────────

    function isDarkTheme() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    function chartPalette() {
        return isDarkTheme()
            ? ['#7cb3ff', '#4ade80', '#22d3ee', '#a78bfa', '#fbbf24', '#fb923c']
            : ['#1d4ed8', '#15803d', '#0891b2', '#7c3aed', '#b45309', '#c2410c'];
    }

    function chartTheme() {
        var dark = isDarkTheme();
        return {
            text:        dark ? '#a1a1aa' : '#71717a',
            grid:        dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
            primary:     dark ? '#7cb3ff' : '#1d4ed8',
            green:       dark ? '#4ade80' : '#15803d',
            red:         dark ? '#f87171' : '#ef4444',
            primaryFill: dark ? 'rgba(124,179,255,0.12)' : 'rgba(29,78,216,0.09)'
        };
    }

    function fmtShort(v) {
        if (!isFinite(v)) return '';
        var n = Math.abs(v), sign = v < 0 ? '-' : '', sym = activeCurrency.symbol;
        if (activeCurrency.code === 'INR') {
            if (n >= 10000000) return sign + sym + (n / 10000000).toFixed(1) + 'Cr';
            if (n >= 100000)   return sign + sym + (n / 100000).toFixed(1)   + 'L';
            if (n >= 1000)     return sign + sym + (n / 1000).toFixed(0)     + 'K';
        } else {
            if (n >= 1000000)  return sign + sym + (n / 1000000).toFixed(1)  + 'M';
            if (n >= 1000)     return sign + sym + (n / 1000).toFixed(0)     + 'K';
        }
        return sign + sym + Math.round(n);
    }

    function destroyCharts() {
        ['growth', 'assets', 'future'].forEach(function(k) {
            if (nwCharts[k]) { nwCharts[k].destroy(); nwCharts[k] = null; }
        });
    }

    function buildGrowthData(assets, liabilities, sips, emis, income, expenses, years) {
        var now = new Date();
        var curYear = now.getFullYear(), curMonth = now.getMonth() + 1;
        var labels = [], nwPts = [], wealthPts = [], liabPts = [];

        for (var y = 0; y <= years; y++) {
            labels.push(y === 0 ? 'Now' : String(curYear + y));

            var fA = assets.reduce(function(s, a) {
                return s + a.amount * Math.pow(1 + a.growth / 100, y);
            }, 0);
            var fL = liabilities.reduce(function(s, l) {
                return s + (l.rate > 0 ? Math.max(0, l.amount * (1 - l.rate / 100 * y)) : l.amount);
            }, 0);
            var sipV = sipFutureValue(sips, y);

            var projMo = y * 12;
            var emiOut = emis.reduce(function(s, emi) {
                var moLeft = (emi.endYear - curYear) * 12 + (emi.endMonth - curMonth);
                return s + Math.min(Math.max(0, moLeft), projMo) * emi.monthly;
            }, 0);
            var totInc = income.reduce(function(s, i)   { return s + geometricSum(i.monthly * 12, i.hike, y); }, 0);
            var totExp = expenses.reduce(function(s, e)  { return s + geometricSum(e.monthly * 12, e.infl, y); }, 0);
            var totSIP = sips.reduce(function(s, sp)    { return s + geometricSum(sp.monthly * 12, sp.stepup, y); }, 0);
            var surp = totInc - totExp - emiOut - totSIP;

            nwPts.push(Math.round(fA + sipV + surp - fL));
            wealthPts.push(Math.round(fA + sipV + Math.max(0, surp)));
            liabPts.push(Math.round(fL));
        }
        return { labels: labels, nw: nwPts, wealth: wealthPts, liabilities: liabPts };
    }

    function updateGrowthChart(data) {
        if (typeof Chart === 'undefined') return;
        var canvas = el('chartGrowth');
        if (!canvas) return;
        var ct = chartTheme();

        var datasets = [
            {
                label: 'Net Worth',
                data: data.nw,
                borderColor: ct.primary,
                backgroundColor: ct.primaryFill,
                fill: true, borderWidth: 2,
                pointRadius: data.labels.length > 20 ? 0 : 2,
                tension: 0.35
            },
            {
                label: 'Gross Wealth',
                data: data.wealth,
                borderColor: ct.green,
                backgroundColor: 'transparent',
                borderWidth: 1.5, borderDash: [5, 3],
                pointRadius: 0, tension: 0.35
            },
            {
                label: 'Liabilities',
                data: data.liabilities,
                borderColor: ct.red,
                backgroundColor: 'transparent',
                borderWidth: 1.5, borderDash: [5, 3],
                pointRadius: 0, tension: 0.35
            }
        ];

        var scaleBase = {
            grid: { color: ct.grid },
            ticks: { color: ct.text, font: { size: 10 } }
        };
        var opts = {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: ct.text, font: { size: 11 }, boxWidth: 12, padding: 12 }
                },
                tooltip: {
                    callbacks: {
                        label: function(ctx) { return '  ' + ctx.dataset.label + ': ' + fmt(ctx.parsed.y); }
                    }
                }
            },
            scales: {
                x: Object.assign({}, scaleBase, {
                    ticks: Object.assign({}, scaleBase.ticks, { maxTicksLimit: 8, maxRotation: 0 })
                }),
                y: Object.assign({}, scaleBase, {
                    ticks: Object.assign({}, scaleBase.ticks, {
                        maxTicksLimit: 5,
                        callback: function(v) { return fmtShort(v); }
                    })
                })
            }
        };

        if (nwCharts.growth) {
            nwCharts.growth.data.labels   = data.labels;
            nwCharts.growth.data.datasets = datasets;
            nwCharts.growth.options       = opts;
            nwCharts.growth.update('none');
        } else {
            nwCharts.growth = new Chart(canvas, { type: 'line', data: { labels: data.labels, datasets: datasets }, options: opts });
        }
    }

    function updateAssetsChart(assets) {
        if (typeof Chart === 'undefined') return;
        var card = el('chartAssetsCard');
        var canvas = el('chartAssets');
        if (!canvas) return;
        var valid = assets.filter(function(a) { return a.amount > 0; });
        if (!valid.length) { if (card) card.style.display = 'none'; return; }
        if (card) card.style.display = '';
        var palette = chartPalette();
        var ct = chartTheme();
        var donutData = {
            labels: valid.map(function(a) { return a.name; }),
            datasets: [{
                data: valid.map(function(a) { return a.amount; }),
                backgroundColor: valid.map(function(_, i) { return palette[i % palette.length]; }),
                borderWidth: 0, hoverOffset: 8
            }]
        };
        var donutOpts = {
            responsive: true, maintainAspectRatio: false, cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: ct.text, font: { size: 11 }, boxWidth: 10, padding: 8 }
                },
                tooltip: {
                    callbacks: {
                        label: function(ctx) { return '  ' + ctx.label + ': ' + fmt(ctx.raw); }
                    }
                }
            }
        };
        if (nwCharts.assets) {
            nwCharts.assets.data    = donutData;
            nwCharts.assets.options = donutOpts;
            nwCharts.assets.update('none');
        } else {
            nwCharts.assets = new Chart(canvas, { type: 'doughnut', data: donutData, options: donutOpts });
        }
    }

    function updateFutureChart(fAssets, fLiabs, sipFV, surplusAccum) {
        if (typeof Chart === 'undefined') return;
        var card = el('chartFutureCard');
        var canvas = el('chartFuture');
        if (!canvas) return;
        var palette = chartPalette();
        var ct = chartTheme();
        var segments = [
            { label: 'Projected Assets', value: Math.max(0, fAssets),      color: palette[0] },
            { label: 'SIP Corpus',        value: Math.max(0, sipFV),        color: palette[1] },
            { label: 'Surplus (cash)',    value: Math.max(0, surplusAccum), color: palette[2] },
            { label: 'Liabilities',       value: Math.max(0, fLiabs),       color: ct.red }
        ].filter(function(s) { return s.value > 0; });
        if (!segments.length) { if (card) card.style.display = 'none'; return; }
        if (card) card.style.display = '';
        var donutData = {
            labels: segments.map(function(s) { return s.label; }),
            datasets: [{
                data: segments.map(function(s) { return s.value; }),
                backgroundColor: segments.map(function(s) { return s.color; }),
                borderWidth: 0, hoverOffset: 8
            }]
        };
        var donutOpts = {
            responsive: true, maintainAspectRatio: false, cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: ct.text, font: { size: 11 }, boxWidth: 10, padding: 8 }
                },
                tooltip: {
                    callbacks: {
                        label: function(ctx) { return '  ' + ctx.label + ': ' + fmt(ctx.raw); }
                    }
                }
            }
        };
        if (nwCharts.future) {
            nwCharts.future.data    = donutData;
            nwCharts.future.options = donutOpts;
            nwCharts.future.update('none');
        } else {
            nwCharts.future = new Chart(canvas, { type: 'doughnut', data: donutData, options: donutOpts });
        }
    }

    function updateAllCharts(assets, liabilities, sips, emis, income, expenses, years, fAssets, fLiabs, sipFV, surplusAccum) {
        if (typeof Chart === 'undefined') return;
        var currentTheme = isDarkTheme() ? 'dark' : 'light';
        if (currentTheme !== nwLastTheme) {
            destroyCharts();
            nwLastTheme = currentTheme;
        }
        var hasData = assets.some(function(a) { return a.amount > 0; }) ||
                      liabilities.some(function(l) { return l.amount > 0; }) ||
                      income.some(function(i) { return i.monthly > 0; }) ||
                      sips.some(function(s) { return s.monthly > 0; });
        var emptyEl = el('nwChartsEmpty');
        var gridEl  = el('nwChartsGrid');
        if (!hasData) {
            if (emptyEl) emptyEl.style.display = '';
            if (gridEl)  gridEl.style.display  = 'none';
            return;
        }
        if (emptyEl) emptyEl.style.display = 'none';
        if (gridEl)  gridEl.style.display  = '';
        updateGrowthChart(buildGrowthData(assets, liabilities, sips, emis, income, expenses, years));
        updateAssetsChart(assets);
        updateFutureChart(fAssets, fLiabs, sipFV, surplusAccum);
    }

    // ─── Init ────────────────────────────────────────────────────────
    function init() {
        // Load saved state — patches HIERARCHY sections before they are rendered
        var savedState = loadState();

        renderCurrencySelector();

        // Sync currency pill active state if currency was restored
        document.querySelectorAll('#currencyBar .currency-pill').forEach(function (p) {
            p.classList.toggle('active', p.textContent.indexOf(activeCurrency.code) !== -1);
        });

        var calcCards = el('calcCards');
        HIERARCHY.forEach(function(cat) {
            calcCards.appendChild(renderCategory(cat));
        });

        // Add back any custom rows that were saved
        restoreCustomRows(savedState);

        el('projectionYears').addEventListener('input', function() {
            el('projectionYearsDisplay').textContent = this.value;
            recalc();
        });

        // Restore projection years display
        if (savedState && savedState.years) {
            var pyEl = el('projectionYears');
            if (pyEl) {
                pyEl.value = savedState.years;
                el('projectionYearsDisplay').textContent = savedState.years;
            }
        }

        el('resetBtn').addEventListener('click', function() {
            document.querySelectorAll('.nw-row, .str-row, .sip-row, .emi-row').forEach(function(row) {
                if (row.dataset.custom) {
                    row.remove();
                } else {
                    row.querySelectorAll('input[type="number"]').forEach(function(i) { i.value = ''; });
                }
            });
            el('projectionYears').value = '10';
            el('projectionYearsDisplay').textContent = '10';
            try { localStorage.removeItem(NW_STORAGE_KEY); } catch(e) {}
            recalc();
        });

        recalc();

        // Re-render charts when theme toggles so colours stay consistent.
        new MutationObserver(function() { destroyCharts(); recalc(); })
            .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        // Fix: position: fixed; bottom: 0 is anchored to the layout viewport,
        // not the visual viewport. On mobile browsers the bottom toolbar lives
        // outside the layout viewport, so the bar doesn't follow when it hides.
        // visualViewport gives us the true visible area so we can compensate.
        if (window.visualViewport) {
            function positionMobileBar() {
                var bar = el('nwMobileBar');
                if (!bar) return;
                var vp = window.visualViewport;
                var gap = window.innerHeight - vp.offsetTop - vp.height;
                bar.style.bottom = Math.max(0, gap) + 'px';
            }
            window.visualViewport.addEventListener('resize', positionMobileBar);
            window.visualViewport.addEventListener('scroll', positionMobileBar);
            positionMobileBar();
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
