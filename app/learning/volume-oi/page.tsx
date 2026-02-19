import LearningModule from "@/app/components/LearningModule";

export default function VolumeOIPage() {
  return (
    <LearningModule
      moduleNumber={3}
      title="Volume & Open Interest Analysis"
      description="Volume and Open Interest (OI) are the two most powerful tools for detecting institutional activity. Learn how to read them like a quant."
      sections={[
        {
          title: "Volume: The Engine of Price Movement",
          content:
            'Volume measures the total number of shares traded in a given period. It tells you HOW MUCH activity is happening, but not the direction.\n\nKey principle: Price movement without volume is suspicious. A stock rising 3% on low volume could be a "bull trap" - a few retail buyers pushing price up temporarily before Smart Money dumps.\n\nConversely, a stock rising 3% on 3x average volume is a strong signal of institutional participation. This is exactly what the R-Factor model measures.\n\nFor example, on February 18, 2026, PNB traded 37.05 million shares against a 20-day average of ~14 million. This 2.6x volume ratio translates to a Z-Score of approximately +4.41, an extreme statistical outlier indicating massive institutional entry.',
          keyPoints: [
            "Volume confirms price moves - high volume = high conviction.",
            "Price moves on low volume are often traps (bull traps or bear traps).",
            "PNB's 37M shares on Feb 18 (vs 14M avg) = Z-Score of +4.41 = institutional entry.",
          ],
        },
        {
          title: "Open Interest: The Conviction Proxy",
          content:
            'Open Interest (OI) is unique to derivatives (futures and options). It measures the total number of outstanding contracts that have NOT been settled.\n\nUnlike volume, which resets daily, OI is cumulative. When a new buyer and a new seller create a contract, OI increases. When both close their positions, OI decreases.\n\nWhy OI matters more than volume for Smart Money detection:\n- Volume includes day traders who enter and exit within minutes (noise).\n- OI reflects positions that are being HELD - indicating conviction and commitment.\n- Option selling requires heavy margins (2-3 Lakhs/lot), so OI changes in options reflect well-capitalized institutional players.\n\nThe "Seller\'s Perspective" principle: Institutions often operate as option WRITERS (sellers). When Put OI rises while Put premiums fall, institutions are writing puts - they are betting the stock will NOT fall below that strike. This is a BULLISH signal from Smart Money.',
          keyPoints: [
            "OI = outstanding contracts being held. It measures conviction, not just activity.",
            "Rising Put OI + Falling Put premiums = Institutional bullish signal (put writing).",
            "Rising Call OI + Falling Call premiums = Institutional bearish signal (call writing).",
            "OI filters out day-trading noise, revealing only committed positions.",
          ],
        },
        {
          title: "Put/Call Ratio (PCR)",
          content:
            "The Put/Call Ratio divides total Put OI by total Call OI. It's a contrarian indicator:\n\nPCR > 1.0: More puts than calls. From the seller's perspective, institutions are writing puts, meaning they expect support at lower strikes. This is BULLISH.\n\nPCR < 1.0: More calls than puts. Institutions are writing calls, capping the upside. This is BEARISH.\n\nPCR = 1.0: Neutral/balanced market.\n\nOur OI data API scans the full option chain for 50 major NSE stocks and calculates real-time PCR values. When combined with price action (direction) and volume (intensity), the PCR provides the directional component of the R-Factor signal.\n\nExample: If RELIANCE has PCR = 1.3 and is also showing a price breakout above resistance with 2x volume, this is a high-conviction bullish \"Blast\" signal.",
          keyPoints: [
            "PCR > 1 = Bullish (from seller's perspective). PCR < 1 = Bearish.",
            "PCR works best as a contrarian indicator combined with volume confirmation.",
            "The Deep Quant strategy uses delta-weighted PCR across 20 strikes for precision.",
          ],
        },
        {
          title: "Volume + OI Combinations",
          content:
            "The real power comes from combining Volume, OI, and Price together:\n\n1. Price UP + Volume UP + OI UP = Fresh Long positions. Strongest bullish signal.\n2. Price UP + Volume UP + OI DOWN = Short covering rally. Weaker signal - shorts closing, not new longs.\n3. Price DOWN + Volume UP + OI UP = Fresh Short positions. Strongest bearish signal.\n4. Price DOWN + Volume UP + OI DOWN = Long unwinding. Weaker signal - longs exiting, not new shorts.\n\nThe R-Factor model captures these combinations through its 4-factor composite score. Volume Z-Score (40% weight) captures the intensity. OI Aggression (20% weight) captures conviction. Turnover Integral (30% weight) validates capital flow. Spread Efficiency (10% weight) detects urgency.\n\nA true \"Blast\" trade requires ALL factors to align - that's what makes it statistically significant.",
          keyPoints: [
            "Price + Volume + OI all rising = strongest bullish signal (fresh longs).",
            "Price + Volume rising but OI falling = weaker signal (short covering).",
            "The R-Factor requires ALL 4 factors to align for a high-confidence signal.",
          ],
        },
      ]}
      prevModule={{ href: "/learning/options-101", label: "Options 101" }}
      nextModule={{ href: "/learning/z-score-r-factor", label: "Z-Score & R-Factor" }}
    />
  );
}
