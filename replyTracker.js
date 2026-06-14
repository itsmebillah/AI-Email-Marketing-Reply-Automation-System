class ReplyTracker {

  static isProcessed(
    messageId
  ) {

    const rows =
      SheetService.getRows(
        CONFIG.SHEETS.PROCESSED_REPLIES
      );

    return rows.some(
      row =>
        row["Message ID"] ==
        messageId
    );

  }

  static markProcessed(
    messageId,
    threadId
  ) {

    const sheet =
      SheetService.getSheet(
        CONFIG.SHEETS.PROCESSED_REPLIES
      );

    sheet.appendRow([

      messageId,

      threadId,

      new Date()

    ]);

  }

}