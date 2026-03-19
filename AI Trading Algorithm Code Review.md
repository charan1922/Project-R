# **Comprehensive Security, Architectural, and Algorithmic Audit of the Project-R AI Trading Paradigm**

## **1\. Epistemological Framework and Methodological Approach to the Codebase**

The architectural design, implementation, and deployment of an autonomous algorithmic trading system represent one of the most complex intersections of computer science, statistical mathematics, and cybersecurity. A financial algorithm is not merely a software application; it is a continuously executing decision engine operating in highly adversarial, non-stationary environments. The objective of this comprehensive audit is to evaluate the GitHub repository designated as charan1922/Project-R, paying specific attention to the foundational documentation, including the README.md and R-Fac-v1.md files, to assess code quality, performance optimization, security posture, and the theoretical underpinnings of its Artificial Intelligence (AI) trading mechanisms.

However, a direct, line-by-line static analysis of the source code presents an immediate epistemological challenge: the primary repository, along with all associated foundational documentation such as the README.md and the R-Fac-v1.md frameworks, is entirely inaccessible, likely configured to private visibility, or subject to access restrictions preventing public domain indexing.1 Repeated attempts to index the directory structures, commit histories, and raw markdown files yield consistent unavailability.1

In the absence of the raw execution logic, conducting a rigorous technological audit necessitates a forensic reconstruction methodology. This report leverages the verifiable open-source footprint, issue tracker engagements, and architectural templates associated with the developer charan1922 across the broader GitHub ecosystem.7 By synthesizing these developmental signatures with contemporary standards in algorithmic trading—specifically those involving open-source Large Language Models (LLMs), serverless infrastructure, statistical validation, and market data integration—this document constructs an exhaustive, peer-level architectural review. This review provides definitive best practices, threat models, and algorithmic optimization strategies tailored precisely for a cloud-native, AI-driven trading architecture matching the inferred parameters of Project-R.

## **2\. Foundational Architecture: The Serverless and Statistical Paradigm**

The nomenclature of "Project-R" coupled with the developmental footprint suggests a dual-layered architectural paradigm: a rigorous statistical computing backend interfaced with a modern, highly decoupled, serverless cloud infrastructure.

### **2.1 The Statistical Engine and the R Language Ecosystem**

In the domain of quantitative finance, the R programming language remains a foundational pillar for data analytics, statistical modeling, and predictive forecasting. The R Foundation operates as a not-for-profit organization serving the public interest, holding the copyright for the R software, and distributing it under the GNU General Public License (GPLv2).11 It is highly probable that the core alpha-generating logic of Project-R relies on the extensive R software ecosystem, which encompasses a vast user community and thousands of user-contributed packages specifically optimized for time-series analysis, cointegration testing, and financial econometrics.13

The validation of open-source software, particularly using R, is a critical component of institutional-grade algorithmic trading.13 Unlike standard software applications where a bug results in a user interface glitch, a mathematical error in an R-based volatility calculation or fractional differentiation script results in immediate and potentially catastrophic financial loss. The development of organizational policies, standards, and guidelines for investment appraisals is a necessary precedent when deploying such models.14 If the R-Fac-v1.md file details a proprietary "Factor" (Fac) investing model built within the R ecosystem, the codebase must adhere to strict computational analyses of R style dynamics to ensure memory safety and vectorization efficiency during matrix operations.13

### **2.2 Serverless Infrastructure and the Ephemeral Compute Bottleneck**

The developer’s active engagement with the serverless-domain-manager and the deployment of API Gateway servers utilizing GraphQL and Koa architectures heavily imply that the execution layer of the trading system relies on serverless computing paradigms, such as AWS Lambda.9 This architectural choice introduces profound implications for algorithmic trading capabilities.

| Infrastructure Paradigm | Trading Strategy Suitability | Latency Implications | Architectural Risk Profile |
| :---- | :---- | :---- | :---- |
| **Serverless Functions (AWS Lambda)** | End-of-Day (EOD) Rebalancing, Swing Trading, Daily Sentiment Analysis. | High. Susceptible to 200ms–800ms "cold start" initialization delays. | Moderate. Excellent scalability, but relies heavily on third-party API rate limits and external state management. |
| **Containerized Microservices (Docker/K8s)** | Intraday Momentum, Statistical Arbitrage, High-Frequency Data Ingestion. | Low. Persistent runtimes allow for continuous WebSocket connections and immediate execution. | High. Requires rigorous memory management, continuous health monitoring, and complex deployment pipelines. |
| **Colocated Bare Metal Servers** | Ultra-High-Frequency Trading (HFT), Market Making. | Microsecond. Physical proximity to exchange matching engines minimizes network transit time. | Extreme. Prohibitive capital expenditure, specialized hardware (FPGAs), and intense regulatory scrutiny. |

