import React, { useState, useEffect, useMemo } from 'react';

// Define the color palette outside the component for global access
const colors = {
  primaryPink: '#ff2e63',
  lightGrey: '#eaeaea',
  slateBlue: '#3a4252',
  deepBlack: '#101216',
  accentPink: '#ff6189',
};

// Helper function to generate visual capability bar
const generateCapabilityBar = (rating) => {
  const filled = '▓'; // Full block
  const empty = '░'; // Empty block
  const totalBlocks = 5;
  const filledBlocks = Math.round(rating); // Round to nearest whole number for blocks
  const emptyBlocks = totalBlocks - filledBlocks;
  return filled.repeat(filledBlocks) + empty.repeat(emptyBlocks);
};

// Helper function to escape problematic characters for HTML embedding
const escapeHtmlString = (str) => {
  if (typeof str !== 'string') return str; // Ensure it's a string before processing
  return str
    .replace(/`/g, '&#96;') // HTML entity for backtick
    .replace(/'/g, '&#39;') // HTML entity for single quote
    .replace(/"/g, '&quot;'); // HTML entity for double quote
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
    // Handle Blockquotes (Callout Boxes)
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

// Component to render Markdown content (for display within the app)
const MarkdownRenderer = ({ reportData }) => {
  const renderSkillGapAnalysis = () => {
    const skillGapData = reportData?.skillGapAnalysis;
    if (!skillGapData?.skills) return null;

    const sortedSkills = [...skillGapData.skills].sort((a, b) => {
      const gapA = a.importanceRating - a.currentCapabilityRating;
      const gapB = b.importanceRating - b.currentCapabilityRating;
      if (gapA !== gapB) return gapB - gapA; // Sort by gap first
      return b.importanceRating - a.importanceRating; // Then by importance
    });

    return (
      <div className="section">
        <h2 className="text-xl font-semibold mb-4 text-slate-blue">Skill Gap Analysis</h2>
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
        {skillGapData.summary && (
          <>
            <h3 className="text-xl font-semibold mt-5 mb-2" style={{ color: colors.slateBlue }}>Skill Focus</h3>
            <div dangerouslySetInnerHTML={{ __html: markdownToHtml(skillGapData.summary, colors) }} />
          </>
        )}
      </div>
    );
  };

  const renderActionPlan = () => {
    const aiReportData = reportData?.aiReport;
    if (!aiReportData?.actionPlan) return null;

    const actionPlan = aiReportData.actionPlan;
    
    // Safety check - if actionPlan doesn't have the data we expect, don't render
    if (!actionPlan.day30 || !actionPlan.day60 || !actionPlan.day90) {
      return (
        <div className="section">
          <h2 className="text-xl font-semibold mb-4 text-slate-blue">Personalized Action Plan</h2>
          <p>Action plan is being generated...</p>
        </div>
      );
    }
      
    return (
      <div className="section">
        <h2 className="text-xl font-semibold mb-4 text-slate-blue">Personalized Action Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="action-plan-column" style={{ backgroundColor: colors.lightGrey }}>
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.primaryPink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-check"><path d="M8 2v4"/><path d="M16 2v4"/><path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"/><path d="M21 13a5 5 0 1 1-5 5h5v-5Z"/><path d="M16 18h2l4 4"/></svg>
              30-Day Plan
            </h3>
            <div dangerouslySetInnerHTML={{ __html: markdownToHtml(actionPlan.day30, colors) }} />
          </div>
          <div className="action-plan-column" style={{ backgroundColor: colors.lightGrey }}>
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.primaryPink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-plus"><path d="M21 12V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M18 21v-6"/><path d="M15 18h6"/></svg>
              60-Day Plan
            </h3>
            <div dangerouslySetInnerHTML={{ __html: markdownToHtml(actionPlan.day60, colors) }} />
          </div>
          <div className="action-plan-column" style={{ backgroundColor: colors.lightGrey }}>
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.primaryPink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-range"><path d="M21 10H3"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M16 14H8"/></svg>
              90-Day Plan
            </h3>
            <div dangerouslySetInnerHTML={{ __html: markdownToHtml(actionPlan.day90, colors) }} />
          </div>
        </div>
        {actionPlan.summary && (
          <div dangerouslySetInnerHTML={{ __html: markdownToHtml(actionPlan.summary, colors) }} />
        )}
      </div>
    );
  };

  const renderAiReport = () => {
    const aiReportData = reportData?.aiReport;
    if (!aiReportData) return null;
    return (
      <>
        <div className="section">
          <h2 className="text-xl font-semibold mb-4 text-slate-blue">AI Impact Analysis</h2>
          <div dangerouslySetInnerHTML={{ __html: markdownToHtml(aiReportData.aiImpactAnalysis, colors) }} />
        </div>

        <div className="section">
          <h2 className="text-xl font-semibold mb-4 text-slate-blue">Future Scenarios</h2>
          <div dangerouslySetInnerHTML={{ __html: markdownToHtml(aiReportData.futureScenarios, colors) }} />
        </div>

        {aiReportData.actionPlan && (
          <div className="section">
            {renderActionPlan()}
          </div>
        )}
      </>
    );
  };

  const aiReportData = reportData?.aiReport;
  const skillGapData = reportData?.skillGapAnalysis;

  if (!aiReportData && !skillGapData) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-700">The report could not be generated. Please ensure your API key is correctly set up.</p>
      </div>
    );
  }

  return (
    <div className="prose max-w-none leading-relaxed mb-8 p-2" style={{ borderColor: colors.slateBlue, color: colors.deepBlack }}>
      {aiReportData && (
        <>
          {renderAiReport()}
        </>
      )}
      {skillGapData && (
        <>
          <div className="section">
            {renderSkillGapAnalysis()}
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px', padding: '20px', background: colors.lightGrey, borderRadius: '8px', width: '100%' }}>
            <p style={{ margin: '0', color: colors.slateBlue, fontSize: '0.9rem' }}>
                Created by <a href="https://thehumanco.co" target="_blank" rel="noopener noreferrer" style={{ color: colors.accentPink, textDecoration: 'underline' }}>The Human Co.</a>
            </p>
          </div>
        </>
      )}
    </div>
  );
};

// Main App Component
const App = () => {
  const [currentPage, setCurrentPage] = useState('intro'); // 'intro', 'assessment', 'results'
  const [userProfile, setUserProfile] = useState({ role: '', industry: '' });
  const [answers, setAnswers] = useState([]); // Stores { question: '...', answer: '...' }
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]); // Core questions + dynamically generated ones
  const [isLoading, setIsLoading] = useState(false);
  // Changed aiReport and skillGapAnalysis to store structured objects
  const [aiReport, setAiReport] = useState(null);
  const [skillGapAnalysis, setSkillGapAnalysis] = useState(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentInput, setCurrentInput] = useState(''); // State to manage current textarea input

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
            importanceRating: { "type": "NUMBER" }, // 1-5
            currentCapabilityRating: { "type": "NUMBER" }, // 1-5
            description: { "type": "STRING" } // Concise paragraph
          },
          propertyOrdering: ["skillName", "importanceRating", "currentCapabilityRating", "description"]
        }
      },
      summary: { "type": "STRING" } // For the "Skill Focus" callout
    },
    propertyOrdering: ["skills", "summary"]
  };

  const initialCoreQuestions = useMemo(() => [
    "Describe your current professional role and primary responsibilities.",
    "What are your top 3 career aspirations for the next 5 years?",
    "What specific skills or knowledge areas do you believe are most critical for your career growth in your industry?",
    "What is the biggest challenge you foresee in achieving your career goals?",
    "How do you currently approach professional development and learning new skills?"
  ], []);

  useEffect(() => {
    setQuestions(initialCoreQuestions);
  }, [initialCoreQuestions]);

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

    const apiKey = 'AIzaSyDuEZHbkbKCONWxtKyTDDf5CoJMd9JToQI';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    console.log("API Key being used (first few chars):", apiKey ? apiKey.substring(0, 5) + "..." : "Not set");
    console.log("Calling Gemini API with prompt:", prompt);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      console.log("Gemini API raw response:", result);

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        let text = result.candidates[0].content.parts[0].text;
        console.log("Gemini API response text:", text);
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
    if (!answer.trim()) {
      console.log("Please provide an answer before proceeding.");
      return;
    }

    const updatedAnswers = [...answers, { question, answer }];
    setAnswers(updatedAnswers);
    setCurrentInput('');

    if (currentQuestionIndex < initialCoreQuestions.length - 1) {
      const prompt = `Given the user's role as "${userProfile.role}" in the "${userProfile.industry}" industry, and their previous answer to the question "${question}" which was "${answer}", generate a single, concise follow-up question to delve deeper into their career readiness or aspirations. The question should be adaptive and relevant to their specific context.`;
      const newQuestion = await callGeminiAPI(prompt, false, null, setIsLoading);
      if (newQuestion && !newQuestion.startsWith("Error:")) {
        setQuestions(prevQuestions => [...prevQuestions, newQuestion]);
        setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      } else {
        console.log("Failed to generate a follow-up question. Moving to the next core question.");
        setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      }
    } else if (currentQuestionIndex === questions.length - 1) {
      await generateFullReport(updatedAnswers);
    } else {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    }
  };

  const generateFullReport = async (allAnswers) => {
    setIsLoading(true);
    setCurrentPage('results');

    let fullPrompt = `Generate a comprehensive career readiness report for a user with the following profile:\n`;
    fullPrompt += `Role: ${userProfile.role}\nIndustry: ${userProfile.industry}\n\n`;
    fullPrompt += `Based on their answers to the following questions:\n\n`;

    allAnswers.forEach((item, index) => {
      fullPrompt += `Question ${index + 1}: ${item.question}\n`;
      fullPrompt += `Answer ${index + 1}: ${item.answer}\n\n`;
    });

    fullPrompt += `The report should be a JSON object with three keys: "aiImpactAnalysis", "futureScenarios", and "actionPlan". Each value should be Markdown text for that section.\n`;
    fullPrompt += `For "aiImpactAnalysis", keep paragraphs concise (max 3-4 lines). Use bullet points for key insights. At the end, include a "Key Takeaway" summary box, formatted as a Markdown blockquote (> Key Takeaway: Your summary here.).\n`;
    fullPrompt += `For "futureScenarios", generate three distinct future scenarios relevant to their career path, considering industry trends. Each scenario should start with '### Scenario X: [Scenario Title]' and include concise paragraphs and bullet points. For each scenario, describe not just the potential success, but also **what stands in the way right now**, using conditional "this future happens if..." phrasing to drive action. Introduce **operational debt, personal blind spots, or growth risks** that need solving. At the end of this section, include a "What to do next" summary box, formatted as a Markdown blockquote (> What to do next: Your summary here.).\n`;
    fullPrompt += `For "actionPlan", provide a 30/60/90-day roadmap. This should be a JSON object with keys "day30", "day60", "day90", and "summary". Each of "day30", "day60", "day90" should contain Markdown text with concrete, actionable steps tailored to their specific answers, role, and industry. **It is absolutely critical that all three day plans (30, 60, 90) are fully populated with content. If unique ideas are limited, provide general but relevant actions for that timeframe to ensure no section is left blank.** Remove checklist-style phrasing. Make each item a **challenge with a clear call to courage or decisive movement**. Use **active voice** (e.g., "Ship something before it's perfect.", "Get uncomfortable in public."). Use numbered lists for steps. Use bolding for key terms within list items (e.g., **Toolkit MVP**). The "summary" key should contain Markdown text for a "Key Action" summary box, formatted as a Markdown blockquote (> Key Action: Your summary here.).\n`;
    fullPrompt += `Optionally, somewhere in the report (e.g., within AI Impact Analysis or Action Plan), include 1-2 punchy, emotionally intelligent lines as a "Truth You Might Be Avoiding" sidebar, formatted as a Markdown blockquote (> Truth You Might Be Avoiding: Your uncomfortable truth here.).\n`;
    fullPrompt += `Maintain a confident, future-focused, human-first, strategic, and jargon-free tone, reflecting 'The Human Co.' ethos of being rebellious but practical. Prioritise clarity, movement and momentum. The tone should feel like a trusted advisor who knows the game and won't let you coast.`;

    const reportContent = await callGeminiAPI(fullPrompt, true, reportSchema, setIsLoading);
    console.log("What we got back from AI:", reportContent);
    setAiReport(reportContent);
  };

  // Generate Skill Gap Analysis
  const handleGenerateSkillGapAnalysis = async () => {
    if (skillGapAnalysis) return;

    setIsGeneratingSkillGap(true);
    let prompt = `Given the user's role as "Creative Director & Founder of The Human Co." in the "${userProfile.industry}" industry, and their career aspirations derived from the assessment:\n`;
    answers.forEach(item => {
      prompt += `- ${item.question}: ${item.answer}\n`;
    });
    prompt += `\nAnalyze this information to identify potential skill gaps for their desired career growth. Return a JSON object with two keys: "skills" (an array of skill objects) and "summary" (Markdown text for a summary callout).\n`;
    prompt += `Each skill object in the "skills" array should have "skillName" (string), "importanceRating" (number 1-5, how critical is this skill for their goals?), "currentCapabilityRating" (number 1-5, their current proficiency), and "description" (string, concise paragraph).\n`;
    prompt += `**Order the skills from most critical to least critical**, where criticality is determined by a high importance rating and a low current capability rating (i.e., the biggest gaps first). For each skill, also indicate its priority: "Immediate Focus" (big gap, high importance), "Emerging Priority" (moderate gap/importance), or "Low Priority" (small gap/low importance).\n`;
    prompt += `**Sharpen the language:** Avoid vague or polite language. Make the **cost of not closing the gap explicit**. Where relevant, **contrast ambition with infrastructure** (e.g., "Your ideas scale fast. Your systems don't."). Keep paragraphs concise (max 3-4 lines). Use bolding for key terms.\n`;
    prompt += `The "summary" key should contain Markdown text for a "Skill Focus" summary box, formatted as a Markdown blockquote (> Skill Focus: Your summary here.).\n`;
    prompt += `Maintain a confident, future-focused, human-first, strategic, and jargon-free tone, reflecting 'The Human Co.' ethos of being rebellious but practical. Prioritise clarity, movement and momentum. The tone should feel like a trusted advisor who knows the game and won't let you coast.`;

    const analysis = await callGeminiAPI(prompt, true, skillGapSchema, setIsGeneratingSkillGap);
    setSkillGapAnalysis(analysis);
  };

  // Effect to update reportDownloadContent whenever aiReport or skillGapAnalysis changes
  useEffect(() => {
    if (aiReport || skillGapAnalysis) {
      // Note: generateHtmlReport function is not defined in your code, so this line will cause an error
      // You'll need to either remove this or add the generateHtmlReport function
      // setReportDownloadContent(generateHtmlReport({ aiReport, skillGapAnalysis }, userProfile, colors));
    }
  }, [aiReport, skillGapAnalysis, userProfile]);

  // Download the report
  const handleDownloadReport = () => {
    // Create comprehensive HTML with all report content
    const renderReportSection = (title, content) => {
      if (!content) return '';
      return `
        <div class="section">
          <h2>${title}</h2>
          ${markdownToHtml(content, colors)}
        </div>
      `;
    };

    const renderSkillGapHtml = () => {
      if (!skillGapAnalysis?.skills) return '';
      
      let skillsHtml = '<h3>Identified Skill Gaps & Priorities</h3>';
      
      const sortedSkills = [...skillGapAnalysis.skills].sort((a, b) => {
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

        const priorityColor = priorityTag === 'Immediate Focus' ? '#ef4444' : 
                             (priorityTag === 'Emerging Priority' ? '#f59e0b' : colors.slateBlue);

        skillsHtml += `
          <div style="margin-bottom: 20px; padding: 15px; border: 1px solid ${colors.lightGrey}; border-radius: 8px; background: #fdfdfd;">
            <p style="font-weight: bold; margin-bottom: 5px; color: ${colors.deepBlack};">${skill.skillName}</p>
            <div style="font-size: 14px; margin-bottom: 5px;">
              <span style="color: ${colors.slateBlue};">Importance: ${skill.importanceRating}/5</span>
              <span style="margin: 0 8px; color: #9ca3af;">|</span>
              <span style="color: ${colors.slateBlue};">Capability: ${skill.currentCapabilityRating}/5</span>
              <span style="margin: 0 8px; color: #9ca3af;">|</span>
              <span style="font-weight: bold; color: ${priorityColor};">${priorityTag}</span>
            </div>
            <p style="font-size: 14px; color: ${colors.deepBlack};">${capabilityBar} ${skill.description}</p>
          </div>
        `;
      });

      if (skillGapAnalysis.summary) {
        skillsHtml += `<h3>Skill Focus</h3>${markdownToHtml(skillGapAnalysis.summary, colors)}`;
      }

      return skillsHtml;
    };

    const renderActionPlanHtml = () => {
      if (!aiReport?.actionPlan) return '';
      
      const actionPlan = aiReport.actionPlan;
      if (!actionPlan.day30 || !actionPlan.day60 || !actionPlan.day90) return '';

      return `
        <h2>Personalized Action Plan</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px;">
          <div style="background: ${colors.lightGrey}; padding: 20px; border-radius: 8px;">
            <h3 style="color: ${colors.primaryPink}; display: flex; align-items: center; gap: 10px;">
              📅 30-Day Plan
            </h3>
            ${markdownToHtml(actionPlan.day30, colors)}
          </div>
          <div style="background: ${colors.lightGrey}; padding: 20px; border-radius: 8px;">
            <h3 style="color: ${colors.primaryPink}; display: flex; align-items: center; gap: 10px;">
              📅 60-Day Plan
            </h3>
            ${markdownToHtml(actionPlan.day60, colors)}
          </div>
          <div style="background: ${colors.lightGrey}; padding: 20px; border-radius: 8px;">
            <h3 style="color: ${colors.primaryPink}; display: flex; align-items: center; gap: 10px;">
              📅 90-Day Plan
            </h3>
            ${markdownToHtml(actionPlan.day90, colors)}
          </div>
        </div>
        ${actionPlan.summary ? markdownToHtml(actionPlan.summary, colors) : ''}
      `;
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Career Readiness Report - ${userProfile.role}</title>
          <style>
            body { 
              font-family: 'Arial', sans-serif; 
              line-height: 1.6; 
              margin: 0; 
              padding: 20px; 
              background-color: #f9f9f9;
              color: ${colors.deepBlack};
            }
            .container {
              max-width: 1000px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            h1 { 
              color: ${colors.primaryPink}; 
              text-align: center;
              margin-bottom: 30px;
              font-size: 2.5em;
            }
            h2 { 
              color: ${colors.slateBlue}; 
              border-bottom: 2px solid ${colors.lightGrey};
              padding-bottom: 10px;
              margin-top: 40px;
            }
            h3 { 
              color: ${colors.slateBlue}; 
              margin-top: 25px;
            }
            .profile-info {
              background: ${colors.lightGrey};
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 30px;
              text-align: center;
            }
            .section {
              margin-bottom: 30px;
            }
            .callout-box {
              background: ${colors.lightGrey};
              border-left: 4px solid ${colors.primaryPink};
              padding: 15px;
              margin: 20px 0;
              border-radius: 0 8px 8px 0;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding: 20px;
              background: ${colors.lightGrey};
              border-radius: 8px;
              font-size: 0.9em;
              color: ${colors.slateBlue};
            }
            @media (max-width: 768px) {
              .container { padding: 20px; }
              h1 { font-size: 2em; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>CTRL+ALT+CAREER</h1>
            <div class="profile-info">
              <h2 style="margin: 0; border: none;">Career Readiness Report</h2>
              <p><strong>Role:</strong> ${userProfile.role}</p>
              <p><strong>Industry:</strong> ${userProfile.industry}</p>
            </div>

            ${aiReport ? renderReportSection('AI Impact Analysis', aiReport.aiImpactAnalysis) : ''}
            ${aiReport ? renderReportSection('Future Scenarios', aiReport.futureScenarios) : ''}
            ${aiReport?.actionPlan ? renderActionPlanHtml() : ''}
            
            ${skillGapAnalysis ? `<div class="section"><h2>Skill Gap Analysis</h2>${renderSkillGapHtml()}</div>` : ''}

            <div class="footer">
              <p>Created by <a href="https://www.thehumanco.org/" target="_blank" style="color: ${colors.accentPink}; text-decoration: underline;">The Human Co.</a></p>
              <p style="margin: 5px 0 0 0; font-size: 0.85em;">© ${new Date().getFullYear()} The Human Collab Ltd. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Career_Readiness_Report_${userProfile.role.replace(/\s/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowReportModal(false);
  };

  // Common styles for modals
  const modalOverlayStyle = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
  const modalContentStyle = "bg-white p-6 rounded-lg shadow-xl max-w-lg w-full mx-4";

  const renderPage = () => {
    switch (currentPage) {
      case 'intro':
        return (
          <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: colors.deepBlack, color: colors.lightGrey }}>
            <div className="p-8 rounded-xl shadow-2xl max-w-2xl text-center" style={{ backgroundColor: colors.lightGrey, color: colors.deepBlack }}>
              <h1 className="text-4xl font-extrabold mb-6" style={{ color: colors.primaryPink }}>CTRL+ALT+CAREER</h1>
              <img
                src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnY4azR0MW51d2ticHBzdTNxazU3cWp3NXhhcWlsbGp1N3Y2ZTdvMyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/10lBhcF4eTJZWU/giphy.gif"
                alt="Abstract AI animation"
                className="mx-auto mb-4 rounded-lg"
                style={{ maxWidth: '100%', height: 'auto', maxHeight: '200px' }}
                onError={(e) => e.target.style.display='none'}
              />
              <p className="text-lg mb-4 leading-relaxed">
                Stuck in autopilot? It's time for a system check. This AI-powered reboot adapts to you in real time — think less personality quiz, more upgrade path.
              </p>
              <p className="text-lg mb-8 leading-relaxed">
                You'll get a personalised report with future-of-work forecasts, automation risks, and a no-nonsense plan to keep your career one step ahead of the bots.
              </p>
              <button
                onClick={handleStartAssessment}
                className="font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                style={{ backgroundColor: colors.primaryPink, color: 'white' }}
              >
                Start Assessment
              </button>
            </div>
            <div style={{ textAlign: 'center', marginTop: '20px', padding: '15px' }}>
              <p style={{ margin: '0 0 5px 0', color: colors.lightGrey, fontSize: '0.9rem' }}>
                Created by <a href="https://www.thehumanco.org/" target="_blank" rel="noopener noreferrer" style={{ color: colors.accentPink, textDecoration: 'underline' }}>The Human Co.</a>
              </p>
              <p style={{ margin: '0', color: colors.lightGrey, fontSize: '0.8rem' }}>
                © {new Date().getFullYear()} The Human Collab Ltd. All rights reserved.
              </p>
            </div>
          </div>
        );

      case 'assessment':
        const currentQuestion = questions[currentQuestionIndex];
        const isAnswerEmpty = !currentInput.trim();

        return (
          <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: colors.deepBlack, color: colors.lightGrey }}>
            <div className="p-8 rounded-xl shadow-2xl max-w-2xl w-full" style={{ backgroundColor: colors.lightGrey, color: colors.deepBlack }}>
              <h2 className="text-3xl font-bold mb-6 text-center" style={{ color: colors.primaryPink }}>
                Assessment: Question {currentQuestionIndex + 1} of {questions.length}
              </h2>
              <div className="mb-6">
                <label htmlFor="question" className="block text-lg font-medium mb-2" style={{ color: colors.slateBlue }}>
                  {currentQuestion}
                </label>
                <textarea
                  id="question"
                  rows="5"
                  className="w-full p-3 border rounded-lg focus:ring-accent-pink focus:border-accent-pink resize-y"
                  style={{ borderColor: colors.slateBlue, color: colors.deepBlack, backgroundColor: 'white' }}
                  placeholder="Type your answer here..."
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                ></textarea>
              </div>
              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
                    setCurrentInput(answers[currentQuestionIndex - 1]?.answer || '');
                  }}
                  disabled={currentQuestionIndex === 0 || isLoading}
                  className="font-bold py-2 px-6 rounded-full transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: colors.slateBlue, color: 'white' }}
                >
                  Previous
                </button>
                <button
                  onClick={() => handleSubmitAnswer(currentQuestion, currentInput)}
                  disabled={isLoading || isAnswerEmpty}
                  className="font-bold py-2 px-6 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: colors.primaryPink, color: 'white' }}
                >
                  {isLoading ? 'Generating...' : (currentQuestionIndex === questions.length - 1 ? 'Finish Assessment' : 'Next')}
                </button>
              </div>
              {isLoading && (
                <div className="mt-4 text-center font-medium" style={{ color: colors.accentPink }}>
                  AI is thinking...
                </div>
              )}
            </div>
            <div style={{ textAlign: 'center', marginTop: '20px', padding: '15px' }}>
              <p style={{ margin: '0 0 5px 0', color: colors.lightGrey, fontSize: '0.9rem' }}>
                Created by <a href="https://www.thehumanco.org/" target="_blank" rel="noopener noreferrer" style={{ color: colors.accentPink, textDecoration: 'underline' }}>The Human Co.</a>
              </p>
              <p style={{ margin: '0', color: colors.lightGrey, fontSize: '0.8rem' }}>
                © {new Date().getFullYear()} The Human Collab Ltd. All rights reserved.
              </p>
            </div>
          </div>
        );

      case 'results':
        return (
          <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: colors.deepBlack, color: colors.lightGrey }}>
            <div className="p-8 rounded-xl shadow-2xl max-w-3xl w-full" style={{ backgroundColor: colors.lightGrey, color: colors.deepBlack }}>
              <h2 className="text-3xl font-bold mb-6 text-center" style={{ color: colors.primaryPink }}>Your Personalized Career Report</h2>
              {isLoading ? (
                <div className="text-center py-10 text-xl font-medium" style={{ color: colors.accentPink }}>
                  Generating your detailed report...
                </div>
              ) : (
                <>
                  <div className="prose max-w-none leading-relaxed mb-8 overflow-y-auto max-h-[60vh] p-2 border rounded-lg" style={{ borderColor: colors.slateBlue, color: colors.deepBlack }}>
                    <MarkdownRenderer reportData={{ aiReport, skillGapAnalysis }} />
                  </div>
                  <div className="flex flex-col items-center gap-4 mt-6">
                    <button
                      onClick={handleGenerateSkillGapAnalysis}
                      disabled={isGeneratingSkillGap}
                      className="font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: colors.slateBlue, color: 'white' }}
                    >
                      {isGeneratingSkillGap ? 'Analyzing Skills...' : 'Generate Skill Gap Analysis ✨'}
                    </button>
                    {skillGapAnalysis && (
                        <button
                          onClick={() => setShowReportModal(true)}
                          className="font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                          style={{ backgroundColor: colors.primaryPink, color: 'white' }}
                        >
                          Download Full Report
                        </button>
                    )}
                  </div>
                </>
              )}
            </div>
            <div style={{ textAlign: 'center', marginTop: '20px', padding: '15px' }}>
              <p style={{ margin: '0 0 5px 0', color: colors.lightGrey, fontSize: '0.9rem' }}>
                Created by <a href="https://www.thehumanco.org/" target="_blank" rel="noopener noreferrer" style={{ color: colors.accentPink, textDecoration: 'underline' }}>The Human Co.</a>
              </p>
              <p style={{ margin: '0', color: colors.lightGrey, fontSize: '0.8rem' }}>
                © {new Date().getFullYear()} The Human Collab Ltd. All rights reserved.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="App">
      {renderPage()}

      {/* User Profile Modal */}
      {showProfileModal && (
        <div className={modalOverlayStyle}>
          <div className={modalContentStyle} style={{ backgroundColor: colors.lightGrey, color: colors.deepBlack }}>
            <h3 className="text-2xl font-bold mb-4" style={{ color: colors.primaryPink }}>Tell Us About Yourself</h3>
            <p className="mb-4">This helps us personalize your assessment and report.</p>
            <div className="mb-4">
              <label htmlFor="role" className="block text-sm font-medium mb-1" style={{ color: colors.slateBlue }}>Your Current Role:</label>
              <input
                type="text"
                id="role"
                value={userProfile.role}
                onChange={(e) => setUserProfile({ ...userProfile, role: e.target.value })}
                className="w-full p-2 border rounded-md focus:ring-accent-pink focus:border-accent-pink"
                style={{ borderColor: colors.slateBlue, color: colors.deepBlack, backgroundColor: 'white' }}
                placeholder="e.g., Creative Director & Founder"
              />
            </div>
            <div className="mb-6">
              <label htmlFor="industry" className="block text-sm font-medium mb-1" style={{ color: colors.slateBlue }}>Your Industry:</label>
              <input
                type="text"
                id="industry"
                value={userProfile.industry}
                onChange={(e) => setUserProfile({ ...userProfile, industry: e.target.value })}
                className="w-full p-2 border rounded-md focus:ring-accent-pink focus:border-border-accent-pink"
                style={{ borderColor: colors.slateBlue, color: colors.deepBlack, backgroundColor: 'white' }}
                placeholder="e.g., Leadership & Learning"
              />
            </div>
            <button
              onClick={handleSaveProfile}
              className="font-bold py-2 px-4 rounded-full shadow-md transition duration-300 ease-in-out"
              style={{ backgroundColor: colors.primaryPink, color: 'white' }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Download Report Confirmation Modal */}
      {showReportModal && (
        <div className={modalOverlayStyle}>
          <div className={modalContentStyle} style={{ backgroundColor: colors.lightGrey, color: colors.deepBlack }}>
            <h3 className="text-2xl font-bold mb-4" style={{ color: colors.primaryPink }}>Download Your Report</h3>
            <p className="mb-6">
              Click "Download" to save your personalized career readiness report as an HTML file. This file will be fully formatted and mobile-responsive.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowReportModal(false)}
                className="font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out"
                style={{ backgroundColor: colors.slateBlue, color: 'white' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadReport}
                className="font-bold py-2 px-4 rounded-full shadow-md transition duration-300 ease-in-out"
                style={{ backgroundColor: colors.primaryPink, color: 'white' }}
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
