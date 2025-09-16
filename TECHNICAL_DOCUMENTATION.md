
# PhantomBand: Technical Documentation

## 1. Introduction

### 1.1. Purpose

This document provides a comprehensive technical overview of the PhantomBand application. It is intended for developers, system architects, and technical analysts who require a deep understanding of the system's internal workings.

### 1.2. Scope

This documentation covers the following areas:
-   System Architecture
-   Core Data Flow
-   Detailed Component Breakdown
-   AI Integration and Prompt Engineering
-   State Management Strategy
-   UI/UX and Styling
-   Future Enhancements

---

## 2. System Architecture

PhantomBand is a client-side **Single Page Application (SPA)** built with **React**. It operates on a serverless-style architecture, where the client directly communicates with the Google Gemini API, which serves as the "backend" for generative tasks.

### 2.1. High-Level Diagram

```
+------------------+      (HTTPS Request)       +---------------------+
|                  |  <---------------------->  |                     |
|  React Client    |      (JSON Payload)        |  Google Gemini API  |
| (Browser)        |                            | (gemini-2.5-flash)  |
|                  |  ---------------------->   |                     |
+------------------+      (JSON Response)       +---------------------+
       |
       | (User Interaction)
       |
+------+-----------+
|      User        |
+------------------+
```

### 2.2. Architectural Principles

-   **Client-Centric:** All application logic, state management, and rendering occur within the user's browser. This simplifies deployment and reduces infrastructure costs.
-   **AI as a Service (AIaaS):** The application treats the Gemini API as a powerful, on-demand data generation service. It offloads the complex task of scenario and data simulation to the AI, allowing the frontend to focus on user interaction and visualization.
-   **Structured Communication:** Communication with the AI is not free-form. It is highly structured via a predefined JSON schema, ensuring that the API responses are predictable, machine-readable, and reliable.

---

## 3. Core Data Flow

Understanding the data flow is critical to understanding the application. There are two primary data flow scenarios: Initial Analysis and Real-time Updates.

### 3.1. Initial Analysis Flow

This flow is triggered when the user clicks "RUN ANALYSIS".

1.  **User Action:** The user clicks the "Run Analysis" button in `App.tsx`.
2.  **State Update:** `handleRunAnalysis` is called. It sets the `isLoading` state to `true`, which displays the main loader, and clears any previous results or errors.
3.  **Prompt Construction:** The `generateDeceptionScenario` function in `services/geminiService.ts` is invoked. It calls `buildPrompt` to construct a detailed text prompt based on the current `simulationParams`, and the content of the `uploadedFile` (if any).
4.  **API Request:** An asynchronous request is made to the Gemini API (`ai.models.generateContent`). The request payload includes the prompt and a strict `config` object specifying the `responseMimeType` as `application/json` and providing the `responseSchema`.
5.  **AI Processing:** The `gemini-2.5-flash` model processes the prompt and generates a response that conforms to the requested JSON schema.
6.  **API Response:** The API returns a `GenerateContentResponse` object. The generated content is accessed via the `.text` property, which contains the JSON as a string.
7.  **Data Parsing & Validation:** The `geminiService` parses the JSON string into a structured `AnalysisResult` object. It performs basic validation to ensure the required fields (`scenario`, `visualizerData`) are present.
8.  **State Update (Success):** The `AnalysisResult` object is returned to `App.tsx`. The component updates its state:
    -   `setAnalysisResult(result)`
    -   `setIsLoading(false)`
    -   `setHistory([newHistoryItem, ...history])`
    -   `setIsPlaying(true)` if the result contains multiple timesteps.
9.  **UI Re-render:** The state update triggers a re-render. `DeceptionScenario` displays the new scenario text, and `DataVisualizer` displays the spectrum data for the initial timestep (`currentTimestep = 0`).

### 3.2. Real-time Update Flow

This flow is triggered automatically when a user adjusts a simulation parameter while a result is already displayed.

1.  **User Action:** User interacts with a control in `SimulationControls` (e.g., moves the "Timesteps" slider).
2.  **State Update:** The `onParamsChange` callback updates the `simulationParams` state in `App.tsx`.
3.  **Debouncing:** The `useDebounce` hook listens for changes to `simulationParams`. It waits for a 750ms pause in changes before updating the `debouncedParams` value. This prevents excessive API calls while the user is actively adjusting a control.
4.  **Effect Trigger:** A `useEffect` hook, which depends on `debouncedParams`, is triggered.
5.  **Update Handler:** The effect calls `handleLiveUpdate`. This function sets `isUpdating` to `true` (displaying the "APPLYING CHANGES..." overlay) and pauses playback.
6.  **Prompt Construction (Update Context):** The `generateDeceptionScenario` service is called again, but this time it includes `currentTimestep` and `existingScenario` as arguments. The `buildPrompt` function uses this extra context to create a specialized prompt that instructs the AI to generate a *new* scenario based on the *new* parameters, while being aware of the previous context.
7.  **API Request & Response:** The flow proceeds as in steps 4-8 of the Initial Analysis.
8.  **State Update & UI Re-render:** `App.tsx` updates `analysisResult` with the new data, resets `currentTimestep` to 0, and resumes playback if it was active before the update. `isUpdating` is set to `false`.

