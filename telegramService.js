class TelegramService {

  static sendAlert(
    lead,
    intent,
    message
  ) {

    const enabled =
      SettingsService.get(
        "TELEGRAM_ENABLED"
      );

    if (
      String(enabled)
        .toUpperCase() !==
      "TRUE"
    ) {
      return;
    }

    try {

      const botToken =
        SettingsService.get(
          "TELEGRAM_BOT_TOKEN"
        );

      const chatId =
        SettingsService.get(
          "TELEGRAM_CHAT_ID"
        );

      const text = `
🚨 HUMAN REVIEW REQUIRED

🆔 Lead ID:
${lead["Lead ID"] || "-"}

👤 Customer:
${lead["Name"] || "-"}

📧 Email:
${lead["Email"] || "-"}

🏢 Company:
${lead["Company"] || "-"}

🏷 Intent:
${intent}

💬 Customer Message:

${message}
`;

      const response =
        UrlFetchApp.fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: "post",
            contentType:
              "application/json",
            payload:
              JSON.stringify({
                chat_id: chatId,
                text: text
              }),
            muteHttpExceptions: true
          }
        );

      Logger.log(
        response.getContentText()
      );

    } catch (err) {

      Logger.log(
        "TELEGRAM ERROR"
      );

      Logger.log(err);

    }

  }

}