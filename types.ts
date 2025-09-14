export enum EnvironmentType {
  Urban = 'Urban',
  Suburban = 'Suburban',
  Rural = 'Rural',
  Maritime = 'Maritime',
  Airborne = 'Airborne',
}

export enum InterferenceLevel {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Severe = 'Severe',
}

export enum DeceptionTarget {
  SIMULATE_GPS_SPOOFING = 'Simulate GPS Spoofing Attack',
  SIMULATE_ROGUE_WIFI_AP = 'Simulate Rogue Wi-Fi AP',
  JAM_C2_DRONE_LINK = 'Jam C2 Drone Link',
  EMULATE_GHOST_BLE_BEACON = 'Emulate Ghost BLE Beacon',
  GENERATE_DECOY_IOT_TRAFFIC = 'Generate Decoy IoT Traffic',
  GENERATE_CUSTOM_SCENARIO = 'Generate Custom Scenario',
}


export interface SimulationParams {
  environment: EnvironmentType;
  interference: InterferenceLevel;
  deceptionTarget: DeceptionTarget;
  timesteps: number;
  customPrompt?: string;
}

export interface SpectrumDataPoint {
  frequency: number; // in MHz
  power: number; // in dBm
}

export type VisualizerData = SpectrumDataPoint[];

export interface AnalysisResult {
  scenario: string;
  visualizerData: VisualizerData[]; // An array of spectrums, one for each timestep
}

export interface HistoryItem extends AnalysisResult {
  id: string;
  timestamp: string;
  params: SimulationParams;
  file?: {
    name: string;
    content: string; // base64 encoded
  }
}
