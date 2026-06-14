# Deployment Guide

This guide walks a new user through deploying the Mail Automation project for the first time.

It assumes you want to:

- connect the local repository to Google Apps Script
- create the spreadsheet structure
- add configuration
- authorize the required Google permissions
- enable automatic triggers

## What This Project Needs

Before deployment, it helps to know what the system depends on:

- a Google account
- a Google Spreadsheet bound to an Apps Script project
- Gmail access from that same Google account
- local Node.js so you can use `clasp`
- optional third-party accounts for:
  - Groq
  - Telegram Bot API
  - Twilio WhatsApp

## Before You Start

Install these on your machine:

```bash
npm install -g @google/clasp
```

Then sign in to `clasp`:

```bash
clasp login
```

## Step 1: Get the Project Locally

Clone the repository and move into it:

```bash
git clone <your-repo-url>
cd Mail_Automation
```

If the project was shared with you as files only, just place the files in a local folder and open that folder in your terminal.

## Step 2: Verify the Apps Script Link

This repo already contains a `.clasp.json` file with a script ID. Check whether it points to the Apps Script project you are supposed to use:

```bash
clasp status
```

If that command succeeds, your local repo is linked correctly.

If you need to link this codebase to a different Apps Script project:

1. Create or open the target Apps Script project in your browser.
2. Copy its script ID from Project Settings.
3. Update `.clasp.json` with that script ID.

## Step 3: Push the Code to Apps Script

Deploy the local source files to Apps Script:

```bash
clasp push
```

If you want to inspect the remote project afterward:

```bash
clasp open
```

## Step 4: Open the Bound Spreadsheet

This project is designed to run against a Google Spreadsheet. From the Apps Script editor:

1. Open the project.
2. Open the bound spreadsheet.
3. Keep both open during setup.

If this Apps Script project is not bound to a spreadsheet yet, create a spreadsheet-bound Apps Script project first, then link the repo to that script ID.

## Step 5: Create the Required Sheets

In the Apps Script editor, run:

```text
setupProject()
```

This should create the following sheets:

- `Leads`
- `Templates`
- `KnowledgeBase`
- `EmailLogs`
- `AILogs`
- `HumanReview`
- `ProcessedReplies`
- `Settings`

## Step 6: Handle the Current Setup Limitation

The current code calls `setupSettings()` from `setupProject()`, but `setupSettings()` is not included in the repository.

That means a new user may hit an error during setup.

### What to do

Use this practical workaround:

1. Run `setupProject()`.
2. Confirm that the sheets were created.
3. If the script errors afterward, continue setup manually.
4. Open the `Settings` sheet and enter the required keys yourself.

This is safe because the important sheet structure is created before that missing helper matters.

## Step 7: Populate the Settings Sheet

Add these keys to the `Settings` sheet:

| Key | Example Value | Required |
| --- | --- | --- |
| `AUTO_SEND_NEW_LEADS` | `TRUE` | Yes |
| `AI_ENABLED` | `TRUE` | Yes |
| `AUTO_REPLY_ENABLED` | `FALSE` | Yes |
| `GROQ_API_KEY` | `your-api-key` | If using AI replies |
| `GROQ_MODEL` | `llama-3.1-8b-instant` | If using AI replies |
| `CONFIDENCE_THRESHOLD` | `70` | If using AI replies |
| `TELEGRAM_ENABLED` | `FALSE` | Optional |
| `TELEGRAM_BOT_TOKEN` | `your-bot-token` | If using Telegram |
| `TELEGRAM_CHAT_ID` | `your-chat-id` | If using Telegram |
| `WHATSAPP_ENABLED` | `FALSE` | Optional |
| `TWILIO_SID` | `your-account-sid` | If using WhatsApp |
| `TWILIO_TOKEN` | `your-auth-token` | If using WhatsApp |
| `TWILIO_FROM` | `whatsapp:+14155238886` | If using WhatsApp |
| `TWILIO_TO` | `whatsapp:+8801XXXXXXXXX` | If using WhatsApp |

### Safe starter configuration

For a first deployment, use:

- `AUTO_SEND_NEW_LEADS = FALSE`
- `AI_ENABLED = TRUE`
- `AUTO_REPLY_ENABLED = FALSE`
- `TELEGRAM_ENABLED = FALSE`
- `WHATSAPP_ENABLED = FALSE`

This lets you test the system without sending automatic outbound replies too aggressively.

## Step 8: Add Templates

Open the `Templates` sheet and add at least these two rows:

### Initial outreach template

- `Template ID`: `TMP001`
- `Template Name`: `Initial Outreach`
- `Subject`: your subject line
- `Body`: your email body

### Follow-up template

- `Template ID`: `TMP002`
- `Template Name`: `Follow Up`
- `Subject`: your follow-up subject
- `Body`: your follow-up body

Supported placeholders in template bodies:

- `{{name}}`
- `{{company}}`

