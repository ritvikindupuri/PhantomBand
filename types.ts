export enum DetectionTarget {
  DRONE_CONTROL_LINK = 'Drone C2 Link Detection',
  GPS_SPOOFING_SIGS = 'GNSS Spoofing Analysis',
  WIFI_INTERFERENCE = 'Rogue Access Point Triangulation',
  BLE_PHANTOM_NODES = 'Ghost BLE Device Tracking',
  WIDEBAND_JAMMING = 'Wideband Denial of Service',
  GENERAL_ANOMALY = 'General Spectrum Intelligence',
  ANALYZE_UPLOADED_DATA = 'Analyze Uploaded Spectrum Data',
  GENERATE_CUSTOM_SCENARIO = 'Generate Custom Tactical Scenario'
}

export interface SimulationParams {
  detectionTarget: DetectionTarget;
  timesteps: number;
  sensitivity: number; // 0-100 scale for LSTM reconstruction threshold or IF score
  customPrompt?: string;
}

export interface SpectrumDataPoint {
  frequency: number; // in MHz
  power: number; // in dBm
  timestamp?: number; 
}

export interface Anomaly {
    description: string;
    frequencyStart: number;
    frequencyEnd: number;
    classification: string;
    countermeasure: string;
}

export interface TimestepData {
    spectrum: SpectrumDataPoint[];
    anomalies: Anomaly[];
}

export type VisualizerData = TimestepData[];

export interface TimeStats {
    start: number; 
    end: number; 
    durationSeconds: number;
}

export interface AnalysisResult {
  scenario: string;
  visualizerData: VisualizerData;
  timeStats?: TimeStats;
}

export interface HistoryItem extends AnalysisResult {
  id: string;
  timestamp: string;
  params: SimulationParams;
}

export interface FileAnalysisReport {
    fileName: string;
    rowCount: number;
    columnCount: number;
    headers: string[];
    stats: {
        frequency: { min: number; max: number };
        power: { min: number; max: number; avg: number };
    };
    samples: {
        firstRows: SpectrumDataPoint[];
        lastRows: SpectrumDataPoint[];
        peakPowerRows: SpectrumDataPoint[];
    };
    timeStats?: TimeStats;
}