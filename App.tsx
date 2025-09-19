import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { AnalysisResult, AuditEntry } from './types';
import { 
    analyzeCallTranscript,
    generatePerformanceSummary, generateCoachingPlan,
    generateRootCauseAnalysis, findCallOfTheWeek
} from './services/geminiService';
import { 
    getAllAuditEntries, addAuditEntry, clearAuditEntries, bulkAddAuditEntries,
    getAgents, saveAgents, getAuditors, saveAuditors, getAuditEntryByHash,
    updateAuditEntry
} from './services/dbService';
import { DEFAULT_AGENT_EMAILS, DEFAULT_AUDITOR_EMAILS } from './constants';
import Header from './components/Header';
import AudioInput from './components/AudioInput';
import AnalysisDisplay from './components/AnalysisDisplay';
import Loader from './components/Loader';
import ErrorMessage from './components/ErrorMessage';
import AuditReport from './components/AuditReport';
import Dashboard from './components/Dashboard';
import Agents from './components/Agents';
import Auditors from './components/Auditors';
import DataManagement from './components/DataManagement';
import Login from './components/Login';
import BestPracticesReport from './components/BestPracticesReport';
import AgentTrendView from './components/AgentTrendView';
import CoachingHub from './components/CoachingHub';
import Leaderboard from './components/Leaderboard';
import SummaryModal from './components/SummaryModal';
import RolePlaySimulator from './components/RolePlaySimulator';
import HowItWorks from './components/HowItWorks';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

const calculateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
};


