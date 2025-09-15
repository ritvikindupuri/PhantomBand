import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { SimulationControls } from './components/SimulationControls';
import { DataVisualizer } from './components/DataVisualizer';
import { DeceptionScenario } from './components/DeceptionScenario';
import { Loader } from './components/Loader';
import { PlayIcon } from './components/icons/PlayIcon';
import { PauseIcon } from './components/icons/PauseIcon';
import { HistoryPanel } from './components/HistoryPanel';
import { SettingsIcon } from './components/icons/SettingsIcon';
import { HistoryIcon } from './components/icons/HistoryIcon';
import type { SimulationParams, AnalysisResult, HistoryItem } from './types';
import { INITIAL_SIMULATION_PARAMS } from './constants';
import { generateDeceptionScenario } from './services/geminiService';

type ActiveTab = 'config' | 'history';

// Debounce hook to delay processing of rapid input changes
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

// Typewriter effect hook
const useTypewriter = (text: string, speed: number = 30) => {
    const [displayText, setDisplayText] = useState('');

    useEffect(() => {
        setDisplayText(''); // Reset when text changes
        if (text) {
            let i = 0;
            const timer = setInterval(() => {
                setDisplayText(text.substring(0, i + 1));
                i++;
                if (i >= text.length) {
                    clearInterval(timer);
                }
            }, speed);
            return () => clearInterval(timer);
        }
    }, [text, speed]);

    return displayText;
};


