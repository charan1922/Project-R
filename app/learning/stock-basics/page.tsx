import LearningModule from "@/app/components/LearningModule";

export default function StockBasicsPage() {
  return (
    <LearningModule
      moduleNumber={1}
      title="Stock Market Basics"
      description="Understand the fundamental building blocks of stock markets, how exchanges like NSE and BSE operate, and the forces that drive stock prices in India."
      sections={[
        {
          title: "What is a Stock Market?",
          content:
            "A stock market is a marketplace where shares of publicly listed companies are bought and sold. In India, the two primary exchanges are the National Stock Exchange (NSE) and the Bombay Stock Exchange (BSE). NSE is the dominant exchange for derivatives (F&O) trading, which is central to the strategies we will learn.\n\nWhen you buy a share of a company, you own a tiny fraction of that company. The price of that share fluctuates based on supply (sellers) and demand (buyers). Understanding this price discovery mechanism is the first step toward algorithmic trading.",
          keyPoints: [
            "NSE is the primary exchange for F&O (Futures & Options) trading in India.",
            "Stock prices are determined by supply and demand in real-time.",
            "The Nifty 50 index represents the top 50 companies by market capitalization on NSE.",
          ],
        },
        {
          title: "Types of Market Participants",
          content:
            'Understanding who trades in the market is crucial. There are broadly three types:\n\n1. Retail Traders: Individual investors and traders with relatively smaller capital. They often rely on tips, charts, or basic technical analysis.\n\n2. Institutional Investors: Mutual funds, insurance companies (LIC, HDFC Life), and pension funds. They move large capital and think in terms of "accumulation" and "distribution" over days or weeks.\n\n3. Foreign Institutional Investors (FIIs): Global funds that allocate capital to Indian markets. Their flow data is published daily and significantly impacts market direction.\n\nThe "Deep Quant" strategy focuses on detecting the footprints of Categories 2 and 3, which we call "Smart Money." Their large orders leave detectable statistical anomalies in volume and open interest data.',
          keyPoints: [
            'Institutional investors and FIIs are "Smart Money" - their trades signal conviction.',
            "Retail noise can be filtered using statistical normalization (Z-scores).",
            "Smart Money moves large capital, which creates detectable volume anomalies.",
          ],
        },
        {
          title: "Order Types: Market vs Limit",
          content:
            "When placing a trade, you choose an order type:\n\nMarket Order: Execute immediately at the best available price. Used when speed is critical (\"Cheetah\" regime).\n\nLimit Order: Execute only at a specific price or better. Used when you want price precision (\"Elephant\" regime).\n\nStop-Loss Order: Automatically sell if the price drops to a certain level. Essential for risk management.\n\nIn algorithmic trading, the choice between Market and Limit orders depends on the stock's liquidity profile. High-liquidity stocks (like Reliance or HDFC Bank) can absorb Market Orders with minimal slippage. Low-liquidity stocks (like Dixon or HDFC AMC) require Limit Orders to avoid excessive impact cost.",
          keyPoints: [
            "Market Orders prioritize speed; Limit Orders prioritize price.",
            "High-liquidity stocks tolerate Market Orders with low slippage.",
            "Always use Stop-Loss orders - they are your insurance against catastrophic losses.",
          ],
        },
        {
          title: "Key Market Indices",
          content:
            "The Nifty 50 is the benchmark index of the NSE, comprising the top 50 companies. Nifty Next 50 covers the next tier. Bank Nifty focuses specifically on banking stocks.\n\nIndex movements give you the \"market context.\" If Nifty is falling 2% and your stock is flat, that stock is actually showing relative strength. The R-Factor model accounts for this by comparing each stock against its own historical behavior rather than the broad market.\n\nIndia VIX (Volatility Index) measures the market's expectation of future volatility. When VIX is high (>20), markets are fearful. When VIX is low (<13), markets are complacent. The Deep Quant strategy widens its thresholds during high-VIX environments to avoid false signals from noisy markets.",
          keyPoints: [
            "Nifty 50 is the primary benchmark. Bank Nifty tracks financial sector.",
            "India VIX measures fear/greed - high VIX means wider risk thresholds.",
            "Always interpret individual stock moves in the context of the broader market.",
          ],
        },
      ]}
      nextModule={{ href: "/learning/options-101", label: "Options Trading 101" }}
    />
  );
}
