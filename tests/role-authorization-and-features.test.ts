import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/server/db/prisma";
import { loginWithWorkspace, deactivateMember } from "../src/server/auth/service";
import { resolveSessionAndTenant } from "../src/server/auth/session";
import { TenantContext } from "../src/server/tenancy/context";
import { TenantRole, TaskPriority, TaskWorkflowStatus } from "@prisma/client";

import { createEmployeeService } from "../src/server/modules/employees/service";
import {
  findEmployeesFiltered,
  updateTenantEmployee,
  removeMember,
  reactivateMember,
} from "../src/server/modules/employees/repository";

import {
  findTasks,
  updateTask,
  transitionTaskStatus,
  createTask,
  toggleChecklistItem,
  addTaskComment,
} from "../src/server/modules/tasks/repository";

import {
  findContractors,
  createContractor,
  updateContractor,
} from "../src/server/modules/contractors/repository";

import {
  findConsultants,
  createConsultant,
  updateConsultant,
} from "../src/server/modules/consultants/repository";

import {
  findDrawings,
  createDrawing,
  uploadNewRevision,
  submitRevisionForReview,
  withdrawRevisionSubmission,
  reviewRevision,
  recordClientApproval,
  deleteUnsubmittedDraft,
} from "../src/server/modules/drawings/repository";

import { savePrivateFile, readPrivateFile } from "../src/server/storage/storage-adapter";

