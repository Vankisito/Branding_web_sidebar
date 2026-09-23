const puppeteer = require('puppeteer');

const BASE = 'http://localhost:8071';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function waitUp(page) {
    for (let i = 0; i < 30; i++) {
        try {
            await page.goto(BASE + '/web/login', { waitUntil: 'domcontentloaded', timeout: 8000 });
            await sleep(1500);
            const ok = await page.evaluate(() => !!document.querySelector('#login input, #login'));
            if (ok) return true;
        } catch (e) { /* still starting */ }
    }
    return false;
}

async function main() {
    console.log('=== CDP Fullscreen Test (C9 / S-011a) ===');
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900 });
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));

    try {
        if (!(await waitUp(page))) { console.log('❌ Stack no levanta'); await browser.close(); return; }

        // Login
        await page.type('#login', 'admin');
        await page.type('#password', 'admin');
        await page.click('button.btn-primary[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(5000);

        await page.goto(BASE + '/odoo?debug=assets', { waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(4000);
        await page.waitForSelector('.o_erpico_sidebar', { timeout: 20000 });
        console.log('[F1] Login OK, sidebar montado');

        const base = await page.evaluate(() => {
            const s = document.querySelector('.o_erpico_sidebar');
            return { display: getComputedStyle(s).display, cls: s.className, fullscreen: s.classList.contains('o_erpico_sidebar-fullscreen-hidden') };
        });
        console.log(`[F1] Base @1600: display=${base.display} fullscreenClass=${base.fullscreen} ${base.display !== 'none' && !base.fullscreen ? '✅' : '❌'}`);
        if (base.display === 'none' || base.fullscreen) errors.push('Sidebar oculto en estado base');

        // Fullscreen real: action window target=fullscreen (rg wizard Pick a Theme, id 567)
        await page.goto(BASE + '/odoo/action-567', { waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(5000);
        const fs = await page.evaluate(() => {
            const s = document.querySelector('.o_erpico_sidebar');
            const nav = document.querySelector('.o_main_navbar');
            const kb = document.querySelector('.o_kanban_view');
            return {
                display: s ? getComputedStyle(s).display : 'NO-ELEMENT',
                fullscreenClass: s ? s.classList.contains('o_erpico_sidebar-fullscreen-hidden') : false,
                navbar: !!nav,
                kanban: !!kb,
                url: location.pathname + location.search,
            };
        });
        const fsHidden = fs.fullscreenClass && fs.display === 'none';
        console.log(`[F2] Fullscreen: ${fs.url} → sidebar display=${fs.display} class=${fs.fullscreenClass} navbar=${fs.navbar} kanban=${fs.kanban} → ${fsHidden ? '✅ oculta' : '❌ visible'}`);
        console.log(`[F2] Detalle: navbar oculto=${!fs.navbar} (core fullscreen activo)`);
        if (!fs.navbar) { console.log(`[F2] Core fullscreen CONFIRMADO✅`); } else { errors.push('Core no entró en fullscreen'); }
        if (!fsHidden) errors.push('Sidebar visible en modo fullscreen (S-018)');

        // Restaurar: navegar a otra action normal
        await page.goto(BASE + '/odoo', { waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(5000);
        const rest = await page.evaluate(() => {
            const s = document.querySelector('.o_erpico_sidebar');
            return { display: getComputedStyle(s).display, fullscreenClass: s.classList.contains('o_erpico_sidebar-fullscreen-hidden') };
        });
        const restOk = rest.display !== 'none' && !rest.fullscreenClass;
        console.log(`[F3] Restaurar @/odoo: display=${rest.display} fullscreenClass=${rest.fullscreenClass} → ${restOk ? '✅ restaurada' : '❌'}`);
        if (!restOk) errors.push('Sidebar no se restaura tras salir de fullscreen');

        console.log('');
        console.log(errors.length === 0 ? '✅ C9 PASSA — fullscreen-hide (S-011a) + S-018 corregido' : `❌ ${errors.length} error(es)`);
        errors.forEach(e => console.log('  - ' + e));
    } catch (e) {
        errors.push(e.message);
        console.log('❌ ' + e.message);
    }
    await browser.close();
}
main();