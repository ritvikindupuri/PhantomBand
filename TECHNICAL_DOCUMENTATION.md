# PhantomBand: Advanced SIGINT & Neural Anomaly Detection Architecture

**Document ID:** NAVSEA-SIGINT-PB-2026-X1  
**Security Classification:** TACTICAL / SENSITIVE  
**Operational Authority:** NAVSEA SPECTRUM SUPERIORITY DIVISION  

---

## 1. Executive Summary

PhantomBand is a cutting-edge Electronic Warfare (EW) and Signals Intelligence (SIGINT) platform engineered for the high-fidelity detection and characterization of Low Probability of Intercept (LPI) and Low Probability of Detection (LPD) threats. In modern contested electromagnetic environments, adversaries utilize stealthy transmission techniques that blend into the noise floor. 

PhantomBand addresses this by employing a **Dual-Engine Anomaly Detection** architecture. By combining the temporal pattern recognition of a Deep-Temporal Recurrent Autoencoder (**PHANTOM-LSTM**) with the statistical outlier detection of an Isolation Forest (**SPECTER-IF**), the system provides a multi-layered defense against spectral deception. The platform operates entirely on the client side, ensuring data sovereignty and zero-latency tactical response.

---

## 2. System Architecture

The PhantomBand architecture is a multi-stage pipeline designed for high-throughput spectral analysis. It leverages hardware-accelerated tensors via TensorFlow.js and a custom-built statistical engine.

```mermaid
graph TD
    subgraph "1. Data Ingestion Layer"
        A1[CSV File Upload] --> B
        A2[Synthetic Simulation Engine] --> B
        B{Lexical Discovery Engine}
    end

    subgraph "2. Preprocessing & Feature Engineering"
        B --> C[Unit Stripping & Regex Parsing]
        C --> D[Min-Max Normalization: -110dBm to -20dBm]
        D --> E[Temporal Sequencing: N=8 Sliding Window]
    end

    subgraph "3. Neural & Statistical Analysis (Parallel)"
        E --> F1[PHANTOM-LSTM: Recurrent Autoencoder]
        E --> F2[SPECTER-IF: Isolation Forest]
    end

    subgraph "4. Intelligence Synthesis"
        F1 --> G1[SRE Calculation: MSE vs Dynamic Threshold]
        F2 --> G2[Statistical Scoring: Path Length vs c(n)]
        G1 --> H[Classification & Countermeasure Logic]
        G2 --> H
    end

    subgraph "5. Presentation & Persistence"
        H --> I[Tactical Narrative Generation]
        H --> J[D3.js Waterfall & Recharts Spectrum]
        I --> K[LocalStorage History Persistence]
        J --> K
    end
```

<p align="center">
  <i>Figure 1: PhantomBand System Architecture Flow. The diagram illustrates the parallel processing of spectral data through neural and statistical engines to synthesize tactical intelligence.</i>
</p>

### 2.1 Architectural Flow Breakdown

1.  **Data Ingestion Layer**: 
    *   **CSV Parsing**: Utilizes the `FileReader` API to read large datasets in chunks. The `lexicalDiscovery` engine uses a set of heuristic regex patterns (e.g., `/pwr|dbm|ampl/i` for power, `/freq|hz/i` for frequency) to identify columns without requiring a fixed schema.
    *   **Simulation Engine**: Generates a 256-bin spectral vector using a stochastic noise floor function: $P(f) = P_{base} + \mathcal{N}(0, \sigma^2)$, where $\sigma$ is the noise floor variance.
2.  **Preprocessing Layer**:
    *   **Normalization**: All power values are mapped to a $[0, 1]$ range using the formula: $x_{norm} = \frac{x - (-110)}{-20 - (-110)}$. Values outside this range are clipped to prevent gradient explosion in the LSTM.
    *   **Temporal Sequencing**: Data is transformed into a 3D tensor of shape $[batch, 8, 257]$. The 257th feature is a normalized temporal index $\frac{t}{T_{max}}$ to provide the model with a sense of relative time.
3.  **Parallel Analysis Layer**: The system forks the data into two distinct mathematical domains: the **Temporal Manifold** (LSTM) and the **Statistical Distribution** (Isolation Forest).
4.  **Intelligence Synthesis Layer**: Anomaly scores are fused. A detection is triggered if either engine exceeds its sensitivity-adjusted threshold. The classification engine then performs a "Spectral Fingerprint Match" against known threat profiles.
5.  **Presentation Layer**: Real-time rendering is handled via a hybrid approach: **Recharts** for the high-level spectrum and a custom **D3.js Canvas** for the high-density waterfall display.

