"use client";

import { useState, useCallback } from "react";
import {
    Upload, FileSpreadsheet, Clipboard, CheckCircle2, XCircle, AlertTriangle, X,
    Download, Loader2, Table2,
} from "lucide-react";

const EXCHANGES = ["NSE", "NSE_INDEX", "NFO", "BSE", "BFO", "BCD", "BSE_INDEX", "MCX", "CDS"];
const KNOWN = new Set(["RELIANCE", "HDFCBANK", "INFY", "TCS", "ICICIBANK", "SBIN", "BAJFINANCE", "KOTAKBANK", "LT", "ITC", "AXISBANK", "HINDUNILVR", "MARUTI", "SUNPHARMA", "TITAN", "WIPRO", "TATASTEEL", "ADANIENT", "POWERGRID", "NTPC", "HCLTECH", "NIFTY 50", "BANKNIFTY", "TATAMOTORS", "DRREDDY", "BHARTIARTL", "ONGC", "ASIANPAINT", "ULTRACEMCO", "JSWSTEEL", "NESTLEIND", "CIPLA", "GRASIM", "HEROMOTOCO", "DIVISLAB", "TECHM"]);

type VR = { symbol: string; status: "valid" | "invalid" | "duplicate"; exchange: string };
type ParsedRow = Record<string, string>;

function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length === 0) return { headers: [], rows: [] };
    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
    const rows = lines.slice(1, 6).map(line => {
        const cells = line.split(",").map(c => c.trim().replace(/"/g, ""));
        return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""]));
    });
    return { headers, rows };
}

