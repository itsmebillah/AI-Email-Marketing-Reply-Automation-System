class FollowupService {
  static run() {
    if (!SettingsService.enabled('FOLLOWUP_QUEUE_ENABLED')) return 0;
    const template = TemplateService.getTemplate('TMP002');
    if (!template) return 0;
    const queue = HumanReviewService.index();
    const now = new Date();
    let created = 0;
    for (const lead of SheetService.getRows(CONFIG.SHEETS.LEADS)) {
      if (created >= 10) break;
      if (!EmailPolicy.canFollowUp(lead, now)) continue;
      const id = String(lead['Lead ID'] || '').trim();
      const email = EmailPolicy.email(lead.Email);
      const key = 'FOLLOWUP:' + id + ':' + Number(lead['Follow-up Count'] || 0);
      if (!id || !email || queue.has(key) || EmailPolicy.suppressed(email)) continue;
      let thread;
      try {
        thread = GmailService.inspect(lead);
      } catch (_) {
        continue;
      }
      if (thread.inbound.length || thread.hasUnrecognizedSender) continue;
      HumanReviewService.enqueue(lead, key, 'FOLLOWUP', 'Scheduled follow-up',
        GmailService.render(template.Body, lead), thread.anchor.getSubject(), thread.anchor.getId());
      created++;
    }
    return created;
  }
}
