
# PhantomBand: Generative RF Environment Simulator

**PhantomBand is a generative AI/ML system that simulates realistic Radio Frequency (RF) environments for advanced training, mission rehearsal, and cyber deception operations.**

It provides a sophisticated "digital sandbox" where Electronic Warfare (EW) officers, Signals Intelligence (SIGINT) analysts, and cybersecurity professionals can model and interact with complex electromagnetic spectrum scenarios. By ingesting real-world signal data and leveraging the power of Google's Gemini AI, PhantomBand generates dynamic, multi-timestep simulations of electronic attacks, allowing users to develop and test countermeasures in a safe, controlled, and cost-effective environment.

---

## Key Features

-   **Generative Scenario Creation:** Utilizes the Google Gemini API to create rich, narrative-driven deception scenarios that evolve over multiple timesteps.
-   **Advanced Environment Modeling:** Configure detailed environmental factors including signal propagation models (Free Space, Hata, Log-distance) and atmospheric conditions (Clear, Rainy, Foggy) for higher-fidelity simulations.
-   **Real Data Ingestion:** Analyze your own signal data by uploading `.csv` or `.txt` files. The AI uses this data as a baseline to create more realistic and relevant simulations.
-   **Real-time "What-If" Analysis:** Instantly observe the impact of changing environmental conditions. Adjust parameters like interference level or propagation models on-the-fly and see the results immediately.
-   **Enhanced Scenario Readability:** The generated scenario is presented in an interactive accordion view, with collapsible sections for each timestep and automatic syntax highlighting for key technical terms (frequencies, power levels), making complex narratives easy to digest.
-   **Interactive Data Visualization:**
    -   Switch between **Area**, **Line**, and **Bar** charts for comprehensive spectrum analysis.
    -   Customize chart appearance with color pickers and line thickness controls.
    -   Filter the view by frequency and power to focus on signals of interest.
-   **Temporal Playback Controls:** Play, pause, and scrub through the generated timesteps of the simulation to observe how the RF environment changes over time.
-   **Session History:** Automatically saves each simulation run. Revisit, compare, and reload previous scenarios and their results with a single click.
-   **Reliable Structured AI Output:** Enforces a strict JSON schema on the AI's response, ensuring data integrity and eliminating runtime errors for a stable and predictable user experience.

---

## Technology Stack

-   **Frontend:** React, TypeScript
-   **AI Engine:** Google Gemini API (`gemini-2.5-flash`)
-   **Styling:** Tailwind CSS
-   **Charting Library:** Recharts

---

## Installation and Setup

Follow these steps to get PhantomBand running on your local machine.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later recommended)
-   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/phantomband.git
cd phantomband
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Set Up Your API Key

PhantomBand requires a Google Gemini API key to function.

1.  Create a file named `.env` in the root of the project directory.
2.  Add your API key to this file:

    ```
    # .env
    API_KEY=YOUR_GEMINI_API_KEY_HERE
    ```

    **IMPORTANT:** The application is hard-coded to read the key from this specific environment variable (`process.env.API_KEY`). Do not change the variable name.

### 4. Run the Development Server

```bash
npm start
# or
yarn start
```

The application should now be running and accessible at `http://localhost:3000` (or another port if specified).

---

## Usage Guide

1.  **Configure Simulation:** Use the controls on the left-hand panel to set the initial parameters for your scenario (Environment, Propagation Model, Interference Level, Deception Target, Timesteps).
2.  **Upload Signal Data (Optional):** Click the "UPLOAD FILE" panel to select a `.csv` or `.txt` file containing signal data from your local machine. The AI will use this data to inform its generation process.
3.  **Run Analysis:** Click the "RUN ANALYSIS" button. The application will send your configuration to the Gemini API and generate a new scenario.
4.  **Review the Scenario:** Read the generated narrative in the "Generated Deception Scenario" panel. Expand and collapse timesteps for clarity. Notice how technical terms are highlighted for quick identification.
5.  **Analyze the Spectrum:**
    -   Use the **Data Visualizer** to view the RF spectrum for the current timestep.
    -   Use the **playback controls** (play/pause button and slider) to move through the different timesteps and observe changes.
    -   Use the **filter controls** to narrow in on specific frequency or power ranges.
    -   Change the **chart type** and **appearance** to suit your analysis needs.
6.  **Perform "What-If" Analysis:** While the simulation is active, change any of the simulation parameters on the left. The simulation will automatically regenerate after a brief pause, allowing you to see the impact of your changes instantly.
7.  **Revisit History:** Click the "HISTORY" tab to see a list of your previous runs. Click on any item to instantly load its parameters and results back into the application.
