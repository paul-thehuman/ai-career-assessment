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
        <p class="text-lg">Here’s your personalised report based on your role as Creative Director & Founder of The Human Co. You’re not just watching the future of work unfold — you’re helping shape it. Let’s get to work.</p>
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

  // Render Skill Gap Analysis visually in-app
  const renderSkillGapAnalysis = () => {
    if (!reportData.skillGapAnalysis?.skills) return null;

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

    const actionPlan = reportData.aiReport.action;
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
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.primaryPink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-plus"><path d="M21 12V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M18 21v-6"/><path d="M15 18h6"/></svg>
              60-Day Plan
            </h3>
            <div dangerouslySetInnerHTML={{ __html: markdownToHtml(actionPlan.day60, colors) }} />
          </div>
          <div className="action-plan-column" style={{ backgroundColor: colors.lightGrey }}>
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.primaryPink} strokeWidth="2" strokeLinecap="round" stroke-linejoin="round" className="lucide lucide-calendar-range"><path d="M21 10H3"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M16 14H8"/></svg>
              90-Day Plan
            </h3>
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
  const [reportDownloadContent, setReportDownloadContent] = useState('');
  const [currentInput, setCurrentInput] = useState(''); // State to manage current textarea input

  const [isGeneratingSkillGap, setIsGeneratingSkillGap] = useState(false);

  const googleFormEmbedUrl = "https://docs.google.com/forms/d/e/1FAIpQLSddjSYI034-DNEk8xgSGphL2IPsM164xFUTAZ8jDDyptTt5iQ/viewform?embedded=true"; // Your Google Form embed URL

  // Define JSON schemas for structured AI responses
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


  // Initial core questions
  const initialCoreQuestions = useMemo(() => [
    "Describe your current professional role and primary responsibilities.",
    "What are your top 3 career aspirations for the next 5 years?",
    "What specific skills or knowledge areas do you believe are most critical for your career growth in your industry?",
    "What is the biggest challenge you foresee in achieving your career goals?",
    "How do you currently approach professional development and learning new skills?"
  ], []); // Empty dependency array means it's created once

  useEffect(() => {
    setQuestions(initialCoreQuestions);
  }, [initialCoreQuestions]); // Added initialCoreQuestions to dependency array

  // Function to call the Gemini API
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

    // IMPORTANT: API Key is now read from environment variable for security
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY; // Read from environment variable
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    console.log("API Key being used (first few chars):", apiKey ? apiKey.substring(0, 5) + "..." : "Not set"); // Debug log for API key presence
    console.log("Calling Gemini API with prompt:", prompt); // Log the prompt

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      console.log("Gemini API raw response:", result); // Log the raw response

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        let text = result.candidates[0].content.parts[0].text;
        console.log("Gemini API response text:", text); // Log the response text
        if (isStructured) {
          try {
            const parsedJson = JSON.parse(text);
            console.log("Gemini API parsed JSON:", parsedJson); // Log parsed JSON
            return parsedJson;
          } catch (e) {
            console.error("Failed to parse JSON response:", e, text);
            return null;
          }
        }
        return text;
      } else {
        console.error("Unexpected API response structure or empty content:", result);
        return "Error: Could not generate content. Please try again. Check console for details.";
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      return "Error: Failed to connect to AI. Please check your network or API key.";
    } finally {
      if (setLoadingState) setLoadingState(false);
    }
  };

  // Handle starting the assessment
  const handleStartAssessment = () => {
    setShowProfileModal(true);
  };

  // Handle saving user profile and moving to assessment
  const handleSaveProfile = () => {
    if (userProfile.role && userProfile.industry) {
      setShowProfileModal(false);
      setCurrentPage('assessment');
    } else {
      console.log("Please enter your role and industry to start the assessment.");
    }
  };

  // Handle submitting an answer and generating next question/report
  const handleSubmitAnswer = async (question, answer) => {
    if (!answer.trim()) {
      console.log("Please provide an answer before proceeding.");
      return;
    }

    const updatedAnswers = [...answers, { question, answer }];
    setAnswers(updatedAnswers);
    setCurrentInput(''); // Clear the textarea input

    if (currentQuestionIndex < initialCoreQuestions.length) { // Condition to correctly handle adaptive questions after all initial core questions are answered
      const prompt = `Given the user's role as "${userProfile.role}" in the "${userProfile.industry}" industry, and their previous answer to the question "${question}" which was "${answer}", generate a single, concise follow-up question to delve deeper into their career readiness or aspirations. The question should be adaptive and relevant to their specific context.`;
      const newQuestion = await callGeminiAPI(prompt, false, null, setIsLoading);

      if (newQuestion && !newQuestion.startsWith("Error:")) {
        // If AI successfully generates a new question, add it and move to it
        setQuestions(prevQuestions => [...prevQuestions, newQuestion]);
        setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      } else {
        // If AI fails or it's the last core question, move to report generation
        console.log("AI failed to generate a follow-up question or all core questions answered. Proceeding to report generation.");
        await generateFullReport(updatedAnswers);
      }
    } else {
      // This 'else' branch handles moving through *already generated* adaptive questions
      // or if the initial question count was somehow exceeded without report generation.
      // After the last core question, it should ideally go to report generation.
      // If we are already past the initial core questions and a new one was just generated, move to it.
      if (currentQuestionIndex < questions.length -1) { // Check if there's a next question in the array
         setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      } else {
         // If no more questions in the array (meaning the last one was answered), generate report
         await generateFullReport(updatedAnswers);
      }
    }
  };

  // Generate the full AI report
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
    fullPrompt += `For "aiImpactAnalysis", keep paragraphs concise (max 3-4 lines). Use bullet points for key insights. Clarify the kind of AI tools being referred to with relevant examples (e.g., generative design tools, analytics software, automation platforms, AI-driven content creation, intelligent automation, predictive analytics). At the end, include a "Key Takeaway" summary box, formatted as a Markdown blockquote (> Key Takeaway: Your summary here.).\n`;
    fullPrompt += `For "futureScenarios", generate three distinct future scenarios relevant to their career path, considering industry trends. Each scenario should start with '### Scenario X: [Scenario Title]' and include concise paragraphs and bullet points. For each scenario, describe not just the potential success, but also **what stands in the way right now**, using conditional "this future happens if..." phrasing to drive action. Introduce **operational debt, personal blind spots, or growth risks** that need solving. At the end of this section, include a "What to do next" summary box, formatted as a Markdown blockquote (> What to do next: Your summary here.).\n`;
    fullPrompt += `For "actionPlan", provide a 30/60/90-day roadmap. This should be a JSON object with keys "day30", "day60", "day90", and "summary". Each of "day30", "day60", "day90" should contain Markdown text with concrete, actionable steps tailored to their specific answers, role, and industry. **It is absolutely critical that all three day plans (30, 60, 90) are fully populated with content. If unique ideas are limited, provide general but relevant actions for that timeframe to ensure no section is left blank.** Remove checklist-style phrasing. Make each item a **challenge with a clear call to courage or decisive movement**. Use **active voice** (e.g., "Ship something before it's perfect.", "Get uncomfortable in public."). Use numbered lists for steps. Use bolding for key terms within list items (e.g., **Toolkit MVP**). The "summary" key should contain Markdown text for a "Key Action" summary box, formatted as a Markdown blockquote (> Key Action: Your summary here.).\n`;
    fullPrompt += `Optionally, somewhere in the report (e.g., within AI Impact Analysis or Action Plan), include 1-2 punchy, emotionally intelligent lines as a "Truth You Might Be Avoiding" sidebar, formatted as a Markdown blockquote (> Truth You Might Be Avoiding: Your uncomfortable truth here.).\n`;
    fullPrompt += `Maintain a confident, future-focused, human-first, strategic, and jargon-free tone, reflecting 'The Human Co.' ethos of being rebellious but practical. Prioritise clarity, movement and momentum. The tone should feel like a trusted advisor who knows the game and won’t let you coast.`;


    const reportContent = await callGeminiAPI(fullPrompt, true, reportSchema, setIsLoading);
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
    prompt += `**Sharpen the language:** Avoid vague or polite language. Make the **cost of not closing the gap explicit**. Where relevant, **contrast ambition with infrastructure** (e.g., "Your ideas scale fast. Your systems don’t."). Keep paragraphs concise (max 3-4 lines). Use bolding for key terms.\n`;
    prompt += `The "summary" key should contain Markdown text for a "Skill Focus" summary box, formatted as a Markdown blockquote (> Skill Focus: Your summary here.).\n`;
    prompt += `Maintain a confident, future-focused, human-first, strategic, and jargon-free tone, reflecting 'The Human Co.' ethos of being rebellious but practical. Prioritise clarity, movement and momentum. The tone should feel like a trusted advisor who knows the game and won’t let you coast.`;

    const analysis = await callGeminiAPI(prompt, true, skillGapSchema, setIsGeneratingSkillGap);
    setSkillGapAnalysis(analysis);
  };

  // Effect to update reportDownloadContent whenever aiReport or skillGapAnalysis changes
  useEffect(() => {
    if (aiReport || skillGapAnalysis) {
      // Set content for download when report or skill analysis is ready
      setReportDownloadContent(generateHtmlReport({ aiReport, skillGapAnalysis }, userProfile, colors));
    }
  }, [aiReport, skillGapAnalysis, userProfile]);

  // Download the report
  const handleDownloadReport = () => {
    if (reportDownloadContent) {
      const blob = new Blob([reportDownloadContent], { type: 'text/html;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Career_Readiness_Report_${userProfile.role.replace(/\s/g, '_')}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowReportModal(false); // Close modal after download
    }
  };

  // Common styles for modals
  const modalOverlayStyle = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
  const modalContentStyle = "bg-white p-6 rounded-lg shadow-xl max-w-lg w-full mx-4";

  // Render different pages
  const renderPage = () => {
    switch (currentPage) {
      case 'intro':
        return (
          <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: colors.deepBlack, color: colors.lightGrey }}>
            <div className="p-8 rounded-xl shadow-2xl max-w-2xl text-center" style={{ backgroundColor: colors.lightGrey, color: colors.deepBlack }}>
              <h1 className="text-4xl font-extrabold mb-6" style={{ color: colors.primaryPink }}>CTRL+ALT+CAREER</h1> {/* Updated title */}
              <img
                src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnY4azR0MW51d2ticHBzdTNxazU3cWp3NXhhcWlsbGp1N3Y2ZTdvMyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/10lBhcF4eTJZWU/giphy.gif"
                alt="Abstract AI animation"
                className="mx-auto mb-4 rounded-lg"
                style={{ maxWidth: '100%', height: 'auto', maxHeight: '200px' }} // Adjusted styling for GIF
                onError={(e) => e.target.style.display='none'} // Hide if GIF fails to load
              />
              <p className="text-lg mb-4 leading-relaxed">
                Stuck in autopilot? It’s time for a system check. This AI-powered reboot adapts to you in real time — think less personality quiz, more upgrade path. {/* Updated text */}
              </p>
              <p className="text-lg mb-8 leading-relaxed">
                You’ll get a personalised report with future-of-work forecasts, automation risks, and a no-nonsense plan to keep your career one step ahead of the bots. {/* Updated text */}
              </p>
              <button
                onClick={handleStartAssessment}
                className="font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                style={{ backgroundColor: colors.primaryPink, color: 'white' }}
              >
                Start Assessment
              </button>
            </div>
          </div>
        );

      case 'assessment':
        const currentQuestion = questions[currentQuestionIndex];
        const isAnswerEmpty = !currentInput.trim();
        const progressPercentage = ((currentQuestionIndex + 1) / initialCoreQuestions.length) * 100; // Calculate progress

        return (
          <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: colors.deepBlack, color: colors.lightGrey }}>
            <div className="p-8 rounded-xl shadow-2xl max-w-2xl w-full" style={{ backgroundColor: colors.lightGrey, color: colors.deepBlack }}>
              <h2 className="text-3xl font-bold mb-6 text-center" style={{ color: colors.primaryPink }}>
                Assessment: Question {currentQuestionIndex + 1}
              </h2>
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div className="h-2.5 rounded-full" style={{ width: `${progressPercentage}%`, backgroundColor: colors.primaryPink }}></div>
              </div>
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
          </div>
        );

      case 'results':
        // Determine button colors based on skillGapAnalysis presence
        const generateSkillGapBtnColor = colors.slateBlue;
        const downloadReportBtnColor = skillGapAnalysis ? colors.primaryPink : colors.slateBlue; // Highlight if skillGapAnalysis is available

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
                  <div className="prose max-w-none leading-relaxed mb-8 p-2" style={{ borderColor: colors.slateBlue, color: colors.deepBlack }}>
                    <MarkdownRenderer reportData={{ aiReport, skillGapAnalysis }} />
                  </div>
                  {/* Main Action Buttons - Centered Column */}
                  <div className="flex flex-col items-center gap-4 mt-6">
                    <button
                      onClick={handleGenerateSkillGapAnalysis}
                      disabled={isGeneratingSkillGap}
                      className="font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: generateSkillGapBtnColor, color: 'white' }}
                    >
                      {isGeneratingSkillGap ? 'Analyzing Skills...' : 'Generate Skill Gap Analysis ✨'}
                    </button>
                    <button
                      onClick={() => setShowReportModal(true)}
                      className="font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                      style={{ backgroundColor: downloadReportBtnColor, color: 'white' }}
                    >
                      Download Full Report
                    </button>
                  </div>

                  {/* Google Forms Feedback Section */}
                  <div className="section mt-8 w-full">
                      <h2 className="text-xl font-semibold mb-4 text-slate-blue text-center">We'd Love Your Feedback!</h2>
                      <p className="text-center text-gray-700 mb-6">Help us improve this assessment by sharing your thoughts. Your insights could even become a testimonial!</p>
                      <div style={{ position: 'relative', width: '100%', paddingTop: '150%' }}>
                          <iframe
                              src={googleFormEmbedUrl}
                              title="Assessment Feedback Form"
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                              marginHeight="0"
                              marginWidth="0"
                              loading="lazy"
                          >
                              Loading…
                          </iframe>
                      </div>
                  </div>
                  {/* Footer with website link */}
                  <div style={{ textAlign: 'center', marginTop: '40px', padding: '20px', background: colors.lightGrey, borderRadius: '8px', width: '100%' }}>
                      <p style={{ margin: '0', color: colors.slateBlue, fontSize: '0.9rem' }}>
                          Created by <a href="https://thehumanco.co" target="_blank" rel="noopener noreferrer" style={{ color: colors.accentPink, textDecoration: 'underline' }}>The Human Co.</a>
                      </p>
                  </div>
                </>
              )}
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
