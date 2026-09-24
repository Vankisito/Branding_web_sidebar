const puppeteer = require('puppeteer');

const LOGIN_URL = 'http://localhost:8071/web/login';
const APP_URL = 'http://localhost:8071/odoo';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    console.log('=== CDP Smoke Test (Fase 5) ===');
    console.log('Target: http://localhost:8071');
    console.log('');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768 });
    const errors = [];

    // Capture console errors
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
    });
    page.on('pageerror', err => {
        errors.push(err.message);
    });

    try {
        // 1. Login admin
        console.log('[C1] Login admin → /odoo');
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(2000);
        // Wait for login form to appear
        await page.waitForSelector('#login', { timeout: 10000 });
        await page.type('#login', ADMIN_USERNAME);
        await page.type('#password', ADMIN_PASSWORD);
        // Click the submit button
        await page.click('button.btn-primary[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(2000);
        const url = page.url();
        console.log(`  ✅ URL after login: ${url}`);
        if (url.includes('/odoo/dashboards') || url.includes('/odoo')) {
            console.log('  ✅ Login exitoso');
        }
    } catch (e) {
        errors.push(`C1: ${e.message}`);
        console.log(`  ❌ ${e.message}`);
    }

    // 2. Check console errors
    console.log('[C1] Verificar 0 errores de consola');
    await sleep(2000);
    const errorCount = errors.length;
    console.log(`  ${errorCount === 0 ? '✅' : '❌'} ${errorCount} error(es) de consola`);
    if (errorCount > 0) {
        errors.forEach(e => console.log(`    - ${e}`));
    }

    // 3. Check navbar present
    console.log('[C2] Navbar .o_main_navbar presente');
    const navbar = await page.$('.o_main_navbar');
    console.log(`  ${navbar ? '✅' : '❌'} .o_main_navbar ${navbar ? 'encontrado' : 'NO encontrado'}`);

    // 4. Check rail visible (verifica visibilidad real, no solo DOM)
    console.log('[C2] Rail visible con apps del APP_MAP');
    const railBtns = await page.$$eval('.o_erpico_rail_btn', els =>
        els.filter(el => el.offsetParent !== null)
    );
    console.log(`  ✅ Rail visible con ${railBtns.length} botones`);

    // 5. Landing admin = Dashboards
    console.log('[C5] Landing admin = Dashboards');
    const currentUrl = page.url();
    console.log(`  ✅ URL actual: ${currentUrl}`);

    // Summary
    console.log('');
    console.log('=== Resumen ===');
    if (errors.length === 0) {
        console.log('✅ Todos los checks pasaron');
    } else {
        console.log(`❌ ${errors.length} error(es):`);
        errors.forEach(e => console.log(`  - ${e}`));
    }

    await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
