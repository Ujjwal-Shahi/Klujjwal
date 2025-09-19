import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AnalysisResult, AuditEntry, ScoreParameter, PropertyAnalysis } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

// Helper functions for styling based on score
const getScoreColor = (score: number): string => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    if (score >= 8) return isDarkMode ? '#4ade80' : '#16a34a'; // green-400 / green-600
    if (score >= 5) return isDarkMode ? '#facc15' : '#d97706'; // yellow-400 / amber-600
    return isDarkMode ? '#f87171' : '#dc2626'; // red-400 / red-600
};

const getLikelihoodColor = (score: number): string => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    if (score >= 67) return isDarkMode ? '#4ade80' : '#16a34a'; // green
    if (score >= 34) return isDarkMode ? '#facc15' : '#d97706'; // yellow/amber
    return isDarkMode ? '#f87171' : '#dc2626'; // red
};


const getScoreTextColorClass = (score: number): string => {
    if (score >= 8) return 'text-green-600 dark:text-green-400';
    if (score >= 5) return 'text-amber-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
};

const getScoreBgColorClass = (score: number): string => {
    if (score >= 8) return 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-300';
    if (score >= 5) return 'bg-amber-100 dark:bg-yellow-500/10 text-amber-700 dark:text-yellow-300';
    return 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-300';
};

const getScoreBorderColorClass = (score: number): string => {
    if (score >= 8) return 'border-green-200 dark:border-green-500/30';
    if (score >= 5) return 'border-amber-200 dark:border-yellow-500/30';
    return 'border-red-200 dark:border-red-500/30';
}

const formatTimestamp = (seconds: number | null): string => {
    if (seconds === null || isNaN(seconds)) return 'N/A';
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
};

const formatDurationForDisplay = (seconds: number | undefined): string => {
    if (seconds === undefined || isNaN(seconds)) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins > 0) {
        return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
};

