import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import {
  importEmployeesFromCsv,
  importContractorsFromCsv,
  importConsultantsFromCsv,
  importClientsFromCsv,
  importProjectsFromCsv,
  importMultiCategoryCsv,
} from "@/server/modules/csv/csv-service";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contentType = req.headers.get("content-type") || "";

    let workspaceSlug = searchParams.get("workspaceSlug") || "";
    let type = searchParams.get("type") || "";
    let csvText = "";

    let sendCredentials = true;
    let customMessage: string | undefined = undefined;
    let defaultPassword: string | undefined = undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      workspaceSlug = (formData.get("workspaceSlug") as string) || workspaceSlug;
      type = (formData.get("type") as string) || type;
      if (formData.has("sendCredentials")) {
        sendCredentials = formData.get("sendCredentials") === "true";
      }
      if (formData.get("customMessage")) {
        customMessage = formData.get("customMessage") as string;
      }
      if (formData.get("defaultPassword")) {
        defaultPassword = formData.get("defaultPassword") as string;
      }

      const file = formData.get("file");
      if (file && typeof file === "object" && "text" in file) {
        csvText = await (file as Blob).text();
      } else if (formData.get("csvText")) {
        csvText = formData.get("csvText") as string;
      }
    } else {
      const body = await req.json();
      workspaceSlug = body.workspaceSlug || workspaceSlug;
      type = body.type || type;
      csvText = body.csvText || "";
      if (typeof body.sendCredentials === "boolean") {
        sendCredentials = body.sendCredentials;
      }
      if (body.customMessage) {
        customMessage = body.customMessage;
      }
      if (body.defaultPassword) {
        defaultPassword = body.defaultPassword;
      }
    }

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug parameter" }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ error: "Missing import type parameter" }, { status: 400 });
    }

    if (!csvText || !csvText.trim()) {
      return NextResponse.json({ error: "No CSV content or file provided" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    let result;
    switch (type.toLowerCase()) {
      case "employees":
      case "team":
      case "employee":
        result = await importEmployeesFromCsv(ctx, csvText, {
          sendCredentials,
          customMessage,
          defaultPassword,
        });
        break;

      case "contractors":
      case "contractor":
      case "vendors":
      case "vendor":
        result = await importContractorsFromCsv(ctx, csvText);
        break;

      case "consultants":
      case "consultant":
        result = await importConsultantsFromCsv(ctx, csvText);
        break;

      case "clients":
      case "client":
        result = await importClientsFromCsv(ctx, csvText);
        break;

      case "projects":
      case "project":
        result = await importProjectsFromCsv(ctx, csvText);
        break;

      case "all":
      case "multi":
      case "master":
        result = await importMultiCategoryCsv(ctx, csvText, {
          sendCredentials,
          customMessage,
          defaultPassword,
        });
        break;

      default:
        return NextResponse.json(
          {
            error: `Invalid import type '${type}'. Supported: employees, contractors, vendors, consultants, clients, projects, all`,
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    console.error("CSV import error:", err);
    const status = err.name === "ForbiddenException" ? 403 : 400;
    return NextResponse.json(
      { error: err.message || "Failed to process CSV import" },
      { status }
    );
  }
}
