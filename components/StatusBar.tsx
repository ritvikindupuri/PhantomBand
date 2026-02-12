
import React from 'react';
import type { SimulationParams, TimeStats } from '../types.ts';

interface StatusBarProps {
    params: SimulationParams | null;
    timeStats: TimeStats | null;
}

const StatusItem: React.FC<{ label: string; value?: string }> = ({ label, value }) => {
    if (!value) return null;
    return (
        <div className="text-center sm:text-left">
            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">{label}</p>
            <p className="text-xs font-semibold text-primary-amber truncate mt-1" title={value}>{value}</p>
        </div>
    );
};

export const StatusBar: React.FC<StatusBarProps> = ({ params, timeStats }) => {
    if (!params) return null;

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        let result = '';
        if (h > 0) result += `${h}h `;
        if (m > 0) result += `${m}m `;
        if (s > 0 || result === '') result += `${s}s`;
        return result.trim();
    };

    return (
        <div className="bg-base-200/50 px-6 py-3 rounded-md border border-secondary/20 tactical-panel">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <StatusItem label="Intelligence Target" value={params.detectionTarget} />
                <StatusItem label="Temporal Depth" value={`${params.timesteps} Steps`} />
                <StatusItem label="Data Window" value={timeStats ? formatDuration(timeStats.durationSeconds) : "Stochastic Synthetic"} />
                <StatusItem label="Detection Sensitivity" value={`${params.sensitivity}%`} />
            </div>
        </div>
    );
};
