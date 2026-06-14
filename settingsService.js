class SettingsService {

  static get(key) {

    const sheet =
      SheetService.getSheet(
        CONFIG.SHEETS.SETTINGS
      );

    const data =
      sheet.getDataRange()
      .getValues();

    for (let i = 1; i < data.length; i++) {

      if (data[i][0] == key) {

        return data[i][1];

      }

    }

    return null;

  }

  static set(
    key,
    value
  ) {

    const sheet =
      SheetService.getSheet(
        CONFIG.SHEETS.SETTINGS
      );

    const data =
      sheet.getDataRange()
      .getValues();

    for (let i = 1; i < data.length; i++) {

      if (data[i][0] == key) {

        sheet
          .getRange(i + 1, 2)
          .setValue(value);

        return;

      }

    }

  }

}