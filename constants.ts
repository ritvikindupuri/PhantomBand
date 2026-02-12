import { SimulationParams, DetectionTarget } from './types.ts';

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export const INITIAL_SIMULATION_PARAMS: SimulationParams = {
  detectionTarget: DetectionTarget.GENERAL_ANOMALY,
  timesteps: 5,
  sensitivity: 85, // Default sensitivity for LSTM MSE threshold
  customPrompt: '',
};