## Step 9: Add Knowledge Base Entries

If you want AI analysis to behave well, populate the `KnowledgeBase` sheet.

Each row should contain:

- `Category`
- `Content`

Examples:

- pricing policy
- supported services
- meeting availability
- refund or complaint handling guidance

## Step 10: Add Test Leads

Open the `Leads` sheet and add a few safe test rows.

Use these columns:

- `Lead ID`
- `Name`
- `Email`
- `Company`
- `Status`
- `Send`
- `Thread ID`
- `Last Sent`
- `Follow-up Date`
- `Follow-up Count`

For a lead you want the system to send:

- set `Status` to `NEW`
- set `Send` to `READY`

## Step 11: Authorize the Script

Before automation works, Google will ask you to grant permissions.

Run these functions manually from the Apps Script editor one at a time:

1. `processNewLeads()`
2. `checkReplies()`
3. `runFollowups()`
4. `openDashboard()`

During these runs, grant the requested permissions.

The script may request access to:

- Gmail
- Google Sheets
- external HTTP requests
- script triggers
- HTML sidebar rendering

## Step 12: Test the Core Workflow

Do a small manual test before turning on triggers.

### Test outbound email

1. Add one test lead.
2. Set:
   - `Status = NEW`
   - `Send = READY`
3. Run `processNewLeads()`.
4. Confirm:
   - email is sent
   - `Thread ID` is filled in
   - `Status` becomes `EMAIL_SENT`
   - `Send` becomes `SENT`

### Test reply processing

1. Reply to that email from the recipient inbox.
2. Run `checkReplies()`.
3. Confirm:
   - a row appears in `AILogs`
   - the reply is added to `ProcessedReplies`
   - the lead status updates
   - if needed, a row appears in `HumanReview`

### Test follow-up behavior

1. Set `Follow-up Date` to today for a lead with a valid `Thread ID`.
2. Run `runFollowups()`.
3. Confirm:
   - a follow-up reply is sent in-thread
   - `Follow-up Count` increases
   - `Follow-up Date` moves 7 days forward

## Step 13: Create Triggers

Once manual testing looks good, run:

```text
createTriggers()
```

This creates these time-based triggers:

| Function | Schedule |
| --- | --- |
| `checkReplies` | Every 15 minutes |
| `runFollowups` | Every day at 9 AM |
| `processNewLeads` | Every 5 minutes |

### Important warning

`createTriggers()` deletes all existing triggers in this Apps Script project before recreating its own triggers.

If the script project contains unrelated automations, do not run it until you review that behavior.

## Step 14: Open the Dashboard

Reload the spreadsheet. You should see a custom menu:

`AI Email System`

From there you can open the sidebar dashboard and manually trigger:

- lead processing
- reply checking
- follow-ups

## Post-Deployment Checklist

After deployment, confirm all of these:

- code pushed successfully with `clasp`
- spreadsheet sheets exist
- `Settings` sheet is populated
- `Templates` sheet contains `TMP001` and `TMP002`
- `KnowledgeBase` contains useful entries
- test lead was processed successfully
- Gmail thread ID was captured
- AI logs are being written
- triggers were created
- dashboard opens in the spreadsheet

## Troubleshooting

### `setupProject()` throws an error

Most likely cause: missing `setupSettings()` function.

What to do:

- ignore the missing helper for now
- verify the sheets were created
- fill the `Settings` sheet manually

### `clasp push` fails

Check:

- `clasp login` completed successfully
- `.clasp.json` points to the correct script ID
- you have access to that Apps Script project

### No emails are being sent

Check:

- `AUTO_SEND_NEW_LEADS` is enabled when needed
- the lead has `Status = NEW`
- the lead has `Send = READY`
- `TMP001` exists
- Gmail permissions were granted

### Reply monitoring does nothing

Check:

- `AI_ENABLED = TRUE`
- the lead has a valid `Thread ID`
- the email reply was sent in the same thread
- `GROQ_API_KEY` and `GROQ_MODEL` are populated

### Human review alerts do not arrive

Check:

- corresponding feature flag is `TRUE`
- credentials are correct
- Apps Script has external request permission

## Security Recommendations For New Users

For a safer first deployment:

- keep `AUTO_REPLY_ENABLED` set to `FALSE` at first
- restrict spreadsheet editor access
- avoid storing production secrets in a widely shared sheet
- test Telegram and Twilio on private/internal recipients first

## Recommended First Production Rollout

Use this order:

1. Deploy the code.
2. Set up sheets and settings.
3. Add templates and knowledge.
4. Test with one internal lead.
5. Enable triggers.
6. Add a small batch of real leads.
7. Monitor `AILogs`, `HumanReview`, and `EmailLogs`.
8. Only then consider enabling `AUTO_REPLY_ENABLED`.

## Related Docs

- [README.md](./README.md)
- [DEPENDENCY_DIAGRAM.md](./DEPENDENCY_DIAGRAM.md)
