class HumanReviewService {

  static add(
    lead,
    reason,
    message
  ) {

    const sheet =
      SheetService.getSheet(
        CONFIG.SHEETS.HUMAN_REVIEW
      );

    sheet.appendRow([

      new Date(),

      lead["Name"],

      lead["Email"],

      reason,

      "PENDING",

      message

    ]);

  }

  static getPending() {

    const rows =
      SheetService.getRows(
        CONFIG.SHEETS.HUMAN_REVIEW
      );

    return rows.filter(
      row =>
        row["Status"] ===
        "PENDING"
    );

  }

}