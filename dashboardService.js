class DashboardService {
  static getDashboard() {
    const reviews = SheetService.getRows(CONFIG.SHEETS.HUMAN_REVIEW);
    const rows = reviews.filter(row => row['Review ID'] && ['PENDING', 'SENDING', 'SEND_UNKNOWN'].includes(row.Status));
    return {
      pending: rows.filter(row => row.Status === 'PENDING').length,
      confirmed: reviews.filter(row => row.Status === 'SENT').length,
      unresolved: rows.filter(row => row.Status !== 'PENDING').length,
      sendEnabled: EmailPolicy.sendEnabled(),
      items: rows.slice().reverse().slice(0, 25).map(row => ({
        id: String(row['Review ID']), revision: String(row['Draft Revision'] || ''), kind: String(row.Kind || ''), status: String(row.Status),
        customer: String(row.Customer || ''), email: String(row.Email || ''),
        reason: String(row.Reason || ''), subject: String(row.Subject || ''),
        message: String(row.Message || ''), draft: String(row.Draft || '')
      }))
    };
  }
}
