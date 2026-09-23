const puppeteer = require('puppeteer');

const LOGIN_URL = 'http://localhost:8071/web/login';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    console.log('=== CDP Layout Test (R2: margin-left compensation) ===');
    console.log('');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1024,768']
    });
    const page = await browser.newPage();
    const errors = [];

    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => { errors.push(err.message); });

    try {
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(2000);
        await page.waitForSelector('#login', { timeout: 10000 });
        await page.type('#login', ADMIN_USERNAME);
        await page.type('#password', ADMIN_PASSWORD);
        await page.click('button.btn-primary[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(3000);

        await page.goto('http://localhost:8071/odoo', { waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(6000);

        // Esperar que el sidebar esté montado
        await page.waitForSelector('.o_erpico_sidebar', { timeout: 15000 });
        console.log('[L1] Login OK, sidebar montado');

        // Medir offsets
        const measures = await page.evaluate(() => {
            const rail = document.querySelector('.o_erpico_sidebar');
            const main = document.querySelector('.o_main');
            const actionManager = document.querySelector('.o_action_manager');
            const content = document.querySelector('.o_content');
            const navbar = document.querySelector('.o_main_navbar');
            const allapps = document.querySelector('.o_erpico_allapps');

            const getLeft = (el) => el ? parseFloat(el.getBoundingClientRect().left) : null;
            const getMarginLeft = (el) => el ? parseFloat(window.getComputedStyle(el).marginLeft) : null;
            const getWidth = (el) => el ? el.offsetWidth : null;

            return {
                railWidth: getWidth(rail),
                navbarLeft: getLeft(navbar),
                mainLeft: getLeft(main),
                mainMarginLeft: getMarginLeft(main),
                actionManagerLeft: getLeft(actionManager),
                actionManagerMarginLeft: getMarginLeft(actionManager),
                contentLeft: getLeft(content),
                contentMarginLeft: getMarginLeft(content),
                allappsLeft: getLeft(allapps),
            };
        });

        console.log(`  [L2] Rail width: ${measures.railWidth}px`);
        console.log(`  [L3] .o_main: left=${measures.mainLeft}px, margin-left=${measures.mainMarginLeft}px`);
        console.log(`  [L4] .o_action_manager: left=${measures.actionManagerLeft}px, margin-left=${measures.actionManagerMarginLeft}px`);
        console.log(`  [L5] .o_content: left=${measures.contentLeft}px, margin-left=${measures.contentMarginLeft}px`);

        const railW = measures.railWidth || 60;
        const mainM = measures.mainMarginLeft || 0;
        const contentM = measures.contentMarginLeft || 0;
        const mainL = measures.mainLeft || 0;
        const contentL = measures.contentLeft || 0;

        // Si .o_main tiene margin-left=60 y left=0, es correcto (rail fixed, content desplazado)
        // Si .o_main left=60 con margin=60, hay doble compensación
        if (mainM > 0 && mainL > railW + 5) {
            console.log(`  ⚠️  .o_main left=${mainL}px > railWidth=${railW}px con margin=${mainM}px → posible acumulación`);
            errors.push(`R2: .o_main left=${mainL}px (esperado ~${railW}px) con margin=${mainM}px`);
        } else if (mainM > 0) {
            console.log(`  ℹ️  .o_main margin-left=${mainM}px, left=${mainL}px (rail fixed, correcto)`);
        }

        if (contentM > 0 && mainL === 0) {
            console.log(`  ℹ️  .o_content margin-left=${contentM}px sobre .o_main (padre con margin)`);
            if (contentL > railW + 5) {
                console.log(`  ❌ .o_content left=${contentL}px > railWidth=${railW}px → acumulación`);
                errors.push(`R2: .o_content left=${contentL}px (esperado ~${railW}px) con margin=${contentM}px`);
            } else {
                console.log(`  ✅ .o_content left=${contentL}px ≈ railWidth=${railW}px`);
            }
        }

        if (mainM === 0 && contentM === 0 && mainL === 0) {
            console.log(`  ℹ️  Ningún margen compensatorio detectado (sidebar podría no tener efecto sobre layout)`);
        }

        console.log('');
        console.log('=== Resumen Layout ===');
        if (errors.length === 0) {
            console.log('✅ Layout correcto (sin acumulación de margin)');
        } else {
            console.log(`❌ ${errors.length} error(es):`);
            errors.forEach(e => console.log(`  - ${e}`));
        }
    } catch (e) {
        errors.push(e.message);
        console.log(`  ❌ ${e.message}`);
    }

    await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
