# PhantomBand: Technical Documentation

## 1. Introduction

### 1.1. Purpose

This document provides a comprehensive technical overview of the PhantomBand application. It is intended for developers, system architects, and technical analysts who require a deep understanding of the system's architecture, data flow, AI integration, and component-level implementation.

### 1.2. Scope

This documentation covers the application's final, military-grade feature set, focusing on the core technical innovations that enable its advanced capabilities.

---

## 2. System Architecture

PhantomBand is a client-side **Single Page Application (SPA)** built with **React**. It operates on an **"AI as an Analytical Service"** model, where the client directly communicates with the Google Gemini API. This architecture offloads complex simulation and analysis tasks to the AI, allowing the frontend to focus on providing a responsive, professional user experience.

### 2.1. High-Level Diagram

```
+---------------------------------+      (HTTPS Request)       +--------------------------+
|       React Client (Browser)    |  <---------------------->  |   Google Gemini API      |
|                                 |   (Prompt + Schema)        |   (gemini-2.5-flash)     |
|   +-------------------------+   |                            |                          |
|   |      App.tsx (State)    |   |  ---------------------->   +--------------------------+
|   |-------------------------|   |   (Structured JSON)                  |
|   | Controls |   Visualizer |   |                                      |
|   |----------+--------------|   |                                      |
|   | Scenario |    History   |   |        +---------------------------------------------+
+---------------------------------+        |  AI's Role: The Digital Adversary & Analyst |
        ^                                  |---------------------------------------------|
        | (User Interaction                | **If Simulating:**                          |
        |   & File Upload)                 |   - Generate Scenario, Spectrum & Threats   |
        |                                  | **If Analyzing:**                           |
+------+-----------+                        |   - Interpret, Segment & Structure Real Data|
|      Analyst     |                        |   - Identify & Classify Threats in Data     |
+------------------+                        | **Always:**                                 |
                                            |   - Return complete, structured JSON        |
                                            +---------------------------------------------+
```

### 2.2. Architectural Principles

-   **Client-Centric:** All application logic, state management, and rendering occur within the user's browser.
-   **AI as an Analytical Engine:** The Gemini API is not merely a content generator. It is treated as a sophisticated, on-demand analytical service, responsible for the entire simulation and analysis lifecycle.
-   **Schema-Driven Reliability:** Communication with the AI is enforced by a strict JSON schema. This is the cornerstone of the application's reliability, ensuring the AI's response is always a predictable, machine-readable data structure.
-   **Dashboard-Oriented Design:** The UI is architected as a side-by-side analytical dashboard, creating a direct visual relationship between the spectrum data (`DataVisualizer`) and the actionable intelligence (`DeceptionScenario`).

---

## 3. The AI as a Digital Adversary & Analyst

The core innovation of PhantomBand is its use of the Gemini API as a **dual-mode, non-deterministic analytical engine**. Depending on the user's input, the AI seamlessly switches between two roles: a creative "Digital Adversary" for simulations and a meticulous "Data Analyst" for real-world data. This is achieved through conditional prompt engineering and strict output schema enforcement.

### 3.1. Mode 1: Simulation (The Digital Adversary)

-   **Role Priming:** The prompt begins by assigning the AI the persona of "PhantomBand, a specialized AI for advanced RF signal analysis and electronic warfare simulation." This sets the context and technical tone, guiding the model's behavior.
-   **Task Delegation & Structure:** The prompt clearly separates the request into three parts: Generate Narrative, Generate Spectrum Data, and **Perform Threat Assessment**. This structured request forces the AI to follow a logical, analytical process based on the user's parameters.
-   **Forcing Actionable Intelligence:** By including `classification` and `countermeasure` in the required JSON schema and explicitly instructing the AI on their tactical meaning, we compel the model to go beyond simple data generation. It must analyze the data it just created, identify anomalies, classify them, and propose a solution. This transforms the AI from a simple generator into a synthetic analyst.

### 3.2. Mode 2: Analysis (The Data Analyst)

When a user uploads a `.csv` or `.txt` file, the `buildPrompt` function in `geminiService.ts` generates a completely different set of instructions for the AI.

