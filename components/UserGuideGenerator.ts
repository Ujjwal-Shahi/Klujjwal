import jsPDF from 'jspdf';
// FIX: The module augmentation for 'jspdf' was causing a TypeScript error.
// It has been removed, and `jspdf-autotable` is now imported as a function `autoTable`
// to align with modern usage and fix the issue.
import autoTable from 'jspdf-autotable';

const FONT_SIZES = {
    TITLE: 20,
    H1: 16,
    H2: 12,
    BODY: 10,
    FOOTER: 8,
};
const MARGIN = 15;
const LINE_HEIGHT = 6;

const addPageNumbers = (doc: jsPDF) => {
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(FONT_SIZES.FOOTER);
        doc.setTextColor(150);
        doc.text(
            `Page ${i} of ${pageCount}`,
            doc.internal.pageSize.getWidth() - MARGIN,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'right' }
        );
    }
};

export const generateUserGuidePDF = () => {
    const doc = new jsPDF();
    let y = MARGIN;

    const checkPageBreak = (spaceNeeded: number) => {
        if (y + spaceNeeded > doc.internal.pageSize.getHeight() - MARGIN) {
            doc.addPage();
            y = MARGIN;
        }
    };

    const addTitle = (text: string) => {
        checkPageBreak(20);
        doc.setFontSize(FONT_SIZES.TITLE);
        doc.setFont('helvetica', 'bold');
        doc.text(text, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
        y += 10;
        doc.setFont('helvetica', 'normal');
    };

    const addHeading = (text: string) => {
        checkPageBreak(12);
        y += 6;
        doc.setFontSize(FONT_SIZES.H1);
        doc.setFont('helvetica', 'bold');
        doc.text(text, MARGIN, y);
        y += LINE_HEIGHT + 2;
        doc.setFont('helvetica', 'normal');
    };

    const addSubHeading = (text: string) => {
        checkPageBreak(10);
        doc.setFontSize(FONT_SIZES.H2);
        doc.setFont('helvetica', 'bold');
        doc.text(text, MARGIN, y);
        y += LINE_HEIGHT;
        doc.setFont('helvetica', 'normal');
    };

    const addText = (text: string, indent = 0) => {
        doc.setFontSize(FONT_SIZES.BODY);
        const lines = doc.splitTextToSize(text, doc.internal.pageSize.getWidth() - (MARGIN * 2) - indent);
        checkPageBreak(lines.length * LINE_HEIGHT);
        doc.text(lines, MARGIN + indent, y);
        y += lines.length * LINE_HEIGHT + 2;
    };
    
    const addBullet = (text: string) => {
        addText(`•  ${text}`, 5);
    };

    // --- Guide Content ---
    addTitle('Call Quality Analyzer - User Guide (v6.0)');
    addText("This guide provides an overview of the Call Quality Analyzer application. It's designed to help you leverage its powerful AI features to improve call performance.");
    
    addHeading("1. Core Features");
    addSubHeading("Dashboard");
    addText("The central hub for performance insights. It provides an at-a-glance view of team and agent performance, including:");
    addBullet("Key metrics like Total Audits and Team Average Score.");
    addBullet("Automated notifications for high-priority compliance issues and AI-detected coaching opportunities.");
    addBullet("Lists of top-performing agents and team-wide skill gaps.");

    addSubHeading("Leaderboard");
    addText("Fosters healthy competition and recognizes excellence. It ranks agents and auditors based on performance and activity, and showcases winners of achievement badges like 'Top Performer' and 'The Closer'.");

    addSubHeading("New Analysis");
    addText("This is where you audit a new call. The process is simple:");
    addBullet("1. Your Auditor profile is selected automatically on login.");
    addBullet("2. Select the Agent you are auditing from the dropdown.");
    addBullet("3. Enter the call details (Buyer ID, Timestamp).");
    addBullet("4. Upload the call audio file.");
    addBullet("5. Click 'Analyze Call'. The AI will process the audio and generate a full report.");

    checkPageBreak(50);
    addHeading("2. Reporting & History");
    addSubHeading("Audit History");
    addText("A comprehensive, searchable log of all audits performed in your browser. You can filter by agent, score, keywords, and red flags. Select multiple audits to generate a comparative AI summary.");
    
    addSubHeading("Best Practices");
    addText("A library of exemplary calls that have been nominated by auditors for their high quality. These serve as excellent training material for the entire team.");

    addHeading("3. AI-Powered Coaching Tools");
    addSubHeading("Coaching Hub");
    addText("An on-demand tool to help agents overcome challenges. Enter any buyer objection, and the AI will generate expert rebuttal strategies and scripts.");
    
    addSubHeading("Role-Play Simulator");
    addText("An interactive training module where agents can practice handling objections in real-time with an AI that simulates a skeptical buyer. After the session, the AI provides actionable feedback on the agent's performance.");

    checkPageBreak(50);
    addHeading("4. How The AI Works");
    addText("The 'How AI Works' tab provides a transparent, step-by-step breakdown of the AI's analysis pipeline, from initial audio transcription to the complex scoring logic and how coaching tips are generated.");

    addHeading("5. Data Management (Data Sync)");
    addText("This is a critical feature for team collaboration, as all data is stored locally in your browser.");
    addBullet("Export My Data: Saves a backup of your local audit history to a .json file. Share this file with your manager.");
    addBullet("Import & Merge Data: A manager can select multiple .json files from their team members to combine them into a single, unified dashboard on their machine.");
    
    addHeading("6. Scoring Parameters");
    // FIX: Changed from plugin style (doc.autoTable) to function style (autoTable(doc, ...)) to resolve module augmentation error and align with modern usage.
    autoTable(doc, {
        startY: y,
        head: [['Parameter', 'Description']],
        body: [
            ['Greeting & Opening', 'Agent greets professionally and sets a positive tone.'],
            ['Direct Lead Pitch & Info Sharing', 'Pitches existing leads and shares all 6 mandatory details.'],
            ['Buyer Requirement Gathering', 'Proactively asks for buyer needs (budget, location, etc.).'],
            ['Cross-Pitching', 'Suggests relevant new properties based on requirements.'],
            ['Query & Objection Handling', 'Effectively addresses all buyer questions and concerns.'],
            ['Call to Action (Site Visit)', 'Clearly attempts to schedule a property visit.'],
            ['Professionalism & Tone', 'Maintains a polite, confident, and professional tone.'],
            ['Conversation Flow & Engagement', 'Ensures the call is a two-way dialogue, not a monologue.'],
        ],
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185] },
    });

    addPageNumbers(doc);
    doc.save("Call_Quality_Analyzer_Guide_v6.pdf");
};
