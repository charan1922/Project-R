const { NseIndia } = require('stock-nse-india');

const nse = new NseIndia();

async function main() {
  try {
    // Get equity master data
    const master = await nse.getEquityMaster();
    console.log("Total stocks:", master.length);
    console.log("\nSample:");
    console.log(master[0]);
    
    // Filter for F&O stocks (they have FO in series or cm_ffm column)
    const foStocks = master.filter(stock => 
      stock.series === "EQ" && stock.symbol && stock.symbol.length > 0
    );
    
    console.log("\nEQ stocks:", foStocks.length);
    
    // Save first 200 stocks
    const stocks = foStocks.slice(0, 200).map(s => s.symbol);
    console.log(JSON.stringify(stocks, null, 2));
    
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main();
