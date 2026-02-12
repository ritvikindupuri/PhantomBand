import { GoogleGenAI, Type } from "@google/genai";
import { DetectionTarget } from '../types.ts';
import type { SimulationParams, AnalysisResult, FileAnalysisReport } from '../types.ts';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        scenario: {
            type: Type.STRING,
            description: "A detailed intelligence narrative of the detected activities. Describe the identified patterns, suspected sources, and tactical significance. Use Markdown with '## Timestep X' headers."
        },
        visualizerData: {
            type: Type.ARRAY,
            description: "Spectrum and anomaly data for each timestep.",
            items: {
                type: Type.OBJECT,
                properties: {
                    spectrum: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                frequency: { type: Type.NUMBER },
                                power: { type: Type.NUMBER }
                            },
                            required: ["frequency", "power"]
                        }
                    },
                    anomalies: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                description: { type: Type.STRING },
                                frequencyStart: { type: Type.NUMBER },
                                frequencyEnd: { type: Type.NUMBER },
                                classification: { type: Type.STRING },
                                countermeasure: { type: Type.STRING }
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

const systemInstruction = `You are PhantomBand, a Senior SIGINT Analyst. Your task is to analyze RF data summaries and identify tactical anomalies. 
Focus strictly on electronic warfare, signal intelligence, and anomaly detection. 
Provide narratives grounded in the provided statistical data. Separating reports by "## Timestep X".`;

const buildUserPrompt = (params: SimulationParams, analysisReportJson?: string): string => {
    let prompt = `Analyze the RF environment for ${params.detectionTarget} over ${params.timesteps} timesteps with ${params.sensitivity}% sensitivity.`;
    
    if (analysisReportJson) {
        prompt += `\n\n**DATA REPORT:**\n${analysisReportJson}`;
    }

    if (params.customPrompt) {
        prompt += `\n\n**USER FOCUS:**\n${params.customPrompt}`;
    }

    prompt += `\n\nReturn valid JSON matching the schema.`;
    return prompt;
};

export const generateDeceptionScenario = async (
    params: SimulationParams,
    analysisContent?: string,
): Promise<AnalysisResult> => {
    const userPrompt = buildUserPrompt(params, analysisContent);
    const report: FileAnalysisReport | null = analysisContent ? JSON.parse(analysisContent) : null;

    try {
        // Fix: Use gemini-3-pro-preview for complex reasoning tasks as per guidelines
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: userPrompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.7,
            },
        });
        
        // Fix: Access .text property directly as it is a getter, not a method.
        const result: Omit<AnalysisResult, 'timeStats'> = JSON.parse(response.text || '{}');

        if (result.visualizerData && result.visualizerData.length < params.timesteps) {
             while(result.visualizerData.length < params.timesteps) {
                result.visualizerData.push({ spectrum: [], anomalies: [] });
             }
        }

        return {
            scenario: result.scenario || "Analysis failed to generate narrative.",
            visualizerData: result.visualizerData || [],
            timeStats: report?.timeStats,
        };

    } catch (e) {
        console.error("Error in geminiService:", e);
        return {
            scenario: `**Error:** ${e instanceof Error ? e.message : "API Error"}`,
            visualizerData: Array(params.timesteps).fill({ spectrum: [{ frequency: 0, power: 0 }], anomalies: [] }),
            timeStats: report?.timeStats,
        };
    }
};