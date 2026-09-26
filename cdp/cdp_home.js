const puppeteer = require('puppeteer');

// D-33 — Home de ERPICO: landing real + 2 cards (Dashboards, CRM).
const LOGIN_URL = 'http://localhost:8071/web/login';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';
const ODOO_URL = 'http://localhost:8071/odoo';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    console.log('=== CDP Home Test (D-33) ===');
    console.log('');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,900']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900 });
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

        await page.goto(ODOO_URL, { waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(5000);

        // H1: el landing es el home (no el dashboard nativo)
        const home = await page.$('.o_erpico_home');
        if (!home) {
            console.log('  ❌ .o_erpico_home no renderizado en /odoo');
            errors.push('Home no es el landing');
        } else {
            console.log('  [H1] Home renderizado en /odoo');
        }

        // H2: 2 cards (Dashboards + CRM) en el orden planificado
        const cards = await page.$$eval('.o_erpico_home_card',
            els => els.map(el => el.querySelector('.o_erpico_home_card_title')?.textContent?.trim()));
        console.log(`  [H2] Cards: ${cards.length} → ${cards.join(' | ')}`);
        if (cards.length !== 2) {
            errors.push(`Se esperaban 2 cards, hay ${cards.length}`);
        }
        if (JSON.stringify(cards) !== JSON.stringify(['Dashboards', 'CRM'])) {
            errors.push(`Cards inesperadas: ${cards.join(', ')}`);
        }

        // H3: iconos renderizados
        const missingIcon = await page.$$eval('.o_erpico_home_card',
            els => els.filter(el => !el.querySelector('.o_erpico_home_card_icon img, .o_erpico_home_card_icon svg')).length);
        if (missingIcon) errors.push(`${missingIcon} cards sin icono`);

        // H4: click en la 1ra card (Dashboards) navega
        const first = await page.$('.o_erpico_home_card');
        if (first) {
            await first.click();
            await sleep(4000);
            const stillHome = await page.$('.o_erpico_home');
            if (stillHome) {
                console.log('  ❌ Click en Dashboards no navegó');
                errors.push('Card Dashboards no navega');
            } else {
                console.log('  [H4] Card Dashboards navega ✔');
            }
        } else {
            errors.push('No hay cards para clickear');
        }

        // H5: volver al home y click en CRM
        await page.goto(ODOO_URL, { waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(4000);
        const crmCard = await page.$$('.o_erpico_home_card');
        if (crmCard.length > 1) {
            await crmCard[1].click();
            await sleep(4000);
            const brand = await page.$eval('.o_erpico_module_brand', el => el.textContent.trim()).catch(() => '');
            console.log(`  [H5] Card CRM → módulo activo: "${brand}"`);
            if (!/crm|cliente/i.test(brand)) {
                errors.push(`Card CRM navegó a "${brand}" (esperado CRM)`);
            }
        }

        console.log('');
        console.log('=== Resumen Home ===');
        if (errors.length === 0) {
            console.log('✅ Home de ERPICO funcional');
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