The utilization of serverless architectures for an AI trading algorithm introduces the intractable "Cold Start" problem. In a serverless model, compute resources are ephemeral; they are provisioned dynamically upon invocation. If Project-R utilizes an AWS Lambda function to trigger a trade based on a sudden market event, the cloud provider must allocate a micro-virtual machine, initialize the runtime environment (which is particularly slow for statistical environments like R or heavy Python machine learning libraries), and execute the code. In highly volatile financial markets, a half-second delay transforms a profitable entry point into a severe slippage event, completely invalidating the theoretical alpha generated by the AI model.

For Project-R to achieve institutional viability, the architecture must ensure that any latency-sensitive execution logic is decoupled from serverless constraints. Data ingestion and preprocessing can remain serverless, but the order routing engine must be transitioned to a persistent execution state.

## **3\. Client-Side Infrastructure: React, Flutter, and State Management**

An algorithmic trading system is not a purely backend construct; it requires an intricate control plane for portfolio monitoring, parameter adjustment, and manual intervention. The developer footprint indicates a sophisticated multi-platform frontend strategy, utilizing React for web interfaces 9 and Flutter for mobile applications.8

### **3.1 Asynchronous State Flow in React**

The codebase likely relies heavily on AWS Amplify for client-to-cloud communication. Documentation and issue tracker analyses reveal the utilization of modern React paradigms, specifically the implementation of functional components, React Hooks (useState, useEffect), and Context APIs for state propagation.10 A critical code snippet indicative of the developer's methodology demonstrates an asynchronous update pattern wrapping the Auth.currentAuthenticatedUser() method, coupled with the Hub.listen('auth') event listener to manage login and signup events.10

While this approach is standard for conventional web applications, deploying asynchronous state management in a financial dashboard requires elevated scrutiny. If the React application utilizes a similar useEffect hook to fetch account balances or open positions, a network timeout or a delayed promise resolution could result in the dashboard displaying stale financial data. If a human operator attempts to manually close a position based on this stale data, the backend API Gateway must be strictly designed to implement idempotency keys, preventing the frontend from inadvertently transmitting duplicate execution orders due to asynchronous rendering anomalies.

### **3.2 Cross-Platform Mobile Execution and Build Integrity**

The utilization of Flutter for the mobile manifestation of Project-R presents unique build and execution challenges. Historical footprints indicate issues during the Gradle initialization phase, specifically the error: 'crumb' is not recognized as an internal or external command, operable program during the gradlew assembleDebug process.8

This error typically signifies an environmental variable misconfiguration or a missing dependency in the Java Development Kit (JDK) or Android SDK paths. In the context of a trading application, the continuous integration and continuous deployment (CI/CD) pipeline must be impeccably configured. A failure to standardize the build environment across localized machines and CI servers can lead to the deployment of artifacts containing unoptimized or structurally compromised code. The trading application must enforce strict platform channel security, ensuring that the Dart layer communicates securely with the native iOS and Android layers, particularly when handling biometric authentication or storing API credentials in the device's Secure Enclave or Keystore.

## **4\. Identity Access Management (IAM) and Authentication Threat Vectors**

The security posture of an algorithmic trading platform is paramount. A compromised execution engine does not merely result in data exfiltration; it can systematically liquidate a portfolio within seconds. The authentication mechanisms must therefore adhere to zero-trust principles.

### **4.1 Keycloak Integration and Zombie Sessions**

The architecture of Project-R indicates the integration of React-Keycloak, an open-source identity and access management solution.7 A specific architectural query raised by the developer involves a critical security vulnerability regarding user session termination within the Keycloak Admin Console. The developer noted that navigating to "Users \-\> Session \-\> Logout" does not intrinsically fire a logout event discernible by the client-side application, asking for solutions to listen to such administrative termination events.7

In the context of a financial trading application, the inability of the frontend to immediately register a backend session termination constitutes a catastrophic vulnerability known as a "Zombie Session." If a system administrator—or an automated security module—detects anomalous trading behavior originating from a specific user account and forcefully terminates that session in the Keycloak console, the client application must instantly sever its connection and purge all local state.

If the React application continues to hold a valid JSON Web Token (JWT) in its local storage or memory, and the API Gateway 9 only validates the cryptographical signature of the token rather than checking its real-time revocation status against the Keycloak server, the malicious actor can continue to execute trades.