-   **Role Shift:** The prompt tasks the AI to analyze the *provided* raw data, not generate its own.
-   **Data Interpretation & Segmentation:** The core instruction is to interpret the raw, unstructured time-series data, identify patterns, and segment it into the user-specified number of logical timesteps. This is a complex data science task delegated entirely to the AI.
-   **Narrative Generation from Data:** The AI must create a narrative that *explains* the provided data, aligning its story with the signals and events it identifies.
-   **Structuring & Threat Assessment:** The AI is required to structure the provided data into the rigid JSON schema and then run the same high-level threat assessment on it, identifying anomalies within the user's real-world capture.

This dual-prompt methodology allows the application to leverage the vast, latent knowledge space of the foundation model to either simulate a plausible adversary or interpret and add intelligence to real-world data captures.

---

## 4. Core Data Flow: From Data to Decision

The application's data flow is an orchestrated process that handles two distinct paths—simulation and analysis—to transform user input into a comprehensive analytical report.

1.  **Initiation:** The user either:
    a.  Configures mission parameters in `SimulationControls` for a simulation.
    b.  Uploads a data file (`.csv`, `.txt`) via the `FileUpload` component, which automatically switches the `deceptionTarget` to `ANALYZE_UPLOADED_DATA`.

    This triggers the `handleRunAnalysis` function in `App.tsx`.

2.  **Data Preparation & Prompt Construction:**
    -   If a file was uploaded, `handleRunAnalysis` reads its text content.
    -   The `generateDeceptionScenario` function in `services/geminiService.ts` is invoked. The `buildPrompt` helper function checks for the presence of file content and constructs the appropriate prompt—either for simulation or for data analysis.

3.  **AI Tasking:** An asynchronous request is sent to the Gemini API. The payload includes the prompt and the critical `responseSchema`. This schema is the contract that guarantees the AI's output will be a structured, usable data object, regardless of the input mode.

4.  **Simulation / Analysis (Inside the AI):** The `gemini-2.5-flash` model executes the complex instructions based on the received prompt. It either generates a full simulation or interprets and structures the provided data, performing a threat assessment in both cases.

5.  **Response & Ingestion:** The client receives the JSON response. After a minor sanitization step, the data is parsed into a structured `AnalysisResult` object. `App.tsx` updates its state with this result, adding the entire session to `history` (and `localStorage`).

6.  **Dashboard Synchronization:** The state update triggers a re-render of the UI. The `DataVisualizer` receives the full data array to render the "waterfall" chart, while the `DeceptionScenario` receives the narrative and threat assessment, displaying only the information relevant to the current timestep. The entire dashboard is now populated with a fresh, comprehensive analysis.

---

## 5. Key Component Breakdown

### `App.tsx`
-   **Role:** The root component and single source of truth for all application state. Manages `params`, `analysisResult`, `isLoading`, `history`, and `currentTimestep`.

### `DataVisualizer.tsx`
-   **Role:** The primary data visualization component, built with **Recharts**.
-   **Spectrum "Waterfall" View:** Pivots the `visualizerData` array into a format suitable for Recharts, where each frequency point contains keys for every timestep (e.g., `{ frequency: 100.1, ts_0: -50, ts_1: -48, ... }`). Renders a `<Line>` for each timestep, dynamically highlighting the active one.
-   **FFT Analysis View:** Applies a selected **Windowing Function** (e.g., Hamming) to the data for the current timestep and executes a from-scratch, recursive **Cooley-Tey FFT algorithm** for cepstral analysis.

### `DeceptionScenario.tsx`
-   **Role:** Displays the actionable intelligence for the currently selected timestep.
-   **Threat Assessment & Advisory:** Its key sub-component. It takes the `anomalies` array for the current timestep and renders a tactical report, clearly displaying each anomaly's description, classification, and the AI's suggested countermeasure.

### `services/geminiService.ts`
-   **Role:** The sole interface for all communication with the Google Gemini API.
-   **`responseSchema`:** The most critical piece of the AI integration. This schema is highly detailed and explicitly requires the `classification` and `countermeasure` fields for every anomaly, transforming the AI into a reliable analytical tool.