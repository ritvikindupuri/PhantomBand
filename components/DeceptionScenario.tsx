import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PlayIcon } from './icons/PlayIcon';
import { PauseIcon } from './icons/PauseIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { Loader } from './Loader';

interface DeceptionScenarioProps {
    scenario: string;
    timesteps: number;
    currentTimestep: number;
    onTimestepChange: (step: number) => void;
    isLoading: boolean;
}

export const DeceptionScenario: React.FC<DeceptionScenarioProps> = ({
    scenario,
    timesteps,
    currentTimestep,
    onTimestepChange,
    isLoading,
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            interval = setInterval(() => {
                onTimestepChange((prevStep) => (prevStep + 1) % timesteps);
            }, 3000); // Change timestep every 3 seconds
        }
        return () => clearInterval(interval);
    }, [isPlaying, onTimestepChange, timesteps]);

    // Reset playing state if simulation parameters change, which is indicated by a new scenario string
    useEffect(() => {
        setIsPlaying(false);
    }, [scenario]);
    
    // Scroll to the current timestep section in the markdown content
    useEffect(() => {
        if (contentRef.current) {
            const heading = contentRef.current.querySelector(`[data-timestep="${currentTimestep + 1}"]`);
            if (heading) {
                heading.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [currentTimestep, scenario]);

    const handleCopyToClipboard = () => {
        if (scenario) {
            navigator.clipboard.writeText(scenario)
              .then(() => {
                  setCopyStatus('copied');
                  setTimeout(() => setCopyStatus('idle'), 2000);
              })
              .catch(err => console.error('Failed to copy text: ', err));
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center text-text-secondary">
                <Loader size="lg" />
                <p className="mt-4 text-lg font-display">Generating Scenario...</p>
                <p className="text-sm">This may take a few moments.</p>
            </div>
        );
    }

    if (!scenario) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center text-text-secondary">
                <h2 className="text-xl font-display text-text-main">Deception Scenario Analysis</h2>
                <p className="mt-2 max-w-md">Configure simulation parameters and click 'Run Analysis' to generate a detailed electronic warfare scenario and its RF spectrum data.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-display text-primary-amber">Scenario Narrative</h2>
                <button onClick={handleCopyToClipboard} className="flex items-center space-x-2 text-sm text-text-secondary hover:text-primary-amber transition-colors rounded-md p-1">
                    <ClipboardIcon className="w-5 h-5" />
                    <span>{copyStatus === 'copied' ? 'Copied!' : 'Copy Scenario'}</span>
                </button>
            </div>

            <div 
                ref={contentRef}
                className="prose prose-sm prose-invert max-w-none bg-base-100/50 p-4 rounded-md h-96 overflow-y-auto"
            >
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h2: ({node, ...props}) => {
                      const children = Array.isArray(node.children) ? node.children : [];
                      const text = children.map(c => c.type === 'text' ? c.value : '').join('');
                      const match = text.match(/Timestep\s*(\d+)/i);
                      if (match) {
                        return <h2 data-timestep={match[1]} {...props}></h2>;
                      }
                      return <h2 {...props}></h2>;
                    },
                    a: ({node, ...props}) => <a target="_blank" rel="noopener noreferrer" {...props} />
                  }}
                >
                    {scenario}
                </ReactMarkdown>
            </div>

            {/* Timeline controls */}
            <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-secondary">Timeline</span>
                    <span className="text-sm font-bold text-primary-amber bg-base-300 px-2 py-1 rounded-md">
                        Timestep: {currentTimestep + 1} / {timesteps}
                    </span>
                </div>
                <div className="flex items-center space-x-4">
                    <button onClick={() => setIsPlaying(!isPlaying)} className="p-2 rounded-full hover:bg-secondary/30 transition-colors text-text-main focus:outline-none focus:ring-2 focus:ring-primary-amber">
                        {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                    </button>
                    <input
                        type="range"
                        min="0"
                        max={timesteps > 0 ? timesteps - 1 : 0}
                        value={currentTimestep}
                        onChange={(e) => onTimestepChange(parseInt(e.target.value, 10))}
                        className="w-full"
                        aria-label="Timeline"
                        disabled={timesteps <= 1}
                    />
                </div>
            </div>
        </div>
    );
};