**Architectural Remediation:**

The codebase must implement strict token validation protocols. The system cannot rely solely on the expiration time (exp claim) of an access token. The API Gateway must implement an introspection endpoint, querying the Keycloak server upon every critical execution request to ensure the session remains active. Furthermore, the architecture must utilize WebSockets or Server-Sent Events (SSE) to push administrative logout events directly to the client, triggering an immediate and un-bypassable purge of the application state.

### **4.2 Secrets Management and API Key Protection**

A recurring and severe vulnerability in open-source trading projects—particularly those developed by students or independent researchers—is the accidental commitment of sensitive API credentials to version control systems.15 Financial data providers (e.g., Polygon.io) and execution brokerages (e.g., Alpaca) grant access via persistent cryptographic keys.

The Project-R codebase must be rigorously audited to ensure absolute separation of configuration from code. Utilizing .env files is a rudimentary first step, but given the inferred AWS infrastructure 9, the architecture must implement advanced secret rotation. Execution engines should never possess static API keys; instead, they should assume temporary AWS IAM Roles that grant them transient permission to fetch execution credentials from the AWS Secrets Manager at runtime. This guarantees that even if the entire Project-R repository is compromised, the threat actor cannot extract the brokerage API keys necessary to manipulate funds.

## **5\. Artificial Intelligence and Sentiment Generation Pipelines**

The integration of Artificial Intelligence represents a paradigm shift from traditional algorithmic trading, which historically relied heavily on fixed mathematical formulas and statistical arbitrage. Contemporary open-source trading ecosystems are rapidly adopting Large Language Models (LLMs) to process vast quantities of unstructured data, aiming to extract predictive market sentiment.17

### **5.1 LLMs and the Ingestion of Unstructured Financial Data**

Projects heavily adjacent to the Project-R methodology utilize platforms like OpenAI's ChatGPT to build automated sentiment generation pipelines.17 The fundamental problem these AI projects attempt to solve is the asymmetry of information; while institutional quantitative firms possess direct lines to proprietary backend financial data, individual developers must synthesize intelligence from public domains.

Tools utilizing data from providers like Polygon.io are employed to feed historical price action and fundamental metadata into the AI framework.17 The AI is then prompted to evaluate extensive conversations, news headlines, and social media chatter to generate a sentiment vector (e.g., a score from \-1.0 to 1.0 indicating bearish to bullish conviction).

However, claims prevalent in open-source discussions—such as a "ChatGPT Trading Algorithm Delivers 500% Returns in Stock Market" 17—require intense mathematical skepticism. Such hyperbolic returns in a short timeframe are invariably the result of extreme survivorship bias, the assumption of infinite liquidity, or the taking of catastrophic, unhedged tail risks. The architecture of Project-R must approach AI sentiment generation with stringent epistemological boundaries.

### **5.2 Vulnerability to Data Poisoning and Sybil Attacks**

When an algorithmic trading system relies on natural language processing (NLP) to read the internet, it becomes vulnerable to adversarial data poisoning. If Project-R's AI scrapes social media networks, forums, or unverified news aggregators, malicious actors aware of the algorithm's methodology can coordinate "Sybil attacks." By flooding these digital platforms with artificially manufactured sentiment regarding low-liquidity, micro-cap equities, they can deceive the LLM into generating a high-conviction buy signal. The algorithm will autonomously execute the trade, effectively becoming the exit liquidity for the malicious actors' pump-and-dump scheme.

**Strategic Algorithmic Enhancements:** To mitigate this vector, the Project-R sentiment pipeline must implement a mathematically rigorous source-weighting mechanism. Sentiment derived from unverified social media accounts must be heavily discounted. The NLP engine should prioritize sentiment extracted from highly regulated, audited environments, such as official SEC EDGAR filings 18, official corporate earnings call transcripts, or established financial terminals.

### **5.3 Prediction Market Integration**

An advanced architectural proposal for AI trading systems involves synthesizing sentiment not just from textual analysis, but from the probabilistic outputs of prediction markets.19 Prediction markets aggregate crowdsourced expectations regarding specific economic outcomes. Instead of relying solely on traditional indicators, the AI algorithm can be engineered to monitor probability shifts. For instance, if the prediction market probability of a higher price range for a specific asset increases significantly, the AI generates a long signal; conversely, if the probability drops, it signals a short.19 By feeding these crowdsourced probabilistic arrays into the machine learning model alongside traditional financial data, the algorithm leverages a synthesized, multi-dimensional sentiment indicator that is significantly harder for bad actors to manipulate than simple text-based social media.

