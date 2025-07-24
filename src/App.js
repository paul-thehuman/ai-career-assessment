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
  const filled = '▓'; // Full block
  const empty = '░'; // Empty block
  const totalBlocks = 5;
  const filledBlocks = Math.round(rating); // Round to nearest whole number for blocks
  const emptyBlocks = totalBlocks - filledBlocks;
  return filled.repeat(filledBlocks) + empty.repeat(emptyBlocks);
};

// Helper function to escape problematic characters for HTML embedding
// This is crucial for content *within* HTML elements and for preventing template literal breaks
const escapeHtmlString = (str) => {
  if (typeof str !== 'string') return str; // Ensure it's a string before processing
  // Replace backticks with a unique placeholder that won't break template literals
  // This placeholder will be reverted back to backticks in generateHtmlReport
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
      content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold text
      html += `<p style="margin-bottom: 5px;">${escapeHtmlString(content)}</p>`; // Escape content
    } else {
      if (inBlockquote) { html += '</div>'; inBlockquote = false; }

      // Handle Headings (only H3 and H2 expected within sections from AI)
      if (line.startsWith('### ')) {
        if (inList) { html += '</ul>'; inList = false; }
        if (inNumberedList) { html += '</ol>'; inNumberedList = false; }
        html += `<h3 class="text-xl font-semibold mt-5 mb-2" style="color: ${colors.slateBlue};">${escapeHtmlString(line.substring(4))}</h3>`; // Escape content
      } else if (line.startsWith('## ')) {
        if (inList) { html += '</ul>'; inList = false; }
        if (inNumberedList) { html += '</ol>'; inNumberedList = false; }
        html += `<h2 class="text-2xl font-semibold mt-6 mb-3" style="color: ${colors.slateBlue};">${escapeHtmlString(line.substring(3))}</h2>`; // Escape content
      }
      // Handle Lists
      else if (line.startsWith('* ') || line.startsWith('- ')) {
        if (!inList) { html += '<ul class="list-disc pl-6 mb-4 space-y-1">'; inList = true; }
        if (inNumberedList) { html += '</ol>'; inNumberedList = false; }
        let content = line.substring(2).trim();
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold text within list items
        html += `<li class="mb-2" style="color: ${colors.deepBlack};">${escapeHtmlString(content)}</li>`; // Escape content
      } else if (line.match(/^\d+\.\s/)) {
        if (!inNumberedList) { html += '<ol class="list-decimal pl-6 mb-4 space-y-1">'; inNumberedList = true; }
        if (inList) { html += '</ul>'; inList = false; }
        let content = line.split('. ')[1].trim();
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold text within list items
        html += `<li class="mb-2" style="color: ${colors.deepBlack};">${escapeHtmlString(content)}</li>`; // Escape content
      }
      // Handle Empty Lines (for spacing)
      else if (line.trim() === '') {
        if (inList) { html += '</ul>'; inList = false; }
        if (inNumberedList) { html += '</ol>'; inNumberedList = false; }
        html += '<br />';
      }
      // Handle Paragraphs
      else {
        if (inList) { html += '</ul>'; inList = false; }
        if (inNumberedList) { html += '</ol>'; inNumberedList = false; }
        let content = line.trim();
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold text within paragraphs
        html += `<p class="mb-2" style="color: ${colors.deepBlack};">${escapeHtmlString(content)}</p>`; // Escape content
      }
    }
  });
  // Close any open lists or blockquotes at the end of the content
  if (inList) { html += '</ul>'; }
  if (inNumberedList) { html += '</ol>'; }
  if (inBlockquote) { html += '</div>'; }
  return html;
};

