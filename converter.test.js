'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { convert, number, units } = require('./converter.js');
const near = (a, b) => assert.ok(Math.abs(a - b) <= Math.max(1, Math.abs(b)) * 1e-12, `${a} != ${b}`);

test('length: metric and imperial definitions', () => {
    near(convert(1, 'length', 'm', 'cm'), 100);
    near(convert(1, 'length', 'mi', 'km'), 1.609344);
    near(convert(12, 'length', 'in', 'ft'), 1);
    near(convert(1, 'length', 'yd', 'ft'), 3);
});
test('mass: metric, ounces and pounds', () => {
    near(convert(1, 'mass', 'kg', 'g'), 1000);
    near(convert(1, 'mass', 'lb', 'kg'), 0.45359237);
    near(convert(16, 'mass', 'oz', 'lb'), 1);
    near(convert(1, 'mass', 't', 'mg'), 1e9);
});
test('every unit pair round-trips, including zero and negatives', () => {
    for (const [category, group] of Object.entries(units)) {
        for (const from of Object.keys(group)) for (const to of Object.keys(group)) {
            for (const value of [0, -12.5, 0.001, 12345.678]) {
                near(convert(convert(value, category, from, to), category, to, from), value);
            }
        }
    }
});
test('Arabic and Persian numerals and decimal separator', () => {
    assert.equal(number(' ١٢٫٥ '), 12.5);
    assert.equal(number('۱۲٫۵'), 12.5);
    assert.equal(convert('١٢٫٥', 'length', 'm', 'cm'), 1250);
    assert.equal(number('1e3'), 1000);
});
test('currency uses only the supplied directional rate', () => {
    assert.equal(convert(10, 'currency', 'USD', 'EGP', '50'), 500);
    assert.equal(convert(10, 'currency', 'EGP', 'USD', '0.02'), 0.2);
    assert.equal(convert(10, 'currency', 'EGP', 'EGP', ''), 10);
    assert.equal(convert(0, 'currency', 'USD', 'EGP', '50'), 0);
    for (const rate of ['', 0, -1, 'NaN', 'Infinity']) assert.throws(() => convert(10, 'currency', 'USD', 'EGP', rate));
});
test('invalid, ambiguous, overflowing and underflowing inputs are rejected', () => {
    for (const value of ['', ' ', null, undefined, true, '1,200', '1,2', '1+2', '0x10', 'Infinity', 'NaN', '1e999']) assert.throws(() => number(value));
    assert.throws(() => convert(1, 'length', 'kg', 'm'));
    assert.throws(() => convert(1, 'mass', 'kg', 'constructor'));
    assert.throws(() => convert(1, 'unknown', 'm', 'm'));
    assert.throws(() => convert(1, 'currency', 'BAD', 'USD', 1));
    assert.throws(() => convert('1e308', 'length', 'km', 'mm'));
    assert.throws(() => convert('1e-320', 'mass', 'mg', 't'));
});

const { validateRates, exchangeRate } = require('./converter.js');
const now = Date.UTC(2026, 10, 24, 9);
const fixture = () => ({result: 'success', base_code: 'USD', time_last_update_unix: now / 1000 - 3600, rates: {USD: 1, EGP: 50, EUR: 0.9, GBP: 0.75, SAR: 3.75, AED: 3.6725}});
test('daily rates: validation, cross rates and inverse', () => {
    const d = fixture();
    assert.equal(exchangeRate(d, 'USD', 'EGP', now), 50);
    assert.equal(exchangeRate(d, 'EGP', 'USD', now), 0.02);
    near(exchangeRate(d, 'EUR', 'EGP', now), 50 / 0.9);
    assert.equal(exchangeRate(d, 'AED', 'AED', now), 1);
    assert.equal(validateRates(d, now).rates.USD, 1);
});
test('daily rates reject old, future and malformed responses', () => {
    for (const seconds of [49 * 3600, -3600, NaN]) {
        const d = fixture(); d.time_last_update_unix = now / 1000 - seconds;
        assert.throws(() => validateRates(d, now));
    }
    for (const code of ['USD','EGP','EUR','GBP','SAR','AED']) for (const value of [undefined, 0, -1, '50', Infinity, NaN]) {
        const d = fixture(); d.rates[code] = value; assert.throws(() => validateRates(d, now));
    }
    for (const d of [null, {}, {...fixture(), result: 'error'}, {...fixture(), base_code: 'EUR'}]) assert.throws(() => validateRates(d, now));
    assert.throws(() => exchangeRate(fixture(), 'BAD', 'EGP', now));
});
test('deployment bundle matches converter source exactly', () => {
    const fs = require('node:fs');
    const marker = '/* Bundled converter: keep identical to converter.js for the existing deployment file list. */\n';
    assert.equal(fs.readFileSync('script.js', 'utf8').split(marker)[1], fs.readFileSync('converter.js', 'utf8'));
});
