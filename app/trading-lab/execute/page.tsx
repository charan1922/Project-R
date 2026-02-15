"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Square, 
  Settings,
  Shield,
  DollarSign,
  Target,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Wallet,
  Bot,
  Info,
  Link
} from "lucide-react";

interface AlgoSettings {
  enabled: boolean;
  capital: number;
  riskPerTrade: number;
  maxPositions: number;
  stopLoss: number;
  target: number;
  oiThreshold: number;
  breakoutThreshold: number;
}

export default function ExecutePage() {
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [positions, setPositions] = useState<any[]>([]);
  
  const [settings, setSettings] = useState<AlgoSettings>({
    enabled: false,
    capital: 100000,
    riskPerTrade: 2,
    maxPositions: 5,
    stopLoss: 3,
    target: 6,
    oiThreshold: 15,
    breakoutThreshold: 2,
  });

  const toggleAlgo = () => {
    if (!isRunning) {
      // Would start the algorithm
      alert("To run live algorithm, you need to connect a broker API (e.g., Angel One, Zerodha, Upstox)");
    }
    setIsRunning(!isRunning);
    setSettings(prev => ({ ...prev, enabled: !isRunning }));
  };

  const openPositions = positions.filter((p: any) => p.status === "OPEN");
  const totalPnl = positions.reduce((sum, p) => sum + (p.pnl || 0), 0);
  const availableCapital = settings.capital - openPositions.reduce((sum, p) => sum + ((p.entryPrice || 0) * (p.quantity || 0)), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Bot className="w-8 h-8 text-purple-400" />
            Algo Execution
          </h1>
          <p className="text-slate-400">
            Deploy automated trading algorithm (requires broker API)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowSettings(!showSettings)}
            className="border-slate-700"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button
            onClick={toggleAlgo}
            className={isRunning 
              ? "bg-red-500 hover:bg-red-600" 
              : "bg-emerald-500 hover:bg-emerald-600"
            }
          >
            {isRunning ? (
              <><Square className="w-4 h-4 mr-2" /> Stop</>
            ) : (
              <><Play className="w-4 h-4 mr-2" /> Start</>
            )}
          </Button>
        </div>
      </div>

      {/* Broker API Info */}
      <Card className="bg-amber-500/10 border-amber-500/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-400 mb-1">Broker API Required</h4>
            <p className="text-sm text-slate-400">
              Live execution requires integration with a broker API. Supported brokers:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-slate-800">Angel One</Badge>
              <Badge variant="secondary" className="bg-slate-800">Zerodha Kite</Badge>
              <Badge variant="secondary" className="bg-slate-800">Upstox</Badge>
              <Badge variant="secondary" className="bg-slate-800">5paisa</Badge>
              <Badge variant="secondary" className="bg-slate-800">ICICI Direct</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Banner */}
      <Card className={isRunning ? "bg-emerald-500/10 border-emerald-500/30" : "bg-slate-900 border-slate-800"}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-slate-500"}`} />
              <div>
                <h3 className={`font-semibold ${isRunning ? "text-emerald-400" : "text-slate-400"}`}>
                  Algorithm {isRunning ? "Running" : "Stopped"}
                </h3>
                <p className="text-sm text-slate-500">
                  {isRunning 
                    ? "Monitoring market for OI + Breakout signals..." 
                    : "Algorithm is idle. Connect broker API to start trading."}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capital Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Wallet className="w-4 h-4" />
              <span className="text-sm">Total Capital</span>
            </div>
            <div className="text-2xl font-bold text-white">₹{settings.capital.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Available</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400">₹{availableCapital.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Total P&L</span>
            </div>
            <div className={`text-2xl font-bold ${totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {totalPnl >= 0 ? "+" : ""}₹{totalPnl.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-sm">Open Positions</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">{openPositions.length} / {settings.maxPositions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" />
              Algorithm Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-white">Capital & Risk</h4>
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Capital (₹)</label>
                  <Input
                    type="number"
                    value={settings.capital}
                    onChange={(e) => setSettings({...settings, capital: parseInt(e.target.value)})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Risk per Trade (%)</label>
                  <Input
                    type="number"
                    value={settings.riskPerTrade}
                    onChange={(e) => setSettings({...settings, riskPerTrade: parseFloat(e.target.value)})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Max Positions</label>
                  <Input
                    type="number"
                    value={settings.maxPositions}
                    onChange={(e) => setSettings({...settings, maxPositions: parseInt(e.target.value)})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-white">Exit Rules</h4>
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Stop Loss (%)</label>
                  <Input
                    type="number"
                    value={settings.stopLoss}
                    onChange={(e) => setSettings({...settings, stopLoss: parseFloat(e.target.value)})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Target (%)</label>
                  <Input
                    type="number"
                    value={settings.target}
                    onChange={(e) => setSettings({...settings, target: parseFloat(e.target.value)})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-white">Signal Parameters</h4>
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">OI Threshold (%)</label>
                  <Input
                    type="number"
                    value={settings.oiThreshold}
                    onChange={(e) => setSettings({...settings, oiThreshold: parseFloat(e.target.value)})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Breakout Threshold (%)</label>
                  <Input
                    type="number"
                    value={settings.breakoutThreshold}
                    onChange={(e) => setSettings({...settings, breakoutThreshold: parseFloat(e.target.value)})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Open Positions */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Open Positions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {openPositions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No open positions. Start the algorithm to begin trading.
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              Position tracking requires broker API connection.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk Disclaimer */}
      <Card className="bg-red-500/10 border-red-500/20">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-400 mb-1">Risk Warning</h4>
            <p className="text-sm text-slate-400">
              Algorithmic trading involves significant risk. This is a demonstration interface. 
              For live trading, integrate with a broker API and start with paper trading. 
              Never risk capital you cannot afford to lose.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