export default function ImportPage() {
    const [mode, setMode] = useState<"file" | "paste" | "manual">("file");
    const [pasteText, setPasteText] = useState("");
    const [manualInput, setManualInput] = useState("");
    const [manualExchange, setManualExchange] = useState("NSE");
    const [dragOver, setDragOver] = useState(false);
    const [results, setResults] = useState<VR[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    // CSV column mapping
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvPreview, setCsvPreview] = useState<ParsedRow[]>([]);
    const [symbolCol, setSymbolCol] = useState("");
    const [exchangeCol, setExchangeCol] = useState("");
    const [defaultExchange, setDefaultExchange] = useState("NSE");
    // Import progress modal
    const [importing, setImporting] = useState(false);
    const [importDone, setImportDone] = useState(false);
    const [importLog, setImportLog] = useState<string[]>([]);
    const [importProgress, setImportProgress] = useState(0);

    const validate = useCallback((raw: string, exchange = "NSE") => {
        const syms = raw.split(/[,\n\r\t;]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
        const seen = new Set<string>();
        setResults(syms.map(sym => {
            if (seen.has(sym)) return { symbol: sym, status: "duplicate", exchange };
            seen.add(sym);
            return { symbol: sym, status: KNOWN.has(sym) ? "valid" : "invalid", exchange };
        }));
    }, []);

    const handleFile = useCallback((file: File) => {
        setFileName(file.name);
        const r = new FileReader();
        r.onload = ev => {
            const text = ev.target?.result as string;
            const { headers, rows } = parseCSV(text);
            setCsvHeaders(headers);
            setCsvPreview(rows);
            // Auto-detect symbol column
            const autoSym = headers.find(h => /symbol|ticker|scrip/i.test(h)) ?? headers[0] ?? "";
            const autoExch = headers.find(h => /exchange|exch/i.test(h)) ?? "";
            setSymbolCol(autoSym);
            setExchangeCol(autoExch);
            // Build results from full file using detected column
            if (autoSym) {
                const allLines = text.trim().split(/\r?\n/).slice(1);
                const symIdx = headers.indexOf(autoSym);
                const exchIdx = autoExch ? headers.indexOf(autoExch) : -1;
                const pairs = allLines.map(line => {
                    const cells = line.split(",").map(c => c.trim().replace(/"/g, ""));
                    return { symbol: cells[symIdx]?.toUpperCase() ?? "", exchange: (exchIdx >= 0 ? cells[exchIdx] : defaultExchange) || defaultExchange };
                }).filter(p => p.symbol);
                const seen = new Set<string>();
                setResults(pairs.map(({ symbol, exchange }) => {
                    if (seen.has(symbol)) return { symbol, status: "duplicate", exchange };
                    seen.add(symbol);
                    return { symbol, status: KNOWN.has(symbol) ? "valid" : "invalid", exchange };
                }));
            }
        };
        r.readAsText(file);
    }, [defaultExchange]);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    }, [handleFile]);

    const valid = results.filter(r => r.status === "valid");

    const importToWatchlist = async () => {
        if (valid.length === 0) return;
        setImporting(true); setImportDone(false); setImportLog([]); setImportProgress(0);
        for (let i = 0; i < valid.length; i++) {
            const { symbol, exchange } = valid[i];
            try {
                const res = await fetch("/api/historify/watchlist", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ symbol, exchange }),
                });
                const ok = res.ok;
                setImportLog(prev => [...prev, `${ok ? "✓" : "✗"} ${symbol} (${exchange})`]);
            } catch {
                setImportLog(prev => [...prev, `✗ ${symbol} — network error`]);
            }
            setImportProgress(Math.round(((i + 1) / valid.length) * 100));
        }
        setImportDone(true);
    };

    const inputCls = "w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500";

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="px-6 pt-8 pb-6 border-b border-slate-800/60">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-600/20 border border-teal-500/30 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-teal-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Import Symbols</h1>
                        <p className="text-sm text-slate-500">Bulk import via CSV, clipboard paste, or manual entry</p>
                    </div>
                </div>
            </div>

            <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
                <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg w-fit">
                    {([
                        { key: "file" as const, label: "File Upload", icon: FileSpreadsheet },
                        { key: "paste" as const, label: "Paste Data", icon: Clipboard },
                        { key: "manual" as const, label: "Manual Entry", icon: Upload },
                    ]).map(({ key, label, icon: Icon }) => (
                        <button key={key} onClick={() => { setMode(key); setResults([]); setFileName(null); setCsvHeaders([]); setCsvPreview([]); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === key ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}>
                            <Icon className="w-4 h-4" />{label}
                        </button>
                    ))}
                </div>

                {/* File Mode */}
                {mode === "file" && (
                    <div className="space-y-4">
                        <div onDrop={onDrop} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${dragOver ? "border-teal-500 bg-teal-500/5" : "border-slate-700 hover:border-slate-600"}`}>
                            <Upload className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-300">Drag & drop CSV or Excel file</h3>
                            <p className="text-sm text-slate-500 mt-2">Supports .csv, .xlsx, .txt</p>
                            <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 cursor-pointer">
                                <FileSpreadsheet className="w-4 h-4" /> Browse Files
                                <input type="file" accept=".csv,.xlsx,.txt" className="hidden"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                            </label>
                            {fileName && (
                                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700 text-sm text-slate-300">
                                    <FileSpreadsheet className="w-4 h-4 text-teal-400" />{fileName}
                                    <button onClick={() => { setFileName(null); setResults([]); setCsvHeaders([]); setCsvPreview([]); }}><X className="w-3.5 h-3.5 text-slate-500 hover:text-red-400" /></button>
                                </div>
                            )}
                        </div>

                        {/* Column Mapping */}
                        {csvHeaders.length > 0 && (
                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
                                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Column Mapping</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Symbol Column *</label>
                                        <select value={symbolCol} onChange={e => setSymbolCol(e.target.value)} className={inputCls}>
                                            {csvHeaders.map(h => <option key={h}>{h}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Exchange Column (optional)</label>
                                        <select value={exchangeCol} onChange={e => setExchangeCol(e.target.value)} className={inputCls}>
                                            <option value="">— None (use default) —</option>
                                            {csvHeaders.map(h => <option key={h}>{h}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Default Exchange</label>
                                        <select value={defaultExchange} onChange={e => setDefaultExchange(e.target.value)} className={inputCls}>
                                            {EXCHANGES.map(ex => <option key={ex}>{ex}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Data Preview */}
                                {csvPreview.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-2"><Table2 className="w-4 h-4 text-slate-500" /><span className="text-xs text-slate-500 uppercase tracking-wider">Data Preview (first 5 rows)</span></div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead><tr className="border-b border-slate-800">{csvHeaders.map(h => <th key={h} className="px-3 py-2 text-left text-slate-500 font-medium">{h}</th>)}</tr></thead>
                                                <tbody>
                                                    {csvPreview.map((row, i) => (
                                                        <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/30">
                                                            {csvHeaders.map(h => <td key={h} className="px-3 py-2 text-slate-300 font-mono">{row[h] ?? ""}</td>)}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Paste Mode */}
                {mode === "paste" && (
                    <div className="space-y-3">
                        <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
                            placeholder={"Paste symbols (comma, tab, or newline separated):\nRELIANCE, HDFCBANK, INFY"}
                            className="w-full h-48 p-4 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500 font-mono resize-none" />
                        <button onClick={() => validate(pasteText)} className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-500 rounded-lg text-white font-medium">Validate</button>
                    </div>
                )}

                {/* Manual Mode */}
                {mode === "manual" && (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input value={manualInput} onChange={e => setManualInput(e.target.value)}
                                placeholder="Type symbol (e.g., RELIANCE)"
                                className="flex-1 px-4 py-3 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono uppercase"
                                onKeyDown={e => { if (e.key === "Enter" && manualInput.trim()) { validate(manualInput, manualExchange); setManualInput(""); } }} />
                            <select value={manualExchange} onChange={e => setManualExchange(e.target.value)}
                                className="px-3 py-3 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500">
                                {EXCHANGES.map(ex => <option key={ex}>{ex}</option>)}
                            </select>
                            <button onClick={() => { if (manualInput.trim()) { validate(manualInput, manualExchange); setManualInput(""); } }}
                                className="px-4 py-3 text-sm bg-teal-600 hover:bg-teal-500 rounded-lg text-white font-medium">Add</button>
                        </div>
                        <p className="text-xs text-slate-500">Press Enter or click Add to validate. Separate multiple with commas.</p>
                    </div>
                )}

                {/* Validation Results */}
                {results.length > 0 && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" /><div className="text-xl font-bold text-emerald-400">{valid.length}</div><p className="text-xs text-slate-500">Valid</p>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                                <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" /><div className="text-xl font-bold text-red-400">{results.filter(r => r.status === "invalid").length}</div><p className="text-xs text-slate-500">Invalid</p>
                            </div>
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
                                <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto mb-1" /><div className="text-xl font-bold text-amber-400">{results.filter(r => r.status === "duplicate").length}</div><p className="text-xs text-slate-500">Duplicates</p>
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                            {results.map((r, i) => (
                                <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-800/50 last:border-0">
                                    {r.status === "valid" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : r.status === "duplicate" ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                                    <span className="font-mono font-semibold text-sm text-white">{r.symbol}</span>
                                    <span className="text-xs text-slate-500">{r.exchange}</span>
                                    <span className="ml-auto text-xs px-1.5 py-0.5 rounded">{r.status}</span>
                                </div>
                            ))}
                        </div>
                        <button disabled={valid.length === 0} onClick={importToWatchlist}
                            className="w-full px-4 py-3 text-sm bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-white font-medium flex items-center justify-center gap-2">
                            <Download className="w-4 h-4" />Import {valid.length} Valid Symbol{valid.length !== 1 ? "s" : ""} to Watchlist
                        </button>
                    </div>
                )}
            </div>

            {/* Import Progress Modal */}
            {importing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Loader2 className={`w-5 h-5 ${importDone ? "hidden" : "animate-spin text-teal-400"}`} />
                            Importing Symbols
                        </h3>
                        <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
                            <span>Progress</span><span>{importProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
                            <div className="h-full bg-teal-500 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }} />
                        </div>
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs space-y-1">
                            {importLog.map((l, i) => (
                                <div key={i} className={l.startsWith("✓") ? "text-emerald-400" : "text-red-400"}>{l}</div>
                            ))}
                            {!importDone && <div className="text-slate-600 animate-pulse">importing…</div>}
                        </div>
                        {importDone && (
                            <button onClick={() => { setImporting(false); setResults([]); }}
                                className="mt-4 w-full px-4 py-2 text-sm bg-teal-600 hover:bg-teal-500 rounded-lg text-white font-medium">
                                Done — Close
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
