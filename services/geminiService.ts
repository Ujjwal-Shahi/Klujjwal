import { GoogleGenAI, Type, Chat, Part, Content } from "@google/genai";
import { AnalysisResult, TranscriptEntry, AuditEntry } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fullResponseSchema = {
    type: Type.OBJECT,
    properties: {
        callDuration: { type: Type.INTEGER, description: "The total duration of the call audio in seconds." },
        detectedLanguages: { type: Type.STRING, description: "The primary language or mix of languages detected." },
        agentName: { type: Type.STRING, description: "The name of the Relationship Manager (RM) as stated in their introduction. If not mentioned, 'Not Mentioned'." },
        isRescheduleCase: { type: Type.BOOLEAN, description: "True if the primary purpose of the call was to reschedule an existing appointment." },
        rescheduleSummary: { type: Type.STRING, description: "If a reschedule case, a summary of the reschedule discussion. Otherwise, 'Not Applicable'." },
        overallScore: {
            type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, summary: { type: Type.STRING } }, required: ["score", "summary"]
        },
        detailedScores: {
            type: Type.ARRAY, items: {
                type: Type.OBJECT, properties: { parameter: { type: Type.STRING }, score: { type: Type.INTEGER }, justification: { type: Type.STRING } }, required: ["parameter", "score", "justification"]
            }
        },
        propertiesDiscussed: {
            type: Type.ARRAY, items: {
                type: Type.OBJECT, properties: {
                    propertyIdentifier: { type: Type.STRING },
                    details: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { detail: { type: Type.STRING }, mentioned: { type: Type.BOOLEAN }, value: { type: Type.STRING } }, required: ["detail", "mentioned", "value"] } },
                    timelineEvents: {
                        type: Type.OBJECT, properties: {
                            propertyIntroduction: { type: [Type.INTEGER, Type.NULL] }, detailsSharingStart: { type: [Type.INTEGER, Type.NULL] }, siteVisitDiscussionStart: { type: [Type.INTEGER, Type.NULL] }, slotConfirmation: { type: [Type.INTEGER, Type.NULL] }, objectionRaised: { type: [Type.INTEGER, Type.NULL] }
                        }, required: ["propertyIntroduction", "detailsSharingStart", "siteVisitDiscussionStart", "slotConfirmation", "objectionRaised"]
                    },
                    detailsSharedConfirmation: { type: Type.OBJECT, properties: { mentioned: { type: Type.BOOLEAN }, method: { type: Type.STRING } }, required: ["mentioned", "method"] },
                    mandatePointsDelivery: {
                        type: Type.OBJECT, properties: {
                            flow: { type: Type.STRING },
                            summary: { type: Type.STRING },
                        }, required: ["flow", "summary"]
                    },
                    siteVisitScheduled: {
                        type: Type.OBJECT, properties: {
                            mentioned: { type: Type.BOOLEAN }, status: { type: Type.STRING }, slotConfirmation: { type: Type.STRING }, rescheduleRedFlag: { type: Type.BOOLEAN }, redFlagReason: { type: Type.STRING }, virtualVisitOffered: { type: Type.BOOLEAN },
                            visitConductedBy: { type: Type.OBJECT, properties: { person: { type: Type.STRING }, frmDetailsProvided: { type: Type.BOOLEAN }, preVisitCallInstructionGiven: { type: Type.BOOLEAN } }, required: ["person", "frmDetailsProvided", "preVisitCallInstructionGiven"] },
                            urgencyCreation: { type: Type.OBJECT, properties: { attempted: { type: Type.BOOLEAN }, summary: { type: Type.STRING } }, required: ["attempted", "summary"] }
                        }, required: ["mentioned", "status", "slotConfirmation", "visitConductedBy", "urgencyCreation", "virtualVisitOffered"]
                    },
                    rebuttalHandling: { type: Type.OBJECT, properties: { attempted: { type: Type.BOOLEAN }, summary: { type: Type.STRING }, effectiveness: { type: Type.STRING }, approach: { type: Type.STRING } }, required: ["attempted", "summary", "effectiveness", "approach"] }
                }, required: ["propertyIdentifier", "details", "timelineEvents", "detailsSharedConfirmation", "siteVisitScheduled", "rebuttalHandling", "mandatePointsDelivery"]
            }
        },
        buyerRequirementsGathered: { type: Type.OBJECT, properties: { attempted: { type: Type.BOOLEAN }, summary: { type: Type.STRING } }, required: ["attempted", "summary"] },
        crossPitchAttempted: { type: Type.OBJECT, properties: { attempted: { type: Type.BOOLEAN }, summary: { type: Type.STRING } }, required: ["attempted", "summary"] },
        callDynamics: {
            type: Type.OBJECT, properties: {
                energyLevel: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, summary: { type: Type.STRING } }, required: ["score", "summary"] },
                communicationStyle: { type: Type.STRING }, engagementSummary: { type: Type.STRING }
            }, required: ["energyLevel", "communicationStyle", "engagementSummary"]
        },
        callMoments: {
            type: Type.OBJECT, properties: {
                positivePoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                areasForImprovement: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { area: { type: Type.STRING }, coachingTip: { type: Type.STRING } }, required: ["area", "coachingTip"] } }
            }, required: ["positivePoints", "areasForImprovement"]
        },
        brokerBehaviorAnalysis: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, summary: { type: Type.STRING } }, required: ["score", "summary"] },
        visitLikelihood: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, justification: { type: Type.STRING } }, required: ["score", "justification"] }
    },
    required: ["callDuration", "detectedLanguages", "agentName", "isRescheduleCase", "rescheduleSummary", "overallScore", "detailedScores", "propertiesDiscussed", "buyerRequirementsGathered", "crossPitchAttempted", "callDynamics", "callMoments", "brokerBehaviorAnalysis", "visitLikelihood"]
};

