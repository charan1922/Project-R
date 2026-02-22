"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  ShieldCheck, 
  Box, 
  Network, 
  HardDrive,
  Lock,
  Server,
  Terminal
} from "lucide-react";

export default function SystemSovereigntyPage() {
  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/learning" className="hover:text-slate-300 transition-colors">
          Learning
        </Link>
        <span>/</span>
        <span className="text-slate-300">System Sovereignty</span>
      </div>

      {/* Hero Section */}
      <div className="space-y-4">
        <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30">Module 11 (Security)</Badge>
        <h1 className="text-4xl font-bold text-slate-100 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-sky-400" />
          System Sovereignty
        </h1>
        <p className="text-lg text-slate-400">
          Professional-grade security for autonomous trading. How to protect your keys, your data, and your execution substrate.
        </p>
      </div>

      {/* Docker Sandboxing */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <Box className="w-6 h-6 text-sky-400" />
          1. Docker Sandboxing
        </h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-slate-300">
              When an AI agent or automated script executes code, it must be isolated from your host system.
            </p>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Lock className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
                  <p className="text-xs text-slate-400"><strong>Filesystem Isolation:</strong> Restricting write access strictly to the workspace, denying access to `~/.ssh` or system configs.</p>
                </li>
                <li className="flex items-start gap-3">
                  <Network className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
                  <p className="text-xs text-slate-400"><strong>Network Isolation:</strong> Denying all outbound traffic by default to prevent API key exfiltration.</p>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Bi-Directional RPC */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <Server className="w-6 h-6 text-amber-400" />
          2. WebSocket RPC Mechanics
        </h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-slate-300">
              The communication between the dashboard and the analytical engine must be strongly typed and idempotent.
            </p>
            <div className="p-4 rounded-lg bg-slate-950 border border-amber-500/10">
              <h3 className="text-amber-400 font-bold text-xs uppercase mb-2">The Handshake Lifecycle</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Using cryptographic proof (device signatures) and challenge-response nonces to ensure that only authorized operators can trigger execution commands or rotate sensitive tokens.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Observability */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <Terminal className="w-6 h-6 text-rose-400" />
          3. Kernel-Level Scrutiny
        </h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100 text-lg">eBPF Runtime Tracing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-400 leading-relaxed">
              Autonomous agents can be opaque. We use <strong>eBPF-based tracers</strong> to monitor syscalls in real-time. This reveals hidden configuration scans or unauthorized subprocess chains, ensuring the "Gateway" remains a fortified checkpoint.
            </p>
            <div className="p-3 rounded bg-slate-950 border border-slate-800 text-center">
              <Badge variant="outline" className="text-rose-400 border-rose-500/20">M.A.E.S.T.R.O Threat Framework Compliant</Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Final Graduation */}
      <div className="py-8 text-center">
        <div className="inline-block p-1 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 mb-4">
          <div className="bg-slate-950 rounded-full px-8 py-2">
            <span className="text-sm font-bold text-slate-100 uppercase tracking-widest">Sovereign Quant Master</span>
          </div>
        </div>
        <p className="text-slate-500 text-sm italic mb-6">
          "The ultimate alpha is total control over your infrastructure."
        </p>
        <Link href="/learning/r-factor-engine">
          <Button className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-10 py-6 h-auto text-lg shadow-lg shadow-sky-500/20">
            LAUNCH SYSTEM CONTROL PLANE
          </Button>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <Link href="/learning/execution-microstructure">
          <Button variant="ghost" className="text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-4 h-4 mr-2" /> Previous: Microstructure
          </Button>
        </Link>
      </div>
    </div>
  );
}
