import * as tf from '@tensorflow/tfjs';
import { DetectionTarget } from '../types.ts';
import type { SimulationParams, AnalysisResult, FileAnalysisReport, SpectrumDataPoint, Anomaly } from '../types.ts';

const MIN_DBM = -110;
const MAX_DBM = -20;
const RANGE = MAX_DBM - MIN_DBM;

const normalize = (val: number) => (val - MIN_DBM) / RANGE;
const denormalize = (val: number) => (val * RANGE) + MIN_DBM;

// --- Isolation Forest Implementation ---
class IsolationTree {
    featureIndex: number = 0;
    splitValue: number = 0;
    left: IsolationTree | null = null;
    right: IsolationTree | null = null;
    size: number = 0;
    isLeaf: boolean = false;

    constructor(data: number[][], currentHeight: number, maxHeight: number) {
        this.size = data.length;
        if (currentHeight >= maxHeight || data.length <= 1) {
            this.isLeaf = true;
            return;
        }

        const numFeatures = data[0].length;
        this.featureIndex = Math.floor(Math.random() * numFeatures);
        
        let min = data[0][this.featureIndex];
        let max = data[0][this.featureIndex];
        for (const row of data) {
            if (row[this.featureIndex] < min) min = row[this.featureIndex];
            if (row[this.featureIndex] > max) max = row[this.featureIndex];
        }

        if (min === max) {
            this.isLeaf = true;
            return;
        }

        this.splitValue = Math.random() * (max - min) + min;
        const leftData = data.filter(row => row[this.featureIndex] < this.splitValue);
        const rightData = data.filter(row => row[this.featureIndex] >= this.splitValue);

        if (leftData.length === 0 || rightData.length === 0) {
            this.isLeaf = true;
            return;
        }

        this.left = new IsolationTree(leftData, currentHeight + 1, maxHeight);
        this.right = new IsolationTree(rightData, currentHeight + 1, maxHeight);
    }

    getPathLength(point: number[], currentHeight: number): number {
        if (this.isLeaf) {
            return currentHeight + this.c(this.size);
        }
        if (point[this.featureIndex] < this.splitValue) {
            return this.left!.getPathLength(point, currentHeight + 1);
        } else {
            return this.right!.getPathLength(point, currentHeight + 1);
        }
    }

    private c(n: number): number {
        if (n <= 1) return 0;
        if (n === 2) return 1;
        return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
    }
}

class IsolationForest {
    trees: IsolationTree[] = [];
    sampleSize: number = 0;

    constructor(data: number[][], numTrees: number = 100, sampleSize: number = 256) {
        this.sampleSize = Math.min(sampleSize, data.length);
        const maxHeight = Math.ceil(Math.log2(this.sampleSize));

        for (let i = 0; i < numTrees; i++) {
            const sample = this.getSample(data, this.sampleSize);
            this.trees.push(new IsolationTree(sample, 0, maxHeight));
        }
    }

    private getSample(data: number[][], size: number): number[][] {
        const sample = [];
        const indices = new Set<number>();
        while (indices.size < size) {
            indices.add(Math.floor(Math.random() * data.length));
        }
        for (const idx of indices) {
            sample.push(data[idx]);
        }
        return sample;
    }

    getAnomalyScore(point: number[]): number {
        let avgPathLength = 0;
        for (const tree of this.trees) {
            avgPathLength += tree.getPathLength(point, 0);
        }
        avgPathLength /= this.trees.length;
        return Math.pow(2, -avgPathLength / this.c(this.sampleSize));
    }

    private c(n: number): number {
        if (n <= 1) return 0;
        if (n === 2) return 1;
        return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
    }
}

// --- LSTM Implementation ---
const buildLSTMAutoencoder = (seqLen: number, numFeatures: number): tf.LayersModel => {
    const model = tf.sequential();
    model.add(tf.layers.lstm({ units: 128, inputShape: [seqLen, numFeatures], returnSequences: false, dropout: 0.1 }));
    model.add(tf.layers.repeatVector({ n: seqLen }));
    model.add(tf.layers.lstm({ units: 128, returnSequences: true }));
    model.add(tf.layers.timeDistributed({ layer: tf.layers.dense({ units: numFeatures, activation: 'sigmoid' }) }));
    model.compile({ optimizer: tf.train.adam(0.0005), loss: 'meanSquaredError' });
    return model;
};

