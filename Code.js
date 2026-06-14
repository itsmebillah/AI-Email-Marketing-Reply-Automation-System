function onOpen() {

  SpreadsheetApp
    .getUi()

    .createMenu(
      "AI Email System"
    )

    .addItem(
      "Dashboard",
      "openDashboard"
    )

    .addItem(
      "Process Leads",
      "processNewLeads"
    )

    .addItem(
      "Check Replies",
      "checkReplies"
    )

    .addToUi();

}

function sendCampaign() {

  const leads =
    SheetService.getRows(
      CONFIG.SHEETS.LEADS
    );

  const template =
    TemplateService.getTemplate(
      "TMP001"
    );

  leads.forEach(lead => {

    if (
      lead["Status"] ===
      CONFIG.STATUS.NEW
    ) {

      GmailService.sendEmail(
        lead,
        template
      );

    }

  });

}

function checkReplies() {

  GmailMonitor.checkReplies();

}

function runFollowups() {

  FollowupService.run();

}

function processNewLeads() {

  LeadProcessor.processNewLeads();

}

function createTriggers() {

  deleteAllTriggers();

  ScriptApp.newTrigger(
    "checkReplies"
  )
    .timeBased()
    .everyMinutes(15)
    .create();

  ScriptApp.newTrigger(
    "runFollowups"
  )
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();

  ScriptApp.newTrigger(
    "processNewLeads"
  )
    .timeBased()
    .everyMinutes(5)
    .create();

}

function deleteAllTriggers() {

  ScriptApp
    .getProjectTriggers()
    .forEach(trigger => {

      ScriptApp.deleteTrigger(
        trigger
      );

    });

}

function testTelegram() {

  const lead = {
    "Name": "Masum",
    "Email": "test@gmail.com"
  };

  TelegramService.sendAlert(
    lead,
    "pricing",
    "What is your pricing?"
  );

}




function testTelegramDirect() {

  const botToken =
    SettingsService.get(
      "TELEGRAM_BOT_TOKEN"
    );

  const chatId =
    SettingsService.get(
      "TELEGRAM_CHAT_ID"
    );

  const response =
    UrlFetchApp.fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({
          chat_id: chatId,
          text: "🚀 Telegram Integration Working"
        }),
        muteHttpExceptions: true
      }
    );

  Logger.log(
    response.getContentText()
  );

}


function debugReplyFlow() {

  const leads =
    SheetService.getRows(
      CONFIG.SHEETS.LEADS
    );

  console.log(
    "Total Leads:",
    leads.length
  );

  leads.forEach(lead => {

    console.log(
      "Lead:",
      lead["Email"]
    );

    console.log(
      "Thread ID:",
      lead["Thread ID"]
    );

    const reply =
      GmailService.getLatestCustomerReply(
        lead["Thread ID"]
      );

    console.log(
      JSON.stringify(reply)
    );

  });

}


function debugGroqFlow() {

  const knowledge =
    KnowledgeService.getKnowledgeText();

  const result =
    GroqService.analyzeEmail(
      "Price please",
      knowledge
    );

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

}




function testSheets() {

  Logger.log(
    SheetService.getSheet(
      CONFIG.SHEETS.AI_LOGS
    )
  );

  Logger.log(
    SheetService.getSheet(
      CONFIG.SHEETS.HUMAN_REVIEW
    )
  );

  Logger.log(
    SheetService.getSheet(
      CONFIG.SHEETS.PROCESSED_REPLIES
    )
  );

}


function testAIlog() {

  const sheet =
    SheetService.getSheet(
      CONFIG.SHEETS.AI_LOGS
    );

  sheet.appendRow([
    new Date(),
    "test@gmail.com",
    "pricing",
    0.9,
    "human_review",
    ""
  ]);

}









function debugProcessNewLeads() {

  const leads =
    SheetService.getRows(
      CONFIG.SHEETS.LEADS
    );

  Logger.log(
    JSON.stringify(
      leads,
      null,
      2
    )
  );

  LeadProcessor.processNewLeads();

}










function debugAutoSend() {

  Logger.log(
    SettingsService.get(
      "AUTO_SEND_NEW_LEADS"
    )
  );

}


function debugTemplate() {

  const template =
    TemplateService.getTemplate(
      "TMP001"
    );

  Logger.log(
    JSON.stringify(template)
  );

}



function testWhatsApp() {

  const result =
    TwilioService.sendWhatsAppAlert(
      {
        "Lead ID": "TEST001",
        "Name": "Masum Billah",
        "Email": "test@gmail.com",
        "Company": "Test Company"
      },
      "pricing",
      "Customer asked for pricing."
    );

  Logger.log(result);

}


function openDashboard() {

  const html =
    HtmlService
      .createHtmlOutputFromFile(
        "dashboard"
      )
      .setTitle(
        "AI Email Dashboard"
      );

  SpreadsheetApp
    .getUi()
    .showSidebar(
      html
    );

}

function getDashboardStats() {

  return DashboardService
    .getStats();

}

function getDashboardReviews() {

  return DashboardService
    .getHumanReviews();

}