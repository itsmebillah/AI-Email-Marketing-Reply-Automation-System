class HumanReviewService {
  static index() {
    return new Set(SheetService.getRows(CONFIG.SHEETS.HUMAN_REVIEW).map(row => row['Review ID']));
  }

  static enqueue(lead, id, kind, reason, draft, subject, sourceId, message) {
    SheetService.appendRecord(CONFIG.SHEETS.HUMAN_REVIEW, {
      Date: new Date(), Customer: lead.Name, Email: EmailPolicy.email(lead.Email),
      Reason: reason, Status: 'PENDING', Message: String(message || '').slice(0, 4000),
      'Review ID': id, 'Lead ID': String(lead['Lead ID']), Kind: kind,
      'Thread ID': lead['Thread ID'], 'Source Message ID': sourceId, Subject: subject, Draft: draft,
      'Draft Revision': Utilities.getUuid()
    });
  }

  static decide(request) {
    if (!request || typeof request.id !== 'string' || !['SAVE', 'REJECT', 'SEND', 'RESOLVE'].includes(request.action)) {
      throw new Error('Invalid review decision.');
    }
    const reviews = SheetService.getRows(CONFIG.SHEETS.HUMAN_REVIEW);
    const match = reviews.filter(row => row['Review ID'] === request.id);
    if (match.length !== 1 || match[0].Status !== 'PENDING') {
      throw new Error('This review is no longer pending. Refresh the queue.');
    }
    const review = match[0];
    if (String(review['Draft Revision'] || '') !== request.revision) {
      throw new Error('The draft changed. Refresh before taking action.');
    }
    const draft = String(request.draft || '').trim();
    const patch = record => SheetService.updateRecord(CONFIG.SHEETS.HUMAN_REVIEW, 'Review ID', request.id, record);
    if (request.action === 'SAVE') {
      if (!draft || draft.length > 10000) throw new Error('Enter a draft of 1 to 10,000 characters.');
      patch({Draft: draft, 'Draft Revision': Utilities.getUuid()});
      return 'Draft saved.';
    }
    if (request.action === 'REJECT' || request.action === 'RESOLVE') {
      patch({Status: request.action === 'REJECT' ? 'REJECTED' : 'RESOLVED', 'Decision At': new Date()});
      return 'Review closed.';
    }
    if (!EmailPolicy.sendEnabled()) throw new Error('Sending is paused. Check EMAIL_SEND_ENABLED in the Settings tab.');
    if (!draft || draft.length > 10000) throw new Error('Enter a draft of 1 to 10,000 characters.');
    const leads = SheetService.getRows(CONFIG.SHEETS.LEADS);
    const email = EmailPolicy.email(review.Email);
    if (!email || email === EmailPolicy.owner() || GmailApp.getAliases().some(alias => EmailPolicy.email(alias) === email)
      || EmailPolicy.suppressed(email)) throw new Error('Recipient is invalid, suppressed, or the sending mailbox.');
    const matching = leads.filter(row => String(row['Lead ID']) === String(review['Lead ID']) || EmailPolicy.email(row.Email) === email);
    if (matching.length !== 1 || String(matching[0]['Lead ID']) !== String(review['Lead ID'])
      || EmailPolicy.email(matching[0].Email) !== email) throw new Error('Lead or recipient changed, or is duplicated.');
    const lead = matching[0];
    this.checkReview(review, lead);
    const since = Date.now() - 86400000;
    const attempts = reviews.filter(row => ['SENDING', 'SENT', 'SEND_UNKNOWN'].includes(row.Status)
      && new Date(row['Decision At']).getTime() >= since);
    if (attempts.length >= 20) throw new Error('The rolling 24-hour limit has been reached.');
    if (reviews.some(row => row['Review ID'] !== request.id && EmailPolicy.email(row.Email) === email
      && ['SENDING', 'SEND_UNKNOWN'].includes(row.Status))) {
      throw new Error('An earlier send needs reconciliation before any more mail to this recipient.');
    }
    patch({Status: 'SENDING', Draft: draft, 'Decision At': new Date()});
    SpreadsheetApp.flush();
    let currentLead;
    let context;
    try {
      if (!EmailPolicy.sendEnabled() || EmailPolicy.suppressed(email)) {
        throw new Error('Sending was stopped before Gmail was called.');
      }
      const current = SheetService.getRows(CONFIG.SHEETS.LEADS).filter(row =>
        String(row['Lead ID']) === String(review['Lead ID']) || EmailPolicy.email(row.Email) === email);
      if (current.length !== 1 || String(current[0]['Lead ID']) !== String(review['Lead ID'])
        || EmailPolicy.email(current[0].Email) !== email) {
        throw new Error('Lead or recipient changed before sending.');
      }
      currentLead = current[0];
      context = this.checkReview(review, currentLead);
    } catch (error) {
      patch({Status: 'PENDING'});
      throw error;
    }
    let sent;
    try {
      sent = GmailService.send(review, currentLead, draft, context);
      if (!sent.id || !sent.threadId) throw new Error('Missing Gmail result.');
      patch({Status: 'SENT', 'Sent Message ID': sent.id, 'Thread ID': sent.threadId});
      SpreadsheetApp.flush();
    } catch (_) {
      patch({Status: 'SEND_UNKNOWN'});
      SpreadsheetApp.flush();
      throw new Error('Delivery could not be confirmed. Check Gmail Sent before taking any further action.');
    }
    const changes = {'Last Sent': new Date()};
    if (review.Kind === 'INITIAL') {
      Object.assign(changes, {'Initial Message ID': sent.id, 'Thread ID': sent.threadId,
        Status: CONFIG.STATUS.EMAIL_SENT, Send: 'SENT'});
    } else if (review.Kind === 'FOLLOWUP') {
      const count = Number(currentLead['Follow-up Count'] || 0) + 1;
      const next = new Date();
      next.setDate(next.getDate() + 7);
      Object.assign(changes, {'Follow-up Count': count, 'Follow-up Date': count < 2 ? next : '',
        Status: count < 2 ? CONFIG.STATUS.EMAIL_SENT : CONFIG.STATUS.CLOSED});
    } else {
      Object.assign(changes, {Status: CONFIG.STATUS.REPLIED, 'Follow-up Date': ''});
    }
    try {
      SheetService.updateRecord(CONFIG.SHEETS.LEADS, 'Lead ID', String(lead['Lead ID']), changes);
      SheetService.appendRecord(CONFIG.SHEETS.EMAIL_LOGS, {
        'Log ID': sent.id, 'Lead ID': lead['Lead ID'], 'Thread ID': sent.threadId,
        Subject: review.Subject, 'Sent Date': changes['Last Sent'], Type: review.Kind
      });
    } catch (_) {
      return 'Gmail accepted the message. Reconcile the lead and EmailLogs against this SENT review.';
    }
    return 'Gmail accepted the message.';
  }

  static checkReview(review, lead) {
    const email = EmailPolicy.email(lead.Email);
    if (review.Kind === 'INITIAL') {
      if (lead.Status !== CONFIG.STATUS.NEW || lead.Send !== 'READY' || lead['Thread ID']) {
        throw new Error('The initial lead is no longer ready.');
      }
      return {};
    }
    const context = GmailService.inspect(lead);
    if (review.Kind !== 'INITIAL' && String(review.Subject || '') !== (review.Kind === 'FOLLOWUP' ? context.anchor : context.later[context.later.length - 1])?.getSubject()) {
      throw new Error('The Gmail subject changed. Refresh the conversation.');
    }
    if (context.threadId !== String(review['Thread ID']) || context.hasUnrecognizedSender) {
      throw new Error('The Gmail conversation needs manual review.');
    }
    if (review.Kind === 'FOLLOWUP') {
      const expected = 'FOLLOWUP:' + lead['Lead ID'] + ':' + Number(lead['Follow-up Count'] || 0);
      if (review['Review ID'] !== expected || context.inbound.length || !EmailPolicy.canFollowUp(lead, new Date())) {
        throw new Error('The follow-up is no longer eligible.');
      }
      return {...context, parent: context.anchor};
    }
    if (review.Kind !== 'REPLY' || lead.Status !== CONFIG.STATUS.HUMAN_REVIEW) {
      throw new Error('This reply is no longer eligible.');
    }
    const message = context.later[context.later.length - 1];
    if (!message || message.getId() !== String(review['Source Message ID'])
      || EmailPolicy.headerEmail(message.getFrom()) !== email || GmailService.automated(message)
      || EmailPolicy.headerEmail(message.getReplyTo() || message.getFrom()) !== email) {
      throw new Error('The message or reply address changed. Review the conversation in Gmail.');
    }
    return {...context, parent: message};
  }
}
