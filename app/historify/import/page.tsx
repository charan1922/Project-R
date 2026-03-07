"use client";

import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, Clipboard, CheckCircle2, XCircle, AlertTriangle, X, Download } from "lucide-react";

const KNOWN = new Set(["RELIANCE", "HDFCBANK", "INFY", "TCS", "ICICIBANK", "SBIN", "BAJFINANCE", "KOTAKBANK", "LT", "ITC", "AXISBANK", "HINDUNILVR", "MARUTI", "SUNPHARMA", "TITAN", "WIPRO", "TATASTEEL", "ADANIENT", "POWERGRID", "NTPC", "HCLTECH", "NIFTY 50", "BANKNIFTY", "TATAMOTORS", "DRREDDY", "BHARTIARTL", "ONGC", "ASIANPAINT", "ULTRACEMCO", "JSWSTEEL", "NESTLEIND", "CIPLA", "GRASIM", "HEROMOTOCO", "DIVISLAB", "TECHM"]);

type VR = { symbol: string; status: "valid" | "invalid" | "duplicate"; exchange: string };

export default function ImportPage() {
    const [mode, setMode] = useState<"file" | "paste" | "manual">("file");
    const [pasteText, setPasteText] = useState("");
    const [manualInput, setManualInput] = useState("");
    const [dragOver, setDragOver] = useState(false);
    const [results, setResults] = useState<VR[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);

    const validate = useCallback((raw: string) => {
        const syms = raw.split(/[,\n\r\t;]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
        const seen = new Set<string>();
        setResults(syms.map(sym => {
            if (seen.has(sym)) return { symbol: sym, status: "duplicate", exchange: "NSE" };
            seen.add(sym);
            return { symbol: sym, status: KNOWN.has(sym) ? "valid" : "invalid", exchange: "NSE" };
        }));
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) { setFileName(f.name); const r = new FileReader(); r.onload = ev => validate(ev.target?.result as string); r.readAsText(f); }
    }, [validate]);

    const valid = results.filter(r => r.status === "valid");
    const invalid = results.filter(r => r.status === "invalid");
    const dupes = results.filter(r => r.status === "duplicate");

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
                        <button key={key} onClick={() => { setMode(key); setResults([]); setFileName(null); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === key ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}>
                            <Icon className="w-4 h-4" />{label}
                        </button>
                    ))}
                </div>

                {mode === "file" && (
                    <div onDrop={onDrop} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${dragOver ? "border-teal-500 bg-teal-500/5" : "border-slate-700 hover:border-slate-600"}`}>
                        <Upload className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-300">Drag & drop CSV or Excel file</h3>
                        <p className="text-sm text-slate-500 mt-2">Supports .csv, .xlsx, .txt</p>
                        {fileName && (
                            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700 text-sm text-slate-300">
                                <FileSpreadsheet className="w-4 h-4 text-teal-400" />{fileName}
                                <button onClick={() => { setFileName(null); setResults([]); }}><X className="w-3.5 h-3.5 text-slate-500 hover:text-red-400" /></button>
                            </div>
                        )}
                        <div className="mt-4"><a href="#" className="text-xs text-teal-400 hover:text-teal-300 underline"><Download className="w-3 h-3 inline mr-1" />Download sample CSV template</a></div>
                    </div>
                )}

                {mode === "paste" && (
                    <div className="space-y-3">
                        <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
                            placeholder="Paste symbols (comma, tab, or newline separated):\nRELIANCE, HDFCBANK, INFY"
                            className="w-full h-48 p-4 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500 font-mono resize-none" />
                        <button onClick={() => validate(pasteText)} className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-500 rounded-lg text-white font-medium">Validate</button>
                    </div>
                )}

                {mode === "manual" && (
                    <div className="space-y-3">
                        <input value={manualInput} onChange={e => setManualInput(e.target.value)} placeholder="Type symbol (e.g., RELIANCE)"
                            className="w-full px-4 py-3 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                            onKeyDown={e => { if (e.key === "Enter" && manualInput.trim()) { validate(manualInput); setManualInput(""); } }} />
                        <p className="text-xs text-slate-500">Press Enter to validate. Separate multiple with commas.</p>
                    </div>
                )}

                {results.length > 0 && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" /><div className="text-xl font-bold text-emerald-400">{valid.length}</div><p className="text-xs text-slate-500">Valid</p>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                                <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" /><div className="text-xl font-bold text-red-400">{invalid.length}</div><p className="text-xs text-slate-500">Invalid</p>
                            </div>
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
                                <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto mb-1" /><div className="text-xl font-bold text-amber-400">{dupes.length}</div><p className="text-xs text-slate-500">Duplicates</p>
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                            {results.map((r, i) => (
                                <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-800/50 last:border-0">
                                    {r.status === "valid" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : r.status === "duplicate" ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                                    <span className="font-mono font-semibold text-sm text-white">{r.symbol}</span>
                                    <span className="text-xs text-slate-500 ml-auto">{r.exchange}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${r.status === "valid" ? "bg-emerald-500/10 text-emerald-400" : r.status === "duplicate" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"}`}>{r.status}</span>
                                </div>
                            ))}
                        </div>
                        <button disabled={valid.length === 0} className="w-full px-4 py-3 text-sm bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-white font-medium">
                            Import {valid.length} Valid Symbol{valid.length !== 1 ? "s" : ""} to Watchlist
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
