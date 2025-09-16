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
type ChartView = 'spectrum' | 'fft';

interface ChartOptions {
  color: string;
  strokeWidth: number;
}

const FILTER_STORAGE_KEY = 'phantomBandSpectrumFilters';
const CHART_SETTINGS_STORAGE_KEY = 'phantomBandChartSettings';

// --- FFT Utility Functions ---

// Pads an array of numbers to the next power of 2, required for the FFT algorithm.
const padDataForFFT = (data: number[]): number[] => {
    if (data.length === 0) return [];
    const originalLength = data.length;
    const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(originalLength)));
    const paddedData = [...data];
    while (paddedData.length < nextPowerOf2) {
        paddedData.push(0); // Pad with zeros
    }
    return paddedData;
};

// A recursive implementation of the Cooley-Tukey FFT algorithm.
const fft = (x: number[]): { re: number; im: number }[] => {
    const n = x.length;
    if (n <= 1) return [{ re: x[0] || 0, im: 0 }];

    // The input length must be a power of 2.
    if ((n & (n - 1)) !== 0) {
        console.error("FFT input size is not a power of 2. This should not happen if padding is correct.");
        return Array(n).fill({ re: 0, im: 0 });
    }

    const evens: number[] = [];
    const odds: number[] = [];
    for (let i = 0; i < n; i++) {
        if (i % 2 === 0) evens.push(x[i]);
        else odds.push(x[i]);
    }

    const E = fft(evens);
    const O = fft(odds);

    const result: { re: number; im: number }[] = new Array(n);
    for (let k = 0; k < n / 2; k++) {
        const angle = -2 * Math.PI * k / n;
        const omega = { re: Math.cos(angle), im: Math.sin(angle) };
        const term = {
            re: omega.re * O[k].re - omega.im * O[k].im,
            im: omega.re * O[k].im + omega.im * O[k].re
        };

        result[k] = {
            re: E[k].re + term.re,
            im: E[k].im + term.im
        };
        result[k + n / 2] = {
            re: E[k].re - term.re,
            im: E[k].im - term.im
        };
    }
    return result;
};


