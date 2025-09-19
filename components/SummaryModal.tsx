import React from 'react';
import Loader from './Loader';
import ErrorMessage from './ErrorMessage';

interface SummaryModalProps {
  isOpen: boolean;
  isLoading: boolean;
  content: string;
  error: string | null;
  onClose: () => void;
  title: string;
}

const SummaryModal: React.FC<SummaryModalProps> = ({ isOpen, isLoading, content, error, onClose, title }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center animate-fade-in-fast"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col m-4 animate-slide-up-fast"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 transition-colors p-2 rounded-full bg-slate-100 hover:bg-slate-200"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {isLoading && <Loader />}
          {error && <ErrorMessage message={error} />}
          {!isLoading && !error && content && (
            <pre className="bg-white p-4 rounded-md text-slate-700 whitespace-pre-wrap font-sans text-sm border border-slate-200">
              {content}
            </pre>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 text-right">
            <button
                onClick={onClose}
                className="bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all duration-300"
            >
                Close
            </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryModal;
