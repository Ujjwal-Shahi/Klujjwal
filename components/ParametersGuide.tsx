
import React from 'react';

const parameters = [
  { name: 'Greeting & Opening', description: 'Agent greets professionally and sets a positive tone.' },
  { name: 'Direct Lead Pitch & Info Sharing', description: 'Pitches existing leads and shares all 6 mandatory details.' },
  { name: 'Buyer Requirement Gathering', description: 'Proactively asks for buyer needs (budget, location, etc.).' },
  { name: 'Cross-Pitching', description: 'Suggests relevant new properties based on requirements.' },
  { name: 'Query & Objection Handling', description: 'Effectively addresses all buyer questions and concerns.' },
  { name: 'Call to Action (Site Visit)', description: 'Clearly attempts to schedule a property visit.' },
  { name: 'Professionalism & Tone', description: 'Maintains a polite, confident, and professional tone.' },
  { name: 'Conversation Flow & Engagement', description: 'Ensures the call is a two-way dialogue, not a monologue or a forced schedule.' },
];

const ParameterItem: React.FC<{ name: string, description: string }> = ({ name, description }) => (
    <li className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1.5 w-4 h-4 rounded-full bg-blue-500 border-2 border-white ring-2 ring-blue-500"></div>
        <div>
            <p className="font-semibold text-slate-700">{name}</p>
            <p className="text-sm text-slate-500">{description}</p>
        </div>
    </li>
);

const ParametersGuide: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        Scoring Parameters
      </h3>
      <p className="text-sm text-slate-500 mt-2 mb-4">
        The AI will score calls based on the following criteria to determine quality.
      </p>
      <ul className="space-y-3">
        {parameters.map(p => <ParameterItem key={p.name} name={p.name} description={p.description} />)}
      </ul>
    </div>
  );
};

export default ParametersGuide;
