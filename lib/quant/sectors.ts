/**
 * NSE Sector Configuration for Sector Rotation Map (RRG)
 * Ported from marketcalls/sector-rotation-map
 */

export interface SectorMeta {
    symbol: string;
    name: string;
    color: string;
}

export interface HoldingEntry {
    symbol: string;
    name: string;
    weight: number;
}

export const SECTORS: SectorMeta[] = [
    { symbol: "NIFTYIT", name: "IT", color: "#00BCD4" },
    { symbol: "NIFTYAUTO", name: "Auto", color: "#2196F3" },
    { symbol: "NIFTYPHARMA", name: "Pharma", color: "#E91E63" },
    { symbol: "NIFTYENERGY", name: "Energy", color: "#FF5722" },
    { symbol: "NIFTYFMCG", name: "FMCG", color: "#8BC34A" },
    { symbol: "NIFTYMETAL", name: "Metal", color: "#795548" },
    { symbol: "NIFTYREALTY", name: "Realty", color: "#009688" },
    { symbol: "NIFTYPVTBANK", name: "Pvt Bank", color: "#9C27B0" },
    { symbol: "NIFTYPSUBANK", name: "PSU Bank", color: "#FF9800" },
    { symbol: "NIFTYMEDIA", name: "Media", color: "#F7931A" },
    { symbol: "NIFTYINFRA", name: "Infra", color: "#9E9E9E" },
    { symbol: "NIFTYCOMMODITIES", name: "Commodities", color: "#FFEB3B" },
];

export const BENCHMARKS: { symbol: string; name: string }[] = [
    { symbol: "NIFTY", name: "Nifty 50" },
    { symbol: "BANKNIFTY", name: "Bank Nifty" },
    { symbol: "NIFTY500", name: "Nifty 500" },
    { symbol: "NIFTYNXT50", name: "Nifty Next 50" },
    { symbol: "MIDCPNIFTY", name: "Midcap Nifty" },
    { symbol: "FINNIFTY", name: "Fin Nifty" },
];

/** All known NSE_INDEX symbols (for exchange detection) */
export const NSE_INDEX_SYMBOLS = new Set([
    "NIFTY", "NIFTYNXT50", "FINNIFTY", "BANKNIFTY", "MIDCPNIFTY", "INDIAVIX",
    "NIFTY100", "NIFTY200", "NIFTY500", "NIFTYALPHA50", "NIFTYAUTO",
    "NIFTYCOMMODITIES", "NIFTYCONSUMPTION", "NIFTYCPSE", "NIFTYDIVOPPS50",
    "NIFTYENERGY", "NIFTYFMCG", "NIFTYGROWSECT15", "NIFTYINFRA", "NIFTYIT",
    "NIFTYMEDIA", "NIFTYMETAL", "NIFTYMIDCAP100", "NIFTYMIDCAP150",
    "NIFTYMIDCAP50", "NIFTYMIDSML400", "NIFTYMNC", "NIFTYPHARMA",
    "NIFTYPSE", "NIFTYPSUBANK", "NIFTYPVTBANK", "NIFTYREALTY",
    "NIFTYSERVSECTOR", "NIFTYSMLCAP100", "NIFTYSMLCAP250", "NIFTYSMLCAP50",
]);

