
import React, { useState, useMemo } from 'react';
import { AuditEntry } from '../types';

const getScoreTextColor = (score: number): string => {
  if (score >= 8) return 'text-green-600';
  if (score >= 5) return 'text-yellow-600';
  return 'text-red-600';
};

const getScoreBgColor = (score: number): string => {
  if (score >= 8) return 'bg-green-100 text-green-700';
  if (score >= 5) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
};


interface BestPracticesReportProps {
    history: AuditEntry[];
    agents: string[];
    onViewDetails: (entry: AuditEntry) => void;
}

const BestPracticesReport: React.FC<BestPracticesReportProps> = ({ history, agents, onViewDetails }) => {
    const [agentFilter, setAgentFilter] = useState<string>('all');
    const [keywordFilter, setKeywordFilter] = useState<string>('');

    const nominatedHistory = useMemo(() => {
        return history
            .filter(entry => entry.nominated === true)
            .filter(entry => {
                // Agent filter
                if (agentFilter !== 'all' && entry.agentEmail !== agentFilter) {
                    return false;
                }
                // Keyword filter
                if (keywordFilter && !entry.analysis.overallScore.summary.toLowerCase().includes(keywordFilter.toLowerCase())) {
                    return false;
                }
                return true;
            });
    }, [history, agentFilter, keywordFilter]);


    if (history.filter(entry => entry.nominated).length === 0) {
        return (
            <div className="text-center text-slate-500 bg-white rounded-xl shadow-lg p-10 lg:p-20 animate-fade-in">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium">No "Best Practice" Calls Nominated Yet</h3>
                <p className="mt-1 text-sm">When a call scores 9 or higher, a "Nominate" button will appear on its report. Nominated calls will be collected here as a training resource.</p>
            </div>
        );
    }
    
    return (
        <div className="animate-fade-in">
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-bold text-yellow-800">Exemplary Call Library</h3>
                <p className="text-sm text-yellow-700">This is a curated list of high-performing calls nominated by auditors. Use these reports as a learning tool to understand what excellent performance looks like.</p>
            </div>

             <div className="bg-white rounded-xl shadow p-4 mb-6 border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="bp-agent-filter" className="block text-sm font-medium text-slate-600 mb-1">Filter by Agent</label>
                        <select id="bp-agent-filter" value={agentFilter} onChange={e => setAgentFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                            <option value="all">All Agents</option>
                            {agents.filter(agent => history.some(h => h.nominated && h.agentEmail === agent)).map(agent => <option key={agent} value={agent}>{agent}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="bp-keyword-filter" className="block text-sm font-medium text-slate-600 mb-1">Search in Summary</label>
                        <input type="text" id="bp-keyword-filter" value={keywordFilter} onChange={e => setKeywordFilter(e.target.value)} placeholder="e.g., 'rapport', 'urgency'" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg">
                <div className="p-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">Nominated Calls ({nominatedHistory.length} results)</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Agent Email</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nominated By</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Overall Score</th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">View Report</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {nominatedHistory.map(entry => (
                                <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{entry.agentEmail}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(entry.timestamp).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{entry.auditorName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getScoreBgColor(entry.analysis.overallScore.score)}`}>
                                            {entry.analysis.overallScore.score} / 10
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => onViewDetails(entry)} className="text-blue-600 hover:text-blue-800 font-semibold">View Report</button>
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

export default BestPracticesReport;
