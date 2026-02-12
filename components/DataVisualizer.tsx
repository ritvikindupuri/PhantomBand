import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  ReferenceLine
} from 'recharts';
import type { TimestepData, TimeStats } from '../types';
import { PlayIcon } from './icons/PlayIcon.tsx';
import { PauseIcon } from './icons/PauseIcon.tsx';
import { ChartBarIcon } from './icons/ChartBarIcon.tsx';
import { Loader } from './Loader.tsx';

interface DataVisualizerProps {
  visualizerData: TimestepData[];
  currentTimestep: number;
  onTimestepChange: React.Dispatch<React.SetStateAction<number>>;
  isLoading: boolean;
  timeStats: TimeStats | null;
}

const formatRelativeTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

const formatAbsoluteTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
        hour12: true, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        // Fix: Use 'as any' cast because fractionalSecondDigits is missing from some TypeScript definitions of DateTimeFormatOptions
        fractionalSecondDigits: 2 
    } as any);
}

export const DataVisualizer: React.FC<DataVisualizerProps> = ({
    visualizerData,
    currentTimestep,
    onTimestepChange,
    isLoading,
    timeStats
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const totalTimesteps = visualizerData?.length || 0;

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isPlaying && totalTimesteps > 1) {
            interval = setInterval(() => {
                onTimestepChange(prev => (prev + 1) % totalTimesteps);
            }, 1200);
        }
        return () => clearInterval(interval);
    }, [isPlaying, onTimestepChange, totalTimesteps]);

    const activeSpectrum = useMemo(() => {
        return visualizerData[currentTimestep]?.spectrum || [];
    }, [visualizerData, currentTimestep]);

    const timestepTimeLabel = useMemo(() => {
        if (!timeStats || totalTimesteps === 0) return 'REAL-TIME';
        
        const durationPerStep = timeStats.durationSeconds / totalTimesteps;
        const relativeOffset = currentTimestep * durationPerStep;
        
        // If the start time looks like a real Unix epoch (ms)
        if (timeStats.start > 1000000000) {
            const absoluteTimestamp = timeStats.start + (relativeOffset * 1000);
            return formatAbsoluteTime(absoluteTimestamp);
        }
        
        return `T+${formatRelativeTime(relativeOffset)}`;
    }, [timeStats, currentTimestep, totalTimesteps]);

    if (isLoading) {
        return <div className="flex flex-col items-center justify-center h-full text-text-secondary"><Loader size="lg" /><p className="mt-4 text-xs font-bold animate-pulse">OPTIMIZING LSTM LATENT SPACE...</p></div>;
    }

    if (!visualizerData || totalTimesteps === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary text-center opacity-40">
                <ChartBarIcon className="w-16 h-16 mb-4" />
                <h2 className="text-xl font-display text-text-main">AWAITING SIGNAL DATA</h2>
                <p className="mt-2 text-xs uppercase tracking-widest">Connect to spectrum feed or upload capture</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-sm font-bold text-primary-amber uppercase tracking-[0.2em]">
                        Live Spectrum Feed
                    </h2>
                    <p className="text-[10px] text-text-secondary mt-1 font-mono">RECURRENT TEMPORAL ANALYSIS • <span className="text-text-main">{timestepTimeLabel}</span></p>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">SIGINT LIVE</span>
                </div>
            </div>

            <div className="flex-grow animate-fade-in relative">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activeSpectrum} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <defs>
                            <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#FFBF00" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#FFBF00" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 2" stroke="rgba(75, 85, 99, 0.15)" vertical={false} />
                        <XAxis 
                            dataKey="frequency" 
                            type="number" 
                            domain={['dataMin', 'dataMax']} 
                            tick={{ fontSize: 9, fill: '#6b7280' }} 
                            axisLine={false}
                            tickLine={false}
                            unit="MHz"
                        />
                        <YAxis 
                            domain={[-120, -20]} 
                            tick={{ fontSize: 9, fill: '#6b7280' }} 
                            axisLine={false}
                            tickLine={false}
                            unit="dBm"
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1a2233', border: '1px solid rgba(255, 191, 0, 0.2)', fontSize: '10px' }}
                            labelStyle={{ color: '#FFBF00', fontWeight: 'bold' }}
                            itemStyle={{ color: '#e5e7eb' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="power"
                            name="Power"
                            stroke="#FFBF00"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorPower)"
                            animationDuration={400}
                        />
                        {visualizerData[currentTimestep]?.anomalies.map((anomaly, index) => (
                            <ReferenceArea
                                key={index}
                                x1={anomaly.frequencyStart}
                                x2={anomaly.frequencyEnd}
                                fill="rgba(239, 68, 68, 0.1)"
                                stroke="rgba(239, 68, 68, 0.4)"
                                strokeDasharray="4 4"
                            />
                        ))}
                        <ReferenceLine y={-95} stroke="rgba(75, 85, 99, 0.3)" strokeDasharray="3 3" label={{ value: 'NOISE FLOOR', position: 'right', fill: '#4b5563', fontSize: 8 }} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="flex items-center space-x-6 mt-6 pt-4 border-t border-secondary/10">
                <button onClick={() => setIsPlaying(!isPlaying)} className="group p-3 bg-base-300 rounded-full hover:bg-primary-amber transition-all shadow-lg hover:shadow-primary-amber/20">
                    {isPlaying ? <PauseIcon className="w-5 h-5 group-hover:text-base-100" /> : <PlayIcon className="w-5 h-5 group-hover:text-base-100" />}
                </button>
                <div className="flex-grow space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-text-secondary uppercase">
                        <span>Time Evolution</span>
                        <span>Frame {currentTimestep + 1} / {totalTimesteps}</span>
                    </div>
                    <input
                        type="range" min="0" max={totalTimesteps - 1}
                        value={currentTimestep} onChange={e => onTimestepChange(parseInt(e.target.value, 10))}
                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-base-300 accent-primary-amber"
                    />
                </div>
            </div>
        </div>
    );
};