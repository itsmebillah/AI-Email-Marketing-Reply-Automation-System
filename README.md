# Mail Automation

Google Apps Script project for spreadsheet-driven outbound email automation, AI-assisted reply handling, follow-ups, and lightweight dashboard reporting.

## Overview

This project runs inside Google Apps Script and uses a Google Spreadsheet as the main datastore. It can:

- send initial outreach emails to leads stored in a sheet
- watch Gmail threads for incoming customer replies
- classify replies with Groq AI
- auto-reply when safe
- escalate replies to human review through spreadsheet logs and chat alerts
- send scheduled follow-up emails
- show basic KPIs in a spreadsheet sidebar dashboard

## Architecture

The codebase is organized as a small set of Apps Script entry points plus service-style modules.

### Runtime layers

1. Entry points
   Defined in [Code.js](./Code.js). These functions are invoked by:
   - spreadsheet menu items
   - time-based triggers
   - the dashboard sidebar via `google.script.run`

2. Core services
   Stateless classes that implement the workflow:
   - `LeadProcessor`: sends new leads
   - `GmailMonitor`: checks replies and routes them
   - `FollowupService`: sends follow-up emails
   - `DashboardService`: aggregates dashboard metrics

3. Integration services
   Wrappers around external systems:
   - `GmailService`: send emails, reply in threads, inspect Gmail threads
   - `GroqService`: call Groq chat completions API
   - `TelegramService`: send Telegram alerts
   - `TwilioService`: send WhatsApp alerts through Twilio

4. Spreadsheet-backed utility services
   Access shared project data:
   - `SheetService`
   - `SettingsService`
   - `TemplateService`
   - `KnowledgeService`
   - `ReplyTracker`
   - `HumanReviewService`

5. UI
   `dashboard.html` renders a simple sidebar dashboard in Google Sheets.

### High-level flow

```text
Leads Sheet
  -> LeadProcessor
  -> GmailService.sendEmail()
  -> Gmail thread ID stored in Leads sheet

Gmail replies
  -> GmailMonitor.checkReplies()
  -> GmailService.getLatestCustomerReply()
  -> GroqService.analyzeEmail()
  -> AILogs sheet
  -> auto reply OR human review

Human review path
  -> HumanReview sheet
  -> Telegram alert
  -> Twilio WhatsApp alert

Follow-up path
  -> FollowupService.run()
  -> Gmail thread reply
  -> Leads sheet follow-up counters/dates updated
```

## Project Structure

| File | Purpose |
| --- | --- |
| `Code.js` | Main entry points, menu items, trigger handlers, dashboard server functions |
| `config.js` | Sheet names and lead status constants |
| `setup.js` | Spreadsheet sheet creation and initial bootstrapping |
| `sheetService.js` | Read/write helpers for spreadsheet data |
| `settingsService.js` | Reads config values from the `Settings` sheet |
| `templateService.js` | Loads email templates from the `Templates` sheet |
| `knowledgeService.js` | Builds AI knowledge context from the `KnowledgeBase` sheet |
| `leadProcessor.js` | Sends new lead emails |
| `gmailService.js` | Gmail send/reply/thread operations and email logs |
| `gmailMonitor.js` | Reply monitoring, AI routing, and escalation logic |
| `groqService.js` | Groq API integration |
| `humanReviewService.js` | Writes pending review items |
| `replyTracker.js` | Prevents duplicate processing of the same Gmail message |
| `followupService.js` | Sends due follow-ups and updates lead schedule |
| `dashboardService.js` | Dashboard metrics and review list aggregation |
| `dashboard.html` | Sidebar dashboard UI |
| `telegramService.js` | Telegram Bot API integration |
| `twilioService.js` | Twilio WhatsApp API integration |
| `appsscript.json` | Apps Script manifest |
| `.clasp.json` | Local `clasp` project mapping |

## Data Model

`setupProject()` creates these sheets and headers:

### Leads

| Column |
| --- |
| `Lead ID` |
| `Name` |
| `Email` |
| `Company` |
| `Status` |
| `Send` |
| `Thread ID` |
| `Last Sent` |
| `Follow-up Date` |
| `Follow-up Count` |

### Templates

| Column |
| --- |
| `Template ID` |
| `Template Name` |
| `Subject` |
| `Body` |

