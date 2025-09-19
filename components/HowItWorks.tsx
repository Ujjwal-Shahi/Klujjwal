import React from 'react';

const Step: React.FC<{ number: number; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="relative pl-8">
        <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center ring-4 ring-slate-100">
            {number}
        </div>
        <div className="ml-4">
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
            <p className="text-slate-600 mt-2">{children}</p>
        </div>
    </div>
);

const HowItWorks: React.FC = () => {
    return (
        <div className="animate-fade-in max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-slate-800">How The AI Analysis Works</h1>
            <p className="text-lg text-slate-600">
                This platform uses a sophisticated, multi-stage process to transform a raw audio file into a detailed, actionable performance report. Here’s a breakdown of the AI's methodology.
            </p>

            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
                <h2 className="text-2xl font-bold text-slate-700 mb-6 text-center">The AI Analysis Pipeline</h2>
                
                <div className="w-full">
                    <svg width="100%" viewBox="0 0 800 300" xmlns="http://www.w3.org/2000/svg" aria-labelledby="pipeline-title" role="img">
                        <title id="pipeline-title">AI Analysis Pipeline Graphic</title>
                        <defs>
                            <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
                                <stop offset="100%" style={{ stopColor: '#6366f1', stopOpacity: 1 }} />
                            </linearGradient>
                            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.15"/>
                            </filter>
                            <marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
                            </marker>
                            <style>{`
                                .box-text { font: 600 22px sans-serif; fill: white; }
                                .sub-text { font: 600 14px sans-serif; fill: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
                                .icon-white { fill: none; stroke: white; stroke-width: 2px; stroke-linecap: round; stroke-linejoin: round; }
                            `}</style>
                        </defs>

                        {/* Stage 1: Audio Input */}
                        <g transform="translate(40, 100)" filter="url(#shadow)">
                            <rect x="0" y="0" width="160" height="100" rx="12" fill="#475569" />
                            <text x="80" y="45" textAnchor="middle" className="box-text">Audio File</text>
                            <g className="icon-white" transform="translate(65, 60)">
                                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24">
                                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 8v8"/><path d="M16 10v4"/><path d="M8 10v4"/><path d="M20 12h-1"/><path d="M5 12H4"/>
                                </svg>
                            </g>
                        </g>

                        {/* Arrow 1 */}
                        <path d="M 210 150 L 270 150" stroke="#9ca3af" strokeWidth="3" markerEnd="url(#arrowhead)" />

                        {/* Stage 2: Gemini AI Model */}
                        <g transform="translate(280, 75)" filter="url(#shadow)">
                            <rect x="0" y="0" width="240" height="150" rx="15" fill="url(#grad-blue)" />
                            <text x="120" y="55" textAnchor="middle" className="box-text">Gemini AI Engine</text>
                            <g className="icon-white" transform="translate(100, 75)">
                               <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                            </g>
                        </g>
                        <text x="400" y="60" textAnchor="middle" className="sub-text">Transcription & Scoring</text>
                        <text x="400" y="245" textAnchor="middle" className="sub-text">Coaching & Analysis</text>

                        {/* Arrow 2 */}
                        <path d="M 530 150 L 590 150" stroke="#9ca3af" strokeWidth="3" markerEnd="url(#arrowhead)" />

                        {/* Stage 3: Report */}
                        <g transform="translate(600, 100)" filter="url(#shadow)">
                            <rect x="0" y="0" width="160" height="100" rx="12" fill="#10b981" />
                            <text x="80" y="45" textAnchor="middle" className="box-text">Analysis Report</text>
                            <g className="icon-white" transform="translate(65, 60)">
                               <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                            </g>
                        </g>

                    </svg>
                </div>

                <div className="mt-8 space-y-8">
                     <Step number={1} title="Audio Processing & Transcription">
                        When you upload an audio file, it is first sent to the AI for high-speed processing. To ensure a fast response, this initial step is highly focused:
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                            <li><strong>Transcribe:</strong> Convert the entire conversation to text.</li>
                            <li><strong>Diarize:</strong> Identify and label who is speaking ('Agent' or 'Buyer').</li>
                            <li><strong>Extract Metadata:</strong> Determine the call's duration and detected languages.</li>
                        </ul>
                        <p className="text-sm mt-2">
                          <strong>Note:</strong> To significantly increase the overall analysis speed, intensive sentiment analysis has been removed from this initial stage. This two-step process (audio-to-text first, then text-to-analysis) is much faster than a single request.
                        </p>
                    </Step>
                    <Step number={2} title="Structured Analysis & Scoring">
                        The full transcript is then sent back to the AI, but this time with a highly detailed, 500-line system instruction. This instruction acts as the AI's rulebook, forcing it to analyze the text and structure its findings into a specific JSON format. This is where the core scoring happens. The AI is commanded to meticulously check for:
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                             <li><strong>Mandatory Points:</strong> Verifying if all 6 property details were mentioned.</li>
                             <li><strong>Key Events:</strong> Estimating timestamps for events like 'Objection Raised' and 'Slot Confirmation'.</li>
                             <li><strong>Agent Actions:</strong> Detecting if a cross-pitch was attempted or if urgency was created.</li>
                             <li><strong>Compliance Red Flags:</strong> Identifying prohibited actions like offering a "virtual visit".</li>
                        </ul>
                        The AI scores each parameter from 1-10 based on strict rules outlined in its instructions (e.g., "If the agent fails to mention all mandatory details, the score for 'Info Sharing' cannot exceed 4.").
                    </Step>
                     <Step number={3} title="Qualitative Insights & Coaching">
                        Beyond quantitative scores, the AI is instructed to act as an expert sales coach. It re-reads the conversation to identify nuanced, qualitative aspects:
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                            <li><strong>'What Went Well':</strong> It identifies and extracts specific examples of strong performance.</li>
                            <li><strong>'Areas for Improvement':</strong> It finds moments where the agent could have performed better.</li>
                             <li><strong>'Coaching Tips':</strong> For each area of improvement, the AI's "coach persona" generates a concrete, actionable tip with suggested phrasing. This is not just a summary; it's a separate, creative task to generate helpful advice.</li>
                        </ul>
                    </Step>
                    <Step number={4} title="Meta-Analysis & Advanced Features">
                        For features like "Root Cause Analysis" or "Call of the Week," the process is taken a step further. Instead of one transcript, the AI is given multiple call reports and a new set of instructions. For example, for Root Cause Analysis, it's told: "You are a performance analyst. Review these 10 reports where agents failed at 'Objection Handling' and identify the single underlying reason for this trend." This allows the AI to find patterns across calls, not just within a single one.
                    </Step>
                </div>
            </div>
        </div>
    );
};

export default HowItWorks;