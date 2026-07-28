# Contributing

Changes should preserve Gmail thread identity, prevent duplicate reply processing, and keep automatic sending disabled by default.

## Development Workflow

1. Use a separate Apps Script development project and synthetic spreadsheet data.
2. Review [README.md](README.md) and [DEPENDENCY_DIAGRAM.md](DEPENDENCY_DIAGRAM.md).
3. Run JavaScript syntax checks locally.
4. Push with `clasp` only after confirming `.clasp.json` targets the intended development project.
5. Exercise `setupProject()`, `processNewLeads()`, `checkReplies()`, and `runFollowups()` manually.

Never use real customer addresses or production credentials in fixtures, screenshots, issues, or commits. Changes to AI routing or auto-reply behavior must document confidence thresholds, failure handling, and the human-review path.

