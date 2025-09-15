import React, { useState, useMemo, useEffect } from 'react';
import { ClipboardIcon } from './icons/ClipboardIcon';

// Local icon component to avoid creating a new file for a simple icon.
const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);


// This function takes a string and returns a React Node array with syntax highlighting.
const highlightSyntax = (text: string) => {
  // Regex to find technical terms.
  const parts = text.split(
    /(\b\d+(?:\.\d+)?\s?(?:MHz|GHz|kHz)\b|\b-?\d+(?:\.\d+)?\s?dBm\b|\b(?:GPS|Wi-Fi|BLE|jamming|spoofing|signal|frequency|power|drone|C2|beacon|IoT)\b)/gi
  );
  
  return parts.map((part, index) => {
    if (!part) return null;

    // Frequencies (e.g., 1575.42 MHz)
    if (/\b\d+(?:\.\d+)?\s?(?:MHz|GHz|kHz)\b/i.test(part)) {
      return <span key={index} className="text-cyan-400 font-medium">{part}</span>;
    }
    // Power levels (e.g., -90 dBm)
    if (/\b-?\d+(?:\.\d+)?\s?dBm\b/i.test(part)) {
      return <span key={index} className="text-amber-400 font-medium">{part}</span>;
    }
    // Keywords
    if (/\b(?:GPS|Wi-Fi|BLE|jamming|spoofing|signal|frequency|power|drone|C2|beacon|IoT)\b/i.test(part)) {
      return <span key={index} className="text-fuchsia-400 font-medium">{part}</span>;
    }
    return part;
  });
};

// This function handles markdown bolding first, then applies syntax highlighting to the remaining text.
const formatAndHighlightText = (text: string) => {
    return text.split(/(\*\*.*?\*\*)/g).map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            // It's a bold part, render it as a strong tag with primary color.
            return <strong key={index} className="font-bold text-primary-amber">{part.slice(2, -2)}</strong>;
        }
        // It's a regular part, apply syntax highlighting to it.
        return highlightSyntax(part);
    });
};

// Fix: Added missing props interface for the component.
interface DeceptionScenarioProps {
    scenario: string;
}

export const DeceptionScenario: React.FC<DeceptionScenarioProps> = ({ scenario }) => {
    const [copied, setCopied] = useState(false);
    const [openSections, setOpenSections] = useState<Record<number, boolean>>({ 0: true });

    const handleCopy = () => {
        navigator.clipboard.writeText(scenario);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleSection = (index: number) => {
        setOpenSections(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const scenarioSections = useMemo(() => {
        if (!scenario) return [];
        // Use a positive lookahead to split the text by timestep headers, keeping the headers in the resulting sections.
        const sections = scenario.split(/(?=^\s*(\*\*Timestep \d+.*?\*\*|Timestep \d+:))/gm).filter(s => s.trim() !== '');
        
        // If the split results in only one or zero sections, treat the entire scenario as a single section.
        if (sections.length <= 1 && scenario.trim()) {
            const lines = scenario.trim().split('\n');
            const header = lines[0] || 'Generated Scenario';
            const content = lines.slice(1).join('\n');
            return [{ header, content: content || "No details provided." }];
        }

        return sections.map(sectionText => {
            const lines = sectionText.trim().split('\n');
            const header = lines[0];
            const content = lines.slice(1).join('\n');
            return { header, content };
        });
    }, [scenario]);

    // When the scenario text changes, reset the accordion to have the first section open.
    useEffect(() => {
        setOpenSections({ 0: true });
    }, [scenario]);

    return (
        <div className="relative bg-base-300/50 p-4 rounded-md text-sm text-text-secondary leading-relaxed font-mono">
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 text-text-secondary hover:text-primary-amber rounded-md hover:bg-base-200 transition-colors z-10"
                aria-label="Copy scenario to clipboard"
            >
                {copied ? (
                    <span className="text-xs text-primary-amber">Copied!</span>
                ) : (
                    <ClipboardIcon className="w-5 h-5" />
                )}
            </button>
            <div className="space-y-2">
                {scenarioSections.map((section, index) => (
                    <div key={index} className="bg-base-200/50 rounded-md overflow-hidden border border-secondary/20">
                        <button
                            onClick={() => toggleSection(index)}
                            className="w-full flex justify-between items-center text-left p-3 font-semibold text-text-main hover:bg-secondary/20 transition-colors"
                            aria-expanded={!!openSections[index]}
                        >
                            <span className="uppercase tracking-wider text-primary-amber text-xs">{section.header.replace(/\*+/g, '')}</span>
                            <ChevronDownIcon className={`w-5 h-5 transition-transform duration-300 ${openSections[index] ? 'rotate-180' : ''}`} />
                        </button>
                        {openSections[index] && (
                            <div className="px-4 pb-4 border-t border-secondary/20 whitespace-pre-wrap animate-fade-in">
                                {formatAndHighlightText(section.content)}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};