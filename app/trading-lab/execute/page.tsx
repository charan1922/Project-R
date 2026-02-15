"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Bot
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Position {
  id: string;
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  signal: "BUY" | "SELL";
  entryTime: string;
  status: "OPEN" | "CLOSED";
}

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
  const [positions, setPositions] = useState<Position[]>([
    {
      id: "1",
      symbol: "RELIANCE",
      entryPrice: 2450,
      currentPrice: 2510,
      quantity: 50,
      pnl: 3000,
      pnlPercent: 2.45,
      signal: "BUY",
      entryTime: "2026-02-15 10:30:00",
      status: "OPEN",
    },
    {
      id: "2",
      symbol: "INFY",
      entryPrice: 1680,
      currentPrice: 1650,
      quantity: 100,
      pnl: -3000,
      pnlPercent: -1.79,
      signal: "SELL",
      entryTime: "2026-02-15 11:15:00",
      status: "OPEN",
    },
  ]);
  
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
    setIsRunning(!isRunning);
    setSettings(prev => ({ ...prev, enabled: !isRunning }));
  };

  const openPositions = positions.filter(p => p.status === "OPEN");
  const closedPositions = positions.filter(p => p.status === "CLOSED");
  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
  const availableCapital = settings.capital - openPositions.reduce((sum, p) => sum + (p.entryPrice * p.quantity), 0);

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
            Deploy and monitor automated trading algorithm
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
              <><Square className="w-4 h-4 mr-2" /> Stop Algo</>
            ) : (
              <><Play className="w-4 h-4 mr-2" /> Start Algo</>
            )}
          </Button>
        </div>
      </div>

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
                    : "Algorithm is idle. Click Start to begin trading."}
                </p>
              </div>
            </div>
            {isRunning && (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <Activity className="w-4 h-4 animate-pulse" />
                Live
              </div>
            )}
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
            Open Positions ({openPositions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {openPositions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No open positions. Algorithm will enter trades when signals trigger.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Symbol</TableHead>
                    <TableHead className="text-slate-400">Signal</TableHead>
                    <TableHead className="text-slate-400">Qty</TableHead>
                    <TableHead className="text-slate-400">Entry</TableHead>
                    <TableHead className="text-slate-400">Current</TableHead>
                    <TableHead className="text-slate-400">P&L</TableHead>
                    <TableHead className="text-slate-400">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openPositions.map((pos) => (
                    <TableRow key={pos.id} className="border-slate-800">
                      <TableCell className="font-semibold text-white">{pos.symbol}</TableCell>
                      <TableCell>
                        <Badge className={pos.signal === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}>
                          {pos.signal}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">{pos.quantity}</TableCell>
                      <TableCell className="text-slate-300">₹{pos.entryPrice}</TableCell>
                      <TableCell className="text-slate-300">₹{pos.currentPrice}</TableCell>
                      <TableCell className={pos.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {pos.pnl >= 0 ? "+" : ""}₹{pos.pnl.toLocaleString()} ({pos.pnlPercent}%)
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {pos.entryTime}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Algorithm Log */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            Algorithm Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <div className="flex items-center gap-3 p-2 rounded bg-slate-800/50">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-slate-300">Algorithm initialized with ₹{settings.capital.toLocaleString()} capital</span>
              <span className="text-xs text-slate-500 ml-auto">10:00:00</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded bg-slate-800/50">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-slate-300">BUY signal triggered for RELIANCE - Put OI +18%, Breakout +2.5%</span>
              <span className="text-xs text-slate-500 ml-auto">10:30:15</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded bg-slate-800/50">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-slate-300">Entered LONG position: RELIANCE @ ₹2450 (50 shares)</span>
              <span className="text-xs text-slate-500 ml-auto">10:30:22</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded bg-slate-800/50">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className="text-sm text-slate-300">SELL signal triggered for INFY - Call OI +16%, Breakdown -2.1%</span>
              <span className="text-xs text-slate-500 ml-auto">11:15:45</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded bg-slate-800/50">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className="text-sm text-slate-300">Entered SHORT position: INFY @ ₹1680 (100 shares)</span>
              <span className="text-xs text-slate-500 ml-auto">11:15:52</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Disclaimer */}
      <Card className="bg-amber-500/10 border-amber-500/20">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-400 mb-1">Risk Warning</h4>
            <p className="text-sm text-slate-400">
              Algorithmic trading carries significant risk. This is a demonstration interface. 
              For live trading, ensure you have proper risk management, position sizing, and 
              stop-losses configured. Start with paper trading before deploying real capital.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
