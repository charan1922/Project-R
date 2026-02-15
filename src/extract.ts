import { chromium, Page, Locator } from '@playwright/test';
import * as fs from 'fs';

const URL = 'https://web.sensibull.com/verified-pnl/fanged-okra/d1wUwvRTgrtPsD';
const TOTAL_PAGES = 1;
const OUTPUT_CSV = 'sensibull_trades.csv';
const OUTPUT_JSON = 'sensibull_trades.json';

interface Trade {
  Date: string;
  Symbol: string;
  Option_Type: string;
  Strike: string;
  Expiry: string;
  Qty: string;
  Avg_Price: string;
  LTP: string;
  P_L: string;
  Daily_Total_PnL: string;
  Verification_Timestamp: string;
  Page: number;
}

interface DailySummary {
  date: string;
  totalPnL: string;
  timestamp: string;
  numTrades: number;
  trades: Trade[];
}

function cleanNum(t: string): string {
  return t.replace(/[^\d.-]/g, '').trim() || '0';
}

function parseContract(name: string) {
  const m = name.match(/(\d+)(?:st|nd|rd|th)?\s+(\w+)\s+(\d+(?:\.\d+)?)\s+(CE|PE)/i);
  if (m) {
    const [, d, mon, strike, type] = m;
    const months: any = { 
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' 
    };
    const month = months[mon.toLowerCase().slice(0, 3)] || '01';
    const year = ['01', '02'].includes(month) ? '2026' : '2025';
    return { 
      optionType: type.toUpperCase(), 
      strike, 
      expiry: `${year}-${month}-${d.padStart(2, '0')}` 
    };
  }
  return { 
    optionType: 'STOCK', 
    strike: '', 
    expiry: '' 
  };
}

function parseDate(text: string, year: string) {
  const months: any = { 
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' 
  };
  const monthKeys = Object.keys(months).join('|');
  const regex = new RegExp(`(\\d{1,2})\\s*(${monthKeys})`, 'i');
  const m = text.match(regex);

  if (m) {
    const day = parseInt(m[1], 10);
    if (day > 31 || day < 1) {
        return { date: `${year}-01-01`, year };
    }
    const month = months[m[2].toLowerCase().slice(0, 3)];
    let y = year;
    if (month === '12' && parseInt(year) > 2024) y = '2024';
    else if (['11', '10', '09'].includes(month) && year === '2026') y = '2025';
    return { date: `${y}-${month}-${m[1].padStart(2, '0')}`, year: y };
  }
  return { date: `${year}-01-01`, year };
}