const mainSystemInstruction = `You are a very strict and meticulous call quality analyst for NoBroker, a real estate company. Your task is to analyze a call audio between a NoBroker Relationship Manager (RM) and a potential property buyer, then score it according to a rigorous set of rules and return a single, complete JSON object. Your final JSON output MUST be in English.

**ANALYSIS CHECKS & RULES (Strictly follow for EACH property discussed):**

**1. Property Details Confirmation Check:**
- At the start of the property discussion, you MUST check if the agent says they are sharing property details.
- **Full Confirmation:** Agent must state they are sharing details via "WhatsApp, Email, AND SMS". If so, set 'detailsSharedConfirmation.method' to "Full (WhatsApp, Email, SMS)".
- **Partial Confirmation:** Agent says they are "sharing details" but does NOT mention all three channels (WhatsApp, Email, SMS). If so, set 'detailsSharedConfirmation.method' to "Partial".
- **No Confirmation:** If not mentioned, set 'detailsSharedConfirmation.method' to "Not Mentioned".

**2. Mandate Details Check:**
- This is a CRITICAL check. Missing any mandatory detail results in an 'Info Sharing Failure', and the 'Direct Lead Pitch & Info Sharing' score CANNOT EXCEED 4.
- **Exception:** For a reschedule-only call, this check is not required; just confirm the property by name/locality.
- For **Society** properties, you MUST check for: 'BHK', 'Society Name', 'Quoted price', 'Built-up area', 'Floor'.
- For **Standalone/Independent House** properties, you MUST check for: 'BHK', 'Locality', 'Quoted price', 'Built-up area' (or 'Plot area' is acceptable), 'Floor'.
- Use these exact labels for the 'detail' field in your response: 'BHK', 'Society Name', 'Locality', 'Quoted price', 'Built-up area', 'Floor'.

**3. Site Visit Scheduling Check:**
- **Slot Confirmation:** The agent must confirm the visit time along with the **Date AND Day** (e.g., "Saturday, 25th July at 4 PM"). Vague confirmations like "tomorrow evening" are insufficient. Populate 'slotConfirmation' with the exact confirmed slot.
- **Visit Conductor Details:** After scheduling, you MUST check if the agent provided details about who will conduct the visit.
    - If a **Seller** will show the property, the agent MUST state this clearly. Set 'visitConductedBy.person' to 'Seller'.
    - If an **FRM (Field Relationship Manager)** will show the property, the agent MUST provide the FRM's Name AND Number, AND instruct the buyer to "call the FRM one hour before the visit". If all three are done, set 'visitConductedBy.person' to 'FRM', 'frmDetailsProvided' to true, and 'preVisitCallInstructionGiven' to true. Otherwise, set them to false.

**4. Red Flags & Scheduling Tactics:**
- **Proactive Reschedule (Red Flag):** It is a MAJOR VIOLATION if the agent *proactively* suggests rescheduling an existing or new visit. If this happens, you MUST set 'rescheduleRedFlag' to true and document the agent's reason in 'redFlagReason'.
- **Forced Schedule:** If the agent is overly aggressive, doesn't listen to the buyer, and pushes for a visit slot without consent, you MUST set 'siteVisitScheduled.status' to "Force Scheduled".
- **Virtual Visit Offer (Prohibited):** It is strictly prohibited to offer a "virtual visit". If the agent mentions or offers one, you MUST set 'virtualVisitOffered' to true.

**GENERAL SCORING RULES:**
- Greeting & Opening: Must introduce by name and "NoBroker". Failure results in a score of 1-3.
- Inaction Penalty: No attempt to gather requirements or schedule a visit results in a score of 1 for that parameter.
- Scores: 9-10: Excellent, 7-8: Good, 5-6: Average, 1-4: Poor.
- Conversation Flow & Engagement: Score high for two-way dialogue, low for monologues.

**OTHER ANALYSIS TASKS:**
- From the audio, determine the call duration and detected language.
- Analyze overall call dynamics, key positive moments, and areas for improvement with coaching tips.
- Conduct a Broker Behavior Analysis, scoring from 1 (traditional broker) to 10 (ideal NoBroker consultative style).
- Provide a predictive Visit Likelihood score (0-100%) with justification.
- For EACH property, you MUST ALWAYS provide the 'timelineEvents' object. If you cannot determine timestamps, use 'null' for the values.
`;