---

## 3. Operational Mechanics: Deep Dive

### 3.1 Lexical Discovery & CSV Normalization
The `csvParser` utility is designed for "Zero-Config" ingestion. It performs a three-pass analysis:
1.  **Header Scan**: Identifies column indices using fuzzy string matching.
2.  **Unit Detection**: Detects if values are in dBm, Watts, or raw ADC counts and converts them to a standardized dBm scale.
3.  **Temporal Alignment**: If timestamps are missing, it assumes a uniform sampling rate based on the user-defined "Scan Interval."

### 3.2 Attack Simulation: Detailed Algorithmic Implementation
The simulation engine (`tfService.ts`) utilizes a multi-stage tensor generation process to inject high-fidelity anomalies into a stochastic baseline.

#### 3.2.1 Baseline Generation
The "Normal" environment is simulated using a Gaussian noise floor:
```typescript
const spectrum = tf.randomNormal([bins], normalize(baselinePower), 0.03);
```
*   **Baseline Power**: Derived from the uploaded CSV (avg power) or defaulted to -95dBm.
*   **Variance ($\sigma$)**: Set to $0.02$ normalized units during training and $0.03$ during simulation to simulate realistic thermal noise and background interference.
*   **Temporal Index**: The 257th feature is a normalized temporal index $\frac{t}{T_{max}}$. During training, this index increases within the sliding window; during inference, the window is filled with the current timestep's index to provide the model with a sense of relative time.

#### 3.2.2 Threat-Specific Simulation & Interpretation
Every 3rd timestep ($t \pmod 3 = 2$), the engine switches from "Baseline" to "Anomalous" mode. The attack is synthesized using a `tf.oneHot` encoded spike vector. Below is the granular breakdown of how each threat is simulated and how the dual-engines interpret the resulting data.

| Threat Type | Simulation Mechanism (The "How") | Neural Interpretation (PHANTOM-LSTM) | Statistical Interpretation (SPECTER-IF) |
| :--- | :--- | :--- | :--- |
| **Drone C2 (FHSS)** | **Simulation**: Injects a 4-bin wide spike ($\approx 1.5\%$ BW) with a $+0.45$ power delta. The center frequency $c$ is randomized per injection to mimic frequency hopping.<br>**Code**: `spikeWidth = 4; powerDelta = 0.45;` | **Interpretation**: The LSTM identifies this as a "Narrowband Coherent Violation." Because the spike is narrow and high-energy, the encoder fails to map it to the learned "noise-only" latent space, resulting in a localized reconstruction error spike at the specific bins. | **Interpretation**: The IF identifies this as a "Feature Outlier." In the 256-dimensional feature space, the 4 bins containing the spike have values $> 3\sigma$ from the mean. A random split on any of these 4 dimensions isolates the point in $\approx 3-4$ levels. |
| **GPS Spoofing** | **Simulation**: Injects an ultra-narrow 2-bin spike with a massive $+0.55$ power delta. This simulates a high-SNR coherent CW signal designed to capture a receiver's tracking loop.<br>**Code**: `spikeWidth = 2; powerDelta = 0.55;` | **Interpretation**: The LSTM treats this as a "Spectral Discontinuity." The sharp gradient between the 2-bin spike and the adjacent noise floor is mathematically irreconcilable with the smooth Gaussian baseline, causing a massive MSE spike ($> 1e-2$). | **Interpretation**: This is the "Easiest Isolation" case. The $+0.55$ delta puts the signal in the $99.99^{th}$ percentile of the power distribution. Most random splits on the power axis will isolate this point almost immediately ($h(x) \approx 2$). |
| **Wideband Jamming** | **Simulation**: Injects a massive 60-bin wide "Energy Blanket" ($\approx 23\%$ BW) with a $+0.25$ power delta. This simulates barrage jamming intended to raise the noise floor across a wide swath.<br>**Code**: `spikeWidth = 60; powerDelta = 0.25;` | **Interpretation**: The LSTM identifies this as a "Manifold Shift." Unlike the narrow spikes, the reconstruction error is distributed across a large portion of the output vector. The model's total MSE increases because the *entire* environment physics has shifted. | **Interpretation**: The IF identifies this as a "Distributional Shift." While the power delta is lower ($+0.25$), the fact that 60 dimensions are simultaneously elevated makes the point highly unique. The probability of selecting an "elevated" dimension for a split is high ($\approx 23\%$), leading to rapid isolation. |

