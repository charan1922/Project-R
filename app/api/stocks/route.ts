import { NextResponse } from "next/server";
import { NseIndia } from "stock-nse-india";

const nseIndia = new NseIndia();

// List of stocks to fetch
const STOCK_SYMBOLS = [
  "ADANIENSOL", "ADANIGREEN", "AMBUJACEM", "APOLLOTYRE", "ASTRAL", "ATGL", "AUROPHARMA",
  "AXISBANK", "BALKRISIND", "BANDHANBNK", "BANKINDIA", "BDL", "BHARTIARTL", "BOSCHLTD",
  "BPCL", "BSE", "BSOFT", "CIPLA", "COFORGE", "COLPAL", "CONCOR", "CROMPTON", "CUMMINSIND",
  "CYIENT", "DALBHARAT", "DELHIVERY", "DIXON", "DLF", "DRREDDY", "EICHERMOT", "ETERNAL",
  "FEDERALBNK", "GAIL", "GLENMARK", "GMRAIRPORT", "GODREJPROP", "HAL", "HCLTECH", "HDFCAMC",
  "HEROMOTOCO", "HINDALCO", "HINDPETRO", "HINDUNILVR", "HINDZINC", "ICICIGI", "ICICIPRULI",
  "IIFL", "INDIANB", "INDUSINDBK", "ITC", "JINDALSTEL", "KALYANKJIL", "KEI", "KOTAKBANK",
  "KPITTECH", "LAURUSLABS", "LICI", "LODHA", "LT", "LTIM", "LUPIN", "M&M", "MANKIND",
  "MARUTI", "MCX", "NAUKRI", "NESTLEIND", "OFSS", "OIL", "PAYTM", "PEL", "POLICYBZR",
  "POLYCAB", "PRESTIGE", "RBLBANK", "RECLTD", "RVNL", "SBICARD", "SOLARINDS", "SONACOMS",
  "TIINDIA", "TITAGARH", "TITAN", "TORNTPHARM", "TVSMOTOR", "UNIONBANK", "UPL", "ZYDUSLIFE"
];

// Sector mapping
const SECTOR_MAP: Record<string, string> = {
  ADANIENSOL: "POWER", ADANIGREEN: "ENERGY", AMBUJACEM: "CEMENT", APOLLOTYRE: "AUTO",
  ASTRAL: "FMCG", ATGL: "ENERGY", AUROPHARMA: "PHARMA", AXISBANK: "PRIVATE BANK",
  BALKRISIND: "AUTO", BANDHANBNK: "PRIVATE BANK", BANKINDIA: "PSU BANK", BDL: "DEFENCE",
  BHARTIARTL: "TELECOM", BOSCHLTD: "AUTO", BPCL: "OIL & GAS", BSE: "FINANCIAL SERVICES",
  BSOFT: "IT", CIPLA: "PHARMA", COFORGE: "IT", COLPAL: "FMCG", CONCOR: "INFRA",
  CROMPTON: "CONSUMER DURABLES", CUMMINSIND: "AUTO", CYIENT: "IT", DALBHARAT: "CEMENT",
  DELHIVERY: "INFRA", DIXON: "CONSUMER DURABLES", DLF: "REALTY", DRREDDY: "PHARMA",
  EICHERMOT: "AUTO", ETERNAL: "FMCG", FEDERALBNK: "PRIVATE BANK", GAIL: "OIL & GAS",
  GLENMARK: "PHARMA", GMRAIRPORT: "INFRA", GODREJPROP: "REALTY", HAL: "DEFENCE",
  HCLTECH: "IT", HDFCAMC: "FINANCIAL SERVICES", HEROMOTOCO: "AUTO", HINDALCO: "METAL",
  HINDPETRO: "OIL & GAS", HINDUNILVR: "FMCG", HINDZINC: "METAL", ICICIGI: "INSURANCE",
  ICICIPRULI: "INSURANCE", IIFL: "FINANCIAL SERVICES", INDIANB: "PSU BANK",
  INDUSINDBK: "PRIVATE BANK", ITC: "FMCG", JINDALSTEL: "METAL", KALYANKJIL: "FMCG",
  KEI: "INFRA", KOTAKBANK: "PRIVATE BANK", KPITTECH: "IT", LAURUSLABS: "PHARMA",
  LICI: "INSURANCE", LODHA: "REALTY", LT: "INFRA", LTIM: "IT", LUPIN: "PHARMA",
  "M&M": "AUTO", MANKIND: "PHARMA", MARUTI: "AUTO", MCX: "FINANCIAL SERVICES",
  NAUKRI: "IT", NESTLEIND: "FMCG", OFSS: "IT", OIL: "OIL & GAS", PAYTM: "FINTECH",
  PEL: "FINANCIAL SERVICES", POLICYBZR: "FINTECH", POLYCAB: "INFRA", PRESTIGE: "REALTY",
  RBLBANK: "PRIVATE BANK", RECLTD: "FINANCIAL SERVICES", RVNL: "INFRA",
  SBICARD: "FINANCIAL SERVICES", SOLARINDS: "DEFENCE", SONACOMS: "AUTO",
  TIINDIA: "AUTO", TITAGARH: "RAILWAYS", TITAN: "FMCG", TORNTPHARM: "PHARMA",
  TVSMOTOR: "AUTO", UNIONBANK: "PSU BANK", UPL: "FMCG", ZYDUSLIFE: "PHARMA"
};

export async function GET() {
  try {
    const stocks = await Promise.all(
      STOCK_SYMBOLS.map(async (symbol) => {
        try {
          const details = await nseIndia.getEquityDetails(symbol);
          const priceInfo = details.priceInfo;
          
          return {
            symbol,
            name: details.info?.companyName || symbol,
            price: priceInfo?.lastPrice || 0,
            change: priceInfo?.change || 0,
            percentChange: priceInfo?.pChange || 0,
            open: priceInfo?.open || 0,
            high: priceInfo?.intraDayHighLow?.max || 0,
            low: priceInfo?.intraDayHighLow?.min || 0,
            close: priceInfo?.close || 0,
            sector: SECTOR_MAP[symbol] || "OTHER",
            volume: details.preOpenMarket?.totalTradedVolume || 0,
          };
        } catch (err) {
          console.error(`Error fetching ${symbol}:`, err);
          return {
            symbol,
            name: symbol,
            price: 0,
            change: 0,
            percentChange: 0,
            open: 0,
            high: 0,
            low: 0,
            close: 0,
            sector: SECTOR_MAP[symbol] || "OTHER",
            volume: 0,
          };
        }
      })
    );

    // Group by sector
    const sectorData = stocks.reduce((acc, stock) => {
      const sector = stock.sector;
      if (!acc[sector]) {
        acc[sector] = {
          stocks: [],
          totalChange: 0,
          upCount: 0,
          downCount: 0,
        };
      }
      acc[sector].stocks.push(stock);
      acc[sector].totalChange += stock.percentChange;
      if (stock.percentChange > 0) acc[sector].upCount++;
      else if (stock.percentChange < 0) acc[sector].downCount++;
      return acc;
    }, {} as Record<string, any>);

    // Calculate sector performance
    Object.keys(sectorData).forEach((sector) => {
      const s = sectorData[sector];
      s.avgChange = s.stocks.length > 0 ? s.totalChange / s.stocks.length : 0;
    });

    return NextResponse.json({ 
      stocks, 
      sectorData,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock data" },
      { status: 500 }
    );
  }
}

export const revalidate = 30; // Revalidate every 30 seconds
