const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// E2E Evaluation Prompts from AD document
const evalPrompts = [
  {
    title: "Stock Analysis with Presentation and Slack Summary",
    description: "Analyze stock performance over the past week, create formatted presentation with insights, and share on Slack with witty commentary.",
    prompt: `Analyze "X" stock over the past week, create trends / views / insights in a well formatted presentation (don't forget to use the attached UiP template!). Send that, with a summarized insight along with a funny message and warm inspiring witty quote, on Slack to < your name >`,
    category: "Analysis",
    difficulty: "medium",
    estimatedTime: "30-45 minutes"
  },
  {
    title: "Customer Meeting Preparation with Multi-Platform Research",
    description: "Research customer engagement across multiple platforms (Slack, email, SFDC, Jira) to prepare for upcoming meetings.",
    prompt: `Prepare me for the upcoming meeting at 2p with < customer name >. Dig all relevant threads (on Slack, email, SFDC, Jira) about this customer's engagement with us, in the last month.`,
    category: "Research",
    difficulty: "medium",
    estimatedTime: "20-30 minutes"
  },
  {
    title: "Product Feedback Analysis from Slack",
    description: "Analyze Slack feedback channels to extract and summarize product improvement ideas for stakeholder communication.",
    prompt: `Go to #help-autopilot-for-devs in Slack, read all of the feedback from the last 10 days and summarize all of the product improvement ideas from those discussions. Send the summary on Slack to < recipient > along with a warm message.`,
    category: "Analysis",
    difficulty: "easy",
    estimatedTime: "15-20 minutes"
  },
  {
    title: "Daily DM Management and Handoff Summary",
    description: "Process unread Slack DMs, categorize requests, respond where possible, and create handoff summary for daily briefing.",
    prompt: `In Slack, sort DMs by Unread/Recent. For each DM: Capture Name and Ask/Question in a sheet. If you can answer confidently on my behalf, reply succinctly and mark with ✅ in the Agenda and include the answer. If you're not sure, acknowledge receipt and say Anvita will revert; add to Agenda. Build a DM Summary list for the Daily Handoff for me : Name — Ask — Action taken/Needed.`,
    category: "Communication",
    difficulty: "medium",
    estimatedTime: "25-35 minutes"
  },
  {
    title: "Purchase Analysis with Currency Conversion and Multi-Channel Reporting",
    description: "Analyze daily purchases with currency conversion to USD and distribute analysis via email and Slack.",
    prompt: `analyze daily purchases for the file FakePurchases in my Documents folder. Make sure to update the currencies to USD. Summarize changes you did and send the analysis on the email - anvita.dekhane@uipath.com from Outlook, and on Slack to Anvita Dekhane.`,
    category: "Analysis",
    difficulty: "hard",
    estimatedTime: "45-60 minutes"
  },
  {
    title: "PowerBI Dashboard Analysis with Salesforce CRM Integration",
    description: "Extract top customers from PowerBI dashboard and cross-reference with Salesforce to create personalized outreach drafts.",
    prompt: `Go to the powerBI dashboard on Maestro scorecard (already open in my Chrome window), sort the Customers overview table by Instance Runs (last 28 days) and for the top 5 customers in the list, identify their Region, CSM, TAM and Sum of won opportunities (whatever is available) from Salesforce: search for the customer name (one by one) in the search box and make sure to find the Account in there. Store these in an excel sheet and draft a personalized message to each CSM or TAM or Account owner - whichever available, in that order, (don't send, just draft) asking about the health of their account(s) and if the product team should engage for any help. Make sure to bundle up accounts if multiple exist per person and only draft 1 message per person. Draft them in the Slack text box for each (but don't send them). Use the RPA skill where relevant.`,
    category: "Analysis",
    difficulty: "hard",
    estimatedTime: "60-90 minutes"
  },
  {
    title: "Multi-Document Creation for Leadership Presentation",
    description: "Create PowerPoint presentation and Word document on computer use agents, including benchmarks for CIO workshop.",
    prompt: `create a power point presentation and a word doc on computer use agents today. Audience is leadership within my company, preparing for a CIO workshop. Make sure to include benchmarks relevant for the space. Once done, email both the ppt and doc to anvita.dekhane@uipath.com from Outlook`,
    category: "Content Creation",
    difficulty: "hard",
    estimatedTime: "60-75 minutes"
  },
  {
    title: "B2B Lead Processing with CRM Integration and Research",
    description: "Process B2B leads from spreadsheet into CRM with scoring, conduct LinkedIn research for hot leads, and email summary.",
    prompt: `your task is to update my Lite CRM with all leads from the marketing campaign. then research 'hot leads' and email it. Details below -

B2B Lead List (Marketing campaign B2B leads): https://docs.google.com/spreadsheets/d/1URoDQSKiJ3jjcL1gmXg-BuVtj1HSKHtzrXiUnNvlCgo/edit?gid=1959936715#gid=1959936715

My Lite CRM at https://ai-crm-sparkle.lovable.app

Go through the Lead List. For every contact, enter their Name and Company into the CRM. If the 'Estimated Budget' is over $50,000, give them a Score of 9 and set Status to 'Hot Leads'. If it's between $10k-$50k, give them a 5 and 'Warm Nurture'.

After processing all leads, research hot leads (organization). Store the company's LinkedIn profile URL, size, basic details in the Lead summary sheet.

Prepare a summary of all leads and email to anvita.dekhane@uipath.com via Outlook`,
    category: "Marketing",
    difficulty: "hard",
    estimatedTime: "90-120 minutes"
  },
  {
    title: "Procurement Savings Analysis with Template Replication",
    description: "Generate comprehensive procurement savings tracker using template analysis and pivot table creation across multiple sheets.",
    prompt: `I am the lead procurement analyst at my company. I need your help to generate an extensive savings tracker for our monthly procurement activity. Here is a sample output of all reports/ insights generated on savings for the month of August - https://docs.google.com/spreadsheets/d/1X7MbOywIViKaToCYzoXA4hvmp4LeGNNVbwMOXqhyk5c/edit?usp=sharing . Refer this sheet (make sure to see all the subsheets and individual charts/ pivot tables/ filters created).

Here's is the raw file for September month - https://docs.google.com/spreadsheets/d/15UbwAOaaW0MFUObJiU-0Py9ePx2CQHcIT58-vu6rK-M/edit?usp=sharing . Conduct similar analyses (as you see in August month's report (shared above). Build similar pivot tables / charts, and gather similar insights on trends of savings. Build all needed sub-sheets, rename them appropriately and for all the insights (from the sub-sheets), create an email summary. Send it to anvita.dekhane@uipath.com while also attaching the updated September analysis sheet.`,
    category: "Analysis",
    difficulty: "hard",
    estimatedTime: "90-120 minutes"
  },
  {
    title: "Email and Calendar Management with Agenda Creation",
    description: "Process unread emails, categorize by action needed, file appropriately, and create agenda summary for daily handoff.",
    prompt: `Clean up Inbox

In Inbox and mapped folders, open Unread threads from newest to oldest. 

For each conversation thread: 
- Summarize: 1–3 lines: who, what, status, deadline. 
- Waiting on GA? If the thread needs GA's response/decision, add it to the Agenda List (see template) with due date/priority. 
- Readonly (no action needed from GA): mark as read. 
- File to the correct "…/Done" subfolder (e.g., Professional Services/Done). 
- Build a Thread Summary doc/section (sample format below) for inclusion in the Daily Handoff.

Agenda List (template fields): 
- Sender(s) 
- Topic 
- What's needed from GA 
- Due date / SLA 
- Attachments/Links
- Priority 

Thread Summary (example entry): 
From: Vendor X / Subject: SOW redlines — Status: Legal replied; Ask: GA to confirm final clause; Due: EOD Thu.`,
    category: "Management",
    difficulty: "medium",
    estimatedTime: "45-60 minutes"
  },
  {
    title: "Meeting Transcript Analysis and Action Items Extraction",
    description: "Analyze Teams meeting transcripts to extract discussion points, action items, dependencies, and strategic recommendations.",
    prompt: `I missed Agentic Session with UiPath earlier today with Tetra Pak team. Could you get the context of the meeting from emails and then get the transcript of the meeting from Teams and create me a summary of the meeting, next action items, who does what, and what is customer's perception of our agentic offering? Also please provide any other recommendation for us as an account team given that the renewal of this account is in December and we'd like them to accelerate agentic adoption.`,
    category: "Analysis",
    difficulty: "medium",
    estimatedTime: "30-40 minutes"
  },
  {
    title: "Loan Applicant Address Verification Across Multiple Databases",
    description: "Validate loan applicant addresses across BSA, USPS, and FRB databases for property ownership, tax status, and red flags.",
    prompt: `I need to validate a loan applicants address to make sure the address provided is accurate and matches tax and property records. I will provide you the address and then need you to pull up the 3 websites to verify the address. I need to pull the name of the owner listed on the BSA website so I can validate it matches the name on the application, that the property class is residential and not agricultural or something weird, zoning code, make sure it wasn't sold within the last 6 months, and make sure the taxes are paid up and there isn't any overdue taxes, as well as any other inconsistencies or red flags.

These are the websites you need to check:
- bsaonline.com/MunicipalDirectory
- ZIP Code™ Lookup | USPS
- FRB Census Geocoder

Here are the addresses:
- 8546 Corsica, Jenison, MI 49428
- 5315 WINDFIELD DR, ALLENDALE, MI 49401
- 1805 NE 17TH AVE, CAPE CORAL, FL 33909
- 160 W MAIN AVE, ZEELAND, MI 49464`,
    category: "Validation",
    difficulty: "medium",
    estimatedTime: "40-50 minutes"
  },
  {
    title: "Business Reputation Verification for Loan Applications",
    description: "Research business entities through state databases to verify legitimacy and gather reputation information for loan processing.",
    prompt: `Check business reputation for loan applicants using https://dos.fl.gov/sunbiz/search/
-> Search by name -> Enter "SANTAY TRANSPORT SOLUTIONS LLC"`,
    category: "Validation",
    difficulty: "easy",
    estimatedTime: "10-15 minutes"
  },
  {
    title: "Medium Article to Presentation Conversion",
    description: "Convert Medium draft post into well-formatted presentation slides with improved content flow and visual appeal.",
    prompt: `this is one of my draft posts on Medium : https://medium.com/@AnvitaDekhane/dec83b47eee7 I want to build slides using this write up. These slides should be very well formatted, easy to read/ follow and use content/ flow from the write up. can you make these slides for me?`,
    category: "Content Creation",
    difficulty: "medium",
    estimatedTime: "30-40 minutes"
  },
  {
    title: "Workday Task Approval Summary with Slack Integration",
    description: "Extract headcount approval tasks from Workday and provide organized summary with direct action links via Slack.",
    prompt: `Go to workday, get the tasks for headcount approval, summarize it and provide it as a table on slack with links to URIs where I can go and approve`,
    category: "Management",
    difficulty: "medium",
    estimatedTime: "20-25 minutes"
  },
  {
    title: "Coupa Approval Automation with Email Confirmation",
    description: "Process Coupa approvals under specific criteria and generate detailed confirmation email with approval summary.",
    prompt: `Go to Coupa and approve all of the approval from Sarah under 1000$ and send me an emails with what I approved (asked follow-up for Outlook)`,
    category: "Management",
    difficulty: "easy",
    estimatedTime: "15-20 minutes"
  }
];

