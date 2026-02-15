"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Clock } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Settings className="w-8 h-8 text-emerald-400" />
          Settings
        </h1>
        <p className="text-slate-400">
          Application preferences and configuration
        </p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">
            Application settings and data management options will be available here.
          </p>
          <div className="mt-4 p-4 rounded-lg bg-slate-800">
            <p className="text-sm text-slate-500">
              ⚙️ Planned features:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-slate-400">
              <li>• Theme selection (light/dark)</li>
              <li>• Currency format preferences</li>
              <li>• Data export options</li>
              <li>• Refresh data from source</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
