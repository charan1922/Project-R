import LearningModule from "@/app/components/LearningModule";

export default function ZScoreRFactorPage() {
  return (
    <LearningModule
      moduleNumber={4}
      title="Z-Score & R-Factor Model"
      description="The heart of the Deep Quant strategy: the 4-Factor Z-Score R-Factor Model. Learn the math behind normalizing market data to detect institutional anomalies."
      sections={[
        {
          title: "Why Standard Ratios Fail",
          content:
            'Traditional technical analysis uses simple ratios: "Buy when volume > 2x the 20-day average." This approach has a critical flaw - it ignores volatility.\n\nConsider two scenarios:\n- Scenario A: A stock normally trades 1M shares/day with very little variation (always between 900K-1.1M). Today it trades 2M. This is a MASSIVE anomaly.\n- Scenario B: A stock normally trades 1M shares/day but swings wildly (between 200K-3M). Today it trades 2M. This is NORMAL.\n\nA simple 2x ratio treats both identically. The Z-Score does not.\n\nThe Z-Score measures how many standard deviations the current value is from the mean. In Scenario A, the Z-Score might be +9.0 (extreme). In Scenario B, it might be +0.5 (normal). This is why Z-Score normalization is mathematically superior for detecting genuine institutional anomalies.',
          keyPoints: [
            "Simple ratios (Current/Average) ignore volatility and produce false signals.",
            "Z-Score = (Current - Mean) / Standard Deviation",
            "Z-Score of +3.0 means the event is 3 standard deviations above normal (99.7% probability of being significant).",
          ],
        },
        {
          title: "The Z-Score Formula",
          content:
            'For any market variable X (volume, turnover, OI), the Z-Score at time t is:\n\nZ(t) = (X(t) - Mean(X, 20-day)) / StdDev(X, 20-day)\n\nWhere:\n- X(t) is the current value\n- Mean is the 20-day Simple Moving Average (SMA)\n- StdDev is the standard deviation over the same 20-day window\n\nThe 20-day window is chosen because it represents approximately one full monthly options expiry cycle. This ensures that the baseline statistics naturally include any expiry-related volume anomalies.\n\nZ-Score interpretation:\n- Z < 1.0: Normal market activity. No signal.\n- Z = 1.5 to 2.0: Elevated activity. Monitor closely.\n- Z > 2.0: Significant anomaly. Potential institutional entry.\n- Z > 3.0: Extreme anomaly (3-Sigma event). High-confidence institutional action.\n- Z > 4.0: Rare event. Almost certainly driven by major institutional flow.',
          keyPoints: [
            "Z = (Current - Mean) / StdDev, using a 20-day rolling window.",
            "Z > 2.0 signals a potential institutional event; Z > 3.0 is high-confidence.",
            "The 20-day window aligns with the monthly F&O expiry cycle.",
          ],
        },
        {
          title: "The 4-Factor Composite R-Factor",
          content:
            "The R-Factor is a weighted composite of four Z-Scores:\n\nR = 0.40 * Z(Volume) + 0.30 * Z(Turnover) + 0.20 * Z(OI) + 0.10 * Z(Spread)\n\nFactor 1 - Volume Velocity (40% weight):\nThe raw number of shares traded, normalized. This is the \"activation gate\" - it tells the algorithm that the stock is \"in play.\"\n\nFactor 2 - Turnover Intensity (30% weight):\nTurnover = Price x Volume. This is critical for stocks like Dixon (price > 11,000) or Bajaj Auto (price > 9,000), where even moderate share volume represents massive capital flow.\n\nFactor 3 - OI Aggression (20% weight):\nThe absolute change in Open Interest, normalized. High OI change means new positions are being created (not just day-trading). This confirms institutional conviction.\n\nFactor 4 - Spread Efficiency (10% weight):\nThe Bid-Ask spread measures urgency. Aggressive institutional buying consumes Ask-side liquidity, widening the spread. This factor detects \"panic buying\" or \"panic selling\" at the microstructure level.",
          keyPoints: [
            "R = 0.4*Z(Vol) + 0.3*Z(Turn) + 0.2*Z(OI) + 0.1*Z(Spread)",
            "Volume (40%) is the activation gate; Turnover (30%) is the quality filter.",
            "OI (20%) confirms conviction; Spread (10%) detects urgency.",
          ],
        },
        {
          title: "Dynamic Thresholds: Elephant vs Cheetah",
          content:
            "Not all R-Factor scores are interpreted equally. The algorithm adjusts thresholds based on the stock's liquidity regime:\n\nElephant Stocks (High Liquidity):\nExamples: Reliance, HDFC Bank, SBI, Bharti Airtel\nThreshold: R > 1.25\nRationale: Moving a high-liquidity stock requires massive capital. Even a modest R-Factor is significant.\n\nCheetah Stocks (Low Float / High Beta):\nExamples: Dixon, Persistent Systems, HDFC AMC\nThreshold: R > 2.0\nRationale: Low-float stocks can be manipulated by relatively small capital. A higher threshold filters out fake moves.\n\nNormal Stocks (Mid-Cap):\nExamples: Aurobindo Pharma, Cipla\nThreshold: R > 1.5\nStandard threshold for most F&O stocks.\n\nMarket Phases:\nPhase 1 (The Lull): R < 1.0. No signal. Avoid trading.\nPhase 2 (The Blast): R > threshold. Trend following is safe.\nPhase 3 (Liquidation): R > 3.0 with price reversal. Take profits or reverse position.",
          keyPoints: [
            "Elephant stocks (high liquidity): R > 1.25 is significant.",
            "Cheetah stocks (low float): R > 2.0 required to filter false signals.",
            "Phase 1 = Avoid, Phase 2 = Trade with trend, Phase 3 = Exit/Reverse.",
          ],
        },
      ]}
      prevModule={{ href: "/learning/volume-oi", label: "Volume & OI" }}
      nextModule={{ href: "/learning/smart-money", label: "Smart Money Detection" }}
    />
  );
}
