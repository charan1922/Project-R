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
 */
export function getParquetPath(symbol: string): string {
    return path.join(parquetDir, `${symbol}.parquet`);
}
