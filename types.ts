// Fix: Removed circular self-import of 'ScoreParameter'. The file was importing a type from itself, causing a declaration conflict.
export interface ScoreParameter {
  parameter: string;
  score: number;
  justification: string;
}

export interface PropertyDetail {
  detail: string;
  mentioned: boolean;
  value: string;
}

export interface RebuttalHandling {
  attempted: boolean;
  summary: string;
  effectiveness: 'Effective' | 'Partially Effective' | 'Ineffective' | 'Not Applicable';
  approach: 'Consultative' | 'Argumentative' | 'Dismissive' | 'Not Applicable';
}

export interface TimelineEvents {
  propertyIntroduction: number | null;
  detailsSharingStart: number | null;
  siteVisitDiscussionStart: number | null;
  slotConfirmation: number | null;
  objectionRaised: number | null;
}

export interface PropertyAnalysis {
  propertyIdentifier: string;
  details: PropertyDetail[];
  timelineEvents: TimelineEvents;
  detailsSharedConfirmation: {
    mentioned: boolean;
    method: string;
  };
  mandatePointsDelivery?: {
    flow: 'Interactive' | 'Monologue' | 'Not Applicable';
    summary: string;
  };
  siteVisitScheduled: {
    mentioned: boolean;
    status: string;
    slotConfirmation: string;
    rescheduleRedFlag?: boolean;
    redFlagReason?: string;
    virtualVisitOffered?: boolean;
    visitConductedBy?: {
      person: string;
      frmDetailsProvided: boolean;
      preVisitCallInstructionGiven: boolean;
    };
    urgencyCreation?: {
      attempted: boolean;
      summary: string;
    };
  };
  rebuttalHandling?: RebuttalHandling;
}

export interface CallDynamics {
  energyLevel: {
    score: number;
    summary: string;
  };
  communicationStyle: string;
  engagementSummary: string;
}

export interface AreaForImprovement {
  area: string;
  coachingTip: string;
}

export interface CallMoments {
  positivePoints: string[];
  areasForImprovement: AreaForImprovement[];
}

export interface BrokerBehaviorAnalysis {
  score: number;
  summary: string;
}

export interface TranscriptEntry {
  speaker: 'Agent' | 'Buyer' | 'Unknown';
  text: string;
}

export interface VisitLikelihood {
  score: number;
  justification: string;
}


export interface AnalysisResult {
  agentName: string;
  callDuration: number;
  analysisDuration: number;
  detectedLanguages: string;
  isRescheduleCase: boolean;
  rescheduleSummary:string;
  overallScore: {
    score: number;
    summary: string;
  };
  detailedScores: ScoreParameter[];
  propertiesDiscussed: PropertyAnalysis[];
  buyerRequirementsGathered: {
    attempted: boolean;
    summary: string;
  };
  crossPitchAttempted: {
    attempted: boolean;
    summary: string;
  };
  callDynamics: CallDynamics;
  callMoments: CallMoments;
  brokerBehaviorAnalysis: BrokerBehaviorAnalysis;
  visitLikelihood: VisitLikelihood;
}

export interface AuditEntry {
  id: number;
  auditorName: string;
  agentEmail: string;
  timestamp: string;
  fileName: string;
  analysis: AnalysisResult;
  audioHash?: string;
  nominated?: boolean;
  buyerUserId: string;
  callStamp: string;
  audioData?: string; // Base64 encoded audio data
  audioMimeType?: string;
}