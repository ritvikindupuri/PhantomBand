import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { SimulationControls } from './components/SimulationControls';
import { DeceptionScenario } from './components/DeceptionScenario';
import { DataVisualizer } from './components/DataVisualizer';
import { StatusBar } from './components/StatusBar';
import { HistoryPanel } from './components/HistoryPanel';
import { Loader } from './components/Loader';
import { SettingsIcon } from './components/icons/SettingsIcon';
import { HistoryIcon } from './components/icons/HistoryIcon';
import { generateDeceptionScenario } from './services/geminiService';
import { parseAndAnalyzeCsv } from './utils/csvParser';
import { INITIAL_SIMULATION_PARAMS } from './constants';
import type { SimulationParams, AnalysisResult, HistoryItem, FileAnalysisReport, AnalysisMode } from './types';
import { DeceptionTarget } from './types';

const App: React.FC = () => {
    const [params, setParams] = useState<SimulationParams>(INITIAL_SIMULATION_PARAMS);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [history, setHistory] = useState<HistoryItem[]>(() => {
        try {
            const savedHistory = localStorage.getItem('phantomBandHistory');
            return savedHistory ? JSON.parse(savedHistory) : [];
        } catch (error) {
            console.error("Could not load history from localStorage", error);
            return [];
        }
    });
    const [currentTimestep, setCurrentTimestep] = useState<number>(0);
    const [activeControlTab, setActiveControlTab] = useState<'controls' | 'history'>('controls');
    const [mode, setMode] = useState<AnalysisMode>('generate');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [fileAnalysisReport, setFileAnalysisReport] = useState<FileAnalysisReport | null>(null);
    const [fileAnalysisError, setFileAnalysisError] = useState<string | null>(null);

    useEffect(() => {
        try {
            localStorage.setItem('phantomBandHistory', JSON.stringify(history));
        } catch (error) {
            console.error("Could not save history to localStorage", error);
        }
    }, [history]);
    
    // When mode changes, reset file/report state and adjust deception target
    useEffect(() => {
        if (mode === 'generate') {
            setUploadedFile(null);
            setFileAnalysisReport(null);
            setFileAnalysisError(null);
            // If the current target is the analysis one, revert to default
            if (params.deceptionTarget === DeceptionTarget.ANALYZE_UPLOADED_DATA) {
                setParams(p => ({ ...p, deceptionTarget: INITIAL_SIMULATION_PARAMS.deceptionTarget }));
            }
        } else { // mode === 'analyze'
             setParams(p => ({ ...p, deceptionTarget: DeceptionTarget.ANALYZE_UPLOADED_DATA }));
        }
    }, [mode]);

    const handleFileChange = async (file: File | null) => {
        setUploadedFile(file);
        setFileAnalysisReport(null);
        setFileAnalysisError(null);
        
        if (file) {
            try {
                const report = await parseAndAnalyzeCsv(file);
                setFileAnalysisReport(report);
            } catch (error) {
                console.error("Error analyzing file:", error);
                setFileAnalysisError(error instanceof Error ? error.message : "An unknown parsing error occurred.");
                setFileAnalysisReport(null);
            }
        }
    };

    const handleRunAnalysis = useCallback(async () => {
        setIsLoading(true);
        setCurrentTimestep(0);
        setAnalysisResult(null);

        let analysisContent: string | undefined = undefined;
        let currentParams = params;

        if (mode === 'analyze') {
            if (fileAnalysisReport) {
                analysisContent = JSON.stringify(fileAnalysisReport, null, 2);
            }
            // Ensure deceptionTarget is correctly set for history item
            currentParams = { ...params, deceptionTarget: DeceptionTarget.ANALYZE_UPLOADED_DATA };
        }

        const result = await generateDeceptionScenario(currentParams, analysisContent);
        setAnalysisResult(result);

        if (!result.scenario.startsWith('**Error:')) {
            const newHistoryItem: HistoryItem = {
                id: new Date().toISOString(),
                timestamp: new Date().toLocaleString(),
                params: currentParams,
                ...result,
            };
            setHistory(prevHistory => [newHistoryItem, ...prevHistory.slice(0, 49)]); // Keep history to 50 items
        }

        setIsLoading(false);
    }, [params, fileAnalysisReport, mode]);

    const handleRefresh = () => {
        setParams(INITIAL_SIMULATION_PARAMS);
        setAnalysisResult(null);
        setCurrentTimestep(0);
        setIsLoading(false);
        setActiveControlTab('controls');
        setMode('generate');
        setUploadedFile(null);
        setFileAnalysisReport(null);
        setFileAnalysisError(null);
    };

    const handleHistorySelect = (item: HistoryItem) => {
        setParams(item.params);
        setAnalysisResult({ scenario: item.scenario, visualizerData: item.visualizerData });
        setCurrentTimestep(0);
        if (item.params.deceptionTarget === DeceptionTarget.ANALYZE_UPLOADED_DATA) {
            setMode('analyze');
        } else {
            setMode('generate');
        }
        setActiveControlTab('controls');
    };

    const handleClearHistory = () => {
        setHistory([]);
    };
    
    const handleDownloadReport = () => {
        if (!analysisResult) return;

        let report = `========================================\n`;
        report += ` PhantomBand After-Action Report\n`;
        report += `========================================\n\n`;
        report += `Generated: ${new Date().toLocaleString()}\n\n`;

        report += `----------------------------------------\n`;
        report += ` I. SIMULATION PARAMETERS\n`;
        report += `----------------------------------------\n`;
        report += `Deception Target: ${params.deceptionTarget}\n`;
        if (params.deceptionTarget !== DeceptionTarget.ANALYZE_UPLOADED_DATA) {
            report += `Environment: ${params.environment.type}\n`;
            report += `Propagation Model: ${params.environment.propagationModel}\n`;
            report += `Atmospheric Condition: ${params.environment.atmosphericCondition}\n`;
            report += `Interference Level: ${params.interference}\n`;
        }
        report += `Timesteps: ${params.timesteps}\n`;
        if (params.deceptionTarget === DeceptionTarget.GENERATE_CUSTOM_SCENARIO && params.customPrompt) {
            report += `Custom Prompt: ${params.customPrompt}\n`;
        }
        if (params.deceptionTarget === DeceptionTarget.ANALYZE_UPLOADED_DATA && uploadedFile) {
            report += `Analyzed File: ${uploadedFile.name}\n`;
        }
        report += `\n`;

        report += `----------------------------------------\n`;
        report += ` II. SCENARIO NARRATIVE\n`;
        report += `----------------------------------------\n\n`;
        // Clean up markdown for plain text report
        const cleanScenario = analysisResult.scenario
            .replace(/## (Timestep \d+)/g, '\n--- $1 ---\n')
            .replace(/\*\*/g, '')
            .replace(/###/g, '')
            .replace(/-\s/g,'  - ');
        report += `${cleanScenario}\n\n`;

        report += `----------------------------------------\n`;
        report += ` III. DETECTED ANOMALIES SUMMARY\n`;
        report += `----------------------------------------\n`;
        analysisResult.visualizerData.forEach((timestep, index) => {
            if (timestep.anomalies && timestep.anomalies.length > 0) {
                report += `\nTimestep ${index + 1}:\n`;
                timestep.anomalies.forEach(anomaly => {
                    report += `  - Description: ${anomaly.description}\n`;
                    report += `    Frequency Range: ${anomaly.frequencyStart.toFixed(2)} - ${anomaly.frequencyEnd.toFixed(2)} MHz\n`;
                });
            }
        });
        
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PhantomBand_Report_${new Date().toISOString()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const isRunDisabled = isLoading || 
        (mode === 'generate' && params.deceptionTarget === DeceptionTarget.GENERATE_CUSTOM_SCENARIO && !params.customPrompt) ||
        (mode === 'analyze' && !fileAnalysisReport);


    return (
        <div className="bg-base-background min-h-screen font-sans text-text-main">
            <Header onRefresh={handleRefresh} onDownload={handleDownloadReport} isDownloadDisabled={!analysisResult} />
            <main className="container mx-auto p-4 md:p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <aside className="lg:col-span-1 space-y-6 tactical-panel bg-base-100 p-6 rounded-md border border-secondary/20">
                        <div className="flex border-b border-secondary/20 mb-4 space-x-2">
                            <button onClick={() => setActiveControlTab('controls')} className={`tab-button ${activeControlTab === 'controls' ? 'tab-button-active' : ''}`}>
                                <SettingsIcon className="w-5 h-5 mr-2" />
                                Controls
                            </button>
                            <button onClick={() => setActiveControlTab('history')} className={`tab-button ${activeControlTab === 'history' ? 'tab-button-active' : ''}`}>
                                <HistoryIcon className="w-5 h-5 mr-2" />
                                History
                            </button>
                        </div>
                        
                        {activeControlTab === 'controls' && (
                            <div className="space-y-6 animate-fade-in">
                                <SimulationControls 
                                    params={params} 
                                    onParamsChange={setParams}
                                    mode={mode}
                                    onModeChange={setMode}
                                    onFileChange={handleFileChange}
                                    analysisReport={fileAnalysisReport}
                                    analysisError={fileAnalysisError}
                                />
                                <button
                                    onClick={handleRunAnalysis}
                                    disabled={isRunDisabled}
                                    className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                                >
                                    {isLoading && <Loader size="sm" />}
                                    <span>{isLoading ? 'ANALYZING...' : (mode === 'analyze' ? 'ANALYZE FILE' : 'RUN ANALYSIS')}</span>
                                </button>
                                {mode === 'generate' && params.deceptionTarget === DeceptionTarget.GENERATE_CUSTOM_SCENARIO && isRunDisabled && !isLoading && <p className="text-xs text-center text-text-secondary/70">Please provide a custom scenario description.</p>}
                                {/* The 'analyze' mode feedback is now handled inside the FileUpload component */}
                            </div>
                        )}
                        
                        {activeControlTab === 'history' && (
                            <div className="animate-fade-in">
                                <HistoryPanel history={history} onSelect={handleHistorySelect} onClear={handleClearHistory} />
                            </div>
                        )}
                    </aside>

                    <section className="lg:col-span-2 grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className="xl:col-span-2">
                           <StatusBar params={analysisResult ? params : null} />
                        </div>
                        <div className="tactical-panel bg-base-100 p-6 rounded-md border border-secondary/20 flex flex-col h-[520px]">
                           <DataVisualizer
                                visualizerData={analysisResult?.visualizerData || []}
                                currentTimestep={currentTimestep}
                                onTimestepChange={setCurrentTimestep}
                                isLoading={isLoading}
                            />
                        </div>
                        <div className="tactical-panel bg-base-100 p-6 rounded-md border border-secondary/20 flex flex-col h-[520px]">
                           <DeceptionScenario
                                scenario={analysisResult?.scenario || ''}
                                currentTimestep={currentTimestep}
                                totalTimesteps={analysisResult?.visualizerData?.length || 0}
                                isLoading={isLoading}
                                anomalies={analysisResult?.visualizerData?.[currentTimestep]?.anomalies || []}
                           />
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default App;