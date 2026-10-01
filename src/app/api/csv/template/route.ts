import { NextRequest, NextResponse } from "next/server";
import { getSampleCsvTemplate } from "@/server/modules/csv/csv-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawType = searchParams.get("type") || "employees";

    const type = rawType.toLowerCase();
    const { filename, content } = getSampleCsvTemplate(type);

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: any) {
    console.error("CSV template error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate CSV template" }, { status: 400 });
  }
}
