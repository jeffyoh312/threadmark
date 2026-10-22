import { z } from "zod";

// Shared input cap; longer conversations require a separate chunking strategy.

export const MAX_CONVERSATION_CHARACTERS = 20_000;

// Shared contract for extraction, validation, report rendering and export.

const findingSchema = z.object({
  category: z.enum([
    "summary",
    "goal",
    "decision",
    "action",
    "date",
    "open_question",
  ]),

  text: z.string().min(1).max(2000),

  // A proposal is different from an agreement.
  // "Superseded" means a later message replaced the earlier arrangement.

  status: z.enum([
    "proposed",
    "confirmed",
    "superseded",
    "unresolved",
    "reported_complete",
  ]),

  owner: z.string().max(200).nullable(),
  due: z.string().max(200).nullable(),

  // These numbers point to original source lines.

  evidenceLineIds: z.array(z.number().int().positive()).min(1).max(100),
});

export const reportSchema = z.object({
  title: z.string().min(1).max(200),
  findings: z.array(findingSchema).max(20),
});

// Derive compile-time types from the runtime contract.

export type Report = z.infer<typeof reportSchema>;

export type SourceLine = {
  id: number;
  text: string;
};

// References identify source lines, not messages; a message may span multiple lines.