export const analyzeCallTranscript = async (audio: { data: string; mimeType: string }): Promise<AnalysisResult> => {
    const startTime = Date.now();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: "Analyze this call audio." }, { inlineData: { mimeType: audio.mimeType, data: audio.data } }] },
            config: { 
                systemInstruction: mainSystemInstruction, 
                responseMimeType: "application/json", 
                responseSchema: fullResponseSchema, 
                temperature: 0.2 
            }
        });

        const analysisResult = JSON.parse(response.text.trim());
        const analysisDuration = Math.round((Date.now() - startTime) / 1000);
        
        return { ...analysisResult, analysisDuration };
    } catch (error) {
        console.error("Error analyzing call transcript:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to analyze call. API Error: ${error.message}`);
        }
        throw new Error("An unexpected error occurred while communicating with the analysis service.");
    }
};


export const generateRebuttal = async (objection: string): Promise<string> => {
    try {
        const systemInstructionForRebuttal = `You are an expert real estate sales coach specializing in the Indian residential resale market. A potential buyer has raised an objection. Your task is to generate three distinct, effective, and consultative rebuttal strategies.
For each strategy, provide:
1.  **Strategy Name:** A short, descriptive name (e.g., "Acknowledge, Pivot, and Justify").
2.  **Explanation:** A brief explanation of the psychological principle behind the strategy.
3.  **Sample Script:** A clear, concise script that a sales agent can use directly.

The tone must be professional, empathetic, and aligned with a customer-centric, consultative sales approach (like NoBroker's style), not a high-pressure, traditional broker style. The language should be simple and natural, suitable for use in a Hinglish or English conversation. Do not use markdown. Format the output for easy readability with clear headings and line breaks.`;
        
        const contents = `The buyer's objection is: "${objection}"`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: {
                systemInstruction: systemInstructionForRebuttal,
                temperature: 0.5,
            },
        });

        return response.text;
    } catch (error) {
        console.error("Error generating rebuttal:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to generate rebuttal. API Error: ${error.message}`);
        }
        throw new Error("An unexpected error occurred while communicating with the analysis service.");
    }
};

