import React, { useState, useRef, useEffect } from 'react';
import { FileCodeIcon } from './icons/FileCodeIcon';
import type { FileAnalysisReport } from '../types';
import { MAX_FILE_SIZE_BYTES } from '../constants.ts';
import { ColumnDetectionError } from '../utils/csvParser';

interface ParseOptions {
    manualFreqIndex?: number;
    manualPowerIndex?: number;
    manualTimeIndex?: number;
}

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  onRunFileAnalysis: (file: File | Blob, options?: ParseOptions) => void;
  uploadedFile: File | null;
  analysisReport: FileAnalysisReport | null;
  analysisError: Error | string | null;
}

const StatBox: React.FC<{ label: string, value: string | number, sub?: string, color?: string }> = ({ label, value, sub, color = 'text-text-main' }) => (
    <div className="bg-base-300/40 p-3 rounded border border-secondary/10 flex flex-col justify-between">
        <p className="text-[9px] text-text-secondary uppercase font-black tracking-widest mb-1">{label}</p>
        <div>
            <p className={`text-sm font-bold font-mono ${color}`}>{value}</p>
            {sub && <p className="text-[8px] text-text-secondary/60 uppercase font-bold">{sub}</p>}
        </div>
    </div>
);

export const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, onRunFileAnalysis, uploadedFile, analysisReport, analysisError }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLargeFile, setIsLargeFile] = useState(false);
  const [manualFreqIndex, setManualFreqIndex] = useState<number | string>('');
  const [manualPowerIndex, setManualPowerIndex] = useState<number | string>('');
  const [manualTimeIndex, setManualTimeIndex] = useState<number | string>('');

  useEffect(() => {
    if (!analysisError || !uploadedFile) {
        setManualFreqIndex('');
        setManualPowerIndex('');
        setManualTimeIndex('');
    }
  }, [analysisError, uploadedFile]);

  useEffect(() => {
    if (uploadedFile) {
      setIsLargeFile(uploadedFile.size > MAX_FILE_SIZE_BYTES);
      if (uploadedFile.size <= MAX_FILE_SIZE_BYTES) {
        onRunFileAnalysis(uploadedFile);
      }
    } else {
      setIsLargeFile(false);
    }
  }, [uploadedFile]);

  const handleFileChangeInternal = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    onFileChange(file);
  };

  const handleClearFile = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    onFileChange(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleConfirmSelection = () => {
    if (uploadedFile && manualFreqIndex !== '' && manualPowerIndex !== '') {
        onRunFileAnalysis(uploadedFile, {
            manualFreqIndex: Number(manualFreqIndex),
            manualPowerIndex: Number(manualPowerIndex),
            manualTimeIndex: manualTimeIndex !== '' ? Number(manualTimeIndex) : undefined
        });
    }
  };

  const baseClasses = "border border-dashed rounded-md p-4 transition-all duration-300";
  const idleClasses = "cursor-pointer bg-base-100/50 border-secondary hover:border-primary-amber hover:bg-primary-amber/5";
  const dragClasses = isDragOver ? 'border-primary-amber scale-105 bg-primary-amber/10' : 'border-secondary';

  const renderContent = () => {
      if (analysisError instanceof ColumnDetectionError) {
        return (
            <div className={`${baseClasses} border-amber-500/80 text-left animate-fade-in bg-amber-500/5`}>
                <div className="flex justify-between items-center mb-4">
                    <p className="font-bold text-amber-400 text-[10px] uppercase tracking-widest">Manual Emitter Mapping</p>
                    <button onClick={handleClearFile} className="text-[10px] text-text-secondary hover:text-red-400">&times;</button>
                </div>
                <div className="space-y-3">
                    <select value={manualFreqIndex} onChange={e => setManualFreqIndex(e.target.value)} className="w-full bg-base-300 text-xs border border-secondary/50 p-2 rounded">
                        <option value="">Select Frequency Axis...</option>
                        {analysisError.headers.map((h, i) => <option key={i} value={i}>{i}: {h}</option>)}
                    </select>
                    <select value={manualPowerIndex} onChange={e => setManualPowerIndex(e.target.value)} className="w-full bg-base-300 text-xs border border-secondary/50 p-2 rounded">
                        <option value="">Select Power Amplitude...</option>
                        {analysisError.headers.map((h, i) => <option key={i} value={i}>{i}: {h}</option>)}
                    </select>
                    <button onClick={handleConfirmSelection} className="btn-primary w-full py-2 text-xs">Run Spectral Audit</button>
                </div>
            </div>
        );
      }

      if (analysisReport) {
          return (
              <div className="animate-fade-in space-y-4">
                  <div className={`${baseClasses} border-primary-amber/30 bg-primary-amber/5 relative`}>
                      <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                              <div className="h-2 w-2 bg-primary-amber rounded-full animate-pulse" />
                              <p className="text-[10px] font-black text-primary-amber uppercase tracking-widest">Mission Data Profile</p>
                          </div>
                          <button onClick={handleClearFile} className="text-[10px] text-text-secondary hover:text-red-400 font-bold">EJECT</button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                          <StatBox label="Identifier" value={analysisReport.fileName.substring(0, 15)} sub="Source Log" />
                          <StatBox label="Resolution" value={analysisReport.columnCount} sub="Channels" />
                          <StatBox label="Payload" value={analysisReport.rowCount.toLocaleString()} sub="Data Points" />
                          <StatBox label="Duration" value={analysisReport.timeStats ? `${analysisReport.timeStats.durationSeconds.toFixed(1)}s` : 'N/A'} sub="T-Span" />
                      </div>

                      <div className="mt-2 grid grid-cols-1 gap-2">
                          <div className="bg-base-300/60 p-3 rounded border border-secondary/10">
                              <p className="text-[9px] text-text-secondary uppercase font-black tracking-widest mb-1">Spectral Range</p>
                              <p className="text-[10px] font-mono text-primary-amber">
                                  {analysisReport.stats.frequency.min.toFixed(2)} - {analysisReport.stats.frequency.max.toFixed(2)} MHz
                              </p>
                          </div>
                          <div className="bg-base-300/60 p-3 rounded border border-secondary/10">
                              <p className="text-[9px] text-text-secondary uppercase font-black tracking-widest mb-1">Noise Floor / Peak</p>
                              <div className="flex justify-between font-mono text-[10px]">
                                  <span className="text-text-secondary">{analysisReport.stats.power.min.toFixed(1)} dBm</span>
                                  <span className="text-primary-amber font-bold">{analysisReport.stats.power.max.toFixed(1)} dBm</span>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          );
      }

      return (
        <div
            className={`${baseClasses} ${idleClasses} ${dragClasses} flex flex-col items-center justify-center text-center`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={e => { e.preventDefault(); setIsDragOver(false); onFileChange(e.dataTransfer.files[0]); }}
            style={{ minHeight: '140px' }}
        >
            <FileCodeIcon className="w-8 h-8 mb-3 opacity-40 text-text-secondary" />
            <p className="text-[10px] font-black text-primary-amber uppercase tracking-widest">Uplink SIGINT Capture</p>
            <p className="text-[8px] text-text-secondary/60 uppercase mt-1">.CSV / .TXT / .LOG (50MB MAX)</p>
        </div>
      );
  }

  return (
    <div>
      <input type="file" ref={fileInputRef} onChange={handleFileChangeInternal} className="hidden" accept=".csv,.txt,.log" />
      {renderContent()}
    </div>
  );
};