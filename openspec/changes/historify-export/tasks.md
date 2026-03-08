## 1. Backend Export Pipeline

- [x] 1.1 Create `app/api/historify/export/route.ts` API Handler
- [x] 1.2 Import `better-sqlite3` directly and open a read-only handle to `data/historify.db`
- [x] 1.3 Implement SQL `SELECT` queries across `historical_data` filtering by `symbols`, `interval`, and UNIX timestamp boundaries
- [x] 1.4 Format the output as a concatenated CSV string with an accurate header row and `toIST` date conversion

## 2. Frontend Export UI integration

- [x] 2.1 Refactor `app/historify/export/page.tsx` to remove the mock `setTimeout` loading
- [x] 2.2 Wire the "Export" button to call the native `fetch` API against the new Route Handler
- [x] 2.3 Implement the URL `createObjectURL` Blob handling to force browser file-attachment downloads
- [x] 2.4 Handle looping configurations for "Individual CSV" vs "Combined CSV" multi-symbol formats
