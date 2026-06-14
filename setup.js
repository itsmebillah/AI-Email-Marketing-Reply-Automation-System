function setupProject() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  const sheets = {

    Leads: [
      "Lead ID",
      "Name",
      "Email",
      "Company",
      "Status",
      "Send",
      "Thread ID",
      "Last Sent",
      "Follow-up Date",
      "Follow-up Count"
    ],

    Templates: [
      "Template ID",
      "Template Name",
      "Subject",
      "Body"
    ],

    KnowledgeBase: [
      "Category",
      "Content"
    ],

    EmailLogs: [
      "Log ID",
      "Lead ID",
      "Thread ID",
      "Subject",
      "Sent Date",
      "Type"
    ],

    AILogs: [
      "Date",
      "Email",
      "Intent",
      "Confidence",
      "Action",
      "Reply"
    ],

    HumanReview: [
      "Date",
      "Customer",
      "Email",
      "Reason",
      "Status",
      "Message"
    ],

    ProcessedReplies: [
      "Message ID",
      "Thread ID",
      "Processed Date"
    ],

    Settings: [
      "Key",
      "Value"
    ]

  };

  Object.keys(sheets)
    .forEach(name => {

      let sheet =
        ss.getSheetByName(name);

      if (!sheet) {

        sheet =
          ss.insertSheet(name);

      }

      sheet.clear();

      sheet
        .getRange(
          1,
          1,
          1,
          sheets[name].length
        )
        .setValues([
          sheets[name]
        ]);

    });

  setupSettings();

}