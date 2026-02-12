import React from 'react';
import { FileUpload } from './FileUpload.tsx';
import type { SimulationParams, FileAnalysisReport } from '../types.ts';
import { DetectionTarget } from '../types.ts';

interface SimulationControlsProps {
  params: SimulationParams;
  onParamsChange: (params: SimulationParams) => void;
  onFileChange: (file: File | null) => void;
  onRunFileAnalysis: (file: File | Blob, options?: { manualFreqIndex?: number; manualPowerIndex?: number; manualTimeIndex?: number }) => void;
  uploadedFile: File | null;
  analysisReport: FileAnalysisReport | null;
  analysisError: Error | string | null;
}

const SelectControl: React.FC<{
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
}> = ({ label, value, onChange, options }) => (
  <div className="animate-fade-in">
    <label className="block text-sm font-medium text-text-secondary mb-1 uppercase tracking-tighter">{label}</label>
    <select
      value={value}
      onChange={onChange}
      className="w-full bg-base-300 border border-secondary/50 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-amber text-text-main"
    >
      {options.map((option) => (
        <option key={option} value={option} className="bg-base-300">{option}</option>
      ))}
    </select>
  </div>
);

export const SimulationControls: React.FC<SimulationControlsProps> = ({ 
    params, 
    onParamsChange, 
    onFileChange, 
    onRunFileAnalysis,
    uploadedFile,
    analysisReport, 
    analysisError 
}) => {
  const handleChange = <T,>(field: keyof SimulationParams, value: T) => {
    onParamsChange({ ...params, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="bg-primary-amber/10 border border-primary-amber/30 p-3 rounded-md mb-2">
        <p className="text-[10px] text-primary-amber font-bold uppercase tracking-widest">Operation Mode</p>
        <p className="text-xs text-text-main font-semibold">PHANTOM-LSTM ANOMALY DETECTION</p>
      </div>

      <FileUpload 
        onFileChange={onFileChange} 
        onRunFileAnalysis={onRunFileAnalysis}
        uploadedFile={uploadedFile}
        analysisReport={analysisReport} 
        analysisError={analysisError} 
      />

      <fieldset className="control-fieldset space-y-4">
          <legend className="control-legend">Intelligence focus</legend>
          <SelectControl
              label="Primary Detection Target"
              value={params.detectionTarget}
              onChange={(e) => handleChange('detectionTarget', e.target.value as DetectionTarget)}
              options={Object.values(DetectionTarget)}
          />
          {params.detectionTarget === DetectionTarget.GENERATE_CUSTOM_SCENARIO && (
             <div className="animate-fade-in mt-3">
                <label className="block text-sm font-medium text-text-secondary mb-1 uppercase tracking-tighter">Custom Target Details</label>
                <textarea
                  value={params.customPrompt || ''}
                  onChange={(e) => handleChange('customPrompt', e.target.value)}
                  placeholder="Describe the specific RF behavior or threat to monitor..."
                  className="w-full h-24 bg-base-300 border border-secondary/50 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-amber text-text-main text-xs"
                />
             </div>
          )}
      </fieldset>

      <fieldset className="control-fieldset space-y-6">
          <legend className="control-legend">ML Engine Calibration</legend>
          
          <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-text-secondary uppercase tracking-tighter">Analysis timesteps</label>
                <span className="text-xs font-bold text-primary-amber">{params.timesteps}</span>
              </div>
              <input
                  type="range" min="1" max="10"
                  value={params.timesteps}
                  onChange={(e) => handleChange('timesteps', parseInt(e.target.value, 10))}
                  className="w-full"
              />
              <p className="text-[10px] text-text-secondary/50 mt-1 italic">Determines the depth of temporal lookback.</p>
          </div>

          <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-text-secondary uppercase tracking-tighter">Detection Sensitivity</label>
                <span className="text-xs font-bold text-primary-amber">{params.sensitivity}%</span>
              </div>
              <input
                  type="range" min="50" max="99"
                  value={params.sensitivity}
                  onChange={(e) => handleChange('sensitivity', parseInt(e.target.value, 10))}
                  className="w-full"
              />
              <p className="text-[10px] text-text-secondary/50 mt-1 italic">Calibrates the LSTM reconstruction error threshold.</p>
          </div>
      </fieldset>
    </div>
  );
};