  "use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  ArrowRight, 
  Layers, 
  ShieldCheck, 
  HardDrive, 
  Cpu,
  Network,
  Wrench
} from "lucide-react";

export default function OpenClawArchPage() {
  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/learning" className="hover:text-slate-300 transition-colors">
          Learning
        </Link>
        <span>/</span>
        <span className="text-slate-300">OpenClaw Architecture</span>
      </div>

      {/* Hero Section */}
      <div className="space-y-4">
        <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30">Module 8 (Architecture)</Badge>
        <h1 className="text-4xl font-bold text-slate-100 flex items-center gap-3">
          <Layers className="w-8 h-8 text-purple-400" />
          OpenClaw Architecture
        </h1>
        <p className="text-lg text-slate-400">
          The 6-Layer Topology for Sovereign Document & Trading Orchestration.
        </p>
      </div>

      {/* The 6 Layers */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-slate-200">The 6-Layer Stack</h2>
        <div className="space-y-4">
          {[
            { layer: 1, name: "Surfaces", icon: <Badge variant="outline">UI/CLI</Badge>, desc: "The primary interaction boundaries. Next.js dashboard and administrative CLI." },
            { layer: 2, name: "Channels", icon: <Network className="w-4 h-4 text-sky-400" />, desc: "Protocol adapters: Webhooks, Filesystem watchers, and Messaging (Telegram/Slack)." },
            { layer: 3, name: "Routing & Sessions", icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />, desc: "State core. Manages session isolation and concurrent execution rules." },
            { layer: 4, name: "Gateway", icon: <HardDrive className="w-4 h-4 text-amber-400" />, desc: "Control plane. Node.js daemon owning total ingress/egress and security boundaries." },
            { layer: 5, name: "Runtime", icon: <Cpu className="w-4 h-4 text-purple-400" />, desc: "The logic substrate. Assembles context and manages the deterministic execution loop." },
            { layer: 6, name: "Tools & Capabilities", icon: <Wrench className="w-4 h-4 text-rose-400" />, desc: "Execution modules: Filesystem I/O, Docker sandboxes, and Quant analysis engines." },
          ].map((l) => (
            <div key={l.layer} className="flex gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center border border-slate-800 shrink-0 text-xs font-bold text-slate-500">
                L{l.layer}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-100">{l.name}</h3>
                  {l.icon}
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">{l.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Philosophical Shift */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200">Philosophical Shift: Local-First</h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-slate-300 italic">
              "OpenClaw treats Markdown files as the absolute source of truth. No complex databases, just human-readable persistence."
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <li className="p-3 rounded bg-slate-950 border border-slate-800 text-xs text-slate-400">
                <strong className="text-slate-200 block mb-1">Data Sovereignty</strong>
                Execution and data remain strictly on the user's hardware.
              </li>
              <li className="p-3 rounded bg-slate-950 border border-slate-800 text-xs text-slate-400">
                <strong className="text-slate-200 block mb-1">Deterministic Tools</strong>
                Rigid toolsets (Read, Write, Edit, Bash) ensure repeatable results.
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <Link href="/learning/quant-validation">
          <Button variant="ghost" className="text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-4 h-4 mr-2" /> Previous: Validation
          </Button>
        </Link>
        <Link href="/learning/temporal-anomalies">
          <Button className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6">
            Next: Temporal Anomalies <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
