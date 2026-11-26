class TelegramService {
  static reviewText(review, lead) {
    const excerpt = (value, limit) => {
      const text = String(value ?? '')
        .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
        .replace(/(?:https?:\/\/|www\.)\S+/gi, '[link omitted]')
        .replace(/[\w.%+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email omitted]')
        .replace(/(?:\+?\d[\d ().-]{6,}\d)/g, '[number omitted]')
        .replace(/\s+/g, ' ').trim();
      const characters = [...text];
      return characters.length > limit ? characters.slice(0, limit - 1).join('') + '…' : text;
    };
    const reply = String(review.Message || '')
      .split(/\r?\n(?:\s*>|On [^\r\n]*wrote:|[- ]*Original Message[- ]*|--\s*(?:\r?\n|$))/i)[0];
    return [
      'Priority customer reply',
      '',
      'Customer: ' + (excerpt(review.Customer || lead?.Name, 90) || 'Unavailable'),
      'Company: ' + (excerpt(lead?.Company, 90) || 'Unavailable'),
      'Subject: ' + (excerpt(review.Subject, 140) || 'Unavailable'),
      'Review keywords: ' + (excerpt(String(review.Reason || '').replace(/^Priority:\s*/i, ''), 140) || 'Unavailable'),
      '',
      'Customer reply: ' + (excerpt(reply, 360) || 'Open the review queue to read the reply.'),
      '',
      'Open AI Email System → Review queue.'
    ].join('\n');
  }

  static sendReviewAlert(properties, text) {
    const token = String(properties.getProperty('TELEGRAM_BOT_TOKEN') || '');
    const chat = String(SettingsService.get('TELEGRAM_CHAT_ID') || '').trim();
    if (!/^\d+:[\w-]+$/.test(token) || !/^-?\d{3,20}$/.test(chat)) return 'NOT_CONFIGURED';
    const response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true, followRedirects: false,
      payload: JSON.stringify({chat_id: chat, text, link_preview_options: {is_disabled: true}})
    });
    return response.getResponseCode() === 200 && JSON.parse(response.getContentText()).ok === true ? 'ACCEPTED' : 'REJECTED';
  }
}

class ReviewAlerts {
  static notify(id) {
    const settings = SheetService.getRows(CONFIG.SHEETS.SETTINGS);
    const properties = PropertiesService.getScriptProperties();
    const text = 'A priority customer reply needs human review. Open AI Email System > Review queue.';
    const channels = [
      ['WHATSAPP_ENABLED', 'WhatsApp Alert', () => TwilioService.sendReviewAlert(properties, text)],
      ['TELEGRAM_ENABLED', 'Telegram Alert', review => {
        const lead = SheetService.getRows(CONFIG.SHEETS.LEADS)
          .find(row => String(row['Lead ID']) === String(review['Lead ID']));
        return TelegramService.sendReviewAlert(properties, TelegramService.reviewText(review, lead));
      }]
    ];
    for (const [flag, column, send] of channels) {
      const values = settings.filter(row => row.Key === flag);
      if (!values.length || !values.every(row => String(row.Value).trim().toLowerCase() === 'true')) continue;
      const review = SheetService.getRows(CONFIG.SHEETS.HUMAN_REVIEW).find(row => row['Review ID'] === id);
      if (!review || review[column]) continue;
      const update = result => SheetService.updateRecord(CONFIG.SHEETS.HUMAN_REVIEW, 'Review ID', id, {[column]: result});
      try {
        update('ATTEMPTING');
        SpreadsheetApp.flush();
        update(send(review));
      } catch (_) {
        try { update('UNKNOWN'); } catch (__) { /* Keep the attempt claim if available. */ }
      }
    }
  }
}
