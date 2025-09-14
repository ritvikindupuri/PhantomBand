import React, { useState, useRef, useEffect } from 'react';
import { FileCodeIcon } from './icons/FileCodeIcon';

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  uploadedFile: File | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, uploadedFile }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    if (uploadedFile) {
        setFileName(uploadedFile.name);
    } else {
        setFileName(null);
    }
  }, [uploadedFile]);

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
    fileInputRef.current?.click();
  };

  const fileStatusClasses = fileName ? 'border-primary-amber' : 'border-secondary';
  const dragStatusClasses = isDragOver ? 'border-accent scale-105' : 'border-secondary';

  return (
    <div
      className={`border border-dashed rounded-md p-6 text-center cursor-pointer transition-all duration-300 bg-base-100/50 ${fileName ? fileStatusClasses : dragStatusClasses}`}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".csv,.txt"
      />
      <div className="flex flex-col items-center justify-center space-y-2 text-text-secondary">
        <FileCodeIcon className="w-10 h-10 mb-2" />
        {fileName ? (
          <>
            <p className="font-semibold text-primary-amber">FILE LOADED</p>
            <p className="text-xs break-all">{fileName}</p>
            <p className="text-xs text-text-secondary/70 bg-base-300 px-2 py-1 rounded-md mt-1">
                Full Data Analysis
            </p>
          </>
        ) : (
          <div>
            <p>
              <span className="font-semibold text-primary-amber">UPLOAD FILE</span> or drag & drop
            </p>
            <p className="text-xs text-text-secondary/70">.csv & .txt files only</p>
          </div>
        )}
      </div>
    </div>
  );
};