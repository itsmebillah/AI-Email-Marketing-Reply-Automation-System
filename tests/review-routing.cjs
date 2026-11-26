const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const config = {SHEETS: {KNOWLEDGE: 'KnowledgeBase', SETTINGS: 'Settings', HUMAN_REVIEW: 'HumanReview'}};
const review = {'Review ID': 'REPLY:synthetic'};
const sheets = {
  KnowledgeBase: [
    {Category: 'Product', Content: 'Synthetic product', 'Review Keywords': 'Refund, bulk quote; দাম'},
    {'Review Keywords': 'refund'}
  ],
  Settings: [
    {Key: 'TELEGRAM_ENABLED', Value: true},
    {Key: 'TELEGRAM_CHAT_ID', Value: '123456'},
    {Key: 'WHATSAPP_ENABLED', Value: true},
    {Key: 'TWILIO_FROM', Value: '+15550123456'},
    {Key: 'TWILIO_TO', Value: '+15550123457'},
    {Key: 'TWILIO_CONTENT_SID', Value: 'HX' + '0'.repeat(32)}
  ],
  HumanReview: [review]
};
const props = {
  TELEGRAM_BOT_TOKEN: '123456:synthetic',
  TWILIO_SID: 'AC' + '0'.repeat(32),
  TWILIO_TOKEN: 'synthetic'
};
const calls = [];
const context = vm.createContext({
  CONFIG: config,
  SheetService: {
    getRows: name => sheets[name],
    updateRecord: (name, key, id, values) => {
      Object.assign(sheets[name].find(row => row[key] === id), values);
    }
  },
  SettingsService: {get: key => sheets.Settings.find(row => row.Key === key)?.Value},
  PropertiesService: {getScriptProperties: () => ({getProperty: key => props[key]})},
  SpreadsheetApp: {flush() {}},
  Utilities: {base64Encode: value => Buffer.from(value).toString('base64')},
  UrlFetchApp: {
    fetch(url, options) {
      calls.push({url, options});
      const telegram = url.startsWith('https://api.telegram.org/');
      return {getResponseCode: () => telegram ? 200 : 201, getContentText: () => '{"ok":true}'};
    }
  }
});
const files = fs.readdirSync(root).filter(file => file.endsWith('.js'));
for (const file of files) new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'), {filename: file});
const source = files.filter(file => !['sheetService.js', 'settingsService.js'].includes(file))
  .map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
new vm.Script(source).runInContext(context);
new vm.Script(fs.readFileSync(path.join(root, 'dashboard.html'), 'utf8').match(/<script>([\s\S]+?)<\/script>/)[1]);
const run = code => vm.runInContext(code, context);
const matches = text => { context.testBody = text; return Array.from(run('KnowledgeService.reviewMatches(testBody, KnowledgeService.reviewKeywords())')); };

assert.deepEqual(matches('Please send a BULK quote and tell me the দাম.'), ['bulk quote', 'দাম']);
assert.deepEqual(matches('Nothing here.\n> Please refund me.'), []);
assert.deepEqual(matches('Is that refundable?'), []);
assert.deepEqual(matches('REFUND!'), ['Refund']);
assert.doesNotMatch(run('KnowledgeService.getKnowledgeText()'), /Refund|bulk quote/);

run("ReviewAlerts.notify('REPLY:synthetic')");
run("ReviewAlerts.notify('REPLY:synthetic')");
assert.equal(calls.length, 2);
assert.equal(review['WhatsApp Alert'], 'ACCEPTED');
assert.equal(review['Telegram Alert'], 'ACCEPTED');
assert.match(calls[0].options.payload.ContentSid, /^HX/);
assert.equal(calls[0].options.payload.Body, undefined);
assert.match(JSON.parse(calls[1].options.payload).text, /priority customer reply/);
assert.equal(JSON.parse(calls[1].options.payload).text.includes('REPLY:synthetic'), false);

sheets.HumanReview.push({'Review ID':'REPLY:disabled'});
sheets.Settings.find(row => row.Key === 'TELEGRAM_ENABLED').Value = false;
sheets.Settings.find(row => row.Key === 'WHATSAPP_ENABLED').Value = false;
run("ReviewAlerts.notify('REPLY:disabled')");
assert.equal(calls.length, 2);
console.log('PASS: Unicode keyword routing, quoted content, provider payloads, disabled alerts, and one notification per channel.');
