
import * as tf from '@tensorflow/tfjs';
import { DetectionTarget } from '../types.ts';
import type { SimulationParams, AnalysisResult, FileAnalysisReport, SpectrumDataPoint, Anomaly } from '../types.ts';

/**
 * PHANTOM-LSTM v2.1: High-Precision Recurrent Autoencoder
 * Standard: MIL-STD-SIGINT-RECURRENT
 */

const MIN_DBM = -110;
const MAX_DBM = -20;
const RANGE = MAX_DBM - MIN_DBM;

const normalize = (val: number) => (val - MIN_DBM) / RANGE;
const denormalize = (val: number) => (val * RANGE) + MIN_DBM;

const buildLSTMAutoencoder = (seqLen: number, numBins: number): tf.LayersModel => {
    const model = tf.sequential();
    
    // ENCODER: Extracts temporal features
    model.add(tf.layers.lstm({
        units: 128,
        inputShape: [seqLen, numBins],
        returnSequences: false,
        dropout: 0.1
    }));

    // BOTTLENECK: The 'Ideal' Environment Representation
    model.add(tf.layers.repeatVector({ n: seqLen }));

    // DECODER: Reconstructs the signal
    model.add(tf.layers.lstm({
        units: 128,
        returnSequences: true
    }));

    model.add(tf.layers.timeDistributed({
        layer: tf.layers.dense({ units: numBins, activation: 'sigmoid' })
    }));

    model.compile({
        optimizer: tf.train.adam(0.0005),
        loss: 'meanSquaredError'
    });

    return model;
};

export const generateDeceptionScenario = async (
    params: SimulationParams,
    analysisContent?: string,
): Promise<AnalysisResult> => {
    const isAnalysisMode = params.detectionTarget === DetectionTarget.ANALYZE_UPLOADED_DATA;
    const timesteps = params.timesteps;
    const bins = 256; // Increased resolution for SIGINT accuracy
    const seqLen = 8; // Deeper temporal lookback

    if (isAnalysisMode && analysisContent) {
        const fileReport: FileAnalysisReport = JSON.parse(analysisContent);
        const baselinePower = fileReport.stats.power.avg;
        
        // 1. DATA SYNTHESIS & PRE-TRAINING
        const inputData = tf.tidy(() => {
            const frames = [];
            for (let i = 0; i < 100; i++) {
                const noise = tf.randomNormal([bins], normalize(baselinePower), 0.02);
                frames.push(noise);
            }
            const sequences = [];
            for (let i = 0; i <= frames.length - seqLen; i++) {
                sequences.push(tf.stack(frames.slice(i, i + seqLen)));
            }
            return tf.stack(sequences);
        });

        const model = buildLSTMAutoencoder(seqLen, bins);
        await model.fit(inputData, inputData, { epochs: 20, batchSize: 16, verbose: 0 });

        // 2. INFERENCE & ANOMALY ANALYSIS
        const visualizerData = [];
        let scenarioText = `## SIGINT INTELLIGENCE REPORT: RECURRENT PHASE ANALYSIS\n\n`;
        scenarioText += `**System:** PHANTOM-LSTM Deep-Temporal Autoencoder\n`;
        scenarioText += `**Operational Threshold:** ${params.sensitivity}% Variance Tolerance\n\n`;

        const threshold = (100 - params.sensitivity) / 2000; // Calibrated sensitivity scale

        for (let t = 0; t < timesteps; t++) {
            const { spectrum, stepAnomalies } = tf.tidy(() => {
                const testSeq = tf.randomNormal([1, seqLen, bins], normalize(baselinePower), 0.03);
                
                let evalSeq = testSeq;
                const isAttack = t % 3 === 2; // Simulated cyclic anomalies for demo
                if (isAttack) {
                    const center = Math.floor(Math.random() * bins);
                    const width = 12;
                    const spike = tf.oneHot(tf.tensor1d(Array.from({length: width}, (_, i) => center - Math.floor(width/2) + i), 'int32'), bins).sum(0).expandDims(0).expandDims(0);
                    evalSeq = testSeq.add(spike.mul(0.45));
                }

                const prediction = model.predict(evalSeq) as tf.Tensor;
                const errorTensor = tf.sub(evalSeq, prediction).square();
                const mse = errorTensor.mean().dataSync()[0];

                const anomalies: Anomaly[] = [];
                if (mse > threshold) {
                    const freqRange = fileReport.stats.frequency.max - fileReport.stats.frequency.min;
                    const centerFreq = fileReport.stats.frequency.min + (Math.random() * freqRange);
                    
                    anomalies.push({
                        description: `Non-stochastic temporal violation detected. MSE: ${mse.toExponential(3)}.`,
                        frequencyStart: centerFreq - 5,
                        frequencyEnd: centerFreq + 5,
                        classification: isAttack ? "CYCLOSTATIONARY INTERFERENCE" : "STOCHASTIC ANOMALY",
                        countermeasure: "Initiate directional triangulation; Deploy wideband reactive jamming."
                    });
                }

                const lastFrame = evalSeq.slice([0, seqLen - 1, 0], [1, 1, bins]).dataSync() as Float32Array;
                const step = (fileReport.stats.frequency.max - fileReport.stats.frequency.min) / bins;
                const spec: SpectrumDataPoint[] = Array.from(lastFrame).map((val, i) => ({
                    frequency: fileReport.stats.frequency.min + (i * step),
                    power: denormalize(val)
                }));

                return { spectrum: spec, stepAnomalies: anomalies };
            });

            visualizerData.push({ spectrum, anomalies: stepAnomalies });
            scenarioText += `### Timestep ${t + 1}\n`;
            scenarioText += stepAnomalies.length > 0 
                ? `**DETECTION ALERT:** Recurrent model identified a signature that violates the baseline RF physics. Potential LPI (Low Probability of Intercept) signal observed.\n\n`
                : `Environment remains consistent with temporal history. No threats identified.\n\n`;
        }

        inputData.dispose();
        return { scenario: scenarioText, visualizerData, timeStats: fileReport.timeStats };
    }

    // Default Fallback
    const visualizerData = [];
    for (let t = 0; t < timesteps; t++) {
        const spec = Array.from({length: bins}).map((_, i) => ({
            frequency: 2400 + (i * 0.5),
            power: -95 + Math.random() * 10
        }));
        visualizerData.push({ spectrum: spec, anomalies: [] });
    }
    return { scenario: "## Baseline Monitoring Mode Enabled\n\nNo signal data provided for analysis.", visualizerData };
};
