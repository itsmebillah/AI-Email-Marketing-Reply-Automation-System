class TwilioService {
  static sendReviewAlert(properties, text) {
    const account = String(properties.getProperty('TWILIO_SID') || SettingsService.get('TWILIO_SID') || '');
    const token = String(properties.getProperty('TWILIO_TOKEN') || '');
    const address = key => {
      const value = String(SettingsService.get(key) || '').trim();
      return value.startsWith('whatsapp:') ? value : 'whatsapp:' + value;
    };
    const from = address('TWILIO_FROM');
    const to = address('TWILIO_TO');
    const phone = /^whatsapp:\+[1-9]\d{7,14}$/;
    if (!/^AC[a-f0-9]{32}$/i.test(account) || !token || !phone.test(from) || !phone.test(to)) return 'NOT_CONFIGURED';
    const template = String(SettingsService.get('TWILIO_CONTENT_SID') || '').trim();
    if (template && !/^HX[a-f0-9]{32}$/i.test(template)) return 'NOT_CONFIGURED';
    const payload = {To: to, From: from};
    if (template) payload.ContentSid = template;
    else payload.Body = text;
    const response = UrlFetchApp.fetch('https://api.twilio.com/2010-04-01/Accounts/' + account + '/Messages.json', {
      method: 'post', muteHttpExceptions: true, followRedirects: false,
      headers: {Authorization: 'Basic ' + Utilities.base64Encode(account + ':' + token)}, payload
    });
    const status = response.getResponseCode();
    return status >= 200 && status < 300 ? 'ACCEPTED' : 'REJECTED';
  }
}