---

## 4. Component Breakdown

### `App.tsx`
-   **Role:** The root component and central orchestrator.
-   **Responsibilities:**
    -   Manages all primary application state (`simulationParams`, `analysisResult`, `isLoading`, `isPlaying`, etc.).
    -   Contains the core logic handlers (`handleRunAnalysis`, `handleLiveUpdate`, `handleTogglePlay`).
    -   Manages the active tab (`config` vs. `history`).
    -   Renders the main layout grid and passes state down to child components as props.

### `DataVisualizer.tsx`
-   **Role:** Renders the RF spectrum chart, FFT analysis, and all associated UI controls.
-   **Responsibilities:**
    -   Receives `data` (for the current timestep) as a prop from `App.tsx`.
    -   Manages its own internal UI state: `filters`, `chartType`, `chartView` (`spectrum` or `fft`), and `chartOptions`.
    -   **Persistence:** Uses `useEffect` hooks to save and load its UI state to/from `localStorage`, ensuring user preferences are remembered across sessions.
    -   **Dual View Rendering:**
        -   **Spectrum View:** Uses the `recharts` library to render Area, Line, or Bar charts. It includes rich, interactive features like custom tooltips, user-configurable colors and stroke widths, and gradient fills for bar charts to improve clarity. It also includes logic to prevent rendering overly dense bar charts, guiding the user to a more appropriate visualization.
        -   **FFT View:** Provides a secondary analysis mode. It calculates a Fast Fourier Transform on the power values of the spectrum data (a form of cepstral analysis). This is computationally intensive and is memoized using `useMemo`. The component includes a from-scratch, recursive implementation of the Cooley-Tukey FFT algorithm, complete with data padding to the next power of 2, to analyze periodicities in the spectrum itself. The result is displayed as a bar chart of magnitude vs. quefrency.
    -   Contains the logic for filtering the displayed data based on user input, which affects both Spectrum and FFT views.

### `DeceptionScenario.tsx`
-   **Role:** Renders the AI-generated scenario text in a highly readable and interactive format.
-   **Responsibilities:**
    -   Receives the `scenario` string as a prop.
    -   **Text Parsing:** On render, it parses the scenario string, splitting it into sections based on "Timestep" headers (e.g., `**Timestep 1**`).
    -   **State Management:** Manages its own internal UI state (`openSections`) to track which accordion sections are expanded or collapsed. The first section is open by default.
    -   **Syntax Highlighting:** Applies regex-based syntax highlighting to the content of each section. It identifies and wraps key technical terms (frequencies, power levels, keywords) in `<span>` tags with specific CSS classes for color-coding. It also handles Markdown bolding.
    -   **UI Rendering:** Renders the scenario as a series of collapsible panels (an accordion), allowing users to focus on one timestep at a time.

### `SimulationControls.tsx`
-   **Role:** Displays the form for configuring simulation parameters.
-   **Responsibilities:**
    -   Receives `params` and `onParamsChange` as props.
    -   Acts as a "controlled component." It does not manage its own state.
    -   Renders dropdowns for all simulation parameters, including the granular environment settings: `Environment Type`, `Signal Propagation Model`, and `Atmospheric Conditions`.
    -   Uses a separate `handleEnvironmentChange` handler to manage updates to the nested `params.environment` object.
    -   When a user changes an input, it calls the `onParamsChange` function to lift the state change up to `App.tsx`.
    -   Conditionally renders the "Custom Scenario" textarea.

### `FileUpload.tsx`
-   **Role:** Manages file selection and reading.
-   **Responsibilities:**
    -   Handles drag-and-drop events (`handleDragOver`, `handleDrop`).
    -   Uses a hidden file input (`<input type="file">`) for click-to-select functionality.
    -   When a file is selected, it uses the `FileReader` API to read its content as text.
    -   Calls the `onFileChange` prop to pass the `File` object up to `App.tsx` and the `setFileContent` function to pass up the text content.

### `services/geminiService.ts`
-   **Role:** The sole interface for communication with the Google Gemini API.
-   **Responsibilities:**
    -   Initializes the `GoogleGenAI` client.
    -   Defines the `responseSchema` that enforces the structure of the AI's output.
    -   Contains the `buildPrompt` function, which is the core of the **prompt engineering** logic.
    -   Exports `generateDeceptionScenario`, the asynchronous function that encapsulates the entire process of making an API call, parsing the response, and handling errors.

---

## 5. AI Integration & Prompt Engineering

The intelligence of PhantomBand resides almost entirely in the quality of the prompts sent to the Gemini API.

### 5.1. The `buildPrompt` Function

