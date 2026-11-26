# Deployment

Use a dedicated Gmail account and a private Sheet. Distribute a clean template with synthetic examples and no real lead records, logs, or credentials.

1. In a blank Sheet, add the root JavaScript, HTML, and manifest files to its bound Apps Script project. Enable Gmail and Drive advanced services. For a standard Google Cloud project, also enable both APIs in that project. For clasp, configure a local, ignored .clasp.json for the buyer-owned bound project.
2. Set sharing to **Restricted**. On a blank Sheet, set REVIEWER_EMAIL in Script Properties to the owner mailbox and run **setupProject** to create the tabs. Reload the Sheet, use **Set up Settings controls**, then **Schedule automation**. When using a prepared workbook copy, the owner can instead choose **Use my account as reviewer** from Review queue.
3. Add TMP001 and TMP002 to Templates. Supported body placeholders are name and company surrounded by double braces. Each starting lead needs a unique ID and address, status NEW, and send state READY.
4. Use **Queue ready leads**, then inspect Review queue. EMAIL_SEND_ENABLED allows individual approvals. AUTO_SEND_NEW_LEADS only adds drafts to the queue. Follow-up queueing uses its own setting.
5. To use an AI drafting provider, configure its model and key in the sidebar. Authorize limited customer excerpts and knowledge to go to the chosen provider before enabling AI drafts.

## Keyword rules and alerts

Use **KnowledgeBase → Review Keywords**. Enter words or phrases separated by commas, semicolons, or line breaks. They apply across the workbook. Matching is case-insensitive and uses whole words or phrases in the new reply body. Matches go to priority review without asking AI for a draft. Eligible unmatched replies use AUTO_REPLY_ENABLED and EMAIL_SEND_ENABLED to send a validated draft in the original thread. When AI returns `other` with an empty draft, the system asks for more detail using a standard reply. AILogs records each routing outcome.

- **Telegram:** Enable TELEGRAM_ENABLED. Put TELEGRAM_CHAT_ID in Settings and TELEGRAM_BOT_TOKEN in Script Properties.
- **WhatsApp:** Enable WHATSAPP_ENABLED. Configure TWILIO_SID, TWILIO_FROM and TWILIO_TO in Settings, and TWILIO_TOKEN in Script Properties. Use TWILIO_CONTENT_SID for an approved static WhatsApp notification template outside the 24-hour service window. [Twilio guide](https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates)

Review notifications omit customer identity and email content. HumanReview records acceptance or failures for each channel. An uncertain attempt is not retried automatically.

### Enable automatic replies

After the one-time Settings setup, opt in by checking AUTO_REPLY_ENABLED and EMAIL_SEND_ENABLED. Enable AI with a configured model and key, and use Check replies or Schedule automation. The upgrade resets the old inactive AUTO_REPLY_ENABLED setting to off once per workbook. Older replies already processed are not replayed.

## Test and recover

Enable sending only for a controlled test with an authorized recipient. Confirm the initial message ID, reply with a configured keyword, choose **Check replies**, and verify a Priority entry and the relevant channel statuses. If a send shows SENDING or SEND_UNKNOWN, reconcile with Gmail Sent before doing anything else. Disable sending from the Settings tab.
