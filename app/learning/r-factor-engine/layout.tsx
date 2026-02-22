import { Metadata } from "next";

export const metadata: Metadata = {
  title: "R-Factor Engine | Deep Quant Lab",
  description: "Institutional flow analysis using the 4-Factor Z-Score model.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-950">{children}</div>;
}
