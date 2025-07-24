import React, { useState, useEffect } from 'react';

// Define the color palette outside the component for global access
const colors = {
  primaryPink: '#ff2e63',
  lightGrey: '#eaeaea',
  slateBlue: '#3a4252',
  deepBlack: '#101216',
  accentPink: '#ff6189',
};

// Initial core questions - MOVED OUTSIDE COMPONENT
const initialCoreQuestions = [
  "Describe your current professional role and primary responsibilities.",
  "What are your top 3 career aspirations for the next 5 years?",
  "What specific skills or knowledge areas do you believe are most critical for your career growth in your industry?",
  "What is the biggest challenge you foresee in achieving your career goals?",
  "How do you currently approach professional development and learning new skills?"
];

// Helper function to generate visual capability bar
const generateCapabilityBar = (rating) => {
  const filled = '▓';
  const empty = '░';
  const totalBlocks = 5;
  const filledBlocks = Math.round(rating);
  const emptyBlocks = totalBlocks - filledBlocks;
  return filled.repeat(filledBlocks) + empty.repeat(emptyBlocks);
};

// Helper function to escape problematic characters for HTML embedding
const escapeHtmlString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/`/g, '&#96;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;');
};

// Helper function to render Markdown to HTML
const markdownToHtml = (markdown, colors) => {
  if (!markdown) return '';
  const lines = markdown.split('\n');
  let html = '';
  let inList = false;
  let inNumberedList = false;
  let inBlockquote = false;

  lines.forEach(line => {
    if (line.startsWith('> ')) {
      if (!inBlockquote) {
        if (inList) { html += '</ul>'; inList = false; }
        if (inNumberedList) { html += '</ol>'; inNumberedList = false; }
        html += `<div class="callout-box" style="background: ${colors.lightGrey}; border-left: 4px solid ${colors.primaryPink}; color: ${colors.deepBlack};">`;
        inBlockquote = true;
      }
      let content = line.substring(2).trim();
      content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html += `<p style="margin-bottom: 5px;">${escapeHtmlString(content)}</p>`;
    } else {
      if (inBlockquote) { html += '</div>'; inBlockquote = false; }

      if (line.startsWith('### ')) {
        if (inList) { html += '</ul>'; inList = false; }
        if (inNumberedList) { html += '</ol>'; inNumberedList = false; }
        html += `<h3 class="text-xl font-semibold mt-5 mb-2" style="color: ${colors.slateBlue};">${escapeHtmlString(line.substring(4))}</h3>`;
      } else if (line.startsWith('## ')) {
        if (inList) { html += '</ul>'; inList = false; }
        if (inNumberedList) { html += '</ol>'; inNumberedList = false; }
        html += `<h2 class="text-2xl font-semibold mt-6 mb-3" style="color: ${colors.slateBlue};">${escapeHtmlString(line.substring(3))}</h2>`;
      }
      else if (line.startsWith('* ') || line.startsWith('- ')) {
        if (!inList) { html += '<ul class="list-disc pl-6 mb-4 space-y-1">'; inList = true; }
        if (inNumberedList) { html += '</ol>'; inNumberedList = false; }
        let content = line.substring(2).trim();
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html += `<li class="mb-2" style="color: ${colors.deepBlack};">${escapeHtmlString(content)}</li>`;
      } else if (line.match(/^\d+\.\s/)) {
        if (!inNumberedList) { html += '<ol class="list-decimal pl-6 mb-4 space-y-1">'; inNumberedList = true; }
        if (inList) { html += '</ul>'; inList = false; }
        let content = line.split('. ')[1].trim();
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html += `<li class="mb-2" style="color: ${colors.deepBlack};">${escapeHtmlString(content)}</li>`;
      }
      else if (line.trim() === '') {
        if (inList) { html += '</ul>'; inList = false; }
        if (inNumberedList) { html += '</ol>'; inNumberedList = false; }
        html += '<br />';
      }
      else {
        if (inList) { html += '</ul>'; inList = false; }
        if (inNumberedList) { html += '</ol>'; inNumberedList = false; }
        let content = line.trim();
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html += `<p class="mb-2" style="color: ${colors.deepBlack};">${escapeHtmlString(content)}</p>`;
      }
    }
  });
  if (inList) { html += '</ul>'; }
  if (inNumberedList) { html += '</ol>'; }
  if (inBlockquote) { html += '</div>'; }
  return html;
};

// Function to generate the full HTML report for download (standalone)
const generateHtmlReport = (reportData, userProfile, colors) => {
  const date = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });

  const aiImpactHtml = reportData.aiReport?.aiImpactAnalysis ? markdownToHtml(reportData.aiReport.aiImpactAnalysis, colors) : '';
  const futureScenariosHtml = reportData.aiReport?.futureScenarios ? markdownToHtml(reportData.aiReport.futureScenarios, colors) : '';

  const actionPlanHtml30 = reportData.aiReport?.actionPlan?.day30 ? markdownToHtml(reportData.aiReport.actionPlan.day30, colors) : markdownToHtml(`
    1. **Ship the MVP:** Launch a minimal viable product for your core offering. Get it out there.
    2. **Gather Raw Feedback:** Engage directly with early users. Listen for friction, not just praise.
    3. **Define Your Edge:** Articulate what makes The Human Co. uniquely rebellious and practical.
  `, colors);
  const actionPlanHtml60 = reportData.aiReport?.actionPlan?.day60 ? markdownToHtml(reportData.aiReport.actionPlan.day60, colors) : markdownToHtml(`
    1. **Iterate Relentlessly:** Based on feedback, refine your offering. Don't cling to perfection.
    2. **Expand Your Reach:** Identify 1-2 strategic partnerships or speaking opportunities. Get uncomfortable in public.
    3. **Automate the Mundane:** Implement AI tools for repetitive tasks, freeing up your strategic time.
  `, colors);
  const actionPlanHtml90 = reportData.aiReport?.actionPlan?.day90 ? markdownToHtml(reportData.aiReport.actionPlan.day90, colors) : markdownToHtml(`
    1. **Scale Systems, Not Just Ideas:** Build repeatable processes for content, sales, or delivery. Your ideas scale fast. Your systems must too.
    2. **Amplify Your Voice:** Publish a thought leadership piece. Position yourself as a co-pilot for future leaders.
    3. **Re-evaluate & Reset:** Review your 90-day progress. What worked? What's next? Don't coast.
  `, colors);

  const actionPlanSummaryHtml = reportData.aiReport?.actionPlan?.summary ? markdownToHtml(reportData.aiReport.actionPlan.summary, colors) : '';

  let skillGapContentHtml = '';
  if (reportData.skillGapAnalysis?.skills) {
    skillGapContentHtml += `<h3 class="text-xl font-semibold mt-5 mb-2" style="color: ${colors.slateBlue};">Identified Skill Gaps & Priorities</h3>`;

    const sortedSkills = [...reportData.skillGapAnalysis.skills].sort((a, b) => {
      const gapA = a.importanceRating - a.currentCapabilityRating;
      const gapB = b.importanceRating - b.currentCapabilityRating;
      if (gapA !== gapB) return gapB - gapA;
      return b.importanceRating - a.importanceRating;
    });

    sortedSkills.forEach(skill => {
      const capabilityBar = generateCapabilityBar(skill.currentCapabilityRating);
      let priorityTag = 'Low Priority';
      const gap = skill.importanceRating - skill.currentCapabilityRating;

      if (skill.importanceRating >= 4 && skill.currentCapabilityRating <= 2) {
        priorityTag = 'Immediate Focus';
      } else if (skill.importanceRating >= 3 && gap >= 1) {
        priorityTag = 'Emerging Priority';
      }

      skillGapContentHtml += `
        <div class="mb-4 p-3 rounded-lg border" style="border-color: ${colors.lightGrey}; background: #fdfdfd;">
            <p class="font-bold mb-1" style="color: ${colors.deepBlack};">${escapeHtmlString(skill.skillName)}</p>
            <div class="flex items-center text-sm mb-1">
                <span style="color: ${colors.slateBlue};">Importance: ${skill.importanceRating}/5</span>
                <span class="mx-2 text-gray-400">|</span>
                <span style="color: ${colors.slateBlue};">Capability: ${skill.currentCapabilityRating}/5</span>
                <span class="mx-2 text-gray-400">|</span>
                <span class="font-bold" style="color: ${priorityTag === 'Immediate Focus' ? '#ef4444' : (priorityTag === 'Emerging Priority' ? '#f59e0b' : colors.slateBlue)};">${priorityTag}</span>
            </div>
            <p class="text-sm" style="color: ${colors.deepBlack};">${capabilityBar} ${escapeHtmlString(skill.description)}</p>
        </div>
      `;
    });
    if (reportData.skillGapAnalysis.summary) {
      skillGapContentHtml += `<h3 class="text-xl font-semibold mt-5 mb-2" style="color: ${colors.slateBlue};">Skill Focus</h3>`;
      skillGapContentHtml += markdownToHtml(reportData.skillGapAnalysis.summary, colors);
    }
  }

  let htmlContentSections = '';
  if (reportData.aiReport) {
    htmlContentSections += `
    <div class="section" id="ai-impact-analysis">
        <h2 class="text-xl font-semibold mb-4 text-slate-blue">AI Impact Analysis</h2>
        <div class="prose">
            ${aiImpactHtml}
        </div>
    </div>

    <div class="section" id="future-scenarios">
        <h2 class="text-xl font-semibold mb-4 text-slate-blue">Future Scenarios</h2>
        <div class="prose">
            ${futureScenariosHtml}
        </div>
    </div>

    <div class="section" id="personalized-action-plan">
        <h2 class="text-xl font-semibold mb-4 text-slate-blue">Personalized Action Plan</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 action-plan-grid">
            <div class="action-plan-column">
                <h3>📅 30-Day Plan</h3>
                <div class="prose">
                    ${actionPlanHtml30}
                </div>
            </div>
            <div class="action-plan-column">
                <h3>📅 60-Day Plan</h3>
                <div class="prose">
                    ${actionPlanHtml60}
                </div>
            </div>
            <div class="action-plan-column">
                <h3>📅 90-Day Plan</h3>
                <div class="prose">
                    ${actionPlanHtml90}
                </div>
            </div>
        </div>
        ${actionPlanSummaryHtml}
    </div>
    `;
  }

  if (reportData.skillGapAnalysis) {
    htmlContentSections += `
    <div class="section" id="skill-gap-analysis">
        <h2 class="text-xl font-semibold mb-4 text-slate-blue">Skill Gap Analysis</h2>
        <div class="prose">
            ${skillGapContentHtml}
        </div>
    </div>
    `;
  }

  let finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Career Readiness Report for ${escapeHtmlString(userProfile.role)}</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body {
            font-family: 'Inter', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #101216;
            background-color: #eaeaea;
        }
        .header {
            background: linear-gradient(135deg, #ff2e63 0%, #ff6189 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 30px;
        }
        .section {
            margin-bottom: 40px;
            padding: 20px;
            border: 1px solid #eaeaea;
            border-radius: 8px;
            background: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        .prose h1, .prose h2, .prose h3 {
            color: #3a4252;
        }
        .list-disc, .list-decimal {
            margin-left: 1.5rem;
        }
        .list-disc li, .list-decimal li {
            margin-bottom: 0.5rem;
            color: #101216;
        }
        a {
            color: #ff6189;
        }
        strong {
            color: #3a4252;
            font-weight: 600;
        }
        .callout-box {
            margin-top: 20px;
            padding: 15px;
            background: #eaeaea;
            border-left: 4px solid #ff2e63;
            border-radius: 4px;
            color: #101216;
        }
        .callout-box p {
            margin-bottom: 5px;
        }
        .toc-link {
            display: block;
            padding: 8px 12px;
            margin-bottom: 5px;
            background-color: #eaeaea;
            border-radius: 5px;
            color: #3a4252;
            text-decoration: none;
            transition: background-color 0.2s ease-in-out;
        }
        .toc-link:hover {
            background-color: #ff2e63;
            color: white;
        }
        .action-plan-column {
            background-color: #eaeaea;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            height: 100%;
        }
        .action-plan-column h3 {
            color: #ff2e63;
            margin-top: 0;
            margin-bottom: 10px;
        }
        @media print {
            .section {
                break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="text-3xl font-bold mb-2">AI-Powered Career Readiness Report</h1>
        <p class="text-lg">Here's your personalised report based on your role as Creative Director & Founder of The Human Co. You're not just watching the future of work unfold — you're helping shape it. Let's get to work.</p>
        <p class="text-sm opacity-90">Generated on ${date}</p>
    </div>

    <div class="section">
        <h2 class="text-xl font-semibold mb-4 text-slate-blue">Table of Contents</h2>
        <nav>
            <a href="#ai-impact-analysis" class="toc-link">AI Impact Analysis</a>
            <a href="#future-scenarios" class="toc-link">Future Scenarios</a>
            <a href="#personalized-action-plan" class="toc-link">Personalized Action Plan</a>
            <a href="#skill-gap-analysis" class="toc-link">Skill Gap Analysis</a>
            <a href="#next-steps" class="toc-link">Next Steps</a>
        </nav>
    </div>

    <div class="section">
        <h2 class="text-xl font-semibold mb-4 text-slate-blue">Assessment Summary</h2>
        <p>This report provides a comprehensive analysis of your career readiness, including AI impact analysis, future scenarios, and a personalized action plan, based on your responses.</p>
    </div>` + htmlContentSections + `
    <div class="section" id="next-steps">
        <h2 class="text-xl font-semibold mb-4 text-slate-blue">Next Steps</h2>
        <p>Your career development journey continues beyond this assessment. Consider:</p>
        <ul class="list-disc pl-6 mb-4">
            <li>Reviewing your development plan monthly</li>
            <li>Tracking progress on priority skills</li>
            <li>Exploring recommended resources and tools</li>
            <li>Reflecting on career scenarios as opportunities arise</li>
            <li>Retaking this assessment quarterly to track growth</li>
        </ul>
        <p class="callout-box" style="background: #eaeaea; border-left: 4px solid #ff2e63; color: #101216;">
            <strong>Remember:</strong> Your career isn't a straight line—and neither is the future. The goal isn't to predict the future perfectly, but to build the adaptability and curiosity to thrive in whatever comes next.
        </p>
    </div>

    <div style="text-align: center; margin-top: 40px; padding: 20px; background: #eaeaea; border-radius: 8px;">
        <p style="margin: 0; color: #3a4252; font-size: 0.9rem;">
            Learn more about future-ready career strategies at
            <a href="https://thehumanco.co" style="color: #ff6189;">thehumanco.co</a>
        </p>
    </div>
</body>
</html>`;

  return finalHtml.replace(/&#96;/g, '`');
};

