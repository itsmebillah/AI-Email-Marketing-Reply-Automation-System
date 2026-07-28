# Security Policy

## Sensitive Data

This project can access Gmail threads, customer messages, spreadsheet records, Groq, Telegram, and Twilio. Never commit API keys, bot tokens, account credentials, message exports, or real lead data.

The current implementation supports sheet-based configuration for compatibility. Restrict spreadsheet editor access and migrate credentials to Apps Script `PropertiesService` before production use.

## Safe Operation

- Keep `AUTO_REPLY_ENABLED` disabled until prompts and outputs are tested.
- Use least-privilege Apps Script scopes and a dedicated development spreadsheet.
- Review customer content before forwarding it to third-party alert services.
- Rotate any credential exposed in execution logs, spreadsheets, screenshots, or commits.
- Treat `createTriggers()` carefully because it replaces all triggers owned by this project.

Report vulnerabilities privately to [itsmbillah@gmail.com](mailto:itsmbillah@gmail.com) rather than opening a public issue with sensitive details.
