import React, { useState } from 'react';

interface AuditorsProps {
  auditors: string[];
  onAddAuditor: (email: string) => void;
  onDeleteAuditor: (email: string) => void;
}

const Auditors: React.FC<AuditorsProps> = ({ auditors, onAddAuditor, onDeleteAuditor }) => {
    const [newAuditorEmail, setNewAuditorEmail] = useState('');
    const [error, setError] = useState('');

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const trimmedEmail = newAuditorEmail.trim().toLowerCase();

        if (!trimmedEmail) {
            setError('Email cannot be empty.');
            return;
        }
        if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
            setError('Please enter a valid email format.');
            return;
        }
        if (auditors.includes(trimmedEmail)) {
            setError('This auditor email already exists.');
            return;
        }
        onAddAuditor(trimmedEmail);
        setNewAuditorEmail('');
    };
    
    const handleDeleteClick = (email: string) => {
        if (window.confirm(`Are you sure you want to delete the auditor: ${email}? This action cannot be undone.`)) {
            onDeleteAuditor(email);
        }
    }

    return (
        <div className="animate-fade-in space-y-8 max-w-4xl mx-auto">
             <h1 className="text-3xl font-bold text-slate-800">Manage Auditors</h1>
             
             <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-slate-700 mb-1">Add New Auditor</h2>
                <p className="text-sm text-slate-500 mb-4">Add a new auditor email to the list for performing analyses.</p>
                <form onSubmit={handleAddSubmit} className="flex flex-col sm:flex-row items-start gap-2">
                    <div className="w-full">
                         <input
                            type="email"
                            placeholder="e.g., quality.analyst@nobroker.in"
                            value={newAuditorEmail}
                            onChange={(e) => setNewAuditorEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            aria-label="New auditor email"
                        />
                        {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
                    </div>
                    <button type="submit" className="w-full sm:w-auto flex-shrink-0 bg-blue-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition flex items-center justify-center gap-2">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                         </svg>
                        Add Auditor
                    </button>
                </form>
             </div>

             <div className="bg-white rounded-xl shadow-lg">
                <div className="p-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">Current Auditor List ({auditors.length})</h2>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                    {auditors.length > 0 ? (
                        <ul className="divide-y divide-slate-200">
                            {auditors.map(email => (
                                <li key={email} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                    <span className="text-slate-700 font-medium">{email}</span>
                                    <button 
                                        onClick={() => handleDeleteClick(email)} 
                                        className="text-slate-500 hover:text-red-600 p-1 rounded-full transition-colors"
                                        aria-label={`Delete auditor ${email}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-slate-500 p-8">No auditors found. Add one using the form above to get started.</p>
                    )}
                </div>
             </div>
        </div>
    );
};

export default Auditors;
