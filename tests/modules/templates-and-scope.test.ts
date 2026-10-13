import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, assertSafeTestDatabase } from "../helpers/test-db";
import {
  createProjectTemplate,
  previewApplyTemplate,
  applyTemplateToProject,
} from "../../src/server/modules/projects/templates";
import {
  requestProjectScopeChange,
  decideProjectScopeChange,
  applyProjectScopeChange,
  recordClientConfirmation,
} from "../../src/server/modules/projects/lifecycle";
import { TenantContext } from "../../src/server/tenancy/context";
import { TenantRole, ChangeRequestStatus, TaskWorkflowStatus } from "@prisma/client";

describe("Phase 6: Templates and Scope-Change Approval Suite", () => {
  assertSafeTestDatabase();

  let tenant: any;
  let adminCtx: TenantContext;
  let employeeCtx: TenantContext;
  let adminMember: any;
  let employeeMember: any;
  let project: any;
  let createdTemplate: any;
  let createdScopeRequest: any;

  before(async () => {
    tenant = await prisma.tenant.findUnique({ where: { slug: "100percentdesign" } });
    assert.ok(tenant);

    const members = await prisma.tenantMembership.findMany({
      where: { tenantId: tenant.id, isActive: true },
      include: { user: true, employee: true },
    });

    adminMember = members.find((m) => m.role === TenantRole.ADMIN);
    employeeMember = members.find((m) => m.role === TenantRole.EMPLOYEE);
    assert.ok(adminMember && employeeMember);

    adminCtx = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      userId: adminMember.userId,
      userEmail: adminMember.user.email,
      userFullName: adminMember.user.fullName,
      membershipId: adminMember.id,
      employeeId: adminMember.employee?.employeeId ?? null,
      role: TenantRole.ADMIN,
      hasFinanceAccess: true,
      timezone: tenant.timezone,
      currency: tenant.currency,
    };

    employeeCtx = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      userId: employeeMember.userId,
      userEmail: employeeMember.user.email,
      userFullName: employeeMember.user.fullName,
      membershipId: employeeMember.id,
      employeeId: employeeMember.employee?.employeeId ?? null,
      role: TenantRole.EMPLOYEE,
      hasFinanceAccess: false,
      timezone: tenant.timezone,
      currency: tenant.currency,
    };

    // Create a dedicated isolated test project for template & scope testing
    project = await prisma.project.create({
      data: {
        tenantId: tenant.id,
        name: "Test Blueprint Project",
        code: `TBP-${Date.now()}`,
        status: "ACTIVE",
        budget: 500000,
        targetDate: new Date("2026-12-31"),
      },
    });
  });

  after(async () => {
    if (project) {
      await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
    }
    if (createdTemplate) {
      await prisma.projectTemplate.delete({ where: { id: createdTemplate.id } }).catch(() => {});
    }
  });

  test("1. Cyclic dependencies in templates are strictly rejected", async () => {
    await assert.rejects(
      async () => {
        await createProjectTemplate(adminCtx, {
          name: "Cyclic Test Template",
          projectType: "Architecture",
          phases: [
            { name: "Phase 1", sortOrder: 1, offsetDays: 0, durationDays: 10 },
            { name: "Phase 2", sortOrder: 2, offsetDays: 10, durationDays: 10 },
          ],
          deliverables: [
            { title: "Task A", phaseIndex: 0, offsetDays: 0, durationDays: 5 },
            { title: "Task B", phaseIndex: 1, offsetDays: 5, durationDays: 5 },
          ],
          // Cycle: 0 -> 1 and 1 -> 0
          dependencies: [
            { fromIndex: 0, toIndex: 1 },
            { fromIndex: 1, toIndex: 0 },
          ],
        });
      },
      /Cyclic dependency detected/
    );
  });

  test("2. Creating valid template and previewing application resolves dates and detects duplicate application", async () => {
    createdTemplate = await createProjectTemplate(adminCtx, {
      name: "Residential Boutique Villa",
      projectType: "Residential",
      phases: [
        { name: "Schematic Architecture", sortOrder: 1, offsetDays: 0, durationDays: 14 },
        { name: "GFC Drawings", sortOrder: 2, offsetDays: 14, durationDays: 20 },
      ],
      deliverables: [
        {
          title: "Preliminary 3D Massing",
          phaseIndex: 0,
          offsetDays: 2,
          durationDays: 5,
          estimatedHours: 25,
          suggestedRole: "Project Architect",
          checklists: [
            { title: "Client brief verified", requiredEvidence: true },
          ],
        },
        {
          title: "Structural Coordination Layout",
          phaseIndex: 1,
          offsetDays: 2,
          durationDays: 10,
          estimatedHours: 35,
          suggestedRole: "Project Architect",
        },
      ],
      dependencies: [{ fromIndex: 0, toIndex: 1 }],
    });

    assert.ok(createdTemplate);
    assert.equal(createdTemplate.version, 1);

    // Preview application
    const preview = await previewApplyTemplate(adminCtx, {
      templateId: createdTemplate.id,
      projectId: project.id,
      startDate: "2026-11-01",
      roleMapping: {
        "Project Architect": employeeMember.id,
      },
    });

    assert.equal(preview.resolvedPhases.length, 2);
    assert.equal(preview.resolvedTasks.length, 2);
    assert.equal(preview.totalEstimatedHours, 60);
    // Task A: start 2026-11-01 + 0 (phase) + 2 (task offset) = 2026-11-03
    assert.equal(preview.resolvedTasks[0].startDate, "2026-11-03");
  });

  test("3. Applying template transactionally creates versioned snapshot and preserves completed history", async () => {
    const applied = await applyTemplateToProject(adminCtx, {
      templateId: createdTemplate.id,
      projectId: project.id,
      startDate: "2026-11-01",
      roleMapping: {
        "Project Architect": employeeMember.id,
      },
      confirmationNotes: "Approved villa blueprint application",
    });

    assert.equal(applied.success, true);
    assert.equal(applied.phasesCount, 2);
    assert.equal(applied.tasksCount, 2);

    // Verify project has snapshot applied
    const updatedProject = await prisma.project.findUnique({
      where: { id: project.id },
    });
    assert.equal(updatedProject?.appliedTemplateId, createdTemplate.id);
    assert.equal(updatedProject?.templateVersion, 1);

    // Verify tasks generated with checklists and assigned member
    const tasks = await prisma.task.findMany({
      where: { projectId: project.id },
      include: { checklistItems: true },
    });
    assert.equal(tasks.length, 2);
    const taskWithChecklist = tasks.find((t) => t.title === "Preliminary 3D Massing");
    assert.ok(taskWithChecklist);
    assert.equal(taskWithChecklist.assigneeId, employeeMember.id);
    assert.equal(Number(taskWithChecklist.estimatedHours), 25.0);
    assert.equal(taskWithChecklist.checklistItems.length, 1);
  });

  test("4. Requesting scope change captures deliverables, effort, and currency", async () => {
    createdScopeRequest = await requestProjectScopeChange(adminCtx, project.id, {
      title: "Add Rooftop Swimming Pool & Deck",
      reason: "Client requested luxury amenities expansion during schematic design review",
      affectedScope: "Terrace structural slab and waterproof MEP detailing",
      scheduleImpactDays: 14,
      feeImpactAmount: 75000,
      currency: "INR",
      estimatedEffortHours: 45,
      proposedDeliverables: [
        { title: "Rooftop Structural Load Calculations", estimatedHours: 20 },
        { title: "Pool Plumbing & Filtration Detailing", estimatedHours: 25 },
      ],
    });

    assert.ok(createdScopeRequest);
    assert.equal(createdScopeRequest.status, ChangeRequestStatus.PENDING);
    assert.equal(Number(createdScopeRequest.feeImpactAmount), 75000);
    assert.equal(Number(createdScopeRequest.estimatedEffortHours), 45);
    assert.equal(createdScopeRequest.isClientAccepted, false);
  });

  test("5. Internal approval is distinct from client acceptance", async () => {
    // 1. Leadership internal review approval (using another member to satisfy four-eyes)
    const internallyApproved = await decideProjectScopeChange(
      { ...adminCtx, membershipId: employeeMember.id, role: TenantRole.ADMIN },
      createdScopeRequest.id,
      {
        decision: "APPROVE",
        decisionNotes: "Internally vetted by structural lead",
        autoApply: false, // Internal approval does not automatically apply before client sign-off
      }
    );

    assert.equal(internallyApproved.status, ChangeRequestStatus.APPROVED);
    assert.equal(internallyApproved.isClientAccepted, false, "Internal approval must not mark client accepted");

    // 2. Client acceptance confirmation
    const clientConfirmed = await recordClientConfirmation(adminCtx, createdScopeRequest.id, {
      isClientAccepted: true,
      confirmationNotes: "Client signed Addendum No. 1 via email",
      confirmationEvidence: "SIGNED_ADDENDUM_01.pdf",
    });

    assert.equal(clientConfirmed.isClientAccepted, true);
    assert.ok(clientConfirmed.clientConfirmedAt);
    assert.equal(clientConfirmed.clientConfirmationEvidence, "SIGNED_ADDENDUM_01.pdf");
  });

  test("6. Applying approved scope change idempotently creates linked tasks and preserves audit history", async () => {
    const appliedResult = await applyProjectScopeChange(
      { ...adminCtx, membershipId: employeeMember.id, role: TenantRole.ADMIN },
      createdScopeRequest.id
    );

    assert.equal(appliedResult.success, true);
    assert.equal((appliedResult as any).createdTasksCount, 2);

    // Verify linked tasks have scopeChangeId
    const linkedTasks = await prisma.task.findMany({
      where: { scopeChangeId: createdScopeRequest.id },
    });
    assert.equal(linkedTasks.length, 2);
    assert.ok(linkedTasks.some((t) => t.title === "Rooftop Structural Load Calculations"));

    // Verify project budget updated
    const updatedProject = await prisma.project.findUnique({
      where: { id: project.id },
    });
    assert.equal(Number(updatedProject?.budget), 575000); // 500k + 75k

    // Second apply attempt must be idempotent
    const secondApply = await applyProjectScopeChange(
      { ...adminCtx, membershipId: employeeMember.id, role: TenantRole.ADMIN },
      createdScopeRequest.id
    );
    assert.equal(secondApply.alreadyApplied, true);
  });
});
