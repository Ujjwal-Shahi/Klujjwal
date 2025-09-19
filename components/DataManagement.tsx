import React, { useRef, useState } from 'react';
import { AuditEntry } from '../types';

interface DataManagementProps {
    history: AuditEntry[];
    onImportHistory: (files: FileList) => Promise<string>;
    onClearHistory: () => void;
}

const DataManagement: React.FC<DataManagementProps> = ({ history, onImportHistory, onClearHistory }) => {
    const importInputRef = useRef<HTMLInputElement>(null);
    const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);


    const handleExportHistory = () => {
        if (history.length === 0) {
            alert("No data to export.");
            return;
        }
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(history, null, 2)
        )}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `nobroker_audit_history_export_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        link.remove();
    };

    const handleImportClick = () => {
        setImportResult(null); // Clear previous results
        importInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            setSelectedFiles(files);
            setImportResult(null); // Clear result when new files are selected
        } else {
            setSelectedFiles(null);
        }
    };
    
    const handleCancelImport = () => {
        setSelectedFiles(null);
        if (importInputRef.current) {
            importInputRef.current.value = "";
        }
    };

    const handleSubmitImport = async () => {
        if (selectedFiles) {
            setIsImporting(true);
            setImportResult(null);
            try {
                const message = await onImportHistory(selectedFiles);
                setImportResult({ type: 'success', message });
            } catch (error) {
                setImportResult({ type: 'error', message: error instanceof Error ? error.message : 'An unknown error occurred.' });
            } finally {
                setIsImporting(false);
                handleCancelImport();
            }
        } else {
            setImportResult({ type: 'error', message: 'No files selected to submit.' });
        }
    };


    return (
        <div className="animate-fade-in space-y-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-800">Data Sync & Backup</h1>
            
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Important: How Your Data is Stored</h2>
                        <p className="text-slate-700 mt-2">
                            All audit data you create is stored <strong className="text-blue-700">locally in this web browser only</strong>. It is not automatically saved to the cloud or shared with other users.
                        </p>
                        <p className="text-slate-700 mt-2">
                            To create a combined dashboard with your team's data, you must manually export your data and have a team lead import it.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-slate-700 mb-4">How to Combine Team Data</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold mb-3">1</div>
                        <h3 className="font-semibold text-slate-800">Export Data</h3>
                        <p className="text-sm text-slate-500">Each auditor clicks 'Export My Data' to save a file of their local audit history.</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold mb-3">2</div>
                        <h3 className="font-semibold text-slate-800">Share Files</h3>
                        <p className="text-sm text-slate-500">Share the exported <code>.json</code> files with your manager (e.g., via email or chat).</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold mb-3">3</div>
                        <h3 className="font-semibold text-slate-800">Import & Merge</h3>
                        <p className="text-sm text-slate-500">The manager selects all team files, clicks 'Submit', and the app merges them into a unified dashboard.</p>
                    </div>
                </div>
            </div>

             <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-slate-700 mb-4">Data Actions</h2>

                {importResult && (
                    <div className={`p-4 rounded-lg mb-4 text-sm ${importResult.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`} role="alert">
                        <p className="font-bold">{importResult.type === 'success' ? 'Import Successful' : 'Import Failed'}</p>
                        <p className="mt-1 whitespace-pre-wrap">{importResult.message}</p>
                    </div>
                )}
                
                <div className="space-y-4">
                     <input 
                        type="file" 
                        ref={importInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept="application/json"
                        multiple
                        disabled={isImporting}
                    />
                    
                    <div className="p-4 border border-slate-200 rounded-lg">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="font-semibold text-slate-800">Import & Merge Data</h3>
                                <p className="text-sm text-slate-500">Select one or more <code>.json</code> files from your team to merge them with your local data.</p>
                            </div>
                            <button 
                                onClick={handleImportClick}
                                disabled={isImporting}
                                className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 bg-white text-slate-700 font-semibold py-2 px-4 rounded-lg border border-slate-300 hover:bg-slate-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L6.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                                Select Files...
                            </button>
                        </div>
                        {selectedFiles && selectedFiles.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-200 bg-slate-50 p-4 rounded-md animate-fade-in-fast">
                                <p className="text-sm font-semibold text-slate-700">
                                    {selectedFiles.length} file(s) selected:
                                </p>
                                <ul className="text-xs text-slate-500 list-disc pl-5 mt-1 max-h-24 overflow-y-auto">
                                   {Array.from(selectedFiles).map(file => <li key={file.name}>{file.name}</li>)}
                                </ul>
                                <div className="mt-4 flex items-center gap-3">
                                    <button 
                                        onClick={handleSubmitImport}
                                        disabled={isImporting}
                                        className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300 flex items-center justify-center gap-2 w-40 disabled:bg-green-400 disabled:cursor-not-allowed"
                                    >
                                        {isImporting ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Merging...
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                                Submit and Merge
                                            </>
                                        )}
                                    </button>
                                    <button 
                                        onClick={handleCancelImport}
                                        disabled={isImporting}
                                        className="text-slate-600 hover:text-slate-800 font-semibold text-sm py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="p-4 border border-slate-200 rounded-lg">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="font-semibold text-slate-800">Export My Data</h3>
                                <p className="text-sm text-slate-500">Save a backup of your local audit history to a <code>.json</code> file.</p>
                            </div>
                             <button 
                                onClick={handleExportHistory}
                                disabled={isImporting}
                                className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 disabled:bg-blue-400 disabled:cursor-not-allowed"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                   <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                 </svg>
                                Export Data
                            </button>
                        </div>
                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
                            <p><strong>Note:</strong> Exports now include audio data to enable the timeline sync feature. This will result in significantly larger file sizes.</p>
                        </div>
                    </div>
                </div>
             </div>

             <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                 <h2 className="text-xl font-bold text-red-800">Danger Zone</h2>
                 <p className="text-red-700 mt-2">This will permanently delete all audit records from <strong>this browser only</strong>. This action cannot be undone and will not affect data exported by or stored by other users.</p>
                 <div className="mt-4">
                     <button 
                        onClick={onClearHistory}
                        disabled={isImporting}
                        className="flex items-center gap-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 py-2 px-4 rounded-md transition-colors disabled:bg-red-400 disabled:cursor-not-allowed"
                        aria-label="Clear all local history"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                         </svg>
                        Clear All Local Data
                    </button>
                 </div>
             </div>
        </div>
    );
};

export default DataManagement;