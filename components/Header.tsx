import React from 'react';
import { PhantomBandLogo } from './icons/PhantomBandLogo.tsx';
import { RefreshIcon } from './icons/RefreshIcon.tsx';

interface HeaderProps {
    onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh }) => {
  return (
    <header className="py-4">
      <div className="container mx-auto flex items-center justify-center relative">
        <div className="flex items-center justify-center space-x-3">
            <PhantomBandLogo className="w-9 h-9 text-primary-amber" />
            <h1 className="text-2xl font-bold font-display text-text-main tracking-wider uppercase">
            PhantomBand
            </h1>
        </div>
        <button
          onClick={onRefresh}
          className="absolute right-4 lg:right-6 p-2 text-text-secondary hover:text-primary-amber transition-colors rounded-full hover:bg-base-200"
          aria-label="Start new session"
        >
          <RefreshIcon className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
};