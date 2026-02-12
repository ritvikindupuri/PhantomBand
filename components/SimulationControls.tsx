import React, { useState } from 'react';
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
  const [showSensitivityInfo, setShowSensitivityInfo] = useState(false);

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

          <div className="animate-fade-in relative">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-1.5">
                  <label className="text-sm font-medium text-text-secondary uppercase tracking-tighter">Detection Sensitivity</label>
                  <div 
                    className="cursor-help text-text-secondary hover:text-primary-amber transition-colors"
                    onMouseEnter={() => setShowSensitivityInfo(true)}
                    onMouseLeave={() => setShowSensitivityInfo(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <span className="text-xs font-bold text-primary-amber">{params.sensitivity}%</span>
              </div>
              
              {showSensitivityInfo && (
                <div className="absolute z-50 bottom-full left-0 mb-2 w-full p-3 bg-base-200 border border-primary-amber/30 rounded shadow-xl animate-fade-in text-[10px] leading-relaxed">
                  <p className="font-bold text-primary-amber mb-1 uppercase">SIGINT Operator Guidance:</p>
                  <p className="text-text-main mb-2">Calibrates the Mean Squared Error (MSE) threshold of the Phantom-LSTM neural engine.</p>
                  <ul className="space-y-1 text-text-secondary">
                    <li>• <span className="text-text-main font-bold">50-70%:</span> Coarse filtering. Detects high-power jamming/denial of service.</li>
                    <li>• <span className="text-text-main font-bold">70-90%:</span> Standard operational baseline for persistent monitoring.</li>
                    <li>• <span className="text-text-main font-bold">90-99%:</span> High-fidelity. Detects LPI, stealth, and covert signals hidden near the noise floor.</li>
                  </ul>
                  <p className="mt-2 pt-2 border-t border-secondary/20 font-bold text-primary-amber">OPTIMAL SETTING: 85%</p>
                </div>
              )}

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