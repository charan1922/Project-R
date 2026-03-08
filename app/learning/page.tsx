"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Activity,
  ArrowRight,
  GraduationCap,
  FlaskConical,
} from "lucide-react";
import { foundations, advancedLab, liveTools } from "./_data/curriculum";
import { ModuleCard } from "./_components/ModuleCard";

export default function LearningPage() {
  return (
    <div className="p-6 space-y-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-4 text-center">
        <div className="inline-flex items-center justify-center p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 mb-2">
          <GraduationCap className="w-10 h-10 text-sky-400" />
        </div>
        <h1 className="text-4xl font-bold text-slate-100">Deep Quant Curriculum</h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          A progressive, institutional-grade curriculum designed to move you from technical analysis 
          to statistical market microstructure.
        </p>
      </div>

      {/* Progress Bar */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">Curriculum Completion</span>
            <span className="text-sm text-slate-500">0 / 9 modules</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{ width: "0%" }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 1: Foundations */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
          <BookOpen className="w-5 h-5 text-sky-400" />
          <h2 className="text-2xl font-bold text-slate-100">Quant Foundations</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {foundations.map((mod) => (
            <ModuleCard key={mod.id} module={mod} />
          ))}
        </div>
      </div>

      {/* Section 2: Advanced Lab */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
          <FlaskConical className="w-5 h-5 text-purple-400" />
          <h2 className="text-2xl font-bold text-slate-100">Advanced Lab</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {advancedLab.map((mod) => (
            <ModuleCard key={mod.id} module={mod} hoverColor="group-hover:text-purple-400" />
          ))}
        </div>
      </div>

      {/* Section 3: Live Tools */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          <h2 className="text-2xl font-bold text-slate-100">Execution Tools</h2>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {liveTools.map((site) => (
            <Link key={site.href} href={site.href}>
              <Card className="bg-slate-900 border-emerald-500/20 hover:border-emerald-500/40 transition-all cursor-pointer group h-full">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400">{site.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                      {site.title}
                    </h3>
                    <p className="text-slate-400 mt-1">{site.description}</p>
                    <div className="flex items-center gap-2 mt-4 text-emerald-400 text-sm font-bold uppercase tracking-wider">
                      Launch Tool <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
