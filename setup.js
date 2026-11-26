const EMAIL_SCHEMA = {
  Leads: ['Lead ID', 'Name', 'Email', 'Company', 'Status', 'Send', 'Thread ID',
    'Last Sent', 'Follow-up Date', 'Follow-up Count', 'Initial Message ID'],
  Templates: ['Template ID', 'Template Name', 'Subject', 'Body'],
  KnowledgeBase: ['Category', 'Content', 'Review Keywords'],
  EmailLogs: ['Log ID', 'Lead ID', 'Thread ID', 'Subject', 'Sent Date', 'Type'],
  AILogs: ['Date', 'Email', 'Intent', 'Confidence', 'Action', 'Reply'],
  HumanReview: ['Date', 'Customer', 'Email', 'Reason', 'Status', 'Message', 'Review ID', 'Lead ID',
    'Kind', 'Thread ID', 'Source Message ID', 'Subject', 'Draft', 'Decision At', 'Sent Message ID', 'Draft Revision', 'WhatsApp Alert', 'Telegram Alert'],
  ProcessedReplies: ['Message ID', 'Thread ID', 'Processed Date'],
  Settings: ['Key', 'Value'],
  Suppressions: ['Email', 'Reason', 'Date']
};

function setupProject() {
  EmailPolicy.requireOwner();
  return withEmailLock_(() => {
    const workbook = SpreadsheetApp.getActiveSpreadsheet();
    for (const [name, required] of Object.entries(EMAIL_SCHEMA)) {
      let sheet = workbook.getSheetByName(name);
      if (!sheet) sheet = workbook.insertSheet(name);
      const existing = sheet.getLastColumn() ? SheetService.header(sheet) : [];
      if (sheet.getLastRow() > 1 && !required.slice(0, name === 'Leads' ? 10 : name === 'HumanReview' ? 6 : name === 'KnowledgeBase' ? 2 : required.length)
        .every(header => existing.includes(header))) throw new Error('Inspect existing headers in ' + name);
      const missing = required.filter(header => !existing.includes(header));
      if (missing.length) {
        const necessary = existing.length + missing.length - sheet.getMaxColumns();
        if (necessary > 0) sheet.insertColumnsAfter(sheet.getMaxColumns(), necessary);
        sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
      }
      const maxColumn = sheet.getLastColumn();
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, maxColumn).setBackground('#E0EDEF').setFontColor('#213D4A')
        .setFontWeight('bold').setVerticalAlignment('middle');
      sheet.setRowHeight(1, 34);
    }
    const defaults = {
      AUTO_SEND_NEW_LEADS: false, FOLLOWUP_QUEUE_ENABLED: false, AI_ENABLED: false,
      WHATSAPP_ENABLED: false, TELEGRAM_ENABLED: false, TWILIO_CONTENT_SID: '',
      AI_PROVIDER: 'groq',
      AI_MODEL: SettingsService.get('GROQ_MODEL') || 'llama-3.1-8b-instant', CONFIDENCE_THRESHOLD: 70
    };
    const seen = new Set(SheetService.getRows(CONFIG.SHEETS.SETTINGS).map(row => row.Key));
    for (const [Key, Value] of Object.entries(defaults)) {
      if (!seen.has(Key)) SheetService.appendRecord(CONFIG.SHEETS.SETTINGS, {Key, Value});
    }
  });
}
