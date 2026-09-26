const puppeteer = require('puppeteer');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = 'http://localhost:8071';

async function main() {
    console.log('=== Hoot: tests JS de erpico_web_sidebar ===');
    console.log('');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    try {
        // Login como admin
        await page.goto(`${BASE}/web/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('#login', { timeout: 15000 });
        await page.waitForSelector('button.btn-primary[type="submit"]', { visible: true, timeout: 15000 });
        await page.waitForFunction(() => !!window.odoo, { timeout: 30000 }).catch(() => {});
        await sleep(800);
        await page.type('#login', 'admin');
        await page.type('#password', 'admin');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
            page.click('button.btn-primary[type="submit"]'),
        ]);
        await page.waitForSelector('.o_erpico_sidebar', { timeout: 60000 });

        // Runner de tests JS de Odoo (Hoot)
        const url = `${BASE}/web/tests?module=erpico_web_sidebar`;
        console.log(`Runner: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });

        // Espera a que el runner termine (mocha deja de actualizar)
        await page.waitForFunction(
            () => !!document.querySelector('#mocha-stats') || !!document.querySelector('.o_test_runner'),
            { timeout: 120000 }
        );
        await sleep(8000);

        const result = await page.evaluate(() => {
            const num = sel => {
                const el = document.querySelector(sel);
                return el ? parseInt(el.textContent.trim(), 10) : null;
            };
            const stats = document.querySelector('#mocha-stats');
            const failures = [...document.querySelectorAll('#mocha-report .test.fail h2, .test.fail')]
                .map(el => el.textContent.trim().split('\n')[0]);
            return {
                passes: num('#mocha-stats .passes em') ?? num('.passes em'),
                failures: num('#mocha-stats .failures em') ?? num('.failures em'),
                pending: num('#mocha-stats .pending em') ?? num('.pending em'),
                duration: num('#mocha-stats .duration em'),
                statsText: stats ? stats.innerText.replace(/\n+/g, ' | ') : null,
                failedTests: failures.slice(0, 10),
                title: document.title,
            };
        });

        console.log('');
        console.log('--- Resultado Hoot ---');
        console.log(`  title:    ${result.title}`);
        console.log(`  passes:   ${result.passes}`);
        console.log(`  failures: ${result.failures}`);
        console.log(`  pending:  ${result.pending}`);
        console.log(`  duración:  ${result.duration} ms`);
        if (result.failedTests.length) {
            console.log('  tests fallidos:');
            result.failedTests.forEach(t => console.log(`    - ${t}`));
        }
        const ok = result.failures === 0 && result.passes > 0;
        console.log('');
        console.log(ok
            ? `Hoot OK: ${result.passes} test(s) pass, 0 fail`
            : `Hoot FALLA: ${result.failures} fallo(s) de ${result.passes + (result.failures || 0)}`);
        if (errors.length) {
            console.log(`  errores JS de pagina: ${errors.length}`);
            errors.forEach(e => console.log(`    - ${e}`));
        }
    } catch (e) {
        console.log(`ERROR: ${e.message}`);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
}

main().catch(e => { console.error(e); process.exit(1); });