async function main() {
  console.log('='.repeat(70));
  console.log('SENSIBULL COMPLETE EXTRACTOR v2.0');
  console.log('='.repeat(70));

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const allTrades: Trade[] = [];
  const dailySummaries: DailySummary[] = [];

  console.log('\nLoading page...');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  let currentYear = '2026';

  for (let pg = 1; pg <= TOTAL_PAGES; pg++) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`PAGE ${pg}/${TOTAL_PAGES}`);
    console.log('='.repeat(70));
    
    await page.waitForTimeout(2000);

    // Get all day cards
    const cards: Locator[] = [];
    const seen = new Set<string>();
    
    for (const elem of await page.locator('text=Total P&L').all()) {
      try {
        const card = elem.locator('xpath=../..');
        const txt = await card.textContent({ timeout: 1000 });
        if (txt && /\d{1,2}[a-zA-Z]{3}/.test(txt) && !seen.has(txt)) {
          seen.add(txt);
          cards.push(card);
        }
      } catch {}
    }
    
    console.log(`Found ${cards.length} day cards`);
    let pageCount = 0;

    for (const card of cards) {
      try {
        const cardText = await card.textContent() || '';
        const stockNameMatch = cardText.match(/^[a-zA-Z]+/);
        const stockName = stockNameMatch ? stockNameMatch[0] : 'UNKNOWN';
        
        // Skip no trade days
        if (cardText.includes('NoTradeDay') || cardText.toLowerCase().includes('not shared')) {
          console.log('  [SKIP] No Trade Day');
          continue;
        }

        // Parse date
        const { date, year } = parseDate(cardText, currentYear);
        currentYear = year;
        
        // Get daily stats before clicking
        let dailyTotalPnL = '';
        let timestamp = '';
        try {
          const headerText = await page.locator('text=/Taken @/').first().textContent({ timeout: 2000 });
          timestamp = headerText || '';
        } catch {}
        
        // Click to expand
        await card.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await card.click();
        await page.waitForTimeout(2000);

        // Get expanded view stats
        try {
          const expandedText = await page.locator('text=/Total P&L/i').first().locator('xpath=../..').textContent({ timeout: 2000 });
          const pnlMatch = expandedText?.match(/[\+\-]?[\d,]+/);
          if (pnlMatch) dailyTotalPnL = cleanNum(pnlMatch[0]);
        } catch {}

        // Extract trades from table
        let dayTrades: Trade[] = [];
        
        for (const row of await page.locator('tr:has(td)').all()) {
          try {
            const cells = await row.locator('td').all();
            if (cells.length >= 5) {
              const name = (await cells[0].textContent() || '').trim();
              if (!name || name === 'Name') continue;
              
              const { optionType, strike, expiry } = parseContract(name);
              
              dayTrades.push({
                Date: date,
                Symbol: stockName,
                Option_Type: optionType,
                Strike: strike,
                Expiry: expiry,
                Qty: cleanNum(await cells[1].textContent() || ''),
                Avg_Price: cleanNum(await cells[2].textContent() || ''),
                LTP: cleanNum(await cells[3].textContent() || ''),
                P_L: cleanNum(await cells[4].textContent() || ''),
                Daily_Total_PnL: dailyTotalPnL,
                Verification_Timestamp: timestamp,
                Page: pg
              });
            }
          } catch {}
        }
        
        if (dayTrades.length > 0) {
          allTrades.push(...dayTrades);
          pageCount += dayTrades.length;
          
          dailySummaries.push({
            date,
            totalPnL: dailyTotalPnL,
            timestamp,
            numTrades: dayTrades.length,
            trades: dayTrades
          });
          
          console.log(`  ${date}: ${dayTrades.length} trades | P&L: ${dailyTotalPnL || 'N/A'}`);
        }
        
        // Collapse card
        try { 
          await card.click(); 
          await page.waitForTimeout(300); 
        } catch {}
        
      } catch (e) { 
        console.log(`  [!] Error: ${e}`); 
      }
    }
    
    console.log(`Page ${pg} Total: ${pageCount} trades | Running: ${allTrades.length}`);

    // Navigate to next page
    if (pg < TOTAL_PAGES) {
      console.log(`\nNavigating to page ${pg + 1}...`);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
      
      const btns = await page.locator('button:visible').all();
      if (btns.length >= 4) {
        await btns[2].click();
        await page.waitForTimeout(3000);
      } else {
        console.log('[!] Could not find next button');
        break;
      }
    }
  }

  // Save results
  console.log('\n' + '='.repeat(70));
  console.log(`EXTRACTION COMPLETE: ${allTrades.length} trades from ${dailySummaries.length} days`);
  console.log('='.repeat(70));

  if (allTrades.length > 0) {
    // Save CSV
    const headers = [
      'Date', 'Symbol', 'Option_Type', 'Strike', 'Expiry', 
      'Qty', 'Avg_Price', 'LTP', 'P_L', 
      'Daily_Total_PnL', 'Verification_Timestamp', 'Page'
    ];
    const rows = allTrades.map(t => 
      headers.map(h => `"${String((t as any)[h] || '').replace(/"/g, '""')}"`).join(',')
    );
    fs.writeFileSync(OUTPUT_CSV, [headers.join(','), ...rows].join('\n'), 'utf-8');
    console.log(`Saved CSV: ${OUTPUT_CSV}`);

    // Save JSON
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify({
      totalTrades: allTrades.length,
      totalDays: dailySummaries.length,
      extractedAt: new Date().toISOString(),
      trades: allTrades,
      dailySummaries
    }, null, 2), 'utf-8');
    console.log(`Saved JSON: ${OUTPUT_JSON}`);

    // Generate HTML report
    generateHTML(allTrades, dailySummaries);
  }

  await browser.close();
}