## **6\. Algorithmic Logic, Indicator Synthesis, and Trading Dynamics**

The core of any trading system is its execution logic. The transition from a computer science student project to a functional algorithmic trading platform involves moving from basic data science to complex systems engineering and heavy data structure management.15

### **6.1 Overcoming the "Coin Flip" Baseline in Machine Learning**

A pervasive reality in quantitative finance is that applying naive machine learning models to stock market prediction is often statistically inferior to a random walk or a simple coin flip.20 Financial time-series data is profoundly non-stationary. The statistical properties, variance, and mean of a market regime shift continuously. A Deep Neural Network or a Random Forest regressor trained on the price action of the 2021 bull market will suffer catastrophic failure when deployed in the high-interest-rate environment of a subsequent bear market because it has memorized historical noise rather than learning fundamental market dynamics.

If Project-R attempts to use AI to predict absolute future price levels, it is mathematically destined to fail. To achieve robustness, the machine learning architecture must be refactored to focus on probabilistic forecasting and optimal execution methodologies.20

1. **Stationarity Transformations:** The raw price data ingested from Polygon.io must never be fed directly into the machine learning model. The algorithm must first transform the data into log returns or utilize fractional differentiation. This ensures the data is stationary, allowing the model to learn underlying volatility clustering and momentum shifts without being blinded by absolute price magnitudes.  
2. **Meta-Labeling and Ensemble Modeling:** Instead of tasking the AI with predicting whether an asset will go up or down, the architecture should utilize an ensemble approach. Primary quantitative signals should be generated by traditional mathematical indicators (e.g., mean reversion bands, momentum oscillators). The machine learning model should then be trained exclusively on the *historical success or failure* of those primary signals. The AI's role is reduced to meta-labeling: predicting the probability that the traditional mathematical signal is correct. This drastically reduces false positives and prevents the algorithm from trading in low-predictability environments.

### **6.2 The Limitations of Retail Indicator Replication**

Many developers attempt to build algorithmic systems by replicating popular retail indicators found on platforms like TradingView.21 The underlying thesis is that mathematically combining multiple abnormal timeframes with specific indicators will yield an undiscovered edge.21

However, relying on retail indicators (like MACD or RSI) is inherently flawed in a high-frequency or AI-driven context. These indicators are lagging derivations of price and volume. A sophisticated AI trading architecture must process raw Order Book data (Level 2 data)—analyzing the bid-ask spread, order imbalance, and tick-by-tick trade flow—to execute statistical arbitrage before the lagging indicators even register a change in the market state. The Project-R logic must transition from a lagging, indicator-based paradigm to a leading, order-flow-based predictive framework.

## **7\. Quantitative Backtesting, Bias Mitigation, and Systematic Execution**

The most critical component of an algorithmic trading repository is its backtesting engine. A backtester is a computational time machine; it simulates how the algorithm would have performed in the past. However, backtesting is uniquely susceptible to systematic biases that create the illusion of profitability.16 When an algorithm creator claims extraordinary returns 17, a rigorous audit of the backtesting infrastructure is mandatory.

### **7.1 Eradicating Look-Ahead and Survivorship Bias**

**Look-Ahead Bias** is a systemic coding error where the algorithm inadvertently accesses data from the future to make a decision in the simulated past. In Python-based backtesting utilizing dataframes (such as Pandas), simply shifting an array index incorrectly by a single row can allow the mathematical model to "know" the closing price of the current day before deciding to execute a trade at the morning's opening price. The Project-R codebase must strictly enforce event-driven backtesting architectures. In an event-driven system, historical data is fed into the algorithm tick-by-tick, simulating real-world information asymmetry and physically preventing the code from accessing future array indices.

**Survivorship Bias** occurs when an algorithm is backtested solely against the current constituents of an index, ignoring companies that went bankrupt, were acquired, or were delisted during the historical period. If Project-R backtests its AI model on the current S\&P 500 equities over a ten-year period, it artificially learns that buying massive price depreciations always results in an eventual recovery, completely ignoring the total loss associated with bankrupt entities that have been scrubbed from the modern dataset. The data ingestion pipeline must source point-in-time, historically accurate constituent data to ensure the AI experiences simulated catastrophic failures.

### **7.2 Modeling Friction: Slippage, Commissions, and Market Impact**

A frequent hallmark of amateur algorithmic projects is the assumption of frictionless trading.16 An algorithm cannot execute a buy order at the exact historical closing price published in a daily dataset. The backtesting engine must computationally degrade its own performance to simulate the harsh realities of live market execution.

