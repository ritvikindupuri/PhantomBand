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
            description: "A detailed, step-by-step narrative of the deception scenario. Describe the attacker's actions, the target's expected response, and the impact on the RF environment over the specified number of timesteps. Use Markdown for formatting, especially for titles and key points."
        },
        visualizerData: {
            type: Type.ARRAY,
            description: "An array of spectrum data arrays, one for each timestep. Each inner array represents the RF spectrum at that point in time.",
            items: {
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
            }
        }
    },
    required: ["scenario", "visualizerData"]
};

const buildPrompt = (
    params: SimulationParams,
    file: File | null,
    fileContent: string | null,
    currentTimestep?: number,
    existingScenario?: string
): string => {
    let prompt = `
You are PhantomBand, a specialized AI for advanced RF signal analysis and electronic warfare simulation. Your task is to generate a realistic and detailed deception scenario based on the user's specifications.
`;

    if (existingScenario && currentTimestep !== undefined) {
        prompt += `
**Simulation Update Instructions:**
*   This is a real-time update to an ongoing simulation.
*   The simulation was at timestep ${currentTimestep + 1} of the total requested timesteps.
*   The user has just adjusted the parameters in real-time.
*   **Previous Scenario Context (for reference only):** "${existingScenario.substring(0, 500)}..."
*   **Your Primary Task:** Generate a brand new, complete scenario from scratch based on the **new** simulation parameters listed below. The new parameters are the definitive source of truth. Create a new narrative and regenerate ALL ${params.timesteps} timesteps of spectrum data to match these new parameters. Maintain logical consistency where possible, but prioritize accurately reflecting the new settings.
`;
    }

    prompt += `
**Analysis Request:**

1.  **Generate a Deception Scenario:** Create a narrative describing the specified electronic attack. The scenario should evolve over ${params.timesteps} timesteps. Describe the attacker's actions, the target's vulnerabilities, and the changing RF environment. The tone should be technical and analytical, like a professional after-action report.
2.  **Generate Spectrum Data:** For each timestep, create a corresponding set of RF spectrum data points (frequency in MHz, power in dBm) that visually represent the events in the scenario. The data should be plausible and reflect the chosen environment, interference, and deception target.

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

    if (file && fileContent) {
        prompt += `
**Uploaded File for Full Analysis:**
*   **File Name:** ${file.name}
*   **File Type:** ${file.type}
*   **Instructions:** You are being provided with the FULL content of the uploaded file. Your task is to perform a thorough and complete analysis of this data. Every single column, every single cell, and every single piece of data must be meticulously examined to inform the simulation. Use this comprehensive analysis as the baseline or target signal for the deception scenario.

*   **Full File Content:**
\`\`\`
${fileContent}
\`\`\`
`;
    }

    prompt += `
**Output Requirements:**
Provide your response as a single, valid JSON object that strictly adheres to the provided schema. The 'scenario' should be a well-formatted Markdown string. The 'visualizerData' must be an array of arrays, with one inner array of spectrum data for each of the ${params.timesteps} timesteps. Ensure the data reflects the events in the scenario (e.g., a jamming signal should appear as a high-power, wide-band signal in the data). Do not include any explanatory text outside of the JSON object.
`;
    return prompt;
};


export const generateDeceptionScenario = async (
    params: SimulationParams,
    file: File | null,
    fileContent: string | null,
    currentTimestep?: number,
    existingScenario?: string
): Promise<AnalysisResult> => {

    const prompt = buildPrompt(params, file, fileContent, currentTimestep, existingScenario);

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

        const result: AnalysisResult = JSON.parse(jsonText);

        // Basic validation
        if (!result.scenario || !result.visualizerData || !Array.isArray(result.visualizerData)) {
            throw new Error("Invalid data structure received from API.");
        }
        
        if (result.visualizerData.length !== params.timesteps) {
             console.warn(`API returned ${result.visualizerData.length} timesteps, but ${params.timesteps} were requested. The scenario may be incomplete.`);
             // Pad the array if the AI didn't return enough timesteps
             while(result.visualizerData.length < params.timesteps) {
                result.visualizerData.push([]);
             }
        }
        
        // Ensure visualizerData is not empty if scenario is valid
        if (result.visualizerData.length === 0) {
            result.visualizerData = Array(params.timesteps).fill([]);
        }


        return result;

    } catch (e) {
        console.error("Error generating deception scenario:", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during API communication.";
        // Return a structured error response that App.tsx can handle
        return {
            scenario: `**Error: Failed to generate scenario.**\n\n**Reason:** ${errorMessage}\n\nPlease check your API key, network connection, and the prompt details. The model may have been unable to generate a valid response for the given parameters.`,
            visualizerData: Array(params.timesteps).fill([{ frequency: 0, power: 0 }])
        };
    }
};