const App: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAuditor, setSelectedAuditor] = useState<string>('');
  const [agentEmail, setAgentEmail] = useState<string>('');
  const [buyerUserId, setBuyerUserId] = useState<string>('');
  const [callStamp, setCallStamp] = useState<string>('');

  const [history, setHistory] = useState<AuditEntry[]>([]);
  const [agents, setAgents] = useState<string[]>([]);
  const [auditors, setAuditors] = useState<string[]>([]);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<'analysis' | 'history' | 'dashboard' | 'agents' | 'auditors' | 'datasync' | 'best-practices' | 'coaching-hub' | 'leaderboard' | 'role-play' | 'how-it-works'>('dashboard');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<AuditEntry | null>(null);
  const [viewingAgentTrend, setViewingAgentTrend] = useState<string | null>(null);
  
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [dataView, setDataView] = useState<'all' | 'mine'>('all');
  const [coachingHubInitialPrompt, setCoachingHubInitialPrompt] = useState<string>('');

  // State for AI Summary Feature
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryContent, setSummaryContent] = useState('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryTitle, setSummaryTitle] = useState('AI Performance Summary');

  // State for dismissing coaching alerts
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);


  useEffect(() => {
    const loadData = async () => {
        try {
            const [loadedHistory, loadedAgents, loadedAuditors] = await Promise.all([
                getAllAuditEntries(),
                getAgents(),
                getAuditors()
            ]);
            
            loadedHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setHistory(loadedHistory);

            const finalAgents = loadedAgents.length > 0 ? loadedAgents : DEFAULT_AGENT_EMAILS;
            setAgents(finalAgents);
            if(loadedAgents.length === 0) await saveAgents(finalAgents);
            
            const finalAuditors = loadedAuditors.length > 0 ? loadedAuditors : DEFAULT_AUDITOR_EMAILS;
            setAuditors(finalAuditors);
            if(loadedAuditors.length === 0) await saveAuditors(finalAuditors);
            
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser && finalAuditors.includes(savedUser)) {
                setCurrentUser(savedUser);
            }

        } catch (e) {
            console.error("Failed to load data from IndexedDB", e);
            setError("Could not load application data. Please ensure your browser supports IndexedDB and is not in private mode.");
            setAgents(DEFAULT_AGENT_EMAILS);
            setAuditors(DEFAULT_AUDITOR_EMAILS);
        } finally {
            setIsDataLoading(false);
        }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      setSelectedAuditor(currentUser);
    }
  }, [currentUser]);

  const displayedHistory = useMemo(() => {
    if (dataView === 'mine' && currentUser) {
        return history.filter(entry => entry.auditorName === currentUser);
    }
    return history;
  }, [history, dataView, currentUser]);

  const teamAverageScores = useMemo(() => {
    const paramData: { [param: string]: { totalScore: number; count: number } } = {};
    history.forEach(entry => {
        entry.analysis.detailedScores?.forEach(param => {
            if (!paramData[param.parameter]) {
                paramData[param.parameter] = { totalScore: 0, count: 0 };
            }
            paramData[param.parameter].totalScore += param.score;
            paramData[param.parameter].count++;
        });
    });

    const averages: Record<string, number> = {};
    for (const paramName in paramData) {
        if (paramData[paramName].count > 0) {
            averages[paramName] = paramData[paramName].totalScore / paramData[paramName].count;
        }
    }
    return averages;
  }, [history]);

  const handleLogin = async (auditor: string) => {
    const trimmedAuditor = auditor.trim().toLowerCase();
    if (!trimmedAuditor || !/^\S+@\S+\.\S+$/.test(trimmedAuditor)) {
        alert("Please enter a valid email address to log in.");
        return;
    }

    if (!auditors.includes(trimmedAuditor)) {
        const newAuditors = [...auditors, trimmedAuditor].sort();
        try {
            await saveAuditors(newAuditors);
            setAuditors(newAuditors);
        } catch(e) {
            console.error("Failed to save new auditor:", e);
            setError("Could not save new auditor, but will proceed with login for this session.");
        }
    }
    
    localStorage.setItem('currentUser', trimmedAuditor);
    setCurrentUser(trimmedAuditor);
  };


  const handleLogout = () => {
      localStorage.removeItem('currentUser');
      setCurrentUser(null);
      setSelectedAuditor('');
      setAgentEmail('');
      setAudioFile(null);
      setAnalysis(null);
      setError(null);
      setBuyerUserId('');
      setCallStamp('');
      setActiveTab('dashboard');
  };

  const handleClearHistory = async () => {
    if (window.confirm("Are you sure you want to permanently delete all audit history from this browser? This action cannot be undone and will not affect other users' data.")) {
        try {
            await clearAuditEntries();
            setHistory([]);
            alert("Local audit history has been cleared.");
        } catch(e) {
            console.error("Failed to clear history:", e);
            setError("Could not clear audit history.");
        }
    }
  };

  const handleImportHistory = async (files: FileList): Promise<string> => {
    if (!files || files.length === 0) {
        throw new Error("No files selected for import.");
    }

    try {
        const currentHistory = await getAllAuditEntries();
        const historyMap = new Map<number, AuditEntry>();
        currentHistory.forEach(entry => historyMap.set(entry.id, entry));

        let totalNewRecords = 0;
        let totalUpdatedRecords = 0;
        let filesProcessed = 0;
        const filesFailed: string[] = [];

        for (const file of Array.from(files)) {
            try {
                const text = await file.text();
                const importedEntries: AuditEntry[] = JSON.parse(text);

                if (!Array.isArray(importedEntries) || importedEntries.some(entry => typeof entry.id === 'undefined' || typeof entry.timestamp === 'undefined')) {
                    throw new Error(`File ${file.name} has an invalid format. It must be an array of audit entries.`);
                }

                importedEntries.forEach(entry => {
                    // Ensure a valid ID exists. Fallback for older data that might lack a proper ID.
                    if (!entry.id) {
                        entry.id = new Date(entry.timestamp).getTime() + Math.floor(Math.random() * 1000);
                    }
                    
                    if (historyMap.has(entry.id)) {
                        totalUpdatedRecords++;
                    } else {
                        totalNewRecords++;
                    }
                    
                    // Overwrite with the imported entry. The imported file is the source of truth.
                    historyMap.set(entry.id, entry);
                });
                filesProcessed++;
            } catch (err) {
                console.error(`Failed to process file ${file.name}:`, err);
                filesFailed.push(file.name);
            }
        }
        
        const updatedHistory = Array.from(historyMap.values());
        
        await bulkAddAuditEntries(updatedHistory);
        
        updatedHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setHistory(updatedHistory);
        
        let successMessage = `Successfully processed ${filesProcessed} file(s).\n- ${totalNewRecords} new audit(s) added.\n- ${totalUpdatedRecords} existing audit(s) updated/overwritten.`;
        if (filesFailed.length > 0) {
            successMessage += `\n\nFailed to process ${filesFailed.length} file(s): ${filesFailed.join(', ')}. Please check if they are valid JSON files.`;
        }
        return successMessage;

    } catch (err) {
        console.error("Failed to import history:", err);
        throw new Error(err instanceof Error ? err.message : 'An unknown error occurred during import.');
    }
  };


  const handleAddAgent = async (email: string) => {
    if (email && !agents.includes(email)) {
        const newAgents = [...agents, email].sort();
        try {
            await saveAgents(newAgents);
            setAgents(newAgents);
        } catch(e) {
            console.error("Failed to save agents:", e);
            setError("Could not add new agent.");
        }
    }
  };

  const handleDeleteAgent = async (emailToDelete: string) => {
    if (agentEmail === emailToDelete) {
        setAgentEmail('');
    }
    const newAgents = agents.filter(email => email !== emailToDelete);
     try {
        await saveAgents(newAgents);
        setAgents(newAgents);
    } catch(e) {
        console.error("Failed to delete agent:", e);
        setError("Could not delete agent.");
    }
  };
  
  const handleAddAuditor = async (email: string) => {
    if (email && !auditors.includes(email)) {
        const newAuditors = [...auditors, email].sort();
        try {
            await saveAuditors(newAuditors);
            setAuditors(newAuditors);
        } catch(e) {
            console.error("Failed to save auditors:", e);
            setError("Could not add new auditor.");
        }
    }
  };

  const handleDeleteAuditor = async (emailToDelete: string) => {
    if (selectedAuditor === emailToDelete) {
        setSelectedAuditor('');
    }
    const newAuditors = auditors.filter(email => email !== emailToDelete);
    try {
        await saveAuditors(newAuditors);
        setAuditors(newAuditors);
    } catch(e) {
        console.error("Failed to delete auditor:", e);
        setError("Could not delete auditor.");
    }
  };

  const handleNominate = async (id: number) => {
      const entryToUpdate = history.find(e => e.id === id);
      if (entryToUpdate) {
          const updatedEntry = { ...entryToUpdate, nominated: true };
          try {
              await updateAuditEntry(updatedEntry);
              setHistory(prevHistory => prevHistory.map(e => e.id === id ? updatedEntry : e));
              if (selectedHistoryItem?.id === id) {
                  setSelectedHistoryItem(updatedEntry);
              }
              alert("Call nominated for Best Practices!");
          } catch(e) {
              console.error("Failed to nominate call:", e);
              setError("Could not save nomination.");
          }
      }
  };

  const handleCustomizeCoaching = (agentEmail: string, parameter: string) => {
    const prompt = `The agent ${agentEmail} is consistently scoring low on "${parameter}". Please provide 3 actionable coaching tips and a short role-play scenario to help them improve.`;
    setCoachingHubInitialPrompt(prompt);
    setActiveTab('coaching-hub');
  };


  const handleAnalyze = useCallback(async () => {
    if (!selectedAuditor || !agentEmail || !buyerUserId.trim() || !callStamp || !audioFile) {
        setError('Please ensure all fields are filled and an audio file is selected.');
        return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
        const audioHash = await calculateFileHash(audioFile);
        const existingEntry = await getAuditEntryByHash(audioHash);

        if (existingEntry) {
            setSelectedHistoryItem(existingEntry);
            setError(`Duplicate Audio: This call was already audited by ${existingEntry.auditorName} on ${new Date(existingEntry.timestamp).toLocaleDateString()}. The previous report has been opened for you.`);
            setIsLoading(false);
            return;
        }

        const base64Data = await fileToBase64(audioFile);
        const audio = { data: base64Data, mimeType: audioFile.type };

        const finalResult = await analyzeCallTranscript(audio);
        setAnalysis(finalResult);
        
        const newEntry: AuditEntry = {
            id: Date.now(),
            auditorName: selectedAuditor,
            agentEmail: agentEmail,
            timestamp: new Date().toISOString(),
            fileName: audioFile.name,
            analysis: finalResult,
            audioHash: audioHash,
            buyerUserId: buyerUserId.trim(),
            callStamp: callStamp,
            audioData: base64Data,
            audioMimeType: audioFile.type,
        };
        await addAuditEntry(newEntry);
        setHistory(prevHistory => [newEntry, ...prevHistory].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred. Please try again.');
        setAnalysis(null);
    } finally {
        setIsLoading(false);
    }
  }, [audioFile, selectedAuditor, agentEmail, buyerUserId, callStamp]);
  
  const handleGenerateSummary = useCallback(async (auditsToSummarize: AuditEntry[], title: string) => {
    if (auditsToSummarize.length === 0) {
        return;
    }
    setSummaryTitle(title);
    setSummaryContent('');
    setSummaryError(null);
    setIsSummaryLoading(true);
    setIsSummaryModalOpen(true);

    try {
        const reports = auditsToSummarize.map(a => a.analysis);
        const summary = await generatePerformanceSummary(reports);
        setSummaryContent(summary);
    } catch (err) {
        setSummaryError(err instanceof Error ? err.message : 'An unknown error occurred during summary generation.');
    } finally {
        setIsSummaryLoading(false);
    }
  }, []);

  const handleGenerateSummaryForAgent = useCallback((agentEmail: string) => {
    const agentAudits = displayedHistory.filter(h => h.agentEmail === agentEmail);
    handleGenerateSummary(agentAudits, `AI Summary for ${agentEmail}`);
  }, [displayedHistory, handleGenerateSummary]);

  const handleGenerateCoachingPlan = useCallback(async (agentEmail: string) => {
    const agentAudits = history.filter(h => h.agentEmail === agentEmail).slice(0, 10); // Use up to last 10 audits
    if (agentAudits.length === 0) {
        alert("No audit history found for this agent to generate a coaching plan.");
        return;
    }
    setSummaryTitle(`AI Coaching Plan for ${agentEmail}`);
    setSummaryContent('');
    setSummaryError(null);
    setIsSummaryLoading(true);
    setIsSummaryModalOpen(true);

    try {
        const reports = agentAudits.map(a => a.analysis);
        const plan = await generateCoachingPlan(agentEmail, reports);
        setSummaryContent(plan);
    } catch (err) {
        setSummaryError(err instanceof Error ? err.message : 'An unknown error occurred during plan generation.');
    } finally {
        setIsSummaryLoading(false);
    }
  }, [history]);

  const handleGenerateRootCauseAnalysis = useCallback(async (parameter: string) => {
    const lowScoringAudits = history.filter(h => {
        const param = h.analysis.detailedScores?.find(p => p.parameter === parameter);
        return param && param.score <= 5;
    });

    if (lowScoringAudits.length < 3) {
        alert(`Insufficient data. At least 3 low-scoring calls for "${parameter}" are needed for a meaningful root cause analysis.`);
        return;
    }

    setSummaryTitle(`AI Root Cause Analysis for "${parameter}"`);
    setSummaryContent('');
    setSummaryError(null);
    setIsSummaryLoading(true);
    setIsSummaryModalOpen(true);

    try {
        const reports = lowScoringAudits.map(a => a.analysis);
        const analysis = await generateRootCauseAnalysis(parameter, reports);
        setSummaryContent(analysis);
    } catch (err) {
        setSummaryError(err instanceof Error ? err.message : 'An unknown error occurred during root cause analysis.');
    } finally {
        setIsSummaryLoading(false);
    }
  }, [history]);

  const handleFindCallOfTheWeek = useCallback(async () => {
    const highScoringAudits = history.filter(h => h.analysis.overallScore && h.analysis.overallScore.score >= 9);
    if (highScoringAudits.length < 1) {
        alert("No high-scoring calls (score 9+) found to nominate a 'Call of the Week'.");
        return;
    }
    setSummaryTitle("AI Nomination: Call of the Week");
    setSummaryContent('');
    setSummaryError(null);
    setIsSummaryLoading(true);
    setIsSummaryModalOpen(true);
    try {
        const result = await findCallOfTheWeek(highScoringAudits);
        setSummaryContent(result);
    } catch (err) {
        setSummaryError(err instanceof Error ? err.message : 'An unknown error occurred during nomination.');
    } finally {
        setIsSummaryLoading(false);
    }
  }, [history]);

  const TabButton: React.FC<{tabName: 'analysis' | 'history' | 'dashboard' | 'agents' | 'auditors' | 'datasync' | 'best-practices' | 'coaching-hub' | 'leaderboard' | 'role-play' | 'how-it-works', label: string, icon: JSX.Element}> = ({ tabName, label, icon }) => (
    <button
      onClick={() => {
          if (tabName !== 'coaching-hub') {
            setCoachingHubInitialPrompt('');
          }
          setActiveTab(tabName);
          if (activeTab === 'analysis' && tabName !== 'analysis') {
              setAnalysis(null);
              setError(null);
              setAudioFile(null);
              setBuyerUserId('');
              setCallStamp('');
          }
      }}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === tabName ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
    >
      {icon}
      {label}
    </button>
  );

  if (isDataLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
              <Loader />
          </div>
      );
  }

  if (!currentUser) {
      return <Login auditors={auditors} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200">
      <Header currentUser={currentUser} onLogout={handleLogout} />
      <main className="container mx-auto p-4 md:p-8">
        
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="p-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg inline-flex flex-wrap items-center gap-2">
                <TabButton 
                    tabName="dashboard" 
                    label="Dashboard" 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>}
                />
                <TabButton 
                    tabName="leaderboard" 
                    label="Leaderboard" 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.34 3.34A1 1 0 0010 2.535V2a1 1 0 10-2 0v.535a1 1 0 00-.34.805L6.5 8.5H5a1 1 0 00-1 1v2.5a.5.5 0 00.5.5h10a.5.5 0 00.5-.5V9.5a1 1 0 00-1-1h-1.5l-1.16-5.195zM8 14a1 1 0 100 2h4a1 1 0 100-2H8z" clipRule="evenodd" /></svg>}
                />
                <TabButton 
                    tabName="analysis" 
                    label="New Analysis" 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>}
                />
                 <TabButton 
                    tabName="history" 
                    label="Audit History" 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h2a2 2 0 002-2V4a2 2 0 00-2-2H9z"/><path d="M4 12a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 4a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V4zM14 12a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>}
                />
                 <TabButton 
                    tabName="best-practices"
                    label="Best Practices"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.28 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>}
                />
                 <TabButton 
                    tabName="coaching-hub"
                    label="Coaching Hub"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6c0 1.887.668 3.632 1.756 4.994l-1.33 4.01A1 1 0 005.82 18.42l4.01-1.33A5.96 5.96 0 0010 17.5a6 6 0 006-6c0-3.309-2.691-6-6-6zM9 13a1 1 0 112 0v-1a1 1 0 11-2 0v1zm1-5a1 1 0 01-1-1V5a1 1 0 112 0v2a1 1 0 01-1 1z" /></svg>}
                />
                <TabButton 
                    tabName="role-play"
                    label="Role-Play"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 017 8a1 1 0 10-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-1v-2.07z" clipRule="evenodd" /></svg>}
                />
                 <TabButton 
                    tabName="how-it-works"
                    label="How AI Works"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm-.707 10.607a1 1 0 011.414 0l.707-.707a1 1 0 11-1.414-1.414l-.707.707zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" /></svg>}
                />
            </div>
            
             <div className="p-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg inline-flex flex-wrap items-center gap-2">
                 <TabButton 
                    tabName="agents"
                    label="Agents"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0115 11h1a5 5 0 015 5v2a1 1 0 01-1 1h-2.157a6.953 6.953 0 01-1.38-.93zM8.93 17a6.953 6.953 0 01-1.38-.93L5.843 19H4a1 1 0 01-1-1v-2a5 5 0 015-5h1a5 5 0 013.93 2.67A6.97 6.97 0 0012 16c0 .34.024.673.07 1h-3.14z" /></svg>}
                />
                 <TabButton 
                    tabName="auditors"
                    label="Auditors"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}
                />
                <TabButton 
                    tabName="datasync"
                    label="Data Sync"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>}
                />
            </div>
            
             { (activeTab === 'dashboard' || activeTab === 'history' || activeTab === 'best-practices' || activeTab === 'leaderboard') && (
                <div className="p-1 bg-slate-300 dark:bg-slate-700 rounded-lg inline-flex items-center gap-1 self-start" role="radiogroup" aria-label="Data view filter">
                    <button 
                        onClick={() => setDataView('all')} 
                        role="radio"
                        aria-checked={dataView === 'all'}
                        className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${dataView === 'all' ? 'bg-white dark:bg-slate-500 shadow-sm text-blue-600 dark:text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'}`}
                    >
                        All Audits
                    </button>
                    <button 
                        onClick={() => setDataView('mine')}
                        role="radio"
                        aria-checked={dataView === 'mine'}
                        className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${dataView === 'mine' ? 'bg-white dark:bg-slate-500 shadow-sm text-blue-600 dark:text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'}`}
                    >
                        My Audits
                    </button>
                </div>
            )}
        </div>
        
        <>
            {activeTab === 'dashboard' && <Dashboard 
                history={displayedHistory} 
                agents={agents} 
                auditors={auditors} 
                onViewAgentTrend={setViewingAgentTrend}
                onViewDetails={(entry) => {
                    setSelectedHistoryItem(entry);
                    setActiveTab('history'); // Switch to history tab to show the modal over it
                }}
                onCustomizeCoaching={handleCustomizeCoaching} 
                onGenerateAgentSummary={handleGenerateSummaryForAgent}
                onGenerateRootCauseAnalysis={handleGenerateRootCauseAnalysis}
                onFindCallOfTheWeek={handleFindCallOfTheWeek}
                dismissedAlerts={dismissedAlerts}
                setDismissedAlerts={setDismissedAlerts}
            />}
            
            {activeTab === 'leaderboard' && <Leaderboard history={displayedHistory} />}
            
            {activeTab === 'datasync' && <DataManagement history={history} onImportHistory={handleImportHistory} onClearHistory={handleClearHistory} />}

            {activeTab === 'agents' && <Agents agents={agents} onAddAgent={handleAddAgent} onDeleteAgent={handleDeleteAgent} />}
            
            {activeTab === 'auditors' && <Auditors auditors={auditors} onAddAuditor={handleAddAuditor} onDeleteAuditor={handleDeleteAuditor} />}
            
            {activeTab === 'best-practices' && <BestPracticesReport history={displayedHistory} agents={agents} onViewDetails={setSelectedHistoryItem} />}
            
            {activeTab === 'coaching-hub' && <CoachingHub initialPrompt={coachingHubInitialPrompt} />}

            {activeTab === 'role-play' && <RolePlaySimulator />}
            
            {activeTab === 'how-it-works' && <HowItWorks />}

            {activeTab === 'analysis' && (
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
                    <div className="lg:col-span-4 flex flex-col justify-start">
                        <AudioInput
                            audioFile={audioFile}
                            setAudioFile={setAudioFile}
                            onAnalyze={handleAnalyze}
                            isLoading={isLoading}
                            selectedAuditor={currentUser}
                            agentEmail={agentEmail}
                            setAgentEmail={setAgentEmail}
                            agents={agents}
                            buyerUserId={buyerUserId}
                            setBuyerUserId={setBuyerUserId}
                            callStamp={callStamp}
                            setCallStamp={setCallStamp}
                        />
                    </div>
                    <div className="lg:col-span-8">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 min-h-[400px] flex flex-col justify-center items-center transition-all duration-300">
                        {isLoading && <Loader />}
                        {error && <ErrorMessage message={error} />}
                        {!isLoading && !error && analysis && <AnalysisDisplay result={analysis} teamAverageScores={teamAverageScores} />}
                        {!isLoading && !error && !analysis && (
                            <div className="text-center text-slate-500 dark:text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 6l12-3" />
                            </svg>
                            <h3 className="mt-4 text-lg font-medium">Analysis results will appear here</h3>
                            <p className="mt-1 text-sm">Select an agent, upload an audio file, and click "Analyze Call" to get started.</p>
                            </div>
                        )}
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'history' && (
                <AuditReport 
                  history={displayedHistory} 
                  agents={agents}
                  onViewDetails={setSelectedHistoryItem}
                  onGenerateSummary={handleGenerateSummary}
                />
            )}
          </>
      </main>
      
      {selectedHistoryItem && (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center animate-fade-in-fast"
            onClick={() => setSelectedHistoryItem(null)}
        >
            <div 
                className="bg-slate-50 dark:bg-slate-800/95 dark:backdrop-blur-sm dark:border dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4 animate-slide-up-fast"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 md:p-8 relative">
                    <button 
                        onClick={() => setSelectedHistoryItem(null)}
                        className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors p-2 rounded-full bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 z-10"
                        aria-label="Close"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                         </svg>
                    </button>
                    <AnalysisDisplay 
                      result={selectedHistoryItem.analysis} 
                      auditEntry={selectedHistoryItem} 
                      onNominate={handleNominate} 
                      teamAverageScores={teamAverageScores}
                    />
                </div>
            </div>
        </div>
      )}

      {viewingAgentTrend && (
          <AgentTrendView 
            agentEmail={viewingAgentTrend}
            allHistory={history}
            onClose={() => setViewingAgentTrend(null)}
            onGenerateCoachingPlan={handleGenerateCoachingPlan}
          />
      )}

      <SummaryModal
        isOpen={isSummaryModalOpen}
        isLoading={isSummaryLoading}
        content={summaryContent}
        error={summaryError}
        onClose={() => setIsSummaryModalOpen(false)}
        title={summaryTitle}
      />

      <footer className="text-center p-4 text-sm text-slate-500 dark:text-slate-400 mt-8">
        <p>&copy; {new Date().getFullYear()} NoBroker Call Intelligence. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;