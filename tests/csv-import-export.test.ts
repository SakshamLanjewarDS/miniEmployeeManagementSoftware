import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/server/db/prisma";
import { TenantContext } from "../src/server/tenancy/context";
import { TenantRole } from "@prisma/client";
import { parseCsv, stringifyCsv, sanitizeCsvCell } from "../src/server/modules/csv/csv-parser";
import {
  importEmployeesFromCsv,
  importContractorsFromCsv,
  importConsultantsFromCsv,
  importClientsFromCsv,
  exportDataToCsv,
  getSampleCsvTemplate,
} from "../src/server/modules/csv/csv-service";

describe("CSV Import & Export Engine Tests", () => {
  let adminCtx: TenantContext;
  let testTenantId: string;

  async function cleanupTestRecords() {
    const testUsers = await prisma.user.findMany({
      where: {
        email: {
          in: [
            "rohan.test@100percentdesign.in",
            "ananya.test@100percentdesign.in",
            "vikram.test@100percentdesign.in",
          ],
        },
      },
      include: {
        memberships: {
          include: {
            employee: true,
          },
        },
      },
    });

    for (const u of testUsers) {
      for (const m of u.memberships) {
        if (m.employee) {
          await prisma.employee.delete({ where: { id: m.employee.id } });
        }
        await prisma.tenantMembership.delete({ where: { id: m.id } });
      }
      await prisma.user.delete({ where: { id: u.id } });
    }

    if (testTenantId) {
      await prisma.contractor.deleteMany({
        where: {
          tenantId: testTenantId,
          email: "test.contractor@shreeramcivil.com",
        },
      });

      await prisma.consultant.deleteMany({
        where: {
          tenantId: testTenantId,
          email: "test.consultant@apexstructural.in",
        },
      });

      await prisma.client.deleteMany({
        where: {
          tenantId: testTenantId,
          email: "test.client@singhalestates.com",
        },
      });
    }
  }

  before(async () => {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: "100percentdesign" },
      include: {
        memberships: {
          include: {
            user: true,
            employee: true,
          },
        },
      },
    });

    assert.ok(tenant, "Tenant 100percentdesign must exist");
    testTenantId = tenant.id;

    await cleanupTestRecords();

    const adminMember = tenant.memberships.find(
      (m) => m.role === TenantRole.OWNER || m.role === TenantRole.ADMIN
    );
    assert.ok(adminMember, "Admin/Owner must exist");

    adminCtx = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      timezone: tenant.timezone,
      currency: tenant.currency,
      userId: adminMember.userId,
      membershipId: adminMember.id,
      role: adminMember.role,
      hasFinanceAccess: adminMember.hasFinanceAccess,
      employeeId: adminMember.employee?.employeeId ?? "EMP-001",
      userFullName: adminMember.user.fullName,
      userEmail: adminMember.user.email,
    };
  });

  after(async () => {
    await cleanupTestRecords();
  });

  test("1. RFC 4180 CSV Parser accurately parses quoted fields and commas", () => {
    const rawCsv = [
      'Full Name,Contact,Alternate Contact,Work Mail,Department,Designation',
      '"Rohan Verma","+91 98201 11003","+91 98201 11099","rohan@test.in","Design, Architecture","Senior Architect"',
      'Ananya Roy,+91 98201 11004,,ananya@test.in,Architecture,Lead Architect',
    ].join('\r\n');

    const parsed = parseCsv(rawCsv);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0]["Full Name"], "Rohan Verma");
    assert.equal(parsed[0]["Contact"], "+91 98201 11003");
    assert.equal(parsed[0]["Alternate Contact"], "+91 98201 11099");
    assert.equal(parsed[0]["Work Mail"], "rohan@test.in");
    assert.equal(parsed[0]["Department"], "Design, Architecture");
    assert.equal(parsed[0]["Designation"], "Senior Architect");

    assert.equal(parsed[1]["Full Name"], "Ananya Roy");
    assert.equal(parsed[1]["Alternate Contact"], "");
  });

  test("2. OWASP Formula Injection Sanitization protects dangerous cell formulas", () => {
    assert.equal(sanitizeCsvCell("=CMD|' /C calc'!A0"), "\"'=CMD|' /C calc'!A0\"");
    assert.equal(sanitizeCsvCell("+123456"), "\"'+123456\"");
    assert.equal(sanitizeCsvCell("-500"), "\"'-500\"");
    assert.equal(sanitizeCsvCell("@SUM(A1:A10)"), "\"'@SUM(A1:A10)\"");
    assert.equal(sanitizeCsvCell("Normal Name"), '"Normal Name"');
  });

  test("3. Employee Generation from CSV creates live team accounts with auto EMP IDs", async () => {
    const employeeCsv = [
      "Full Name,Contact,Alternate Contact,Work Mail,Department,Designation",
      "Rohan Test,+91 98201 11003,+91 98201 11099,rohan.test@100percentdesign.in,Architecture,Senior Project Architect",
      "Ananya Test,+91 98201 11004,,ananya.test@100percentdesign.in,Architecture,Lead Design Architect",
    ].join("\r\n");

    const result = await importEmployeesFromCsv(adminCtx, employeeCsv);
    assert.equal(result.importedCount, 2, "Both test employees must be imported");
    assert.equal(result.failedCount, 0);

    const emp1 = result.created.find((e) => e.email === "rohan.test@100percentdesign.in");
    assert.ok(emp1);
    assert.equal(emp1.fullName, "Rohan Test");
    assert.ok(emp1.employeeId.startsWith("EMP-"), "Must have auto-generated EMP-XXX ID");
    assert.ok(emp1.phone?.includes("+91 98201 11003"));
    assert.ok(emp1.phone?.includes("+91 98201 11099"));
    assert.equal(emp1.department, "Architecture");
    assert.equal(emp1.designation, "Senior Project Architect");

    const emp2 = result.created.find((e) => e.email === "ananya.test@100percentdesign.in");
    assert.ok(emp2);
    assert.equal(emp2.phone, "+91 98201 11004");
  });

  test("4. Contractor CSV Import creates live trade contacts", async () => {
    const contractorCsv = [
      "Name,Contact,Email,Firm Name,Trade,Address",
      'Suresh Test,+91 98200 45678,test.contractor@shreeramcivil.com,Shree Ram Civil LLP,Civil / Masonry,"Panvel, Navi Mumbai"',
    ].join("\r\n");

    const result = await importContractorsFromCsv(adminCtx, contractorCsv);
    assert.equal(result.importedCount, 1);
    assert.equal(result.failedCount, 0);

    const created = result.created[0];
    assert.equal(created.name, "Suresh Test");
    assert.equal(created.firmName, "Shree Ram Civil LLP");
    assert.equal(created.trade, "Civil / Masonry");
  });

  test("5. Consultant CSV Import creates live engineering consultants", async () => {
    const consultantCsv = [
      "Name,Email,Contact,Firm Name,Firm Address,Discipline,Notes",
      'Rajeev Test,test.consultant@apexstructural.in,+91 98450 12345,Apex Structural,"Nariman Point, Mumbai",Structural,Specialized in PT Slabs',
    ].join("\r\n");

    const result = await importConsultantsFromCsv(adminCtx, consultantCsv);
    assert.equal(result.importedCount, 1);
    assert.equal(result.failedCount, 0);

    const created = result.created[0];
    assert.equal(created.name, "Rajeev Test");
    assert.equal(created.discipline, "Structural");
  });

  test("6. CSV Export delivers formatted, sanitized records for all categories", async () => {
    const empExport = await exportDataToCsv(adminCtx, "employees");
    assert.ok(empExport.filename.endsWith(".csv"));
    assert.ok(empExport.content.includes("Full Name"));
    assert.ok(empExport.content.includes("Saksham Lanjewar"));

    const contractorExport = await exportDataToCsv(adminCtx, "contractors");
    assert.ok(contractorExport.filename.endsWith(".csv"));
    assert.ok(contractorExport.content.includes("Contractor Name"));

    const consultantExport = await exportDataToCsv(adminCtx, "consultants");
    assert.ok(consultantExport.filename.endsWith(".csv"));
    assert.ok(consultantExport.content.includes("Consultant Name"));
  });

  test("7. Sample Templates generate valid CSV headers matching UI specifications", () => {
    const empTmpl = getSampleCsvTemplate("employees");
    assert.equal(empTmpl.filename, "sample-employees-template.csv");
    assert.ok(empTmpl.content.includes("Full Name,Contact,Alternate Contact,Work Mail,Department,Designation"));

    const contractorTmpl = getSampleCsvTemplate("contractors");
    assert.ok(contractorTmpl.content.includes("Name,Contact,Email,Firm Name,Trade,Address"));

    const consultantTmpl = getSampleCsvTemplate("consultants");
    assert.ok(consultantTmpl.content.includes("Name,Email,Contact,Firm Name,Firm Address,Discipline,Notes"));
  });
});