### KnowledgeBase

| Column |
| --- |
| `Category` |
| `Content` |

### EmailLogs

| Column |
| --- |
| `Log ID` |
| `Lead ID` |
| `Thread ID` |
| `Subject` |
| `Sent Date` |
| `Type` |

### AILogs

| Column |
| --- |
| `Date` |
| `Email` |
| `Intent` |
| `Confidence` |
| `Action` |
| `Reply` |

### HumanReview

| Column |
| --- |
| `Date` |
| `Customer` |
| `Email` |
| `Reason` |
| `Status` |
| `Message` |

### ProcessedReplies

| Column |
| --- |
| `Message ID` |
| `Thread ID` |
| `Processed Date` |

### Settings

| Column |
| --- |
| `Key` |
| `Value` |

## Setup

### Prerequisites

- Google account with access to Google Sheets, Gmail, and Apps Script
- Node.js installed locally
- `clasp` installed globally:

```bash
npm install -g @google/clasp
```

- Access to the Apps Script project tied to the script ID in `.clasp.json`

### Initial local setup

1. Clone this repository.
2. Install and authenticate `clasp`:

```bash
clasp login
```

3. Confirm the project mapping:

```bash
clasp status
```

4. Push the source to Apps Script if needed:

```bash
clasp push
```

### Spreadsheet setup

1. Open the linked Apps Script project.
2. Open the bound Google Spreadsheet.
3. Run `setupProject()` once from the Apps Script editor.

This creates the required sheets and headers.

### Important setup note

`setupProject()` calls `setupSettings()`, but that function is not present in the current repository. Because of that, sheet creation works only up to the point where the missing function is invoked.

Recommended options:

- add a `setupSettings()` function before first-time setup, or
- comment out that call temporarily and populate the `Settings` sheet manually, or
- run `setupProject()`, then manually finish the `Settings` sheet if execution stops after sheet creation

## Configuration

Configuration is stored in the `Settings` sheet as key/value pairs.

### Expected settings

| Key | Purpose |
| --- | --- |
| `AUTO_SEND_NEW_LEADS` | Enables automatic sending for leads marked `READY` |
| `AI_ENABLED` | Enables reply monitoring and AI processing |
| `AUTO_REPLY_ENABLED` | Enables automatic AI-generated thread replies |
| `GROQ_API_KEY` | Groq API key |
| `GROQ_MODEL` | Groq model name |
| `CONFIDENCE_THRESHOLD` | Minimum AI confidence percentage before forcing human review |
| `TELEGRAM_ENABLED` | Enables Telegram alerts |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Telegram target chat ID |
| `WHATSAPP_ENABLED` | Enables Twilio WhatsApp alerts |
| `TWILIO_SID` | Twilio account SID |
| `TWILIO_TOKEN` | Twilio auth token |
| `TWILIO_FROM` | Twilio WhatsApp sender |
| `TWILIO_TO` | Twilio WhatsApp recipient |

### Suggested starter values

| Key | Example |
| --- | --- |
| `AUTO_SEND_NEW_LEADS` | `TRUE` |
| `AI_ENABLED` | `TRUE` |
| `AUTO_REPLY_ENABLED` | `FALSE` |
| `GROQ_MODEL` | `llama-3.1-8b-instant` |
| `CONFIDENCE_THRESHOLD` | `70` |
| `TELEGRAM_ENABLED` | `FALSE` |
| `WHATSAPP_ENABLED` | `FALSE` |

### Templates

Populate the `Templates` sheet with at least:

- `TMP001` for initial outreach emails
- `TMP002` for follow-up emails

Supported placeholders in template bodies:

- `{{name}}`
- `{{company}}`

### Lead statuses

The system uses these values from `config.js`:

- `NEW`
- `EMAIL_SENT`
- `REPLIED`
- `AI_REPLIED`
- `HUMAN_REVIEW`
- `CLOSED`

### Lead send control

For a new lead to be auto-sent by `LeadProcessor`, it must have:

- `Status = NEW`
- `Send = READY`

After sending, the script changes `Send` to `SENT`.

## Triggers

Triggers are created by running `createTriggers()` from `Code.js`.

### Trigger schedule

