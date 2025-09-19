import React, { useState, useMemo, useEffect } from 'react';
import { AuditEntry } from '../types';

const getScoreTextColor = (score: number): string => {
  if (score >= 8) return 'text-green-600';
  if (score >= 5) return 'text-yellow-600';
  return 'text-red-600';
};

const getScoreBgColor = (score: number): string => {
  if (score >= 8) return 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300';
  if (score >= 5) return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300';
  return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300';
};


interface AuditReportProps {
    history: AuditEntry[];
    agents: string[];
    onViewDetails: (entry: AuditEntry) => void;
    onGenerateSummary: (entries: AuditEntry[], title: string) => void;
}

const AuditReport: React.FC<AuditReportProps> = ({ history, agents, onViewDetails, onGenerateSummary }) => {
    const [agentFilter, setAgentFilter] = useState<string>('all');
    const [scoreRange, setScoreRange] = useState<[number, number]>([0, 10]);
    const [keywordFilter, setKeywordFilter] = useState<string>('');
    const [redFlagFilter, setRedFlagFilter] = useState<string>('all');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const filteredHistory = useMemo(() => {
        return history.filter(entry => {
            // Agent filter
            if (agentFilter !== 'all' && entry.agentEmail !== agentFilter) {
                return false;
            }
            // Score filter
            const score = entry.analysis.overallScore.score;
            if (score < scoreRange[0] || score > scoreRange[1]) {
                return false;
            }
            // Keyword filter (searches in overall summary)
            if (keywordFilter && !entry.analysis.overallScore.summary.toLowerCase().includes(keywordFilter.toLowerCase())) {
                return false;
            }
            // Red Flag filter
            if (redFlagFilter !== 'all') {
                const hasRedFlag = entry.analysis.propertiesDiscussed.some(p => 
                    (redFlagFilter === 'any' && (p.siteVisitScheduled.rescheduleRedFlag || p.siteVisitScheduled.virtualVisitOffered)) ||
                    (redFlagFilter === 'reschedule' && p.siteVisitScheduled.rescheduleRedFlag) ||
                    (redFlagFilter === 'virtual' && p.siteVisitScheduled.virtualVisitOffered)
                );
                if (!hasRedFlag) return false;
            }
            return true;
        });
    }, [history, agentFilter, scoreRange, keywordFilter, redFlagFilter]);

    useEffect(() => {
        // Clear selection if filters change and selected items are no longer visible
        const visibleIds = new Set(filteredHistory.map(h => h.id));
        const newSelectedIds = new Set([...selectedIds].filter(id => visibleIds.has(id)));
        if (newSelectedIds.size !== selectedIds.size) {
            setSelectedIds(newSelectedIds);
        }
    }, [filteredHistory, selectedIds]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allVisibleIds = new Set(filteredHistory.map(h => h.id));
            setSelectedIds(allVisibleIds);
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectSingle = (id: number, isChecked: boolean) => {
        const newSet = new Set(selectedIds);
        if (isChecked) {
            newSet.add(id);
        } else {
            newSet.delete(id);
        }
        setSelectedIds(newSet);
    };

    const handleGenerateSummaryClick = () => {
        const selectedEntries = history.filter(entry => selectedIds.has(entry.id));
        const title = `AI Summary for ${selectedIds.size} Selected Audits`;
        onGenerateSummary(selectedEntries, title);
    };


    if (history.length === 0) {
        return (
            <div className="text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl shadow-lg p-10 lg:p-20 animate-fade-in">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium">No Audit History Found</h3>
                <p className="mt-1 text-sm">Analyze a call to see its history here.</p>
            </div>
        );
    }
    
    return (
        <div className="animate-fade-in">
             <details className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 mb-6 border border-slate-200 dark:border-slate-700">
                <summary className="font-semibold text-slate-700 dark:text-slate-200 cursor-pointer flex justify-between items-center">
                    <span>Advanced Filters</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </summary>
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label htmlFor="agent-filter" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Agent</label>
                        <select id="agent-filter" value={agentFilter} onChange={e => setAgentFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white rounded-lg text-sm">
                            <option value="all">All Agents</option>
                            {agents.map(agent => <option key={agent} value={agent}>{agent}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="keyword-filter" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Keyword in Summary</label>
                        <input type="text" id="keyword-filter" value={keywordFilter} onChange={e => setKeywordFilter(e.target.value)} placeholder="e.g., 'rapport'" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white rounded-lg text-sm" />
                    </div>
                     <div>
                        <label htmlFor="redflag-filter" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Red Flags</label>
                        <select id="redflag-filter" value={redFlagFilter} onChange={e => setRedFlagFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white rounded-lg text-sm">
                            <option value="all">Any</option>
                            <option value="any">Has Red Flag</option>
                            <option value="reschedule">Proactive Reschedule</option>
                            <option value="virtual">Virtual Visit Offered</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="score-range-filter" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Score: {scoreRange[0]} - {scoreRange[1]}</label>
                        <input type="range" min="0" max="10" value={scoreRange[1]} onChange={e => setScoreRange([scoreRange[0], Number(e.target.value)])} className="w-full" />
                        <input type="range" min="0" max="10" value={scoreRange[0]} onChange={e => setScoreRange([Number(e.target.value), scoreRange[1]])} className="w-full" />
                    </div>
                </div>
            </details>


            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">History Details ({filteredHistory.length} results)</h2>
                </div>
                
                 {selectedIds.size > 0 && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/50 border-b border-blue-200 dark:border-blue-500/30 flex flex-col sm:flex-row justify-between sm:items-center gap-2 animate-fade-in-fast">
                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">{selectedIds.size} audit(s) selected.</p>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setSelectedIds(new Set())} className="text-sm text-slate-600 dark:text-slate-300 font-medium hover:underline">Clear selection</button>
                             <button onClick={handleGenerateSummaryClick} className="bg-blue-600 text-white font-semibold py-1.5 px-4 rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L9 9.61v5.032a1 1 0 001.28.96l7-3.5a1 1 0 000-1.725l-7-3.5zM9 11.234V7.61L4.053 5.388 9 3.166v3.468L10 7.23v3.443l4.947 2.474L10 15.334V11.234z" />
                                </svg>
                                Generate AI Summary
                            </button>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th scope="col" className="p-4 text-left">
                                    <input 
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-700"
                                        checked={filteredHistory.length > 0 && selectedIds.size === filteredHistory.length}
                                        onChange={handleSelectAll}
                                        aria-label="Select all items"
                                    />
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Auditor</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Agent Email</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Buyer User ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Call Timestamp</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Audit Timestamp</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Audio File</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Overall Score</th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">View Report</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredHistory.map(entry => (
                                <tr key={entry.id} className={`transition-colors ${selectedIds.has(entry.id) ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                                    <td className="p-4">
                                        <input 
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-700"
                                            checked={selectedIds.has(entry.id)}
                                            onChange={(e) => handleSelectSingle(entry.id, e.target.checked)}
                                            aria-label={`Select item ${entry.id}`}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{entry.auditorName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{entry.agentEmail}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{entry.buyerUserId}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{entry.callStamp || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(entry.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs" title={entry.fileName}>{entry.fileName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getScoreBgColor(entry.analysis.overallScore.score)}`}>
                                            {entry.analysis.overallScore.score} / 10
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => onViewDetails(entry)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold">View Report</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AuditReport;