export const generatePerformanceSummary = async (reports: AnalysisResult[]): Promise<string> => {
    try {
        const systemInstructionForSummary = `You are an expert performance analyst and sales coach for NoBroker. Your task is to synthesize multiple call quality reports into a single, concise executive summary. The user will provide you with an array of JSON objects, where each object is a detailed analysis of a single sales call.`;

        const reportsPayload = reports.map(r => ({
            agentName: r.agentName,
            overallScore: r.overallScore,
            detailedScores: r.detailedScores,
            callMoments: r.callMoments,
            brokerBehaviorAnalysis: r.brokerBehaviorAnalysis,
        }));

        const contents = `Based on the provided JSON data of ${reports.length} call analysis reports, please generate a performance summary. The data may be for a single agent or multiple agents.

Your summary MUST be structured with the following sections:

**1. Executive Summary:**
A brief, high-level overview of the key performance trends observed in these calls.

**2. Common Strengths:**
Identify and list 2-3 recurring positive behaviors or skills demonstrated across the calls. Use bullet points.

**3. Persistent Areas for Improvement:**
Identify and list 2-3 recurring weaknesses or missed opportunities. Be specific. Use bullet points.

**4. Actionable Coaching Plan:**
Provide 3 concrete, overarching coaching recommendations that would address the identified areas for improvement. Frame these as actionable steps.

**5. Standout Call (Optional):**
If one call is particularly excellent or particularly poor (based on its overall score and summary), briefly highlight it and explain why.

Format your entire response clearly. Do not output JSON or markdown. Use plain text with clear headings and bullet points (e.g., using '-' or '*').

Here is the data:
${JSON.stringify(reportsPayload)}
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: {
                systemInstruction: systemInstructionForSummary,
                temperature: 0.4,
            },
        });

        return response.text;
    } catch (error) {
        console.error("Error generating performance summary:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to generate summary. API Error: ${error.message}`);
        }
        throw new Error("An unexpected error occurred while communicating with the summary service.");
    }
};

export const generateCoachingPlan = async (agentEmail: string, reports: AnalysisResult[]): Promise<string> => {
    try {
        const systemInstructionForCoaching = `You are an expert sales coach for NoBroker. Your task is to analyze a collection of call quality reports for a specific Relationship Manager (RM) and generate a personalized, structured, and actionable weekly coaching plan.

The coaching plan MUST be structured with the following sections:

**1. Performance Overview:**
A brief, encouraging paragraph summarizing the agent's key strengths and primary area for growth based on the provided data.

**2. Weekly Focus Area:**
Clearly state ONE specific parameter or skill that should be the agent's primary focus for the week (e.g., "This week's focus: Improving 'Query & Objection Handling'").

**3. Actionable Coaching Tips (3 Tips):**
Provide three distinct, practical, and actionable tips to help the agent improve in their focus area. Frame them as clear instructions.

**4. Role-Play Scenario (1 Scenario):**
Create a short, relevant role-play scenario that the agent can practice with a manager or peer. The scenario should directly relate to the weekly focus area. Provide a prompt for the "buyer" and a goal for the "agent".

**5. Key Phrases to Practice (2-3 Phrases):**
List 2-3 specific, powerful phrases the agent can incorporate into their calls to improve in the focus area.

The tone should be constructive, positive, and motivating. Format your entire response clearly. Do not output JSON or markdown. Use plain text with clear headings and bullet points.`;

        const reportsPayload = reports.map(r => ({
            overallScore: r.overallScore,
            detailedScores: r.detailedScores?.map(d => ({ parameter: d.parameter, score: d.score })),
            areasForImprovement: r.callMoments?.areasForImprovement.map(a => a.area),
        }));

        const contents = `Please generate a weekly coaching plan for the agent: ${agentEmail}.
Here is a summary of their performance from their last ${reports.length} audited calls:
${JSON.stringify(reportsPayload, null, 2)}
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: {
                systemInstruction: systemInstructionForCoaching,
                temperature: 0.5,
            },
        });

        return response.text;
    } catch (error) {
        console.error("Error generating coaching plan:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to generate coaching plan. API Error: ${error.message}`);
        }
        throw new Error("An unexpected error occurred while communicating with the coaching service.");
    }
};

