import { toSourceLines, type Brief } from "./report";

// A prepared brief so people can see the result instantly, without using any
// AI quota. It deliberately shows every status, including a superseded date
// and a request nobody has agreed to yet.

export const EXAMPLE_CONVERSATION = `Aina: Hi! We need 100 blue notebooks for the workshop. Can you do RM10 each?
Ben: RM10 works for 100. I can ship on 22 October.
Aina: Could we push shipping to 25 October? The venue isn't confirmed until then.
Ben: Sure, 25 October it is.
Aina: Great. Can you also print our logo on the cover?
Ben: Logo printing adds RM2 per notebook. Want me to go ahead?
Aina: Let me check with Farah and get back to you.
Aina: Also, please send the invoice to accounts@example.com.
Ben: Deposit received, thanks. Starting production tomorrow.
Aina: Who's handling delivery to the venue, you or a courier?`;

export const EXAMPLE_BRIEF: Brief = {
  lines: toSourceLines(EXAMPLE_CONVERSATION),
  report: {
    title: "Workshop notebook order",
    findings: [
      {
        category: "summary",
        status: "confirmed",
        text: "Aina is ordering 100 blue notebooks from Ben at RM10 each, shipping on 25 October. Logo printing and delivery to the venue are still open.",
        owner: null,
        due: null,
        lines: [1, 2, 4, 6, 10],
      },
      {
        category: "decision",
        status: "confirmed",
        text: "100 blue notebooks at RM10 each.",
        owner: null,
        due: null,
        lines: [1, 2],
      },
      {
        category: "decision",
        status: "confirmed",
        text: "Shipping moves to 25 October so the venue can be confirmed first.",
        owner: null,
        due: "25 October",
        lines: [3, 4],
      },
      {
        category: "decision",
        status: "superseded",
        text: "Ship on 22 October.",
        owner: null,
        due: "22 October",
        lines: [2, 4],
      },
      {
        category: "decision",
        status: "proposed",
        text: "Print the logo on the cover for an extra RM2 per notebook.",
        owner: null,
        due: null,
        lines: [5, 6],
      },
      {
        category: "action",
        status: "confirmed",
        text: "Ship the notebooks.",
        owner: "Ben",
        due: "25 October",
        lines: [4],
      },
      {
        category: "action",
        status: "confirmed",
        text: "Check with Farah about logo printing and reply to Ben.",
        owner: "Aina",
        due: null,
        lines: [7],
      },
      {
        category: "action",
        status: "proposed",
        text: "Send the invoice to accounts@example.com. Ben hasn't replied to this yet.",
        owner: "Ben",
        due: null,
        lines: [8],
      },
      {
        category: "action",
        status: "reported_complete",
        text: "Pay the deposit. Ben says it has arrived.",
        owner: null,
        due: null,
        lines: [9],
      },
      {
        category: "open_question",
        status: "unresolved",
        text: "Who delivers to the venue: Ben or a courier?",
        owner: null,
        due: null,
        lines: [10],
      },
      {
        category: "open_question",
        status: "unresolved",
        text: "Is the logo being printed? It depends on Farah.",
        owner: null,
        due: null,
        lines: [6, 7],
      },
      {
        category: "date",
        status: "confirmed",
        text: "Notebooks ship.",
        owner: null,
        due: "25 October",
        lines: [4],
      },
      {
        category: "goal",
        status: "confirmed",
        text: "Have the notebooks ready for the workshop.",
        owner: null,
        due: null,
        lines: [1, 3],
      },
    ],
  },
};
