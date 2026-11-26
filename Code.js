function onOpen() {
  SpreadsheetApp.getUi().createMenu('AI Email System')
    .addItem('Review queue', 'openDashboard')
    .addItem('Set up Settings controls', 'prepareEmailSettings')
    .addItem('Queue ready leads', 'processNewLeads')
    .addItem('Check replies', 'checkReplies')
    .addItem('Schedule automation', 'createTriggers')
    .addToUi();
}

function prepareEmailSettings() {
  EmailPolicy.requireOwner();
  return withEmailLock_(() => {
    EmailPolicy.requirePrivateWorkbook();
    EmailPolicy.installSendingControl(false);
    installReviewRouting_();
    sortEmailSettings_();
  });
}

function openDashboard() {
  SpreadsheetApp.getUi().showSidebar(
    HtmlService.createHtmlOutputFromFile('dashboard').setTitle('Email Review')
  );
}

function maintainEmailQueue_(job) {
  return withEmailLock_(() => {
    if (!EmailPolicy.isOwner()) return 0;
    EmailPolicy.requirePrivateWorkbook();
    return job();
  });
}

function withEmailLock_(job) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('Another email job is active. Try again shortly.');
  try {
    return job();
  } finally {
    try {
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }
  }
}

function processNewLeads() {
  return maintainEmailQueue_(() => LeadProcessor.processNewLeads());
}

function sendCampaign() {
  return processNewLeads();
}

function checkReplies() {
  return maintainEmailQueue_(() => GmailMonitor.checkReplies());
}

function runFollowups() {
  return maintainEmailQueue_(() => FollowupService.run());
}

function getEmailReviewAccess() {
  const owner = EmailPolicy.owner();
  const active = EmailPolicy.email(Session.getActiveUser().getEmail());
  const effective = EmailPolicy.email(Session.getEffectiveUser().getEmail());
  if (owner) return {ready: owner === active && owner === effective, canInitialize: false, isConfigured: true};
  if (!active || active !== effective) return {ready: false, canInitialize: false, isConfigured: false};
  const workbook = SpreadsheetApp.getActiveSpreadsheet();
  const file = workbook && Drive.Files.get(workbook.getId(), {fields: 'ownedByMe', supportsAllDrives: true});
  return {ready: false, canInitialize: Boolean(file?.ownedByMe), isConfigured: false};
}

function initializeEmailReviewer() {
  return withEmailLock_(() => {
    if (!getEmailReviewAccess().canInitialize) throw new Error('Sign in as the spreadsheet owner to set up the reviewer.');
    EmailPolicy.requirePrivateWorkbook();
    const email = EmailPolicy.email(Session.getActiveUser().getEmail());
    EmailPolicy.installSendingControl(true);
    installReviewRouting_();
    sortEmailSettings_();
    PropertiesService.getScriptProperties().setProperty('REVIEWER_EMAIL', email);
    installEmailTriggers_();
    return {ready: true};
  });
}

function getEmailAiSettings() {
  EmailPolicy.requireOwner();
  return AiService.publicSettings();
}

function saveEmailAiSettings(request) {
  EmailPolicy.requireOwner();
  return withEmailLock_(() => {
    EmailPolicy.requirePrivateWorkbook();
    return AiService.save(request);
  });
}

function getDashboard() {
  EmailPolicy.requireOwner();
  return DashboardService.getDashboard();
}

function reviewEmail(request) {
  EmailPolicy.requireOwner();
  return withEmailLock_(() => {
    EmailPolicy.requirePrivateWorkbook();
    return HumanReviewService.decide(request);
  });
}

function createTriggers() {
  EmailPolicy.requireOwner();
  return withEmailLock_(() => {
    EmailPolicy.requirePrivateWorkbook();
    installEmailTriggers_();
  });
}