/** Sector holdings (top 10 constituents with weights) */
export const SECTOR_HOLDINGS: Record<string, { name: string; holdings: HoldingEntry[] }> = {
    NIFTYIT: {
        name: "IT",
        holdings: [
            { symbol: "TCS", name: "TCS", weight: 28.5 },
            { symbol: "INFY", name: "Infosys", weight: 25.2 },
            { symbol: "HCLTECH", name: "HCL Tech", weight: 11.8 },
            { symbol: "WIPRO", name: "Wipro", weight: 7.5 },
            { symbol: "TECHM", name: "Tech Mahindra", weight: 6.2 },
            { symbol: "LTIM", name: "LTIMindtree", weight: 5.8 },
            { symbol: "PERSISTENT", name: "Persistent Systems", weight: 3.5 },
            { symbol: "COFORGE", name: "Coforge", weight: 3.2 },
            { symbol: "MPHASIS", name: "Mphasis", weight: 2.8 },
            { symbol: "LTTS", name: "L&T Technology", weight: 2.5 },
        ],
    },
    NIFTYAUTO: {
        name: "Auto",
        holdings: [
            { symbol: "M&M", name: "Mahindra & Mahindra", weight: 18.5 },
            { symbol: "MARUTI", name: "Maruti Suzuki", weight: 15.2 },
            { symbol: "TATAMOTORS", name: "Tata Motors", weight: 12.8 },
            { symbol: "BAJAJ-AUTO", name: "Bajaj Auto", weight: 8.5 },
            { symbol: "HEROMOTOCO", name: "Hero MotoCorp", weight: 6.2 },
            { symbol: "EICHERMOT", name: "Eicher Motors", weight: 5.8 },
            { symbol: "BALKRISIND", name: "Balkrishna Ind", weight: 3.5 },
            { symbol: "MOTHERSON", name: "Motherson Sumi", weight: 3.2 },
            { symbol: "BHARATFORG", name: "Bharat Forge", weight: 2.8 },
            { symbol: "ASHOKLEY", name: "Ashok Leyland", weight: 2.5 },
        ],
    },
    NIFTYPHARMA: {
        name: "Pharma",
        holdings: [
            { symbol: "SUNPHARMA", name: "Sun Pharma", weight: 25.5 },
            { symbol: "DRREDDY", name: "Dr Reddy's", weight: 12.8 },
            { symbol: "CIPLA", name: "Cipla", weight: 11.5 },
            { symbol: "DIVISLAB", name: "Divi's Labs", weight: 8.2 },
            { symbol: "APOLLOHOSP", name: "Apollo Hospitals", weight: 7.5 },
            { symbol: "TORNTPHARM", name: "Torrent Pharma", weight: 5.8 },
            { symbol: "LUPIN", name: "Lupin", weight: 5.2 },
            { symbol: "AUROPHARMA", name: "Aurobindo Pharma", weight: 4.5 },
            { symbol: "BIOCON", name: "Biocon", weight: 3.8 },
            { symbol: "ALKEM", name: "Alkem Labs", weight: 3.2 },
        ],
    },
    NIFTYENERGY: {
        name: "Energy",
        holdings: [
            { symbol: "RELIANCE", name: "Reliance Industries", weight: 30.5 },
            { symbol: "NTPC", name: "NTPC", weight: 12.8 },
            { symbol: "POWERGRID", name: "Power Grid Corp", weight: 8.5 },
            { symbol: "ONGC", name: "ONGC", weight: 7.2 },
            { symbol: "ADANIGREEN", name: "Adani Green Energy", weight: 6.5 },
            { symbol: "BPCL", name: "BPCL", weight: 5.8 },
            { symbol: "IOC", name: "Indian Oil Corp", weight: 4.5 },
            { symbol: "TATAPOWER", name: "Tata Power", weight: 4.2 },
            { symbol: "COALINDIA", name: "Coal India", weight: 3.8 },
            { symbol: "GAIL", name: "GAIL India", weight: 3.2 },
        ],
    },
    NIFTYFMCG: {
        name: "FMCG",
        holdings: [
            { symbol: "HINDUNILVR", name: "Hindustan Unilever", weight: 22.5 },
            { symbol: "ITC", name: "ITC", weight: 18.8 },
            { symbol: "NESTLEIND", name: "Nestle India", weight: 8.5 },
            { symbol: "BRITANNIA", name: "Britannia", weight: 6.2 },
            { symbol: "GODREJCP", name: "Godrej Consumer", weight: 5.5 },
            { symbol: "DABUR", name: "Dabur India", weight: 5.2 },
            { symbol: "MARICO", name: "Marico", weight: 4.8 },
            { symbol: "COLPAL", name: "Colgate-Palmolive", weight: 4.5 },
            { symbol: "TATACONSUM", name: "Tata Consumer", weight: 4.2 },
            { symbol: "UBL", name: "United Breweries", weight: 3.5 },
        ],
    },
    NIFTYMETAL: {
        name: "Metal",
        holdings: [
            { symbol: "TATASTEEL", name: "Tata Steel", weight: 18.5 },
            { symbol: "JSWSTEEL", name: "JSW Steel", weight: 15.2 },
            { symbol: "HINDALCO", name: "Hindalco", weight: 14.8 },
            { symbol: "ADANIENT", name: "Adani Enterprises", weight: 10.5 },
            { symbol: "COALINDIA", name: "Coal India", weight: 8.2 },
            { symbol: "VEDL", name: "Vedanta", weight: 7.5 },
            { symbol: "NMDC", name: "NMDC", weight: 5.8 },
            { symbol: "SAIL", name: "SAIL", weight: 4.5 },
            { symbol: "NATIONALUM", name: "National Aluminium", weight: 3.8 },
            { symbol: "JINDALSTEL", name: "Jindal Steel", weight: 3.2 },
        ],
    },
    NIFTYREALTY: {
        name: "Realty",
        holdings: [
            { symbol: "DLF", name: "DLF", weight: 22.5 },
            { symbol: "GODREJPROP", name: "Godrej Properties", weight: 15.2 },
            { symbol: "OBEROIRLTY", name: "Oberoi Realty", weight: 12.8 },
            { symbol: "PRESTIGE", name: "Prestige Estates", weight: 10.5 },
            { symbol: "PHOENIXLTD", name: "Phoenix Mills", weight: 8.5 },
            { symbol: "BRIGADE", name: "Brigade Enterprises", weight: 6.2 },
            { symbol: "LODHA", name: "Macrotech Developers", weight: 5.8 },
            { symbol: "SOBHA", name: "Sobha", weight: 4.5 },
            { symbol: "SUNTECK", name: "Sunteck Realty", weight: 3.8 },
            { symbol: "IBREALEST", name: "Indiabulls Real Est", weight: 3.2 },
        ],
    },
    NIFTYPVTBANK: {
        name: "Pvt Bank",
        holdings: [
            { symbol: "HDFCBANK", name: "HDFC Bank", weight: 28.5 },
            { symbol: "ICICIBANK", name: "ICICI Bank", weight: 22.5 },
            { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", weight: 12.8 },
            { symbol: "AXISBANK", name: "Axis Bank", weight: 10.5 },
            { symbol: "INDUSINDBK", name: "IndusInd Bank", weight: 5.8 },
            { symbol: "BANDHANBNK", name: "Bandhan Bank", weight: 3.5 },
            { symbol: "FEDERALBNK", name: "Federal Bank", weight: 3.2 },
            { symbol: "IDFCFIRSTB", name: "IDFC First Bank", weight: 2.8 },
            { symbol: "RBLBANK", name: "RBL Bank", weight: 2.5 },
            { symbol: "AUBANK", name: "AU Small Finance Bank", weight: 2.2 },
        ],
    },
    NIFTYPSUBANK: {
        name: "PSU Bank",
        holdings: [
            { symbol: "SBIN", name: "SBI", weight: 30.5 },
            { symbol: "BANKBARODA", name: "Bank of Baroda", weight: 12.8 },
            { symbol: "PNB", name: "Punjab National Bank", weight: 10.5 },
            { symbol: "CANBK", name: "Canara Bank", weight: 9.2 },
            { symbol: "UNIONBANK", name: "Union Bank", weight: 7.5 },
            { symbol: "IOB", name: "Indian Overseas Bank", weight: 5.8 },
            { symbol: "INDIANB", name: "Indian Bank", weight: 5.2 },
            { symbol: "BANKINDIA", name: "Bank of India", weight: 4.8 },
            { symbol: "MAHABANK", name: "Bank of Maharashtra", weight: 3.5 },
            { symbol: "CENTRALBK", name: "Central Bank", weight: 3.2 },
        ],
    },
    NIFTYMEDIA: {
        name: "Media",
        holdings: [
            { symbol: "ZEEL", name: "Zee Entertainment", weight: 22.5 },
            { symbol: "PVR", name: "PVR INOX", weight: 18.5 },
            { symbol: "SUNTV", name: "Sun TV Network", weight: 15.2 },
            { symbol: "NETWORK18", name: "Network18", weight: 10.5 },
            { symbol: "TV18BRDCST", name: "TV18 Broadcast", weight: 8.5 },
            { symbol: "NAVNETEDUL", name: "Navneet Education", weight: 6.2 },
            { symbol: "DBCORP", name: "DB Corp", weight: 5.8 },
            { symbol: "JAGRAN", name: "Jagran Prakashan", weight: 4.5 },
            { symbol: "NDTV", name: "NDTV", weight: 4.2 },
            { symbol: "SAREGAMA", name: "Saregama India", weight: 4.1 },
        ],
    },
    NIFTYINFRA: {
        name: "Infra",
        holdings: [
            { symbol: "LT", name: "Larsen & Toubro", weight: 22.5 },
            { symbol: "RELIANCE", name: "Reliance Industries", weight: 12.8 },
            { symbol: "NTPC", name: "NTPC", weight: 8.5 },
            { symbol: "POWERGRID", name: "Power Grid Corp", weight: 7.2 },
            { symbol: "ADANIPORTS", name: "Adani Ports", weight: 6.5 },
            { symbol: "ULTRACEMCO", name: "UltraTech Cement", weight: 5.8 },
            { symbol: "GRASIM", name: "Grasim Industries", weight: 5.2 },
            { symbol: "BHARTIARTL", name: "Bharti Airtel", weight: 4.5 },
            { symbol: "TATAPOWER", name: "Tata Power", weight: 3.8 },
            { symbol: "DLF", name: "DLF", weight: 3.2 },
        ],
    },
    NIFTYCOMMODITIES: {
        name: "Commodities",
        holdings: [
            { symbol: "RELIANCE", name: "Reliance Industries", weight: 18.5 },
            { symbol: "ONGC", name: "ONGC", weight: 10.2 },
            { symbol: "TATASTEEL", name: "Tata Steel", weight: 8.5 },
            { symbol: "COALINDIA", name: "Coal India", weight: 7.2 },
            { symbol: "HINDALCO", name: "Hindalco", weight: 6.5 },
            { symbol: "JSWSTEEL", name: "JSW Steel", weight: 5.8 },
            { symbol: "GRASIM", name: "Grasim Industries", weight: 5.2 },
            { symbol: "IOC", name: "Indian Oil Corp", weight: 4.8 },
            { symbol: "BPCL", name: "BPCL", weight: 4.5 },
            { symbol: "VEDL", name: "Vedanta", weight: 3.8 },
        ],
    },
};