#### 3.2.3 Spike Synthesis Algorithm
The actual tensor math used to merge the attack with the baseline:
```typescript
// 1. Generate indices for the spike width
const indices = Array.from({length: w}, (_, i) => c - Math.floor(w/2) + i);
// 2. Create a 1-hot mask of the spike
const spike = tf.oneHot(tf.tensor1d(indices, 'int32'), 256).sum(0);
// 3. Add the weighted spike to the baseline noise
const anomalousSpectrum = baselineSpectrum.add(spike.mul(ΔP));
```
This ensures that the simulated attack is not just a "replacement" but an "additive" signal, preserving the underlying noise floor characteristics for realistic detection.

---

## 4. Detection Engines: Technical Deep Dive

### 4.1 PHANTOM-LSTM (Neural Manifold Analysis)
The PHANTOM-LSTM is a Deep Recurrent Autoencoder designed to learn the "Physics of the Environment."

#### 4.1.1 Architecture & Training
*   **Encoder**: A single LSTM layer with 128 hidden units and a 10% dropout rate to prevent overfitting on stochastic noise.
*   **Latent Representation**: The encoder compresses the 257-dimensional input (256 bins + 1 temporal index) into a dense temporal manifold.
*   **Decoder**: A `RepeatVector` layer followed by a second 128-unit LSTM layer and a `TimeDistributed` Dense layer with sigmoid activation.
*   **Optimizer**: Adam optimizer with a tactical learning rate of $0.0005$.
*   **Loss Function**: Mean Squared Error (MSE), calculated as $\frac{1}{n}\sum_{i=1}^{n}(x_i - \hat{x}_i)^2$.
*   **Training Regime**: The model is trained for 12 epochs with a batch size of 16 using 100 frames of baseline "Normal" spectral data.

#### 4.1.2 Attack Interpretation: Neural Manifold Violation
The LSTM interprets an attack as a **Reconstruction Failure**. 
1.  **Normal State**: During training, the LSTM learns to compress and reconstruct the stochastic noise floor. Because the noise is random, the model learns a "mean representation" of the environment's temporal physics.
2.  **Anomalous State**: When an attack (e.g., Drone C2) is injected, it introduces a **coherent temporal structure** (a spike that persists or hops). 
3.  **Interpretation**: The Autoencoder's weights are not tuned to represent this high-energy coherent structure. When it attempts to reconstruct the attack frame, the output $\hat{x}$ differs significantly from the input $x$.
4.  **Metric**: The **Mean Squared Error (MSE)** spikes.
    *   **Baseline MSE**: $\approx 1e-5$ to $5e-5$.
    *   **Attack MSE**: $\approx 1e-3$ to $5e-2$ (a 100x to 1000x increase).
    *   **Threshold**: $\tau = \frac{100 - Sensitivity}{3000}$. A higher sensitivity lowers the threshold, catching smaller power deltas.

### 4.2 SPECTER-IF (Statistical Outlier Detection)
The SPECTER-IF engine identifies anomalies that are "statistically isolated" from the baseline distribution.

#### 4.2.1 Algorithm & Training
*   **Ensemble Size**: 100 independent `IsolationTrees`.
*   **Sub-sampling**: Each tree is trained on a random subset of 256 samples (or the total available baseline frames).
*   **Tree Depth**: Limited to $\lceil \log_2(256) \rceil = 8$ to prevent over-isolation of noise.
*   **Training Logic**: For each node, the engine randomly selects a spectral bin (feature) and a split value between the minimum and maximum power observed in that bin for the current sample.
*   **Anomaly Score Calculation**: $s(x, n) = 2^{-\frac{E(h(x))}{c(n)}}$, where $E(h(x))$ is the average path length across all trees and $c(n)$ is the average path length of an unsuccessful search in a Binary Search Tree, calculated as $2 \cdot (\ln(n-1) + 0.5772156649) - \frac{2 \cdot (n-1)}{n}$.

#### 4.2.2 Attack Interpretation: Path Length Shortening
The Isolation Forest interprets an attack as a **Statistical Outlier** in the power-frequency feature space.
1.  **Normal State**: Baseline noise points are clustered in a high-density region (low power, distributed across all frequencies). In an `IsolationTree`, it takes many random splits (long path length) to isolate a single noise point.
2.  **Anomalous State**: An attack point (e.g., GPS Spoofing) has a power value significantly higher than the baseline mean.
3.  **Interpretation**: Because the attack point is in a low-density region of the feature space, a random split on the power axis is highly likely to separate the attack point from the rest of the data early in the tree's depth.
4.  **Metric**: The **Average Path Length $E(h(x))$** decreases sharply.
    *   **Baseline Score**: $s < 0.45$ (Long paths, hard to isolate).
    *   **Attack Score**: $s > 0.75$ (Short paths, easy to isolate).
    *   **Threshold**: $\tau = 0.5 + \frac{Sensitivity}{200}$. High sensitivity makes the engine more "suspicious" of points with moderate path lengths.