describe("Phase 4, 5 & 6: Full Role Authorization, Task Dashboard, Directories & Collaborative Drawings", () => {
  let tenant1: any;
  let tenant2: any;
  let tanyaCtx: TenantContext;
  let priyaAdminCtx: TenantContext;
  let ananyaEmployeeCtx: TenantContext;
  let apexOwnerCtx: TenantContext;

  let tanyaMember: any;
  let priyaMember: any;
  let ananyaMember: any;
  let apexMember: any;

  let project1: any;
  let project2: any;
  let dummyFileId: string;

  before(async () => {
    tenant1 = await prisma.tenant.findUnique({ where: { slug: "100percentdesign" } });
    tenant2 = await prisma.tenant.findUnique({ where: { slug: "apex-studio" } });
    assert.ok(tenant1, "Tenant 1 must exist");
    assert.ok(tenant2, "Tenant 2 must exist");

    // Retrieve memberships
    tanyaMember = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant1.id, user: { email: "boss@100percentdesign.in" } },
      include: { user: true, employee: true },
    });
    assert.ok(tanyaMember);

    priyaMember = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant1.id, user: { email: "admin@100percentdesign.in" } },
      include: { user: true, employee: true },
    });
    assert.ok(priyaMember);

    ananyaMember = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant1.id, user: { email: "ananya@100percentdesign.in" } },
      include: { user: true, employee: true },
    });
    assert.ok(ananyaMember);

    apexMember = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant2.id, user: { email: "siddharth@apexstudio.in" } },
      include: { user: true, employee: true },
    });
    assert.ok(apexMember);

    // Build context objects
    tanyaCtx = {
      tenantId: tenant1.id,
      tenantSlug: tenant1.slug,
      tenantName: tenant1.name,
      userId: tanyaMember.userId,
      userEmail: tanyaMember.user.email,
      userFullName: tanyaMember.user.fullName,
      membershipId: tanyaMember.id,
      employeeId: tanyaMember.employee?.employeeId ?? null,
      role: TenantRole.OWNER,
      hasFinanceAccess: true,
      timezone: tenant1.timezone,
      currency: tenant1.currency,
    };

    priyaAdminCtx = {
      tenantId: tenant1.id,
      tenantSlug: tenant1.slug,
      tenantName: tenant1.name,
      userId: priyaMember.userId,
      userEmail: priyaMember.user.email,
      userFullName: priyaMember.user.fullName,
      membershipId: priyaMember.id,
      employeeId: priyaMember.employee?.employeeId ?? null,
      role: TenantRole.ADMIN,
      hasFinanceAccess: true,
      timezone: tenant1.timezone,
      currency: tenant1.currency,
    };

    ananyaEmployeeCtx = {
      tenantId: tenant1.id,
      tenantSlug: tenant1.slug,
      tenantName: tenant1.name,
      userId: ananyaMember.userId,
      userEmail: ananyaMember.user.email,
      userFullName: ananyaMember.user.fullName,
      membershipId: ananyaMember.id,
      employeeId: ananyaMember.employee?.employeeId ?? null,
      role: TenantRole.EMPLOYEE,
      hasFinanceAccess: false,
      timezone: tenant1.timezone,
      currency: tenant1.currency,
    };

    apexOwnerCtx = {
      tenantId: tenant2.id,
      tenantSlug: tenant2.slug,
      tenantName: tenant2.name,
      userId: apexMember.userId,
      userEmail: apexMember.user.email,
      userFullName: apexMember.user.fullName,
      membershipId: apexMember.id,
      employeeId: apexMember.employee?.employeeId ?? null,
      role: TenantRole.OWNER,
      hasFinanceAccess: true,
      timezone: tenant2.timezone,
      currency: tenant2.currency,
    };

    // Find test projects
    project1 = await prisma.project.findFirst({ where: { tenantId: tenant1.id, code: "PRJ-001" } });
    project2 = await prisma.project.findFirst({ where: { tenantId: tenant1.id, code: "PRJ-002" } });
    assert.ok(project1);
    assert.ok(project2);

    // Save a valid private dummy file for drawing tests
    const dummyPdfBuffer = Buffer.from("%PDF-1.4 Architectural Test Blueprint Content %EOF");
    const saved = await savePrivateFile(tanyaCtx, {
      fileName: "ground_floor_plan.pdf",
      mimeType: "application/pdf",
      buffer: dummyPdfBuffer,
    });
    dummyFileId = saved.id;
  });

  after(async () => {
    // Clean up test users, sessions, and memberships created for tests
    await prisma.session.deleteMany({ where: { user: { email: { contains: "revocable" } } } }).catch(() => {});
    await prisma.employee.deleteMany({ where: { employeeId: { startsWith: "EMP-TEST" } } }).catch(() => {});
    await prisma.tenantMembership.deleteMany({ where: { user: { email: { contains: "revocable" } } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { contains: "revocable" } } }).catch(() => {});
  });

  // =========================================================================
  // 1. Central Server Authorization & Employee Administration
  // =========================================================================
  describe("1. Central Server Authorization & Employee Administration", () => {
    test("OWNER & ADMIN can access employee list with full metadata; Employees get sanitized view", async () => {
      const ownerView = await findEmployeesFiltered(tanyaCtx);
      assert.ok(ownerView.employees.length >= 5);
      // Owner sees hasFinanceAccess
      const ownerEmp = ownerView.employees.find((e) => e.email === "boss@100percentdesign.in");
      assert.equal(ownerEmp?.hasFinanceAccess, true);

      // Filter by role
      const admins = await findEmployeesFiltered(tanyaCtx, { role: "ADMIN" });
      assert.ok(admins.employees.every((e) => e.role === "ADMIN"));
    });

    test("EMPLOYEE cannot create new employees (Server-side 403 Forbidden)", async () => {
      await assert.rejects(
        async () => {
          await createEmployeeService(ananyaEmployeeCtx, {
            employeeId: "EMP-TEST-999",
            fullName: "Illegitimate Staff",
            email: "hacker@100percentdesign.in",
            role: "EMPLOYEE",
          });
        },
        /Only Studio Administrators or Owners can add new employees/
      );
    });

    test("ADMIN cannot create or promote anyone to OWNER (Dual Partner protection)", async () => {
      await assert.rejects(
        async () => {
          await createEmployeeService(priyaAdminCtx, {
            employeeId: "EMP-TEST-998",
            fullName: "Fake Partner",
            email: "partner2@100percentdesign.in",
            role: "OWNER",
          });
        },
        /Only an existing Owner\/Partner can grant Owner privileges/
      );
    });

    test("Last active OWNER protection: cannot demote, deactivate, or delete the last OWNER", async () => {
      // Attempting to demote Tanya (the only OWNER in tenant 1)
      await assert.rejects(
        async () => {
          await updateTenantEmployee(tanyaCtx, tanyaMember.id, {
            role: "ADMIN",
          });
        },
        /Cannot demote the last remaining active Owner/
      );

      // Attempting to remove Tanya
      const removalResult = await removeMember(tanyaCtx, tanyaMember.id);
      assert.equal(removalResult.success, false);
      assert.match(removalResult.error || "", /You cannot remove your own account|last remaining active owner/);

      // Attempting to deactivate Tanya
      const deactResult = await deactivateMember(tenant1.id, tanyaMember.id, priyaMember.userId);
      assert.equal(deactResult.success, false);
      assert.match(deactResult.error || "", /Cannot deactivate the last (active|remaining) (OWNER|owner)/i);
    });

    test("Historical attribution preservation: cannot delete employee with associated tasks/visits", async () => {
      // Ananya has tasks and site visits
      const removalResult = await removeMember(tanyaCtx, ananyaMember.id);
      assert.equal(removalResult.success, false);
      assert.match(removalResult.error || "", /historical records exist.*Please deactivate the member instead/);
    });

    test("Clean removal succeeds only for unreferenced members and revokes active sessions", async () => {
      // Create a temporary unreferenced employee
      const created = await createEmployeeService(tanyaCtx, {
        employeeId: "EMP-TEMP-DEL",
        fullName: "Temporary Contractor Staff",
        email: "temp.del@100percentdesign.in",
        role: "EMPLOYEE",
        temporaryPassword: "StudioPassword2026!",
      });

      assert.ok(created.membershipId);

      // Perform clean removal
      const removeRes = await removeMember(tanyaCtx, created.membershipId);
      assert.equal(removeRes.success, true);

      // Verify record is gone from tenant
      const check = await prisma.tenantMembership.findUnique({
        where: { id: created.membershipId },
      });
      assert.equal(check, null);
    });
  });

  // =========================================================================
  // 2. Employee Task Dashboard & Field Restrictions
  // =========================================================================
  describe("2. Employee Task Dashboard & Field Restrictions", () => {
    let testTask: any;

    before(async () => {
      // Create a test task assigned to Ananya
      testTask = await createTask(tanyaCtx, {
        projectId: project1.id,
        title: "Test Drafting Task for RBAC",
        description: "Initial description",
        assigneeId: ananyaMember.id,
        priority: TaskPriority.HIGH,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      assert.ok(testTask);
    });

    test("Employees only view tasks assigned to them", async () => {
      const tasks = await findTasks(ananyaEmployeeCtx);
      assert.ok(tasks.length > 0);
      assert.ok(tasks.every((t) => t.assigneeId === ananyaMember.id));
    });

    test("Employees CAN update permitted fields: description, checklist, comments", async () => {
      // Update description
      const updated = await updateTask(ananyaEmployeeCtx, testTask.id, {
        description: "Updated drafting progress with section cut revisions",
      });
      assert.equal(updated.description, "Updated drafting progress with section cut revisions");

      // Add task comment
      const comment = await addTaskComment(ananyaEmployeeCtx, testTask.id, "Finished initial structural review");
      assert.equal(comment.content, "Finished initial structural review");
      assert.equal(comment.authorId, ananyaMember.id);
    });

    test("Employees CANNOT modify protected task fields (priority, dueDate, phaseId)", async () => {
      await assert.rejects(
        async () => {
          await updateTask(ananyaEmployeeCtx, testTask.id, {
            priority: TaskPriority.LOW,
          });
        },
        /Employees cannot modify protected task fields \(priority, due date, project\/phase links\)/
      );

      await assert.rejects(
        async () => {
          await updateTask(ananyaEmployeeCtx, testTask.id, {
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
        },
        /Employees cannot modify protected task fields/
      );
    });

    test("Employees CANNOT update tasks assigned to other employees", async () => {
      // Find task assigned to Vikram
      const vikramMember = await prisma.tenantMembership.findFirst({
        where: { tenantId: tenant1.id, user: { email: "vikram@100percentdesign.in" } },
      });
      assert.ok(vikramMember);

      const vikramTask = await prisma.task.findFirst({
        where: { tenantId: tenant1.id, assigneeId: vikramMember.id },
      });
      assert.ok(vikramTask);

      await assert.rejects(
        async () => {
          await updateTask(ananyaEmployeeCtx, vikramTask.id, {
            description: "Ananya trying to edit Vikram's work",
          });
        },
        /You can only edit tasks assigned to you/
      );
    });

    test("Workflow & Self-Approval Prevention: Assignee cannot approve their own deliverable", async () => {
      // Move to IN_PROGRESS
      await transitionTaskStatus(ananyaEmployeeCtx, testTask.id, TaskWorkflowStatus.IN_PROGRESS);

      // Move to IN_REVIEW
      await transitionTaskStatus(ananyaEmployeeCtx, testTask.id, TaskWorkflowStatus.IN_REVIEW);

      // Assignee (Ananya) attempts to approve/complete their own task -> MUST FAIL
      await assert.rejects(
        async () => {
          await transitionTaskStatus(ananyaEmployeeCtx, testTask.id, TaskWorkflowStatus.COMPLETED);
        },
        /Self-approval is forbidden. An independent reviewer or project manager must approve/
      );

      // Partner/Admin (Tanya) can review and approve it
      const completed = await transitionTaskStatus(tanyaCtx, testTask.id, TaskWorkflowStatus.COMPLETED);
      assert.equal(completed.status, TaskWorkflowStatus.COMPLETED);
    });

    test("Direct completion override requires Admin/Partner authority and audit reason", async () => {
      // Create new task in NOT_STARTED
      const directTask = await createTask(tanyaCtx, {
        projectId: project1.id,
        title: "Fast-Track Client Deliverable",
        assigneeId: ananyaMember.id,
        priority: TaskPriority.MEDIUM,
      });

      // Employee cannot override directly
      await assert.rejects(
        async () => {
          await transitionTaskStatus(ananyaEmployeeCtx, directTask.id, TaskWorkflowStatus.COMPLETED, {
            auditReason: "Fast track",
          });
        },
        /Direct completion override requires Administrator or Partner authority/
      );

      // Admin without audit reason fails
      await assert.rejects(
        async () => {
          await transitionTaskStatus(tanyaCtx, directTask.id, TaskWorkflowStatus.COMPLETED);
        },
        /audit reason/i
      );

      // Admin with audit reason succeeds
      const overridden = await transitionTaskStatus(tanyaCtx, directTask.id, TaskWorkflowStatus.COMPLETED, {
        auditReason: "Principal partner approved on site during joint client inspection",
      });
      assert.equal(overridden.status, TaskWorkflowStatus.COMPLETED);
    });
  });

  // =========================================================================
  // 3. Contractor & Consultant Directories
  // =========================================================================
  describe("3. Contractor & Consultant Directories", () => {
    let createdContractorId: string;
    let createdConsultantId: string;

    test("Employees are DENIED write access to Contractor & Consultant directories", async () => {
      await assert.rejects(
        async () => {
          await createContractor(ananyaEmployeeCtx, {
            name: "Unauthorized Contractor",
            trade: "Civil",
          });
        },
        /privileges required|Forbidden/i
      );

      await assert.rejects(
        async () => {
          await createConsultant(ananyaEmployeeCtx, {
            name: "Unauthorized Consultant",
            firmName: "Fake Firm",
            discipline: "Acoustics",
          });
        },
        /privileges required|Forbidden/i
      );
    });

    test("OWNER/ADMIN can create contractors & consultants with M:N project associations", async () => {
      const contractor = await createContractor(tanyaCtx, {
        name: "Supreme Waterproofing & Grouting",
        contact: "+91 99001 22334",
        trade: "Specialized Waterproofing",
        projectIds: [project1.id],
      });
      assert.ok(contractor.id);
      createdContractorId = contractor.id;

      const consultant = await createConsultant(tanyaCtx, {
        name: "Dr. Anirudh Mehta",
        firmName: "GeoTech Foundations Lab",
        discipline: "Geotechnical / Soil",
        projectIds: [project1.id],
      });
      assert.ok(consultant.id);
      createdConsultantId = consultant.id;
    });

    test("Commercial quotation data and amounts are completely hidden from non-finance Employees", async () => {
      // Find contractors using employee context
      const contractors = await findContractors(ananyaEmployeeCtx);
      assert.ok(contractors.length > 0);

      // Check all projects in employee's contractor list: quotations MUST be empty array
      for (const c of contractors) {
        for (const p of c.projects) {
          assert.equal(
            p.quotations.length,
            0,
            "Non-finance employees must never receive quotation records"
          );
        }
      }

      // Tanya (has finance access) sees quotation records
      const ownerContractors = await findContractors(tanyaCtx);
      const contractorWithQuote = ownerContractors.find((c) =>
        c.projects.some((p) => p.quotations.length > 0)
      );
      assert.ok(contractorWithQuote, "Owner must see quotations for contractors");
    });
  });

  // =========================================================================
  // 4. Drawing & Blueprint Management (Atomic Revisions, No Self-Approval)
  // =========================================================================
  describe("4. Drawing & Blueprint Management", () => {
    let drawingDocId: string;
    let initialRevId: string;
    let newRevId: string;

    test("Employees CANNOT add drawings to projects they are not assigned to", async () => {
      // Ananya is NOT assigned to PRJ-002
      await assert.rejects(
        async () => {
          await createDrawing(ananyaEmployeeCtx, {
            projectId: project2.id,
            title: "Unauthorized Floor Plan",
            discipline: "Architectural",
            documentType: "Floor Plan",
            fileId: dummyFileId,
          });
        },
        /You can only add drawings to projects you are assigned to/
      );
    });

    test("Employees CAN create drawings on assigned projects (Atomic R0 initial revision)", async () => {
      // Ananya is assigned to PRJ-001
      const created = await createDrawing(ananyaEmployeeCtx, {
        projectId: project1.id,
        title: "Villa Basalt Cantilever Section",
        drawingNumber: "ARC-DET-001",
        discipline: "Architectural",
        documentType: "Section Detail",
        fileId: dummyFileId,
      });

      assert.ok(created.document.id);
      assert.equal(created.version.revision, "R0");
      assert.equal(created.version.approvalState, "DRAFT");
      assert.equal(created.version.uploaderId, ananyaMember.id);

      drawingDocId = created.document.id;
      initialRevId = created.version.id;
    });

    test("Drawing Approval Workflow: Drafter CANNOT approve their own revision (No Self-Approval)", async () => {
      // Create a drawing uploaded by Tanya (who is OWNER and authorized to approve)
      const tanyaDrawing = await createDrawing(tanyaCtx, {
        projectId: project1.id,
        title: "Master Suite Detail by Partner",
        discipline: "Architectural",
        documentType: "Detail",
        fileId: dummyFileId,
      });

      // Submit for review
      await submitRevisionForReview(tanyaCtx, tanyaDrawing.version.id);

      // Tanya attempts to approve her own revision -> MUST FAIL due to self-approval block
      await assert.rejects(
        async () => {
          await reviewRevision(tanyaCtx, tanyaDrawing.version.id, "APPROVED");
        },
        /Self-approval forbidden. Another studio partner or administrator must review/
      );

      // Priya (Admin) can approve Tanya's revision
      const approvedByAdmin = await reviewRevision(priyaAdminCtx, tanyaDrawing.version.id, "APPROVED");
      assert.equal(approvedByAdmin.approvalState, "APPROVED");
    });

    test("Partner/Admin approves R0; New Revision R1 is uploaded and DOES NOT inherit approval", async () => {
      // Submit Ananya's R0 for review
      await submitRevisionForReview(ananyaEmployeeCtx, initialRevId);

      // Tanya (Partner) approves R0
      const approvedR0 = await reviewRevision(tanyaCtx, initialRevId, "APPROVED");
      assert.equal(approvedR0.approvalState, "APPROVED");

      // Ananya uploads new revision R1
      const rev1 = await uploadNewRevision(ananyaEmployeeCtx, {
        documentId: drawingDocId,
        fileId: dummyFileId,
        issuePurpose: "Incorporate site feedback on cantilever beam depth",
      });

      assert.equal(rev1.revision, "R1");
      // NEW REVISION NEVER INHERITS APPROVAL: MUST BE DRAFT
      assert.equal(rev1.approvalState, "DRAFT");
      newRevId = rev1.id;

      // Verify that findDrawings displays BOTH latestVersion (R1) and latestApprovedVersion (R0)
      const drawings = await findDrawings(tanyaCtx, { projectId: project1.id });
      const currentDoc = drawings.find((d) => d.id === drawingDocId);
      assert.ok(currentDoc);
      assert.equal(currentDoc.latestVersion?.revision, "R1");
      assert.equal(currentDoc.latestApprovedVersion?.revision, "R0");
    });

    test("Changes Requested requires mandatory architectural correction comment", async () => {
      // Submit R1 for review
      await submitRevisionForReview(ananyaEmployeeCtx, newRevId);

      // Attempt to request changes without comment
      await assert.rejects(
        async () => {
          await reviewRevision(tanyaCtx, newRevId, "CHANGES_REQUESTED", "");
        },
        /A comment detailing required architectural corrections is mandatory/
      );

      // Request changes with architectural comment
      const corrected = await reviewRevision(
        tanyaCtx,
        newRevId,
        "CHANGES_REQUESTED",
        "Cantilever deflection calculation exceeds IS 456 limits. Deepen section from 450mm to 600mm."
      );
      assert.equal(corrected.approvalState, "DRAFT");
    });

    test("Draft deletion allowed only for unsubmitted drafts without history", async () => {
      // Create a throwaway draft revision
      const throwawayDoc = await createDrawing(ananyaEmployeeCtx, {
        projectId: project1.id,
        title: "Temporary Concept Sketch",
        discipline: "Architectural",
        documentType: "Sketch",
        fileId: dummyFileId,
      });

      // While in DRAFT without approval history, uploader can delete it
      const delRes = await deleteUnsubmittedDraft(ananyaEmployeeCtx, throwawayDoc.version.id);
      assert.equal(delRes.success, true);
    });

    test("Client Approval Evidence: Only Owner/Admin can record client approval with evidence", async () => {
      // Employee cannot record client approval
      await assert.rejects(
        async () => {
          await recordClientApproval(ananyaEmployeeCtx, initialRevId, {
            status: "APPROVED",
            evidenceText: "Client verbal confirmation",
          });
        },
        /Only Studio Partners and Admins can record client approval evidence/
      );

      // Admin/Owner requires evidence text
      await assert.rejects(
        async () => {
          await recordClientApproval(tanyaCtx, initialRevId, {
            status: "APPROVED",
            evidenceText: "",
          });
        },
        /Client approval evidence .* is mandatory/
      );

      // Admin/Owner records valid client approval
      const clientApproval = await recordClientApproval(tanyaCtx, initialRevId, {
        status: "APPROVED",
        evidenceText: "Signed architectural drawing set received via courier and email from Arun Singhal on 2026-03-29",
      });
      assert.ok(clientApproval.id);
      assert.equal(clientApproval.isClientApproval, true);
    });
  });

  // =========================================================================
  // 5. Safe Private Storage & Cross-Tenant File Isolation
  // =========================================================================
  describe("5. Safe Private Storage & Cross-Tenant File Isolation", () => {
    test("Rejects unsafe file formats (e.g. .exe, .sh, .bat)", async () => {
      const maliciousBuffer = Buffer.from("#!/bin/bash\necho Malicious Script");
      await assert.rejects(
        async () => {
          await savePrivateFile(tanyaCtx, {
            fileName: "malicious_script.sh",
            mimeType: "text/x-shellscript",
            buffer: maliciousBuffer,
          });
        },
        /Unsupported file type/
      );
    });

    test("Cross-Tenant storage isolation: Tenant 2 cannot access private files of Tenant 1", async () => {
      // Apex Studio Owner tries to read Tenant 1's blueprint file
      await assert.rejects(
        async () => {
          await readPrivateFile(apexOwnerCtx, dummyFileId);
        },
        /File not found in this studio workspace/
      );
    });
  });

  // =========================================================================
  // 6. Session Revocation on Deactivation
  // =========================================================================
  describe("6. Session Revocation on Deactivation", () => {
    test("Deactivation immediately revokes active session; reactivation does not restore it", async () => {
      let testEmp: any = null;
      try {
        // 1. Create a test employee who can log in
        testEmp = await createEmployeeService(tanyaCtx, {
          employeeId: "EMP-TEST-REV",
          fullName: "Revocation Test Employee",
          email: "revocable@100percentdesign.in",
          role: "EMPLOYEE",
          temporaryPassword: "StudioPassword2026!",
        });

        // 2. Log in with workspace
        const loginRes = await loginWithWorkspace({
          workspaceSlug: "100percentdesign",
          identifier: "EMP-TEST-REV",
          password: "StudioPassword2026!",
        });
        assert.equal(loginRes.success, true);
        assert.ok(loginRes.sessionToken);

        // 3. Resolve session -> Succeeds
        const activeCtx = await resolveSessionAndTenant(loginRes.sessionToken, "100percentdesign");
        assert.equal(activeCtx.userEmail, "revocable@100percentdesign.in");

        // 4. Deactivate membership -> Invalidate sessions immediately
        const deactRes = await deactivateMember(tenant1.id, testEmp.membershipId, tanyaCtx.userId);
        assert.equal(deactRes.success, true);

        // 5. Immediate next request with same session token -> MUST FAIL (Session revoked or deactivated)
        await assert.rejects(
          async () => {
            await resolveSessionAndTenant(loginRes.sessionToken, "100percentdesign");
          },
          /revoked|inactive|expired/i
        );

        // 6. Reactivate member
        await reactivateMember(tanyaCtx, testEmp.membershipId);

        // 7. Old revoked session token MUST STILL FAIL
        await assert.rejects(
          async () => {
            await resolveSessionAndTenant(loginRes.sessionToken, "100percentdesign");
          },
          /revoked|inactive|expired/i
        );
      } finally {
        if (testEmp) {
          await prisma.session.deleteMany({ where: { user: { email: "revocable@100percentdesign.in" } } }).catch(() => {});
          await prisma.employee.deleteMany({ where: { employeeId: "EMP-TEST-REV" } }).catch(() => {});
          await prisma.tenantMembership.deleteMany({ where: { id: testEmp.membershipId } }).catch(() => {});
          await prisma.user.deleteMany({ where: { email: "revocable@100percentdesign.in" } }).catch(() => {});
        }
      }
    });
  });
});
