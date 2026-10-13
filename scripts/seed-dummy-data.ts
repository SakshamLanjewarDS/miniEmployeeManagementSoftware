import {
  PrismaClient,
  TenantLifecycleState,
  TenantRole,
  UserAccountState,
  Prisma,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const Decimal = Prisma.Decimal;

const DEFAULT_PASSWORD = "Saksham@2003";

async function main() {
  console.log("🌱 Seeding realistic test data for Project 2 integrated modules...");

  // 1. Resolve Workspace
  let tenant = await prisma.tenant.findUnique({
    where: { slug: "100percentdesign" },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        slug: "100percentdesign",
        name: "100% DESIGN Studio",
        timezone: "Asia/Kolkata",
        currency: "INR",
        lifecycleState: TenantLifecycleState.ACTIVE,
      },
    });
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // 2. Owner User: Saksham Lanjewar
  let ownerUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: "designsaksham1@gmail.com" },
        { email: "owner@100percentdesign.in" },
      ],
    },
  });

  if (!ownerUser) {
    ownerUser = await prisma.user.create({
      data: {
        email: "designsaksham1@gmail.com",
        passwordHash,
        fullName: "Saksham Lanjewar (Principal Owner)",
        accountState: UserAccountState.ACTIVE,
      },
    });
  } else {
    await prisma.user.update({
      where: { id: ownerUser.id },
      data: { passwordHash, accountState: UserAccountState.ACTIVE },
    });
  }

  let ownerMembership = await prisma.tenantMembership.findFirst({
    where: { tenantId: tenant.id, userId: ownerUser.id },
  });

  if (!ownerMembership) {
    ownerMembership = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: ownerUser.id,
        role: TenantRole.OWNER,
        hasFinanceAccess: true,
        isActive: true,
      },
    });
  } else {
    await prisma.tenantMembership.update({
      where: { id: ownerMembership.id },
      data: { role: TenantRole.OWNER, isActive: true },
    });
  }

  let ownerEmployee = await prisma.employee.findFirst({
    where: { tenantId: tenant.id, membershipId: ownerMembership.id },
  });

  if (!ownerEmployee) {
    ownerEmployee = await prisma.employee.create({
      data: {
        tenantId: tenant.id,
        membershipId: ownerMembership.id,
        employeeId: "EMP-001",
        designation: "Principal Architect & Owner",
        department: "Executive",
        phone: "+91 98201 11001",
        joinDate: new Date("2024-01-01"),
      },
    });
  }

  // 3. Employee 1: Arjun Mehta (Senior Architect)
  let emp1User = await prisma.user.findUnique({
    where: { email: "arjun@100percentdesign.in" },
  });

  if (!emp1User) {
    emp1User = await prisma.user.create({
      data: {
        email: "arjun@100percentdesign.in",
        passwordHash,
        fullName: "Arjun Mehta",
        accountState: UserAccountState.ACTIVE,
      },
    });
  } else {
    await prisma.user.update({
      where: { id: emp1User.id },
      data: { passwordHash, accountState: UserAccountState.ACTIVE },
    });
  }

  let emp1Membership = await prisma.tenantMembership.findFirst({
    where: { tenantId: tenant.id, userId: emp1User.id },
  });

  if (!emp1Membership) {
    emp1Membership = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: emp1User.id,
        role: TenantRole.EMPLOYEE,
        hasFinanceAccess: false,
        isActive: true,
      },
    });
  } else {
    await prisma.tenantMembership.update({
      where: { id: emp1Membership.id },
      data: { role: TenantRole.EMPLOYEE, isActive: true },
    });
  }

  let emp1 = await prisma.employee.findFirst({
    where: { tenantId: tenant.id, membershipId: emp1Membership.id },
  });

  if (!emp1) {
    emp1 = await prisma.employee.create({
      data: {
        tenantId: tenant.id,
        membershipId: emp1Membership.id,
        employeeId: "EMP-01",
        designation: "Senior Architect",
        department: "Architecture",
        phone: "+91 98201 22002",
        joinDate: new Date("2025-02-01"),
      },
    });
  }

  // 4. Employee 2: Kavita Sharma (Interior Designer)
  let emp2User = await prisma.user.findUnique({
    where: { email: "kavita@100percentdesign.in" },
  });

  if (!emp2User) {
    emp2User = await prisma.user.create({
      data: {
        email: "kavita@100percentdesign.in",
        passwordHash,
        fullName: "Kavita Sharma",
        accountState: UserAccountState.ACTIVE,
      },
    });
  } else {
    await prisma.user.update({
      where: { id: emp2User.id },
      data: { passwordHash, accountState: UserAccountState.ACTIVE },
    });
  }

  let emp2Membership = await prisma.tenantMembership.findFirst({
    where: { tenantId: tenant.id, userId: emp2User.id },
  });

  if (!emp2Membership) {
    emp2Membership = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: emp2User.id,
        role: TenantRole.EMPLOYEE,
        hasFinanceAccess: false,
        isActive: true,
      },
    });
  } else {
    await prisma.tenantMembership.update({
      where: { id: emp2Membership.id },
      data: { role: TenantRole.EMPLOYEE, isActive: true },
    });
  }

  let emp2 = await prisma.employee.findFirst({
    where: { tenantId: tenant.id, membershipId: emp2Membership.id },
  });

  if (!emp2) {
    emp2 = await prisma.employee.create({
      data: {
        tenantId: tenant.id,
        membershipId: emp2Membership.id,
        employeeId: "EMP-02",
        designation: "Interior Designer",
        department: "Interior Design",
        phone: "+91 98201 33003",
        joinDate: new Date("2025-03-01"),
      },
    });
  }

  // 5. Studio Leave Policy
  await prisma.studioLeavePolicy.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      defaultMonthlyPaidDays: new Decimal(2.0),
      shortNoticeHours: 24,
      shortNoticeMode: "FLAG",
      exemptLeaveTypes: ["SICK", "EMERGENCY"],
      workingMinutesPerDay: 480,
      officeStartTime: "10:30",
      officeEndTime: "18:30",
    },
    update: {
      defaultMonthlyPaidDays: new Decimal(2.0),
      shortNoticeMode: "FLAG",
    },
  });

  // 6. Employee Compensation Records
  await prisma.studioEmployeeCompensation.deleteMany({
    where: { tenantId: tenant.id },
  });

  await prisma.studioEmployeeCompensation.createMany({
    data: [
      {
        tenantId: tenant.id,
        employeeId: emp1.id,
        effectiveFrom: new Date("2026-01-01"),
        baseMonthlySalary: new Decimal(65000),
        rateCalculationMode: "FIXED_30",
        bankName: "HDFC Bank",
        accountHolderName: "Arjun Mehta",
        accountNumber: "001234567890", // String safe leading zero
        ifscCode: "HDFC0001234",
        upiId: "arjun@hdfcbank",
        panNumber: "ABCDE1234F",
        isCurrent: true,
      },
      {
        tenantId: tenant.id,
        employeeId: emp2.id,
        effectiveFrom: new Date("2026-01-01"),
        baseMonthlySalary: new Decimal(50000),
        rateCalculationMode: "CALENDAR_DAYS",
        bankName: "ICICI Bank",
        accountHolderName: "Kavita Sharma",
        accountNumber: "009876543210", // String safe leading zero
        ifscCode: "ICIC0005678",
        upiId: "kavita@icici",
        panNumber: "FGHIJ5678K",
        isCurrent: true,
      },
    ],
  });

  // 7. Salary Advance & Loan Records
  await prisma.studioAdvanceLoan.deleteMany({
    where: { tenantId: tenant.id },
  });

  await prisma.studioAdvanceLoan.create({
    data: {
      tenantId: tenant.id,
      employeeId: emp1.id,
      type: "ADVANCE",
      principalAmount: new Decimal(15000),
      monthlyRecoveryAmount: new Decimal(5000),
      recoveredAmount: new Decimal(5000),
      balanceAmount: new Decimal(10000),
      disbursedDate: new Date("2026-09-01"),
      status: "ACTIVE",
      approvedById: ownerMembership.id,
      notes: "Studio furniture relocation advance; amortizing at ₹5,000/mo.",
    },
  });

  // 8. Studio Leave Requests (Current Month: October 2026)
  await prisma.studioLeaveRequest.deleteMany({
    where: { tenantId: tenant.id },
  });

  await prisma.studioLeaveRequest.createMany({
    data: [
      // Arjun Mehta: 2.0 days approved (consumes his 2.0 paid allowance for October)
      {
        tenantId: tenant.id,
        employeeId: emp1.id,
        employeeNameRaw: "Arjun Mehta",
        employeeEmailRaw: "arjun@100percentdesign.in",
        startDate: new Date("2026-10-05"),
        endDate: new Date("2026-10-06"),
        days: new Decimal(2.0),
        status: "APPROVED",
        leaveType: "CASUAL",
        reason: "Family visit to Jaipur",
        isPaidEligible: true,
        isHalfDay: false,
        isHourly: false,
        isShortNotice: false,
        submittedAt: new Date("2026-09-28T10:00:00Z"),
        reviewedById: ownerMembership.id,
        reviewedAt: new Date("2026-09-29T11:00:00Z"),
        reviewNotes: "Approved by Gaurab",
      },
      // Arjun Mehta: 3.0 days PENDING (once approved, will ALL be Unpaid LOP!)
      {
        tenantId: tenant.id,
        employeeId: emp1.id,
        employeeNameRaw: "Arjun Mehta",
        employeeEmailRaw: "arjun@100percentdesign.in",
        startDate: new Date("2026-10-21"),
        endDate: new Date("2026-10-23"),
        days: new Decimal(3.0),
        status: "PENDING",
        leaveType: "ANNUAL",
        reason: "Personal errands and festival travel",
        isPaidEligible: true,
        isHalfDay: false,
        isHourly: false,
        isShortNotice: false,
        submittedAt: new Date("2026-10-08T09:30:00Z"),
      },
      // Arjun Mehta: 0.25 days (2 hours) hourly leave approved
      {
        tenantId: tenant.id,
        employeeId: emp1.id,
        employeeNameRaw: "Arjun Mehta",
        employeeEmailRaw: "arjun@100percentdesign.in",
        startDate: new Date("2026-10-09"),
        endDate: new Date("2026-10-09"),
        startMinutes: 120, // 2 hours
        totalMinutes: 120,
        days: new Decimal(0.25),
        status: "APPROVED",
        leaveType: "SICK",
        reason: "Dental checkup and medical consultation",
        isPaidEligible: true,
        isHalfDay: false,
        isHourly: true,
        isShortNotice: false,
        submittedAt: new Date("2026-10-08T14:00:00Z"),
        reviewedById: ownerMembership.id,
        reviewedAt: new Date("2026-10-08T15:00:00Z"),
      },
      // Kavita Sharma: 5.0 days APPROVED (2.0 Paid, 3.0 Unpaid LOP!)
      {
        tenantId: tenant.id,
        employeeId: emp2.id,
        employeeNameRaw: "Kavita Sharma",
        employeeEmailRaw: "kavita@100percentdesign.in",
        startDate: new Date("2026-10-08"),
        endDate: new Date("2026-10-12"),
        days: new Decimal(5.0),
        status: "APPROVED",
        leaveType: "CASUAL",
        reason: "Sister's wedding in Chandigarh",
        isPaidEligible: true,
        isHalfDay: false,
        isHourly: false,
        isShortNotice: false,
        submittedAt: new Date("2026-09-25T11:00:00Z"),
        reviewedById: ownerMembership.id,
        reviewedAt: new Date("2026-09-26T12:00:00Z"),
        reviewNotes: "Approved; exceeds monthly quota by 3.0 days resulting in LOP deduction.",
      },
      // Kavita Sharma: Short notice pending request
      {
        tenantId: tenant.id,
        employeeId: emp2.id,
        employeeNameRaw: "Kavita Sharma",
        employeeEmailRaw: "kavita@100percentdesign.in",
        startDate: new Date("2026-10-14"),
        endDate: new Date("2026-10-14"),
        days: new Decimal(1.0),
        status: "PENDING",
        leaveType: "CASUAL",
        reason: "Urgent apartment plumbing repair",
        isPaidEligible: true,
        isHalfDay: false,
        isHourly: false,
        isShortNotice: true,
        submittedAt: new Date("2026-10-13T20:00:00Z"), // Submitted less than 24h before
      },
    ],
  });

  // 9. Studio Attendance Records
  await prisma.studioAttendanceRecord.deleteMany({
    where: { tenantId: tenant.id },
  });

  await prisma.studioAttendanceRecord.createMany({
    data: [
      {
        tenantId: tenant.id,
        employeeId: emp1.id,
        date: new Date("2026-10-10"),
        punchIn: new Date("2026-10-10T10:25:00Z"),
        punchOut: new Date("2026-10-10T18:35:00Z"),
        totalMinutes: 490,
        status: "PRESENT",
      },
      {
        tenantId: tenant.id,
        employeeId: emp1.id,
        date: new Date("2026-10-09"),
        punchIn: new Date("2026-10-09T10:28:00Z"),
        punchOut: new Date("2026-10-09T18:30:00Z"),
        totalMinutes: 482,
        status: "PRESENT",
      },
      {
        tenantId: tenant.id,
        employeeId: emp2.id,
        date: new Date("2026-10-10"),
        punchIn: new Date("2026-10-10T10:32:00Z"),
        punchOut: null,
        totalMinutes: null,
        status: "MISSING_PUNCH",
        correctionReason: "Staff forgot evening punch out; pending review.",
      },
      {
        tenantId: tenant.id,
        employeeId: emp2.id,
        date: new Date("2026-10-09"),
        punchIn: new Date("2026-10-09T10:15:00Z"),
        punchOut: new Date("2026-10-09T18:30:00Z"),
        totalMinutes: 495,
        status: "PRESENT",
      },
    ],
  });

  // 10. Executive Tasks
  await prisma.executiveTaskAssignment.deleteMany({
    where: { tenantId: tenant.id },
  });
  await prisma.executiveTaskComment.deleteMany({
    where: { tenantId: tenant.id },
  });
  await prisma.executiveTask.deleteMany({
    where: { tenantId: tenant.id },
  });

  const task1 = await prisma.executiveTask.create({
    data: {
      tenantId: tenant.id,
      title: "Penthouse Villa Drawing Review",
      description: "Review structural column offsets, duct clearance, and master bathroom joinery drawings.",
      category: "Design Review",
      priority: "URGENT",
      status: "IN_PROGRESS",
      startDate: new Date("2026-10-08"),
      dueDate: new Date("2026-10-12"),
      creatorId: ownerMembership.id,
    },
  });

  await prisma.executiveTaskAssignment.create({
    data: {
      tenantId: tenant.id,
      taskId: task1.id,
      assigneeId: ownerMembership.id,
    },
  });

  await prisma.executiveTaskComment.create({
    data: {
      tenantId: tenant.id,
      taskId: task1.id,
      authorId: ownerMembership.id,
      content: "Structural engineer confirmed beam depth at grid B4 is 600mm. Ceiling height unaffected.",
    },
  });

  const task2 = await prisma.executiveTask.create({
    data: {
      tenantId: tenant.id,
      title: "Commercial Tower Façade Detailing",
      description: "Coordinate double-glazed unit (DGU) specifications and wind pressure ratings with façade consultant.",
      category: "Site Work",
      priority: "HIGH",
      status: "TO_DO",
      startDate: new Date("2026-10-10"),
      dueDate: new Date("2026-10-15"),
      creatorId: ownerMembership.id,
    },
  });

  await prisma.executiveTaskAssignment.create({
    data: {
      tenantId: tenant.id,
      taskId: task2.id,
      assigneeId: ownerMembership.id,
    },
  });

  const task3 = await prisma.executiveTask.create({
    data: {
      tenantId: tenant.id,
      title: "Client Presentation - Alibaug Farmhouse",
      description: "Finalize photorealistic exterior 3D renders, landscape pool layout, and material mood board.",
      category: "Client Presentation",
      priority: "HIGH",
      status: "WAITING",
      dueDate: new Date("2026-10-11"),
      dueTime: "16:30",
      creatorId: ownerMembership.id,
    },
  });

  await prisma.executiveTaskAssignment.create({
    data: {
      tenantId: tenant.id,
      taskId: task3.id,
      assigneeId: ownerMembership.id,
    },
  });

  const task4 = await prisma.executiveTask.create({
    data: {
      tenantId: tenant.id,
      title: "Material Specifications Sign-off",
      description: "Finalized Italian marble procurement schedule and smoked oak veneer samples.",
      category: "Admin",
      priority: "MEDIUM",
      status: "DONE",
      dueDate: new Date("2026-10-09"),
      completedAt: new Date("2026-10-09T17:00:00Z"),
      creatorId: ownerMembership.id,
    },
  });

  await prisma.executiveTaskAssignment.create({
    data: {
      tenantId: tenant.id,
      taskId: task4.id,
      assigneeId: ownerMembership.id,
    },
  });

  // 11. Studio Meetings & Action Items
  await prisma.studioMeetingActionItem.deleteMany({
    where: { tenantId: tenant.id },
  });
  await prisma.studioMeeting.deleteMany({
    where: { tenantId: tenant.id },
  });

  const meeting1 = await prisma.studioMeeting.create({
    data: {
      tenantId: tenant.id,
      title: "Design Review & Client Presentation Prep",
      meetingDate: new Date("2026-10-09"),
      startTime: "11:00",
      endTime: "12:30",
      meetingType: "Design Review",
      status: "COMPLETED",
      agenda: "Review penthouse 3D visual renders and interior joinery specifications.",
      notes: "Selected Statuario marble for double-height foyer. Approved recessed cove lighting details.",
      decisions: "Agreed on smoked oak veneer for master suite. Client sign-off meeting fixed for Saturday.",
      creatorId: ownerMembership.id,
    },
  });

  // Action items for meeting 1 (one PENDING ready for 1-click conversion to Task!)
  await prisma.studioMeetingActionItem.create({
    data: {
      tenantId: tenant.id,
      meetingId: meeting1.id,
      description: "Revise master bath cove lighting layout and coordinate driver locations",
      assigneeId: ownerMembership.id,
      dueDate: new Date("2026-10-13"),
      status: "PENDING",
    },
  });

  await prisma.studioMeetingActionItem.create({
    data: {
      tenantId: tenant.id,
      meetingId: meeting1.id,
      description: "Finalize Italian marble vendor contract and delivery schedule",
      assigneeId: ownerMembership.id,
      dueDate: new Date("2026-10-11"),
      status: "CONVERTED_TO_TASK",
      convertedTaskId: task4.id,
    },
  });

  const meeting2 = await prisma.studioMeeting.create({
    data: {
      tenantId: tenant.id,
      title: "Site Coordination - Worli Highrise",
      meetingDate: new Date("2026-10-12"),
      startTime: "14:00",
      endTime: "15:30",
      meetingType: "Site Coordination",
      status: "SCHEDULED",
      agenda: "Inspect MEP shafts and HVAC ducting clearance on 14th floor.",
      creatorId: ownerMembership.id,
    },
  });

  // 12. Studio Vendors & CRM Directory
  await prisma.studioVendor.deleteMany({
    where: { tenantId: tenant.id },
  });

  await prisma.studioVendor.createMany({
    data: [
      {
        tenantId: tenant.id,
        name: "Rajesh Shah",
        companyName: "Royal Italian Marbles Pvt Ltd",
        designation: "Managing Director",
        industryType: "Marble & Granite",
        phoneNumber: "+91 98200 11223",
        email: "rajesh@royalmarbles.in",
        websiteUrl: "https://royalmarbles.example.com",
        status: "PARTNERED",
        rating: 5,
        purposeOfVisit: "Supplied Statuario and Botticino marble for penthouse project.",
        notes: "Offers 12% studio architect discount. Direct import from Carrara, Italy. 30 days lead time.",
        followupDate: new Date("2026-10-28"),
      },
      {
        tenantId: tenant.id,
        name: "Anita Sen",
        companyName: "Lumina Illumination Labs",
        designation: "Technical Sales Lead",
        industryType: "Architectural Lighting",
        phoneNumber: "+91 98199 44556",
        email: "anita@lumina.in",
        websiteUrl: "https://lumina.example.com",
        status: "ACTIVE",
        rating: 4,
        purposeOfVisit: "Delivered samples of 2700K warm dimmable COB ceiling fixtures.",
        notes: "Samples approved by design team. Need final quote for 85 architectural fixtures.",
        followupDate: new Date("2026-10-25"),
      },
      {
        tenantId: tenant.id,
        name: "Vikram Patel",
        companyName: "Urban Timber & Smoked Veneers",
        designation: "Procurement Specialist",
        industryType: "Carpentry & Joinery",
        phoneNumber: "+91 98333 77889",
        email: "vikram@urbantimber.in",
        websiteUrl: "https://urbantimber.example.com",
        status: "FOLLOW_UP",
        rating: 4,
        purposeOfVisit: "Discussed smoked oak veneers for wardrobe paneling and acoustic slatted wall.",
        notes: "Awaiting batch color consistency certificate before placing bulk order.",
        followupDate: new Date("2026-10-18"),
      },
    ],
  });

  console.log("✅ Realistic dummy data successfully seeded!");
  console.log("=================================================================");
  console.log("WORKSPACE:   100% DESIGN Studio (slug: 100percentdesign)");
  console.log("LOGIN URL:   http://localhost:3000/w/100percentdesign/login");
  console.log("-----------------------------------------------------------------");
  console.log("OWNER CREDENTIALS (Full Access to All Modules):");
  console.log("  Login ID:  designsaksham1@gmail.com   (or EMP-001)");
  console.log("  Password:  Saksham@2003");
  console.log("-----------------------------------------------------------------");
  console.log("EMPLOYEE CREDENTIALS (Strictly Restricted Access):");
  console.log("  Login ID:  arjun@100percentdesign.in  (or EMP-01)");
  console.log("  Password:  Saksham@2003");
  console.log("=================================================================");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
