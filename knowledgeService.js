class KnowledgeService {

  static getKnowledgeText() {

    const rows =
      SheetService.getRows(
        CONFIG.SHEETS.KNOWLEDGE
      );

    let text = "";

    rows.forEach(row => {

      text +=
`
${row["Category"]}:
${row["Content"]}

`;

    });

    return text;

  }

}