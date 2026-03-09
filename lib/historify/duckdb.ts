import { DuckDBInstance, DuckDBConnection } from '@duckdb/node-api';
import path from 'path';
import fs from 'fs';

let _db: DuckDBInstance | null = null;
const parquetDir = path.join(process.cwd(), 'data', 'parquet', 'historify');

export async function getDuckDb(): Promise<DuckDBInstance> {
    if (_db) return _db;

    // Ensure the output directory exists
    if (!fs.existsSync(parquetDir)) {
        fs.mkdirSync(parquetDir, { recursive: true });
    }

    // Connect to an in-memory DuckDB instance since we are only querying/writing files
    _db = await DuckDBInstance.create(':memory:');

    // We can also run an initialization query if necessary (e.g. installing extensions)
    // N-API DuckDB instance has parquet extension built-in by default
    return _db;
}

/**
 * Helper to get the absolute path for a symbol's parquet file
 * @param symbol The trading symbol (e.g., RELIANCE)
 * @param customFolder Optional custom sub-folder (e.g., "parquet-5min")
 */
export function getParquetPath(symbol: string, customFolder?: string): string {
    const targetDir = customFolder
        ? path.join(process.cwd(), 'data', customFolder)
        : parquetDir;

    // Ensure the specific dynamic target directory exists before returning its path
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    return path.join(targetDir, `${symbol}.parquet`);
}