export const generateRootCauseAnalysis = async (parameter: string, reports: AnalysisResult[]): Promise<string> => {
    try {
        const systemInstructionForRootCause = `You are an expert sales performance analyst for NoBroker. Your task is to perform a root cause analysis on a set of call quality reports that show a team-wide weakness in a specific area.

The user will provide the name of the performance parameter and a collection of call analysis reports where agents scored poorly on this parameter.

Your analysis MUST:
1.  **Identify the Root Cause:** Go beyond stating the problem (e.g., "Agents are bad at cross-pitching"). Find the *underlying reason*. For example, "The root cause of poor cross-pitching is that agents are not actively listening for buying signals. In 70% of cases, buyers stated a secondary need (e.g., 'a bigger kitchen'), but agents did not use this as a cue to introduce another property."
2.  **Provide Evidence:** Support your conclusion with 2-3 specific (but anonymized) examples or common patterns from the provided data.
3.  **Recommend a Solution:** Propose a single, high-impact, actionable solution that a manager could implement to address the root cause. This could be a training exercise, a script update, or a process change.

Format your response as a concise, professional memo. Do not output JSON or markdown. Use plain text with clear headings.`;

        const reportsPayload = reports.map(r => ({
            overallScore: r.overallScore?.score,
            parameterScore: r.detailedScores?.find(p => p.parameter === parameter)?.score,
            positivePoints: r.callMoments?.positivePoints,
            areasForImprovement: r.callMoments?.areasForImprovement,
            // A small summary of transcript might be useful here, without the full thing
        }));

        const contents = `Please perform a root cause analysis for the parameter: "${parameter}".
The team is consistently scoring low in this area. Here is the data from the relevant poor-performing calls:
${JSON.stringify(reportsPayload, null, 2)}
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: {
                systemInstruction: systemInstructionForRootCause,
                temperature: 0.4,
            },
        });

        return response.text;
    } catch (error) {
        console.error("Error generating root cause analysis:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to generate root cause analysis. API Error: ${error.message}`);
        }
        throw new Error("An unexpected error occurred while communicating with the analysis service.");
    }
};

export const findCallOfTheWeek = async (reports: AuditEntry[]): Promise<string> => {
    try {
        const systemInstructionForCallOfTheWeek = `You are the Head of Quality for NoBroker. Your task is to review a selection of high-scoring calls and nominate one as the "Call of the Week." This call should serve as a training example for the entire team.

Your decision should be based not just on the overall score, but on the presence of specific, teachable "wow" moments described in the call summaries.

Your response MUST be structured as follows:

**Call of the Week Nomination**

**Agent:** [Agent's Email]
**Call Date:** [Call Timestamp]
**Overall Score:** [Score]

**Justification:**
A detailed, enthusiastic paragraph explaining *why* this specific call was chosen. Highlight the key behaviors and techniques that made it exceptional. Quote or paraphrase from the provided positive points to support your decision. Make it sound like a genuine award announcement.`;

        const reportsPayload = reports.map(r => ({
            id: r.id,
            agentEmail: r.agentEmail,
            callStamp: r.callStamp,
            overallScore: r.analysis.overallScore,
            positivePoints: r.analysis.callMoments?.positivePoints,
            rebuttalSummary: r.analysis.propertiesDiscussed?.[0]?.rebuttalHandling?.summary
        }));
        
        const contents = `Please select the "Call of the Week" from the following high-scoring calls. The call ID is for your reference but should not be in the final output.
${JSON.stringify(reportsPayload, null, 2)}
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: {
                systemInstruction: systemInstructionForCallOfTheWeek,
                temperature: 0.6,
            },
        });

        return response.text;
    } catch (error) {
        console.error("Error finding Call of the Week:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to find Call of the Week. API Error: ${error.message}`);
        }
        throw new Error("An unexpected error occurred while communicating with the analysis service.");
    }
};


