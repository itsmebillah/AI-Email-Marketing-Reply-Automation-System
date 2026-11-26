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
              const matched = KnowledgeService.reviewMatches(fullBody, keywords);
              let result;
              if (matched.length || queue.has(key)) {
                update({Status: CONFIG.STATUS.HUMAN_REVIEW, 'Follow-up Date': ''});
                if (!queue.has(key)) {
                  const reason = 'Priority: ' + matched.slice(0, 5).join(', ');
                  HumanReviewService.enqueue(lead, key, 'REPLY', reason, '', message.getSubject(), id, body);
                  queue.add(key);
                  try { ReviewAlerts.notify(key); } catch (_) { console.warn('A priority alert could not be recorded.'); }
                  reviewed++;
                }
                result = {intent: 'priority_review', confidence: '', reply: '', action: 'human_review'};
              } else {
                result = AutoReplies.handle(lead, message, context, body);
                if (result.action === 'auto_reply_sent') {
                  update({Status: CONFIG.STATUS.AI_REPLIED, 'Last Sent': new Date(), 'Follow-up Date': ''});
                } else if (lead.Status !== CONFIG.STATUS.HUMAN_REVIEW && !AutoReplies.priorityPending(context.threadId)) {
                  update({Status: CONFIG.STATUS.REPLIED, 'Follow-up Date': ''});
                }
              }
              SheetService.appendRecord(CONFIG.SHEETS.AI_LOGS, {
                Date: new Date(), Email: email, Intent: result.intent, Confidence: result.confidence,
                Action: result.action, Reply: result.reply
              });
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

class AutoReplies {
  static enabled() {
    const workbook = SpreadsheetApp.getActiveSpreadsheet();
    return Boolean(workbook && PropertiesService.getScriptProperties().getProperty('AUTO_REPLY_SETTINGS_SHEET_ID') === workbook.getId()
      && SettingsService.get('AUTO_REPLY_ENABLED') === true && EmailPolicy.sendEnabled());
  }

