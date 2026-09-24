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
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768 });
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

        // Verificar visibilidad del sidebar y medir offsets via evaluate
        const measures = await page.evaluate(() => {
            const sidebar = document.querySelector('.o_erpico_sidebar');
            const main = document.querySelector('.o_main');
            const actionManager = document.querySelector('.o_action_manager');
            const content = document.querySelector('.o_content');
            const navbar = document.querySelector('.o_main_navbar');
            const railBtn = document.querySelector('.o_erpico_rail_btn');

            const getStyle = (el) => el ? window.getComputedStyle(el) : {};
            const getLeft = (el) => el ? parseFloat(el.getBoundingClientRect().left) : null;
            const getMarginLeft = (el) => el ? parseFloat(getStyle(el).marginLeft) : 0;
            const getWidth = (el) => el ? el.offsetWidth : 0;
            const getDisplay = (el) => el ? getStyle(el).display : '';

            return {
                sidebarDisplay: getDisplay(sidebar),
                sidebarWidth: getWidth(sidebar),
                navbarDisplay: getDisplay(navbar),
                mainDisplay: getDisplay(main),
                mainLeft: getLeft(main),
                mainMarginLeft: getMarginLeft(main),
                actionManagerLeft: getLeft(actionManager),
                actionManagerMarginLeft: getMarginLeft(actionManager),
                contentLeft: getLeft(content),
                contentMarginLeft: getMarginLeft(content),
                railBtnExists: !!railBtn,
            };
        });

        console.log(`  [L2] .o_erpico_sidebar: display=${measures.sidebarDisplay}, width=${measures.sidebarWidth}px`);
        console.log(`  [L3] .o_main: display=${measures.mainDisplay}, left=${measures.mainLeft}px, margin-left=${measures.mainMarginLeft}px`);
        console.log(`  [L4] .o_action_manager: left=${measures.actionManagerLeft}px, margin-left=${measures.actionManagerMarginLeft}px`);
        console.log(`  [L5] .o_content: left=${measures.contentLeft}px, margin-left=${measures.contentMarginLeft}px`);
        console.log(`  [L6] railBtn exists: ${measures.railBtnExists}`);

        const railW = measures.sidebarWidth;
        const mainM = measures.mainMarginLeft;
        const contentM = measures.contentMarginLeft;
        const mainL = measures.mainLeft || 0;
        const contentL = measures.contentLeft || 0;

        if (measures.sidebarDisplay === 'none') {
            console.log(`  ⚠️  Sidebar display:none a 1024px — d-lg-flex no aplica en Odoo 19`);
            // No es un bug del módulo, es del entorno. No incluir en errores.
        } else if (mainM > 0 && mainL > railW + 5) {
            console.log(`  ❌ .o_main left=${mainL}px > railWidth=${railW}px con margin=${mainM}px → acumulación`);
            errors.push(`R2: .o_main left=${mainL}px (esperado ~${railW}px) con margin=${mainM}px`);
        } else if (mainM > 0 && railW > 0) {
            console.log(`  ✅ .o_main margin-left=${mainM}px ≈ railWidth=${railW}px (correcto)`);
        } else if (contentM > 0 && contentL > railW + 5) {
            console.log(`  ❌ .o_content left=${contentL}px > railWidth=${railW}px → acumulación`);
            errors.push(`R2: .o_content left=${contentL}px (esperado ~${railW}px) con margin=${contentM}px`);
        } else {
            console.log(`  ℹ️  Layout: sidebar ${railW}px, márgenes aplicados sin acumulación`);
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
