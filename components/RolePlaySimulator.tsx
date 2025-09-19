import React, { useState, useRef, useEffect } from 'react';
import { Chat, Content } from '@google/genai';
import { startRolePlayChat, continueRolePlayChat, getRolePlayFeedback, transcribeAudio, analyzeTurnPerformance } from '../services/geminiService';
import Loader from './Loader';
import ErrorMessage from './ErrorMessage';

const scenarios = [
    { id: 'price', title: 'Price Objection', difficulty: 'Medium', description: 'The buyer feels the property is too expensive for their budget.', persona: { name: 'Priya Singh', role: 'Budget-conscious Buyer' }, prompt: 'This property is nice, but the asking price is just too high for my budget.' },
    { id: 'location', title: 'Location Concern', difficulty: 'Easy', description: 'The buyer is worried the property is too far from their work or essential amenities.', persona: { name: 'Rohan Mehta', role: 'Commute-focused Buyer' }, prompt: 'I like the house, but the location is too far from my workplace. The commute would be a problem.' },
    { id: 'size', title: 'Size & Layout Issue', difficulty: 'Medium', description: 'The buyer thinks the apartment or house is too small for their family\'s needs.', persona: { name: 'The Verma Family', role: 'Growing Family' }, prompt: 'The layout is interesting, but honestly, this apartment is much smaller than I expected. I don\'t think it will work for my family.' },
    { id: 'not_ready', title: 'Hesitant Buyer', difficulty: 'Easy', description: 'The buyer is just starting their search and is not ready to make a decision.', persona: { name: 'Anjali Sharma', role: 'First-time Searcher' }, prompt: 'Thanks for the information. I\'m just starting my search and not really ready to make any decisions yet. I want to see more options first.' },
    { id: 'maintenance', title: 'Building Condition', difficulty: 'Hard', description: 'The buyer is concerned about the age or maintenance of the building/society.', persona: { name: 'Mr. Gupta', role: 'Cautious Investor' }, prompt: 'The apartment itself is okay, but the building looks quite old. I\'m worried about potential maintenance issues.' },
];

type Message = {
    role: 'user' | 'model';
    text: string;
};

type ScenarioProgress = {
    [scenarioId: string]: {
        personalBest: number;
        completed: boolean;
    };
};

const PROGRESS_KEY = 'nobroker_roleplay_progress';