// Function to add prompts to the JSON file
async function addEvalPromptsToLibrary() {
  console.log('🔥 Starting to add evaluation prompts to library...');
  
  const promptsPath = path.join(__dirname, '../backend/data/prompts.json');
  const backupPath = path.join(__dirname, '../backend/data/prompts-eval-backup-' + Date.now() + '.json');
  
  try {
    // Create backup
    const originalData = fs.readFileSync(promptsPath, 'utf8');
    fs.writeFileSync(backupPath, originalData);
    console.log(`📄 Backup created: ${path.basename(backupPath)}`);
    
    // Parse existing prompts
    const existingPrompts = JSON.parse(originalData);
    console.log(`📊 Found ${existingPrompts.length} existing prompts`);
    
    // Process each evaluation prompt
    const newPrompts = evalPrompts.map(evalPrompt => ({
      id: evalPrompt.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: evalPrompt.title,
      description: evalPrompt.description,
      prompt: evalPrompt.prompt,
      category: evalPrompt.category,
      tags: [], // Will be auto-tagged by the existing tag system
      difficulty: evalPrompt.difficulty,
      estimatedTime: evalPrompt.estimatedTime,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      rating: 0,
      reviews: []
    }));
    
    // Add new prompts to existing ones
    const allPrompts = [...existingPrompts, ...newPrompts];
    
    // Save updated prompts
    fs.writeFileSync(promptsPath, JSON.stringify(allPrompts, null, 2));
    console.log(`✅ Added ${newPrompts.length} evaluation prompts successfully!`);
    
    // Display summary
    console.log('\n📈 New Prompts Added:');
    const categoryCounts = {};
    const difficultyCounts = {};
    
    newPrompts.forEach(prompt => {
      categoryCounts[prompt.category] = (categoryCounts[prompt.category] || 0) + 1;
      difficultyCounts[prompt.difficulty] = (difficultyCounts[prompt.difficulty] || 0) + 1;
    });
    
    console.log('\nBy Category:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} prompts`);
    });
    
    console.log('\nBy Difficulty:');
    Object.entries(difficultyCounts).forEach(([difficulty, count]) => {
      console.log(`  ${difficulty}: ${count} prompts`);
    });
    
    console.log(`\n🎯 Total prompts in library: ${allPrompts.length}`);
    console.log(`📁 Backup saved as: ${path.basename(backupPath)}`);
    
    console.log('\n🏷️ Note: Run the retag-prompts.js script to apply intelligent tags to these new prompts!');
    
  } catch (error) {
    console.error('❌ Error adding prompts:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  addEvalPromptsToLibrary();
}

module.exports = { addEvalPromptsToLibrary, evalPrompts };