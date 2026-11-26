# Workflow

- Leads and Templates feed the HumanReview queue.
- Gmail threads go to the reply monitor. Review Keywords route matching replies directly to priority review and may notify enabled channels.
- Other eligible Gmail replies can receive a validated AI draft and send it in-thread if auto replies are enabled.
- On approval, recipient, suppression, thread, and sending checks run before Gmail is called. Gmail results are recorded in HumanReview and EmailLogs.
- Code.js exposes setup, menu actions, scheduling, and dashboard operations. SheetService performs named-column writes and EmailPolicy enforces workbook and reviewer requirements.