| Function | Schedule | Purpose |
| --- | --- | --- |
| `checkReplies` | Every 15 minutes | Scan Gmail threads and process new replies |
| `runFollowups` | Every day at 9 AM | Send due follow-up emails |
| `processNewLeads` | Every 5 minutes | Send eligible new leads |

### Trigger management

- `createTriggers()` deletes all existing project triggers and recreates the three automation triggers.
- `deleteAllTriggers()` deletes every trigger in the project.

Use those functions carefully if the Apps Script project contains unrelated triggers.

## Deployment Steps

### Local to Apps Script deployment

1. Authenticate `clasp`:

```bash
clasp login
```

2. Verify the target project:

```bash
clasp status
```

3. Push the latest code:

```bash
clasp push
```

4. Open the Apps Script editor if needed:

```bash
clasp open
```

5. In Apps Script, review and grant required scopes on first run.

### First-time deployment checklist

1. Push code with `clasp push`.
2. Open the bound spreadsheet.
3. Run `setupProject()`.
4. Populate the `Settings` sheet.
5. Add templates to `Templates`.
6. Add knowledge entries to `KnowledgeBase`.
7. Add or import leads into `Leads`.
8. Run `createTriggers()`.
9. Test with:
   - `processNewLeads()`
   - `checkReplies()`
   - `runFollowups()`

### Apps Script permissions

This project will require authorization for:

- Gmail access
- Spreadsheet access
- External HTTP requests via `UrlFetchApp`
- Script trigger execution
- HTML sidebar rendering

## Operational Workflow

### Sending new leads

1. Add a row to `Leads`.
2. Set `Status` to `NEW`.
3. Set `Send` to `READY`.
4. `processNewLeads()` sends the email using template `TMP001`.
5. The script logs the email and stores the Gmail thread ID.

### Processing replies

1. `checkReplies()` scans every lead with a thread ID.
2. The latest customer reply is fetched from Gmail.
3. Already-processed message IDs are skipped.
4. The reply body plus knowledge base text is sent to Groq.
5. The AI result is logged.
6. The script either:
   - sends an AI reply in-thread, or
   - creates a human review item and sends alerts

### Sending follow-ups

1. `runFollowups()` loads template `TMP002`.
2. Leads with a due `Follow-up Date` are processed.
3. A reply is sent in the existing Gmail thread.
4. `Follow-up Count` is incremented.
5. `Follow-up Date` is moved forward by 7 days.

## Dashboard

The spreadsheet menu adds an `AI Email System` menu with:

- `Dashboard`
- `Process Leads`
- `Check Replies`

The sidebar dashboard displays:

- total leads
- new leads
- emails sent
- processed replies
- AI replies
- pending human reviews

It also exposes buttons for:

- sending new leads
- checking replies
- running follow-ups

## Troubleshooting

### `setupProject()` fails

Cause: `setupSettings()` is referenced but not implemented in this repository.

Fix: add the missing function or manually populate the `Settings` sheet.

### No emails are sent

Check:

- `AUTO_SEND_NEW_LEADS = TRUE`
- lead `Status = NEW`
- lead `Send = READY`
- `TMP001` exists in `Templates`
- Gmail authorization has been granted

### AI replies do not run

Check:

- `AI_ENABLED = TRUE`
- `GROQ_API_KEY` is valid
- `GROQ_MODEL` is set
- `CONFIDENCE_THRESHOLD` is a number
- the lead has a valid `Thread ID`

### Alerts are not delivered

Check:

- Telegram or WhatsApp feature flag is `TRUE`
- all related credentials are populated in `Settings`
- external requests are authorized in Apps Script

## Security Notes

Current configuration is sheet-based, which is convenient but not ideal for secrets.

Recommendations:

- move API keys and tokens to `PropertiesService`
- restrict spreadsheet editor access
- disable `AUTO_REPLY_ENABLED` until prompts and outputs are well tested
- review what customer content is forwarded to Telegram and Twilio

## Development Notes

- Runtime: Apps Script V8
- Time zone: `Asia/Dhaka`
- Logging: Stackdriver / Apps Script execution logs
- The project is bound to an Apps Script script ID via `.clasp.json`

## Suggested Next Improvements

- implement `setupSettings()` with default configuration rows
- move secrets out of the spreadsheet
- add input validation and API response checks
- escape dashboard HTML output instead of writing raw `innerHTML`
- add a proper manual review action flow instead of a passive log sheet
