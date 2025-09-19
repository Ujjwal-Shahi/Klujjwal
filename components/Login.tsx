import React, { useState } from 'react';

interface LoginProps {
  auditors: string[];
  onLogin: (auditor: string) => void;
}

const Login: React.FC<LoginProps> = ({ auditors, onLogin }) => {
  const [selectedAuditor, setSelectedAuditor] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [view, setView] = useState<'select' | 'input'>('select');
  const [error, setError] = useState('');

  const handleLogin = () => {
    setError('');
    const emailToLogin = view === 'input' ? customEmail.trim().toLowerCase() : selectedAuditor;
    
    if (view === 'input' && (!emailToLogin || !/^\S+@\S+\.\S+$/.test(emailToLogin))) {
        setError('Please enter a valid email address.');
        return;
    }

    if (emailToLogin) {
      onLogin(emailToLogin);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 text-center animate-fade-in">
            <div className="flex items-center justify-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2V7a2 2 0 012-2h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H17z" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Call Quality Analyzer</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Powered by NoBroker & Gemini AI</p>
                </div>
            </div>
          
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mt-4">Select Your Profile</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 mb-6">
                Choose your email to access your local audit dashboard.
            </p>

            <div className="space-y-4">
                {view === 'select' ? (
                     <>
                        <select
                            value={selectedAuditor}
                            onChange={(e) => setSelectedAuditor(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white dark:bg-slate-700 dark:text-white"
                            aria-label="Select your auditor profile"
                        >
                            <option value="" disabled>-- Select Your Email --</option>
                            {auditors.map(email => (
                                <option key={email} value={email}>{email}</option>
                            ))}
                        </select>
                         <button
                            onClick={() => { setView('input'); setSelectedAuditor(''); }}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            Or enter your email
                        </button>
                    </>
                ) : (
                    <div className="text-left">
                        <input
                            type="email"
                            placeholder="Enter your email address"
                            value={customEmail}
                            onChange={(e) => {
                                setCustomEmail(e.target.value);
                                if (error) setError('');
                            }}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white dark:bg-slate-700 dark:text-white"
                            aria-label="Enter your email address"
                        />
                        {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
                         <button
                            onClick={() => { setView('select'); setCustomEmail(''); setError(''); }}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2"
                        >
                            Back to list
                        </button>
                    </div>
                )}


                <button
                    onClick={handleLogin}
                    disabled={view === 'select' ? !selectedAuditor : !customEmail}
                    className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                    Continue
                </button>
            </div>
            
             <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/40 border border-yellow-200 dark:border-yellow-500/30 text-yellow-800 dark:text-yellow-300 p-3 rounded-lg text-xs text-left">
                <p>
                    <strong className="font-semibold">Important:</strong> All audit data is stored locally in this web browser. It is not saved to a central server. Use the 'Data Sync' feature to create backups or share data with your team.
                </p>
            </div>
        </div>
      </div>
       <footer className="text-center p-4 text-sm text-slate-500 dark:text-slate-400 mt-8">
        <p>&copy; {new Date().getFullYear()} NoBroker Call Intelligence. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Login;