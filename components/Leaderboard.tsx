import React, { useState, useMemo } from 'react';
import { AuditEntry } from '../types';

interface LeaderboardProps {
  history: AuditEntry[];
}

const getScoreTextColor = (score: number): string => {
  if (score >= 8) return 'text-green-600';
  if (score >= 5) return 'text-yellow-600';
  return 'text-red-600';
};

const podiumColors = [
    'text-amber-400', // Gold
    'text-slate-400', // Silver
    'text-amber-600'  // Bronze
];

const LeaderboardCard: React.FC<{ title: string; data: any[]; renderRow: (item: any, index: number) => JSX.Element }> = ({ title, data, renderRow }) => (
    <div className="bg-white rounded-xl shadow-lg">
        <div className="p-4 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-700">{title}</h3>
        </div>
        <div className="divide-y divide-slate-100">
            {data.length > 0 ? data.map(renderRow) : <p className="p-4 text-sm text-slate-500 text-center">No data for this period.</p>}
        </div>
    </div>
);

const BADGES = {
    topPerformer: { name: 'Top Performer', icon: '🏆', description: 'Highest average score with at least 5 audits.', color: 'text-amber-500' },
    closer: { name: 'The Closer', icon: '🤝', description: 'Most site visits successfully scheduled.', color: 'text-blue-500' },
    rapportMaster: { name: 'Rapport Master', icon: '🎤', description: 'Highest average "Greeting & Opening" score (min 5 audits).', color: 'text-purple-500' },
    marathonAuditor: { name: 'Marathon Auditor', icon: '✍️', description: 'Auditor who has completed the most call analyses.', color: 'text-green-500' }
};


