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
|                                 |   (Prompt + JSON Schema)   |   (gemini-2.5-flash)     |
|   +-------------------------+   |                            |                          |
|   |      App.tsx (State)    |   |  ---------------------->   +--------------------------+
|   |-------------------------|   |   (Structured JSON Data)             |
|   | Controls |   Visualizer |   |                                      |
|   |----------+--------------|   |                                      |
|   | Scenario |    History   |   |        +---------------------------------------------+
|   +-------------------------+   |        |  AI's Role: The Digital Adversary & Analyst |
+---------------------------------+        |---------------------------------------------|
       | (User Interaction)                | 1. Analyze "Ground Truth" Data (if provided)|
       |                                   | 2. Simulate Realistic Scenario Narrative    |
+------+-----------+                        | 3. Generate Correlated Spectrum Data        |
|      Analyst     |                        | 4. Perform Threat Assessment on own data    |
+------------------+                        | 5. Return complete, structured JSON         |
                                           +---------------------------------------------+
```

### 2.2. Architectural Principles

-   **Client-Centric:** All application logic, state management, and rendering occur within the user's browser.
-   **AI as an Analytical Engine:** The Gemini API is not merely a content generator. It is treated as a sophisticated, on-demand analytical service, responsible for the entire simulation and analysis lifecycle.
-   **Schema-Driven Reliability:** Communication with the AI is enforced by a strict JSON schema. This is the cornerstone of the application's reliability, ensuring the AI's response is always a predictable, machine-readable data structure.
-   **Dashboard-Oriented Design:** The UI is architected as a side-by-side analytical dashboard, creating a direct visual relationship between the spectrum data (`DataVisualizer`) and the actionable intelligence (`DeceptionScenario`).

---

## 3. The AI as a Digital Adversary & Analyst

The core innovation of PhantomBand is its use of the Gemini API not as a language model, but as a **non-deterministic analytical engine**. This is achieved through a combination of advanced prompt engineering and strict output schema enforcement.

-   **Role Priming:** The prompt begins by assigning the AI the persona of "PhantomBand, a specialized AI for advanced RF signal analysis and electronic warfare simulation." This sets the context and technical tone, guiding the model's behavior.
-   **Task Delegation & Structure:** The prompt clearly separates the request into three parts: Generate Narrative, Generate Spectrum Data, and **Perform Threat Assessment**. This structured request forces the AI to follow a logical, analytical process.
-   **Forcing Actionable Intelligence:** By including `classification` and `countermeasure` in the required JSON schema and explicitly instructing the AI on their tactical meaning, we compel the model to go beyond simple data generation. It must analyze the data it just created, identify anomalies, classify them, and propose a solution. This transforms the AI from a simple generator into a synthetic analyst.
-   **"Ground Truth" Analysis:** When a user uploads a file, the prompt is dynamically updated to include the file's entire content with the instruction to perform a "thorough and complete analysis" to use as a baseline. This grounds the AI's complex generative process in real-world data, ensuring relevance and fidelity.

This methodology allows the application to leverage the vast, latent knowledge space of the foundation model to simulate a plausible, intelligent adversary and then immediately act as the analyst to report on that adversary's actions.

---

## 4. Core Data Flow: From Data to Decision

The application's data flow is a single, orchestrated process designed to transform user-defined parameters into a comprehensive analytical report.

1.  **Initiation:** The user configures mission parameters in the `SimulationControls` and clicks "RUN ANALYSIS". This triggers the `handleRunAnalysis` function in `App.tsx`.

2.  **Prompt Construction:** The `generateDeceptionScenario` function in `services/geminiService.ts` is invoked. It assembles all simulation parameters and the full content of any uploaded file into a detailed prompt designed to guide the AI's analytical process.

3.  **AI Tasking:** An asynchronous request is sent to the Gemini API. The payload includes the prompt and the critical `responseSchema`. This schema is the contract that guarantees the AI's output will be a structured, usable data object.

4.  **Simulation & Analysis (Inside the AI):** The `gemini-2.5-flash` model executes the complex instructions. It analyzes the baseline data, generates the narrative and spectrum data, and then performs the threat assessment on its own output, packaging everything into a single JSON object.

5.  **Response & Ingestion:** The client receives the JSON response. After a minor sanitization step, the data is parsed into a structured `AnalysisResult` object. `App.tsx` updates its state with this result, adding the entire session to `history` (and `localStorage`).

6.  **Dashboard Synchronization:** The state update triggers a re-render of the UI. The `DataVisualizer` receives the full data array to render the "waterfall" chart, while the `DeceptionScenario` receives the narrative and threat assessment, displaying only the information relevant to the current timestep. The entire dashboard is now populated with a fresh, comprehensive analysis.

---

## 5. Key Component Breakdown

### `App.tsx`
-   **Role:** The root component and single source of truth for all application state. Manages `params`, `analysisResult`, `isLoading`, `history`, and `currentTimestep`.

### `DataVisualizer.tsx`
-   **Role:** The primary data visualization component, built with **Recharts**.
-   **Spectrum "Waterfall" View:** Pivots the `visualizerData` array into a format suitable for Recharts, where each frequency point contains keys for every timestep (e.g., `{ frequency: 100.1, ts_0: -50, ts_1: -48, ... }`). Renders a `<Line>` for each timestep, dynamically highlighting the active one.
-   **FFT Analysis View:** Applies a selected **Windowing Function** (e.g., Hamming) to the data for the current timestep and executes a from-scratch, recursive **Cooley-Tukey FFT algorithm** for cepstral analysis.

### `DeceptionScenario.tsx`
-   **Role:** Displays the actionable intelligence for the currently selected timestep.
-   **Threat Assessment & Advisory:** Its key sub-component. It takes the `anomalies` array for the current timestep and renders a tactical report, clearly displaying each anomaly's description, classification, and the AI's suggested countermeasure.

### `services/geminiService.ts`
-   **Role:** The sole interface for all communication with the Google Gemini API.
-   **`responseSchema`:** The most critical piece of the AI integration. This schema is highly detailed and explicitly requires the `classification` and `countermeasure` fields for every anomaly, transforming the AI into a reliable analytical tool.