This function dynamically constructs the prompt based on application state. Its key sections are:
1.  **Role Priming:** The prompt begins by telling the AI its role: `You are PhantomBand, a specialized AI for advanced RF signal analysis...`. This sets the context and tone.
2.  **Update Instructions (Conditional):** If `existingScenario` is provided, a special section is added to the prompt. This section explicitly tells the AI that this is a real-time update, provides the previous context, and instructs it to generate a *brand new, complete scenario* based on the *new* parameters. This is crucial for preventing the AI from just trying to append a small change.
3.  **Task Definition:** Clearly lists the two main tasks: "Generate a Deception Scenario" (the narrative) and "Generate Spectrum Data".
4.  **Parameter Injection:** All `simulationParams` are explicitly listed in the prompt, ensuring the AI considers every user setting. This includes the granular environment details:
    -   `Environment Type`
    -   `Signal Propagation Model`
    -   `Atmospheric Conditions`
    -   `Interference Level`
    -   `Deception Target`
    -   `Timesteps`
5.  **File Content Injection (Conditional):** If `fileContent` exists, it is embedded directly into the prompt within a code block, with clear instructions to use it as the baseline for the simulation.
6.  **Output Requirements:** The prompt concludes by re-emphasizing the need for a single JSON object matching the required schema. This reinforces the instructions provided in the API call's `config`.

### 5.2. API Configuration

The `ai.models.generateContent` call is configured for reliability and performance:
-   **`model: "gemini-2.5-flash"`:** Chosen for its low latency, which is essential for the real-time update feature to feel responsive.
-   **`responseMimeType: "application/json"` & `responseSchema`:** This is the most critical part of the configuration. It forces the model to output a valid JSON object that conforms to our predefined structure. This eliminates the need for fragile string parsing on the client and is the key to the application's stability.
-   **`temperature: 0.8`:** A slightly higher temperature is used to encourage creativity in scenario generation, leading to more diverse and interesting results for training purposes.

---

## 6. State Management

The application employs a simple yet effective state management strategy using only React's built-in hooks.

-   **Centralized State (`App.tsx`):** All state critical to the entire application's logic (the simulation parameters, the results, loading states) is held in the top-level `App` component. This provides a single source of truth. The `simulationParams` state now includes a nested `environment` object to manage the more detailed settings.
-   **Props Drilling:** State is passed down to child components via props. For an application of this size, this is more straightforward than introducing a complex state management library like Redux or Zustand.
-   **Lifting State Up:** Child components (`SimulationControls`, `FileUpload`) notify the parent of changes via callback functions passed as props (e.g., `onParamsChange`).
-   **Component-Local State:** UI-specific state that doesn't affect the rest of the application is managed locally within the component itself. Prime examples are `DataVisualizer` (managing filter/appearance settings) and `DeceptionScenario` (managing the open/closed state of its accordion sections).

---

## 7. UI/UX and Styling

### 7.1. Design Philosophy
The user interface is designed to evoke a "tactical command center" aesthetic. It utilizes a dark theme with high-contrast amber accents to create a professional, immersive environment that is easy on the eyes during long analysis sessions. The layout is clean and structured, prioritizing data clarity and ease of use.

### 7.2. Technology
-   **Tailwind CSS:** This utility-first CSS framework was chosen for its ability to enable rapid and consistent styling directly within the JSX. The configuration is defined inline in `index.html` for simplicity, which is well-suited for a single-page application of this scope.
-   **Custom Global Styles:** A few targeted CSS rules are defined in the `<style>` block of `index.html`. These handle elements that are difficult to style with utility classes alone, such as the global scrollbar, custom `input[type=range]` sliders, and simple keyframe animations for UI elements.
-   **Fonts:** The application uses two primary fonts:
    -   **Orbitron:** A display font used for headings and titles to give a futuristic, technical feel.
    -   **Roboto Mono:** A monospaced font used for all body text, labels, and data readouts to ensure maximum clarity and readability.

---

## 8. Future Enhancements

The current architecture provides a solid foundation for future expansion. Potential enhancements include:

-   **Advanced AI Interaction:** Implement a chat-based interface where users can ask the AI follow-up questions about the generated scenario (e.g., "What would happen if I increased my signal power by 10dBm?").
-   **Data Export:** Add functionality to export the generated `visualizerData` as a `.csv` file, allowing the synthetic data to be used in other external analysis tools.
-   **Expanded Visualization Options:** Incorporate more sophisticated chart types, such as a waterfall display or a spectrogram, for deeper and more nuanced signal analysis.
-   **Threat Template Library:** Allow users to save specific `simulationParams` configurations as named "threat templates" for quick recall and consistent reuse in training exercises.
-   **Authentication & User Profiles:** For multi-user or enterprise environments, introduce user accounts to allow individuals to save and manage their own private session histories and template libraries.

---

## 9. Conclusion

PhantomBand is a robust, interactive, and client-centric application that effectively leverages a powerful generative AI as a reliable service. Its architecture is intentionally designed for stability through structured API communication, interactivity via a responsive state management model, and maintainability through a clear component structure. This document provides the definitive technical blueprint for understanding, maintaining, and extending the capabilities of the PhantomBand system.
