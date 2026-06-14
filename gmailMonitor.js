class GmailMonitor {

  static checkReplies() {

    const aiEnabled =
      SettingsService.get(
        "AI_ENABLED"
      );

    if (
      String(aiEnabled).toUpperCase() !==
      "TRUE"
    ) {

      Logger.log(
        "AI Disabled"
      );

      return;

    }

    const leads =
      SheetService.getRows(
        CONFIG.SHEETS.LEADS
      );

    leads.forEach(lead => {

      try {

        const threadId =
          lead["Thread ID"];

        if (!threadId)
          return;

        const latestReply =
          GmailService.getLatestCustomerReply(
            threadId
          );

        if (!latestReply)
          return;

        if (
          ReplyTracker.isProcessed(
            latestReply.messageId
          )
        ) {

          Logger.log(
            "Already Processed"
          );

          return;

        }

        this.processReply(
          lead,
          latestReply
        );

      } catch (err) {

        Logger.log(
          "CHECK REPLY ERROR"
        );

        Logger.log(err);

      }

    });

  }

  static processReply(
    lead,
    replyData
  ) {

    try {

      Logger.log(
        "PROCESS START"
      );

      const knowledgeText =
        KnowledgeService.getKnowledgeText();

      const aiResult =
        GroqService.analyzeEmail(
          replyData.body,
          knowledgeText
        );

      Logger.log(
        JSON.stringify(
          aiResult
        )
      );

      this.logAI(
        lead["Email"],
        aiResult
      );

      if (
        aiResult.action ===
        "human_review"
      ) {

        Logger.log(
          "HUMAN REVIEW"
        );

        HumanReviewService.add(
          lead,
          aiResult.intent,
          replyData.body
        );

        TwilioService.sendWhatsAppAlert(
          lead,
          aiResult.intent,
          replyData.body
        );

        TelegramService.sendAlert(
          lead,
          aiResult.intent,
          replyData.body
        );

        SheetService.updateCellByLeadId(
          lead["Lead ID"],
          "Status",
          CONFIG.STATUS.HUMAN_REVIEW
        );

        ReplyTracker.markProcessed(
          replyData.messageId,
          lead["Thread ID"]
        );

        return;

      }

      const autoReply =
        SettingsService.get(
          "AUTO_REPLY_ENABLED"
        );

      if (
        String(autoReply)
          .toUpperCase() ===
        "TRUE"
      ) {

        Logger.log(
          "AUTO REPLY"
        );

        GmailService.sendThreadReply(
          lead["Thread ID"],
          aiResult.reply
        );

      }

      SheetService.updateCellByLeadId(
        lead["Lead ID"],
        "Status",
        CONFIG.STATUS.AI_REPLIED
      );

      ReplyTracker.markProcessed(
        replyData.messageId,
        lead["Thread ID"]
      );

    } catch (err) {

      Logger.log(
        "PROCESS REPLY ERROR"
      );

      Logger.log(err);

    }

  }

  static logAI(
    email,
    aiResult
  ) {

    try {

      const sheet =
        SheetService.getSheet(
          CONFIG.SHEETS.AI_LOGS
        );

      sheet.appendRow([

        new Date(),

        email,

        aiResult.intent || "",

        aiResult.confidence || "",

        aiResult.action || "",

        aiResult.reply || ""

      ]);

    } catch (err) {

      Logger.log(
        "AI LOG ERROR"
      );

      Logger.log(err);

    }

  }

}