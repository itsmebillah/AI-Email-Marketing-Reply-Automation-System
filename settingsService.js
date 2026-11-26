class SettingsService {
  static get(key) {
    const rows = SheetService.getRows(CONFIG.SHEETS.SETTINGS);
    const matches = rows.filter(row => String(row.Key || '').trim() === key);
    return matches.length === 1 ? matches[0].Value : null;
  }

  static enabled(key) {
    return String(this.get(key)).trim().toLowerCase() === 'true';
  }
}
