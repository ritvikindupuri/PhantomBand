import { GoogleGenAI, Type } from "@google/genai";
import { DeceptionTarget } from '../types';
import type { SimulationParams, AnalysisResult } from '../types';

// Per guidelines, API key must be from process.env
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        scenario: {
            type: Type.STRING,
            description: "A detailed, step-by-step narrative of the deception scenario. Describe the attacker's actions, the target's expected response, and the impact on the RF environment over the specified number of timesteps. Use Markdown for formatting. For each timestep, the header must be '## Timestep X' or '**Timestep X**'."
        },
        visualizerData: {
            type: Type.ARRAY,
            description: "An array of data objects, one for each timestep. Each object contains the spectrum data and any detected anomalies.",
            items: {
                type: Type.OBJECT,
                properties: {
                    spectrum: {
                        type: Type.ARRAY,
                        description: "Spectrum data for a single timestep, containing multiple frequency-power data points.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                frequency: {
                                    type: Type.NUMBER,
                                    description: "Frequency in MHz."
                                },
                                power: {
                                    type: Type.NUMBER,
                                    description: "Power level in dBm."
                                }
                            },
                            required: ["frequency", "power"]
                        }
                    },
                    anomalies: {
                        type: Type.ARRAY,
                        description: "An array of detected anomalies in the spectrum for this timestep. This should include unexpected signals, jamming, or other notable events.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                description: {
                                    type: Type.STRING,
                                    description: "A concise description of the anomaly (e.g., 'Unidentified hopping signal', 'Broadband jamming noise')."
                                },
                                frequencyStart: {
                                    type: Type.NUMBER,
                                    description: "The starting frequency of the anomalous signal in MHz."
                                },
                                frequencyEnd: {
                                    type: Type.NUMBER,
                                    description: "The ending frequency of the anomalous signal in MHz."
                                },
                                classification: {
                                    type: Type.STRING,
                                    description: "A tactical classification of the anomaly (e.g., 'Jamming', 'Spoofing', 'UAV Downlink', 'Unknown Signal')."
                                },
                                countermeasure: {
                                    type: Type.STRING,
                                    description: "A suggested tactical countermeasure for the classified anomaly (e.g., 'Deploy targeted jamming', 'Initiate signal triangulation', 'Monitor for further activity')."
                                }
                            },
                            required: ["description", "frequencyStart", "frequencyEnd", "classification", "countermeasure"]
                        }
                    }
                },
                required: ["spectrum", "anomalies"]
            }
        }
    },
    required: ["scenario", "visualizerData"]
};

const buildPrompt = (
    params: SimulationParams
): string => {
    let prompt = `
You are PhantomBand, a specialized AI for advanced RF signal analysis and electronic warfare simulation. Your task is to generate a realistic and detailed deception scenario based on the user's specifications, including performing automated threat assessment.

**Analysis Request:**

1.  **Generate a Deception Scenario:** Create a narrative for a professional after-action report. The scenario must evolve over ${params.timesteps} timesteps.
    **Formatting is critical.** The entire narrative must be a single markdown string. Each timestep must be clearly separated by a markdown header like "## Timestep 1" or "**Timestep 1**". Under each timestep header, structure the narrative using these exact Markdown subheadings:
    - **SITUATION:** Brief overview of the current state.
    - **ACTION:** Detailed description of the attacker's actions and techniques used.
    - **IMPACT:** Analysis of the effect on the target and the RF environment.
    - **OBSERVATIONS:** Key signals or anomalies to look for in the spectrum data.
    Use concise bullet points under each subheading where appropriate. The tone must be technical and analytical.

2.  **Generate Spectrum Data:** For each timestep, create a corresponding set of RF spectrum data points (frequency in MHz, power in dBm) that visually represent the events in the scenario. The data should be plausible and reflect the chosen environment, interference, and deception target.

3.  **Perform Threat Assessment:** For each timestep, analyze the spectrum data you just generated. Identify any anomalous signals (jammers, unexpected carriers, hopping signals, etc.). For each anomaly found, provide:
    - A concise **description**.
    - Its **start/end frequency range**.
    - A tactical **classification** (e.g., 'Jamming', 'Spoofing', 'UAV Downlink').
    - A suggested tactical **countermeasure** (e.g., 'Deploy targeted jamming', 'Initiate signal triangulation').
    If no anomalies are present for a timestep, return an empty array for the anomalies.

**Simulation Parameters:**
*   **Environment Type:** ${params.environment.type}
*   **Signal Propagation Model:** ${params.environment.propagationModel}
*   **Atmospheric Conditions:** ${params.environment.atmosphericCondition}
*   **Interference Level:** ${params.interference}
*   **Deception Target:** ${params.deceptionTarget}
*   **Timesteps:** ${params.timesteps}
`;

    if (params.deceptionTarget === DeceptionTarget.GENERATE_CUSTOM_SCENARIO && params.customPrompt) {
        prompt += `*   **Custom Scenario Details:** ${params.customPrompt}\n`;
    }

    prompt += `
**Output Requirements:**
Provide your response as a single, valid JSON object that strictly adheres to the provided schema. The 'scenario' should be a well-formatted Markdown string. The 'visualizerData' must be an array of objects, each containing 'spectrum' and 'anomalies' arrays, for each of the ${params.timesteps} timesteps. Ensure the data reflects the events in the scenario. Do not include any explanatory text outside of the JSON object.
`;
    return prompt;
};


export const generateDeceptionScenario = async (
    params: SimulationParams
): Promise<AnalysisResult> => {

    const prompt = buildPrompt(params);

    try {
        const response = await ai.models.generateContent({
            // Per guidelines, use 'gemini-2.5-flash'
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                // Higher temperature for more creative scenarios
                temperature: 0.8,
            },
        });
        
        // Per guidelines, access text property directly.
        const jsonText = response.text;
        
        if (!jsonText) {
            throw new Error("API returned an empty response.");
        }

        // Pre-process the JSON to fix a common generation error where a minus sign is not followed by a number.
        const sanitizedJsonText = jsonText.replace(/:(\s*-\s*)(?![0-9])/g, ':$10');

        const result: AnalysisResult = JSON.parse(sanitizedJsonText);

        // Basic validation
        if (!result.scenario || !result.visualizerData || !Array.isArray(result.visualizerData)) {
            throw new Error("Invalid data structure received from API.");
        }
        
        if (result.visualizerData.length !== params.timesteps) {
             console.warn(`API returned ${result.visualizerData.length} timesteps, but ${params.timesteps} were requested. The scenario may be incomplete.`);
             // Pad the array if the AI didn't return enough timesteps
             while(result.visualizerData.length < params.timesteps) {
                result.visualizerData.push({ spectrum: [], anomalies: [] });
             }
        }
        
        // Ensure visualizerData is not empty if scenario is valid
        if (result.visualizerData.length === 0) {
            result.visualizerData = Array(params.timesteps).fill({ spectrum: [], anomalies: [] });
        }


        return result;

    } catch (e) {
        console.error("Error generating deception scenario:", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during API communication.";
        // Return a structured error response that App.tsx can handle
        return {
            scenario: `**Error: Failed to generate scenario.**\n\n**Reason:** ${errorMessage}\n\nPlease check your API key, network connection, and the prompt details. The model may have been unable to generate a valid response for the given parameters.`,
            visualizerData: Array(params.timesteps).fill({ spectrum: [{ frequency: 0, power: 0 }], anomalies: [] })
        };
    }
};