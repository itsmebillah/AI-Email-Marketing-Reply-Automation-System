class DashboardService {

  static getStats() {

    const leads =
      SheetService.getRows(
        CONFIG.SHEETS.LEADS
      );

    const aiLogs =
      SheetService.getRows(
        CONFIG.SHEETS.AI_LOGS
      );

    const reviews =
      SheetService.getRows(
        CONFIG.SHEETS.HUMAN_REVIEW
      );

    const processed =
      SheetService.getRows(
        CONFIG.SHEETS.PROCESSED_REPLIES
      );

    return {

      totalLeads:
        leads.length,

      newLeads:
        leads.filter(
          l =>
            l["Status"] === "NEW"
        ).length,

      emailsSent:
        leads.filter(
          l =>
            l["Status"] ===
            CONFIG.STATUS.EMAIL_SENT
        ).length,

      replies:
        processed.length,

      aiReplies:
        aiLogs.filter(
          l =>
            l["Action"] ===
            "auto_reply"
        ).length,

      humanReviews:
        reviews.filter(
          r =>
            r["Status"] ===
            "PENDING"
        ).length

    };

  }

  static getHumanReviews() {

    return SheetService.getRows(
      CONFIG.SHEETS.HUMAN_REVIEW
    );

  }

}