const Leaderboard: React.FC<LeaderboardProps> = ({ history }) => {
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

    const leaderboardStats = useMemo(() => {
        const agentStats: Record<string, { totalScore: number; auditCount: number; nominations: number; }> = {};
        const auditorStats: Record<string, { auditCount: number }> = {};

        filteredHistory.forEach(entry => {
            // Agent Stats
            if (!agentStats[entry.agentEmail]) {
                agentStats[entry.agentEmail] = { totalScore: 0, auditCount: 0, nominations: 0 };
            }
            agentStats[entry.agentEmail].totalScore += entry.analysis.overallScore.score;
            agentStats[entry.agentEmail].auditCount += 1;
            if (entry.nominated) {
                agentStats[entry.agentEmail].nominations += 1;
            }

            // Auditor Stats
            if (!auditorStats[entry.auditorName]) {
                auditorStats[entry.auditorName] = { auditCount: 0 };
            }
            auditorStats[entry.auditorName].auditCount += 1;
        });

        const topPerformers = Object.entries(agentStats)
            .map(([agentEmail, data]) => ({
                agentEmail,
                avgScore: data.auditCount > 0 ? data.totalScore / data.auditCount : 0,
                auditCount: data.auditCount
            }))
            .filter(a => a.auditCount > 0)
            .sort((a, b) => b.avgScore - a.avgScore)
            .slice(0, 10);
        
        const excellenceAwards = Object.entries(agentStats)
            .map(([agentEmail, data]) => ({
                agentEmail,
                nominations: data.nominations,
            }))
            .filter(a => a.nominations > 0)
            .sort((a, b) => b.nominations - a.nominations)
            .slice(0, 10);
            
        const activeAuditors = Object.entries(auditorStats)
            .map(([auditorEmail, data]) => ({
                auditorEmail,
                auditCount: data.auditCount
            }))
            .sort((a,b) => b.auditCount - a.auditCount)
            .slice(0, 10);
        
        // Badge Calculations
        const closerCounts = Object.entries(agentStats).map(([agentEmail]) => {
            const scheduledVisits = filteredHistory
                .filter(h => h.agentEmail === agentEmail)
                .reduce((count, h) => {
                    const scheduled = h.analysis.propertiesDiscussed.some(p => p.siteVisitScheduled.status === 'Scheduled');
                    return count + (scheduled ? 1 : 0);
                }, 0);
            return { agentEmail, count: scheduledVisits };
        }).sort((a,b) => b.count - a.count);

        const rapportMasters = Object.entries(agentStats)
            .filter(([, data]) => data.auditCount >= 5)
            .map(([agentEmail]) => {
                const rapportScores = filteredHistory
                    .filter(h => h.agentEmail === agentEmail)
                    .map(h => h.analysis.detailedScores.find(p => p.parameter === 'Greeting & Opening')?.score ?? 0);
                const avgRapportScore = rapportScores.reduce((a, b) => a + b, 0) / rapportScores.length;
                return { agentEmail, avgRapportScore };
            })
            .filter(a => a.avgRapportScore >= 8.5)
            .sort((a, b) => b.avgRapportScore - a.avgRapportScore);

        const badgeHolders = {
            topPerformer: topPerformers.length > 0 && topPerformers[0].auditCount >= 5 ? topPerformers[0].agentEmail : null,
            closer: closerCounts.length > 0 && closerCounts[0].count > 0 ? closerCounts[0].agentEmail : null,
            rapportMaster: rapportMasters.length > 0 ? rapportMasters[0].agentEmail : null,
            marathonAuditor: activeAuditors.length > 0 ? activeAuditors[0].auditorEmail : null
        };

        return { topPerformers, excellenceAwards, activeAuditors, badgeHolders };

    }, [filteredHistory]);

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-800">Leaderboard</h1>
                <div className="p-1 bg-slate-200 rounded-lg inline-flex items-center gap-1 self-start">
                    <button onClick={() => setTimeFilter('all')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${timeFilter === 'all' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-800'}`}>All Time</button>
                    <button onClick={() => setTimeFilter('mtd')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${timeFilter === 'mtd' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-800'}`}>Month-to-Date</button>
                    <button onClick={() => setTimeFilter('today')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${timeFilter === 'today' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-800'}`}>Today</button>
                </div>
            </div>

             <div className="bg-white rounded-xl shadow-lg p-5">
                <h2 className="text-xl font-bold text-slate-700 mb-4">Achievements & Badges</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(BADGES).map(([key, badge]) => {
                        const holder = leaderboardStats.badgeHolders[key as keyof typeof leaderboardStats.badgeHolders];
                        return (
                             <div key={key} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <p className="text-4xl">{badge.icon}</p>
                                <p className="font-bold mt-2 text-slate-800">{badge.name}</p>
                                <p className="text-xs text-slate-500 mt-1">{badge.description}</p>
                                <div className="mt-4 pt-3 border-t border-slate-200">
                                     <p className="text-xs text-slate-400 font-semibold">CURRENT HOLDER</p>
                                     <p className={`font-semibold truncate ${badge.color}`}>{holder || 'None'}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
             </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <LeaderboardCard
                    title="Top Performers (Avg Score)"
                    data={leaderboardStats.topPerformers}
                    renderRow={(item, index) => (
                        <div key={item.agentEmail} className="flex items-center justify-between p-3 hover:bg-slate-50">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-500 w-6 text-center">{index + 1}</span>
                                <div className="truncate">
                                    <p className="font-semibold text-slate-700 truncate" title={item.agentEmail}>{item.agentEmail}</p>
                                    <div className="flex items-center gap-1.5">
                                      {item.agentEmail === leaderboardStats.badgeHolders.topPerformer && <span title={BADGES.topPerformer.name}>{BADGES.topPerformer.icon}</span>}
                                      {item.agentEmail === leaderboardStats.badgeHolders.closer && <span title={BADGES.closer.name}>{BADGES.closer.icon}</span>}
                                      {item.agentEmail === leaderboardStats.badgeHolders.rapportMaster && <span title={BADGES.rapportMaster.name}>{BADGES.rapportMaster.icon}</span>}
                                    </div>
                                </div>
                                {index < 3 && <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${podiumColors[index]}`} viewBox="0 0 20 20" fill="currentColor"><path d="M11.34 3.34A1 1 0 0010 2.535V2a1 1 0 10-2 0v.535a1 1 0 00-.34.805L6.5 8.5H5a1 1 0 00-1 1v2.5a.5.5 0 00.5.5h10a.5.5 0 00.5-.5V9.5a1 1 0 00-1-1h-1.5l-1.16-5.195zM8 14a1 1 0 100 2h4a1 1 0 100-2H8z" /></svg>}
                            </div>
                             <div className="text-right flex-shrink-0">
                                <p className={`font-bold text-lg ${getScoreTextColor(item.avgScore)}`}>{item.avgScore.toFixed(1)}</p>
                                <p className="text-xs text-slate-400">{item.auditCount} audits</p>
                            </div>
                        </div>
                    )}
                />

                <LeaderboardCard
                    title="⭐ Excellence Awards (Nominations)"
                    data={leaderboardStats.excellenceAwards}
                    renderRow={(item, index) => (
                        <div key={item.agentEmail} className="flex items-center justify-between p-3 hover:bg-slate-50">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-500 w-6 text-center">{index + 1}</span>
                                <span className="font-semibold text-slate-700 truncate" title={item.agentEmail}>{item.agentEmail}</span>
                            </div>
                            <span className="font-bold text-lg text-blue-600">{item.nominations}</span>
                        </div>
                    )}
                />
                
                <LeaderboardCard
                    title="Most Active Auditors"
                    data={leaderboardStats.activeAuditors}
                    renderRow={(item, index) => (
                        <div key={item.auditorEmail} className="flex items-center justify-between p-3 hover:bg-slate-50">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-500 w-6 text-center">{index + 1}</span>
                                <div>
                                    <p className="font-semibold text-slate-700 truncate" title={item.auditorEmail}>{item.auditorEmail}</p>
                                     {item.auditorEmail === leaderboardStats.badgeHolders.marathonAuditor && <span title={BADGES.marathonAuditor.name}>{BADGES.marathonAuditor.icon}</span>}
                                </div>
                            </div>
                            <span className="font-bold text-lg text-slate-600">{item.auditCount}</span>
                        </div>
                    )}
                />
            </div>
        </div>
    );
};

export default Leaderboard;
