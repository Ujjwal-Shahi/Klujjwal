import React, { useState, useEffect } from 'react';
import { generateRebuttal } from '../services/geminiService';

const exampleObjections = [
    "The asking price is too high.",
    "The location is too far from my workplace.",
    "This apartment is too small for my family.",
    "I'm just starting my search and not ready to decide.",
    "The building looks old and poorly maintained."
];

interface CoachingHubProps {
  initialPrompt?: string;
}

const CoachingHub: React.FC<CoachingHubProps> = ({ initialPrompt = '' }) => {
    const [objection, setObjection] = useState('');
    const [rebuttal, setRebuttal] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initialPrompt) {
            setObjection(initialPrompt);
            setRebuttal(''); // Clear any previous results when a new prompt is passed
        }
    }, [initialPrompt]);

    const handleGenerate = async () => {
        if (!objection.trim()) {
            setError("Please enter a buyer's objection or a coaching query.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setRebuttal('');

        try {
            const result = await generateRebuttal(objection);
            setRebuttal(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleExampleClick = (example: string) => {
        setObjection(example);
        setError(null);
        setRebuttal('');
    }

    return (
        <div className="animate-fade-in max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-slate-800">AI Coaching Hub</h1>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                <p className="text-blue-800">Stuck on a tough buyer objection? Enter it below to get expert, consultative rebuttal strategies tailored for the Indian residential resale market.</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
                 <label htmlFor="objection-input" className="text-xl font-bold text-slate-700">Buyer's Objection or Coaching Query</label>
                 <textarea
                    id="objection-input"
                    value={objection}
                    onChange={(e) => {
                        setObjection(e.target.value);
                        if(error) setError(null);
                    }}
                    placeholder="Type or paste the buyer's objection here..."
                    className="w-full mt-2 p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    rows={4}
                    disabled={isLoading}
                 />
                 {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
                 
                 <div className="mt-3">
                    <p className="text-sm text-slate-500 mb-2">Or try an example:</p>
                    <div className="flex flex-wrap gap-2">
                        {exampleObjections.map(ex => (
                            <button key={ex} onClick={() => handleExampleClick(ex)} disabled={isLoading} className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-full px-3 py-1 transition">
                                "{ex}"
                            </button>
                        ))}
                    </div>
                 </div>

                 <button
                    onClick={handleGenerate}
                    disabled={isLoading || !objection.trim()}
                    className="mt-6 w-full sm:w-auto bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                 >
                    {isLoading ? (
                        <>
                           <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating...
                        </>
                    ) : 'Generate Response'}
                 </button>
            </div>

            {rebuttal && (
                <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
                    <h2 className="text-xl font-bold text-slate-700 mb-4">AI-Generated Response</h2>
                    <pre className="bg-slate-50 p-4 rounded-md text-slate-700 whitespace-pre-wrap font-sans text-sm border border-slate-200">
                        {rebuttal}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default CoachingHub;