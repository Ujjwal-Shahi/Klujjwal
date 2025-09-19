import React, { useRef } from 'react';

interface AudioInputProps {
  audioFile: File | null;
  setAudioFile: (file: File | null) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  selectedAuditor: string;
  agentEmail: string;
  setAgentEmail: (email: string) => void;
  agents: string[];
  buyerUserId: string;
  setBuyerUserId: (id: string) => void;
  callStamp: string;
  setCallStamp: (stamp: string) => void;
}

const AudioInput: React.FC<AudioInputProps> = ({ 
  audioFile, setAudioFile, onAnalyze, isLoading, 
  selectedAuditor,
  agentEmail, setAgentEmail, agents,
  buyerUserId, setBuyerUserId, callStamp, setCallStamp
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAudioFile(file);
    }
  };

  const handleSelectFileClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleClearFile = () => {
    setAudioFile(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 space-y-6">
      <div>
        <label htmlFor="auditor-select" className="block text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
          1. Auditor Profile
        </label>
         <select
          id="auditor-select"
          value={selectedAuditor}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium cursor-not-allowed"
          disabled
          aria-readonly="true"
          aria-label="Auditor Profile"
        >
          <option value={selectedAuditor}>{selectedAuditor}</option>
        </select>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Your profile is set on login. To change, please log out.</p>
      </div>

      <div>
        <label htmlFor="agent-email" className="block text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
          2. Select Agent to Audit
        </label>
        <select
          id="agent-email"
          value={agentEmail}
          onChange={(e) => setAgentEmail(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white dark:bg-slate-700 dark:text-white"
          disabled={isLoading}
          aria-required="true"
        >
          <option value="" disabled>-- Select an Agent --</option>
          {agents.map(email => (
            <option key={email} value={email}>{email}</option>
          ))}
        </select>
      </div>
      
      <div>
        <h3 className="block text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
          3. Call Details
        </h3>
        <div className="space-y-4">
            <div>
                <label htmlFor="buyer-user-id" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Buyer User ID</label>
                <input
                    type="text"
                    id="buyer-user-id"
                    value={buyerUserId}
                    onChange={(e) => setBuyerUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white dark:bg-slate-700 dark:text-white"
                    placeholder="Enter buyer's user ID"
                    disabled={isLoading}
                    aria-required="true"
                />
            </div>
            <div>
                 <label htmlFor="call-stamp" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Call Date & Time</label>
                <input
                    type="text"
                    id="call-stamp"
                    value={callStamp}
                    onChange={(e) => setCallStamp(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white dark:bg-slate-700 dark:text-white"
                    placeholder="Copy and paste timestamp, e.g., 2024-07-30 15:00"
                    disabled={isLoading}
                    aria-required="true"
                />
            </div>
        </div>
      </div>

      <div>
        <h3 className="block text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
          4. Upload Call Audio
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Upload the call recording to begin analysis.</p>
        
        <input
          type="file"
          id="audio-upload"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="audio/*"
          className="hidden"
          disabled={isLoading}
        />
        
        {!audioFile ? (
          <button
            onClick={handleSelectFileClick}
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 px-4 py-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 disabled:cursor-not-allowed disabled:hover:border-slate-300 disabled:hover:text-slate-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="font-medium">Click to upload audio file</span>
          </button>
        ) : (
          <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-3 rounded-lg">
            <div className="flex items-center gap-3 overflow-hidden">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 6l12-3" />
              </svg>
              <p className="text-sm text-slate-700 dark:text-slate-200 truncate" title={audioFile.name}>{audioFile.name}</p>
            </div>
            <button onClick={handleClearFile} disabled={isLoading} className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded-full transition-colors disabled:cursor-not-allowed disabled:hover:text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onAnalyze}
        disabled={isLoading || !audioFile || !selectedAuditor || !agentEmail || !buyerUserId || !callStamp}
        className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Analyzing...
          </>
        ) : 'Analyze Call'}
      </button>
    </div>
  );
};

export default AudioInput;