// Function to generate the full HTML report for download (standalone)
const generateHtmlReport = (reportData, userProfile, colors) => {
  const date = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });

  // Generate HTML for each section from structured data
  const aiImpactHtml = reportData.aiReport?.aiImpactAnalysis ? markdownToHtml(reportData.aiReport.aiImpactAnalysis, colors) : '';
  const futureScenariosHtml = reportData.aiReport?.futureScenarios ? markdownToHtml(reportData.aiReport.futureScenarios, colors) : '';

  // Fallback for action plan content if AI doesn't populate
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

    // Sort skills by criticality (importance - capability, descending)
    const sortedSkills = [...reportData.skillGapAnalysis.skills].sort((a, b) => {
      const gapA = a.importanceRating - a.currentCapabilityRating;
      const gapB = b.importanceRating - b.currentCapabilityRating;
      if (gapA !== gapB) return gapB - gapA; // Sort by gap first
      return b.importanceRating - a.importanceRating; // Then by importance
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
      skillGapContentHtml += markdownToHtml(reportData.skillGapAnalysis.summary, colors); // No need to escape again here, markdownToHtml already does it internally
    }
  }

  // Construct the HTML string using concatenation
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
                <h3>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${colors.primaryPink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-check"><path d="M8 2v4"/><path d="M16 2v4"/><path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"/><path d="M21 13a5 5 0 1 1-5 5h5v-5Z"/><path d="M16 18h2l4 4"/></svg>
                    30-Day Plan
                </h3>
                <div class="prose">
                    ${actionPlanHtml30}
                </div>
            </div>
            <div class="action-plan-column">
                <h3>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${colors.primaryPink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-plus"><path d="M21 12V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M18 21v-6"/><path d="M15 18h6"/></svg>
                    60-Day Plan
                </h3>
                <div class="prose">
                    ${actionPlanHtml60}
                </div>
            </div>
            <div class="action-plan-column">
                <h3>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${colors.primaryPink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-range"><path d="M21 10H3"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M16 14H8"/></svg>
                    90-Day Plan
                </h3>
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
            color: #101216; /* Deep Black */
            background-color: #eaeaea; /* Light Grey */
        }
        .header {
            background: linear-gradient(135deg, #ff2e63 0%, #ff6189 100%); /* Primary Pink to Accent Pink */
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 30px;
        }
        .section {
            margin-bottom: 40px;
            padding: 20px;
            border: 1px solid #eaeaea; /* Light Grey */
            border-radius: 8px;
            background: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        .prose h1, .prose h2, .prose h3 {
            color: #3a4252; /* Slate Blue */
        }
        .list-disc, .list-decimal {
            margin-left: 1.5rem;
        }
        .list-disc li, .list-decimal li {
            margin-bottom: 0.5rem;
            color: #101216; /* Deep Black */
        }
        a {
            color: #ff6189; /* Accent Pink */
        }
        strong {
            color: #3a4252; /* Slate Blue */
            font-weight: 600;
        }
        .callout-box {
            margin-top: 20px;
            padding: 15px;
            background: #eaeaea; /* Light Grey */
            border-left: 4px solid #ff2e63; /* Primary Pink */
            border-radius: 4px;
            color: #101216; /* Deep Black */
        }
        .callout-box p {
            margin-bottom: 5px;
        }
        .horizontal-rule {
            border: 0;
            height: 1px;
            background-color: #eaeaea; /* Light Grey */
            margin: 20px 0;
        }
        .toc-link {
            display: block;
            padding: 8px 12px;
            margin-bottom: 5px;
            background-color: #eaeaea; /* Light Grey */
            border-radius: 5px;
            color: #3a4252; /* Slate Blue */
            text-decoration: none;
            transition: background-color 0.2s ease-in-out;
        }
        .toc-link:hover {
            background-color: #ff2e63; /* Primary Pink */
            color: white;
        }
        .action-plan-column {
            background-color: #eaeaea; /* Light Grey */
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            height: 100%; /* Ensure columns are same height */
        }
        .action-plan-column h3 {
            color: #ff2e63; /* Primary Pink */
            margin-top: 0;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
        }
        .action-plan-column h3 svg {
            margin-right: 8px;
        }

        @media print {
            .section {
                break-inside: avoid;
            }
        }
        @media (max-width: 768px) {
            .action-plan-grid {
                grid-template-columns: 1fr; /* Stack columns on mobile */
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

  // Restore backticks after the entire HTML string is constructed
  return finalHtml.replace(/&#96;/g, '`');
};

// Component to render Markdown content (for display within the app)
const MarkdownRenderer = ({ reportData }) => {
  if (!reportData || (!reportData.aiReport && !reportData.skillGapAnalysis)) {
    return null;
  }

  // Render Skill Gap Analysis visually in-app
  const renderSkillGapAnalysis = () => {
    if (!reportData.skillGapAnalysis?.skills) return null;

    // Sort skills by criticality (importance - capability, descending)
    const sortedSkills = [...reportData.skillGapAnalysis.skills].sort((a, b) => {
      const gapA = a.importanceRating - a.currentCapabilityRating;
      const gapB = b.importanceRating - b.currentCapabilityRating;
      if (gapA !== gapB) return gapB - gapA; // Sort by gap first
      return b.importanceRating - a.importanceRating; // Then by importance
    });

    return (
      <>
        <h2 className="text-2xl font-semibold mt-6 mb-3" style={{ color: colors.slateBlue }}>Skill Gap Analysis</h2>
        <h3 class="text-xl font-semibold mt-5 mb-2" style={{ color: colors.slateBlue }}>Identified Skill Gaps & Priorities</h3>
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

  // Render Action Plan visually in-app
  const renderActionPlan = () => {
    if (!reportData.aiReport?.actionPlan) return null;

    const actionPlan = reportData.aiReport.actionPlan;
    return (
      <>
        <h2 className="text-2xl font-semibold mt-6 mb-3" style={{ color: colors.slateBlue }}>Personalized Action Plan</h2>
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
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.primaryPink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-plus"><path d="M21 12V6a2 2
