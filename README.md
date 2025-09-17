# PhantomBand: AI-Powered RF Threat Modeling & Analysis Platform

**PhantomBand is an advanced, AI-driven platform designed for military-grade electronic warfare (EW) training, mission rehearsal, and signals intelligence (SIGINT) analysis.**

It functions as a high-fidelity **"digital adversary,"** capable of generating dynamic and realistic Radio Frequency (RF) threat scenarios. By leveraging Google's Gemini AI as an analytical engine, PhantomBand moves beyond simple simulation. It provides operators with **actionable intelligence**, including automated threat classifications and suggested tactical countermeasures, creating an unparalleled environment for developing and mastering electronic warfare TTPs (Tactics, Techniques, and Procedures).

---

## Mission-Critical Capabilities

-   **Real RF Data Analysis & Interpretation:**
    -   **Upload & Analyze:** Ingest real-world RF spectrum data from `.csv` or `.txt` files.
    -   **AI-Powered Interpretation:** The Gemini AI analyzes the raw data, segments it into logical timesteps, and generates a plausible narrative explaining the observed signals and events.
    -   **Automated Threat Assessment:** The same powerful threat assessment engine is applied to the uploaded data, automatically identifying and classifying anomalies within the user's own signal captures.

-   **AI-Powered Threat Assessment & Advisory:** The core of PhantomBand. The AI doesn't just simulate anomalies; it actively analyzes the spectrum to provide a full tactical assessment.
    -   **Automated Threat Detection:** Intelligently identifies spectral anomalies like **jamming, spoofing, or unidentified signals** within the simulation.
    -   **Tactical Classification:** Assigns a military-relevant classification to each detected threat (e.g., `UAV Downlink`, `GPS Spoofing`).
    -   **Actionable Countermeasures:** Provides a suggested **tactical countermeasure** for each threat (e.g., `Initiate signal triangulation`), turning raw data into immediate, decision-quality intelligence.

-   **Advanced "Waterfall" Spectrum Visualization:**
    -   **Comprehensive Situational Awareness:** A multi-line chart displays the RF data for **all timesteps simultaneously**, providing a complete overview of the evolving electromagnetic environment.
    -   **Interactive Analysis:** The timeline controls **instantly highlight** the active timestep on the chart, creating a seamless, intuitive link between the narrative, threat assessment, and its specific spectral signature.
    -   **Visual Threat Highlighting:** Detected anomalies are automatically marked with a shaded overlay directly on the spectrum chart for rapid identification.

-   **Analyst-Grade FFT Controls:**
    -   Switch to a **Fast Fourier Transform (FFT)** view to perform deep-dive cepstral analysis on any timestep.
    -   **Precision Control:** Fine-tune the analysis by adjusting the **FFT Size** for resolution and applying standard **Windowing Functions** (Rectangular, Hamming, Hann) to mitigate spectral leakage.

-   **Professional Tactical Dashboard:**
    -   **Intuitive Layout:** A side-by-side dashboard presents the spectrum chart and scenario analysis in a single, cohesive view for direct data-to-narrative correlation.
    -   **Persistent Context:** A global **Status Bar** provides at-a-glance awareness of the core simulation parameters at all times.

-   **Comprehensive After-Action Reporting:**
    -   Generate and download a complete `.txt` **after-action report** with a single click, containing all parameters, the full narrative, and a detailed summary of all detected threats.

---

## Technology Stack

-   **Frontend:** React, TypeScript
-   **AI Engine & Analysis:** Google Gemini API (`gemini-2.5-flash`)
-   **Styling:** Tailwind CSS
-   **Data Visualization:** Recharts

---

## Analyst Workflow

The platform is designed for a seamless workflow from parameters to decision.

| Step                      | Action                                                                                             | Outcome                                                                |
| :------------------------ | :------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| **1. DEFINE MISSION**  | **Either:** A) Set simulation parameters for a synthetic scenario. **Or:** B) Upload a real RF data file for analysis. | The operational context for the analysis is defined.                 |
| **2. EXECUTE ANALYSIS**   | Click "RUN ANALYSIS" to task the AI engine.                                                        | A high-fidelity, multi-timestep scenario with threat assessment is generated. |
| **3. ANALYZE & CORRELATE** | Use the timeline controls to scrub through the scenario.                                           | The "waterfall" chart, narrative, and threat advisory update in perfect sync. |
| **4. DEEP DIVE**          | Switch to the FFT view and adjust parameters to conduct deep signal analysis on a specific timestep. | Deeper insights into signal characteristics are revealed.                |
| **5. EXPORT & BRIEF**     | Click "Download Report" to generate a comprehensive text file.                                     | A complete after-action report is ready for archival or dissemination. |