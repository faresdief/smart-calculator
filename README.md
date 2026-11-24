# Smart Calculator | الحاسبة الذكية

A calculator that runs in the browser, in Arabic and English, with a scientific mode, a unit converter, date tools and a saved history. Plain HTML, CSS and JavaScript, no dependencies and no build step.

**Live demo:** https://faresdief.github.io/smart-calculator/

حاسبة بالعربي والإنجليزي بوضع علمي ومحوّل وحدات وحسابات تواريخ وسجل عمليات، بتشتغل في المتصفح من غير سيرفر.

## Features

- Expression calculator with correct operator precedence, brackets, implicit multiplication and right-to-left exponents
- Smart percentages, factorial, square, reciprocal and clear error messages (for example division by zero)
- Scientific functions in degrees or radians, plus logarithms and roots
- Floating-point clean-up, so results like 0.1 + 0.2 show as 0.3
- Arabic-Indic and Persian digits are accepted as input
- Unit converter: length, mass, speed, area and data, plus currency using the latest daily rates (the last fetched rates are cached in the browser)
- Date calculator: difference between two dates, or add or subtract days and see the weekday
- History and favourites, with text export
- Dark and light themes, Arabic (RTL) and English interface
- Installable and works offline (service worker and web manifest)

## Run it

No install needed. Serve the folder with any static server:

```bash
python3 -m http.server 8000
# open http://localhost:8000/
```

The service worker only works over HTTPS or localhost.

## Tests

Node.js 18 or later, no packages to install:

```bash
npm test
```

This runs `node --test` over `calc.test.js` (the expression engine and keypad behaviour), `converter.test.js`, `dates.test.js` and `features.test.js`. One test checks that the converter code embedded in `script.js` is identical to `converter.js`, so edit `converter.js` first and then copy the change into `script.js`.

## Project layout

| File | Purpose |
| --- | --- |
| `index.html`, `style.css` | Page and styles |
| `script.js` | UI logic (bundles the converter) |
| `calc.js` | Expression engine |
| `converter.js` | Unit and currency conversion |
| `state.js` | History, favourites, date helpers and saved state |
| `sw.js`, `manifest.webmanifest`, `assets/` | Offline support, icons and fonts |

## Deploy

A GitHub Actions workflow runs the tests and then publishes the site to GitHub Pages on every push to `main`.

## Fonts

`poppins-*.woff` are subsets (Basic Latin + Latin-1 + a few math signs) of **Poppins**
(Regular, Medium, Bold), © 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins),
licensed under the SIL Open Font License 1.1: https://openfontlicense.org

Arabic text uses the system Arabic font (Segoe UI / Tahoma / Noto Sans Arabic / SF Arabic).

## License

Copyright (c) 2026 Fares Mahmoud (faresdief). All rights reserved. See `LICENSE`.
