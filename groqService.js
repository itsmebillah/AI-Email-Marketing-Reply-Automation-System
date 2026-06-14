class GroqService {

  static analyzeEmail(
    emailText,
    knowledgeText
  ) {

    try {

      const apiKey =
        SettingsService.get(
          "GROQ_API_KEY"
        );

      const model =
        SettingsService.get(
          "GROQ_MODEL"
        );

      const prompt = `
You are an AI Email Assistant.

Company Knowledge:

${knowledgeText}

Customer Email:

${emailText}

Return ONLY JSON.

Format:

{
  "intent":"",
  "confidence":0,
  "action":"",
  "reply":""
}

Allowed Intents:

pricing
service_info
meeting_request
support
complaint
not_interested
spam
other

Rules:

If email contains:

price
pricing
quote
quotation
discount
proposal
budget
contract
payment

Then:

action = human_review

Otherwise:

action = auto_reply

Generate a professional reply.

Return JSON only.
`;

      const payload = {

        model: model,

        temperature: 0.3,

        messages: [
          {
            role: "user",
            content: prompt
          }
        ]

      };

      const response =
        UrlFetchApp.fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "post",
            contentType:
              "application/json",
            headers: {
              Authorization:
                `Bearer ${apiKey}`
            },
            payload:
              JSON.stringify(
                payload
              )
          }
        );

      const result =
        JSON.parse(
          response
            .getContentText()
        );

      let content =
        result.choices[0]
        .message.content;

      content =
        content
          .replace(
            /```json/g,
            ""
          )
          .replace(
            /```/g,
            ""
          )
          .trim();

      const aiResult =
        JSON.parse(
          content
        );

      const threshold =
        Number(
          SettingsService.get(
            "CONFIDENCE_THRESHOLD"
          )
        );

      const confidence =
        Number(
          aiResult.confidence
        ) * 100;

      if (
        confidence <
        threshold
      ) {

        aiResult.action =
          "human_review";

      }

      return aiResult;

    } catch (err) {

      Logger.log(err);

      return {

        intent: "other",

        confidence: 0,

        action:
          "human_review",

        reply: ""

      };

    }

  }

}