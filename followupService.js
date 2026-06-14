class FollowupService {

  static run() {

    const template =
      TemplateService.getTemplate(
        "TMP002"
      );

    if (!template) return;

    const leads =
      SheetService.getRows(
        CONFIG.SHEETS.LEADS
      );

    const today =
      new Date();

    leads.forEach(lead => {

      const status =
        lead["Status"];

      if (
        status ===
        CONFIG.STATUS.HUMAN_REVIEW
      ) {
        return;
      }

      const followupDate =
        lead["Follow-up Date"];

      if (!followupDate)
        return;

      const dueDate =
        new Date(
          followupDate
        );

      if (
        dueDate <= today
      ) {

        GmailService.sendFollowup(
          lead,
          template
        );

        this.updateLead(
          lead
        );

      }

    });

  }

  static updateLead(
    lead
  ) {

    const sheet =
      SheetService.getSheet(
        CONFIG.SHEETS.LEADS
      );

    const data =
      sheet.getDataRange()
      .getValues();

    const headers =
      data[0];

    const leadIdCol =
      headers.indexOf(
        "Lead ID"
      );

    const countCol =
      headers.indexOf(
        "Follow-up Count"
      );

    const dateCol =
      headers.indexOf(
        "Follow-up Date"
      );

    for (
      let i = 1;
      i < data.length;
      i++
    ) {

      if (
        data[i][leadIdCol] ==
        lead["Lead ID"]
      ) {

        let count =
          Number(
            data[i][countCol]
          ) || 0;

        count++;

        sheet
          .getRange(
            i + 1,
            countCol + 1
          )
          .setValue(
            count
          );

        const nextDate =
          new Date();

        nextDate.setDate(
          nextDate.getDate() + 7
        );

        sheet
          .getRange(
            i + 1,
            dateCol + 1
          )
          .setValue(
            nextDate
          );

        break;

      }

    }

  }

}