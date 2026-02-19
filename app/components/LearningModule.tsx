"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Section {
  title: string;
  content: string;
  keyPoints?: string[];
}

interface LearningModuleProps {
  moduleNumber: number;
  title: string;
  description: string;
  sections: Section[];
  prevModule?: { href: string; label: string };
  nextModule?: { href: string; label: string };
}

export default function LearningModule({
  moduleNumber,
  title,
  description,
  sections,
  prevModule,
  nextModule,
}: LearningModuleProps) {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/learning" className="hover:text-slate-300 transition-colors">
          Learning
        </Link>
        <span>/</span>
        <span className="text-slate-300">Module {moduleNumber}</span>
      </div>

      {/* Header */}
      <div className="space-y-3">
        <Badge variant="secondary" className="bg-slate-800 text-slate-400">
          Module {moduleNumber} of 7
        </Badge>
        <h1 className="text-3xl font-bold text-slate-100">{title}</h1>
        <p className="text-slate-400 leading-relaxed">{description}</p>
      </div>

      {/* Content Sections */}
      <div className="space-y-6">
        {sections.map((section, index) => (
          <Card key={index} className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-1">
                  <span className="text-sm font-bold text-emerald-400">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-slate-100 mb-3">
                    {section.title}
                  </h3>
                  <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                    {section.content}
                  </div>
                  {section.keyPoints && section.keyPoints.length > 0 && (
                    <div className="mt-4 bg-slate-800/50 rounded-lg p-4">
                      <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                        Key Takeaways
                      </h4>
                      <ul className="space-y-2">
                        {section.keyPoints.map((point, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-slate-300"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        {prevModule ? (
          <Link href={prevModule.href}>
            <Button variant="outline" className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {prevModule.label}
            </Button>
          </Link>
        ) : (
          <div />
        )}
        {nextModule ? (
          <Link href={nextModule.href}>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-slate-100">
              {nextModule.label}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        ) : (
          <Link href="/backtesting/playground">
            <Button className="bg-sky-600 hover:bg-sky-700 text-slate-100">
              Try Backtesting Playground
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
