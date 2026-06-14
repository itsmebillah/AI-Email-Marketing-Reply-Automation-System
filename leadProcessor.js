class LeadProcessor {

  static processNewLeads() {

    const enabled =
      SettingsService.get(
        "AUTO_SEND_NEW_LEADS"
      );

    if (
      enabled !== "TRUE"
    ) {
      return;
    }

    const leads =
      SheetService.getRows(
        CONFIG.SHEETS.LEADS
      );

    const template =
      TemplateService.getTemplate(
        "TMP001"
      );

    leads.forEach(lead => {

      const status =
        lead["Status"];

      const send =
        lead["Send"];

      if (
        status ===
          CONFIG.STATUS.NEW &&
        send === "READY"
      ) {

        GmailService.sendEmail(
          lead,
          template
        );

        SheetService.updateCellByLeadId(
          lead["Lead ID"],
          "Send",
          "SENT"
        );

      }

    });

  }

}