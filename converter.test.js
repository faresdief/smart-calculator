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
