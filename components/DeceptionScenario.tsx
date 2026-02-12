
import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ClipboardIcon } from './icons/ClipboardIcon.tsx';
import { Loader } from './Loader.tsx';
import type { Anomaly } from '../types';

interface DeceptionScenarioProps {
    scenario: string;
    currentTimestep: number;
    totalTimesteps: number;
    isLoading: boolean;
    anomalies: Anomaly[];
}

const AnomalyItem: React.FC<{ anomaly: Anomaly }> = ({ anomaly }) => (
    <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-md space-y-3 animate-fade-in">
        <div className="flex justify-between items-start">
            <span className="bg-red-500 text-[10px] font-black text-white px-2 py-0.5 rounded uppercase tracking-widest">
                Detection Alert
            </span>
            <span className="font-mono text-[10px] text-red-400">
                {anomaly.frequencyStart.toFixed(2)} - {anomaly.frequencyEnd.toFixed(2)} MHz
            </span>
        </div>
        <div>
            <p className="text-[10px] text-text-secondary uppercase font-bold tracking-tighter">Classification</p>
            <p className="text-sm font-bold text-text-main">{anomaly.classification}</p>
        </div>
        <div>
            <p className="text-[10px] text-text-secondary uppercase font-bold tracking-tighter">Technical Evidence</p>
            <p className="text-xs text-text-main font-sans italic">{anomaly.description}</p>
        </div>
        <div className="pt-2 border-t border-red-500/10">
            <p className="text-[10px] text-primary-amber uppercase font-bold tracking-tighter">Tactical Countermeasure</p>
            <p className="text-xs text-amber-100 font-sans mt-1">{anomaly.countermeasure}</p>
        </div>
    </div>
);

export const DeceptionScenario: React.FC<DeceptionScenarioProps> = ({
    scenario,
    currentTimestep,
    totalTimesteps,
    isLoading,
    anomalies,
}) => {
    const scenarioSections = useMemo(() => {
        if (!scenario) return [];
        return scenario.split(/(?=## Timestep \d)/).filter(s => s.trim() !== '');
    }, [scenario]);

    const currentSection = useMemo(() => {
        return scenarioSections[currentTimestep] || '';
    }, [scenarioSections, currentTimestep]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-text-secondary">
                <Loader size="lg" />
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.3em] animate-pulse">Running Neural Inference...</p>
            </div>
        );
    }

    if (!scenario) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-text-secondary opacity-40">
                <h2 className="text-xl font-display text-text-main">INTEL FEED</h2>
                <p className="mt-2 text-[10px] uppercase tracking-widest">Awaiting tactical narrative from LSTM context</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-bold text-primary-amber uppercase tracking-[0.2em]">Intel Narrative</h2>
                <button className="text-xs text-text-secondary hover:text-primary-amber flex items-center space-x-1 uppercase font-bold">
                    <ClipboardIcon className="w-3 h-3" />
                    <span>Copy Logs</span>
                </button>
            </div>

            <div className="flex-grow overflow-y-auto space-y-6 custom-scrollbar pr-2">
                {anomalies.length > 0 && (
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center">
                            <span className="h-1 w-1 bg-red-500 rounded-full mr-2 animate-ping" />
                            Tactical Anomalies Detected ({anomalies.length})
                        </p>
                        {anomalies.map((a, i) => <AnomalyItem key={i} anomaly={a} />)}
                    </div>
                )}

                <div className="prose prose-sm prose-invert max-w-none 
                    prose-h2:text-[10px] prose-h2:uppercase prose-h2:tracking-widest prose-h2:text-text-secondary prose-h2:border-b prose-h2:border-secondary/10 prose-h2:pb-2
                    prose-p:text-xs prose-p:text-text-main prose-p:leading-relaxed
                    prose-strong:text-primary-amber">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentSection}</ReactMarkdown>
                </div>
            </div>
        </div>
    );
};