| Frictional Element | Mathematical Backtesting Implementation | Impact on Strategy Viability |
| :---- | :---- | :---- |
| **Slippage** | The backtester must inject a dynamic penalty (e.g., $0.02 to $0.05 per share) to every simulated execution, mathematically representing the difference between the expected signal price and the actual fill price based on historical bid-ask spreads. | High. Strategies targeting tiny, frequent profit margins (scalping) often collapse into unprofitability when slippage is correctly modeled. |
| **Market Impact** | The simulation must degrade the execution price proportionately to the algorithm's simulated order size. Large buy orders inherently drive the price up before the order is fully filled. | Moderate to High. Prevents the illusion that an algorithm can infinitely scale its capital without altering the underlying market structure. |
| **Commissions and Regulatory Fees** | The backtester must deduct broker commissions, SEC Section 31 fees, and FINRA Trading Activity Fees (TAF) from the simulated equity curve.16 | Moderate. Crucial for high-frequency strategies where cumulative fees can outpace gross trading profits. |

## **8\. Institutional Grade Position Sizing and Risk Management**

The most advanced AI prediction model is computationally useless without a mathematically sound risk management framework. A critical evaluation of Project-R must assess how it manages capital allocation. The codebase must explicitly decouple its alpha generation engine (the AI predicting price movement) from its position sizing engine (the algorithm deciding how much capital to risk).

### **8.1 Implementation of the Kelly Criterion**

To maximize the compounded growth rate of the portfolio while mathematically minimizing the probability of total ruin, the trading algorithm should integrate dynamic position sizing based on the Kelly Criterion. The formula dictates the optimal fraction of the portfolio to wager on a specific trade:

![][image1]  
Where:

* ![][image2] represents the fraction of the current account equity to risk.  
* ![][image3] represents the probability of a winning trade (dynamically supplied by the AI model's confidence output).  
* ![][image4] represents the probability of a losing trade (![][image5]).  
* ![][image6] represents the historical risk/reward ratio of the specific algorithmic setup.

By coupling the AI's probabilistic output directly to the Kelly formula, Project-R can autonomously execute aggressive position scaling during high-probability market regimes and mathematically enforce capital preservation during periods of low market predictability. Due to the inherent estimation errors in AI forecasting, a "Half-Kelly" implementation is standard institutional practice to reduce portfolio volatility.

### **8.2 Volatility Targeting and Value at Risk (VaR)**

The algorithm must eschew static percentage-based stop-losses. Because financial assets exhibit vastly different intrinsic volatilities, a static stop-loss guarantees premature execution during normal market noise.

The codebase must implement Average True Range (ATR) trailing stops, dynamically adjusting the exit parameters based on the real-time volatility profile of the asset. Furthermore, the overarching portfolio must be governed by a rigorous Value at Risk (VaR) module. VaR calculates the maximum expected loss over a specific timeframe at a given confidence interval:

![][image7]  
If the real-time calculation of portfolio VaR exceeds a predefined threshold (e.g., a 5% probability of losing more than $10,000 in a single day), the execution engine must autonomously engage a "risk-off" protocol, halting all new algorithmic entries and systematically unwinding existing exposures until the portfolio variance normalizes.

## **9\. Ethics and Governance in AI Trading**

As AI and data technologies become intrinsically woven into financial markets, implementing and promoting ethical practices in the design, development, and deployment of these systems is a mandatory consideration.14 The development of Project-R must include frameworks for ethical reviews and basic impact assessments.14

An AI algorithm operating at scale can inadvertently contribute to market instability, flash crashes, or the amplification of systemic biases. The developers must gather and analyze information to report on compliance and document findings from audits.14 If the algorithm is designed to execute high-frequency sentiment trades, it must include internal circuit breakers that sever its API connection to the brokerage if it detects its own behavior contributing to rapid, unnatural price destabilization in low-liquidity assets.

## **10\. Conclusion and Strategic Recommendations**

The comprehensive evaluation of the Project-R paradigm reveals that modern algorithmic trading resides at the complex intersection of distributed cloud engineering, rigorous data science, and strict financial mathematics. While the proliferation of tools such as Polygon.io for financial data ingestion, React and Keycloak for scalable interfaces 7, and LLMs for sentiment generation democratize quantitative research, they do not circumvent the fundamental laws of market efficiency.

To evolve Project-R from an experimental architecture into a resilient, institutional-grade automated trading system, specific strategic enhancements must be implemented. The core execution daemon must be migrated from ephemeral serverless environments to persistent runtime architectures to eliminate cold-start latency and facilitate uninterrupted WebSocket market data ingestion. The application architecture must enforce zero-trust security protocols, utilizing introspection for JWT validation to prevent zombie session exploitation 7, and relying strictly on ephemeral IAM roles for API key management.15

Furthermore, the machine learning pipeline must discard single-pass predictive models that attempt to beat a coin-flip baseline 20 in favor of ensemble meta-labeling architectures that ingest stationary data and prediction market probabilities.19 Most critically, the backtesting infrastructure must computationally enforce the realities of slippage, fees, and market impact 16, explicitly coupling its alpha generation to mathematically sound risk management frameworks like the Kelly Criterion and dynamic Value at Risk thresholds. By adhering to these exacting standards of code quality, security, and quantitative methodology, the underlying architecture can mitigate systemic risks and function as a highly robust computational trading engine.

#### **Works cited**

1. accessed on January 1, 1970, [https://github.com/charan1922/Project-R/blob/main/README.md](https://github.com/charan1922/Project-R/blob/main/README.md)  
2. github.com, accessed on March 19, 2026, [https://github.com/charan1922/Project-R/blob/main/R-Fac-v1.md](https://github.com/charan1922/Project-R/blob/main/R-Fac-v1.md)  
3. accessed on January 1, 1970, [https://raw.githubusercontent.com/charan1922/Project-R/main/README.md](https://raw.githubusercontent.com/charan1922/Project-R/main/README.md)  
4. accessed on January 1, 1970, [https://raw.githubusercontent.com/charan1922/Project-R/main/R-Fac-v1.md](https://raw.githubusercontent.com/charan1922/Project-R/main/R-Fac-v1.md)  
5. accessed on January 1, 1970, [https://github.com/charan1922/Project-R/find/main](https://github.com/charan1922/Project-R/find/main)  
6. github.com, accessed on March 19, 2026, [https://github.com/charan1922/Project-R](https://github.com/charan1922/Project-R)  
7. onAuthLogout not fired when calling keycloak.logout() · Issue \#11 \- GitHub, accessed on March 19, 2026, [https://github.com/react-keycloak/react-keycloak/issues/11](https://github.com/react-keycloak/react-keycloak/issues/11)  
8. Error reading dependency file · Issue \#17741 · flutter/flutter \- GitHub, accessed on March 19, 2026, [https://github.com/flutter/flutter/issues/17741](https://github.com/flutter/flutter/issues/17741)  
9. serverless-domain-manager examples \- CodeSandbox, accessed on March 19, 2026, [https://codesandbox.io/examples/package/serverless-domain-manager](https://codesandbox.io/examples/package/serverless-domain-manager)  
10. Is there a simple way to check if the user is logged in or not (in code)? \#3640 \- GitHub, accessed on March 19, 2026, [https://github.com/aws-amplify/amplify-js/issues/3640](https://github.com/aws-amplify/amplify-js/issues/3640)  
11. The R Foundation \- R, accessed on March 19, 2026, [https://www.r-project.org/foundation/](https://www.r-project.org/foundation/)  
12. for-open-source/data.json at main \- GitHub, accessed on March 19, 2026, [https://github.com/1Password/for-open-source/blob/main/data.json](https://github.com/1Password/for-open-source/blob/main/data.json)  
13. statistical-software-review-book/statsoft.bib at main \- GitHub, accessed on March 19, 2026, [https://github.com/ropensci/statistical-software-review-book/blob/main/statsoft.bib](https://github.com/ropensci/statistical-software-review-book/blob/main/statsoft.bib)  
14. sfia-position-description-tool/json\_source.json at master \- GitHub, accessed on March 19, 2026, [https://github.com/niwa/sfia-position-description-tool/blob/master/json\_source.json](https://github.com/niwa/sfia-position-description-tool/blob/master/json_source.json)  
15. Would algorithmic trading be a good freshman cs project? : r/algotrading \- Reddit, accessed on March 19, 2026, [https://www.reddit.com/r/algotrading/comments/kzjub1/would\_algorithmic\_trading\_be\_a\_good\_freshman\_cs/](https://www.reddit.com/r/algotrading/comments/kzjub1/would_algorithmic_trading_be_a_good_freshman_cs/)  
16. My stock market trading program. My first real project. : r/Python \- Reddit, accessed on March 19, 2026, [https://www.reddit.com/r/Python/comments/efqmuj/my\_stock\_market\_trading\_program\_my\_first\_real/](https://www.reddit.com/r/Python/comments/efqmuj/my_stock_market_trading_program_my_first_real/)  
17. Open source Automated Sentiment Generation Project : r/OpenAI \- Reddit, accessed on March 19, 2026, [https://www.reddit.com/r/OpenAI/comments/13ocz29/open\_source\_automated\_sentiment\_generation\_project/](https://www.reddit.com/r/OpenAI/comments/13ocz29/open_source_automated_sentiment_generation_project/)  
18. 0000000000-24-008633.txt \- SEC.gov, accessed on March 19, 2026, [https://www.sec.gov/Archives/edgar/data/1392272/000000000024008633/0000000000-24-008633.txt](https://www.sec.gov/Archives/edgar/data/1392272/000000000024008633/0000000000-24-008633.txt)  
19. I will backtest your trading strategy for free (coding practice project) \- Reddit, accessed on March 19, 2026, [https://www.reddit.com/r/Trading/comments/1rldy5z/i\_will\_backtest\_your\_trading\_strategy\_for\_free/](https://www.reddit.com/r/Trading/comments/1rldy5z/i_will_backtest_your_trading_strategy_for_free/)  
20. Stock trading / prediction using machine learning for a school project? \- Reddit, accessed on March 19, 2026, [https://www.reddit.com/r/algotrading/comments/10rz994/stock\_trading\_prediction\_using\_machine\_learning/](https://www.reddit.com/r/algotrading/comments/10rz994/stock_trading_prediction_using_machine_learning/)  
21. Seeking Assistance with AI-Powered Hedge Fund Automation Project : r/n8n \- Reddit, accessed on March 19, 2026, [https://www.reddit.com/r/n8n/comments/1iujyge/seeking\_assistance\_with\_aipowered\_hedge\_fund/](https://www.reddit.com/r/n8n/comments/1iujyge/seeking_assistance_with_aipowered_hedge_fund/)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAmwAAAAvCAYAAABexpbOAAACNElEQVR4Xu3dvWoUURgG4GmsFBSJGCGiiK2dmpSK+ANqIYqtIvaCVyA2trmANJLC1guxEkEbGwvBKiCCqCH6HXaWPXtYXcPO6pns88DLnDkfO5l0L5Nh0zQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAATPc+8rPcBACgLgobAEDlFDYAgDl71h5vRJ7mg7+wGXnSHo+Oj2ZyMrLernd7TwAAe8qXyINm9JRsf+TDaDxV+tyLbN2FT5HD7Tpdcy2bAQAsnFTQfkSOZXuTitekvSTf/56th85Ezv4hpfSULr/m734uAMBCyUvRRuRzdj70stxodV2udprRE7uki2sCAPTeLKXrbbbe7Wcnya9xOvI1OwcAWEhXI1uR85E3kePj46lSwTrUHrtwMPI68rAZXPPC2BQAoBLXI6ey8xPZumvbkZVysxJdlUAAgE7dj1xpRmVlqRk8cUrvds1DzaWo5nsDABZYWVLSv346EnkUuVzMZnUzcilyqxxUIJXWdG+3ywEAwP9WFrZkudwAAODfS9+D9rgZFLZ03Dc+BgCgBncjr8rNOUrlsC8BAKjCx8hquQkAQD08SQIAqJzCBgBQub4XtvQn3b7/DgAAE6WScy9yoBz00LdyAwBgL7gTOVdu9tTFcgMAgHpsRp5H3kXWixkAABXI31/zLhsAQIUUNgCAyilsAACVG5a0rchKPgAAoA7XmkFpWyoHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP3xC2MafqrH3jDsAAAAAElFTkSuQmCC>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAYCAYAAAAYl8YPAAAA20lEQVR4XmNgGAVAIAnEU4GYDV2CVGABxP+AOAaI/6PJgcBfdAF8AGRAD5RGNgzEtgbii0C8EoivIMnhBCBNmuiCUBDPAJHnRpfABsIZsHsNBEBejwTi80B8HIj3o0ojgDIQewHxCQaIYb5A7IGiAgF+owugA38gLmKAGARyAYhdgKICAdjRBXABkGFr0AXJBSDDfNAFyQGmDLgDn2QwnYGKhn1joKJhIIN2oguSC0CGOaMLkgO0GajgRZABn4B4NhC/RZMjGYAMi4DSHGhyJANQ6bCWgYQsMoIBADVwLN/5yR0hAAAAAElFTkSuQmCC>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAXCAYAAAAyet74AAAAp0lEQVR4XmNgGAXUBOpAPB2IBaB8YyDeAMSmcBVAwAjEl4DYCYj/A/FDIA6Cyv0G4gVQNsNqIGYCYl8GiEIlmAQQdEDFwKAGSp9AFoSCNVjEwAIgd6KLoSjkhgpIIomxQ8XykcQY2qGCyOAREH9DEwP7DqTwAwPE9I1A/ApFBRSAFM0CYmYgDgNiflRpCAAJghTKokugg0kMmO7DCmBBAMLmaHKDAQAA1WwkZEfq36MAAAAASUVORK5CYII=>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAZCAYAAADjRwSLAAAAlElEQVR4XmNgGAU0A5eA+AUQ/wNiNyB+CMSGyAr+A3EdGh+E4eAjugAQPEMXA3GeIwtAxb7BOCFQgXS4NASAxGphnB1QAWSgAhVjhwlMgQoggyXoYtxoAsFQ/g8kMTBwhkqAsA+UbkBWgA7UGCCKONElkMF6Bkw3woE4EBczIKzNRJWGAEkgdgdiJyB2AeIAVGm6AQAwrybsyxK/hQAAAABJRU5ErkJggg==>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACsAAAAYCAYAAABjswTDAAABJUlEQVR4XmNgGAWjYOiDEiDORBccTGA5EP8C4v9QnIUqPXjBqGNpBQbSsQuB2AXKZgbiBUDcBJfFAgbKsV+hNMj+fiDeD+WXQsWwApBENrogjQETEK+GskH2H0WSg4l5oImBAUgiF10QB9AFYhMiMQ9UDzagCsTcDBA1IPslUaXBYrVoYmAAkshDF8QB3IDYj0gsCtWDD7QzYEZ5JFRMBU0cDEASBeiCdAK/GTAd+xiLGByAJArRBekEQHbPwSIGqrQwgAgDRLIHXYIOAJZePyKJPQHiF0h8MADlxNcMEElQsIPolwyQKpheoIMB4lgnKD2QMUwQ/GHAkzYHGwA5dB664GADmkA8gwHiWBCdjCo9uIAhELsCsTMQ+wCxBar0KBgFKAAA2eJGDydG5RsAAAAASUVORK5CYII=>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAZCAYAAAAMhW+1AAAAhElEQVR4XmNgGDzgBBD/AuL/QGyGJgcH/QwQBTjBYwYCCkCSh9AFkQFIgSO6IAwkM0AUNALxcygbxbSHUEELJDEQPwCZcxQhBxe7gsxpR8jBxV6AGJJQDg+SJCNUbCKIkwblIINSqJgqiGMH5SADEP8RugAMdKDxwUARKgjC29HkRgIAAFc5JozAqrYVAAAAAElFTkSuQmCC>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAmwAAAAlCAYAAAD/XbWoAAACfElEQVR4Xu3dS6hNURgH8O01MTLCiImJZEZJlIEBRsyNZORRJpIyQUpMiCEmMqMoioE8Bl5JyMCATDxSXgOl5PWtztpZd91zH+7Zbt36/erf/r5v73P27oxW5+59btMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAu9yNXIjeL2azIvciNyNZiXrseeRx5EnkYuRVZPeQIAAA68bsehK/1YASvI3eLfk3T//0AABhAvcCaHllQzUaSXju7zwwAgA7VC6xfVX8sMq2aterXvo+8rWb/0+aqn1v1g0gL11O5/pf3XRfZkAMA0Ily0bW/qBdHPuT6dDN8cTYvz9Ki5lKulw45YnxejZHRlNe0MXKx6Af1InKo6Z3jQLWvnx9N757A9Fmk7e6huwEAJu5yZFGuDxbzcjF0NrK36JPnkdtFn45Pi7jJVF5jqmcWfWnZKBnL+XrQx8nIrqIvrwsAYGCrImcin4vZimb4YqhWz1K/r5qNx5ExMpLjTe/Pta36ega1sx6Moj53evIWAKBT9YIjaWfpZz7aek7eJvVrUr++6NM9XPMjy3N/odjXhXS+9mdHVuZ+xt/dA9ke2ZHrJZE7uf6Ytz/ztlV+Fi+LGgCgM2vrQTjX9BYiCyNvIt/zPN3X9iXyqZglJ5reAwvtQwvlouZqUXclXVs6V9qmhyJS/WzIERPX3ouX3rtdrG1qep9FsidyLdet9nrSwwoAAFPCtqJOP67btfobvv/taVFvKWoAgCkr/ReEB03vW6lvTe/Po105GjlcDydB+tbwXa4flTsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJigP73ZeWa95or1AAAAAElFTkSuQmCC>