function installEmailTriggers_() {
  const handlers = ['processNewLeads', 'checkReplies', 'runFollowups'];
    const managed = new Set(ScriptApp.getProjectTriggers()
      .filter(trigger => trigger.getEventType() === ScriptApp.EventType.CLOCK)
      .map(trigger => trigger.getHandlerFunction()));
    if (!managed.has(handlers[0])) ScriptApp.newTrigger(handlers[0]).timeBased().everyMinutes(5).create();
    if (!managed.has(handlers[1])) ScriptApp.newTrigger(handlers[1]).timeBased().everyMinutes(15).create();
  if (!managed.has(handlers[2])) ScriptApp.newTrigger(handlers[2]).timeBased().everyDays(1).atHour(9).create();
}

function installReviewRouting_() {
  const ensure = (name, labels) => {
    const sheet = SheetService.getSheet(name);
    const headers = SheetService.header(sheet);
    for (const label of labels) if (!headers.includes(label)) {
      const next = headers.length + 1;
      if (next > sheet.getMaxColumns()) sheet.insertColumnsAfter(sheet.getMaxColumns(), 1);
      sheet.getRange(1, next).setValue(label).setFontWeight('bold').setBackground('#E0EDEF');
      headers.push(label);
    }
    return {sheet, headers};
  };
  const {sheet, headers} = ensure(CONFIG.SHEETS.KNOWLEDGE, ['Review Keywords']);
  const index = headers.indexOf('Review Keywords') + 1;
  sheet.getRange(1, index).setNote('Separate whole words or phrases with commas, semicolons, or new lines.');
  sheet.setColumnWidth(index, 300);
  const alert = ensure(CONFIG.SHEETS.HUMAN_REVIEW, ['WhatsApp Alert', 'Telegram Alert']);
  for (const label of ['WhatsApp Alert', 'Telegram Alert']) {
    alert.sheet.setColumnWidth(alert.headers.indexOf(label) + 1, 145);
  }
  const present = new Set(SheetService.getRows(CONFIG.SHEETS.SETTINGS).map(row => row.Key));
  for (const [Key, Value] of Object.entries({WHATSAPP_ENABLED: false, TELEGRAM_ENABLED: false, TWILIO_CONTENT_SID: ''})) {
    if (!present.has(Key)) SheetService.appendRecord(CONFIG.SHEETS.SETTINGS, {Key, Value});
  }
}

function sortEmailSettings_() {
  const sheet = SheetService.getSheet(CONFIG.SHEETS.SETTINGS);
  const column = SheetService.header(sheet).indexOf('Key') + 1;
  const count = sheet.getLastRow() - 1;
  if (!column || count < 2) return;
  const order = [
    'AI_ENABLED', 'AI_PROVIDER', 'AI_MODEL', 'CONFIDENCE_THRESHOLD', 'GROQ_MODEL', 'GROQ_API_KEY',
    'EMAIL_SEND_ENABLED', 'AUTO_SEND_NEW_LEADS', 'FOLLOWUP_QUEUE_ENABLED', 'AUTO_REPLY_ENABLED',
    'WHATSAPP_ENABLED', 'TWILIO_SID', 'TWILIO_TOKEN', 'TWILIO_FROM', 'TWILIO_TO', 'TWILIO_CONTENT_SID',
    'TELEGRAM_ENABLED', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'
  ];
  const positions = new Map(order.map((key, index) => [key, index]));
  const rows = sheet.getRange(2, column, count, 1).getValues().map(([key], index) => ({
    index, priority: positions.get(String(key).trim().toUpperCase()) ?? order.length
  }));
  const sorted = rows.slice().sort((left, right) => left.priority - right.priority || left.index - right.index);
  sorted.forEach((row, destination) => {
    const current = rows.indexOf(row, destination);
    if (current === destination) return;
    sheet.moveRows(sheet.getRange(current + 2, column, 1, 1), destination + 2);
    rows.splice(destination, 0, rows.splice(current, 1)[0]);
  });
}