  static install() {
    const sheet = SheetService.getSheet(CONFIG.SHEETS.SETTINGS);
    const headers = SheetService.header(sheet);
    const keyColumn = headers.indexOf('Key') + 1;
    const valueColumn = headers.indexOf('Value') + 1;
    if (!keyColumn || !valueColumn) throw new Error('Settings requires Key and Value columns.');
    const rows = sheet.getRange(1, keyColumn, sheet.getLastRow(), 1).getValues()
      .flatMap(([key], index) => String(key).trim() === 'AUTO_REPLY_ENABLED' ? [index + 1] : []);
    if (rows.length > 1) throw new Error('Remove duplicate AUTO_REPLY_ENABLED settings.');
    if (!rows.length) {
      SheetService.appendRecord(CONFIG.SHEETS.SETTINGS, {Key: 'AUTO_REPLY_ENABLED', Value: false});
      rows.push(sheet.getLastRow());
    }
    const properties = PropertiesService.getScriptProperties();
    const workbookId = sheet.getParent().getId();
    const cell = sheet.getRange(rows[0], valueColumn);
    if (properties.getProperty('AUTO_REPLY_SETTINGS_SHEET_ID') !== workbookId || typeof cell.getValue() !== 'boolean') {
      cell.setValue(false);
    }
    cell.setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().setAllowInvalid(false).build());
    cell.setNote('Enables AI replies only for replies without a Review Keywords match. Also requires EMAIL_SEND_ENABLED and a working AI provider.');
    const log = SheetService.getSheet(CONFIG.SHEETS.EMAIL_LOGS);
    const logHeaders = SheetService.header(log);
    if (!logHeaders.includes('Sent Message ID')) {
      const column = logHeaders.length + 1;
      if (column > log.getMaxColumns()) log.insertColumnsAfter(log.getMaxColumns(), 1);
      log.getRange(1, column).setValue('Sent Message ID').setFontWeight('bold');
    }
    SpreadsheetApp.flush();
    properties.setProperty('AUTO_REPLY_SETTINGS_SHEET_ID', workbookId);
  }

  static priorityPending(threadId) {
    return SheetService.getRows(CONFIG.SHEETS.HUMAN_REVIEW).some(row =>
      row['Thread ID'] === threadId && row.Status === 'PENDING' && String(row.Reason || '').startsWith('Priority:'));
  }

  static handle(lead, message, context, body) {
    const result = {intent: '', confidence: '', reply: '', action: 'auto_reply_paused'};
    if (!this.enabled()) return result;
    const email = EmailPolicy.email(lead.Email);
    const messageId = message.getId();
    const threadId = context.threadId;
    const logId = 'AUTO_REPLY:' + messageId;
    const subject = String(message.getSubject() || '');
    const eligible = current => {
      const latest = current.later[current.later.length - 1];
      return current.threadId === threadId && !current.hasUnrecognizedSender && latest?.getId() === messageId
        && !GmailService.automated(latest) && EmailPolicy.headerEmail(latest.getFrom()) === email
        && EmailPolicy.headerEmail(latest.getReplyTo() || latest.getFrom()) === email;
    };
    if (!eligible(context) || this.priorityPending(threadId) || !subject.trim() || subject.length > 180 || /[\x00-\x1F\x7F]/.test(subject)) {
      return {...result, action: 'auto_reply_held'};
    }
    const logs = SheetService.getRows(CONFIG.SHEETS.EMAIL_LOGS);
    if (logs.some(row => row['Log ID'] === logId)) return {...result, action: 'auto_reply_already_recorded'};
    if (logs.some(row => row['Thread ID'] === threadId && ['AUTO_REPLY_SENDING', 'AUTO_REPLY_UNKNOWN'].includes(row.Type))) {
      return {...result, action: 'auto_reply_delivery_unresolved'};
    }
    const cutoff = Date.now() - 86400000;
    const sends = logs.filter(row => ['AUTO_REPLY', 'AUTO_REPLY_SENDING', 'AUTO_REPLY_UNKNOWN'].includes(row.Type)
      && new Date(row['Sent Date']).getTime() >= cutoff);
    if (sends.length >= 20) return {...result, action: 'auto_reply_limit'};
    const draft = AiService.suggest(body);
    if (draft.intent === 'other' && !String(draft.reply || '').trim()) {
      draft.reply = 'Hello,\n\nThank you for your message. Could you share a little more about what you would like to know so we can help?';
    }
    if (!draft.reply || !draft.reply.trim() || ['spam', 'not_interested'].includes(draft.intent)) {
      return {...draft, action: 'auto_reply_no_safe_draft'};
    }
    const current = GmailService.inspect(lead);
    if (!this.enabled() || EmailPolicy.suppressed(email) || !eligible(current) || this.priorityPending(threadId)) {
      return {...draft, action: 'auto_reply_held'};
    }
    SheetService.appendRecord(CONFIG.SHEETS.EMAIL_LOGS, {
      'Log ID': logId, 'Lead ID': lead['Lead ID'], 'Thread ID': threadId,
      Subject: subject, 'Sent Date': new Date(), Type: 'AUTO_REPLY_SENDING'
    });
    SpreadsheetApp.flush();
    const update = fields => SheetService.updateRecord(CONFIG.SHEETS.EMAIL_LOGS, 'Log ID', logId, fields);
    try {
      const sent = GmailService.send({Kind: 'REPLY', Subject: subject}, lead, draft.reply,
        {...current, parent: current.later[current.later.length - 1]});
      if (!sent?.id || sent.threadId !== threadId) throw new Error('Gmail did not confirm the expected thread.');
      update({Type: 'AUTO_REPLY', 'Sent Message ID': sent.id});
      SpreadsheetApp.flush();
      return {...draft, action: 'auto_reply_sent'};
    } catch (_) {
      try { update({Type: 'AUTO_REPLY_UNKNOWN'}); } catch (__) { /* Preserve the existing delivery claim. */ }
      return {...draft, action: 'auto_reply_delivery_unresolved'};
    }
  }
}

function prepareAutoReplySettings() {
  EmailPolicy.requireOwner();
  return withEmailLock_(() => {
    EmailPolicy.requirePrivateWorkbook();
    AutoReplies.install();
  });
}
