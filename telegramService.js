class TelegramService {
  static sendReviewAlert(properties, text) {
    const token = String(properties.getProperty('TELEGRAM_BOT_TOKEN') || '');
    const chat = String(SettingsService.get('TELEGRAM_CHAT_ID') || '').trim();
    if (!/^\d+:[\w-]+$/.test(token) || !/^-?\d{3,20}$/.test(chat)) return 'NOT_CONFIGURED';
    const response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true, followRedirects: false,
      payload: JSON.stringify({chat_id: chat, text})
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
      ['TELEGRAM_ENABLED', 'Telegram Alert', () => TelegramService.sendReviewAlert(properties, text)]
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
        update(send());
      } catch (_) {
        try { update('UNKNOWN'); } catch (__) { /* Keep the attempt claim if available. */ }
      }
    }
  }
}