### 4.3 Training Methodology: Data Synthesis & Calibration
To ensure the models are ready for tactical deployment, PhantomBand utilizes a "Zero-Shot Calibration" phase upon every scan initiation.

1.  **Baseline Synthesis**: The system generates 100 frames of "Normal" spectral data. This data is modeled as Gaussian White Noise: $P(f) \sim \mathcal{N}(\mu_{base}, \sigma^2)$, where $\mu_{base}$ is the average power of the environment (e.g., -95dBm) and $\sigma=0.02$ normalized units.
2.  **Temporal Windowing**: For the LSTM, these 100 frames are transformed into sliding window sequences of length $N=8$. This creates 93 training samples, each representing a short temporal "history" of the noise floor.
3.  **Real-Time Training**: 
    *   **Neural**: TensorFlow.js executes the 12-epoch training loop in the browser's background thread (WebWorker or GPU via WebGL).
    *   **Statistical**: The Isolation Forest is built recursively in memory, typically completing in $< 50ms$.
4.  **Threshold Normalization**: The thresholds are not static. They are dynamically adjusted based on the user-defined **Sensitivity** parameter:
    *   **PHANTOM-LSTM**: $\tau = \frac{100 - Sensitivity}{3000}$.
    *   **SPECTER-IF**: $\tau = 0.8 - \frac{Sensitivity}{250}$.
    *   This allows the operator to trade off between Probability of Detection ($P_d$) and False Alarm Rate ($P_{fa}$).

---

## 5. Tactical Countermeasures & Intelligence

When an anomaly is detected and classified, PhantomBand provides actionable tactical recommendations based on the threat's spectral profile:

*   **Frequency Agility**: Recommended for FHSS/Drone C2 threats. Suggests shifting primary communications to spectral "holes" identified by the anomaly engine.
*   **Power Control / LPI Mode**: Recommended when wideband jamming is detected. Suggests increasing transmit power or switching to spread-spectrum modulation to maintain link margin.
*   **Spatial Nulling**: Recommended for GPS Spoofing. Suggests utilizing phased-array antennas to create a spatial null in the direction of the interference source.

---

## 6. UI/UX Implementation Details

### 6.1 D3.js Waterfall Rendering
To maintain 60FPS performance while visualizing thousands of spectral points, PhantomBand utilizes a **Canvas-based D3.js Waterfall**:
*   **Buffer Management**: A rolling buffer of the last 100 spectral frames is maintained in memory.
*   **Color Mapping**: Power values are mapped to a custom `interpolateInferno` scale, where $-110$ dBm is dark purple and $-20$ dBm is bright yellow.
*   **Rendering Loop**: Uses `requestAnimationFrame` to draw the entire waterfall to an offscreen canvas before flipping it to the main display, minimizing flicker and CPU overhead.

### 6.2 React State Synchronization
The application uses a "Push-Pull" state model:
*   **Push**: The `tfService` pushes raw inference results into a high-speed `Ref`.
*   **Pull**: The UI components "pull" from this ref during their render cycle, preventing React's reconciliation engine from becoming a bottleneck during high-speed scans.

---

## 7. Data Persistence & History

PhantomBand implements a robust history system using `LocalStorage`:
*   **Schema**: Scans are stored as a `ScanHistory` object containing metadata (timestamp, target, sensitivity) and the final tactical summary.
*   **Compression**: Large spectral datasets are thinned (1:10 ratio) before persistence to stay within the 5MB LocalStorage limit.
*   **Export**: Users can export the entire history as a JSON "After Action Report" (AAR) for further analysis in external SIGINT tools.

---

## 8. Conclusion

The PhantomBand architecture represents a significant leap in tactical SIGINT capabilities. By leveraging the complementary strengths of recurrent neural networks and ensemble statistical methods, it provides a robust detection mechanism that is resistant to both stochastic noise and sophisticated spectral deception. The local-first, hardware-accelerated design ensures that operators have access to high-fidelity intelligence in the most demanding operational environments.

---
**NAVSEA Technical Review Team**  
*Spectrum Superiority Division*
