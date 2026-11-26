const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const inbox = {id: 'msg-1', body: 'How can I help you?', from: 'buyer@example.test', replyTo: 'buyer@example.test'};
const message = {
  getId: () => inbox.id, getPlainBody: () => inbox.body, getSubject: () => 'Project enquiry',
  getFrom: () => inbox.from, getReplyTo: () => inbox.replyTo
};
const lead = {'Lead ID': 'L1', Email: inbox.from, Status: 'EMAIL_SENT',
  'Initial Message ID': 'original', 'Thread ID': 'thread'};
const tables = {
  Leads: [lead], HumanReview: [], ProcessedReplies: [], EmailLogs: [], AILogs: [],
  KnowledgeBase: [{'Review Keywords': 'refund, quotation'}]
};
const flags = new Map([['AUTO_REPLY_SETTINGS_SHEET_ID', 'workbook']]);
let sends = 0, alerts = 0, suggestions = 0, uncertain = false;
let sendEnabled = true, draft = 'Thank you. Could you share more details?';
let intent = 'service_info';
const gmail = {
  inspect: () => ({threadId: 'thread', later: [message], inbound: [message], hasUnrecognizedSender: false}),
  automated: () => false,
  send(review, row, text, context) {
    assert.equal(context.parent.getId(), inbox.id);
    assert.equal(row.Email, 'buyer@example.test');
    assert.equal(review.Kind, 'REPLY');
    sends++;
    if (uncertain) throw new Error('Mock ambiguous timeout');
    return {id: 'sent-' + sends, threadId: context.threadId};
  }
};
const runContext = vm.createContext({
  console, PropertiesService: {getScriptProperties: () => ({getProperty: k => flags.get(k), setProperty: (k, v) => flags.set(k, v)})},
  SpreadsheetApp: {getActiveSpreadsheet: () => ({getId: () => 'workbook'}), flush() {}},
  SheetService: {
    getRows: name => tables[name].map(row => ({...row})),
    appendRecord: (name, row) => tables[name].push({...row}),
    updateRecord: (name, key, id, values) => Object.assign(tables[name].find(row => row[key] === id), values)
  },
  SettingsService: {get: key => key === 'AUTO_REPLY_ENABLED'},
  GmailService: gmail,
  EmailPolicy: {email: x => x, headerEmail: x => x, suppressed: () => false, sendEnabled: () => sendEnabled},
  AiService: {suggest: () => {suggestions++; return {intent, confidence: 98, reply: draft};}},
  HumanReviewService: {
    index: () => new Set(tables.HumanReview.map(row => row['Review ID'])),
    enqueue: (row, id, kind, reason) => tables.HumanReview.push({
      'Review ID': id, 'Thread ID': row['Thread ID'], Kind: kind, Reason: reason, Status: 'PENDING'
    })
  },
  ReviewAlerts: {notify: () => { alerts++; }}
});
for (const file of ['config.js', 'knowledgeService.js', 'gmailMonitor.js']) {
  new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'), {filename: file}).runInContext(runContext);
}
const run = () => vm.runInContext('GmailMonitor.checkReplies()', runContext);
assert.equal(run(), 0);
assert.equal(run(), 0);
assert.equal(sends, 1);
assert.equal(alerts, 0);
assert.equal(tables.HumanReview.length, 0);
assert.equal(tables.EmailLogs[0].Type, 'AUTO_REPLY');
assert.equal(lead.Status, 'AI_REPLIED');

inbox.id = 'msg-2';
inbox.body = 'How do I request a refund?';
assert.equal(run(), 1);
assert.equal(run(), 0);
assert.equal(sends, 1);
assert.equal(suggestions, 1);
assert.equal(alerts, 1);
assert.match(tables.HumanReview[0].Reason, /^Priority: refund/);

tables.HumanReview[0].Status = 'RESOLVED';
inbox.id = 'msg-3';
inbox.body = 'Thanks for the information';
draft = '';
assert.equal(run(), 0);
assert.equal(tables.HumanReview.length, 1);
assert.equal(tables.AILogs.at(-1).Action, 'auto_reply_no_safe_draft');

inbox.id = 'msg-4';
draft = 'You are welcome.';
inbox.replyTo = 'other@example.test';
assert.equal(run(), 0);
assert.equal(sends, 1);
assert.equal(tables.AILogs.at(-1).Action, 'auto_reply_held');

inbox.id = 'msg-5';
inbox.replyTo = lead.Email;
sendEnabled = false;
assert.equal(run(), 0);
assert.equal(tables.AILogs.at(-1).Action, 'auto_reply_paused');
assert.equal(sends, 1);

inbox.id = 'msg-other';
intent = 'other';
draft = '';
sendEnabled = true;
assert.equal(run(), 0);
assert.equal(sends, 2);
assert.equal(tables.AILogs.at(-1).Action, 'auto_reply_sent');
assert.match(tables.AILogs.at(-1).Reply, /Thank you for your message/);

inbox.id = 'msg-6';
sendEnabled = true;
uncertain = true;
assert.equal(run(), 0);
assert.equal(tables.EmailLogs.at(-1).Type, 'AUTO_REPLY_UNKNOWN');
tables.ProcessedReplies.pop();
assert.equal(run(), 0);
assert.equal(sends, 3);
assert.equal(tables.HumanReview.length, 1);
console.log('PASS: ordinary auto-reply, priority review and alert, no-draft logging, reply address safety, paused sending, and no repeated uncertain send.');
