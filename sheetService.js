class SheetService {
  static getSheet(name) {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet && spreadsheet.getSheetByName(name);
    if (!sheet) throw new Error('Missing required sheet: ' + name);
    return sheet;
  }

  static getRows(name) {
    const [headers, ...rows] = this.getSheet(name).getDataRange().getValues();
    return rows.filter(row => row.some(value => value !== '')).map(row =>
      Object.fromEntries(headers.map((header, index) => [header, row[index]])));
  }

  static literal(value) {
    return typeof value === 'string' && /^[\s\uFEFF]*[=+@'-]/.test(value) ? "'" + value : value ?? '';
  }

  static header(sheet) {
    const width = sheet.getLastColumn();
    if (!width) throw new Error('No headers in ' + sheet.getName());
    const headers = sheet.getRange(1, 1, 1, width).getValues()[0];
    const existing = headers.filter(Boolean);
    if (new Set(existing).size !== existing.length) throw new Error('Duplicate headers in ' + sheet.getName());
    return headers;
  }

  static appendRecord(name, record) {
    const sheet = this.getSheet(name);
    const headers = this.header(sheet);
    if (Object.keys(record).some(key => !headers.includes(key))) throw new Error('Run setup for ' + name);
    sheet.appendRow(headers.map(header => this.literal(record[header])));
  }

  static updateRecord(name, key, id, fields) {
    const sheet = this.getSheet(name);
    const headers = this.header(sheet);
    const keyColumn = headers.indexOf(key) + 1;
    if (!keyColumn || Object.keys(fields).some(field => !headers.includes(field))) {
      throw new Error('Run setup for ' + name);
    }
    const rows = sheet.getLastRow() - 1;
    if (rows <= 0) throw new Error('No rows found in ' + name);
    const ids = sheet.getRange(2, keyColumn, rows, 1).getValues();
    const matches = ids.flatMap(([value], index) => String(value) === String(id) ? [index + 2] : []);
    if (matches.length !== 1) throw new Error('Record is missing or duplicated in ' + name);
    for (const [field, value] of Object.entries(fields)) {
      sheet.getRange(matches[0], headers.indexOf(field) + 1).setValue(this.literal(value));
    }
  }
}