export const DataVisualizer: React.FC<DataVisualizerProps> = ({ data }) => {
  const [filters, setFilters] = useState<SpectrumFilters>({
    minFreq: '',
    maxFreq: '',
    minPower: '',
    maxPower: '',
  });
  const [chartType, setChartType] = useState<ChartType>('area');
  const [chartView, setChartView] = useState<ChartView>('spectrum');
  const [chartOptions, setChartOptions] = useState<ChartOptions>({
    color: '#FFBF00',
    strokeWidth: 2,
  });

  // Load settings from localStorage
  useEffect(() => {
    try {
      const savedFilters = localStorage.getItem(FILTER_STORAGE_KEY);
      if (savedFilters) setFilters(JSON.parse(savedFilters));

      const savedChartSettings = localStorage.getItem(CHART_SETTINGS_STORAGE_KEY);
      if (savedChartSettings) {
        const { type, view, options } = JSON.parse(savedChartSettings);
        if (type) setChartType(type);
        if (view) setChartView(view);
        if (options) setChartOptions(options);
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage", error);
    }
  }, []);

  // Save filters to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error("Failed to save filters to localStorage", error);
    }
  }, [filters]);

  // Save chart settings to localStorage
  useEffect(() => {
    try {
        const settings = { type: chartType, view: chartView, options: chartOptions };
        localStorage.setItem(CHART_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("Failed to save chart settings to localStorage", error);
    }
  }, [chartType, chartView, chartOptions]);


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
  
  const fftData = useMemo(() => {
      if (!filteredData || filteredData.length === 0) return [];
      const powerValues = filteredData.map(p => p.power);
      const paddedValues = padDataForFFT(powerValues);
      if (paddedValues.length === 0) return [];

      const fftResult = fft(paddedValues);
      
      // We only need the first half (N/2) of the results due to symmetry
      return fftResult.slice(0, fftResult.length / 2).map((complex, index) => ({
          quefrency: index, // Bin index
          magnitude: Math.sqrt(complex.re * complex.re + complex.im * complex.im)
      }));
  }, [filteredData]);

  const isBarChartDense = chartType === 'bar' && filteredData.length > 75;

  const renderChart = () => {
      const chartMargin = { top: 10, right: 30, left: 20, bottom: 35 };
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
            label={{ value: 'Frequency (MHz)', position: 'insideBottom', offset: -10, fill: '#e5e7eb', fontSize: 14 }}
          />
          <YAxis 
            stroke="#9ca3af" 
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            label={{ value: 'Power (dBm)', angle: -90, position: 'insideLeft', fill: '#e5e7eb', fontSize: 14 }}
            domain={[-110, (dataMax: number) => (dataMax < -90 ? -20 : Math.ceil(dataMax) + 5)]}
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

  const renderFFTChart = () => (
      <BarChart data={fftData} margin={{ top: 10, right: 30, left: 20, bottom: 35 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" opacity={0.3} />
          <XAxis 
              dataKey="quefrency" 
              type="number"
              stroke="#9ca3af" 
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              label={{ value: 'Quefrency (bins)', position: 'insideBottom', offset: -10, fill: '#e5e7eb', fontSize: 14 }}
          />
          <YAxis 
              stroke="#9ca3af" 
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              label={{ value: 'Magnitude', angle: -90, position: 'insideLeft', fill: '#e5e7eb', fontSize: 14 }}
          />
          <Tooltip
              contentStyle={{ backgroundColor: 'rgba(26, 34, 51, 0.9)', borderColor: '#4b5563' }}
              formatter={(value: number) => [value.toFixed(4), 'Magnitude']}
              labelFormatter={(label: number) => `Bin: ${label}`}
          />
          <Bar dataKey="magnitude" fill={chartOptions.color} isAnimationActive={true} animationDuration={500} />
      </BarChart>
  );

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
  const viewButtonClasses = (view: ChartView | ChartType, current: ChartView | ChartType) => `text-xs px-3 py-1 rounded transition-colors ${current === view ? 'bg-primary-amber text-base-100 font-semibold shadow-md' : 'text-text-secondary hover:text-text-main'}`;


  return (
    <div>
      <h3 className="text-lg font-display text-primary-amber mb-4">
        {chartView === 'spectrum' ? 'RF Spectrum Analysis' : 'FFT Analysis (Cepstrum)'}
      </h3>

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
           <h4 className="text-sm font-bold text-text-main uppercase tracking-wider mb-3">View Options</h4>
           <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
               <div className="flex items-center gap-2">
                  <label className="block text-xs font-medium text-text-secondary">Analysis Mode:</label>
                  <div className="flex items-center bg-base-300 rounded-md p-0.5">
                    <button onClick={() => setChartView('spectrum')} className={viewButtonClasses('spectrum', chartView)}>Spectrum</button>
                    <button onClick={() => setChartView('fft')} className={viewButtonClasses('fft', chartView)}>FFT</button>
                  </div>
              </div>
              {chartView === 'spectrum' && (
                <div className="flex items-center gap-2">
                    <label className="block text-xs font-medium text-text-secondary">Chart Type:</label>
                    <div className="flex items-center bg-base-300 rounded-md p-0.5">
                      <button onClick={() => setChartType('area')} className={viewButtonClasses('area', chartType)}>Area</button>
                      <button onClick={() => setChartType('line')} className={viewButtonClasses('line', chartType)}>Line</button>
                      <button onClick={() => setChartType('bar')} className={viewButtonClasses('bar', chartType)}>Bar</button>
                    </div>
                </div>
              )}
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
              {chartView === 'spectrum' && chartType !== 'bar' && (
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
         {chartView === 'spectrum' && isBarChartDense && (
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
            {chartView === 'spectrum' ? renderChart() : renderFFTChart()}
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
