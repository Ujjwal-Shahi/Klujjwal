import React from 'react';
import { generateUserGuidePDF } from './UserGuideGenerator';

interface HeaderProps {
  currentUser: string;
  onLogout: () => void;
}


const Header: React.FC<HeaderProps> = ({ currentUser, onLogout }) => (
  <header className="bg-white dark:bg-slate-800 shadow-md dark:shadow-black/20">
    <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2V7a2 2 0 012-2h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H17z" />
            </svg>
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">Call Quality Analyzer</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Powered by NoBroker & Gemini AI</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">Logged in as</p>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[200px]" title={currentUser}>{currentUser}</p>
        </div>
        <div className="flex items-center gap-2">
            <button
              onClick={generateUserGuidePDF}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-semibold py-2 px-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 text-sm"
              aria-label="Download User Guide"
              title="Download User Guide"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-1.293 1.293a1 1 0 001.414 1.414L6 12.586V8a4 4 0 118 0v4.586l2.293 2.293a1 1 0 001.414-1.414L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3V8a3 3 0 116 0v7a3 3 0 01-3 3z" />
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              Guide
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-semibold py-2 px-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 text-sm"
              aria-label="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              Logout
            </button>
        </div>
      </div>
    </div>
  </header>
);

export default Header;