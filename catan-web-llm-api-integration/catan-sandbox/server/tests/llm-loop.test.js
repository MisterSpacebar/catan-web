const test = require("node:test");
const assert = require("node:assert");
const { CatanGame } = require("../CatanGame");
const { getLLMAction } = require("../llmAgent");
const { performAction } = require("../server");

test("LLM-driven action can be applied back into the game loop", async (t) => {
  const game = new CatanGame({ numPlayers: 2 });
  const calls = [];

  const fakeClient = {
    responses: {
      create: async (request) => {
        calls.push(request);
        return {
          output: [
            {
              role: "assistant",
              content: [
                {
                  type: "output_json",
                  json: {
                    action: "rollDice",
                    payload: {},
                    reason: "Start the turn by rolling.",
                    confidence: 0.8,
                  },
                },
              ],
            },
          ],
          usage: { input_tokens: 0, output_tokens: 0 },
        };
      },
    },
  };

  const llmAction = await getLLMAction(game, { client: fakeClient, model: "gpt-4.1-mini" });
  t.diagnostic(`LLM suggested: ${JSON.stringify(llmAction)}`);

  assert.strictEqual(llmAction.action, "rollDice");
  assert.deepStrictEqual(llmAction.payload, {});

  const event = performAction(game, llmAction.action, llmAction.payload);
  assert.strictEqual(event.type, "rollDice");
  assert.ok(game.lastRoll?.total >= 2 && game.lastRoll.total <= 12);

  assert.strictEqual(calls.length, 1);
  assert.ok(calls[0].input, "Request to OpenAI should include input payload");
});