// Component to render Markdown content (for display within the app)
const MarkdownRenderer = ({ reportData }) => {
  if (!reportData || (!reportData.aiReport && !reportData.skillGapAnalysis)) {
    return null;
  }

  const renderSkillGapAnalysis = () => {
    if (!reportData.skillGapAnalysis?.skills) return null;

    const sortedSkills = [...reportData.skillGapAnalysis.skills].sort((a, b) => {
      const gapA = a.importanceRating - a.currentCapabilityRating;
      const gapB = b.importanceRating - b.currentCapabilityRating;
      if (gapA !== gapB) return gapB - gapA;
      return b.importanceRating - a.importanceRating;
    });

    return (
      <>
        <h2 className="text-2xl font-semibold mt-6 mb-3" style={{ color: colors.slateBlue }}>Skill Gap Analysis</h2>
        <h3 className="text-xl font-semibold mt-5 mb-2" style={{ color: colors.slateBlue }}>Identified Skill Gaps & Priorities</h3>
        {sortedSkills.map((skill, index) => {
          const capabilityBar = generateCapabilityBar(skill.currentCapabilityRating);
          let priorityTag = 'Low Priority';
          const gap = skill.importanceRating - skill.currentCapabilityRating;

          if (skill.importanceRating >= 4 && skill.currentCapabilityRating <= 2) {
            priorityTag = 'Immediate Focus';
          } else if (skill.importanceRating >= 3 && gap >= 1) {
            priorityTag = 'Emerging Priority';
          }

          return (
            <div key={index} className="mb-4 p-3 rounded-lg border" style={{ borderColor: colors.lightGrey, background: '#fdfdfd' }}>
              <p className="font-bold mb-1" style={{ color: colors.deepBlack }}>{skill.skillName}</p>
              <div className="flex items-center text-sm mb-1">
                  <span style={{ color: colors.slateBlue }}>Importance: {skill.importanceRating}/5</span>
                  <span className="mx-2 text-gray-400">|</span>
                  <span style={{ color: colors.slateBlue }}>Capability: {skill.currentCapabilityRating}/5</span>
                  <span className="mx-2 text-gray-400">|</span>
                  <span className="font-bold" style={{ color: priorityTag === 'Immediate Focus' ? '#ef4444' : (priorityTag === 'Emerging Priority' ? '#f59e0b' : colors.slateBlue)}}>{priorityTag}</span>
              </div>
              <p className="text-sm" style={{ color: colors.deepBlack }}>{capabilityBar} {skill.description}</p>
            </div>
          );
        })}
        {reportData.skillGapAnalysis.summary && (
          <>
            <h3 className="text-xl font-semibold mt-5 mb-2" style={{ color: colors.slateBlue }}>Skill Focus</h3>
            <div dangerouslySetInnerHTML={{ __html: markdownToHtml(reportData.skillGapAnalysis.summary, colors) }} />
          </>
        )}
      </>
    );
  };

  const renderActionPlan = () => {
    if (!reportData.aiReport?.actionPlan) return null;

    const actionPlan = reportData.aiReport.actionPlan;
    return (
      <>
        <h2 className="text-2xl font-semibold mt-6 mb-3" style={{ color: colors.slateBlue }}>Personalized Action Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="action-plan-column" style={{ backgroundColor: colors.lightGrey }}>
            <h3>📅 30-Day Plan</h3>
            <div dangerouslySetInnerHTML={{ __html: markdownToHtml(actionPlan.day30, colors) }} />
          </div>
          <div className="action-plan-column" style={{ backgroundColor: colors.lightGrey }}>
            <h3>📅 60-Day Plan</h3>
            <div dangerouslySetInnerHTML={{ __html: markdownToHtml(actionPlan.day60, colors) }} />
          </div>
          <div className="action-plan-column" style={{ backgroundColor: colors.lightGrey }}>
            <h3>📅 90-Day Plan</h3>
            <div dangerouslySetInnerHTML={{ __html: markdownToHtml(actionPlan.day90, colors) }} />
          </div>
        </div>
        {actionPlan.summary && (
          <div dangerouslySetInnerHTML={{ __html: markdownToHtml(actionPlan.summary, colors) }} />
        )}
      </>
    );
  };

  return (
    <div className="markdown-body">
      {reportData.aiReport && (
        <>
          <h2 className="text-2xl font-semibold mt-6 mb-3" style={{ color: colors.slateBlue }}>AI Impact Analysis</h2>
          <div dangerouslySetInnerHTML={{ __html: markdownToHtml(reportData.aiReport.aiImpactAnalysis, colors) }} />

          <h2 className="text-2xl font-semibold mt-6 mb-3" style={{ color: colors.slateBlue }}>Future Scenarios</h2>
          <div dangerouslySetInnerHTML={{ __html: markdownToHtml(reportData.aiReport.futureScenarios, colors) }} />

          {renderActionPlan()}
        </>
      )}

      {renderSkillGapAnalysis()}
    </div>
  );
};

