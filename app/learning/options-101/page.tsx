import LearningModule from "@/app/components/LearningModule";

export default function Options101Page() {
  return (
    <LearningModule
      moduleNumber={2}
      title="Options Trading 101"
      description="Learn the fundamentals of options contracts - calls, puts, strike prices, expiry dates, and the Greeks. This knowledge is critical for understanding the Open Interest (OI) data used in the R-Factor model."
      sections={[
        {
          title: "What is an Options Contract?",
          content:
            'An option gives you the right (but not the obligation) to buy or sell a stock at a predetermined price (Strike Price) before a specific date (Expiry).\n\nCall Option (CE): Right to BUY at the strike price. You buy calls when you expect the stock to go UP.\n\nPut Option (PE): Right to SELL at the strike price. You buy puts when you expect the stock to go DOWN.\n\nCritical Insight for our strategy: Option BUYERS risk only the premium they pay (a few thousand rupees per lot). Option SELLERS (writers) must put up massive margins (2-3 Lakhs per lot in India). This means sellers are predominantly institutional or well-capitalized traders. Their positioning reflects "Smart Money" conviction.',
          keyPoints: [
            "Calls = bullish bet. Puts = bearish bet.",
            "Option sellers need 2-3x more capital than buyers - they are Smart Money.",
            "The seller's perspective is the key lens for institutional flow analysis.",
          ],
        },
        {
          title: "Strike Price and Moneyness",
          content:
            "The Strike Price is the price at which the option can be exercised.\n\nITM (In-The-Money): Calls with strike below current price, puts with strike above.\nATM (At-The-Money): Strike closest to the current market price.\nOTM (Out-Of-The-Money): Calls with strike above current price, puts with strike below.\n\nFor the Deep Quant strategy, ATM and near-ATM strikes carry the most weight. The algorithm tracks OI changes across the nearest 10 ITM and 10 OTM strikes to compute the Net Institutional Sentiment Score. ATM strikes are weighted higher using the option Delta (Greek), ensuring that the most price-sensitive positions dominate the signal.",
          keyPoints: [
            "ATM options have the highest Delta and are most price-sensitive.",
            "The algorithm scans 20 strikes (10 ITM + 10 OTM) for each stock.",
            "OI concentration at specific strikes reveals institutional support/resistance levels.",
          ],
        },
        {
          title: "Expiry Cycles in NSE F&O",
          content:
            "NSE F&O contracts have weekly and monthly expiry cycles:\n\nWeekly: Every Thursday (for Nifty, Bank Nifty, and major stocks).\nMonthly: Last Thursday of each month.\n\nExpiry week behavior is unique - Open Interest tends to unwind as positions close. The R-Factor model accounts for this by adjusting the lookback window during expiry weeks. Volume naturally increases near expiry due to rollover activity, which can create false signals if not normalized properly.\n\nThe 20-day rolling window for Z-score calculation naturally captures one full monthly cycle, ensuring that expiry-related anomalies are accounted for in the baseline statistics.",
          keyPoints: [
            "Weekly expiries happen every Thursday for major F&O stocks.",
            "Expiry weeks see higher volume due to rollovers - the Z-score normalizes for this.",
            "The 20-day lookback window captures a full monthly cycle for robust baselines.",
          ],
        },
        {
          title: "The Option Greeks (Simplified)",
          content:
            "Option Greeks measure how an option's price changes in response to different factors:\n\nDelta: How much the option price changes for a 1-point move in the stock. ATM options have Delta ~0.5.\n\nGamma: Rate of change of Delta. Highest for ATM options near expiry.\n\nTheta: Time decay. Options lose value every day. Sellers profit from Theta.\n\nVega: Sensitivity to volatility. Higher VIX = higher option premiums.\n\nFor the R-Factor model, Delta is the most important Greek. It's used to weight the OI changes across different strikes. A change of 1000 lots in OI at an ATM strike (Delta 0.5) carries more weight than the same change at a far OTM strike (Delta 0.1).\n\nNet Sentiment Score = Sum of (Delta-weighted OI changes across Put chain) - Sum of (Delta-weighted OI changes across Call chain)",
          keyPoints: [
            "Delta measures price sensitivity - ATM options have the highest delta.",
            "Theta (time decay) benefits option sellers, which is why selling requires conviction.",
            "The R-Factor model uses Delta-weighted OI to compute Net Sentiment.",
          ],
        },
      ]}
      prevModule={{ href: "/learning/stock-basics", label: "Stock Basics" }}
      nextModule={{ href: "/learning/volume-oi", label: "Volume & OI Analysis" }}
    />
  );
}
