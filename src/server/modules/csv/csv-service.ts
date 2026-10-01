import { prisma } from "@/server/db/prisma";
import { TenantContext, assertAdminOrOwner } from "@/server/tenancy/context";
import { TenantRole } from "@prisma/client";
import { createTenantEmployee, findEmployeesFiltered } from "@/server/modules/employees/repository";
import { createContractor, findContractors } from "@/server/modules/contractors/repository";
import { createConsultant, findConsultants } from "@/server/modules/consultants/repository";
import { createProject, findProjects } from "@/server/modules/projects/repository";
import { parseCsv, stringifyCsv } from "./csv-parser";

/**
 * Flexible column matching helper that handles case, spacing, and delimiters
 */
function findValue(row: Record<string, string>, possibleKeys: string[]): string {
  const normalizedKeys = Object.keys(row).map((k) => ({
    original: k,
    clean: k.toLowerCase().replace(/[^a-z0-9]/g, ""),
  }));

  // Pass 1: Exact clean match
  for (const target of possibleKeys) {
    const cleanTarget = target.toLowerCase().replace(/[^a-z0-9]/g, "");
    const found = normalizedKeys.find((k) => k.clean === cleanTarget);
    if (found && row[found.original] !== undefined && row[found.original].trim() !== "") {
      return row[found.original].trim();
    }
  }

  // Pass 2: Substring / contains match for compound headers
  for (const target of possibleKeys) {
    const cleanTarget = target.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanTarget.length < 3) continue;
    const found = normalizedKeys.find(
      (k) => k.clean.includes(cleanTarget) || cleanTarget.includes(k.clean)
    );
    if (found && row[found.original] !== undefined && row[found.original].trim() !== "") {
      return row[found.original].trim();
    }
  }

  return "";
}

/**
 * Parses date ranges formatted as "Start - Deadline", "Start to Deadline", etc.
 */
function parseDateRange(rangeStr: string): { startDate?: Date; targetDate?: Date } {
  if (!rangeStr || !rangeStr.trim()) return {};
  const clean = rangeStr.trim();
  const parts = clean.split(/\s*-\s*|\s+to\s+|\s*–\s*|\s*—\s*/i);
  const result: { startDate?: Date; targetDate?: Date } = {};
  if (parts.length >= 1 && parts[0]) {
    const d1 = new Date(parts[0].trim());
    if (!isNaN(d1.getTime())) result.startDate = d1;
  }
  if (parts.length >= 2 && parts[1]) {
    const d2 = new Date(parts[1].trim());
    if (!isNaN(d2.getTime())) result.targetDate = d2;
  }
  return result;
}

/**
 * Generates next available sequential project code (e.g. PRJ-001, PRJ-002)
 */
