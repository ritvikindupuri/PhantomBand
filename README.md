# PhantomBand: AI-Powered RF Threat Modeling & Analysis Platform

**PhantomBand is an advanced, AI-driven platform designed for military-grade electronic warfare (EW) training, mission rehearsal, and signals intelligence (SIGINT) analysis.**

It functions as a high-fidelity **"digital adversary,"** capable of either generating dynamic Radio Frequency (RF) threat scenarios from scratch or analyzing operator-provided data to construct a plausible tactical narrative that explains it. By leveraging Google's Gemini AI as an analytical engine, PhantomBand moves beyond simple simulation. It provides operators with **actionable intelligence**, including automated threat classifications and suggested tactical countermeasures, creating an unparalleled environment for developing and mastering electronic warfare TTPs (Tactics, Techniques, and Procedures).

---

## Mission-Critical Capabilities

-   **Analyze Real-World RF Data:**
    -   **Direct Data Ingestion:** Upload `.csv` or `.txt` files containing RF data to have the AI generate a complete tactical narrative grounded in your real-world observations.
    -   **Intelligent Parsing:** The system automatically detects headers and intelligently maps frequency and power columns using an expanded keyword list (`mhz`, `dbm`, `signal`, `level`, etc.).
    -   **File Segment Analysis:** For files larger than 50 MB, PhantomBand provides a professional, stable workflow to analyze a specific **50 MB chunk**—the **first (Ingress)**, **middle (Mid-Mission)**, or **last (Egress)** portion of the capture. This prevents browser crashes and gives the analyst focused control over their investigation.

-   **AI-Powered Threat Assessment & Advisory:** The core of PhantomBand. The AI doesn't just display data; it actively analyzes the spectrum to provide a full tactical assessment.
    -   **Automated Threat Detection:** Intelligently identifies spectral anomalies like **jamming, spoofing, or unidentified signals**.
    -   **Tactical Classification:** Assigns a military-relevant classification to each detected threat (e.g., `UAV Downlink`, `GPS Spoofing`).
    -   **Actionable Countermeasures:** Provides a suggested **tactical countermeasure** for each threat (e.g., `Initiate signal triangulation`), turning raw data into immediate, decision-quality intelligence.

-   **Advanced "Waterfall" Spectrum Visualization:**
    -   **Comprehensive Situational Awareness:** A multi-line chart displays the RF data for **all timesteps simultaneously**, providing a complete overview of the evolving electromagnetic environment.
    -   **Interactive Analysis:** The timeline controls **instantly highlight** the active timestep on the chart, creating a seamless, intuitive link between the narrative, threat assessment, and its specific spectral signature.
    -   **Visual Threat Highlighting:** Detected anomalies are automatically marked with a shaded overlay directly on the spectrum chart for rapid identification.

-   **Analyst-Grade FFT Controls:**
    -   Switch to a **Fast Fourier Transform (FFT)** view to perform deep-dive cepstral analysis on any timestep.
    -   **Precision Control:** Fine-tune the analysis by adjusting the **FFT Size** for resolution and applying standard **Windowing Functions** (Rectangular, Hamming, Hann) to mitigate spectral leakage.

-   **Comprehensive After-Action Reporting:**
    -   Generate and download a complete `.txt` **after-action report** with a single click, containing all parameters, the full narrative, and a detailed summary of all detected threats.

---

## Technology Stack

-   **Frontend:** React, TypeScript
-   **AI Engine & Analysis:** Google Gemini API (`gemini-2.5-flash`)
-   **Styling:** Tailwind CSS
-   **Data Visualization:** Recharts
-   **Client-Side Parsing:** In-house robust CSV/TXT parser

---

## Analyst Workflow

The platform supports two primary workflows: generating a new scenario or analyzing existing data.

| Step                      | Action (Generate Scenario)                                                                         | Action (Analyze File)                                                                                                   | Outcome                                                                |
| :------------------------ | :------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| **1. CONFIGURE/UPLOAD**   | Select the "GENERATE SCENARIO" tab and set simulation parameters (Environment, Threat, etc.).        | Select the "ANALYZE FILE" tab and upload a `.csv`/`.txt` file. If over 50MB, select a segment to analyze.                 | The operational context for the analysis is defined.                   |
| **2. EXECUTE ANALYSIS**   | Click "RUN ANALYSIS" to task the AI engine.                                                        | Click "ANALYZE & GENERATE SCENARIO" to send a data summary to the AI.                                                     | A high-fidelity, multi-timestep scenario with threat assessment is generated. |
| **3. ANALYZE & CORRELATE** | Use the timeline controls to scrub through the scenario.                                           | Use the timeline controls to scrub through the AI-generated narrative that explains your data.                          | The "waterfall" chart, narrative, and threat advisory update in perfect sync. |
| **4. DEEP DIVE**          | Switch to the FFT view and adjust parameters to conduct deep signal analysis on a specific timestep. | Switch to the FFT view to conduct a deep analysis of the AI's representative spectrum data for a specific timestep.   | Deeper insights into signal characteristics are revealed.                |
| **5. EXPORT & BRIEF**     | Click "Download Report" to generate a comprehensive text file.                                     | Click "Download Report" to generate a report containing the AI's analysis of your file.                                 | A complete after-action report is ready for archival or dissemination. |