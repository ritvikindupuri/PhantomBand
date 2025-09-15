import React from 'react';
// Fix: Added .ts extension to module path.
import type { SimulationParams, EnvironmentParams } from '../types.ts';
// Fix: Added .ts extension to module path.
import { EnvironmentType, InterferenceLevel, DeceptionTarget, SignalPropagationModel, AtmosphericCondition } from '../types.ts';

interface SimulationControlsProps {
  params: SimulationParams;
  onParamsChange: (params: SimulationParams) => void;
}

const SelectControl: React.FC<{
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: object;
}> = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
    <select
      value={value}
      onChange={onChange}
      className="w-full bg-base-300 border border-secondary/50 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-amber text-text-main"
    >
      {Object.values(options).map((option) => (
        <option key={option} value={option} className="bg-base-300">{option}</option>
      ))}
    </select>
  </div>
);

export const SimulationControls: React.FC<SimulationControlsProps> = ({ params, onParamsChange }) => {
  const handleChange = <T,>(field: keyof SimulationParams, value: T) => {
    onParamsChange({ ...params, [field]: value });
  };

  const handleEnvironmentChange = <T,>(field: keyof EnvironmentParams, value: T) => {
    onParamsChange({
      ...params,
      environment: {
        ...params.environment,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-4">
      <SelectControl
        label="Environment Type"
        value={params.environment.type}
        onChange={(e) => handleEnvironmentChange('type', e.target.value as EnvironmentType)}
        options={EnvironmentType}
      />
      <SelectControl
        label="Signal Propagation Model"
        value={params.environment.propagationModel}
        onChange={(e) => handleEnvironmentChange('propagationModel', e.target.value as SignalPropagationModel)}
        options={SignalPropagationModel}
      />
      <SelectControl
        label="Atmospheric Conditions"
        value={params.environment.atmosphericCondition}
        onChange={(e) => handleEnvironmentChange('atmosphericCondition', e.target.value as AtmosphericCondition)}
        options={AtmosphericCondition}
      />
      <SelectControl
        label="Interference Level"
        value={params.interference}
        onChange={(e) => handleChange('interference', e.target.value as InterferenceLevel)}
        options={InterferenceLevel}
      />
      <SelectControl
        label="Deception Target"
        value={params.deceptionTarget}
        onChange={(e) => handleChange('deceptionTarget', e.target.value as DeceptionTarget)}
        options={DeceptionTarget}
      />

      {params.deceptionTarget === DeceptionTarget.GENERATE_CUSTOM_SCENARIO && (
        <div>
          <label htmlFor="customPrompt" className="block text-sm font-medium text-text-secondary mb-1">
            Custom Scenario Description
          </label>
          <textarea
            id="customPrompt"
            rows={4}
            className="w-full bg-base-300 border border-secondary/50 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-amber text-text-main text-sm"
            placeholder="e.g., Simulate a drone swarm communicating with a central controller amidst heavy urban interference..."
            value={params.customPrompt}
            onChange={(e) => handleChange('customPrompt', e.target.value)}
          />
        </div>
      )}

      <div>
        <label htmlFor="timesteps" className="block text-sm font-medium text-text-secondary mb-2">
          Temporal Dynamics (Timesteps)
        </label>
        <div className="flex items-center space-x-4">
          <input
            id="timesteps"
            type="range"
            min="1"
            max="10"
            value={params.timesteps}
            onChange={(e) => handleChange('timesteps', parseInt(e.target.value, 10))}
            className="w-full"
          />
          <span className="text-sm font-semibold text-primary-amber w-8 text-center bg-base-300 rounded-md py-1">{params.timesteps}</span>
        </div>
      </div>
    </div>
  );
};