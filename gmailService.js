class GmailService {

  /**
   * Send Initial Email
   */
  static sendEmail(
    lead,
    template
  ) {

    const email =
      lead["Email"];

    const leadId =
      lead["Lead ID"];

    const subject =
      template["Subject"];

    const body =
      template["Body"]
        .replace(
          /{{name}}/gi,
          lead["Name"] || ""
        )
        .replace(
          /{{company}}/gi,
          lead["Company"] || ""
        );

    GmailApp.sendEmail(
      email,
      subject,
      body
    );

    Utilities.sleep(3000);

    const threads =
      GmailApp.search(
        `to:${email} newer_than:1d`
      );

    if (
      threads.length > 0
    ) {

      const threadId =
        threads[0].getId();

      SheetService.updateCellByLeadId(
        leadId,
        "Thread ID",
        threadId
      );

      SheetService.updateCellByLeadId(
        leadId,
        "Status",
        CONFIG.STATUS.EMAIL_SENT
      );

      SheetService.updateCellByLeadId(
        leadId,
        "Last Sent",
        new Date()
      );

      this.logEmail(
        leadId,
        threadId,
        subject,
        "INITIAL"
      );

    }

  }

  /**
   * Reply Inside Existing Thread
   */
  static sendThreadReply(
    threadId,
    replyText
  ) {

    try {

      const thread =
        GmailApp.getThreadById(
          threadId
        );

      thread.reply(
        replyText
      );

      return true;

    } catch (err) {

      Logger.log(err);

      return false;

    }

  }

  /**
   * Get Latest Customer Reply
   */
  static getLatestCustomerReply(
    threadId
  ) {

    try {

      const thread =
        GmailApp.getThreadById(
          threadId
        );

      const messages =
        thread.getMessages();

      const myEmail =
        Session
          .getActiveUser()
          .getEmail();

      for (
        let i =
          messages.length - 1;
        i >= 0;
        i--
      ) {

        const msg =
          messages[i];

        const sender =
          msg.getFrom();

        if (
          !sender.includes(
            myEmail
          )
        ) {

          return {

            messageId:
              msg.getId(),

            from:
              sender,

            subject:
              msg.getSubject(),

            body:
              msg.getPlainBody(),

            date:
              msg.getDate()

          };

        }

      }

      return null;

    } catch (err) {

      Logger.log(err);

      return null;

    }

  }

  /**
   * Log Email Activity
   */
  static logEmail(
    leadId,
    threadId,
    subject,
    type
  ) {

    const sheet =
      SheetService.getSheet(
        CONFIG.SHEETS.EMAIL_LOGS
      );

    sheet.appendRow([

      Utilities.getUuid(),

      leadId,

      threadId,

      subject,

      new Date(),

      type

    ]);

  }

  /**
   * Followup Email
   */
  static sendFollowup(
    lead,
    template
  ) {

    const threadId =
      lead["Thread ID"];

    if (
      !threadId
    ) return;

    const body =
      template["Body"]
        .replace(
          /{{name}}/gi,
          lead["Name"] || ""
        )
        .replace(
          /{{company}}/gi,
          lead["Company"] || ""
        );

    this.sendThreadReply(
      threadId,
      body
    );

    this.logEmail(
      lead["Lead ID"],
      threadId,
      template["Subject"],
      "FOLLOWUP"
    );

  }

}