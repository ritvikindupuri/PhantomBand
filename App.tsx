import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { SimulationControls } from './components/SimulationControls';
import { DeceptionScenario } from './components/DeceptionScenario';
import { DataVisualizer } from './components/DataVisualizer';
import { FileUpload } from './components/FileUpload';
import { HistoryPanel } from './components/HistoryPanel';
import { SettingsIcon } from './components/icons/SettingsIcon';
import { HistoryIcon } from './components/icons/HistoryIcon';
import { Loader } from './components/Loader';
import { generateDeceptionScenario } from './services/geminiService';
import { INITIAL_SIMULATION_PARAMS } from './constants';
import type { SimulationParams, AnalysisResult, HistoryItem } from './types';

const HISTORY_STORAGE_KEY = 'phantomBandHistory';

const App: React.FC = () => {
    const [params, setParams] = useState<SimulationParams>(INITIAL_SIMULATION_PARAMS);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTimestep, setCurrentTimestep] = useState(0);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [activeTab, setActiveTab] = useState<'controls' | 'history'>('controls');

    useEffect(() => {
        try {
            const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
            if (savedHistory) {
                setHistory(JSON.parse(savedHistory));
            }
        } catch (error) {
            console.error("Failed to load history from localStorage", error);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
        } catch (error) {
            console.error("Failed to save history to localStorage", error);
        }
    }, [history]);

    const readFileAsBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64String = (reader.result as string).split(',')[1];
                resolve(base64String);
            };
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    };
    
    const runSimulation = useCallback(async () => {
        setIsLoading(true);
        const isUpdate = !!analysisResult;
        
        if (!isUpdate) {
            setCurrentTimestep(0);
        }

        let fileContent: string | null = null;
        if (uploadedFile) {
            try {
                fileContent = await readFileAsBase64(uploadedFile);
            } catch (error) {
                console.error("Error reading file:", error);
                setAnalysisResult({
                    scenario: `**Error:** Failed to read the uploaded file. Please try again.`,
                    visualizerData: Array(params.timesteps).fill([])
                });
                setIsLoading(false);
                return;
            }
        }

        const result = await generateDeceptionScenario(
            params, 
            uploadedFile, 
            fileContent,
            isUpdate ? currentTimestep : undefined,
            isUpdate ? analysisResult?.scenario : undefined
        );
        
        setAnalysisResult(result);

        if (!result.scenario.startsWith('**Error:')) {
            const newHistoryItem: HistoryItem = {
                id: new Date().toISOString(),
                timestamp: new Date().toLocaleString(),
                params: params,
                scenario: result.scenario,
                visualizerData: result.visualizerData,
                file: uploadedFile && fileContent ? { name: uploadedFile.name, content: fileContent } : undefined,
            };
            setHistory(prev => [newHistoryItem, ...prev.slice(0, 49)]); // Keep history to 50 items
        }

        setIsLoading(false);
    }, [params, uploadedFile, analysisResult, currentTimestep]);

    const handleParamsChange = (newParams: SimulationParams) => {
        setParams(newParams);
    };

    const handleFileChange = (file: File | null) => {
        setUploadedFile(file);
    };

    const handleRefresh = () => {
        setParams(INITIAL_SIMULATION_PARAMS);
        setAnalysisResult(null);
        setCurrentTimestep(0);
        setUploadedFile(null);
        setActiveTab('controls');
    };

    const handleHistorySelect = (item: HistoryItem) => {
        setParams(item.params);
        setAnalysisResult({ scenario: item.scenario, visualizerData: item.visualizerData });
        setCurrentTimestep(0);
        setUploadedFile(null);
        if (window.innerWidth < 1024) {
            setActiveTab('controls');
        }
    };

    const handleClearHistory = () => {
        setHistory([]);
    };
    
    const visualizerDataForTimestep = useMemo(() => {
        return analysisResult?.visualizerData?.[currentTimestep] || [];
    }, [analysisResult, currentTimestep]);

    return (
        <div className="bg-base-background min-h-screen font-sans text-text-main">
            <Header onRefresh={handleRefresh} />
            <main className="container mx-auto px-4 lg:px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* --- Left Column: Controls --- */}
                    <aside className="lg:col-span-3">
                        <div className="lg:hidden mb-4 border-b border-secondary/30">
                            <nav className="flex space-x-4">
                                <button onClick={() => setActiveTab('controls')} className={`flex items-center space-x-2 py-2 px-1 border-b-2 ${activeTab === 'controls' ? 'border-primary-amber text-primary-amber' : 'border-transparent text-text-secondary'}`}>
                                    <SettingsIcon className="w-5 h-5" />
                                    <span>Controls</span>
                                </button>
                                <button onClick={() => setActiveTab('history')} className={`flex items-center space-x-2 py-2 px-1 border-b-2 ${activeTab === 'history' ? 'border-primary-amber text-primary-amber' : 'border-transparent text-text-secondary'}`}>
                                    <HistoryIcon className="w-5 h-5" />
                                    <span>History</span>
                                </button>
                            </nav>
                        </div>
                        
                        <div className={`${activeTab !== 'controls' && 'hidden'} lg:block space-y-6`}>
                             <SimulationControls params={params} onParamsChange={handleParamsChange} />
                             <FileUpload onFileChange={handleFileChange} uploadedFile={uploadedFile} />
                             <div>
                                <button
                                    onClick={runSimulation}
                                    className="w-full bg-primary-amber text-base-100 font-bold py-3 px-4 rounded-md hover:bg-amber-500 transition-colors flex items-center justify-center disabled:bg-secondary/50 disabled:cursor-not-allowed"
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader /> : 'Run Analysis'}
                                </button>
                             </div>
                        </div>

                        <div className={`${activeTab !== 'history' && 'hidden'} lg:block mt-8 lg:mt-6`}>
                           <div className="flex items-center gap-2 mb-3">
                                <HistoryIcon className="w-5 h-5 text-primary-amber" />
                                <h3 className="font-display text-lg uppercase">Session History</h3>
                           </div>
                           <HistoryPanel history={history} onSelect={handleHistorySelect} onClear={handleClearHistory} />
                        </div>
                    </aside>

                    {/* --- Right Column: Results --- */}
                    <div className="lg:col-span-9 space-y-8">
                        <section className="bg-base-200/50 p-6 rounded-md border border-secondary/20 min-h-[400px]">
                            <DeceptionScenario
                                scenario={analysisResult?.scenario || ''}
                                timesteps={params.timesteps}
                                currentTimestep={currentTimestep}
                                onTimestepChange={setCurrentTimestep}
                                isLoading={isLoading}
                            />
                        </section>
                        <section className="bg-base-200/50 p-6 rounded-md border border-secondary/20">
                            <DataVisualizer data={visualizerDataForTimestep} />
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
