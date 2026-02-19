import LearningModule from "@/app/components/LearningModule";

export default function BacktestingFundamentalsPage() {
  return (
    <LearningModule
      moduleNumber={7}
      title="Backtesting Fundamentals"
      description="Learn how to validate trading strategies using historical data before risking real capital. Understand walk-forward analysis, overfitting, and the metrics that matter."
      sections={[
        {
          title: "Why Backtest?",
          content:
            "Backtesting is the process of testing a trading strategy on historical data to evaluate its performance before deploying it live.\n\nWithout backtesting, you are gambling. With backtesting, you are investing based on statistical evidence.\n\nKey questions backtesting answers:\n- Does this strategy make money historically?\n- What is the maximum drawdown I could experience?\n- How often does it win (Win Rate)?\n- Is the average win bigger than the average loss (Profit Factor)?\n- Does it work across different market conditions (Bull, Bear, Sideways)?\n\nOur backtesting playground lets you test the OI + Breakout strategy on 50 real NSE F&O stocks using live data. You can adjust parameters like lookback period, R-Factor threshold, and stock category to see how the strategy performs.",
          keyPoints: [
            "Backtesting = testing strategies on historical data before risking real money.",
            "Key metrics: Win Rate, Profit Factor, Max Drawdown, Sharpe Ratio.",
            "A strategy must work across different market conditions to be robust.",
          ],
        },
        {
          title: "Walk-Forward Analysis",
          content:
            "Walk-Forward is the gold standard for backtesting methodology. It works like this:\n\n1. Divide the data into sliding windows (e.g., 6 months training, 1 month testing).\n2. Optimize the strategy parameters (Z-Score thresholds, weights) on the training set.\n3. Test the optimized parameters on the out-of-sample test set.\n4. Slide the window forward and repeat.\n\nWhy Walk-Forward beats simple backtesting:\n- Simple backtesting optimizes on ALL the data, then tests on the SAME data. This is circular logic.\n- Walk-Forward ensures you always test on data the optimizer has NEVER seen.\n- It simulates real-world conditions: you optimize today, then trade tomorrow.\n\nFor the R-Factor model, the key parameters to optimize are:\n- Lookback window N (default: 20 days)\n- Factor weights (default: 0.4, 0.3, 0.2, 0.1)\n- R-Factor thresholds per regime (default: 1.25 Elephant, 2.0 Cheetah)\n\nA robust strategy should show stable performance across MOST windows, not just a few lucky periods.",
          keyPoints: [
            "Walk-Forward = train on past data, test on unseen future data, repeat.",
            "Prevents overfitting by always testing out-of-sample.",
            "Stable performance across multiple windows = robust strategy.",
          ],
        },
        {
          title: "Overfitting: The Silent Strategy Killer",
          content:
            "Overfitting is the biggest danger in quantitative trading. It means your strategy is \"memorizing\" past data patterns instead of learning generalizable rules.\n\nSigns of overfitting:\n- Amazing backtest results (95% win rate, 10x returns) but terrible live performance.\n- Strategy works only on a very specific date range or stock set.\n- Requires very precise parameter values (e.g., works at threshold 2.17 but fails at 2.15 or 2.20).\n\nHow to prevent overfitting:\n1. Use Walk-Forward Analysis (never test on training data).\n2. Prefer simple models with fewer parameters. The R-Factor model has only ~7 parameters.\n3. Test sensitivity: vary each parameter by +/-20%. If performance collapses, it's overfit.\n4. Test across multiple stocks and time periods.\n5. Apply Occam's Razor: if two strategies perform similarly, choose the simpler one.\n\nThe R-Factor model is designed to resist overfitting because:\n- Z-Score normalization adapts to changing market conditions automatically.\n- The 20-day rolling window is a well-established lookback in finance (approximately one monthly cycle).\n- Factor weights (40/30/20/10) are derived from economic logic, not curve-fitting.",
          keyPoints: [
            "Overfitting = memorizing past data instead of learning general patterns.",
            "Test sensitivity: vary parameters by +/-20% and check stability.",
            "The R-Factor model resists overfitting through Z-Score normalization and economically-motivated weights.",
          ],
        },
        {
          title: "Key Performance Metrics",
          content:
            "When evaluating a backtest, these are the metrics that matter:\n\nWin Rate: Percentage of trades that are profitable. A win rate of 40-60% is typical for momentum strategies. Don't chase 90%+ win rates - they often indicate overfitting.\n\nProfit Factor: Gross Profits / Gross Losses. A profit factor > 1.5 is good. > 2.0 is excellent. This tells you if your winners are big enough to cover your losers.\n\nMax Drawdown: The largest peak-to-trough decline. This is the worst-case scenario you must be psychologically prepared for. A max drawdown > 25% may be too risky for most traders.\n\nSharpe Ratio: (Returns - Risk-Free Rate) / Standard Deviation of Returns. Measures risk-adjusted returns. Sharpe > 1.0 is acceptable. > 2.0 is excellent.\n\nExpectancy: (Win Rate * Average Win) - (Loss Rate * Average Loss). Must be positive. This is the average profit you expect per trade.\n\nRecovery Factor: Total Return / Max Drawdown. Higher is better. Tells you how quickly the strategy recovers from losses.\n\nIn our backtesting playground, you'll see these metrics calculated automatically when you run a backtest. Use them to compare different parameter combinations and stock selections.",
          keyPoints: [
            "Win Rate 40-60% is normal for momentum strategies.",
            "Profit Factor > 1.5 = good strategy. > 2.0 = excellent.",
            "Max Drawdown is the metric that matters most for survival.",
            "Sharpe Ratio > 1.0 = acceptable risk-adjusted returns.",
          ],
        },
      ]}
      prevModule={{ href: "/learning/breakout-strategies", label: "Breakout Strategies" }}
    />
  );
}
