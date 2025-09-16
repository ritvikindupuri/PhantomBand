import React from 'react';
import type { SimulationParams } from '../types';

interface StatusBarProps {
    params: SimulationParams | null;
}

const StatusItem: React.FC<{ label: string; value?: string }> = ({ label, value }) => {
    if (!value) return null;
    return (
        <div className="text-center sm:text-left">
            <p className="text-xs text-text-secondary uppercase tracking-wider">{label}</p>
            <p className="text-sm font-semibold text-primary-amber truncate" title={value}>{value}</p>
        </div>
    );
};

export const StatusBar: React.FC<StatusBarProps> = ({ params }) => {
    if (!params) {
        return null; // Don't render anything if there's no analysis to show
    }

    return (
        <div className="bg-base-200/50 p-4 rounded-md border border-secondary/20 tactical-panel">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <StatusItem label="Environment" value={params.environment.type} />
                <StatusItem label="Interference" value={params.interference} />
                <StatusItem label="Deception Target" value={params.deceptionTarget} />
            </div>
        </div>
    );
};