const ScoreGauge: React.FC<{ score: number }> = ({ score }) => {
    const size = 120;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 10) * circumference;
    const [gaugeColor, setGaugeColor] = useState(getScoreColor(score));

    useEffect(() => {
        // Update color if theme changes while component is mounted
        const observer = new MutationObserver(() => {
            setGaugeColor(getScoreColor(score));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, [score]);


    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="w-full h-full" viewBox={`0 0 ${size} ${size}`}>
                <circle
                    className="text-slate-200 dark:text-slate-700"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    stroke={gaugeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    style={{
                        strokeDasharray: circumference,
                        strokeDashoffset: circumference - progress,
                        transition: 'stroke-dashoffset 0.5s ease-out, stroke 0.3s ease-in-out',
                        transform: 'rotate(-90deg)',
                        transformOrigin: '50% 50%'
                    }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-extrabold ${getScoreTextColorClass(score)}`}>{score}</span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 -mt-1">/ 10</span>
            </div>
        </div>
    );
};

const LikelihoodGauge: React.FC<{ score: number }> = ({ score }) => {
    const size = 160;
    const strokeWidth = 14;
    const radius = (size / 2) - strokeWidth;
    const circumference = Math.PI * radius; // Semi-circle
    const progress = (score / 100) * circumference;
    const [gaugeColor, setGaugeColor] = useState(getLikelihoodColor(score));

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setGaugeColor(getLikelihoodColor(score));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, [score]);

    return (
        <div className="relative flex flex-col items-center">
            <svg width={size} height={size / 2 + strokeWidth} viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`} className="overflow-visible">
                <path
                    d={`M ${strokeWidth},${size / 2} a ${radius},${radius} 0 0 1 ${radius * 2},0`}
                    className="text-slate-200 dark:text-slate-700"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                />
                <path
                    d={`M ${strokeWidth},${size / 2} a ${radius},${radius} 0 0 1 ${radius * 2},0`}
                    stroke={gaugeColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    style={{
                        strokeDasharray: circumference,
                        strokeDashoffset: circumference - progress,
                        transition: 'stroke-dashoffset 0.5s ease-out, stroke 0.3s ease-in-out',
                    }}
                />
            </svg>
            <div className="absolute bottom-0 flex flex-col items-center">
                <span className="text-3xl font-extrabold" style={{ color: gaugeColor }}>{score}%</span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 -mt-1">Likelihood</span>
            </div>
        </div>
    );
};


const PerformanceBreakdown: React.FC<{ scores: ScoreParameter[], teamAverages?: Record<string, number> }> = ({ scores, teamAverages }) => {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const toggleExpand = (parameter: string) => {
        setExpanded(prev => ({ ...prev, [parameter]: !prev[parameter] }));
    };

    return (
        <div className="space-y-4">
            {scores.map(item => {
                const teamAvg = teamAverages?.[item.parameter];
                const isExpanded = expanded[item.parameter];
                return (
                    <div key={item.parameter} className={`p-3 rounded-lg transition-colors ${isExpanded ? 'bg-slate-100 dark:bg-slate-700/50' : ''}`}>
                        <div 
                            className="flex items-center justify-between cursor-pointer" 
                            onClick={() => toggleExpand(item.parameter)}
                            aria-expanded={isExpanded}
                            aria-controls={`justification-${item.parameter}`}
                        >
                            <p className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{item.parameter}</p>
                            <div className="flex items-center gap-4 w-1/2 md:w-1/3">
                                <div className="flex-grow bg-slate-200 dark:bg-slate-700 rounded-full h-3 relative">
                                    <div 
                                        className="absolute top-0 left-0 h-3 rounded-full"
                                        style={{ width: `${item.score * 10}%`, backgroundColor: getScoreColor(item.score), transition: 'width 0.5s' }}
                                    ></div>
                                    {teamAvg !== undefined && (
                                        <div 
                                            className="absolute top-0 h-full w-1 bg-slate-500 dark:bg-slate-400 rounded-full -translate-y-1/3"
                                            style={{ left: `calc(${teamAvg * 10}% - 2px)`, height: '150%'}}
                                            title={`Team Average: ${teamAvg.toFixed(1)}`}
                                        ></div>
                                    )}
                                </div>
                                <div className={`px-2 py-0.5 text-xs font-bold rounded-full ${getScoreBgColorClass(item.score)}`}>
                                    {item.score}/10
                                </div>
                            </div>
                        </div>
                        {isExpanded && (
                            <p id={`justification-${item.parameter}`} className="text-xs text-slate-500 dark:text-slate-400 mt-2 pl-2 border-l-2 border-slate-300 dark:border-slate-600 animate-fade-in-fast">
                                {item.justification}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

interface PropertyAnalysisCardProps {
    property: PropertyAnalysis;
    propertyIndex: number;
    onPlayPause: (timestamp: number | null, eventKey: string) => void;
    isPlaying: boolean;
    activeTimelineEvent: string | null;
    audioAvailable: boolean;
}

const StatusIcon: React.FC<{ status: 'success' | 'partial' | 'fail' }> = ({ status }) => {
    if (status === 'success') {
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
    }
    if (status === 'partial') {
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-5a1 1 0 102 0v-4a1 1 0 10-2 0v4zm1-8a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" /></svg>;
    }
    // fail
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>;
};

const ChecklistItem: React.FC<{
    status: 'success' | 'partial' | 'fail';
    children: React.ReactNode;
}> = ({ status, children }) => {
    return (
        <div className="flex items-start text-sm">
            <StatusIcon status={status} />
            <div>{children}</div>
        </div>
    );
};


const PropertyAnalysisCard: React.FC<PropertyAnalysisCardProps> = ({ property, propertyIndex, onPlayPause, isPlaying, activeTimelineEvent, audioAvailable }) => {
    const hasRedFlag = property.siteVisitScheduled?.rescheduleRedFlag || property.siteVisitScheduled?.virtualVisitOffered;
    const isMentioned = (detail: {value: string, mentioned: boolean}) => detail.value.toLowerCase() !== 'not mentioned' && detail.mentioned;
    
    const timelineEntries = Object.entries(property.timelineEvents || {})
        .map(([key, value]) => ({
            name: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            time: value,
            key: `${key}-${propertyIndex}`
        }))
        .filter(entry => entry.time !== null && typeof entry.time === 'number');

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 mt-4 first:mt-0 shadow-sm">
             {hasRedFlag && (
                <div className="p-3 mb-4 bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 rounded-r-lg text-sm">
                    <h5 className="font-bold text-red-800 dark:text-red-300 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Compliance Alert
                    </h5>
                     <ul className="list-disc pl-5 mt-2 text-red-700 dark:text-red-300 space-y-1">
                        {property.siteVisitScheduled?.rescheduleRedFlag && (
                            <li>
                                <strong>Proactive Reschedule:</strong> {property.siteVisitScheduled?.redFlagReason ? `Reason: "${property.siteVisitScheduled.redFlagReason}"` : 'Agent suggested rescheduling.'}
                            </li>
                        )}
                        {property.siteVisitScheduled?.virtualVisitOffered && (
                            <li><strong>Prohibited Action:</strong> Agent offered a virtual visit.</li>
                        )}
                    </ul>
                </div>
            )}
            <h4 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-4">{property.propertyIdentifier}</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                    <h5 className="font-semibold text-slate-600 dark:text-slate-300 text-sm mb-2">Mandatory Details Checklist</h5>
                    <ul className="space-y-1.5 text-sm">
                        {property.details?.map(d => (
                            <li key={d.detail} className="flex items-start">
                                {isMentioned(d) ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                )}
                                <div>
                                    <span className="font-semibold">{d.detail}:</span>
                                    <span className="ml-2 text-slate-600 dark:text-slate-300">{d.value}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="space-y-4">
                    <div>
                         <h5 className="font-semibold text-slate-600 dark:text-slate-300 text-sm mb-2">Key Information & Checks</h5>
                         <div className="space-y-3">
                            <ChecklistItem
                                status={
                                    property.detailsSharedConfirmation?.method === 'Full (WhatsApp, Email, SMS)' ? 'success' :
                                    property.detailsSharedConfirmation?.method === 'Partial' ? 'partial' : 'fail'
                                }
                            >
                                 <p className="font-semibold text-slate-700 dark:text-slate-200">Details Shared via Email, SMS, WhatsApp</p>
                                 <p className="text-xs text-slate-500 dark:text-slate-400">{property.detailsSharedConfirmation?.method ?? 'Not Mentioned'}</p>
                            </ChecklistItem>
                             
                            {property.siteVisitScheduled?.mentioned && (
                                <div className="text-sm">
                                    <p><strong className="font-semibold text-slate-700 dark:text-slate-200">Site Visit:</strong> {property.siteVisitScheduled.status}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 pl-4">{property.siteVisitScheduled.slotConfirmation}</p>
                                </div>
                            )}

                             {property.siteVisitScheduled?.status === 'Scheduled' && property.siteVisitScheduled.visitConductedBy && (
                                <div className="pl-5 border-l-2 border-slate-200 dark:border-slate-700 space-y-2 py-1">
                                    <ChecklistItem status={'success'}>
                                        <p className="font-semibold text-slate-700 dark:text-slate-200">Visit Conducted by: {property.siteVisitScheduled.visitConductedBy.person}</p>
                                    </ChecklistItem>
                                    {property.siteVisitScheduled.visitConductedBy.person === 'FRM' && (
                                        <>
                                            <ChecklistItem status={property.siteVisitScheduled.visitConductedBy.frmDetailsProvided ? 'success' : 'fail'}>
                                                 <p className="font-semibold text-slate-700 dark:text-slate-200">FRM Name & Number Provided</p>
                                            </ChecklistItem>
                                             <ChecklistItem status={property.siteVisitScheduled.visitConductedBy.preVisitCallInstructionGiven ? 'success' : 'fail'}>
                                                 <p className="font-semibold text-slate-700 dark:text-slate-200">1hr Pre-visit Call Instructed</p>
                                            </ChecklistItem>
                                        </>
                                    )}
                                </div>
                            )}

                            {property.rebuttalHandling?.summary && (
                                <p className="text-sm"><strong className="font-semibold text-slate-700 dark:text-slate-200">Rebuttal Handling:</strong> {property.rebuttalHandling.summary}</p>
                            )}
                            {property.siteVisitScheduled?.urgencyCreation?.summary && (
                                <p className="text-sm"><strong className="font-semibold text-slate-700 dark:text-slate-200">Urgency Creation:</strong> {property.siteVisitScheduled.urgencyCreation.summary}</p>
                            )}
                         </div>
                    </div>
                     {audioAvailable && timelineEntries.length > 0 && (
                        <div>
                            <h5 className="font-semibold text-slate-600 dark:text-slate-300 text-sm mb-2">Timeline of Key Events</h5>
                            <ul className="space-y-2">
                                {timelineEntries.map(event => {
                                    const isCurrentlyPlaying = isPlaying && activeTimelineEvent === event.key;
                                    return (
                                        <li key={event.key} className="flex items-center justify-between text-sm">
                                            <span className="text-slate-700 dark:text-slate-300">{event.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-500 dark:text-slate-300 font-mono text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                                                    {formatTimestamp(event.time)}
                                                </span>
                                                <button 
                                                    onClick={() => onPlayPause(event.time, event.key)}
                                                    className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
                                                    aria-label={isCurrentlyPlaying ? `Pause from ${event.name}` : `Play from ${event.name}`}
                                                >
                                                    {isCurrentlyPlaying ? (
                                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 00-1 1v2a1 1 0 102 0V9a1 1 0 00-1-1zm5 0a1 1 0 00-1 1v2a1 1 0 102 0V9a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                                    ) : (
                                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                                    )}
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const SectionCard: React.FC<{ title: string; icon: JSX.Element; children: React.ReactNode; id?:string }> = ({ title, icon, children, id }) => (
    <div id={id} className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
            <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">{icon}</div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h3>
        </div>
        <div className="p-4 md:p-6">
            {children}
        </div>
    </div>
);

interface AnalysisDisplayProps {
  result: AnalysisResult;
  auditEntry?: AuditEntry;
  onNominate?: (id: number) => void;
  teamAverageScores?: Record<string, number>;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ result, auditEntry, onNominate, teamAverageScores }) => {
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const reportContentRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeTimelineEvent, setActiveTimelineEvent] = useState<string | null>(null);

    const audioSrc = useMemo(() => {
        if (auditEntry?.audioData && auditEntry.audioMimeType) {
            return `data:${auditEntry.audioMimeType};base64,${auditEntry.audioData}`;
        }
        return null;
    }, [auditEntry]);

    const handlePlayPause = (timestamp: number | null, eventKey: string) => {
        if (!audioRef.current || timestamp === null) return;
        
        if (isPlaying && activeTimelineEvent === eventKey) {
            audioRef.current.pause();
            setIsPlaying(false);
            setActiveTimelineEvent(null);
        } else {
            audioRef.current.currentTime = timestamp;
            audioRef.current.play();
            setIsPlaying(true);
            setActiveTimelineEvent(eventKey);
        }
    };

    useEffect(() => {
        const audioElement = audioRef.current;
        if (!audioElement) return;

        const handleEnded = () => {
            setIsPlaying(false);
            setActiveTimelineEvent(null);
        };

        audioElement.addEventListener('ended', handleEnded);
        return () => {
            audioElement.removeEventListener('ended', handleEnded);
        };
    }, []);
    
    const handleDownloadPdf = async () => {
        setIsGeneratingPdf(true);
        const reportElement = reportContentRef.current;
        if (!reportElement) {
            console.error("Report element not found");
            setIsGeneratingPdf(false);
            return;
        }

        try {
            const doc = new jsPDF('p', 'pt', 'a4');
            const PADDING = 40;
            const PAGE_WIDTH = doc.internal.pageSize.getWidth();
            const CONTENT_WIDTH = PAGE_WIDTH - PADDING * 2;
            let yPos = PADDING;

            // Header Text
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text('Call Analysis Report', PAGE_WIDTH / 2, yPos, { align: 'center' });
            yPos += 30;

            // Audit Details Table
            autoTable(doc, {
                startY: yPos,
                body: [
                    ['Agent:', result.agentName !== 'Not Mentioned' ? result.agentName : (auditEntry?.agentEmail || 'N/A'), 'Language:', result.detectedLanguages || 'N/A'],
                    ['Buyer User ID:', auditEntry?.buyerUserId || 'N/A', 'Call Duration:', formatDurationForDisplay(result.callDuration)],
                    ['Call Timestamp:', auditEntry?.callStamp || 'N/A', 'Analysis Duration:', formatDurationForDisplay(result.analysisDuration)],
                    ['Auditor:', auditEntry?.auditorName || 'N/A', 'Analyzed On:', auditEntry ? new Date(auditEntry.timestamp).toLocaleString() : 'N/A'],
                ],
                theme: 'plain', styles: { fontSize: 9, cellPadding: 2 },
                columnStyles: { 0: { fontStyle: 'bold' }, 2: { fontStyle: 'bold' } },
            });
            yPos = (doc as any).lastAutoTable.finalY + 20;

            // --- Capture Visual Sections as Images ---
            const sectionsToCapture = [
                { id: 'pdf-header-section', title: 'Overall Performance' },
                { id: 'pdf-performance-breakdown', title: 'Performance Breakdown' },
                { id: 'pdf-key-moments', title: 'Key Moments & Coaching' },
                { id: 'pdf-dynamics-predictions', title: 'Call Dynamics & Predictions' },
            ];

            for (const section of sectionsToCapture) {
                const element = reportElement.querySelector<HTMLElement>(`#${section.id}`);
                if (element) {
                    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
                    const imgData = canvas.toDataURL('image/png');
                    const imgProps = doc.getImageProperties(imgData);
                    const imgHeight = (imgProps.height * CONTENT_WIDTH) / imgProps.width;

                    if (yPos + imgHeight + 20 > doc.internal.pageSize.getHeight() - PADDING) {
                        doc.addPage();
                        yPos = PADDING;
                    }

                    doc.setFontSize(16);
                    doc.setFont('helvetica', 'bold');
                    doc.text(section.title, PADDING, yPos);
                    yPos += 20;

                    doc.addImage(imgData, 'PNG', PADDING, yPos, CONTENT_WIDTH, imgHeight);
                    yPos += imgHeight + 20;
                }
            }

            // --- Properties Discussed (as tables) ---
            if (result.propertiesDiscussed?.length) {
                doc.addPage();
                yPos = PADDING;
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text('Properties Discussed', PADDING, yPos);
                yPos += 20;

                result.propertiesDiscussed.forEach(prop => {
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text(prop.propertyIdentifier, PADDING, yPos);
                    yPos += 15;
                    
                    autoTable(doc, {
                        startY: yPos,
                        head: [['Detail', 'Mentioned', 'Value']],
                        body: prop.details.map(d => [d.detail, d.mentioned ? '✅' : '❌', d.value]),
                        theme: 'grid',
                        headStyles: { fillColor: [44, 62, 80] },
                    });
                    yPos = (doc as any).lastAutoTable.finalY + 15;
                });
            }

            // Page Numbers
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - PADDING, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
            }

            doc.save(`Call_Analysis_${auditEntry?.agentEmail}_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error("Failed to generate PDF:", error);
            alert("An error occurred while generating the PDF.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };
    
    if (!result) return null;
    const overallScore = result.overallScore?.score ?? 0;

    const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
        <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="font-medium text-slate-800 dark:text-slate-100">{value || 'N/A'}</p>
        </div>
    );

    return (
        <div ref={reportContentRef} className="animate-fade-in space-y-6">
            {audioSrc && <audio ref={audioRef} src={audioSrc} className="hidden" />}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Call Analysis Report</h2>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                     <button 
                        onClick={handleDownloadPdf}
                        disabled={isGeneratingPdf}
                        className="w-full md:w-auto bg-slate-600 dark:bg-slate-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition flex items-center justify-center gap-2 disabled:bg-slate-400 dark:disabled:bg-slate-600"
                    >
                         {isGeneratingPdf ? (
                           <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                         ) : (
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                         )}
                        {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
                    </button>
                    {auditEntry && onNominate && overallScore >= 9 && !auditEntry.nominated && (
                        <button onClick={() => onNominate(auditEntry.id)} className="w-full md:w-auto bg-amber-400 text-amber-900 font-semibold py-2 px-4 rounded-lg hover:bg-amber-500 transition flex items-center justify-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.28 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            Nominate
                        </button>
                    )}
                    {auditEntry?.nominated && (
                        <p className="w-full md:w-auto text-center font-semibold text-amber-700 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-300 py-2 px-4 rounded-lg flex items-center justify-center gap-2">
                            ⭐ Nominated
                        </p>
                    )}
                </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                    <DetailItem label="Agent" value={result.agentName !== 'Not Mentioned' ? result.agentName : (auditEntry?.agentEmail || 'N/A')} />
                    <DetailItem label="Buyer User ID" value={auditEntry?.buyerUserId || 'N/A'} />
                    <DetailItem label="Call Timestamp" value={auditEntry?.callStamp || 'N/A'} />
                    <DetailItem label="Detected Language" value={result.detectedLanguages || 'N/A'} />
                    <DetailItem label="Call Duration" value={formatDurationForDisplay(result.callDuration)} />
                    <DetailItem label="Analysis Duration" value={formatDurationForDisplay(result.analysisDuration)} />
                </div>
            </div>
            
            <div id="pdf-header-section" className={`p-6 rounded-xl bg-white dark:bg-slate-800 border ${getScoreBorderColorClass(overallScore)}`}>
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-shrink-0">
                       <ScoreGauge score={overallScore} />
                    </div>
                    <div className="md:pl-6 w-full text-center md:text-left">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">AI Performance Summary</h3>
                        <p className="text-slate-700 dark:text-slate-300 mt-1 text-sm">{result.overallScore?.summary ?? 'No summary available.'}</p>
                    </div>
                </div>
            </div>

            <SectionCard id="pdf-performance-breakdown" title="Performance Breakdown" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>}>
                 <PerformanceBreakdown scores={result.detailedScores ?? []} teamAverages={teamAverageScores} />
            </SectionCard>
            
            <SectionCard id="pdf-key-moments" title="Key Moments & Coaching" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm-.707 10.607a1 1 0 011.414 0l.707-.707a1 1 0 11-1.414-1.414l-.707.707zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" /></svg>}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="border-l-4 border-green-300 dark:border-green-600 pl-4">
                        <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2 text-lg">✅ What Went Well</h4>
                        <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                            {result.callMoments?.positivePoints?.map((point: string, i: number) => <li key={i}>{point}</li>) ?? <li>No positive points identified.</li>}
                        </ul>
                    </div>
                     <div className="border-l-4 border-amber-300 dark:border-yellow-600 pl-4">
                        <h4 className="font-semibold text-amber-800 dark:text-yellow-300 mb-2 text-lg">💡 Areas for Improvement</h4>
                        <div className="space-y-4">
                            {result.callMoments?.areasForImprovement?.map((item: {area: string, coachingTip: string}, i: number) => (
                                <div key={i} className="text-sm">
                                    <p className="font-semibold text-slate-800 dark:text-slate-100 list-item list-disc ml-5">{item.area}</p>
                                    <p className="text-slate-600 dark:text-slate-300 mt-1 pl-5"><strong>Coaching Tip:</strong> {item.coachingTip}</p>
                                </div>
                            )) ?? <li>No areas for improvement identified.</li>}
                        </div>
                    </div>
                </div>
            </SectionCard>

             {(result.propertiesDiscussed?.length ?? 0) > 0 && (
                <SectionCard title="Properties Discussed" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>}>
                    {result.propertiesDiscussed?.map((prop, i) => (
                        <PropertyAnalysisCard 
                            key={i} 
                            property={prop}
                            propertyIndex={i}
                            onPlayPause={handlePlayPause}
                            isPlaying={isPlaying}
                            activeTimelineEvent={activeTimelineEvent}
                            audioAvailable={!!audioSrc}
                        />
                    ))}
                </SectionCard>
            )}

            <SectionCard id="pdf-dynamics-predictions" title="Call Dynamics & Predictions" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>}>
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                    <div className="lg:col-span-1 space-y-6">
                         <div className="space-y-2">
                            <h4 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Energy Level: {result.callDynamics?.energyLevel?.score ?? 'N/A'}/10</h4>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2"><div className="rounded-full h-2" style={{width: `${(result.callDynamics?.energyLevel?.score ?? 0) * 10}%`, backgroundColor: getScoreColor(result.callDynamics?.energyLevel?.score ?? 0)}}></div></div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{result.callDynamics?.energyLevel?.summary ?? 'N/A'}</p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Consultative Score: {result.brokerBehaviorAnalysis?.score ?? 'N/A'}/10</h4>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2"><div className="rounded-full h-2" style={{width: `${(result.brokerBehaviorAnalysis?.score ?? 0) * 10}%`, backgroundColor: getScoreColor(result.brokerBehaviorAnalysis?.score ?? 0)}}></div></div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{result.brokerBehaviorAnalysis?.summary ?? 'N/A'}</p>
                        </div>
                    </div>
                    <div className="lg:col-span-2 flex items-center justify-center">
                         <div className="flex flex-col items-center justify-center text-center">
                            {result.visitLikelihood && typeof result.visitLikelihood.score === 'number' ? (
                                <>
                                    <LikelihoodGauge score={result.visitLikelihood.score} />
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">{result.visitLikelihood.justification}</p>
                                </>
                            ) : (
                                <div className="py-8">
                                     <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 italic">(Visit Likelihood not available for this analysis)</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SectionCard>
        </div>
    );
};

export default AnalysisDisplay;