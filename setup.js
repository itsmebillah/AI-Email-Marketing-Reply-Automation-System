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

      if (sheet.getLastRow() > 0) {

        return;

      }

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

function setupSettings() {

  const sheet =
    SheetService.getSheet(
      CONFIG.SHEETS.SETTINGS
    );

  const defaults = [
    ["AUTO_SEND_NEW_LEADS", false],
    ["AI_ENABLED", false],
    ["AUTO_REPLY_ENABLED", false],
    ["GROQ_API_KEY", ""],
    ["GROQ_MODEL", "llama-3.1-8b-instant"],
    ["CONFIDENCE_THRESHOLD", 70],
    ["TELEGRAM_ENABLED", false],
    ["TELEGRAM_BOT_TOKEN", ""],
    ["TELEGRAM_CHAT_ID", ""],
    ["WHATSAPP_ENABLED", false],
    ["TWILIO_SID", ""],
    ["TWILIO_TOKEN", ""],
    ["TWILIO_FROM", ""],
    ["TWILIO_TO", ""]
  ];

  const data =
    sheet.getDataRange()
      .getValues();

  const existingKeys =
    new Set(
      data.slice(1)
        .map(row => row[0])
        .filter(Boolean)
    );

  const missing =
    defaults.filter(
      row => !existingKeys.has(row[0])
    );

  if (missing.length === 0) {

    return;

  }

  sheet
    .getRange(
      sheet.getLastRow() + 1,
      1,
      missing.length,
      2
    )
    .setValues(missing);

}