async function getNextProjectCode(tenantId: string): Promise<string> {
  const projects = await prisma.project.findMany({
    where: { tenantId },
    select: { code: true },
  });

  let maxNum = 0;
  for (const p of projects) {
    const match = p.code.match(/PRJ-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `PRJ-${String(maxNum + 1).padStart(3, "0")}`;
}

/**
 * Computes next available sequential EMP-XXX IDs
 */
async function getNextEmployeeIds(tenantId: string, count: number): Promise<string[]> {
  const employees = await prisma.employee.findMany({
    where: { tenantId },
    select: { employeeId: true },
  });

  let maxNum = 0;
  for (const emp of employees) {
    const match = emp.employeeId.match(/EMP-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const generated: string[] = [];
  for (let i = 1; i <= count; i++) {
    const nextNum = maxNum + i;
    const formatted = `EMP-${String(nextNum).padStart(3, "0")}`;
    generated.push(formatted);
  }
  return generated;
}

export interface ImportResult {
  type: string;
  totalRows: number;
  importedCount: number;
  failedCount: number;
  created: any[];
  errors: { row: number; identifier: string; error: string }[];
}

export interface EmployeeImportOptions {
  sendCredentials?: boolean;
  customMessage?: string;
  defaultPassword?: string;
}

/**
 * Import Employees from CSV (Team generation)
 * Supported Fields:
 * - full name
 * - contact
 * - alternate contact
 * - work mail
 * - department
 * - designation
 * (Optional: employee id, role, password)
 */
export async function importEmployeesFromCsv(
  ctx: TenantContext,
  csvText: string,
  options?: EmployeeImportOptions
): Promise<ImportResult> {
  assertAdminOrOwner(ctx, "Only Studio Administrators or Owners can import staff records.");

  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    throw new Error("CSV file is empty or could not be parsed. Please check headers and formatting.");
  }

  const generatedIds = await getNextEmployeeIds(ctx.tenantId, rows.length);

  const created: any[] = [];
  const errors: { row: number; identifier: string; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Line 1 is header

    const fullName = findValue(row, ["full name", "fullname", "name", "employee name", "staff name"]);
    const workMail = findValue(row, ["work mail", "work email", "workmail", "email", "official email", "mail"]);
    const contact = findValue(row, ["contact", "phone", "mobile", "contact number", "primary contact", "phone number"]);
    const alternateContact = findValue(row, [
      "alternate contact",
      "alt contact",
      "alternate phone",
      "secondary contact",
      "alt phone",
      "alternate",
    ]);
    const department = findValue(row, ["department", "dept", "team"]) || "Architecture";
    const designation = findValue(row, ["designation", "title", "role title", "position"]) || "Architect";
    const explicitEmpId = findValue(row, ["employee id", "emp id", "empid", "id"]);
    const explicitRole = findValue(row, ["system role", "role", "access"]);
    const explicitPassword = findValue(row, ["initial password", "password", "temp password"]);

    if (!workMail) {
      errors.push({
        row: rowNum,
        identifier: fullName || `Row ${rowNum}`,
        error: "Missing required 'Work Mail' or 'Email' column value.",
      });
      continue;
    }

    if (!fullName) {
      errors.push({
        row: rowNum,
        identifier: workMail,
        error: "Missing required 'Full Name' column value.",
      });
      continue;
    }

    // Combine primary and alternate contacts
    let combinedPhone = contact;
    if (alternateContact) {
      combinedPhone = combinedPhone
        ? `${combinedPhone} (Alt: ${alternateContact})`
        : alternateContact;
    }
    if (combinedPhone) {
      combinedPhone = combinedPhone.slice(0, 95);
    }

    // Determine Role
    let assignedRole: TenantRole = TenantRole.EMPLOYEE;
    if (explicitRole) {
      const r = explicitRole.toUpperCase();
      if (r.includes("OWNER") || r.includes("BOSS") || r.includes("PARTNER")) {
        assignedRole = TenantRole.OWNER;
      } else if (r.includes("ADMIN")) {
        assignedRole = TenantRole.ADMIN;
      } else if (r.includes("PROJECT_MANAGER") || r.includes("MANAGER")) {
        assignedRole = TenantRole.PROJECT_MANAGER;
      }
    }

    // Employee ID: use explicit if provided, else use generated sequential EMP-XXX
    const employeeId = explicitEmpId ? explicitEmpId.toUpperCase() : generatedIds[i];
    const assignedPassword = explicitPassword || options?.defaultPassword || "StudioPassword2026!";

    try {
      const emp = await createTenantEmployee(ctx, {
        fullName,
        email: workMail.toLowerCase(),
        employeeId,
        phone: combinedPhone || undefined,
        department,
        designation,
        role: assignedRole,
        hasFinanceAccess: assignedRole === TenantRole.OWNER || assignedRole === TenantRole.ADMIN,
        temporaryPassword: assignedPassword,
        customMessage: options?.customMessage,
        notifyEmployee: options?.sendCredentials !== false,
      });

      created.push({
        id: emp.id,
        membershipId: emp.membershipId,
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        email: emp.email,
        phone: emp.phone,
        department: emp.department,
        designation: emp.designation,
        role: emp.role,
        temporaryPassword: assignedPassword,
        notification: emp.notification,
      });
    } catch (err: any) {
      errors.push({
        row: rowNum,
        identifier: `${fullName} (${workMail})`,
        error: err.message || "Failed to create employee record",
      });
    }
  }

  return {
    type: "employees",
    totalRows: rows.length,
    importedCount: created.length,
    failedCount: errors.length,
    created,
    errors,
  };
}

/**
 * Import Contractors & Vendors from CSV
 * Supported Fields from Excel:
 * - Contractor Name / Vendor Name / Name
 * - Company Name / Firm Name
 * - Type / Service / Trade
 * - Contact / Contact No
 * - Alternate Contact
 * - Email
 * - Projects
 * - Office Location / Location / Address
 */
export async function importContractorsFromCsv(
  ctx: TenantContext,
  csvText: string
): Promise<ImportResult> {
  assertAdminOrOwner(ctx, "Only Studio Administrators or Owners can import contractors/vendors.");

  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    throw new Error("CSV file is empty or could not be parsed.");
  }

  const created: any[] = [];
  const errors: { row: number; identifier: string; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const name = findValue(row, [
      "contractor name",
      "vendor name",
      "name",
      "full name",
      "contractor",
      "vendor",
    ]);
    const firmName = findValue(row, [
      "company name",
      "firm name",
      "company",
      "firm",
      "agency",
    ]);
    const trade =
      findValue(row, [
        "type",
        "service",
        "type of service",
        "trade",
        "category",
        "specialization",
      ]) || "General Contractor / Vendor";
    const contact = findValue(row, [
      "contact",
      "contact no",
      "phone",
      "mobile",
      "phone no",
    ]);
    const altContact = findValue(row, [
      "alternate contact",
      "alt contact",
      "secondary contact",
      "alternate phone",
    ]);
    const email = findValue(row, ["email", "mail", "work mail"]);
    const projects = findValue(row, ["projects", "project", "project name"]);
    const address = findValue(row, [
      "office location",
      "location",
      "firm location",
      "address",
      "site",
    ]);

    if (!name && !firmName) {
      errors.push({
        row: rowNum,
        identifier: `Row ${rowNum}`,
        error: "Missing required 'Contractor Name', 'Vendor Name', or 'Company Name' column value.",
      });
      continue;
    }

    const finalName = name || firmName;
    const finalFirm = firmName || name;

    let combinedContact = contact;
    if (altContact) {
      combinedContact = contact ? `${contact} / Alt: ${altContact}` : altContact;
    }

    let finalAddress = address;
    if (projects) {
      finalAddress = address ? `${address} [Projects: ${projects}]` : `Projects: ${projects}`;
    }

    try {
      const contractor = await createContractor(ctx, {
        name: finalName,
        contact: combinedContact || undefined,
        email: email || undefined,
        firmName: finalFirm || undefined,
        trade,
        address: finalAddress || undefined,
      });

      // Link contractor/vendor to project if specified
      if (projects) {
        const proj = await prisma.project.findFirst({
          where: {
            tenantId: ctx.tenantId,
            OR: [
              { name: { contains: projects } },
              { code: { contains: projects } },
            ],
          },
        });
        if (proj) {
          await prisma.projectContractor.upsert({
            where: {
              projectId_contractorId: {
                projectId: proj.id,
                contractorId: contractor.id,
              },
            },
            create: {
              tenantId: ctx.tenantId,
              projectId: proj.id,
              contractorId: contractor.id,
              trade,
            },
            update: {},
          }).catch(() => {});
        }
      }

      created.push(contractor);
    } catch (err: any) {
      errors.push({
        row: rowNum,
        identifier: name,
        error: err.message || "Failed to create contractor/vendor record",
      });
    }
  }

  return {
    type: "contractors",
    totalRows: rows.length,
    importedCount: created.length,
    failedCount: errors.length,
    created,
    errors,
  };
}

/**
 * Import Consultants from CSV
 * Supported Fields from Excel:
 * - Consultant Name / Name
 * - Company Name / Firm Name
 * - Type of service / Discipline / Service
 * - Designation
 * - Email
 * - Contact / Contact No
 * - Alternate Contact
 * - Firm Location / Office Location / Address
 * - Project / Projects
 */
export async function importConsultantsFromCsv(
  ctx: TenantContext,
  csvText: string
): Promise<ImportResult> {
  assertAdminOrOwner(ctx, "Only Studio Administrators or Owners can import consultants.");

  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    throw new Error("CSV file is empty or could not be parsed.");
  }

  const created: any[] = [];
  const errors: { row: number; identifier: string; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const name = findValue(row, [
      "consultant name",
      "name",
      "full name",
      "consultant",
    ]);
    const firmName = findValue(row, [
      "company name",
      "firm name",
      "company",
      "firm",
    ]);
    const discipline =
      findValue(row, [
        "type of service",
        "service",
        "discipline",
        "field",
        "trade",
      ]) || "Structural / Engineering";
    const designation = findValue(row, ["designation", "role", "title"]);
    const email = findValue(row, ["email", "mail", "work mail"]);
    const contact = findValue(row, [
      "contact",
      "contact no",
      "phone",
      "mobile",
    ]);
    const altContact = findValue(row, [
      "alternate contact",
      "alt contact",
      "secondary contact",
    ]);
    const firmAddress = findValue(row, [
      "firm location",
      "office location",
      "location",
      "address",
      "firm address",
    ]);
    const project = findValue(row, ["project", "projects", "project name"]);
    const rawNotes = findValue(row, ["notes", "remarks", "scope"]);

    if (!name && !firmName) {
      errors.push({
        row: rowNum,
        identifier: `Row ${rowNum}`,
        error: "Missing required 'Consultant Name' or 'Company Name' column value.",
      });
      continue;
    }

    const finalName = name || firmName;
    const finalFirm = firmName || name;

    let combinedContact = contact;
    if (altContact) {
      combinedContact = contact ? `${contact} / Alt: ${altContact}` : altContact;
    }

    let combinedNotes = rawNotes;
    if (designation) {
      combinedNotes = combinedNotes
        ? `${combinedNotes} | Designation: ${designation}`
        : `Designation: ${designation}`;
    }
    if (project) {
      combinedNotes = combinedNotes
        ? `${combinedNotes} | Project: ${project}`
        : `Project: ${project}`;
    }

    try {
      const consultant = await createConsultant(ctx, {
        name: finalName,
        email: email || undefined,
        contact: combinedContact || undefined,
        firmName: finalFirm || undefined,
        firmAddress: firmAddress || undefined,
        discipline,
        notes: combinedNotes || undefined,
      });

      // Link consultant to project if project exists
      if (project) {
        const proj = await prisma.project.findFirst({
          where: {
            tenantId: ctx.tenantId,
            OR: [
              { name: { contains: project } },
              { code: { contains: project } },
            ],
          },
        });
        if (proj) {
          await prisma.projectConsultant.upsert({
            where: {
              projectId_consultantId: {
                projectId: proj.id,
                consultantId: consultant.id,
              },
            },
            create: {
              tenantId: ctx.tenantId,
              projectId: proj.id,
              consultantId: consultant.id,
              discipline,
            },
            update: {},
          }).catch(() => {});
        }
      }

      created.push(consultant);
    } catch (err: any) {
      errors.push({
        row: rowNum,
        identifier: name,
        error: err.message || "Failed to create consultant record",
      });
    }
  }

  return {
    type: "consultants",
    totalRows: rows.length,
    importedCount: created.length,
    failedCount: errors.length,
    created,
    errors,
  };
}

/**
 * Import Clients from CSV
 * Supported Fields from Excel:
 * - Client Name / Name
 * - Projects / Project
 * - Client Type / Type
 * - Email
 * - Contact No / Contact / Phone
 * - Location / Address
 * - Notes (Extra info.) / Notes / Remarks
 */
export async function importClientsFromCsv(
  ctx: TenantContext,
  csvText: string
): Promise<ImportResult> {
  assertAdminOrOwner(ctx, "Only Studio Administrators or Owners can import clients.");

  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    throw new Error("CSV file is empty or could not be parsed.");
  }

  const created: any[] = [];
  const errors: { row: number; identifier: string; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const name = findValue(row, ["client name", "name", "client", "full name"]);
    const projects = findValue(row, ["projects", "project", "project name"]);
    const clientType = findValue(row, ["client type", "type", "category"]);
    const email = findValue(row, ["email", "mail", "email address"]);
    const contact = findValue(row, [
      "contact no",
      "contact",
      "phone",
      "mobile",
      "phone no",
    ]);
    const address = findValue(row, [
      "location",
      "address",
      "office location",
      "city",
    ]);
    const rawNotes = findValue(row, [
      "notes (extra info.)",
      "notes (extra info)",
      "notes extrainfo",
      "notes",
      "extra info",
      "remarks",
    ]);
    const company = findValue(row, ["company name", "company", "firm name"]);

    if (!name) {
      errors.push({
        row: rowNum,
        identifier: company || `Row ${rowNum}`,
        error: "Missing required 'Client Name' column value.",
      });
      continue;
    }

    let combinedNotes = rawNotes;
    if (clientType) {
      combinedNotes = combinedNotes ? `${combinedNotes} | Type: ${clientType}` : `Type: ${clientType}`;
    }
    if (projects) {
      combinedNotes = combinedNotes ? `${combinedNotes} | Projects: ${projects}` : `Projects: ${projects}`;
    }

    try {
      const client = await prisma.client.create({
        data: {
          tenantId: ctx.tenantId,
          name,
          company: company || (clientType ? clientType : null),
          email: email || null,
          contact: contact || null,
          address: address || null,
          notes: combinedNotes || null,
          isActive: true,
        },
      });

      // Link client as primary client to referenced project if exists
      if (projects) {
        const proj = await prisma.project.findFirst({
          where: {
            tenantId: ctx.tenantId,
            OR: [
              { name: { contains: projects } },
              { code: { contains: projects } },
            ],
          },
        });
        if (proj && !proj.primaryClientId) {
          await prisma.project.update({
            where: { id: proj.id },
            data: { primaryClientId: client.id },
          }).catch(() => {});
        }
      }

      created.push(client);
    } catch (err: any) {
      errors.push({
        row: rowNum,
        identifier: name,
        error: err.message || "Failed to create client record",
      });
    }
  }

  return {
    type: "clients",
    totalRows: rows.length,
    importedCount: created.length,
    failedCount: errors.length,
    created,
    errors,
  };
}