export const generateDeceptionScenario = async (
    params: SimulationParams,
    analysisContent?: string,
): Promise<AnalysisResult> => {
    const timesteps = params.timesteps;
    const bins = 256; 
    const seqLen = 8; 
    const numFeatures = bins + 1; // Spectrum bins + 1 normalized timestamp feature

    const fileReport: FileAnalysisReport | null = analysisContent ? JSON.parse(analysisContent) : null;
    const baselinePower = fileReport?.stats.power.avg ?? -95;
    const freqMin = fileReport?.stats.frequency.min ?? 2400;
    const freqMax = fileReport?.stats.frequency.max ?? 2500;
    const freqRange = freqMax - freqMin;

    const baselineData = tf.tidy(() => {
        const frames = [];
        const numBaselineFrames = 100;
        for (let i = 0; i < numBaselineFrames; i++) {
            const spectrum = tf.randomNormal([bins], normalize(baselinePower), 0.02);
            const normTime = tf.scalar(i / numBaselineFrames).expandDims(0);
            frames.push(tf.concat([spectrum, normTime]));
        }
        return tf.stack(frames);
    });

    let model: tf.LayersModel | null = null;
    let forest: IsolationForest | null = null;

    // Train LSTM
    const sequences = tf.tidy(() => {
        const seqs = [];
        const numBaselineFrames = baselineData.shape[0];
        for (let i = 0; i <= numBaselineFrames - seqLen; i++) {
            seqs.push(baselineData.slice([i, 0], [seqLen, numFeatures]));
        }
        return tf.stack(seqs);
    });
    model = buildLSTMAutoencoder(seqLen, numFeatures);
    await model.fit(sequences, sequences, { epochs: 12, batchSize: 16, verbose: 0 });
    sequences.dispose();

    // Initialize Isolation Forest
    const dataArr = baselineData.arraySync() as number[][];
    forest = new IsolationForest(dataArr);

    const visualizerData = [];
    let scenarioText = `## SIGINT INTELLIGENCE REPORT: TACTICAL PHASE\n\n`;
    scenarioText += `**Operational Objective:** ${params.detectionTarget}\n`;
    scenarioText += `**System Architecture:** DUAL-ENGINE (PHANTOM-LSTM + SPECTER-IF)\n`;
    scenarioText += `**Feature Vector:** Spectral Power + Normalized Temporal Index\n\n`;

    // Sensitivity thresholds
    const lstmThreshold = (100 - params.sensitivity) / 3000; 
    const ifThreshold = 0.8 - (params.sensitivity / 250); // Corrected: Higher sensitivity = lower threshold (0.4 to 0.8 range)

    const startTime = fileReport?.timeStats?.start ?? Date.now();
    const duration = fileReport?.timeStats?.durationSeconds ?? (timesteps * 1);
    const stepMs = (duration / timesteps) * 1000;

    for (let t = 0; t < timesteps; t++) {
        let spectrum: SpectrumDataPoint[] = [];
        let stepAnomalies: Anomaly[] = [];
        let classification = "STOCHASTIC_ENVIRONMENT";
        let countermeasure = "Standard monitoring protocol.";

        const currentTimestamp = startTime + (t * stepMs);
        const normTimeVal = t / timesteps;

        const { evalSeq, isAnomalousFrame } = tf.tidy(() => {
            const testSpectrum = tf.randomNormal([1, seqLen, bins], normalize(baselinePower), 0.03);
            const normTimeTensor = tf.fill([1, seqLen, 1], normTimeVal);
            
            let currentSpectrum = testSpectrum;
            const anomalous = (t % 3 === 2); 

            if (anomalous) {
                const center = Math.floor(Math.random() * bins);
                let spikeWidth = 8;
                let powerDelta = 0.3;

                switch(params.detectionTarget) {
                    case DetectionTarget.DRONE_CONTROL_LINK:
                        spikeWidth = 4; powerDelta = 0.45;
                        break;
                    case DetectionTarget.GPS_SPOOFING_SIGS:
                        spikeWidth = 2; powerDelta = 0.55;
                        break;
                    case DetectionTarget.WIDEBAND_JAMMING:
                        spikeWidth = 60; powerDelta = 0.25;
                        break;
                    default:
                        spikeWidth = 10; powerDelta = 0.35;
                }
                
                const spike = tf.oneHot(tf.tensor1d(Array.from({length: spikeWidth}, (_, i) => Math.max(0, Math.min(bins-1, center - Math.floor(spikeWidth/2) + i))), 'int32'), bins).sum(0).expandDims(0).expandDims(0);
                currentSpectrum = testSpectrum.add(spike.mul(powerDelta));
            }

            const combined = tf.concat([currentSpectrum, normTimeTensor], 2);
            return { evalSeq: combined.clone(), isAnomalousFrame: anomalous };
        });

        if (isAnomalousFrame) {
            switch(params.detectionTarget) {
                case DetectionTarget.DRONE_CONTROL_LINK:
                    classification = "DRONE_C2_LINK (FHSS)";
                    countermeasure = "Execute reactive frequency hopping; activate directional jamming.";
                    break;
                case DetectionTarget.GPS_SPOOFING_SIGS:
                    classification = "GNSS_SPOOF_PEAK";
                    countermeasure = "Switch to inertial navigation; initiate PLL nulling.";
                    break;
                case DetectionTarget.WIDEBAND_JAMMING:
                    classification = "BARRAGE_JAMMING";
                    countermeasure = "Shift operational frequency to edge-band; activate look-through.";
                    break;
                default:
                    classification = "NON_STOCHASTIC_EMITTER";
                    countermeasure = "Maintain passive audit; investigate source.";
            }
        }

        const anomalies: Anomaly[] = [];
        
        // Run LSTM Engine
        const mseTensor = tf.tidy(() => {
            const prediction = model!.predict(evalSeq) as tf.Tensor;
            return tf.sub(evalSeq, prediction).square().mean();
        });
        const lstmScore = mseTensor.dataSync()[0];
        mseTensor.dispose();

        if (lstmScore > lstmThreshold) {
            const centerFreq = freqMin + (Math.random() * freqRange);
            anomalies.push({
                description: `[PHANTOM-LSTM] Neural manifold violation. MSE: ${lstmScore.toExponential(3)}. Coherent structure detected at T+${(t * stepMs / 1000).toFixed(1)}s.`,
                frequencyStart: centerFreq - (freqRange * 0.05),
                frequencyEnd: centerFreq + (freqRange * 0.05),
                classification,
                countermeasure
            });
        }

        // Run Isolation Forest Engine
        const lastFrame = evalSeq.slice([0, seqLen - 1, 0], [1, 1, numFeatures]).dataSync() as Float32Array;
        const ifScore = forest!.getAnomalyScore(Array.from(lastFrame));
        if (ifScore > ifThreshold) {
            const centerFreq = freqMin + (Math.random() * freqRange);
            anomalies.push({
                description: `[SPECTER-IF] Statistical outlier detected. Score: ${ifScore.toFixed(3)}. Signal deviates from baseline distribution at T+${(t * stepMs / 1000).toFixed(1)}s.`,
                frequencyStart: centerFreq - (freqRange * 0.05),
                frequencyEnd: centerFreq + (freqRange * 0.05),
                classification,
                countermeasure
            });
        }

        const lastFrameData = evalSeq.slice([0, seqLen - 1, 0], [1, 1, bins]).dataSync() as Float32Array;
        spectrum = Array.from(lastFrameData).map((val, i) => ({
            frequency: freqMin + (i * (freqRange / bins)),
            power: denormalize(val),
            timestamp: currentTimestamp
        }));
        stepAnomalies = anomalies;

        evalSeq.dispose();

        visualizerData.push({ spectrum, anomalies: stepAnomalies });
        scenarioText += `## Timestep ${t + 1} [${new Date(currentTimestamp).toLocaleTimeString()}]\n`;
        if (stepAnomalies.length > 0) {
            const engines = stepAnomalies.map(a => a.description.split(']')[0].replace('[', '')).join(' & ');
            scenarioText += `**ALERT:** ${engines} identified anomaly. Signal signature: **${stepAnomalies[0].classification}**.\n\n`;
        } else {
            scenarioText += `Environmental physics consistent with background baseline. No coherent anomalies detected.\n\n`;
        }
    }

    baselineData.dispose();
    if (model) model.dispose();
    
    return { scenario: scenarioText, visualizerData, timeStats: fileReport?.timeStats };
};
