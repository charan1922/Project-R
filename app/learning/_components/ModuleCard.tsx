"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Module } from "../_data/curriculum";

interface ModuleCardProps {
  module: Module;
  hoverColor?: string;
}

export function ModuleCard({ module, hoverColor = "group-hover:text-sky-400" }: ModuleCardProps) {
  return (
    <Link href={module.href}>
      <Card className={`bg-slate-900 border-slate-800 hover:border-slate-700 transition-all cursor-pointer group h-full`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-lg ${module.bg} flex items-center justify-center shrink-0`}>
              <span className={module.color}>{module.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-lg font-semibold text-slate-100 ${hoverColor} transition-colors`}>
                {module.title}
              </h3>
              <p className="text-sm text-slate-400 mt-1 leading-relaxed line-clamp-2">
                {module.description}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {module.topics.map((topic) => (
                  <span
                    key={topic}
                    className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded border border-slate-700/50 uppercase font-bold"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