/**
 * Import Projects from CSV
 * Supported Fields from Excel:
 * - Project name / Name / Title
 * - Clients / Client / Client Name
 * - Project type / Type / Typology
 * - Phase / Current Phase
 * - Starting - Deadline / Start - Deadline / Timeline
 * - Other info / Other info. / Description / Notes
 */
export async function importProjectsFromCsv(
  ctx: TenantContext,
  csvText: string
): Promise<ImportResult> {
  assertAdminOrOwner(ctx, "Only Studio Administrators or Owners can import projects.");

  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    throw new Error("CSV file is empty or could not be parsed.");
  }

  const created: any[] = [];
  const errors: { row: number; identifier: string; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const name = findValue(row, ["project name", "name", "project title", "project"]);
    const clientName = findValue(row, ["clients", "client", "client name", "client company"]);
    const projectType =
      findValue(row, ["project type", "type", "typology", "category"]) || "Residential Architecture";
    const phase = findValue(row, ["phase", "current phase", "project phase"]);
    const dateRange = findValue(row, [
      "starting - deadline",
      "starting deadline",
      "start - deadline",
      "start deadline",
      "timeline",
      "dates",
      "duration",
    ]);
    const otherInfo = findValue(row, [
      "other info",
      "other info.",
      "description",
      "notes",
      "remarks",
      "scope",
    ]);
    let code = findValue(row, ["project code", "code", "id", "project id"]);

    if (!name) {
      errors.push({
        row: rowNum,
        identifier: `Row ${rowNum}`,
        error: "Missing required 'Project name' column value.",
      });
      continue;
    }

    try {
      // Auto-generate unique code if not provided
      if (!code) {
        code = await getNextProjectCode(ctx.tenantId);
      }

      const existingCode = await prisma.project.findFirst({
        where: { tenantId: ctx.tenantId, code: code.trim().toUpperCase() },
      });
      if (existingCode) {
        code = await getNextProjectCode(ctx.tenantId);
      }

      // Associate or auto-create client
      let primaryClientId: string | undefined = undefined;
      if (clientName) {
        let client = await prisma.client.findFirst({
          where: {
            tenantId: ctx.tenantId,
            OR: [
              { name: { contains: clientName } },
              { company: { contains: clientName } },
            ],
          },
        });
        if (!client) {
          client = await prisma.client.create({
            data: {
              tenantId: ctx.tenantId,
              name: clientName,
              isActive: true,
              notes: `Auto-registered via project "${name}" CSV import`,
            },
          });
        }
        primaryClientId = client.id;
      }

      const { startDate, targetDate } = parseDateRange(dateRange);

      const project = await createProject(ctx, {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: otherInfo || undefined,
        primaryClientId,
        projectType,
        startDate,
        targetDate,
      });

      // Update currentPhase if specified
      if (phase) {
        await prisma.project.update({
          where: { id: project.id },
          data: { currentPhase: phase },
        });

        // Set matching phase to IN_PROGRESS
        await prisma.projectPhase.updateMany({
          where: {
            projectId: project.id,
            phaseName: { contains: phase },
          },
          data: { status: "IN_PROGRESS" },
        }).catch(() => {});
      }

      created.push(project);
    } catch (err: any) {
      errors.push({
        row: rowNum,
        identifier: name,
        error: err.message || "Failed to create project record",
      });
    }
  }

  return {
    type: "projects",
    totalRows: rows.length,
    importedCount: created.length,
    failedCount: errors.length,
    created,
    errors,
  };
}

