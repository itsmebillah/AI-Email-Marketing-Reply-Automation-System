class TwilioService {

  static sendWhatsAppAlert(
    lead,
    intent,
    message
  ) {

    const enabled =
      SettingsService.get(
        "WHATSAPP_ENABLED"
      );

    if (
      enabled !== "TRUE"
    ) {
      return;
    }

    try {

      const sid =
        SettingsService.get(
          "TWILIO_SID"
        );

      const token =
        SettingsService.get(
          "TWILIO_TOKEN"
        );

      const from =
        SettingsService.get(
          "TWILIO_FROM"
        );

      const to =
        SettingsService.get(
          "TWILIO_TO"
        );

      const body = `
🚨 HUMAN REVIEW REQUIRED

Customer:
${lead["Name"]}

Email:
${lead["Email"]}

Intent:
${intent}

Message:

${message}
`;

      const url =
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

      UrlFetchApp.fetch(url, {

        method: "post",

        headers: {

          Authorization:
            "Basic " +
            Utilities.base64Encode(
              sid + ":" + token
            )

        },

        payload: {

          To: to,
          From: from,
          Body: body

        }

      });

    } catch (err) {

      Logger.log(err);

    }

  }

}