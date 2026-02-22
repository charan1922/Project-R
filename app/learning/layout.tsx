import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deep Quant Learning | Sensibull Extractor",
  description: "Master the 4-Factor R-Factor model and algorithmic trading strategies.",
};

export default function LearningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950">
      {children}
    </div>
  );
}
