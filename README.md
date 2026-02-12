
# PhantomBand: Recurrent ML RF Intelligence

**PhantomBand is a high-precision Signals Intelligence (SIGINT) tool using Recurrent Neural Networks to achieve near-perfect anomaly detection in Radio Frequency environments.**

## The "Perfect" Detection Model: Phantom-LSTM
Unlike basic analysis tools, PhantomBand implements a **Long Short-Term Memory (LSTM) Autoencoder**. This allows the system to understand the **Time-Domain Evolution** of the spectrum. 

### Why LSTM?
- **It Remembers:** It learns the patterns of normal transmissions over time.
- **It's Accurate:** It identifies sophisticated attacks like "Low Power Spoofing" that hide beneath the noise floor but violate temporal consistency.
- **It's Local:** Training happens entirely on your machine's GPU using TensorFlow.js, ensuring 100% data sovereignty and air-gapped security.

## Use Cases
- **Counter-UAV:** Detect rogue control links by identifying non-standard frequency hopping.
- **GPS Spoofing Defense:** Identify subtle phase-drift in satellite signals.
- **Secure Facility Monitoring:** Learn the "heartbeat" of a secure room and alert when a new device transmits for even a fraction of a second.

## Core Tech
- **Engine:** TensorFlow.js
- **Model:** LSTM Recurrent Autoencoder
- **Interface:** React + High-Fidelity Tactical Waterfall Visualizer
