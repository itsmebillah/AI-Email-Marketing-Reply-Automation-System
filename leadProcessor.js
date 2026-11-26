class LeadProcessor {
  static processNewLeads() {
    if (!SettingsService.enabled('AUTO_SEND_NEW_LEADS')) return 0;
    const leads = SheetService.getRows(CONFIG.SHEETS.LEADS);
    const queue = HumanReviewService.index();
    const template = TemplateService.getTemplate('TMP001');
    if (!template) return 0;
    const seen = new Set();
    let created = 0;
    for (const lead of leads) {
      if (created >= 10) break;
      const email = EmailPolicy.email(lead.Email);
      const id = String(lead['Lead ID'] || '').trim();
      const key = 'INITIAL:' + id;
      if (!email || !id || lead.Status !== CONFIG.STATUS.NEW || lead.Send !== 'READY'
        || lead['Thread ID'] || queue.has(key) || seen.has(email) || EmailPolicy.suppressed(email)) continue;
      const matching = leads.filter(row => EmailPolicy.email(row.Email) === email || String(row['Lead ID']) === id);
      if (matching.length !== 1) continue;
      seen.add(email);
      HumanReviewService.enqueue(lead, key, 'INITIAL', 'Initial outreach',
        GmailService.render(template.Body, lead), String(template.Subject || ''));
      created++;
    }
    return created;
  }
}