export const transcribeAudio = async (audio: { data: string; mimeType: string }): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ inlineData: { data: audio.data, mimeType: audio.mimeType } }, { text: "Transcribe this audio." }] }
        });
        return response.text;
    } catch (error) {
        console.error("Error transcribing audio:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to transcribe audio. API Error: ${error.message}`);
        }
        throw new Error("An unexpected error occurred while transcribing audio.");
    }
};


// --- AI Role-Play Simulator Functions ---

export const startRolePlayChat = (scenario: string): Chat => {
    const systemInstructionForRolePlay = `You are an AI role-play simulator. You will act as a potential property buyer in the Indian real estate market. You must be skeptical, raise valid concerns, and behave like a real customer, not an easy-to-convince lead.
Your persona is that you are knowledgeable but cautious. You are looking for a good deal and are not afraid to point out flaws or ask tough questions.
Based on the user's chosen scenario, you will start the conversation and respond to the agent's attempts to handle your objections. Keep your responses concise and natural.

The initial scenario is: "${scenario}"

Your first message should be you, as the buyer, stating this objection.`;

    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstructionForRolePlay,
            temperature: 0.8, // Higher temperature for more creative, human-like responses
        }
    });
    return chat;
};


export const continueRolePlayChat = async (chat: Chat, userAudio: { data: string; mimeType: string }): Promise<string> => {
    try {
        const audioPart = {
            inlineData: {
                mimeType: userAudio.mimeType,
                data: userAudio.data,
            },
        };

        const response = await chat.sendMessage({ message: [audioPart] });
        
        return response.text;
    } catch (error) {
        console.error("Error in role-play chat:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to get role-play response. API Error: ${error.message}`);
        }
        throw new Error("An unexpected error occurred during the role-play session.");
    }
};

export const getRolePlayFeedback = async (chatHistory: Content[]): Promise<string> => {
    try {
        const systemInstructionForFeedback = `You are an expert sales coach. You have been provided with the transcript of a role-play session between a sales agent and an AI buyer. Your task is to provide a concise, actionable performance review for the agent.

The transcript is provided in the format of a chat history, with 'user' roles being the agent and 'model' roles being the AI buyer.

Your feedback MUST be structured with the following sections, using these exact headings and formatting:

**1. Overall Performance:**
A brief, one-paragraph summary of how the agent handled the objection.

**2. What Went Well:**
List 1-2 specific things the agent did correctly (e.g., "Good job acknowledging the buyer's concern immediately."). Use bullet points.

**3. Areas for Improvement:**
List 1-2 specific areas where the agent could have performed better. Use bullet points.

**4. Suggested Phrasing:**
Provide a concrete example of what the agent could have said differently to be more effective. If you have multiple suggestions, list them as bullet points.

**5. Overall Performance Score (0-100):**
A single integer score from 0 to 100 representing the agent's overall effectiveness in this scenario.
`;
        
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: chatHistory,
            config: {
                systemInstruction: systemInstructionForFeedback
            }
        });

        const response = await chat.sendMessage({ message: "Please provide feedback on my performance in this role-play session based on the full conversation history." });

        return response.text;

    } catch (error) {
        console.error("Error generating role-play feedback:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to generate feedback. API Error: ${error.message}`);
        }
        throw new Error("An unexpected error occurred while generating feedback.");
    }
};

export const analyzeTurnPerformance = async (utterance: string): Promise<{ score: number }> => {
    try {
        const systemInstruction = `You are a sales coach. Analyze the following agent statement. Rate its consultative quality on a scale of 1 to 10. A high score (8-10) means it's empathetic, open-ended, and builds rapport. A medium score (5-7) is acceptable but not great. A low score (1-4) means it's dismissive, argumentative, or overly aggressive. Respond ONLY with a JSON object like this: {"score":_}.`;
        const contents = `Statement: "${utterance}"`;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER } } }
            },
        });
        
        return JSON.parse(response.text.trim());
    } catch (error) {
        console.error("Error analyzing turn performance:", error);
        // Don't throw, just return a neutral score so the UI doesn't break
        return { score: 5 };
    }
};