// Main App Component
const App = () => {
  const [currentPage, setCurrentPage] = useState('intro');
  const [userProfile, setUserProfile] = useState({ role: '', industry: '' });
  const [answers, setAnswers] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  const [skillGapAnalysis, setSkillGapAnalysis] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportDownloadContent, setReportDownloadContent] = useState('');
  const [currentInput, setCurrentInput] = useState('');
  const [isGeneratingSkillGap, setIsGeneratingSkillGap] = useState(false);

  const reportSchema = {
    type: "OBJECT",
    properties: {
      aiImpactAnalysis: { "type": "STRING" },
      futureScenarios: { "type": "STRING" },
      actionPlan: {
        type: "OBJECT",
        properties: {
          day30: { "type": "STRING" },
          day60: { "type": "STRING" },
          day90: { "type": "STRING" },
          summary: { "type": "STRING" }
        },
        propertyOrdering: ["day30", "day60", "day90", "summary"]
      }
    },
    propertyOrdering: ["aiImpactAnalysis", "futureScenarios", "actionPlan"]
  };

  const skillGapSchema = {
    type: "OBJECT",
    properties: {
      skills: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            skillName: { "type": "STRING" },
            importanceRating: { "type": "NUMBER" },
            currentCapabilityRating: { "type": "NUMBER" },
            description: { "type": "STRING" }
          },
          propertyOrdering: ["skillName", "importanceRating", "currentCapabilityRating", "description"]
        }
      },
      summary: { "type": "STRING" }
    },
    propertyOrdering: ["skills", "summary"]
  };

  useEffect(() => {
    setQuestions(initialCoreQuestions);
  }, []);

  const callGeminiAPI = async (prompt, isStructured = false, schema = null, setLoadingState = null) => {
    if (setLoadingState) setLoadingState(true);
    let chatHistory = [];
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });

    const payload = { contents: chatHistory };
    if (isStructured && schema) {
      payload.generationConfig = {
        responseMimeType: "application/json",
        responseSchema: schema
      };
    }

    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        let text = result.candidates[0].content.parts[0].text;
        if (isStructured) {
          try {
            return JSON.parse(text);
          } catch (e) {
            console.error("Failed to parse JSON response:", e, text);
            return null;
          }
        }
        return text;
      } else {
        console.error("Unexpected API response structure:", result);
        return "Error: Could not generate content. Please try again.";
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      return "Error: Failed to connect to AI. Please check your network.";
    } finally {
      if (setLoadingState) setLoadingState(false);
    }
  };

  const handleStartAssessment = () => {
    setShowProfileModal(true);
  };

  const handleSaveProfile = () => {
    if (userProfile.role && userProfile.industry) {
      setShowProfileModal(false);
      setCurrentPage('assessment');
    } else {
      console.log("Please enter your role and industry to start the assessment.");
    }
  };

  const handleSubmitAnswer = async (question, answer) => {
    if (!answer.trim
