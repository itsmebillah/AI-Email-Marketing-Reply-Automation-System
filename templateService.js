class TemplateService {

  static getTemplate(
    templateId
  ) {

    const rows =
      SheetService.getRows(
        CONFIG.SHEETS.TEMPLATES
      );

    return rows.find(
      row =>
        row["Template ID"] ==
        templateId
    );

  }

}