import React, { useState, useRef } from 'react';
import { FileCodeIcon } from './icons/FileCodeIcon';
import type { FileAnalysisReport } from '../types';

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  analysisReport: FileAnalysisReport | null;
  analysisError: string | null;
}

const ReportStat: React.FC<{ label: string, value: string | number }> = ({ label, value }) => (
    <div className="flex justify-between items-baseline">
        <p className="text-text-secondary">{label}:</p>
        <p className="font-semibold text-text-main">{value}</p>
    </div>
);


export const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, analysisReport, analysisError }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    onFileChange(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };
  
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files ? event.dataTransfer.files[0] : null;
    if (file) {
      onFileChange(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = event.dataTransfer.files;
      }
    }
  };

  const handleClick = () => {
    if (!analysisReport && !analysisError) {
        fileInputRef.current?.click();
    }
  };

  const handleClearFile = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent click from triggering file input
    onFileChange(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  const baseClasses = "border border-dashed rounded-md p-4 text-center transition-all duration-300";
  const idleClasses = "cursor-pointer bg-base-100/50 border-secondary";
  const dragClasses = isDragOver ? 'border-primary-amber scale-105' : 'border-secondary';
  
  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".csv,.txt"
      />
      
      {analysisError ? (
        <div className={`${baseClasses} border-red-500/80 text-left animate-fade-in`}>
            <div className="flex justify-between items-center mb-3">
                <p className="font-semibold text-red-400 text-sm uppercase">File Analysis Error</p>
                <button onClick={handleClearFile} className="text-xs text-text-secondary hover:text-red-400">&times; Clear</button>
            </div>
            <div className="space-y-2 text-xs font-mono bg-red-900/30 p-3 rounded-md text-red-300">
                <p>{analysisError}</p>
            </div>
            <p className="text-xs text-text-secondary/70 mt-3 text-center">
                Please upload a different file or check the file format.
            </p>
        </div>
      ) : analysisReport ? (
        <div className={`${baseClasses} border-primary-amber text-left animate-fade-in`}>
            <div className="flex justify-between items-center mb-3">
                <p className="font-semibold text-primary-amber text-sm uppercase">Pre-Analysis Report</p>
                <button onClick={handleClearFile} className="text-xs text-text-secondary hover:text-red-400">&times; Clear</button>
            </div>
            <div className="space-y-2 text-xs font-mono bg-base-300/50 p-3 rounded-md">
                <ReportStat label="File" value={analysisReport.fileName} />
                <ReportStat label="Rows" value={analysisReport.rowCount.toLocaleString()} />
                <ReportStat label="Columns" value={analysisReport.columnCount} />
                <hr className="border-secondary/20 my-2" />
                <ReportStat label="Freq Range (MHz)" value={`${analysisReport.stats.frequency.min.toFixed(2)} - ${analysisReport.stats.frequency.max.toFixed(2)}`} />
                <ReportStat label="Power Range (dBm)" value={`${analysisReport.stats.power.min.toFixed(2)} - ${analysisReport.stats.power.max.toFixed(2)}`} />
                <ReportStat label="Avg Power (dBm)" value={analysisReport.stats.power.avg.toFixed(2)} />
            </div>
            <p className="text-xs text-text-secondary/70 mt-3 text-center">
                A summary of this data will be sent to the AI for analysis.
            </p>
        </div>
      ) : (
        <div
            className={`${baseClasses} ${idleClasses} ${dragClasses}`}
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="flex flex-col items-center justify-center space-y-2 text-text-secondary h-full">
                <FileCodeIcon className="w-8 h-8 mb-1" />
                <div>
                <p>
                    <span className="font-semibold text-primary-amber">UPLOAD FILE</span> or drag & drop
                </p>
                <p className="text-xs text-text-secondary/70">.csv & .txt files only</p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};