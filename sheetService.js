class SheetService {

  static getSheet(name) {

    return SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(name);

  }

  static getRows(sheetName) {

    const sheet =
      this.getSheet(sheetName);

    const data =
      sheet.getDataRange()
      .getValues();

    if (data.length < 2)
      return [];

    const headers =
      data[0];

    return data
      .slice(1)
      .map(row => {

        let obj = {};

        headers.forEach(
          (h, i) => {

            obj[h] =
              row[i];

          }
        );

        return obj;

      });

  }

  static updateCellByLeadId(
    leadId,
    header,
    value
  ) {

    const sheet =
      this.getSheet(
        CONFIG.SHEETS.LEADS
      );

    const data =
      sheet.getDataRange()
      .getValues();

    const headers =
      data[0];

    const col =
      headers.indexOf(
        header
      ) + 1;

    for (
      let i = 1;
      i < data.length;
      i++
    ) {

      if (
        data[i][0] ==
        leadId
      ) {

        sheet
          .getRange(
            i + 1,
            col
          )
          .setValue(
            value
          );

        break;

      }

    }

  }

}