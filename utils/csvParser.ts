import type { FileAnalysisReport, SpectrumDataPoint } from '../types';

/**
 * A custom error to signal that automatic column detection failed and manual selection is needed.
 */
export class ColumnDetectionError extends Error {
    headers: string[];
    sampleData: string[][];

    constructor(message: string, headers: string[], sampleData: string[][]) {
        super(message);
        this.name = 'ColumnDetectionError';
        this.headers = headers;
        this.sampleData = sampleData;
    }
}

/**
 * Parses a string row into an array of strings. Handles various delimiters.
 */
const parseCsvRow = (row: string): string[] => {
    return row.trim().split(/[\t,; ]+/);
};

/**
 * Checks if a string looks like a number.
 */
const isNumeric = (str: string): boolean => {
    if (typeof str !== 'string' || str.trim() === '') return false;
    return !isNaN(parseFloat(str)) && isFinite(Number(str));
};

/**
 * Cleans a string value and converts it to a float.
 * @param value The string value from a cell.
 * @returns A number, or NaN if parsing fails.
 */
const cleanAndParseFloat = (value: string | undefined): number => {
    if (!value) return NaN;
    const cleanedValue = value
        .trim()
        .toLowerCase()
        .replace(/(mhz|khz|ghz|hz|dbm|db|mw|pwr)$/i, '')
        .trim();
    return parseFloat(cleanedValue);
};

interface ParseOptions {
    manualFreqIndex?: number;
    manualPowerIndex?: number;
}


/**
 * Reads a File or Blob object, parses its CSV/TXT content, and generates a statistical report.
 * @param file The file or blob to analyze.
 * @param options Optional manual overrides for column indices.
 * @returns A promise that resolves to a FileAnalysisReport.
 */
export const parseAndAnalyzeCsv = (file: File | Blob, options: ParseOptions = {}): Promise<FileAnalysisReport> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                if (!text) {
                     throw new Error("File is empty or could not be read.");
                }
                
                const lines = text.trim().split(/\r\n?|\n/).filter(line => line.trim() !== '');
                if (lines.length < 1) {
                    throw new Error("File must contain at least one data row.");
                }

                let headerValues: string[] = [];
                let dataLines: string[];
                let freqIndex = options.manualFreqIndex ?? -1;
                let powerIndex = options.manualPowerIndex ?? -1;

                let dataStartIndex = 0;
                for (let i = 0; i < Math.min(10, lines.length); i++) {
                    const cols = parseCsvRow(lines[i]);
                    if (cols.length >= 2) {
                        dataStartIndex = i;
                        break;
                    }
                }
                
                const relevantLines = lines.slice(dataStartIndex);
                 if (relevantLines.length < 1) {
                    throw new Error("No valid data rows found after skipping metadata.");
                }

                const firstLineValues = parseCsvRow(relevantLines[0]);
                const hasHeader = firstLineValues.some(val => val !== '' && !isNumeric(val));

                if (hasHeader) {
                    headerValues = firstLineValues;
                    dataLines = relevantLines.slice(1);
                } else {
                    dataLines = relevantLines;
                    const numColumns = firstLineValues.length;
                    headerValues = Array.from({ length: numColumns }, (_, i) => `Column ${i + 1}`);
                }
                
                if (options.manualFreqIndex === undefined || options.manualPowerIndex === undefined) {
                    const lowerCaseHeaders = headerValues.map(h => h.toLowerCase().trim());
                    
                    const freqKeywords = ['freq', 'frequency', 'mhz', 'khz', 'ghz', 'hertz', 'hz', 'channel', 'band', 'freq.', 'f(mhz)'];
                    const powerKeywords = ['power', 'dbm', 'db', 'level', 'amplitude', 'rssi', 'signal', 'strength', 'intensity', 'sig_str', 'pwr'];
                    
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

                    if (freqCandidates.length > 0 && powerCandidates.length > 0) {
                        const bestFreq = freqCandidates[0];
                        const bestPower = powerCandidates[0];

                        if (bestFreq.index !== bestPower.index) {
                            freqIndex = bestFreq.index;
                            powerIndex = bestPower.index;
                        } else {
                            const conflictIndex = bestFreq.index;
                            if (bestFreq.freqScore > bestPower.powerScore) {
                                freqIndex = conflictIndex;
                                const nextBestPower = powerCandidates.find(c => c.index !== conflictIndex);
                                if (nextBestPower) powerIndex = nextBestPower.index;
                            } else {
                                powerIndex = conflictIndex;
                                const nextBestFreq = freqCandidates.find(c => c.index !== conflictIndex);
                                if (nextBestFreq) freqIndex = nextBestFreq.index;
                            }
                        }
                    } else if (!hasHeader) {
                        const sampleSize = Math.min(20, dataLines.length);
                        if (sampleSize > 0 && parseCsvRow(dataLines[0]).length >= 2) {
                            const sampleRows = dataLines.slice(0, sampleSize).map(line => parseCsvRow(line));
                            const numColumns = sampleRows[0].length;
                            
                            const columnStats = Array(numColumns).fill(0).map(() => ({ negativeCount: 0, numericCount: 0 }));
                            
                            for (const row of sampleRows) {
                                for (let i = 0; i < numColumns; i++) {
                                    const value = cleanAndParseFloat(row[i]);
                                    if (!isNaN(value)) {
                                        columnStats[i].numericCount++;
                                        if (value < 0) columnStats[i].negativeCount++;
                                    }
                                }
                            }
                            
                            const numericColumns = columnStats
                                .map((stats, index) => ({ ...stats, index }))
                                .filter(c => c.numericCount > sampleSize / 2)
                                .sort((a, b) => b.numericCount - a.numericCount);
                                
                            if (numericColumns.length >= 2) {
                                numericColumns.sort((a,b) => b.negativeCount - a.negativeCount);
                                powerIndex = numericColumns[0].index;
                                freqIndex = numericColumns.find(c => c.index !== powerIndex)?.index ?? -1;
                            }
                        }
                    }
                }

                if (freqIndex === -1 || powerIndex === -1 || freqIndex === powerIndex) {
                    const sampleData = dataLines.slice(0, 5).map(line => parseCsvRow(line));
                    const errorMsg = "Could not automatically detect the required columns.";
                    throw new ColumnDetectionError(errorMsg, headerValues, sampleData);
                }
                
                if (dataLines.length === 0) {
                     throw new Error("File contains a header but no data rows.");
                }

                const allData: SpectrumDataPoint[] = [];
                let powerSum = 0;

                for (const line of dataLines) {
                    const values = parseCsvRow(line);
                    if (values.length > Math.max(freqIndex, powerIndex)) {
                        const frequency = cleanAndParseFloat(values[freqIndex]);
                        const power = cleanAndParseFloat(values[powerIndex]);

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

                const report: FileAnalysisReport = {
                    fileName: (file instanceof File) ? file.name : 'File Segment',
                    rowCount: dataLines.length,
                    columnCount: headerValues.length,
                    headers: headerValues,
                    stats,
                    samples: {
                        firstRows: allData.slice(0, 10),
                        lastRows: allData.slice(-10),
                        peakPowerRows: peakPowerRows
                    },
                };

                resolve(report);

            } catch (error) {
                if (error instanceof ColumnDetectionError) {
                    reject(error);
                } else {
                    console.error("CSV Parsing Error:", error);
                    reject(error instanceof Error ? error : new Error("An unknown error occurred during file parsing."));
                }
            }
        };

        reader.onerror = (error) => {
            console.error("File Reading Error:", error);
            reject(new Error("Failed to read the file."));
        };

        reader.readAsText(file);
    });
};