const parseFeedback = (text: string) => {
    const scoreMatch = text.match(/\*\*5\. Overall Performance Score \(0-100\):\*\*[\s\n]*(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

    const phrasesMatch = text.split('**4. Suggested Phrasing:**');
    let suggestedPhrases: string[] = [];
    if (phrasesMatch.length > 1) {
        const phrasesBlock = phrasesMatch[1].split('**5. Overall Performance Score')[0];
        suggestedPhrases = phrasesBlock
            .split(/•|-|\d\./) // Split by bullet points or numbers
            .map(p => p.trim().replace(/^"|"$/g, '')) // Trim and remove quotes
            .filter(p => p.length > 10); // Filter out empty strings or artifacts
    }

    // Remove the score part for clean display
    const feedbackText = text.replace(/\*\*5\. Overall Performance Score \(0-100\):\*\*[\s\n]*(\d+)/, '').trim();

    return { score, feedbackText, suggestedPhrases };
};


const RolePlaySimulator: React.FC = () => {
    const [selectedScenario, setSelectedScenario] = useState<typeof scenarios[0] | null>(null);
    const [chat, setChat] = useState<Chat | null>(null);
    const [conversation, setConversation] = useState<Message[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    
    // Feedback state
    const [feedback, setFeedback] = useState<string | null>(null);
    const [suggestedPhrases, setSuggestedPhrases] = useState<string[]>([]);
    const [finalScore, setFinalScore] = useState<number | null>(null);

    // Turn-by-turn feedback
    const [turnScore, setTurnScore] = useState<number | null>(null);

    // Audio and waveform refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameId = useRef<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Progress tracking
    const [progress, setProgress] = useState<ScenarioProgress>({});

    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            const savedProgress = localStorage.getItem(PROGRESS_KEY);
            if (savedProgress) {
                setProgress(JSON.parse(savedProgress));
            }
        } catch (e) {
            console.error("Failed to load progress from localStorage", e);
        }
    }, []);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [conversation]);

    const handleStartSession = async () => {
        if (!selectedScenario) return;
        setError(null);
        setFeedback(null);
        setFinalScore(null);
        setTurnScore(null);
        setSuggestedPhrases([]);
        setIsLoading(true);
        setLoadingMessage('Initializing session with AI Buyer...');
        try {
            const newChat = startRolePlayChat(selectedScenario.prompt);
            setChat(newChat);
            const initialResponse = await newChat.sendMessage({ message: "Start the conversation now." });
            setConversation([{ role: 'model', text: initialResponse.text }]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start the session.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleStopSession = async () => {
        if (!chat) return;
        setIsLoading(true);
        setLoadingMessage('Generating performance feedback...');
        setFeedback(null);
        setError(null);
        try {
            const fullHistory = await chat.getHistory();
            const feedbackResult = await getRolePlayFeedback(fullHistory);
            const { score, feedbackText, suggestedPhrases } = parseFeedback(feedbackResult);
            
            setFeedback(feedbackText);
            setFinalScore(score);
            setSuggestedPhrases(suggestedPhrases);

            // Save progress
            const currentBest = progress[selectedScenario!.id]?.personalBest ?? 0;
            const newProgress = {
                ...progress,
                [selectedScenario!.id]: {
                    personalBest: Math.max(currentBest, score),
                    completed: true,
                }
            };
            setProgress(newProgress);
            localStorage.setItem(PROGRESS_KEY, JSON.stringify(newProgress));

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate feedback.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        // Stop any recording first
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        if (mediaRecorderRef.current?.stream) mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        
        setSelectedScenario(null);
        setChat(null);
        setConversation([]);
        setIsRecording(false);
        setIsLoading(false);
        setError(null);
        setFeedback(null);
        setFinalScore(null);
        setTurnScore(null);
        setSuggestedPhrases([]);
    };

    const drawWaveform = () => {
        if (!analyserRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(dataArray);

        canvasCtx.fillStyle = document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff'; // bg-slate-900 or white
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = '#3b82f6'; // blue-500
        canvasCtx.beginPath();

        const sliceWidth = canvas.width * 1.0 / analyserRef.current.frequencyBinCount;
        let x = 0;

        for (let i = 0; i < analyserRef.current.frequencyBinCount; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;
            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }
            x += sliceWidth;
        }
        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
        animationFrameId.current = requestAnimationFrame(drawWaveform);
    };

    const handleStartRecording = async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContextRef.current = new AudioContext();
            analyserRef.current = audioContextRef.current.createAnalyser();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);

            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = event => audioChunksRef.current.push(event.data);

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
                if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);

                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    if (!chat) return;
                    const base64Audio = (reader.result as string).split(',')[1];
                    const mimeType = audioBlob.type;
                    
                    setIsLoading(true);
                    try {
                        setLoadingMessage('Transcribing your response...');
                        const userText = await transcribeAudio({ data: base64Audio, mimeType });
                        setConversation(prev => [...prev, { role: 'user', text: userText }]);
                        
                        setLoadingMessage('Analyzing your approach...');
                        const turnAnalysis = await analyzeTurnPerformance(userText);
                        setTurnScore(turnAnalysis.score);
                        
                        setLoadingMessage('Getting AI Buyer response...');
                        const modelResponseText = await continueRolePlayChat(chat, { data: base64Audio, mimeType });
                        setConversation(prev => [...prev, { role: 'model', text: modelResponseText }]);
                    } catch (err) {
                         setError(err instanceof Error ? err.message : 'An error occurred during the conversation.');
                    } finally {
                        setIsLoading(false);
                    }
                };
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
            drawWaveform();
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setError("Could not access microphone. Please ensure permission is granted and try again.");
        }
    };
    
    const handleStopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const playTTS = (text: string) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-IN';
        speechSynthesis.speak(utterance);
    };

    if (feedback) {
        return (
            <div className="animate-fade-in max-w-5xl mx-auto space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                         <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Performance Feedback</h1>
                         <p className="text-slate-600 dark:text-slate-400 mt-1">Scenario: {selectedScenario?.title}</p>
                    </div>
                    <button onClick={handleReset} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-sm">
                        Back to Scenarios
                    </button>
                </div>
                 <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 text-center">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">FINAL SCORE</p>
                    <p className={`text-7xl font-extrabold ${finalScore! >= 70 ? 'text-green-500' : finalScore! >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>{finalScore}</p>
                 </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4">
                        <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200 mb-2">Conversation Transcript</h3>
                        <div className="h-[50vh] overflow-y-auto space-y-3 pr-2">
                           {conversation.map((msg, index) => (
                                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-md p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}>
                                        <p>{msg.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4">
                        <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200 mb-2">AI Feedback</h3>
                        <div className="h-[50vh] overflow-y-auto pr-2">
                            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-600 dark:text-slate-300">{feedback}</pre>
                            {suggestedPhrases.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <h4 className="font-semibold text-slate-700 dark:text-slate-200">Suggested Phrasing Demo</h4>
                                    <div className="space-y-2 mt-2">
                                        {suggestedPhrases.map((phrase, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 p-2 rounded-md">
                                                <button onClick={() => playTTS(phrase)} className="p-1.5 rounded-full text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50" aria-label="Listen to phrase">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zM4 8a1 1 0 011 1v2a1 1 0 11-2 0V9a1 1 0 011-1zM15 8a1 1 0 011 1v2a1 1 0 11-2 0V9a1 1 0 011-1zM5.293 4.879a1 1 0 011.414 0L8 6.172a1 1 0 01-1.414 1.414L5.293 6.293a1 1 0 010-1.414zM11.293 6.293a1 1 0 011.414 0l1.293 1.293a1 1 0 01-1.414 1.414L11.293 7.707a1 1 0 010-1.414z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4 10a6 6 0 1112 0 6 6 0 01-12 0z" clipRule="evenodd" /></svg>
                                                </button>
                                                <p className="text-sm text-slate-700 dark:text-slate-200 italic">"{phrase}"</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!selectedScenario) {
        const difficultyColor = (diff: string) => diff === 'Easy' ? 'text-green-600' : diff === 'Medium' ? 'text-yellow-600' : 'text-red-600';
        return (
            <div className="animate-fade-in max-w-5xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">AI Role-Play Simulator</h1>
                <p className="text-slate-600 dark:text-slate-400">Practice handling tough buyer objections in a safe, interactive environment. Select a scenario to begin.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {scenarios.map(s => {
                        const scenarioProgress = progress[s.id];
                        return (
                             <div key={s.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 flex flex-col justify-between border-t-4" style={{borderColor: s.difficulty === 'Easy' ? '#22c55e' : s.difficulty === 'Medium' ? '#f59e0b' : '#ef4444'}}>
                                <div>
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-blue-700 dark:text-blue-400 text-lg">{s.title}</h3>
                                        {scenarioProgress?.completed && <span className="text-xs font-bold text-green-500 bg-green-100 dark:bg-green-900/50 px-2 py-0.5 rounded-full">✓ Completed</span>}
                                    </div>
                                    <p className={`text-xs font-bold uppercase ${difficultyColor(s.difficulty)}`}>{s.difficulty}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{s.description}</p>
                                    {scenarioProgress && <p className="text-xs font-semibold text-slate-500 dark:text-slate-300 mt-3">Personal Best: <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">{scenarioProgress.personalBest}</span></p>}
                                </div>
                                <button onClick={() => setSelectedScenario(s)} className="mt-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-2 px-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 w-full text-sm">
                                    {scenarioProgress ? 'Practice Again' : 'Start Practice'}
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Role-Play: {selectedScenario.title}</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">You are in a session with the AI Buyer.</p>
                </div>
                <button onClick={handleReset} className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:underline">
                    End Session
                </button>
            </div>
            
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 h-[70vh] flex flex-col">
                {/* Buyer Profile */}
                <div className="p-4 text-center border-b border-slate-200 dark:border-slate-700">
                    <p className="font-bold text-lg text-slate-800 dark:text-slate-100">{selectedScenario.persona.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{selectedScenario.persona.role}</p>
                </div>

                {/* Chat Area */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-4 p-4">
                    {conversation.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-lg p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}>
                                <p>{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && <div className="text-center text-sm text-slate-400">{loadingMessage}</div>}
                </div>

                {/* Controls Area */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                     {turnScore !== null && (
                        <div className="flex items-center gap-3 justify-center animate-fade-in-fast">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Consultative Score:</p>
                             <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${turnScore >= 8 ? 'bg-green-500' : turnScore >= 5 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{width: `${turnScore * 10}%`}}></div></div>
                            <span className={`text-sm font-bold w-6 text-center ${turnScore >= 8 ? 'text-green-500' : turnScore >= 5 ? 'text-yellow-500' : 'text-red-500'}`}>{turnScore}</span>
                        </div>
                     )}
                     <canvas ref={canvasRef} width="300" height="50" className={`w-full h-12 transition-opacity duration-300 ${isRecording ? 'opacity-100' : 'opacity-0'}`}></canvas>
                     {conversation.length === 0 ? (
                        <button onClick={handleStartSession} disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-slate-400">
                            {isLoading ? loadingMessage : 'Start Session'}
                        </button>
                    ) : (
                        <div className="flex items-center gap-4">
                             {!isRecording ? (
                                <button onClick={handleStartRecording} disabled={isLoading} className="w-16 h-16 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 transition-colors disabled:bg-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 017 8a1 1 0 10-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-1v-2.07z" clipRule="evenodd" /></svg>
                                </button>
                            ) : (
                                <button onClick={handleStopRecording} className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 transition-colors">
                                    <div className="w-6 h-6 bg-white rounded-md animate-pulse"></div>
                                </button>
                            )}
                            <div className="flex-1">
                                <p className="font-semibold text-slate-700 dark:text-slate-200">{isRecording ? "Recording your response..." : "Your turn to speak."}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{isRecording ? "Click the red button to stop." : "Click the blue mic to start."}</p>
                            </div>
                            <button onClick={handleStopSession} disabled={isLoading || isRecording} className="bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-slate-700 disabled:bg-slate-400 dark:disabled:bg-slate-500 text-sm">
                                Get Feedback
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {error && <ErrorMessage message={error}/>}
        </div>
    );
};

export default RolePlaySimulator;
