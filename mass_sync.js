const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const rawData = fs.readFileSync(path.join(__dirname, 'tradefinder_platform_trades.json'), 'utf8');
        const trades = JSON.parse(rawData).trades;
        const uniqueStocks = [...new Set(trades.map(t => t.stock_name).filter(Boolean))];
        console.log(`Found ${uniqueStocks.length} unique Tradefinder stocks.`);

        const fromDate = "2024-09-08"; // 1.5 years ago
        const toDate = "2026-03-08";

        console.log(`Starting massive sync for 5-min data from ${fromDate} to ${toDate}...`);

        let successCount = 0;
        let totalRows = 0;
        const failures = [];

        for (const stock of uniqueStocks) {
            console.log(`Syncing ${stock}...`);
            const payload = {
                symbol: stock,
                exchange: "NSE",
                interval: "5min",
                fromDate,
                toDate
            };

            try {
                const res = await fetch("http://localhost:5000/api/historify/sync", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    const err = await res.text();
                    throw new Error(`API failed: ${res.status} ${err}`);
                }

                const data = await res.json();
                const result = data.results[0];

                if (result.status === "success" || result.status === "up_to_date") {
                    successCount++;
                    totalRows += result.rows;
                    console.log(`  -> ${result.status} (${result.rows} rows)`);
                } else {
                    failures.push({ symbol: stock, error: result.error });
                    console.log(`  -> Failed: ${result.error}`);
                }
            } catch (e) {
                failures.push({ symbol: stock, error: e.message });
                console.log(`  -> Exception: ${e.message}`);
            }
        }

        console.log("\nSync complete! Summary:");
        console.log(`Successfully synced: ${successCount} symbols`);
        console.log(`Total rows downloaded: ${totalRows}`);

        if (failures.length > 0) {
            console.log("\nFailures:");
            failures.forEach(f => console.log(`${f.symbol}: ${f.error}`));
        }

    } catch (err) {
        console.error("Fatal error:", err);
    }
}

run();
