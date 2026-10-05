import { NextRequest, NextResponse } from "next/server";
import { correctGrammar } from "@/lib/grammar/grammarEngine";
import { z } from "zod";

const GrammarRequestSchema = z.object({
  text: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = GrammarRequestSchema.parse(body);

    const result = correctGrammar(text);

    return NextResponse.json({
      success: true,
      originalText: result.originalText,
      correctedText: result.correctedText,
      changesCount: result.changesCount,
      corrections: result.corrections,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to correct grammar" },
      { status: 400 }
    );
  }
}
