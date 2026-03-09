const fs = require('fs');
const path = require('path');

// Sleep utility for rate limiting
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
    console.log("==================================================");
    console.log(" DEEPQUANT AI: 5-MIN ISOLATED F&O HISTORICAL SYNC ");
    console.log("==================================================");

    try {
        // 1. Load F&O List
        const fnoPath = path.join(__dirname, 'lib', 'data', 'fno_stocks_list.json');

        if (!fs.existsSync(fnoPath)) {
            console.error(`❌ Error: Could not find F&O stock list at ${fnoPath}`);
            process.exit(1);
        }

        const rawData = fs.readFileSync(fnoPath, 'utf8');
        const fnoData = JSON.parse(rawData);
        const stocks = fnoData.stocks;

        if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
            console.error("❌ Error: Invalid or empty F&O stocks list.");
            process.exit(1);
        }

        console.log(`Found ${stocks.length} live F&O eligible stocks.`);

        // 2. Define Date Range (only 5-min target)
        const fromDate = "2024-09-08"; // Approx 1.5 years ago
        const toDate = "2026-03-08";
        const customFolder = "parquet-5min";

        console.log(`Timeframe: 5min exclusively`);
        console.log(`Target Output Directory: data/${customFolder}`);
        console.log(`Total API Requests Planned: ${stocks.length}\n`);

        let successCount = 0;
        let upToDateCount = 0;
        let totalRows = 0;
        const failures = [];

        // 3. Main Loop
        for (let i = 0; i < stocks.length; i++) {
            const stock = stocks[i];

            const payload = {
                symbol: stock,
                exchange: "NSE",
                interval: "5min",
                fromDate,
                toDate,
                customFolder: customFolder
            };

            process.stdout.write(`[${i + 1}/${stocks.length}] ${stock.padEnd(12, ' ')} : `);

            try {
                // Call the local Next.js API
                const res = await fetch("http://localhost:5000/api/historify/sync", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    const errText = await res.text();
                    throw new Error(`HTTP ${res.status}: ${errText}`);
                }

                const data = await res.json();

                if (data && data.results && data.results[0]) {
                    const result = data.results[0];

                    if (result.status === "success") {
                        successCount++;
                        totalRows += (result.rows || 0);
                        console.log(`✅ Success (${result.rows} rows)`);
                    } else if (result.status === "up_to_date") {
                        upToDateCount++;
                        console.log(`⏩ Up to date`);
                    } else {
                        failures.push({ symbol: stock, error: result.error || "Unknown Error" });
                        console.log(`❌ Failed: ${result.error || 'Unknown'}`);
                    }
                } else {
                    throw new Error("Invalid API response format");
                }

            } catch (e) {
                failures.push({ symbol: stock, error: e.message });
                console.log(`❌ Exception: ${e.message}`);
            }

            // Wait 1.5 seconds between EVERY single API call to guarantee we never hit the Dhan V2 Rate Limit
            await sleep(1500);
        }

        // 5. Final Summary
        console.log("\n================================================");
        console.log("                5-MIN SYNC COMPLETE             ");
        console.log("================================================");
        console.log(`✔️  Successfully Downloaded/Updated: ${successCount} symbols`);
        console.log(`⏩ Already Up to Date:             ${upToDateCount} symbols`);
        console.log(`💾 Total New Rows Written:         ${totalRows.toLocaleString()}`);
        console.log(`⚠️  Total Failures:                 ${failures.length}`);

        if (failures.length > 0) {
            console.log("\n--- Failure Log ---");
            failures.forEach(f => {
                console.log(`[${f.symbol}]: ${f.error}`);
            });
        }

    } catch (err) {
        console.error("\n💥 FATAL SCRIPT ERROR:");
        console.error(err);
        process.exit(1);
    }
}

run();
