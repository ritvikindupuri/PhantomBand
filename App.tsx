
import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { SimulationControls } from './components/SimulationControls.tsx';
import { DeceptionScenario } from './components/DeceptionScenario.tsx';
import { DataVisualizer } from './components/DataVisualizer.tsx';
import { StatusBar } from './components/StatusBar.tsx';
import { HistoryPanel } from './components/HistoryPanel.tsx';
import { Loader } from './components/Loader.tsx';
import { SettingsIcon } from './components/icons/SettingsIcon.tsx';
import { HistoryIcon } from './components/icons/HistoryIcon.tsx';
import { generateDeceptionScenario } from './services/tfService.ts';
import { parseAndAnalyzeCsv } from './utils/csvParser.ts';
import { INITIAL_SIMULATION_PARAMS } from './constants.ts';
import type { SimulationParams, AnalysisResult, HistoryItem, FileAnalysisReport, TimeStats } from './types.ts';

const App: React.FC = () => {
    const [params, setParams] = useState<SimulationParams>(INITIAL_SIMULATION_PARAMS);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const loadingMessage = 'DUAL-ENGINE TRAINING & ANALYZING...';
    const [history, setHistory] = useState<HistoryItem[]>(() => {
        try {
            const savedHistory = localStorage.getItem('phantomBandHistory');
            return savedHistory ? JSON.parse(savedHistory) : [];
        } catch (error) {
            return [];
        }
    });
    const [currentTimestep, setCurrentTimestep] = useState<number>(0);
    const [activeControlTab, setActiveControlTab] = useState<'controls' | 'history'>('controls');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [fileAnalysisReport, setFileAnalysisReport] = useState<FileAnalysisReport | null>(null);
    const [fileAnalysisError, setFileAnalysisError] = useState<Error | string | null>(null);
    const [timeStats, setTimeStats] = useState<TimeStats | null>(null);

    useEffect(() => {
        try {
            localStorage.setItem('phantomBandHistory', JSON.stringify(history));
        } catch (error) {}
    }, [history]);

    const handleFileChange = (file: File | null) => {
        setUploadedFile(file);
        setFileAnalysisReport(null);
        setFileAnalysisError(null);
        setTimeStats(null);
    };

    const handleRunFileAnalysis = async (
        fileToAnalyze: File | Blob,
        options?: { manualFreqIndex?: number; manualPowerIndex?: number, manualTimeIndex?: number }
    ) => {
        try {
            const report = await parseAndAnalyzeCsv(fileToAnalyze, options);
            setFileAnalysisReport(report);
            if (report.timeStats) setTimeStats(report.timeStats);
        } catch (error) {
            setFileAnalysisError(error instanceof Error ? error : new Error("Analysis failed."));
        }
    };

    const handleRunAnalysis = useCallback(async () => {
        setIsLoading(true);
        setCurrentTimestep(0);
        setAnalysisResult(null);

        const analysisContent = fileAnalysisReport ? JSON.stringify(fileAnalysisReport) : undefined;

        setTimeout(async () => {
             try {
                const result = await generateDeceptionScenario(params, analysisContent);
                setAnalysisResult(result);
                if (result.timeStats) setTimeStats(result.timeStats);

                setHistory(prev => [{
                    id: new Date().toISOString(),
                    timestamp: new Date().toLocaleString(),
                    params,
                    ...result
                }, ...prev.slice(0, 49)]);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        }, 300);
    }, [params, fileAnalysisReport]);

    const handleRefresh = () => {
        setParams(INITIAL_SIMULATION_PARAMS);
        setAnalysisResult(null);
        setUploadedFile(null);
        setFileAnalysisReport(null);
    };

    const handleHistorySelect = (item: HistoryItem) => {
        setParams(item.params);
        setAnalysisResult({ scenario: item.scenario, visualizerData: item.visualizerData, timeStats: item.timeStats });
        setCurrentTimestep(0);
        setTimeStats(item.timeStats || null);
        setActiveControlTab('controls');
    };

    return (
        <div className="bg-base-background min-h-screen font-sans text-text-main flex flex-col overflow-x-hidden">
            <Header onRefresh={handleRefresh} onDownload={() => {}} isDownloadDisabled={!analysisResult} />
            
            <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-6 items-start">
                    
                    {/* LEFT SIDEBAR: Configuration & History */}
                    <aside className="lg:col-span-1 xl:col-span-1 lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] overflow-y-auto tactical-panel bg-base-100 p-5 rounded-md border border-secondary/20 shadow-2xl flex flex-col custom-scrollbar">
                        <div className="flex border-b border-secondary/20 mb-4 space-x-2 flex-shrink-0">
                            <button onClick={() => setActiveControlTab('controls')} className={`tab-button ${activeControlTab === 'controls' ? 'tab-button-active' : ''}`}>
                                <SettingsIcon className="w-4 h-4 mr-2" /> CONTROLS
                            </button>
                            <button onClick={() => setActiveControlTab('history')} className={`tab-button ${activeControlTab === 'history' ? 'tab-button-active' : ''}`}>
                                <HistoryIcon className="w-4 h-4 mr-2" /> HISTORY
                            </button>
                        </div>
                        
                        <div className="flex-grow">
                            {activeControlTab === 'controls' && (
                                <div className="space-y-6 animate-fade-in pb-4">
                                    <SimulationControls 
                                        params={params} 
                                        onParamsChange={setParams}
                                        onFileChange={handleFileChange}
                                        onRunFileAnalysis={handleRunFileAnalysis}
                                        uploadedFile={uploadedFile}
                                        analysisReport={fileAnalysisReport}
                                        analysisError={fileAnalysisError}
                                    />
                                    <button
                                        onClick={handleRunAnalysis}
                                        disabled={isLoading}
                                        className="w-full btn-primary flex items-center justify-center space-x-2 py-3 shadow-lg shadow-primary-amber/10 sticky bottom-0 z-10"
                                    >
                                        {isLoading ? <Loader size="sm" /> : null}
                                        <span className="font-bold tracking-widest">
                                            {isLoading 
                                                ? 'TRAINING & ANALYZING...' 
                                                : 'START SIGINT SCAN'}
                                        </span>
                                    </button>
                                </div>
                            )}
                            
                            {activeControlTab === 'history' && (
                                <div className="animate-fade-in">
                                    <HistoryPanel history={history} onSelect={handleHistorySelect} onClear={() => setHistory([])} />
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* MAIN CONTENT AREA */}
                    <section className="lg:col-span-3 xl:col-span-4 space-y-6">
                        <StatusBar params={analysisResult ? params : null} timeStats={timeStats} />
                        
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {/* Spectrum Visualizer Panel */}
                            <div className="tactical-panel bg-base-100 p-6 rounded-md border border-secondary/20 flex flex-col h-[500px] lg:h-[600px] xl:h-[calc(100vh-20rem)] min-h-[450px]">
                               <DataVisualizer
                                    visualizerData={analysisResult?.visualizerData || []}
                                    currentTimestep={currentTimestep}
                                    onTimestepChange={setCurrentTimestep}
                                    isLoading={isLoading}
                                    timeStats={timeStats}
                                />
                            </div>
                            
                            {/* Intelligence Narrative Panel */}
                            <div className="tactical-panel bg-base-100 p-6 rounded-md border border-secondary/20 flex flex-col h-[500px] lg:h-[600px] xl:h-[calc(100vh-20rem)] min-h-[450px]">
                               <DeceptionScenario
                                    scenario={analysisResult?.scenario || ''}
                                    currentTimestep={currentTimestep}
                                    totalTimesteps={analysisResult?.visualizerData?.length || 0}
                                    isLoading={isLoading}
                                    anomalies={analysisResult?.visualizerData?.[currentTimestep]?.anomalies || []}
                               />
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default App;