/**
 * Export entity data to CSV
 */
export async function exportDataToCsv(
  ctx: TenantContext,
  type: "employees" | "contractors" | "consultants" | "clients" | "projects" | "all"
): Promise<{ filename: string; content: string }> {
  const dateStr = new Date().toISOString().split("T")[0];

  switch (type) {
    case "employees": {
      const res = await findEmployeesFiltered(ctx, { limit: 1000 });
      const columns = [
        { key: "fullName" as const, header: "Full Name" },
        { key: "employeeId" as const, header: "Employee ID" },
        { key: "email" as const, header: "Work Mail" },
        { key: "phone" as const, header: "Contact" },
        { key: "department" as const, header: "Department" },
        { key: "designation" as const, header: "Designation" },
        { key: "role" as const, header: "System Role" },
        { key: "hasFinanceAccess" as const, header: "Finance Access" },
        { key: "status" as const, header: "Status" },
        { key: "joinedAt" as const, header: "Joined Date" },
      ];

      const mapped = res.employees.map((e) => ({
        fullName: e.fullName,
        employeeId: e.employeeId,
        email: e.email,
        phone: e.phone || "",
        department: e.department || "",
        designation: e.designation || "",
        role: e.role,
        hasFinanceAccess: e.hasFinanceAccess ? "Yes" : "No",
        status: e.isActive ? "Active" : "Inactive",
        joinedAt: e.joinDate ? new Date(e.joinDate).toISOString().split("T")[0] : "",
      }));

      return {
        filename: `${ctx.tenantSlug}-employees-${dateStr}.csv`,
        content: stringifyCsv(columns, mapped),
      };
    }

    case "contractors": {
      const contractors = await findContractors(ctx);
      const columns = [
        { key: "name" as const, header: "Contractor Name" },
        { key: "firmName" as const, header: "Company Name" },
        { key: "trade" as const, header: "Type" },
        { key: "contact" as const, header: "Contact" },
        { key: "email" as const, header: "Email" },
        { key: "address" as const, header: "Office Location" },
        { key: "status" as const, header: "Status" },
        { key: "createdAt" as const, header: "Created Date" },
      ];

      const mapped = contractors.map((c) => ({
        name: c.name,
        firmName: c.firmName || "",
        trade: c.trade,
        contact: c.contact || "",
        email: c.email || "",
        address: c.address || "",
        status: c.isActive ? "Active" : "Inactive",
        createdAt: new Date(c.createdAt).toISOString().split("T")[0],
      }));

      return {
        filename: `${ctx.tenantSlug}-contractors-${dateStr}.csv`,
        content: stringifyCsv(columns, mapped),
      };
    }

    case "consultants": {
      const consultants = await findConsultants(ctx);
      const columns = [
        { key: "name" as const, header: "Consultant Name" },
        { key: "firmName" as const, header: "Company Name" },
        { key: "discipline" as const, header: "Type of service" },
        { key: "contact" as const, header: "Contact" },
        { key: "email" as const, header: "Email" },
        { key: "firmAddress" as const, header: "Firm Location" },
        { key: "notes" as const, header: "Notes" },
        { key: "status" as const, header: "Status" },
        { key: "createdAt" as const, header: "Created Date" },
      ];

      const mapped = consultants.map((c) => ({
        name: c.name,
        firmName: c.firmName || "",
        discipline: c.discipline,
        contact: c.contact || "",
        email: c.email || "",
        firmAddress: c.firmAddress || "",
        notes: c.notes || "",
        status: c.isActive ? "Active" : "Inactive",
        createdAt: new Date(c.createdAt).toISOString().split("T")[0],
      }));

      return {
        filename: `${ctx.tenantSlug}-consultants-${dateStr}.csv`,
        content: stringifyCsv(columns, mapped),
      };
    }

    case "clients": {
      const clients = await prisma.client.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: { name: "asc" },
      });
      const columns = [
        { key: "name" as const, header: "Client Name" },
        { key: "company" as const, header: "Company" },
        { key: "email" as const, header: "Email" },
        { key: "contact" as const, header: "Contact No" },
        { key: "address" as const, header: "Location" },
        { key: "notes" as const, header: "Notes (Extra info.)" },
        { key: "status" as const, header: "Status" },
        { key: "createdAt" as const, header: "Created Date" },
      ];

      const mapped = clients.map((c) => ({
        name: c.name,
        company: c.company || "",
        email: c.email || "",
        contact: c.contact || "",
        address: c.address || "",
        notes: c.notes || "",
        status: c.isActive ? "Active" : "Inactive",
        createdAt: new Date(c.createdAt).toISOString().split("T")[0],
      }));

      return {
        filename: `${ctx.tenantSlug}-clients-${dateStr}.csv`,
        content: stringifyCsv(columns, mapped),
      };
    }

    case "projects": {
      const projects = await prisma.project.findMany({
        where: { tenantId: ctx.tenantId },
        include: { primaryClient: true },
        orderBy: { createdAt: "desc" },
      });
      const columns = [
        { key: "name" as const, header: "Project name" },
        { key: "code" as const, header: "Project Code" },
        { key: "client" as const, header: "Clients" },
        { key: "projectType" as const, header: "Project type" },
        { key: "currentPhase" as const, header: "Phase" },
        { key: "timeline" as const, header: "Starting - Deadline" },
        { key: "status" as const, header: "Status" },
        { key: "description" as const, header: "Other info" },
      ];

      const mapped = projects.map((p) => {
        const startStr = p.startDate ? new Date(p.startDate).toISOString().split("T")[0] : "";
        const endStr = p.targetDate ? new Date(p.targetDate).toISOString().split("T")[0] : "";
        const timeline = startStr && endStr ? `${startStr} - ${endStr}` : startStr || endStr || "";
        return {
          name: p.name,
          code: p.code,
          client: p.primaryClient?.name || "",
          projectType: p.projectType || "",
          currentPhase: p.currentPhase || "Brief",
          timeline,
          status: p.status,
          description: p.description || "",
        };
      });

      return {
        filename: `${ctx.tenantSlug}-projects-${dateStr}.csv`,
        content: stringifyCsv(columns, mapped),
      };
    }

    case "all": {
      // Export all 5 tabs combined into one master multi-section file
      const [clientExp, contExp, consExp, projExp, empExp] = await Promise.all([
        exportDataToCsv(ctx, "clients"),
        exportDataToCsv(ctx, "contractors"),
        exportDataToCsv(ctx, "consultants"),
        exportDataToCsv(ctx, "projects"),
        exportDataToCsv(ctx, "employees"),
      ]);

      const masterContent = [
        "=== CLIENT DETAILS ===",
        clientExp.content,
        "",
        "=== CONTRACTORS & VENDOR DETAILS ===",
        contExp.content,
        "",
        "=== CONSULTANT DETAILS ===",
        consExp.content,
        "",
        "=== PROJECTS DETAILS ===",
        projExp.content,
        "",
        "=== STUDIO TEAM (EMPLOYEES) ===",
        empExp.content,
      ].join("\r\n");

      return {
        filename: `${ctx.tenantSlug}-master-all-in-one-${dateStr}.csv`,
        content: masterContent,
      };
    }

    default:
      throw new Error(`Unsupported export type: ${type}`);
  }
}

