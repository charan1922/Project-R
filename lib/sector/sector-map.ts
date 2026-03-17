import fnoSectorsRaw from '@/lib/data/fno_sectors.json';
import { SECTOR_HOLDINGS, SECTORS } from '@/lib/quant/sectors';

export interface SectorStock {
  symbol: string;
  name: string;
  sector: string;
  weight: number;
}

export interface SectorInfo {
  id: string;
  name: string;
  color: string;
  stocks: SectorStock[];
  totalWeight: number;
}

const SECTOR_COLOR_MAP: Record<string, string> = {};
for (const s of SECTORS) {
  SECTOR_COLOR_MAP[s.name.toUpperCase()] = s.color;
}
// Additional colors for sectors not in SECTORS array
const EXTRA_COLORS: Record<string, string> = {
  METAL: '#795548',
  ENERGY: '#FF5722',
  AUTO: '#2196F3',
  REALTY: '#009688',
  FMCG: '#8BC34A',
  'FIN SERVICE': '#673AB7',
  PHARMA: '#E91E63',
  CEMENT: '#607D8B',
  'PSU BANK': '#FF9800',
  'PVT BANK': '#9C27B0',
  IT: '#00BCD4',
};

// Build a reverse lookup: symbol → weight from SECTOR_HOLDINGS
const weightLookup = new Map<string, number>();
for (const sectorData of Object.values(SECTOR_HOLDINGS)) {
  for (const h of sectorData.holdings) {
    // Only set if not already set (first occurrence wins — avoids duplicates across sectors)
    if (!weightLookup.has(h.symbol)) {
      weightLookup.set(h.symbol, h.weight);
    }
  }
}

// Stock display names from SECTOR_HOLDINGS
const nameLookup = new Map<string, string>();
for (const sectorData of Object.values(SECTOR_HOLDINGS)) {
  for (const h of sectorData.holdings) {
    if (!nameLookup.has(h.symbol)) {
      nameLookup.set(h.symbol, h.name);
    }
  }
}

function toTitleCase(s: string): string {
  return s
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function getSectorColor(sectorName: string): string {
  const upper = sectorName.toUpperCase();
  return SECTOR_COLOR_MAP[upper] ?? EXTRA_COLORS[upper] ?? '#9E9E9E';
}

function toSectorId(sectorName: string): string {
  return sectorName.toLowerCase().replace(/\s+/g, '-');
}

let cachedSectorMap: SectorInfo[] | null = null;

export function getSectorMap(): SectorInfo[] {
  if (cachedSectorMap) return cachedSectorMap;

  const fnoSectors = fnoSectorsRaw as Record<string, string>;
  const grouped = new Map<string, SectorStock[]>();

  for (const [symbol, sector] of Object.entries(fnoSectors)) {
    const stock: SectorStock = {
      symbol,
      name: nameLookup.get(symbol) ?? symbol,
      sector,
      weight: weightLookup.get(symbol) ?? 5.0,
    };

    const existing = grouped.get(sector);
    if (existing) {
      existing.push(stock);
    } else {
      grouped.set(sector, [stock]);
    }
  }

  const sectors: SectorInfo[] = [];
  for (const [sectorName, stocks] of grouped) {
    stocks.sort((a, b) => b.weight - a.weight);
    const totalWeight = stocks.reduce((sum, s) => sum + s.weight, 0);
    sectors.push({
      id: toSectorId(sectorName),
      name: toTitleCase(sectorName),
      color: getSectorColor(sectorName),
      stocks,
      totalWeight,
    });
  }

  sectors.sort((a, b) => b.totalWeight - a.totalWeight);
  cachedSectorMap = sectors;
  return sectors;
}

export function getAllSectorStockSymbols(): string[] {
  return getSectorMap().flatMap((s) => s.stocks.map((st) => st.symbol));
}