function generateHTML(trades: Trade[], summaries: DailySummary[]) {
  const totalProfit = trades.reduce((sum, t) => sum + (parseFloat(t.P_L) || 0), 0);
  const winningDays = summaries.filter(s => parseFloat(s.totalPnL) > 0).length;
  const losingDays = summaries.filter(s => parseFloat(s.totalPnL) < 0).length;
  const flatDays = summaries.filter(s => parseFloat(s.totalPnL) === 0).length;
  
  const symbolCount: Record<string, number> = {};
  trades.forEach(t => { symbolCount[t.Symbol] = (symbolCount[t.Symbol] || 0) + 1; });
  const topSymbols = Object.entries(symbolCount).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Sensibull Trading Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { text-align: center; color: #1a73e8; margin-bottom: 10px; }
    .subtitle { text-align: center; color: #666; margin-bottom: 30px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
    .stat-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; }
    .stat-value { font-size: 2em; font-weight: bold; color: #1a73e8; }
    .stat-label { color: #666; font-size: 0.9em; margin-top: 5px; }
    .profit { color: #4caf50; } .loss { color: #f44336; }
    .section { background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .section h2 { color: #333; margin-bottom: 15px; border-bottom: 2px solid #1a73e8; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; position: sticky; top: 0; }
    tr:hover { background: #f5f5f5; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: 600; }
    .badge-ce { background: #e3f2fd; color: #1976d2; }
    .badge-pe { background: #fce4ec; color: #c2185b; }
    .badge-stock { background: #f3e5f5; color: #7b1fa2; }
    .search-box { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Sensibull Trading Report</h1>
    <p class="subtitle">271 Days Verified P&L | Extracted on ${new Date().toLocaleDateString()}</p>
    
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${trades.length}</div><div class="stat-label">Total Trades</div></div>
      <div class="stat-card"><div class="stat-value">${summaries.length}</div><div class="stat-label">Trading Days</div></div>
      <div class="stat-card"><div class="stat-value ${totalProfit >= 0 ? 'profit' : 'loss'}">Rs.${totalProfit.toLocaleString()}</div><div class="stat-label">Total P&L</div></div>
      <div class="stat-card"><div class="stat-value profit">${winningDays}</div><div class="stat-label">Winning Days</div></div>
      <div class="stat-card"><div class="stat-value loss">${losingDays}</div><div class="stat-label">Losing Days</div></div>
      <div class="stat-card"><div class="stat-value">${flatDays}</div><div class="stat-label">Flat Days</div></div>
    </div>

    <div class="section">
      <h2>Top Traded Symbols</h2>
      <table><thead><tr><th>Symbol</th><th>Count</th><th>%</th></tr></thead>
      <tbody>${topSymbols.map(([sym, count]) => `<tr><td><strong>${sym}</strong></td><td>${count}</td><td>${((count/trades.length)*100).toFixed(1)}%</td></tr>`).join('')}</tbody></table>
    </div>

    <div class="section">
      <h2>All Trades</h2>
      <input type="text" class="search-box" id="search" placeholder="Search trades...">
      <div style="max-height: 600px; overflow: auto;">
        <table id="tradeTable">
          <thead><tr><th>Date</th><th>Symbol</th><th>Type</th><th>Strike</th><th>Expiry</th><th>Qty</th><th>Avg</th><th>LTP</th><th>P&L</th><th>Daily Total</th></tr></thead>
          <tbody>${trades.map(t => `<tr><td>${t.Date}</td><td><strong>${t.Symbol}</strong></td><td><span class="badge badge-${t.Option_Type.toLowerCase()}">${t.Option_Type}</span></td><td>${t.Strike||'-'}</td><td>${t.Expiry||'-'}</td><td>${t.Qty}</td><td>${t.Avg_Price}</td><td>${t.LTP}</td><td class="${parseFloat(t.P_L)>=0?'profit':'loss'}">Rs.${parseFloat(t.P_L).toLocaleString()}</td><td>Rs.${parseFloat(t.Daily_Total_PnL||'0').toLocaleString()}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <h2>Daily Summary</h2>
      <div style="max-height: 400px; overflow: auto;">
        <table><thead><tr><th>Date</th><th>Trades</th><th>Total P&L</th><th>Verification</th></tr></thead>
        <tbody>${summaries.map(s => `<tr><td>${s.date}</td><td>${s.numTrades}</td><td class="${parseFloat(s.totalPnL)>=0?'profit':'loss'}">Rs.${parseFloat(s.totalPnL||'0').toLocaleString()}</td><td>${s.timestamp}</td></tr>`).join('')}</tbody></table>
      </div>
    </div>
  </div>
  <script>document.getElementById('search').addEventListener('input',function(e){const f=e.target.value.toLowerCase();document.querySelectorAll('#tradeTable tbody tr').forEach(r=>r.style.display=r.textContent.toLowerCase().includes(f)?'':'none');});</script>
</body>
</html>`;

  fs.writeFileSync('sensibull_report.html', html, 'utf-8');
  console.log('Saved HTML: sensibull_report.html');
}

process.on('SIGINT', () => process.exit(0));
main().catch(console.error);
