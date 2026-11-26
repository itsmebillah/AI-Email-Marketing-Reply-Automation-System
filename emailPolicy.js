class EmailPolicy {
  static email(value) {
    const address = String(value || '').trim().toLowerCase();
    return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i
      .test(address) && address.length <= 254 && !address.includes('..') ? address : '';
  }

  static headerEmail(value) {
    const header = String(value || '').trim();
    const match = header.match(/^[^<>]*<([^<>]+)>$/);
    return this.email(match ? match[1] : header);
  }

  static owner() {
    return this.email(PropertiesService.getScriptProperties().getProperty('REVIEWER_EMAIL'));
  }

  static isOwner() {
    const owner = this.owner();
    return Boolean(owner && owner === this.email(Session.getEffectiveUser().getEmail()));
  }

  static requireOwner() {
    if (!this.isOwner() || this.email(Session.getActiveUser().getEmail()) !== this.owner()) {
      throw new Error('Set REVIEWER_EMAIL in Script Properties using the designated mailbox account.');
    }
  }

  static requirePrivateWorkbook() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) throw new Error('Open the bound spreadsheet before operating the queue.');
    let token;
    let count = 0;
    do {
      const result = Drive.Permissions.list(spreadsheet.getId(), {
        fields: 'nextPageToken,permissions(type,role)',
        supportsAllDrives: true, pageSize: 100, pageToken: token
      });
      if ((result.permissions || []).some(permission => ['anyone', 'domain'].includes(permission.type))) {
        throw new Error('Restrict spreadsheet sharing before reading or sending customer email.');
      }
      count += (result.permissions || []).length;
      token = result.nextPageToken;
    } while (token);
    if (!count) throw new Error('Could not verify spreadsheet sharing.');
  }

  static sendEnabled() {
    // Only a real checked box enables reviewer-approved sending.
    const workbook = SpreadsheetApp.getActiveSpreadsheet();
    const properties = PropertiesService.getScriptProperties();
    return Boolean(workbook && properties.getProperty('EMAIL_SENDING_SETTINGS_SHEET_ID') === workbook.getId()
      && SettingsService.get('EMAIL_SEND_ENABLED') === true);
  }

  static installSendingControl(reset) {
    const sheet = SheetService.getSheet(CONFIG.SHEETS.SETTINGS);
    const headers = SheetService.header(sheet);
    const keyColumn = headers.indexOf('Key') + 1;
    const valueColumn = headers.indexOf('Value') + 1;
    if (!keyColumn || !valueColumn) throw new Error('Settings must contain Key and Value headers.');
    const keys = sheet.getRange(1, keyColumn, sheet.getLastRow(), 1).getValues();
    const rows = keys.flatMap(([value], index) => String(value).trim() === 'EMAIL_SEND_ENABLED' ? [index + 1] : []);
    if (rows.length > 1) throw new Error('Remove duplicate EMAIL_SEND_ENABLED entries in Settings.');
    if (!rows.length) {
      SheetService.appendRecord(CONFIG.SHEETS.SETTINGS, {Key: 'EMAIL_SEND_ENABLED', Value: false});
      rows.push(sheet.getLastRow());
    }
    const cell = sheet.getRange(rows[0], valueColumn);
    cell.setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().setAllowInvalid(false).build());
    cell.setNote('Checked lets the reviewer approve individual sends. Unchecked pauses all sending.');
    const properties = PropertiesService.getScriptProperties();
    const workbookId = sheet.getParent().getId();
    if (reset || properties.getProperty('EMAIL_SENDING_SETTINGS_SHEET_ID') !== workbookId
      || typeof cell.getValue() !== 'boolean') {
      cell.setValue(false);
      SpreadsheetApp.flush();
    }
    properties.setProperty('EMAIL_SENDING_SETTINGS_SHEET_ID', workbookId);
    for (const key of ['AUTO_SEND_NEW_LEADS', 'FOLLOWUP_QUEUE_ENABLED', 'AI_ENABLED']) {
      const matches = keys.flatMap(([value], index) => String(value).trim() === key ? [index + 1] : []);
      if (matches.length === 1) {
        const setting = sheet.getRange(matches[0], valueColumn);
        const current = setting.getValue();
        setting.setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().setAllowInvalid(false).build());
        setting.setValue(!reset && String(current).trim().toLowerCase() === 'true');
      } else if (!matches.length) {
        SheetService.appendRecord(CONFIG.SHEETS.SETTINGS, {Key: key, Value: false});
        sheet.getRange(sheet.getLastRow(), valueColumn)
          .setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().setAllowInvalid(false).build());
      }
    }
  }

  static suppressed(email) {
    return SheetService.getRows('Suppressions').some(row => this.email(row.Email) === email);
  }

  static suppress(email, reason) {
    if (!this.suppressed(email)) SheetService.appendRecord('Suppressions', {Email: email, Reason: reason, Date: new Date()});
  }

  static canFollowUp(lead, now) {
    const date = lead['Follow-up Date'];
    const count = Number(lead['Follow-up Count'] || 0);
    return lead.Status === CONFIG.STATUS.EMAIL_SENT && Boolean(lead['Thread ID'])
      && date instanceof Date && Number.isFinite(date.getTime()) && date <= now
      && Number.isInteger(count) && count >= 0 && count < 2;
  }
}
