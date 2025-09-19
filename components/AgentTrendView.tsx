import React, { useMemo, useState } from 'react';
import { AuditEntry } from '../types';
import { LOW_SCORE_THRESHOLD } from '../constants';

const getScoreBgColor = (score: number): string => {
  if (score >= 8) return 'bg-green-500';
  if (score >= 5) return 'bg-yellow-500';
  return 'bg-red-500';
};

const getScoreTextColor = (score: number): string => {
  if (score >= 8) return 'text-green-600 dark:text-green-400';
  if (score >= 5) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

// FIX: Define AgentTrendViewProps interface to resolve "Cannot find name 'AgentTrendViewProps'" error.
interface AgentTrendViewProps {
  agentEmail: string;
  allHistory: AuditEntry[];
  onClose: () => void;
  onGenerateCoachingPlan: (agentEmail: string) => void;
}

const AgentTrendView: React.FC<AgentTrendViewProps> = ({ agentEmail, allHistory, onClose, onGenerateCoachingPlan }) => {
    const [selectedParam, setSelectedParam] = useState<string>('Overall Score');

    const agentHistory = useMemo(() => {
        return allHistory
            .filter(e => e.agentEmail === agentEmail)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()); // oldest to newest for chart
    }, [allHistory, agentEmail]);

    const teamStats = useMemo(() => {
        if (allHistory.length === 0) return { overallAvg: 0, paramAvgs: {} };

        let totalScore = 0;
        const paramData: Record<string, { total: number; count: number }> = {};

        allHistory.forEach(entry => {
            totalScore += entry.analysis.overallScore.score;
            entry.analysis.detailedScores.forEach(p => {
                if (!paramData[p.parameter]) {
                    paramData[p.parameter] = { total: 0, count: 0 };
                }
                paramData[p.parameter].total += p.score;
                paramData[p.parameter].count += 1;
            });
        });

        const paramAvgs: Record<string, number> = {};
        for (const key in paramData) {
            paramAvgs[key] = paramData[key].total / paramData[key].count;
        }

        return {
            overallAvg: totalScore / allHistory.length,
            paramAvgs,
        };
    }, [allHistory]);

    const agentStats = useMemo(() => {
        if (agentHistory.length === 0) {
            return { totalAudits: 0, avgScore: 0, problemParameters: [], lastAuditDate: null, paramAvgs: {} };
        }

        const totalScore = agentHistory.reduce((acc, curr) => acc + curr.analysis.overallScore.score, 0);
        const totalAudits = agentHistory.length;
        const avgScore = totalScore / totalAudits;
        
        const problemParameters: Record<string, number> = {};
        const paramData: Record<string, { total: number; count: number }> = {};

        agentHistory.forEach(entry => {
            entry.analysis.detailedScores.forEach(param => {
                if (!paramData[param.parameter]) {
                    paramData[param.parameter] = { total: 0, count: 0 };
                }
                paramData[param.parameter].total += param.score;
                paramData[param.parameter].count += 1;

                if (param.score <= LOW_SCORE_THRESHOLD) {
                    problemParameters[param.parameter] = (problemParameters[param.parameter] || 0) + 1;
                }
            });
        });

        const paramAvgs: Record<string, number> = {};
        for (const key in paramData) {
            paramAvgs[key] = paramData[key].total / paramData[key].count;
        }
        
        const sortedProblems = Object.entries(problemParameters)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);
            
        const lastAuditDate = new Date(agentHistory[agentHistory.length - 1].timestamp).toLocaleDateString();

        return { totalAudits, avgScore, problemParameters: sortedProblems, lastAuditDate, paramAvgs };
    }, [agentHistory]);

     const allParams = useMemo(() => ['Overall Score', ...Array.from(new Set(allHistory.flatMap(h => h.analysis.detailedScores.map(s => s.parameter))))], [allHistory]);

    const chartData = useMemo(() => {
        const historySlice = agentHistory.slice(-20);
        if (selectedParam === 'Overall Score') {
            return historySlice.map(entry => ({ id: entry.id, score: entry.analysis.overallScore.score }));
        }
        return historySlice.map(entry => {
            const param = entry.analysis.detailedScores.find(p => p.parameter === selectedParam);
            return { id: entry.id, score: param ? param.score : 0 }; // Use 0 if param not found for a call
        });
    }, [agentHistory, selectedParam]);
    
    const { cardTitle, currentAgentAvg, currentTeamAvg } = useMemo(() => {
        const isOverall = selectedParam === 'Overall Score';
        const cardTitle = isOverall ? 'Average Score' : `Avg. for "${selectedParam}"`;
        const currentAgentAvg = isOverall ? agentStats.avgScore : (agentStats.paramAvgs[selectedParam] || 0);
        const currentTeamAvg = isOverall ? teamStats.overallAvg : (teamStats.paramAvgs[selectedParam] || 0);
        return { cardTitle, currentAgentAvg, currentTeamAvg };
    }, [selectedParam, agentStats, teamStats]);


    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center animate-fade-in-fast"
            onClick={onClose}
        >
            <div 
                className="bg-slate-50 dark:bg-slate-800/95 dark:backdrop-blur-sm dark:border dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4 animate-slide-up-fast"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 md:p-8 relative">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors p-2 rounded-full bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 z-10"
                        aria-label="Close"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                         </svg>
                    </button>
                    
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Agent Performance Trend</h2>
                            <p className="text-lg font-semibold text-blue-700 dark:text-blue-400 mt-1">{agentEmail}</p>
                        </div>
                        <button
                            onClick={() => onGenerateCoachingPlan(agentEmail)}
                            className="w-full sm:w-auto text-center bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-all duration-300 text-sm flex items-center justify-center gap-2"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L9 9.61v5.032a1 1 0 001.28.96l7-3.5a1 1 0 000-1.725l-7-3.5zM9 11.234V7.61L4.053 5.388 9 3.166v3.468L10 7.23v3.443l4.947 2.474L10 15.334V11.234z" />
                             </svg>
                            Generate Weekly Coaching Plan
                        </button>
                    </div>


                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-black/20 p-4">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total Audits</p>
                            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{agentStats.totalAudits}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-black/20 p-4">
                            <p className="text-sm text-slate-500 dark:text-slate-400">{cardTitle}</p>
                            <p className={`text-3xl font-bold ${getScoreTextColor(currentAgentAvg)}`}>{currentAgentAvg.toFixed(1)}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Team Avg: {currentTeamAvg.toFixed(1)}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-black/20 p-4">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Last Audit</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{agentStats.lastAuditDate || 'N/A'}</p>
                        </div>
                    </div>
                    
                    <div className="mt-8">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
                            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">Score Trend (Last 20 Calls)</h3>
                            <select value={selectedParam} onChange={e => setSelectedParam(e.target.value)} className="w-full sm:w-auto px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white">
                                {allParams.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>

                        {agentHistory.length > 0 ? (
                            <div className="w-full h-48 bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg flex items-end gap-2 border border-slate-200 dark:border-slate-700">
                                {chartData.map(dataPoint => (
                                    <div key={dataPoint.id} className="relative flex-1 h-full flex flex-col justify-end items-center group">
                                        <div 
                                            className={`w-full rounded-t-sm transition-all duration-300 hover:opacity-80 ${getScoreBgColor(dataPoint.score)}`}
                                            style={{ height: `${dataPoint.score * 10}%` }}
                                        ></div>
                                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-900 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            {dataPoint.score}/10
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800 dark:border-t-slate-900"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 dark:text-slate-400 text-center py-10">No audit history to display trend.</p>
                        )}
                    </div>
                    
                    <div className="mt-8">
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-4">Common Problem Areas (Low Scores)</h3>
                        {agentStats.problemParameters.length > 0 ? (
                            <div className="space-y-3">
                                {/* FIX: Explicitly type `param` and `count` to resolve TypeScript errors where they were inferred as `unknown`. */}
                                {agentStats.problemParameters.map(([param, count]: [string, number]) => (
                                    <div key={param} className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm dark:shadow-black/20">
                                        <div className="flex justify-between items-center text-sm mb-1">
                                            <span className="font-semibold text-slate-600 dark:text-slate-300">{param}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-slate-400 dark:text-slate-500">
                                                    Agent Avg: <span className={`font-bold ${getScoreTextColor(agentStats.paramAvgs[param] || 0)}`}>{(agentStats.paramAvgs[param] || 0).toFixed(1)}</span>
                                                    {' / '}
                                                    Team Avg: <span className="font-bold text-slate-500 dark:text-slate-400">{(teamStats.paramAvgs[param] || 0).toFixed(1)}</span>
                                                </span>
                                                <span className="font-bold text-red-600 dark:text-red-400 w-20 text-right">{count} {count > 1 ? 'errors' : 'error'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 dark:text-slate-400 text-center py-10">No significant problem areas identified. Great job!</p>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AgentTrendView;