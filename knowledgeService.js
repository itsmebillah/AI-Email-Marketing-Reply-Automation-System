class KnowledgeService {
  static getKnowledgeText() {
    return SheetService.getRows(CONFIG.SHEETS.KNOWLEDGE)
      .filter(row => String(row.Content || '').trim())
      .map(row => String(row.Category || '') + ':\n' + row.Content).join('\n\n');
  }

  static normalizeWords(value) {
    return String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();
  }

  static reviewKeywords() {
    const mapping = new Map();
    for (const row of SheetService.getRows(CONFIG.SHEETS.KNOWLEDGE)) {
      for (const item of String(row['Review Keywords'] || '').split(/[,;\n،]+/)) {
        const keyword = item.trim();
        const normalized = this.normalizeWords(keyword);
        if (normalized && !mapping.has(normalized)) mapping.set(normalized, keyword.slice(0, 80));
      }
    }
    return mapping;
  }

  static reviewMatches(body, keywords) {
    const reply = String(body || '').split(/\r?\n(?:\s*>|On [^\r\n]*wrote:|[- ]*Original Message[- ]*)/i)[0];
    const text = ' ' + this.normalizeWords(reply) + ' ';
    return Array.from(keywords).filter(([phrase]) => text.includes(' ' + phrase + ' ')).map(([, keyword]) => keyword);
  }
}
