const { NseIndia } = require('stock-nse-india');

const nse = new NseIndia();

async function getFnOStocks() {
  try {
    // Get all F&O stocks
    const foStocks = await nse.getAllFNOStocks();
    console.log(JSON.stringify(foStocks, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

getFnOStocks();
