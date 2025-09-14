// Fix: Added .ts extension to module path.
import { SimulationParams, EnvironmentType, InterferenceLevel, DeceptionTarget } from './types.ts';

export const INITIAL_SIMULATION_PARAMS: SimulationParams = {
  environment: EnvironmentType.Urban,
  interference: InterferenceLevel.Low,
  deceptionTarget: DeceptionTarget.SIMULATE_GPS_SPOOFING,
  timesteps: 5,
  customPrompt: '',
};