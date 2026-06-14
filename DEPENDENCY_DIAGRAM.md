# Dependency Diagram

This document shows which services call which other services in the current Apps Script project.

## Service Call Diagram

```mermaid
flowchart TD
    Code["Code.js entry points"]
    DashboardUI["dashboard.html"]
    Setup["setup.js"]
    Config["config.js constants"]

    LeadProcessor["LeadProcessor"]
    GmailMonitor["GmailMonitor"]
    FollowupService["FollowupService"]
    DashboardService["DashboardService"]

    GmailService["GmailService"]
    GroqService["GroqService"]
    HumanReviewService["HumanReviewService"]
    TelegramService["TelegramService"]
    TwilioService["TwilioService"]

    SheetService["SheetService"]
    SettingsService["SettingsService"]
    TemplateService["TemplateService"]
    KnowledgeService["KnowledgeService"]
    ReplyTracker["ReplyTracker"]

    GAS["Google Apps Script Services\nSpreadsheetApp / GmailApp / ScriptApp /\nHtmlService / UrlFetchApp / Utilities / Session"]
    APIs["External APIs\nGroq / Telegram / Twilio"]

    Code --> DashboardService
    Code --> FollowupService
    Code --> GmailMonitor
    Code --> LeadProcessor
    Code --> GAS
    Code -. uses .-> Config

    DashboardUI --> Code

    Setup --> GAS
    Setup -. uses .-> Config

    LeadProcessor --> SettingsService
    LeadProcessor --> SheetService
    LeadProcessor --> TemplateService
    LeadProcessor --> GmailService
    LeadProcessor -. uses .-> Config

    GmailMonitor --> SettingsService
    GmailMonitor --> SheetService
    GmailMonitor --> GmailService
    GmailMonitor --> ReplyTracker
    GmailMonitor --> KnowledgeService
    GmailMonitor --> GroqService
    GmailMonitor --> HumanReviewService
    GmailMonitor --> TwilioService
    GmailMonitor --> TelegramService
    GmailMonitor -. uses .-> Config

    FollowupService --> TemplateService
    FollowupService --> SheetService
    FollowupService --> GmailService
    FollowupService -. uses .-> Config

    DashboardService --> SheetService
    DashboardService -. uses .-> Config

    GmailService --> SheetService
    GmailService --> GAS
    GmailService -. uses .-> Config

    GroqService --> SettingsService
    GroqService --> GAS
    GroqService --> APIs

    HumanReviewService --> SheetService
    HumanReviewService -. uses .-> Config

    TelegramService --> SettingsService
    TelegramService --> GAS
    TelegramService --> APIs

    TwilioService --> SettingsService
    TwilioService --> GAS
    TwilioService --> APIs

    KnowledgeService --> SheetService
    KnowledgeService -. uses .-> Config

    TemplateService --> SheetService
    TemplateService -. uses .-> Config

    SettingsService --> SheetService
    SettingsService -. uses .-> Config

    ReplyTracker --> SheetService
    ReplyTracker -. uses .-> Config

    SheetService --> GAS
    SheetService -. uses .-> Config
```

## Service-to-Service Adjacency List

### Entry points

- `Code.js` -> `DashboardService`, `FollowupService`, `GmailMonitor`, `LeadProcessor`
- `dashboard.html` -> `Code.js` server functions through `google.script.run`
- `setup.js` -> Google Apps Script spreadsheet APIs

### Core workflow services

- `LeadProcessor` -> `SettingsService`, `SheetService`, `TemplateService`, `GmailService`
- `GmailMonitor` -> `SettingsService`, `SheetService`, `GmailService`, `ReplyTracker`, `KnowledgeService`, `GroqService`, `HumanReviewService`, `TwilioService`, `TelegramService`
- `FollowupService` -> `TemplateService`, `SheetService`, `GmailService`
- `DashboardService` -> `SheetService`

### Integration services

- `GmailService` -> `SheetService`, Google Apps Script Gmail/utility services
- `GroqService` -> `SettingsService`, `UrlFetchApp`, Groq API
- `TelegramService` -> `SettingsService`, `UrlFetchApp`, Telegram Bot API
- `TwilioService` -> `SettingsService`, `UrlFetchApp`, Twilio API

### Spreadsheet-backed utility services

- `SettingsService` -> `SheetService`
- `TemplateService` -> `SheetService`
- `KnowledgeService` -> `SheetService`
- `ReplyTracker` -> `SheetService`
- `HumanReviewService` -> `SheetService`

### Shared base layer

- `SheetService` -> Google Apps Script spreadsheet APIs
- `config.js` supplies constants to nearly every service

## Most Central Service

`GmailMonitor` is the main orchestration hub. It has the highest coupling and coordinates:

- Gmail thread reads
- knowledge lookup
- AI analysis
- AI logging
- lead status updates
- duplicate reply tracking
- escalation to human review
- external notifications

If you want to refactor the project later, `GmailMonitor` is the best first target to split into smaller workflow components.
