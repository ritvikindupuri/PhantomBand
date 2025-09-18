import type { FileAnalysisReport, SpectrumDataPoint } from '../types';

/**
 * Parses a string row into an array of strings. Handles various delimiters.
 */
const parseCsvRow = (row: string): string[] => {
    // Handles various delimiters like comma, semicolon, tab, or space.
    // Trimming the row first helps with leading/trailing whitespace.
    return row.trim().split(/[\t,; ]+/);
};

const isNumeric = (str: string): boolean => {
    if (typeof str !== 'string' || str.trim() === '') return false;
    // Check if the string is a valid number, allowing for scientific notation.
    return !isNaN(parseFloat(str)) && isFinite(Number(str));
};

/**
 * Reads a File object, parses its CSV content, and generates a statistical report.
 * @param file The CSV or TXT file to analyze.
 * @returns A promise that resolves to a FileAnalysisReport.
 */
export const parseAndAnalyzeCsv = (file: File): Promise<FileAnalysisReport> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                if (!text) {
                     throw new Error("File is empty or could not be read.");
                }
                
                // More robust line splitting for different OS line endings
                const lines = text.trim().split(/\r\n?|\n/).filter(line => line.trim() !== '');
                if (lines.length < 1) {
                    throw new Error("File must contain at least one data row.");
                }

                let headerValues: string[] | undefined;
                let dataLines: string[];

                const firstLineValues = parseCsvRow(lines[0]);

                // Auto-detect header row: if the first line contains any non-numeric text, assume it's a header.
                const hasHeader = firstLineValues.some(val => val !== '' && !isNumeric(val));

                if (hasHeader) {
                    headerValues = firstLineValues;
                    dataLines = lines.slice(1);
                } else {
                    dataLines = lines;
                }
                
                if (dataLines.length === 0) {
                     throw new Error("File contains a header but no data rows.");
                }

                let freqIndex = 0;
                let powerIndex = 1;

                if (headerValues) {
                    const lowerCaseHeaders = headerValues.map(h => h.toLowerCase().trim());
                    
                    // Expanded keywords for better detection
                    const freqKeywords = ['freq', 'frequency', 'mhz', 'khz', 'ghz', 'hertz', 'hz', 'channel', 'band'];
                    const powerKeywords = ['power', 'dbm', 'db', 'level', 'amplitude', 'rssi', 'signal', 'strength', 'intensity'];
                    
                    // --- New Scoring Logic ---
                    const scoreHeader = (header: string, keywords: string[]): number => {
                        return keywords.reduce((acc, kw) => acc + (header.includes(kw) ? 1 : 0), 0);
                    }

                    const candidates = lowerCaseHeaders.map((h, i) => ({
                        index: i,
                        freqScore: scoreHeader(h, freqKeywords),
                        powerScore: scoreHeader(h, powerKeywords)
                    }));

                    const freqCandidates = candidates.filter(c => c.freqScore > 0).sort((a,b) => b.freqScore - a.freqScore);
                    const powerCandidates = candidates.filter(c => c.powerScore > 0).sort((a,b) => b.powerScore - a.powerScore);

                    if (freqCandidates.length > 0) freqIndex = freqCandidates[0].index; else freqIndex = -1;
                    if (powerCandidates.length > 0) powerIndex = powerCandidates[0].index; else powerIndex = -1;
                    
                    // --- New Disambiguation Logic ---
                    if (freqIndex !== -1 && freqIndex === powerIndex) {
                        const bestCandidate = candidates[freqIndex];
                        const secondBestFreq = freqCandidates.find(c => c.index !== freqIndex);
                        const secondBestPower = powerCandidates.find(c => c.index !== powerIndex);

                        // If the best candidate is a much better power column than freq, use an alternative for freq
                        if (bestCandidate.powerScore > bestCandidate.freqScore && secondBestFreq) {
                             freqIndex = secondBestFreq.index;
                        // If the best candidate is a much better freq column than power, use an alternative for power
                        } else if (bestCandidate.freqScore > bestCandidate.powerScore && secondBestPower) {
                            powerIndex = secondBestPower.index;
                        // If scores are equal, see if we have non-conflicting alternatives
                        } else if (secondBestPower) {
                            powerIndex = secondBestPower.index;
                        } else if (secondBestFreq) {
                            freqIndex = secondBestFreq.index;
                        }
                    }

                    // --- Improved Error Message ---
                    if (freqIndex === -1 || powerIndex === -1 || freqIndex === powerIndex) {
                        let errorMsg = "Could not automatically detect columns from the file header.";
                        if (freqIndex === -1) {
                            errorMsg += "\nA 'frequency' column is required.";
                        }
                        if (powerIndex === -1) {
                            errorMsg += "\nA 'power' or 'dBm' column is required.";
                        }
                        if (freqIndex !== -1 && freqIndex === powerIndex) {
                            errorMsg += "\nFrequency and Power must be in separate columns.";
                        }
                        errorMsg += "\n\nHint: Try using column names with keywords like:\n • Frequency: 'frequency', 'mhz', 'channel'\n • Power: 'power', 'dbm', 'signal'";
                        throw new Error(errorMsg);
                    }
                } else {
                    // Check if data has enough columns when no header is detected
                    const sampleData = parseCsvRow(dataLines[0]);
                    if (sampleData.length < 2) {
                        throw new Error("Data must have at least two columns (e.g., frequency, power) if no text header is present.");
                    }
                }

                const allData: SpectrumDataPoint[] = [];
                let powerSum = 0;

                for (const line of dataLines) {
                    const values = parseCsvRow(line);
                    if (values.length > Math.max(freqIndex, powerIndex)) {
                        const frequency = parseFloat(values[freqIndex]);
                        const power = parseFloat(values[powerIndex]);

                        if (!isNaN(frequency) && !isNaN(power)) {
                            allData.push({ frequency, power });
                            powerSum += power;
                        }
                    }
                }

                if (allData.length === 0) {
                    throw new Error("No valid numerical data found. Please ensure columns are correctly formatted and delimited (e.g., comma, space, tab).");
                }
                
                const sortedByPower = [...allData].sort((a, b) => a.power - b.power); 
                const sortedByFreq = [...allData].sort((a, b) => a.frequency - b.frequency); 

                const stats = {
                    frequency: {
                        min: sortedByFreq[0].frequency,
                        max: sortedByFreq[sortedByFreq.length - 1].frequency,
                    },
                    power: {
                        min: sortedByPower[0].power,
                        max: sortedByPower[sortedByPower.length - 1].power,
                        avg: powerSum / allData.length,
                    },
                };
                
                const peakPowerRows = [...sortedByPower].reverse().slice(0, 10);
                const finalHeaders = headerValues || ['Frequency', 'Power'];

                const report: FileAnalysisReport = {
                    fileName: file.name,
                    rowCount: dataLines.length,
                    columnCount: finalHeaders.length,
                    headers: finalHeaders,
                    stats,
                    samples: {
                        firstRows: allData.slice(0, 10),
                        lastRows: allData.slice(-10),
                        peakPowerRows: peakPowerRows
                    },
                };

                resolve(report);

            } catch (error) {
                console.error("CSV Parsing Error:", error);
                reject(error instanceof Error ? error : new Error("An unknown error occurred during file parsing."));
            }
        };

        reader.onerror = (error) => {
            console.error("File Reading Error:", error);
            reject(new Error("Failed to read the file."));
        };

        reader.readAsText(file);
    });
};