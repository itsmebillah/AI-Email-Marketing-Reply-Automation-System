class GmailService {
  static render(body, lead) {
    return String(body || '').replace(/{{name}}/gi, () => String(lead.Name || ''))
      .replace(/{{company}}/gi, () => String(lead.Company || ''));
  }

  static inspect(lead) {
    const recipient = EmailPolicy.email(lead.Email);
    const threadId = String(lead['Thread ID'] || '');
    const anchorId = String(lead['Initial Message ID'] || '');
    if (!recipient || !threadId || !anchorId) throw new Error('Verified thread and initial message are required.');
    const thread = GmailApp.getThreadById(threadId);
    if (!thread) throw new Error('Gmail thread unavailable.');
    const messages = thread.getMessages();
    const owner = new Set([EmailPolicy.owner(), ...GmailApp.getAliases().map(address => EmailPolicy.email(address))]);
    const anchorIndex = messages.findIndex(message => message.getId() === anchorId);
    if (anchorIndex < 0) throw new Error('Initial message is missing from this thread.');
    const anchor = messages[anchorIndex];
    if (!owner.has(EmailPolicy.headerEmail(anchor.getFrom())) || EmailPolicy.headerEmail(anchor.getTo()) !== recipient) {
      throw new Error('Lead address does not match the original outgoing message.');
    }
    // The sender check also blocks sending if another participant joined the conversation.
    const later = messages.slice(anchorIndex + 1);
    const inbound = later.filter(message => EmailPolicy.headerEmail(message.getFrom()) === recipient);
    const hasUnrecognizedSender = later.some(message => {
      const from = EmailPolicy.headerEmail(message.getFrom());
      return from !== recipient && !owner.has(from);
    });
    return {anchor, inbound, hasUnrecognizedSender, threadId, later, owner};
  }

  static automated(message) {
    const submission = String(message.getHeader('Auto-Submitted') || '').trim().toLowerCase();
    return Boolean((submission && submission !== 'no')
      || /^(bulk|junk|list)$/i.test(String(message.getHeader('Precedence') || '').trim())
      || message.getHeader('List-Id'));
  }

  static send(review, lead, body, context) {
    const recipient = EmailPolicy.email(lead.Email);
    const subject = String(review.Subject || '');
    if (!recipient || !body.trim() || !subject.trim() || /[\x00-\x1F\x7F]/.test(subject)
      || subject.length > 180 || body.length > 10000) throw new Error('Invalid subject, recipient, or message.');
    if (review.Kind === 'INITIAL') {
      const message = GmailApp.createDraft(recipient, subject, body).send();
      return {id: message.getId(), threadId: message.getThread().getId()};
    }
    // Build an explicit To and anchor the reply to the message reviewed by the operator.
    const parent = context.parent;
    const ref = String(parent.getHeader('Message-ID') || '').trim();
    if (!/^<[^<>\s]+>$/.test(ref) || parent.getSubject() !== subject) {
      throw new Error('Gmail cannot verify this message reference or subject.');
    }
    const base64 = text => Utilities.base64Encode(text, Utilities.Charset.UTF_8);
    const subjectHeader = /[^\x20-\x7E]/.test(subject)
      ? '=?UTF-8?B?' + base64(subject) + '?=' : subject;
    const encodedBody = base64(body).match(/.{1,76}/g).join('\r\n');
    const mime = [
      'To: ' + recipient, 'Subject: ' + subjectHeader,
      'References: ' + ref, 'In-Reply-To: ' + ref,
      'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64', '', encodedBody
    ].join('\r\n');
    const message = Gmail.Users.Messages.send({
      raw: Utilities.base64EncodeWebSafe(mime, Utilities.Charset.UTF_8),
      threadId: context.threadId
    }, 'me');
    if (message.threadId !== context.threadId) throw new Error('Gmail returned a different conversation.');
    return {id: message.id, threadId: message.threadId};
  }
}
