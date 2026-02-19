import LearningModule from "@/app/components/LearningModule";

export default function SmartMoneyPage() {
  return (
    <LearningModule
      moduleNumber={5}
      title="Smart Money Detection"
      description='Learn to identify "Elephant" and "Cheetah" stock regimes, detect institutional footprints through microstructure analysis, and understand how the 12:40 PM pivot works.'
      sections={[
        {
          title: 'The "Elephant" Regime: Deep Liquidity, High Inertia',
          content:
            "Elephant stocks are high market-cap, deeply liquid stocks with thick order books. Think Bharti Airtel, HCL Tech, M&M, Bajaj Auto.\n\nCharacteristics:\n- Massive market capitalization (typically > 1 Lakh Crore)\n- Deep order books with tight bid-ask spreads (often just 5-10 paise)\n- Low price impact cost - even large orders don't move the price much\n- Smooth, linear volume profiles throughout the day\n\nTrading Dynamics:\nPrice movement is driven by sustained, cumulative volume over hours or days, not minutes. When an Elephant stock shows an R-Factor spike, it represents ENORMOUS capital deployment. PNB, for example, reaching R-Factor 1.88 implies approximately 264 Crores of net institutional inflow.\n\nAlgo Optimization:\nFor Elephants, the algorithm uses higher thresholds for Turnover Z-Score and executes with Limit Orders pegged to the Bid. The deep order book allows passive entry without signaling intent.",
          keyPoints: [
            "Elephant stocks: Reliance, Airtel, HDFC Bank, SBI, M&M, Bajaj Auto.",
            "Tight spreads, deep order books, low impact cost.",
            "Even modest R-Factor values are significant for Elephants.",
            "Use Limit Orders for entry; the deep liquidity allows patient execution.",
          ],
        },
        {
          title: 'The "Cheetah" Regime: High Beta, Liquidity Fragility',
          content:
            "Cheetah stocks are high-priced, lower-float stocks prone to violent moves. Think Dixon Technologies, Persistent Systems, HDFC AMC.\n\nCharacteristics:\n- High nominal share prices (Dixon > 11,000, Bajaj Auto > 9,000)\n- Lower floating stock relative to market cap\n- Prone to rapid price re-ratings on news or sector rotation\n- Liquidity can evaporate instantly during volatility events\n\nTrading Dynamics:\nBreakouts are violent and fast. The Bid-Ask spread widens rapidly as market makers pull quotes. The Turnover Z-Score often spikes before Volume Z-Score because even moderate share volume represents massive capital flow.\n\nAlgo Optimization:\nSpeed is paramount. The algorithm lowers volume thresholds to capture the initial burst. It uses Market Orders to ensure fill, accepting higher slippage. Position size is capped at a fraction of the 20-day average turnover to prevent market impact.\n\nDixon Case Study: On Feb 16, Dixon's volume spiked to 600K (vs 288K average) with a +2.93% price move. The R-Factor was 1.42 - which is massive for a low-float stock. The 68 Cr dump in 45 minutes on Feb 17 confirmed the Cheetah's fragility.",
          keyPoints: [
            "Cheetah stocks: Dixon, Persistent, HDFC AMC, Hero MotoCorp.",
            "Wide spreads during breakouts - liquidity evaporates quickly.",
            "Use Market Orders for Cheetahs to ensure fills before the move exhausts.",
            "Cap position size to avoid creating your own impact cost.",
          ],
        },
        {
          title: "The 12:40 PM Intraday Pivot",
          content:
            "12:40 PM IST is not an arbitrary time - it's a structural pivot in the Indian market.\n\nWhy 12:40 PM matters:\n\n1. European Overlap: European markets open around 12:30-1:30 PM IST. FII desks adjust their algorithms to align with global risk sentiment at this time.\n\n2. Fast Z-Score Reset: The R-Factor model calculates a secondary \"Fast Z-Score\" using a 60-minute lookback. At 12:40 PM, the morning volatility (9:15-11:00) drops out of this window, often triggering new algorithmic signals.\n\n3. Volume Completion Profiles vary by regime:\n\nSuper-Elephant (Airtel): ~60-62% of daily volume done by 12:40 PM\nElephant (M&M, HCL Tech): ~58-60%\nCheetah (Persistent): 40-70% (highly variable)\nDefensive (Marico, Colgate): Only 45-50%\n\nThe algorithm uses these profiles to adjust its pacing. If a trend persists past 12:40 PM, the algorithm adds to the position (Pyramiding), as this confirms global institutional alignment after the European open.",
          keyPoints: [
            "12:40 PM = European market overlap begins, triggering FII algo adjustments.",
            "Elephant stocks: ~60% volume done by 12:40 PM. Defensive stocks: only ~45-50%.",
            "Trend persistence past 12:40 PM confirms global alignment - the algo pyramids.",
          ],
        },
        {
          title: "OI Decoupling: Detecting Traps",
          content:
            "OI Decoupling is when the OI signal CONTRADICTS the price action. This is a trap detection mechanism.\n\nBull Trap Detection:\nPrice is rising (+2%), but Call OI is surging at strikes above current price. Institutions are WRITING calls, betting the price will NOT go higher. The \"bullish\" price action is actually retail-driven, and Smart Money is setting up a ceiling.\n\nBear Trap Detection:\nPrice is falling (-2%), but Put OI is surging at strikes below current price. Institutions are WRITING puts, betting the price will NOT fall further. The \"bearish\" price action is retail panic, and Smart Money is providing a floor.\n\nThe R-Factor model handles decoupling by checking whether the OI signal direction matches the price direction. When they diverge, the algorithm either:\n1. Refuses to enter the trade (high-confidence approach)\n2. Takes the OPPOSITE position to the retail crowd (contrarian approach)\n\nHCLTech Case Study: R-Factor stuck at 0.88 for 30 minutes with only +0.12% price movement. This is \"The Static Trap\" - HFT algorithms are controlling VWAP with no new institutional money entering. The algorithm correctly identifies this as \"no signal\" and avoids the trade.",
          keyPoints: [
            "Bull Trap: Price rising but Call OI surging = institutions capping upside.",
            "Bear Trap: Price falling but Put OI surging = institutions providing floor.",
            "Static Trap: Low R-Factor + minimal price movement = HFT-controlled, avoid.",
          ],
        },
      ]}
      prevModule={{ href: "/learning/z-score-r-factor", label: "Z-Score & R-Factor" }}
      nextModule={{ href: "/learning/breakout-strategies", label: "Breakout Strategies" }}
    />
  );
}
