import React, { useState, useEffect } from 'react';

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
            color: ${colors.deepBlack};
            background-color: ${colors.lightGrey};
        }
        .header {
            background: linear-gradient(135deg, ${colors.primaryPink} 0%, ${colors.accentPink} 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 30px;
        }
        .section {
            margin-bottom: 40px;
            padding: 20px;
            border: 1px solid ${colors.lightGrey};
            border-radius: 8px;
            background: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        .prose h1, .prose h2, .prose h3 {
            color: ${colors.slateBlue};
        }
        .list-disc, .list-decimal {
            margin-left: 1.5rem;
        }
        .list-disc li, .list-decimal li {
            margin-bottom: 0.5rem;
            color: ${colors.deepBlack};
        }
        a {
            color: ${colors.accentPink};
        }
        stron
