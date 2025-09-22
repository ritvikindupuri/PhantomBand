# PhantomBand: Technical Documentation

## 1. Introduction

### 1.1. Purpose

This document provides a comprehensive technical overview of the PhantomBand application. It is intended for developers, system architects, and technical analysts who require a deep understanding of the system's architecture, data flow, AI integration, and component-level implementation.

### 1.2. Scope

This documentation covers the application's final, military-grade feature set, including its dual capabilities for AI-driven scenario generation and real-world data analysis.

---

## 2. System Architecture

PhantomBand is a client-side **Single Page Application (SPA)** built with **React**. It operates on an **"AI as an Analytical Service"** model, where the client directly communicates with the Google Gemini API. This architecture offloads complex simulation and analysis tasks to the AI, allowing the frontend to focus on providing a responsive, professional user experience.

### 2.1. High-Level Diagram

```
C:\Users\ritvi\Downloads\diagram-export-9-22-2025-9_42_23-AM.png
```

### 2.2. Architectural Principles

-   **Client-Centric:** All application logic, state management, and data pre-processing occur within the user's browser.
-   **AI as an Analytical Engine:** The Gemini API is not merely a content generator. It is treated as a sophisticated, on-demand analytical service, responsible for either generating a full simulation or interpreting a data summary to build a grounded narrative.
-   **Schema-Driven Reliability:** Communication with the AI is enforced by a strict JSON schema. This is the cornerstone of the application's reliability, ensuring the AI's response is always a predictable, machine-readable data structure.

---

## 3. The AI as a Digital Adversary & Analyst

The core innovation of PhantomBand is its use of the Gemini API not as a language model, but as a **non-deterministic analytical engine**. This is achieved through a combination of advanced prompt engineering and strict output schema enforcement.

-   **Role Priming:** The system instruction primes the AI with the persona of "PhantomBand, a specialized AI for advanced RF signal analysis and electronic warfare simulation." This sets the context and technical tone.
-   **Dual-Prompt System:** The `buildUserPrompt` function dynamically constructs one of two prompts:
    1.  A **generation prompt** based on user-selected parameters.
    2.  An **analysis prompt** that includes a JSON summary of user-uploaded data, instructing the AI to act as a SIGINT analyst and create a narrative that explains the provided facts.
-   **Forcing Actionable Intelligence:** By including `classification` and `countermeasure` in the required JSON schema, we compel the model to go beyond simple data generation. It must analyze the data (either its own or the summary provided), identify anomalies, classify them, and propose a solution.

---

## 4. Core Data Flows

The application operates in one of two primary modes: `generate` or `analyze`.

### 4.1. File Analysis & Pre-Processing Workflow (`analyze` mode)

This workflow is designed to handle user-provided data safely and efficiently on the client side before ever contacting the AI.

1.  **File Ingestion:** The user uploads a `.csv` or `.txt` file via the `FileUpload` component.
2.  **Large File Handling:** A critical check is performed. **If the file exceeds 50 MB, the workflow pauses.** The UI presents options to analyze a 50 MB segment (start, middle, or end). This is a mandatory safeguard to prevent the browser tab from crashing due to excessive memory consumption. When a segment is chosen, the browser's efficient `File.slice()` method is used to create a `Blob` representing that chunk without loading the entire file into memory.
3.  **Client-Side Parsing:** The `parseAndAnalyzeCsv` function in `utils/csvParser.ts` is called with the `File` or `Blob`. This robust parser:
    -   Handles various delimiters (`comma`, `tab`, `space`, etc.).
    -   Uses a score-based system with an expanded keyword list to intelligently detect `frequency` and `power` columns from text headers.
    -   Performs a full statistical analysis on the provided data, calculating min/max/avg values and identifying the top 10 peak power events.
4.  **Report Generation:** The parser returns a `FileAnalysisReport` object—a compact JSON summary of the file's characteristics. This report is stored in the `App.tsx` state.
5.  **AI Tasking:** When "ANALYZE & GENERATE SCENARIO" is clicked, `handleRunAnalysis` sends this `FileAnalysisReport` to the `geminiService`, which uses the specialized analysis prompt.

### 4.2. Scenario Generation Workflow (`generate` mode)

1.  **Initiation:** The user configures mission parameters in the `SimulationControls` and clicks "RUN ANALYSIS". This triggers `handleRunAnalysis` in `App.tsx`.
2.  **Prompt Construction:** `generateDeceptionScenario` in `services/geminiService.ts` assembles the parameters into the generation prompt.
3.  **AI Tasking & Response:** The request is sent to the Gemini API with the `responseSchema`. The client receives the complete `AnalysisResult` JSON object.
4.  **State Update & Ingestion:** `App.tsx` updates its state with the `AnalysisResult`, triggering a full re-render of the dashboard.

---

## 5. Key Component Breakdown

### `App.tsx`
-   **Role:** The root component and single source of truth for all application state. Manages `params`, `analysisResult`, `isLoading`, `history`, `currentTimestep`, and the crucial `mode` state.

### `FileUpload.tsx`
-   **Role:** Manages the entire file selection and pre-analysis UI.
-   **Key Logic:** Contains the logic for the 50 MB file size check and renders the segment selection controls for large files. It is responsible for triggering the `onRunFileAnalysis` callback with either the full file or a sliced blob.

### `DataVisualizer.tsx`
-   **Role:** The primary data visualization component, built with **Recharts**.
-   **Spectrum "Waterfall" View:** Pivots the `visualizerData` array into a format suitable for Recharts, where each frequency point contains keys for every timestep (e.g., `{ frequency: 100.1, ts_0: -50, ts_1: -48, ... }`).
-   **FFT Analysis View:** Applies a selected **Windowing Function** (e.g., Hamming) to the data and executes a from-scratch, recursive **Cooley-Tukey FFT algorithm**.

### `services/geminiService.ts`
-   **Role:** The sole interface for all communication with the Google Gemini API.
-   **`responseSchema`:** The most critical piece of the AI integration. This schema is highly detailed and explicitly requires the `classification` and `countermeasure` fields for every anomaly.
-   **`buildUserPrompt`:** Dynamically selects the prompt based on whether `analysisContent` is provided, enabling the dual-mode functionality.