/**
 * Parses and imports multi-section CSV files containing multiple tabs/categories
 */
export async function importMultiCategoryCsv(
  ctx: TenantContext,
  csvText: string,
  options?: EmployeeImportOptions
): Promise<{
  type: string;
  totalRows: number;
  importedCount: number;
  failedCount: number;
  created: any[];
  errors: { row: number; identifier: string; error: string }[];
  breakdown: Record<string, { imported: number; failed: number }>;
}> {
  assertAdminOrOwner(ctx, "Only Studio Administrators or Owners can import master datasets.");

  const lines = csvText.split(/\r?\n/);
  const sections: { category: string; lines: string[] }[] = [];
  let currentSection: { category: string; lines: string[] } | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Check if line is a section header like === VENDORS === or [Vendors] or # Vendors or Client details,,,,,,
    const sectionMatch =
      line.match(/^={2,}\s*([^=]+?)\s*={2,}$/) ||
      line.match(/^\[([^\]]+)\]$/) ||
      line.match(/^#+\s*([A-Za-z0-9_\-\s&()]+)$/);

    const cleanHeader = line.replace(/["',]/g, "").trim().toLowerCase();
    const isNamedBanner = [
      "client details",
      "clients details",
      "clients",
      "contractors details",
      "contractor details",
      "contractors",
      "vendor details",
      "vendors details",
      "vendors",
      "consultant details",
      "consultants details",
      "consultants",
      "projects details",
      "project details",
      "projects",
      "employee details",
      "employees details",
      "studio team",
      "employees",
    ].includes(cleanHeader);

    if (sectionMatch || isNamedBanner) {
      const headerName = sectionMatch ? sectionMatch[1].trim().toLowerCase() : cleanHeader;
      let detectedCat = "unknown";
      if (headerName.includes("vendor") || headerName.includes("contractor")) detectedCat = "contractors";
      else if (headerName.includes("client")) detectedCat = "clients";
      else if (headerName.includes("consultant")) detectedCat = "consultants";
      else if (headerName.includes("project")) detectedCat = "projects";
      else if (headerName.includes("employee") || headerName.includes("team") || headerName.includes("staff"))
        detectedCat = "employees";

      currentSection = { category: detectedCat, lines: [] };
      sections.push(currentSection);
    } else if (currentSection) {
      if (line.length > 0) {
        currentSection.lines.push(rawLine);
      }
    }
  }

  // If no section headers were found, check if there is a 'Type' or 'Category' column
  if (sections.length === 0) {
    const allRows = parseCsv(csvText);
    if (allRows.length === 0) {
      throw new Error("CSV file is empty or could not be parsed.");
    }

    const firstRow = allRows[0];
    const catCol = Object.keys(firstRow).find(
      (k) =>
        k.toLowerCase() === "type" ||
        k.toLowerCase() === "category" ||
        k.toLowerCase() === "tab" ||
        k.toLowerCase() === "role"
    );

    if (catCol) {
      // Group rows by category
      const groups: Record<string, Record<string, string>[]> = {};
      for (const row of allRows) {
        const rawCat = (row[catCol] || "").toLowerCase().trim();
        let cat = "employees";
        if (rawCat.includes("vendor") || rawCat.includes("contractor")) cat = "contractors";
        else if (rawCat.includes("client")) cat = "clients";
        else if (rawCat.includes("consultant")) cat = "consultants";
        else if (rawCat.includes("project")) cat = "projects";

        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(row);
      }

      for (const [cat, rows] of Object.entries(groups)) {
        if (rows.length > 0) {
          const keys = Object.keys(rows[0]);
          const cols = keys.map((k) => ({ key: k, header: k }));
          sections.push({
            category: cat,
            lines: [stringifyCsv(cols, rows)],
          });
        }
      }
    } else {
      // Fallback: Attempt single-type import (auto-detect by columns)
      const keys = Object.keys(firstRow).map((k) => k.toLowerCase());
      let cat = "employees";
      if (keys.some((k) => k.includes("trade") || k.includes("vendor") || k.includes("contractor") || k.includes("service")))
        cat = "contractors";
      else if (keys.some((k) => k.includes("discipline") || k.includes("consultant") || k.includes("firm location")))
        cat = "consultants";
      else if (keys.some((k) => k.includes("deadline") || k.includes("phase") || (k.includes("project") && !k.includes("manager"))))
        cat = "projects";
      else if (keys.some((k) => k.includes("client") || (k.includes("company") && !keys.some((x) => x.includes("designation")))))
        cat = "clients";

      sections.push({ category: cat, lines: [csvText] });
    }
  }

  let totalImported = 0;
  let totalFailed = 0;
  const allCreated: any[] = [];
  const allErrors: { row: number; identifier: string; error: string }[] = [];
  const breakdown: Record<string, { imported: number; failed: number }> = {};

  for (const sec of sections) {
    if (sec.lines.length === 0 || sec.category === "unknown") continue;
    const secCsvText = sec.lines.join("\r\n");

    try {
      let res: ImportResult;
      if (sec.category === "contractors") {
        res = await importContractorsFromCsv(ctx, secCsvText);
      } else if (sec.category === "clients") {
        res = await importClientsFromCsv(ctx, secCsvText);
      } else if (sec.category === "consultants") {
        res = await importConsultantsFromCsv(ctx, secCsvText);
      } else if (sec.category === "projects") {
        res = await importProjectsFromCsv(ctx, secCsvText);
      } else {
        res = await importEmployeesFromCsv(ctx, secCsvText, options);
      }

      totalImported += res.importedCount;
      totalFailed += res.failedCount;
      allCreated.push(...res.created);
      allErrors.push(...res.errors);
      breakdown[sec.category] = {
        imported: (breakdown[sec.category]?.imported || 0) + res.importedCount,
        failed: (breakdown[sec.category]?.failed || 0) + res.failedCount,
      };
    } catch (err: any) {
      allErrors.push({
        row: 0,
        identifier: `Section [${sec.category}]`,
        error: err.message || "Failed to process section",
      });
      breakdown[sec.category] = {
        imported: 0,
        failed: 1,
      };
    }
  }

  return {
    type: "multi",
    totalRows: totalImported + totalFailed,
    importedCount: totalImported,
    failedCount: totalFailed,
    created: allCreated,
    errors: allErrors,
    breakdown,
  };
}

/**
 * Returns pre-formatted sample CSV templates
 */
export function getSampleCsvTemplate(type: string): { filename: string; content: string } {
  switch (type) {
    case "employees":
      return {
        filename: "sample-employees-template.csv",
        content: [
          "Full Name,Contact,Alternate Contact,Work Mail,Department,Designation",
          "Rohan Verma,+91 98201 11003,+91 98201 11099,rohan@100percentdesign.in,Architecture,Senior Project Architect",
          "Ananya Roy,+91 98201 11004,+91 98201 11088,ananya@100percentdesign.in,Architecture,Lead Design Architect",
          "Vikram Sen,+91 98201 11005,,vikram@100percentdesign.in,3D Visualization,3D Visualizer & Modeler",
        ].join("\r\n"),
      };

    case "contractors":
      return {
        filename: "sample-contractors-vendors-template.csv",
        content: [
          "Contractor Name,Company Name,Type,Contact,Alternate Contact,Email,Projects,Office Location",
          'Suresh Patel,Shree Ram Civil LLP,Civil / Masonry,+91 98200 45678,+91 98200 45699,suresh@shreeramcivil.com,Villa Serenita,"Panvel, Navi Mumbai"',
          'Dinesh Sharma,Apex Modular,Carpentry & Millwork,+91 98190 33445,,dinesh@apexmillwork.in,Apex HQ,"Goregaon West, Mumbai"',
        ].join("\r\n"),
      };

    case "consultants":
      return {
        filename: "sample-consultants-template.csv",
        content: [
          "Consultant Name,Company Name,Type of service,Designation,Email,Contact,Alternate Contact,Firm Location,Project",
          'Dr. Amit Joshi,Joshi Structural Engineers,Structural,Chief Structural Engineer,amit@joshistructures.com,+91 98205 66778,+91 98205 66700,"Nariman Point, Mumbai",Villa Serenita',
          'Karan Johar,EnviroTech Solutions,MEP / HVAC,Director,karan@envirotechmep.com,+91 98700 98765,,Andheri East Mumbai,Apex HQ',
        ].join("\r\n"),
      };

    case "clients":
      return {
        filename: "sample-clients-template.csv",
        content: [
          "Client Name,Projects,Client Type,Email,Contact No,Location,Notes (Extra info.)",
          'Arun Singhal,Villa Serenita,Private Luxury Villa,arun@singhalestates.com,+91 98110 54321,"14 Altamount Road, Mumbai",Client prefers Italian marble flooring and sustainable solar integration',
          'Verdant Logistics Ltd,Apex Corporate HQ,Corporate Office,projects@verdantlogistics.com,+91 22 6677 8899,"Bandra Kurla Complex, Mumbai",Turnkey commercial execution',
        ].join("\r\n"),
      };

    case "projects":
      return {
        filename: "sample-projects-template.csv",
        content: [
          "Project name,Clients,Project type,Phase,Starting - Deadline,Other info",
          'Villa Serenita,Arun Singhal,Luxury Villa Architecture,Execution,2026-01-15 - 2026-12-31,Contemporary 5-BHK seaside villa with cantilevered pools',
          'Apex Corporate HQ,Verdant Logistics Ltd,Commercial Office Fitout,Detailed Design,2026-03-01 - 2026-10-15,Modern sustainable workspace with biophilic interior design',
        ].join("\r\n"),
      };

    case "all":
    case "multi":
    case "master":
      return {
        filename: "sample-master-all-in-one-template.csv",
        content: [
          "=== CLIENT DETAILS ===",
          "Client Name,Projects,Client Type,Email,Contact No,Location,Notes (Extra info.)",
          'Arun Singhal,Villa Serenita,Luxury Villa,arun@singhalestates.com,+91 98110 54321,"14 Altamount Road, Mumbai",Private luxury villa client',
          'Verdant Logistics,Apex Corporate HQ,Corporate,projects@verdantlogistics.com,+91 22 6677 8899,"BKC, Mumbai",Corporate office fitout',
          "",
          "=== CONTRACTORS DETAILS ===",
          "Contractor Name,Company Name,Type,Contact,Alternate Contact,Email,Projects,Office Location",
          'Suresh Patel,Shree Ram Civil LLP,Civil / Masonry,+91 98200 45678,+91 98200 45699,suresh@shreeramcivil.com,Villa Serenita,"Panvel, Navi Mumbai"',
          'Dinesh Sharma,Apex Modular,Carpentry,+91 98190 33445,,dinesh@apexmillwork.in,Apex Corporate HQ,"Goregaon West, Mumbai"',
          "",
          "=== VENDOR DETAILS ===",
          "Vendor Name,Company Name,Service,Contact,Alternate Contact,Email,Projects,Office Location",
          'Marble Hub India,StoneCraft Ltd,Italian Marble Supply,+91 98330 11223,,info@marblehub.in,Villa Serenita,"Lower Parel, Mumbai"',
          'Lumina Lighting Studio,Lumina Tech,Architectural LED Lighting,+91 98330 44556,,sales@lumina.in,Apex Corporate HQ,"Worli, Mumbai"',
          "",
          "=== CONSULTANT DETAILS ===",
          "Consultant Name,Company Name,Type of service,Designation,Email,Contact,Alternate Contact,Firm Location,Project",
          'Dr. Amit Joshi,Joshi Structural Engineers,Structural,Chief Engineer,amit@joshistructures.com,+91 98205 66778,,Nariman Point Mumbai,Villa Serenita',
          'Karan Johar,EnviroTech Solutions,MEP / HVAC,Director,karan@envirotechmep.com,+91 98700 98765,,Andheri East Mumbai,Apex Corporate HQ',
          "",
          "=== PROJECTS DETAILS ===",
          "Project name,Clients,Project type,Phase,Starting - Deadline,Other info",
          'Villa Serenita,Arun Singhal,Luxury Villa,Execution,2026-01-15 - 2026-12-31,Exclusive seaside residential villa',
          'Apex Corporate HQ,Verdant Logistics,Corporate Office,Detailed Design,2026-03-01 - 2026-10-15,Commercial workplace project',
          "",
          "=== STUDIO TEAM (EMPLOYEES) ===",
          "Full Name,Contact,Alternate Contact,Work Mail,Department,Designation",
          "Priya Patel,+91 98203 33445,+91 98203 33446,priya@100percentdesign.in,Architecture,Senior Architect",
          "Rohan Verma,+91 98204 44556,+91 98204 44557,rohan@100percentdesign.in,Execution,Project Manager",
        ].join("\r\n"),
      };

    default:
      throw new Error(`Unsupported template type: ${type}`);
  }
}
