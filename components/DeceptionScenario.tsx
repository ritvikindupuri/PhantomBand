import React, { useState } from 'react';
import { ClipboardIcon } from './icons/ClipboardIcon';

interface DeceptionScenarioProps {
  scenario: string;
}

// A simple markdown-like parser for bold text.
const formatScenarioText = (text: string) => {
    return text.split(/(\*\*.*?\*\*)/g).map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="font-bold text-primary-amber">{part.slice(2, -2)}</strong>;
        }
        return part;
    });
};

export const DeceptionScenario: React.FC<DeceptionScenarioProps> = ({ scenario }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(scenario);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative bg-base-300/50 p-4 rounded-md text-sm text-text-secondary leading-relaxed font-mono">
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 text-text-secondary hover:text-primary-amber rounded-md hover:bg-base-200 transition-colors"
                aria-label="Copy scenario to clipboard"
            >
                {copied ? (
                    <span className="text-xs text-primary-amber">Copied!</span>
                ) : (
                    <ClipboardIcon className="w-5 h-5" />
                )}
            </button>
            <div className="whitespace-pre-wrap">
                {formatScenarioText(scenario)}
            </div>
        </div>
    );
};
