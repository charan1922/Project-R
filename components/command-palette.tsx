"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
    Activity,
    BarChart2,
    Clock,
    Database,
    Download,
    HardDrive,
    List,
    Search,
    Upload,
} from "lucide-react";

export function CommandPalette() {
    const [open, setOpen] = React.useState(false);
    const router = useRouter();

    // Toggle the menu when ⌘K is pressed
    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = React.useCallback(
        (command: () => unknown) => {
            setOpen(false);
            command();
        },
        []
    );

    return (
        <>
            <Command.Dialog
                open={open}
                onOpenChange={setOpen}
                label="Global Command Menu"
                className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-slate-950/80 backdrop-blur-sm p-4"
            >
                <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden cmdk-dialog">
                    <div className="flex items-center border-b border-slate-800 px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 text-slate-500" />
                        <Command.Input
                            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 text-slate-200"
                            placeholder="Type a command or search..."
                        />
                    </div>
                    <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 custom-scrollbar">
                        <Command.Empty className="py-6 text-center text-sm text-slate-500">
                            No results found.
                        </Command.Empty>

                        <Command.Group
                            heading="Historify Quick Links"
                            className="text-xs font-medium text-slate-500 px-2 py-1.5"
                        >
                            <Command.Item
                                onSelect={() => runCommand(() => router.push("/historify"))}
                                className="flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white aria-selected:bg-slate-800 aria-selected:text-white transition-colors"
                            >
                                <Activity className="mr-2 h-4 w-4" />
                                <span>Dashboard</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() =>
                                    runCommand(() => router.push("/historify/watchlist"))
                                }
                                className="flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white aria-selected:bg-slate-800 aria-selected:text-white transition-colors"
                            >
                                <List className="mr-2 h-4 w-4" />
                                <span>Watchlist Manager</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() =>
                                    runCommand(() => router.push("/historify/charts"))
                                }
                                className="flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white aria-selected:bg-slate-800 aria-selected:text-white transition-colors"
                            >
                                <BarChart2 className="mr-2 h-4 w-4" />
                                <span>TradingView Charts</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() =>
                                    runCommand(() => router.push("/historify/import"))
                                }
                                className="flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white aria-selected:bg-slate-800 aria-selected:text-white transition-colors"
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                <span>Import Symbols</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() =>
                                    runCommand(() => router.push("/historify/download"))
                                }
                                className="flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white aria-selected:bg-slate-800 aria-selected:text-white transition-colors"
                            >
                                <HardDrive className="mr-2 h-4 w-4" />
                                <span>Bulk Download</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() =>
                                    runCommand(() => router.push("/historify/export"))
                                }
                                className="flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white aria-selected:bg-slate-800 aria-selected:text-white transition-colors"
                            >
                                <Download className="mr-2 h-4 w-4" />
                                <span>Export Data</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() =>
                                    runCommand(() => router.push("/historify/scheduler"))
                                }
                                className="flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white aria-selected:bg-slate-800 aria-selected:text-white transition-colors"
                            >
                                <Clock className="mr-2 h-4 w-4" />
                                <span>Task Scheduler</span>
                            </Command.Item>
                        </Command.Group>

                        <Command.Group
                            heading="Other Tools"
                            className="text-xs font-medium text-slate-500 px-2 pt-2 pb-1.5 mt-2 border-t border-slate-800"
                        >
                            <Command.Item
                                onSelect={() =>
                                    runCommand(() => router.push("/trading-lab/fno-universe"))
                                }
                                className="flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white aria-selected:bg-slate-800 aria-selected:text-white transition-colors"
                            >
                                <Database className="mr-2 h-4 w-4" />
                                <span>F&O Universe</span>
                            </Command.Item>
                        </Command.Group>
                    </Command.List>
                </div>
            </Command.Dialog>
        </>
    );
}