const App: React.FC = () => {
  const [simulationParams, setSimulationParams] = useState<SimulationParams>(INITIAL_SIMULATION_PARAMS);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('config');
  const [currentTimestep, setCurrentTimestep] = useState(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  const debouncedParams = useDebounce(simulationParams, 750);
  const isInitialMount = useRef(true);
  const lastUpdatedParams = useRef<string | undefined>(undefined);
  
  const displayedScenario = useTypewriter(analysisResult?.scenario ?? '', 10);
  const isTyping = analysisResult?.scenario ? displayedScenario.length < analysisResult.scenario.length : false;


  const handleFileChange = (file: File | null) => {
    setUploadedFile(file);
    if (file && (file.type === 'text/csv' || file.type === 'text/plain')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileContent(e.target?.result as string);
      };
      reader.readAsText(file);
    } else {
      setFileContent(null); // Not a text file, rely on context
    }
  };

  const handleRunAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setCurrentTimestep(0);
    setIsPlaying(false);

    try {
      const result = await generateDeceptionScenario(simulationParams, uploadedFile, fileContent);

      if (result.scenario.startsWith('**Error:')) {
          setError(result.scenario);
          setAnalysisResult({
              scenario: result.scenario,
              visualizerData: [[]]
          });
          return;
      }
      
      setAnalysisResult(result);

      const newHistoryItem: HistoryItem = {
        id: new Date().toISOString(),
        timestamp: new Date().toLocaleString(),
        params: simulationParams,
        file: uploadedFile ? { name: uploadedFile.name, content: fileContent || '' } : undefined,
        ...result,
      };
      setHistory(prevHistory => [newHistoryItem, ...prevHistory]);
      
      if (result.visualizerData.length > 1) {
        setIsPlaying(true);
      }

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during the analysis.';
      setError(errorMessage);
      setAnalysisResult({
          scenario: `**An Error Occurred:**\n\n${errorMessage}`,
          visualizerData: [[{frequency: 0, power: 0}]]
      });
    } finally {
      setIsLoading(false);
    }
  }, [simulationParams, uploadedFile, fileContent]);

  const handleLiveUpdate = useCallback(async (paramsToUpdate: SimulationParams) => {
      if (!analysisResult) return;

      setIsUpdating(true);
      setError(null);
      const wasPlaying = isPlaying;
      setIsPlaying(false);

      try {
          const result = await generateDeceptionScenario(
              paramsToUpdate,
              uploadedFile,
              fileContent,
              currentTimestep,
              analysisResult.scenario
          );

          if (result.scenario.startsWith('**Error:')) {
              setError(result.scenario);
              return;
          }

          setAnalysisResult(result);
          setCurrentTimestep(0);

          const newHistoryItem: HistoryItem = {
              id: new Date().toISOString(),
              timestamp: new Date().toLocaleString(),
              params: paramsToUpdate,
              file: uploadedFile ? { name: uploadedFile.name, content: fileContent || '' } : undefined,
              ...result,
          };
          setHistory(prevHistory => [newHistoryItem, ...prevHistory]);
          if (result.visualizerData.length > 1 && wasPlaying) {
              setIsPlaying(true);
          }
      } catch (e) {
          const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
          setError(errorMessage);
      } finally {
          setIsUpdating(false);
      }
  }, [analysisResult, currentTimestep, fileContent, isPlaying, uploadedFile]);

  // Effect for handling real-time parameter updates
  useEffect(() => {
      const stringifiedParams = JSON.stringify(debouncedParams);
      if (stringifiedParams !== lastUpdatedParams.current) {
          if (isInitialMount.current) {
              isInitialMount.current = false;
              lastUpdatedParams.current = stringifiedParams;
              return;
          }

          if (analysisResult && !isLoading && !isUpdating) {
              lastUpdatedParams.current = stringifiedParams;
              handleLiveUpdate(debouncedParams);
          }
      }
  }, [debouncedParams, analysisResult, isLoading, isUpdating, handleLiveUpdate]);
  
  // Effect for playback animation
  useEffect(() => {
    let timer: number;
    if (isPlaying && analysisResult && !isTyping && currentTimestep < analysisResult.visualizerData.length - 1) {
      timer = window.setInterval(() => {
        setCurrentTimestep(prev => prev + 1);
      }, 800);
    } else if (isPlaying) {
      setIsPlaying(false);
    }
    return () => window.clearInterval(timer);
  }, [isPlaying, currentTimestep, analysisResult, isTyping]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsPlaying(false);
    setCurrentTimestep(parseInt(e.target.value, 10));
  };
  
  const handleTogglePlay = () => {
    if (!analysisResult) return;
    if (currentTimestep >= analysisResult.visualizerData.length - 1) {
      setCurrentTimestep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setSimulationParams(item.params);
    setAnalysisResult({ scenario: item.scenario, visualizerData: item.visualizerData });
    setUploadedFile(item.file ? new File([], item.file.name) : null);
    setFileContent(item.file?.content || null);
    setCurrentTimestep(0);
    setIsPlaying(false);
    setActiveTab('config');
  };

  const handleRefresh = () => {
    setSimulationParams(INITIAL_SIMULATION_PARAMS);
    setUploadedFile(null);
    setFileContent(null);
    setAnalysisResult(null);
    setError(null);
    setIsLoading(false);
    setCurrentTimestep(0);
    setIsPlaying(false);
    setActiveTab('config');
  };
  
  const currentVisualizerData = analysisResult?.visualizerData[currentTimestep] || [];

  return (
    <div className="min-h-screen bg-base-100 text-text-main font-sans">
      <Header onRefresh={handleRefresh} />
      <main className="container mx-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-1 space-y-6">
            <div className="tactical-panel rounded-md relative">
              <div className="flex border-b border-secondary/30">
                <button onClick={() => setActiveTab('config')} className={`flex-1 p-3 font-display text-sm flex items-center justify-center gap-2 ${activeTab === 'config' ? 'bg-primary-amber/20 text-primary-amber' : 'text-text-secondary hover:bg-base-300/50'}`}>
                  <SettingsIcon className="w-5 h-5"/> CONFIGURATION
                </button>
                <button onClick={() => setActiveTab('history')} className={`flex-1 p-3 font-display text-sm flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-primary-amber/20 text-primary-amber' : 'text-text-secondary hover:bg-base-300/50'}`}>
                   <HistoryIcon className="w-5 h-5"/> HISTORY
                </button>
              </div>

              <div className="p-4">
                {activeTab === 'config' && (
                  <div className="space-y-6">
                    <FileUpload onFileChange={handleFileChange} uploadedFile={uploadedFile} />
                    <SimulationControls params={simulationParams} onParamsChange={setSimulationParams} />
                  </div>
                )}
                {activeTab === 'history' && (
                  <HistoryPanel history={history} onSelect={handleSelectHistory} onClear={() => setHistory([])} />
                )}
              </div>
            </div>

            {activeTab === 'config' && (
              <div className="tactical-panel rounded-md p-4 space-y-3">
                  <h3 className="font-display text-sm text-primary-amber uppercase tracking-wider">System Overview</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                      PhantomBand is a generative AI system that simulates realistic Radio Frequency (RF) environments for advanced training and cyber deception operations.
                  </p>
                  <ul className="text-xs text-text-secondary space-y-1.5 pl-4 list-disc list-outside">
                      <li>Generates dynamic, multi-timestep scenarios.</li>
                      <li>Analyzes user-provided signal data.</li>
                      <li>Enables real-time "what-if" analysis.</li>
                  </ul>
              </div>
            )}
            
            {activeTab === 'config' && (
              <button
                onClick={handleRunAnalysis}
                disabled={isLoading || isUpdating}
                className="w-full flex items-center justify-center bg-primary-amber hover:bg-primary-amber-dark text-base-100 font-bold py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader size="sm" />
                    <span className="ml-2">ANALYZING...</span>
                  </>
                ) : isUpdating ? (
                  <>
                    <Loader size="sm" />
                    <span className="ml-2">APPLYING CHANGES...</span>
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-5 h-5 mr-2"/>
                    <span>RUN ANALYSIS</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="lg:col-span-2 tactical-panel p-6 rounded-md space-y-6 min-h-[600px]">
             {isLoading && (
                <div className="flex flex-col h-full items-center justify-center text-text-secondary">
                    <Loader size="lg" />
                    <p className="ml-3 font-display tracking-widest text-lg mt-4">ANALYZING SPECTRUM DATA</p>
                    <p className="text-sm">Generating complete scenario...</p>
                </div>
             )}
             {error && !isLoading && (
                <div className="text-red-400 border border-red-500/50 bg-red-900/20 p-4 rounded-md">
                    <h3 className="font-bold font-display">ANALYSIS FAILED</h3>
                    <p className="font-mono text-sm whitespace-pre-wrap">{error}</p>
                </div>
             )}
            {analysisResult && !isLoading && !error && (
                <>
                    <div>
                        <h2 className="text-lg font-display text-primary-amber mb-4">Generated Deception Scenario</h2>
                        <DeceptionScenario scenario={displayedScenario} />
                    </div>
                    {!isTyping && analysisResult.visualizerData.length > 1 && (
                      <div className="pt-4">
                         <label htmlFor="timesteps" className="block text-sm font-medium text-text-secondary mb-2">
                           Temporal Evolution (Timestep)
                         </label>
                         <div className="flex items-center space-x-4">
                            <button
                                onClick={handleTogglePlay}
                                className="p-2 text-text-secondary hover:text-primary-amber transition-colors rounded-full hover:bg-base-300"
                                aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
                            >
                                {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                            </button>
                           <input
                             id="timesteps"
                             type="range"
                             min="0"
                             max={analysisResult.visualizerData.length - 1}
                             value={currentTimestep}
                             onChange={handleSliderChange}
                             className="w-full"
                           />
                           <span className="text-sm font-semibold text-primary-amber w-16 text-center bg-base-300 rounded-md py-1">{currentTimestep + 1} / {analysisResult.visualizerData.length}</span>
                         </div>
                      </div>
                    )}
                    {!isTyping && (
                      <div className="border-t border-secondary/20 pt-6">
                          <DataVisualizer data={currentVisualizerData} />
                      </div>
                    )}
                </>
            )}
             {!isLoading && !analysisResult && !error && (
                 <div className="flex flex-col items-center justify-center h-full text-center text-text-secondary">
                    <h2 className="text-xl font-display text-text-main mb-2">Awaiting Directives</h2>
                    <p className="max-w-xs">Configure simulation, upload signal file (optional), and click "Run Analysis" to generate scenario.</p>
                 </div>
             )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;