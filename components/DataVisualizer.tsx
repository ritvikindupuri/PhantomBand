import React, { useState, useEffect, useMemo } from 'react';
import type { SpectrumDataPoint } from '../types';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar } from 'recharts';

interface DataVisualizerProps {
  data: SpectrumDataPoint[];
}

type SpectrumFilters = {
  minFreq: string;
  maxFreq: string;
  minPower: string;
  maxPower: string;
};

type ChartType = 'area' | 'line' | 'bar';

interface ChartOptions {
  color: string;
  strokeWidth: number;
}

const FILTER_STORAGE_KEY = 'phantomBandSpectrumFilters';
const CHART_SETTINGS_STORAGE_KEY = 'phantomBandChartSettings';

export const DataVisualizer: React.FC<DataVisualizerProps> = ({ data }) => {
  const [filters, setFilters] = useState<SpectrumFilters>({
    minFreq: '',
    maxFreq: '',
    minPower: '',
    maxPower: '',
  });
  const [chartType, setChartType] = useState<ChartType>('area');
  const [chartOptions, setChartOptions] = useState<ChartOptions>({
    color: '#FFBF00',
    strokeWidth: 2,
  });

  // Load filters and chart settings from localStorage on initial component mount
  useEffect(() => {
    try {
      const savedFilters = localStorage.getItem(FILTER_STORAGE_KEY);
      if (savedFilters) setFilters(JSON.parse(savedFilters));

      const savedChartSettings = localStorage.getItem(CHART_SETTINGS_STORAGE_KEY);
      if (savedChartSettings) {
        const { type, options } = JSON.parse(savedChartSettings);
        if (type) setChartType(type);
        if (options) setChartOptions(options);
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage", error);
    }
  }, []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error("Failed to save filters to localStorage", error);
    }
  }, [filters]);

  // Save chart settings to localStorage whenever they change
  useEffect(() => {
    try {
        const settings = { type: chartType, options: chartOptions };
        localStorage.setItem(CHART_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("Failed to save chart settings to localStorage", error);
    }
  }, [chartType, chartOptions]);


  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleResetFilters = () => {
    setFilters({ minFreq: '', maxFreq: '', minPower: '', maxPower: '' });
  };

  const filteredData = useMemo(() => {
    if (!data) return [];

    const minFreq = parseFloat(filters.minFreq);
    const maxFreq = parseFloat(filters.maxFreq);
    const minPower = parseFloat(filters.minPower);
    const maxPower = parseFloat(filters.maxPower);

    return data.filter(point => {
      const freqMatch = (isNaN(minFreq) || point.frequency >= minFreq) &&
                        (isNaN(maxFreq) || point.frequency <= maxFreq);
      const powerMatch = (isNaN(minPower) || point.power >= minPower) &&
                         (isNaN(maxPower) || point.power <= maxPower);
      return freqMatch && powerMatch;
    });
  }, [data, filters]);
  
  const isBarChartDense = chartType === 'bar' && filteredData.length > 75;

  const renderChart = () => {
      const chartMargin = { top: 10, right: 30, left: 20, bottom: 25 };
      const commonChartComponents = (
        <>
          <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" opacity={0.3}/>
          <XAxis 
            dataKey="frequency" 
            type="number"
            stroke="#9ca3af" 
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => `${value.toFixed(1)}`}
            label={{ value: 'Frequency (MHz)', position: 'insideBottom', offset: -15, fill: '#e5e7eb', fontSize: 14 }}
          />
          <YAxis 
            stroke="#9ca3af" 
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            label={{ value: 'Power (dBm)', angle: -90, position: 'insideLeft', fill: '#e5e7eb', fontSize: 14 }}
            domain={[dataMin => Math.floor(dataMin) - 5, dataMax => Math.ceil(dataMax) + 5]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(26, 34, 51, 0.9)',
              borderColor: '#4b5563',
              borderRadius: '0.375rem',
              backdropFilter: 'blur(4px)',
            }}
            labelStyle={{ color: chartOptions.color, fontWeight: 'bold' }}
            formatter={(value: number) => [`${value.toFixed(2)} dBm`, 'Power']}
            labelFormatter={(label: number) => `Freq: ${label.toFixed(2)} MHz`}
          />
        </>
      );

      switch (chartType) {
        case 'line':
            return (
                <LineChart data={filteredData} margin={chartMargin}>
                    {commonChartComponents}
                    <Line type="monotone" dataKey="power" stroke={chartOptions.color} strokeWidth={chartOptions.strokeWidth} dot={false} isAnimationActive={true} animationDuration={300} />
                </LineChart>
            );
        case 'bar':
            return (
                <BarChart data={filteredData} barGap={2} margin={chartMargin}>
                    <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartOptions.color} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={chartOptions.color} stopOpacity={0.4}/>
                        </linearGradient>
                    </defs>
                    {commonChartComponents}
                    <Bar 
                        dataKey="power" 
                        fill="url(#barGradient)" 
                        isAnimationActive={!isBarChartDense} 
                        animationDuration={300}
                        radius={[2, 2, 0, 0]}
                        maxBarSize={50}
                    />
                </BarChart>
            );
        case 'area':
        default:
            return (
                <AreaChart data={filteredData} margin={chartMargin}>
                    <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartOptions.color} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={chartOptions.color} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    {commonChartComponents}
                    <Area type="monotone" dataKey="power" stroke={chartOptions.color} strokeWidth={chartOptions.strokeWidth} fillOpacity={1} fill="url(#colorGradient)" isAnimationActive={true} animationDuration={300}/>
                </AreaChart>
            );
      }
  };


  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-base-100/50 rounded-md p-4 text-text-secondary">
        <ChartBarIcon className="w-16 h-16 text-secondary/50 mb-4" />
        <h3 className="font-semibold text-text-main font-display">RF SPECTRUM ANALYSIS</h3>
        <p className="text-sm">Run analysis to generate signal data.</p>
      </div>
    );
  }

  const inputClasses = "w-full bg-base-300 border border-secondary/50 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-amber";
  const chartTypeButtonClasses = (type: ChartType) => `text-xs px-3 py-1 rounded transition-colors ${chartType === type ? 'bg-primary-amber text-base-100 font-semibold shadow-md' : 'text-text-secondary hover:text-text-main'}`;


  return (
    <div>
      <h3 className="text-lg font-display text-primary-amber mb-4">RF Spectrum Analysis</h3>

      <div className="flex flex-col gap-y-4 mb-6 p-4 bg-base-200/50 rounded-md border border-secondary/20">
        {/* --- Filter Controls --- */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-bold text-text-main uppercase tracking-wider">Filter Data</h4>
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold bg-secondary/30 hover:bg-secondary/50 text-text-secondary hover:text-text-main px-3 py-1.5 rounded-md transition-colors"
            >
              Reset Filters
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Frequency Range (MHz)</label>
              <div className="flex items-center gap-2">
                <input type="number" name="minFreq" value={filters.minFreq} onChange={handleFilterChange} placeholder="Min" className={inputClasses} aria-label="Minimum Frequency" />
                <input type="number" name="maxFreq" value={filters.maxFreq} onChange={handleFilterChange} placeholder="Max" className={inputClasses} aria-label="Maximum Frequency" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Power Range (dBm)</label>
              <div className="flex items-center gap-2">
                <input type="number" name="minPower" value={filters.minPower} onChange={handleFilterChange} placeholder="Min" className={inputClasses} aria-label="Minimum Power" />
                <input type="number" name="maxPower" value={filters.maxPower} onChange={handleFilterChange} placeholder="Max" className={inputClasses} aria-label="Maximum Power" />
              </div>
            </div>
          </div>
        </div>

        <div className="w-full border-t border-secondary/20 my-1"></div>

        {/* --- Appearance Controls --- */}
        <div>
           <h4 className="text-sm font-bold text-text-main uppercase tracking-wider mb-3">Chart Appearance</h4>
           <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex items-center gap-2">
                  <label className="block text-xs font-medium text-text-secondary">Chart Type:</label>
                  <div className="flex items-center bg-base-300 rounded-md p-0.5">
                    <button onClick={() => setChartType('area')} className={chartTypeButtonClasses('area')}>Area</button>
                    <button onClick={() => setChartType('line')} className={chartTypeButtonClasses('line')}>Line</button>
                    <button onClick={() => setChartType('bar')} className={chartTypeButtonClasses('bar')}>Bar</button>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="block text-xs font-medium text-text-secondary">Color:</label>
                <div className="relative w-8 h-8 rounded-md border border-secondary/50 bg-base-300 overflow-hidden">
                    <input
                        type="color"
                        value={chartOptions.color}
                        onChange={(e) => setChartOptions(prev => ({ ...prev, color: e.target.value }))}
                        className="absolute -top-1 -left-1 w-12 h-12 border-none cursor-pointer p-0"
                        title="Select chart color"
                    />
                </div>
              </div>
              {chartType !== 'bar' && (
                <div className="flex items-center gap-3">
                    <label className="block text-xs font-medium text-text-secondary">Thickness:</label>
                    <input
                        type="range"
                        min="1"
                        max="5"
                        step="0.5"
                        value={chartOptions.strokeWidth}
                        onChange={(e) => setChartOptions(prev => ({ ...prev, strokeWidth: parseFloat(e.target.value) }))}
                        className="w-24"
                    />
                    <span className="text-xs font-mono text-primary-amber bg-base-300 rounded px-1.5 py-0.5">{chartOptions.strokeWidth.toFixed(1)}</span>
                </div>
              )}
            </div>
        </div>
      </div>

      <div className="h-96 w-full relative">
         {isBarChartDense && (
             <div className="absolute inset-0 bg-base-200/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-md text-center p-4">
                <div>
                    <h4 className="font-display text-lg text-primary-amber">Data Too Dense for Bar Chart</h4>
                    <p className="text-sm text-text-secondary mt-1 max-w-xs mx-auto">
                        For a clearer view, please use the filters to narrow your data range, or switch to a <strong>Line</strong> or <strong>Area</strong> chart.
                    </p>
                </div>
            </div>
        )}
        {filteredData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-base-100/50 rounded-md p-4 text-text-secondary">
            <ChartBarIcon className="w-16 h-16 text-secondary/50 mb-4" />
            <h3 className="font-semibold text-text-main font-display">NO DATA MATCHES FILTERS</h3>
            <p className="text-sm">Adjust or reset filters to view spectrum data.</p>
          </div>
        )}
      </div>
    </div>
  );
};