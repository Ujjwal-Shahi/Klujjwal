import React, { useState, useMemo } from 'react';
import { AuditEntry } from '../types';
import { LOW_SCORE_THRESHOLD } from '../constants';

interface DashboardProps {
    history: AuditEntry[];
    agents: string[];
    auditors: string[];
    onViewAgentTrend: (agentEmail: string) => void;
    onViewDetails: (entry: AuditEntry) => void;
    onCustomizeCoaching: (agentEmail: string, parameter: string) => void;
    onGenerateAgentSummary: (agentEmail: string) => void;
    onGenerateRootCauseAnalysis: (parameter: string) => void;
    onFindCallOfTheWeek: () => void;
    dismissedAlerts: string[];
    setDismissedAlerts: (alerts: string[]) => void;
}

const formatSecondsToHHMMSS = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const getScoreTextColor = (score: number): string => {
  if (score >= 8) return 'text-green-600 dark:text-green-400';
  if (score >= 5) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

const getScoreBgColor = (score: number): string => {
  if (score >= 8) return 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300';
  if (score >= 5) return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300';
  return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300';
};

const StatCard: React.FC<{ title: string; value: string | number; subValue?: string }> = ({ title, value, subValue }) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-5 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
        <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        {subValue && <p className="text-xs text-slate-400 dark:text-slate-500">{subValue}</p>}
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ 
    history, agents, auditors, onViewAgentTrend, onViewDetails, onCustomizeCoaching, 
    onGenerateAgentSummary, onGenerateRootCauseAnalysis, onFindCallOfTheWeek,
    dismissedAlerts, setDismissedAlerts
}) => {
    const [timeFilter, setTimeFilter] = useState<'all' | 'mtd' | 'today'>('all');
    
    const filteredHistory = useMemo(() => {
        const now = new Date();
        if (timeFilter === 'today') {
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            return history.filter(entry => new Date(entry.timestamp) >= startOfToday);
        }
        if (timeFilter === 'mtd') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return history.filter(entry => new Date(entry.timestamp) >= startOfMonth);
        }
        return history;
    }, [history, timeFilter]);

    const dashboardStats = useMemo(() => {
        const totalAudits = filteredHistory.length;
        if (totalAudits === 0) {
            return {
                totalAudits: 0,
                avgScore: 0,
                totalAnalysisTime: 0,
                agentPerformance: [],
                auditorPerformance: [],
                teamParamPerformance: [],
                coachingAlerts: [],
            };
        }

        const totalScore = filteredHistory.reduce((acc, curr) => acc + (curr.analysis.overallScore?.score ?? 0), 0);
        const totalAnalysisTime = filteredHistory.reduce((acc, curr) => acc + (curr.analysis.analysisDuration || 0), 0);
        const avgScore = totalScore / totalAudits;

        const agentData: { [email: string]: { totalScore: number; count: number; lowScores: { [param: string]: number } } } = {};
        agents.forEach(agent => {
            agentData[agent] = { totalScore: 0, count: 0, lowScores: {} };
        });

        const auditorData: { [name: string]: { count: number, totalAnalysisTime: number } } = {};
        auditors.forEach(auditor => {
            auditorData[auditor] = { count: 0, totalAnalysisTime: 0 };
        });

        const teamParamData: { [param: string]: { totalScore: number; count: number } } = {};

        filteredHistory.forEach(entry => {
            if (agentData[entry.agentEmail]) {
                agentData[entry.agentEmail].totalScore += entry.analysis.overallScore?.score ?? 0;
                agentData[entry.agentEmail].count++;
                entry.analysis.detailedScores?.forEach(param => {
                    if (param.score <= LOW_SCORE_THRESHOLD) {
                        agentData[entry.agentEmail].lowScores[param.parameter] = (agentData[entry.agentEmail].lowScores[param.parameter] || 0) + 1;
                    }
                });
            }
            if (auditorData[entry.auditorName]) {
                auditorData[entry.auditorName].count++;
                auditorData[entry.auditorName].totalAnalysisTime += entry.analysis.analysisDuration || 0;
            }
            entry.analysis.detailedScores?.forEach(param => {
                if (!teamParamData[param.parameter]) {
                    teamParamData[param.parameter] = { totalScore: 0, count: 0 };
                }
                teamParamData[param.parameter].totalScore += param.score;
                teamParamData[param.parameter].count++;
            });
        });

        const agentPerformance = Object.entries(agentData)
            .map(([email, data]) => ({
                email,
                avgScore: data.count > 0 ? data.totalScore / data.count : 0,
                auditCount: data.count,
                topProblem: Object.entries(data.lowScores).sort((a, b) => b[1] - a[1])[0] || null
            }))
            .sort((a, b) => b.auditCount - a.auditCount);
            
        const auditorPerformance = Object.entries(auditorData)
            .map(([name, data]) => ({
                name,
                auditCount: data.count,
                avgAnalysisTime: data.count > 0 ? data.totalAnalysisTime / data.count : 0
            }))
            .sort((a,b) => b.auditCount - a.auditCount);

        const teamParamPerformance = Object.entries(teamParamData)
            .map(([name, data]) => ({
                name,
                average: data.count > 0 ? data.totalScore / data.count : 0,
            }))
            .sort((a, b) => a.average - b.average);
        
        const coachingAlerts = agentPerformance
            .filter(agent => agent.auditCount >= 3 && agent.topProblem && agent.topProblem[1] >= 2) // At least 3 audits, and at least 2 low scores on the top problem
            .map(agent => ({
                agentEmail: agent.email,
                parameter: agent.topProblem![0],
                avgScore: agent.avgScore,
                id: `${agent.email}-${agent.topProblem![0]}`
            }));


        return { totalAudits, avgScore, totalAnalysisTime, agentPerformance, auditorPerformance, teamParamPerformance, coachingAlerts };
    }, [filteredHistory, agents, auditors]);
    
    const [teamParam, setTeamParam] = useState<string>('all');
    const teamAvgScore = useMemo(() => {
        if (teamParam === 'all') return dashboardStats.avgScore;
        const param = dashboardStats.teamParamPerformance.find(p => p.name === teamParam);
        return param ? param.average : 0;
    }, [teamParam, dashboardStats]);

    const complianceAlerts = useMemo(() => {
        return history.filter(entry => 
            entry.analysis.propertiesDiscussed?.some(p => 
                p.siteVisitScheduled.rescheduleRedFlag || p.siteVisitScheduled.virtualVisitOffered
            )
        ).slice(0, 5); // Show latest 5
    }, [history]);

    const visibleComplianceAlerts = complianceAlerts.filter(entry => !dismissedAlerts.includes(`compliance-${entry.id}`));
    const visibleCoachingAlerts = dashboardStats.coachingAlerts.filter(alert => !dismissedAlerts.includes(alert.id));
    const areAlertsVisible = visibleComplianceAlerts.length > 0 || visibleCoachingAlerts.length > 0;

    const handleDismissAll = () => {
        const complianceIds = visibleComplianceAlerts.map(entry => `compliance-${entry.id}`);
        const coachingIds = visibleCoachingAlerts.map(alert => alert.id);
        const allCurrentAlertIds = new Set([...complianceIds, ...coachingIds]);
        const newDismissedAlerts = new Set([...dismissedAlerts, ...allCurrentAlertIds]);
        setDismissedAlerts(Array.from(newDismissedAlerts));
    };
    
    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Performance Dashboard</h1>
                <div className="p-1 bg-slate-200 dark:bg-slate-800 rounded-lg inline-flex items-center gap-1 self-start">
                    <button onClick={() => setTimeFilter('all')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${timeFilter === 'all' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'}`}>All Time</button>
                    <button onClick={() => setTimeFilter('mtd')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${timeFilter === 'mtd' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'}`}>Month-to-Date</button>
                    <button onClick={() => setTimeFilter('today')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${timeFilter === 'today' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'}`}>Today</button>
                </div>
            </div>

            {areAlertsVisible && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 relative space-y-4 animate-fade-in">
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                             <path fillRule="evenodd" d="M18 8a6 6 0 11-12 0 6 6 0 0112 0zM8.94 6.94a.75.75 0 11-1.06-1.061l2.5-2.5a.75.75 0 011.06 0l2.5 2.5a.75.75 0 11-1.06 1.06L12 5.688V9.75a.75.75 0 01-1.5 0V5.688L8.94 6.94z" clipRule="evenodd" />
                             <path d="M11.882 12.34a.75.75 0 01.786.033l4 3a.75.75 0 01-1.004 1.118l-3.51-2.633a.75.75 0 01-.26-1.518z" />
                           </svg>
                            Notifications
                        </h3>
                        <button 
                            onClick={handleDismissAll} 
                            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 text-xs font-semibold"
                            aria-label="Dismiss all notifications"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            Dismiss All
                        </button>
                    </div>
                    
                    {visibleComplianceAlerts.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-500/30 rounded-lg p-4">
                            <h4 className="font-bold text-red-800 dark:text-red-300 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                High-Priority Compliance Alerts
                            </h4>
                            <div className="mt-3 space-y-2">
                                {visibleComplianceAlerts.map(entry => {
                                    const flags = entry.analysis.propertiesDiscussed?.flatMap(p => {
                                        const f = [];
                                        if (p.siteVisitScheduled.rescheduleRedFlag) f.push("Proactive Reschedule");
                                        if (p.siteVisitScheduled.virtualVisitOffered) f.push("Virtual Visit Offered");
                                        return f;
                                    }) ?? [];
                                    return (
                                        <div key={entry.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-700/50 p-3 rounded-md border border-red-200 dark:border-red-500/20">
                                            <div className="flex-grow">
                                                <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{entry.agentEmail}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    <span className="font-medium text-red-600 dark:text-red-400">{flags.join(', ')}</span> on {new Date(entry.timestamp).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 sm:mt-0 flex-shrink-0 self-end sm:self-center">
                                                <button onClick={() => onViewDetails(entry)} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">View Report</button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                    
                    {visibleCoachingAlerts.length > 0 && (
                         <div className="bg-orange-50 dark:bg-orange-900/50 border border-orange-200 dark:border-orange-500/30 rounded-lg p-4">
                             <h4 className="font-bold text-orange-800 dark:text-orange-300 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 2a6 6 0 00-6 6c0 1.887.668 3.632 1.756 4.994l-1.33 4.01A1 1 0 005.82 18.42l4.01-1.33A5.96 5.96 0 0010 17.5a6 6 0 006-6c0-3.309-2.691-6-6-6zM9 13a1 1 0 112 0v-1a1 1 0 11-2 0v1zm1-5a1 1 0 01-1-1V5a1 1 0 112 0v2a1 1 0 01-1 1z" />
                                </svg>
                                Coaching Opportunities
                            </h4>
                             <div className="mt-3 space-y-2">
                                {visibleCoachingAlerts.map(alert => (
                                    <div key={alert.id} className="bg-white dark:bg-slate-700/50 p-3 rounded-md border border-orange-200 dark:border-orange-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <p className="text-sm text-orange-800 dark:text-orange-300 flex-grow">
                                            Agent <span className="font-semibold">{alert.agentEmail}</span> is consistently scoring low on <span className="font-semibold">"{alert.parameter}"</span>.
                                        </p>
                                        <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0 self-end sm:self-center">
                                            <button onClick={() => onCustomizeCoaching(alert.agentEmail, alert.parameter)} className="text-sm font-semibold bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 text-slate-700 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-500 px-3 py-1.5 rounded-md w-full sm:w-auto">Customize Coaching</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                         </div>
                    )}
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Audits" value={dashboardStats.totalAudits} />
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-5">
                    <div className="flex justify-between items-baseline mb-1">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Team Average Score</p>
                        <select 
                            value={teamParam} 
                            onChange={e => setTeamParam(e.target.value)} 
                            className="text-xs border-none bg-slate-100 dark:bg-slate-700 dark:text-slate-200 rounded"
                        >
                            <option value="all">Overall</option>
                            {dashboardStats.teamParamPerformance.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                        </select>
                    </div>
                    <p className={`text-3xl font-bold text-center ${getScoreTextColor(teamAvgScore)}`}>{teamAvgScore.toFixed(1)}</p>
                </div>
                <StatCard title="Total Analysis Time" value={formatSecondsToHHMMSS(dashboardStats.totalAnalysisTime)} subValue="HH:MM:SS" />
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-5">
                    <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-2">Team Excellence</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Let the AI review high-scoring calls to find the best training example.</p>
                    <button
                        onClick={onFindCallOfTheWeek}
                        className="w-full bg-amber-400 text-amber-900 font-semibold py-2 px-3 rounded-lg hover:bg-amber-500 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.28 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        Find Call of the Week
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 p-4 border-b dark:border-slate-700">Agent Performance</h3>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[60vh] overflow-y-auto">
                        {dashboardStats.agentPerformance.map(agent => (
                            <div key={agent.email} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <div className="flex justify-between items-center">
                                    <p className="font-bold text-slate-700 dark:text-slate-200 truncate pr-2" title={agent.email}>{agent.email}</p>
                                    <p className={`font-bold text-lg ${getScoreTextColor(agent.avgScore)}`}>{agent.auditCount > 0 ? agent.avgScore.toFixed(1) : 'N/A'}</p>
                                </div>
                                <div className="flex justify-between items-end mt-2">
                                    <div>
                                        <p className="text-xs text-slate-400 dark:text-slate-500">{agent.auditCount} Audits</p>
                                        {agent.topProblem && <p className="text-xs text-slate-500 dark:text-slate-400">Top Problem: <span className="font-semibold text-red-600 dark:text-red-400">{agent.topProblem[0]}</span></p>}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button onClick={() => onGenerateAgentSummary(agent.email)} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:underline">AI Summary</button>
                                        <button onClick={() => onViewAgentTrend(agent.email)} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">View Trend</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 p-4 border-b dark:border-slate-700">Team Performance</h3>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[60vh] overflow-y-auto">
                           {dashboardStats.teamParamPerformance.map(param => (
                               <div key={param.name} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                   <div className="flex justify-between items-center">
                                        <p className="font-semibold text-slate-600 dark:text-slate-300 text-sm">{param.name}</p>
                                        <p className={`font-bold text-base ${getScoreTextColor(param.average)}`}>{param.average.toFixed(1)}</p>
                                   </div>
                                   {param.average < 5.5 && (
                                       <button
                                         onClick={() => onGenerateRootCauseAnalysis(param.name)}
                                         className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-1"
                                       >
                                         Analyze Root Cause
                                       </button>
                                   )}
                               </div>
                           ))}
                        </div>
                    </div>
                     <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 p-4 border-b dark:border-slate-700">Auditor Activity</h3>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[40vh] overflow-y-auto">
                            {dashboardStats.auditorPerformance.map(auditor => (
                                <div key={auditor.name} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <p className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate" title={auditor.name}>{auditor.name}</p>
                                    <div className="flex justify-between items-center mt-1">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{auditor.auditCount} Audits</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500">Avg Time: {Math.round(auditor.avgAnalysisTime)}s</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;