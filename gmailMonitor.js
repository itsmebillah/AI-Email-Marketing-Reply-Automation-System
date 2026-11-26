class GmailMonitor {
  static checkReplies() {
    const leads = SheetService.getRows(CONFIG.SHEETS.LEADS).filter(row =>
      row['Initial Message ID'] && row['Thread ID'] && row.Status !== CONFIG.STATUS.CLOSED);
    if (!leads.length) return 0;
    const props = PropertiesService.getScriptProperties();
    const offset = (Number(props.getProperty('REPLY_SCAN_OFFSET')) || 0) % leads.length;
    props.setProperty('REPLY_SCAN_OFFSET', String((offset + 15) % leads.length));
    const queue = HumanReviewService.index();
    const processed = new Set(SheetService.getRows(CONFIG.SHEETS.PROCESSED_REPLIES).map(row => String(row['Message ID'])));
    let reviewed = 0;
    const keywords = KnowledgeService.reviewKeywords();
    for (const lead of leads.slice(offset).concat(leads.slice(0, offset)).slice(0, 15)) {
      try {
        const context = GmailService.inspect(lead);
        const email = EmailPolicy.email(lead.Email);
        const update = values => SheetService.updateRecord(CONFIG.SHEETS.LEADS, 'Lead ID', String(lead['Lead ID']), values);
        for (const message of context.inbound) {
          const id = message.getId();
          if (processed.has(id)) continue;
          const key = 'REPLY:' + id;
          const fullBody = message.getPlainBody();
          const body = fullBody.slice(0, 4000);
          if (!GmailService.automated(message)) {
            if (/\b(?:unsubscribe|opt[ -]?out|stop (?:sending|emailing|contacting)|remove me)\b/i.test(fullBody.split(/\r?\nOn .*wrote:/i)[0])) {
              EmailPolicy.suppress(email, 'Customer opt-out');
              update({Status: CONFIG.STATUS.CLOSED, 'Follow-up Date': ''});
            } else if (!EmailPolicy.suppressed(email)) {
              update({Status: CONFIG.STATUS.HUMAN_REVIEW, 'Follow-up Date': ''});
              if (!queue.has(key)) {
                const matched = KnowledgeService.reviewMatches(fullBody, keywords);
                const result = matched.length ? {intent: 'priority_review', confidence: '', reply: ''} : AiService.suggest(body);
                const reason = matched.length ? 'Priority: ' + matched.slice(0, 5).join(', ') : result.intent;
                HumanReviewService.enqueue(lead, key, 'REPLY', reason, result.reply, message.getSubject(), id, body);
                queue.add(key);
                if (matched.length) {
                  try { ReviewAlerts.notify(key); } catch (_) { console.warn('A priority alert could not be recorded.'); }
                }
                SheetService.appendRecord(CONFIG.SHEETS.AI_LOGS, {
                  Date: new Date(), Email: email, Intent: result.intent, Confidence: result.confidence,
                  Action: 'human_review', Reply: result.reply
                });
                reviewed++;
              }
            }
          }
          SheetService.appendRecord(CONFIG.SHEETS.PROCESSED_REPLIES, {
            'Message ID': id, 'Thread ID': context.threadId, 'Processed Date': new Date()
          });
          processed.add(id);
          if (EmailPolicy.suppressed(email)) break;
        }
      } catch (_) {
        console.warn('A Gmail thread could not be processed.');
      }
    }
    return reviewed;
  }
}
