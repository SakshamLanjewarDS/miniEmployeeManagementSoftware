import { prisma } from "../src/server/db/prisma";
import { parseCsv } from "../src/server/modules/csv/csv-parser";
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

const rawCsv = `Projet Code,Project name,Client Name,Typology,Project Architect 1,Project Architect 2,Project Cordinator,Project Contractor,Project Consultant,Site Address,Site City,Google map location,Start Date,End Date,Plot Area,Total Construction Area,Budget,Brief Project Brief,
,,,,,,,,,,,,,,,,,,
, Taywade Residence,Shantanu Taywade,Private Bunglow,Apoorva,,Soham,,,"13, Pawan Bhumi Rd, Pawan Bhumi, Narendra Nagar, Society, Nagpur, Maharashtra 440025",Nagpur,,,,,,,,
,Neuron Hospital,"Pramod Giri , Chandrashekhar pakmode",Hospital,Apoorva,Vedant,Santosh,,,"Milestone Building, Wardha Rd, Lokmat Square, Dhantoli, Nagpur, Maharashtra 440012",Nagpur,,,,,,,,
,Yash Sampada,Tukaram Kanade,Hospital,Apoorva,,Santosh,,,Netaji phool market,Nagpur,,,,,,,,
,Raghav Health Star,Sanjay Paidlewar,Hospital,Apoorva,,,,,"43MF+JQG, Ramdaspeth, Nagpur, Maharashtra 440010",Nagpur,,,,,,,,
,Bidwai Hospital, Bidwai ,Hospital,Apoorva,Anshul,,,,,Nagpur,,,,,,,,
,Kochhar Hospital,Kochhar,Hospital,Apoorva,,Santosh,,,"Shastri Nagar, Tumsar, Maharashtra 441912",Tumsar,,,,,,,,
,Delta Hospital,Amol Kadu,Hospital,Apoorva,,Santosh,,,"103, Hingna Rd, Nagpur, Maharashtra 440036",Nagpur,,,,,,,,
,SVMM,Kamal Bhutada,Hospital,Apoorva,,,,,"C/O, 23V2+7G Swami Vivekanand Medical Mission, Parsodi, Khapri, Khapri, Nagpur, Maharashtra 441108",Nagpur,,,,,,,,
,Service Appartment,Vivek Husukale,Commercial,Apoorva,,Santosh,,,"33CF+JHX Besa Pipla, Maharashtra",Nagpur,,,,,,,,
,Tirpude Godown,Vanita Tirpude ,Commercial,Apoorva,,Santosh,,,"A-11, near police station, MIDC, Hingna, Nagpur, Maharashtra 440028",Nagpur,,,,,,,,
,Royal Palazzo,Oasis Intercontinental,Flat Scheme,Apoorva,,Soham,,,"33JP+84 Besa Pipla, Maharashtra",Nagpur,,,,,,,,
,YCMOU college,YCMOU,Institutional,Vedant,Prutha,,,,,Wardha,,,,,,,,
,Bajaj Hospital,Aditya Bajaj,Hospital,Vedant,,Vedant,,,,,,,,,,,,
,Avanti Hospital,Mahurkar,Hospital,Vedant,,,,,,,,,,,,,,
,Swarajyam Multispeciality and Cancer Hospital,Chandrasekhar Bande,Hospital,Vedant,Apoorva,Santosh,,,,,,,,,,,,
,Mankapur Hospital,Jujharwala,Hospital,Vedant,,,,,,,,,,,,,,
,Nistha,"GMC, Nagpur",PWD,Vedant,,,,,,,,,,,,,,
,OT-PT,"GMC, Nagpur",PWD,Vedant,,,,,,,,,,,,,,
,Canteen,"GMC, Nagpur",PWD,Vedant,,,,,,,,,,,,,,
,Emergency Department,"GMC, Nagpur",PWD,Vedant,,,,,,,,,,,,,,
,GMC multispeciality Hospital,"GMC, Nagpur",PWD,Vedant,,,,,,,,,,,,,,
,Health Department Office,"Matakacheri, Nagpur",PWD,Vedant,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,Lende Hospital,Prajktam Lende,Hospital,,,,,,Near Dighori Square,Nagpur,,,,,,,,
,Wagharalkar Hospital,"Ranjana Waghralkar, Mandar Waghralkar",Hospital,Aishwarya,,,,,"Waghralkar Hospital & Research Institute, Prashant Nagar, Samarth Nagar East, Nagpur, Maharashtra",Nagpur,,,,,,,,
,Tirpude Hospital,Yugantar Education Society,Hospital,Aishwarya,,,,,"Smt. Nimunabai Tirpude Hospital & Research Centre, Kamptee Road, Chalks Colony, New Indora, Nagpur, Maharashtra",Nagpur,,,,,,,,
,Tirpude Auditorium ,Yugantar Education Society,Institutional,Vaishnavi,,,,,"Tirpude College Of Social Works, Tirpude Marg, Civil Lines, Nagpur, Maharashtra",Nagpur,,,,,,,,
,Vedcare Hospital,"M/S Vedcare Hospitals PVT. LTD. 
",Hospital,,,,,,"Near Wardha Road, Lendra",Nagpur,,,,,,,,
,Susatkar Hospital,Vivek Susatkar,Hospital,Aishwarya,,,,,Amravati,Amravati,,,,,,,,
,JL Chaturvedi college,Lokmanya Tilak Jankalyan Shikshan Sanstha,Institutional,Aishwarya,,,,,"JL Chaturvedi College Of Engineering, New Nandanvan Layout, Nandanvan, Nagpur, Maharashtra",Nagpur,,,,,,,,
,Priyadarshini Nagpur Public School,Lokmanya Tilak Jankalyan Shikshan Sanstha,Institutional,Aishwarya,,,,,"Priyadarshini Nagpur Public School, Bhandara Rd, Old Bagadganj, Nagpur, Maharashtra",Nagpur,,,,,,,,
,Leelatai Kulkarni Memorial Hospital & Research Center,Aashay Kekatpure,Hospital,Aishwarya,,,,,"Leelatai Kulkarni Memorial Hospital & Research Center, Pande Layout, New Sneh Nagar, Nagpur, Maharashtra",Nagpur,,,,,,,,
,Sibal Office Building,Amrit Singh Sibal,Commercial,Aishwarya,,,,,"SIBAL TYRES & SPARE PARTS, Hingna Road, opposite Metro Piler No 82, Hingna Naka, Digdoh, Maharashtra",Nagpur,,,,,,,,
,Nikhare Residence,"Yogesh Nikhare, Dhanshweta Nikhare",Private Bunglow,Aishwarya,Bhavika,,,,"Plot no. 108, Kh. No. 145, Ph. No. 11, City survey no. 401, Sheet No. 634/97, Corporation House No. 3092/A/108, in Layout of M/s Kale Land Developers & Builders, Mouza- Nara, Tah. & Dist- Nagpur",Nagpur,,,,,,,,
,Borkar Residence,"Sandeep Borkar, Bharati Borkar",Private Bunglow,Aishwarya,,,,,"Plot No. 18, Kh.NO. 23&24, Mouza- Wanadongri, Narmada Vihar-4, Nagpur",Nagpur,,,,,,,,
,Pranav - 4 Apartment,Earthcraft Builders,Re-Development,Vaishnavi,Aishwarya,,,,"Pranav 4 Apartment, Amar Trupti Nagar, Malviya Nagar, New Sneh Nagar, Nagpur, Maharashtra",Nagpur,,,,,,,,
,Balaji Apartment,Earthcraft Builders,Re-Development,Aishwarya,Vaishnavi,,,,"Balaji Apartment, Amar Trupti Nagar, Malviya Nagar, New Sneh Nagar, Nagpur, Maharashtra",Nagpur,,,,,,,,
,Shakti - Vijay Apartment,Earthcraft Builders,Re-Development,Aishwarya,Vaishnavi,,,,"Shakti Vijay Apartment, Khamla Road, Pande Layout, New Sneh Nagar, Nagpur, Maharashtra",Nagpur,,,,,,,,
,Pushpanjali Apartment,Earthcraft Builders,Re-Development,Aishwarya,Vaishnavi,,,,"Pushpanjali apartment, Pande Layout, New Sneh Nagar, Nagpur, Maharashtra",Nagpur,,,,,,,,
,Utkarsh Umang Apartment,Oasis Intercontinental,Re-Development,Aishwarya,,,,,"Utkarsh Umang Apartments, Wardha Road, Prashant Nagar, Samarth Nagar East, Nagpur, Maharashtra",Nagpur,,,,,,,,
,Ketan Apartment,Oasis Intercontinental,Re-Development,Vedant,Aishwarya,,,,,Nagpur,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,Kadu Residence,Rohit kadu,Private Bunglow,Vaishnavi,Kajal,,,,,,,,,,,,,
,Paras Pipe Office,,Commercial,Vaishnavi,kajal,,,,,,,,,,,,,
,Mansar,Gaikwad Patil group,Commercial,Vaishnavi,,,,,,,,,,,,,,
,Saraf Bungalow,Rutam Saraf,Private Bunglow,Vaishnavi,,,,,,,,,,,,,,
,Krims Hospital,Ketki Arbat,Hospital,Vaishnavi,,,,,,,,,,,,,,
,Madan Eye Hospital,Ashok Madan,Hospital,Vaishnavi,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,Shamkhule flat,Pallavi Shamkhule,Flat Interiors,Sapna,Kajal,,,,,Nagupr,,,,,,,,
,Parate Residence,Parate,Private Bunglow,Prutha,Kajal,,,,,Nagpur,,,,,,,,
,Tarale Flat,Tarale,Flat Interiors,Sapna,Kajal,,,,,Nagpur,,,,,,,,
,Ambulkar Hospital,Ambulkar,Hospital,Sapna,Kajal,,,,,Nagpur,,,,,,,,
,Ghokhe Devdatta,Ghokhe ,Flat Interiors,Sapna,,,,,,,,,,,,,,
,Dilip Aswani,Aswani,Flat Interiors,Sapna,,,,,,,,,,,,,,
,Abhijeet Gaan,Gaan,Flat Interiors,Sapna,,,,,,,,,,,,,,
,Rajesh Gandhi,Gandhi,Flat Interiors,Sapna,,,,,,,,,,,,,,
,Talankar,Talankar,Flat Interiors,Sapna,,,,,,,,,,,,,,
,Zamad Clinic,Mohit Zamad,Private Bunglow,Sapna,Soham,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,Podar School,Prachi Thakre,Institutional,Prutha,Vedant,,,,,Warud,,,,,,,,
,Podar International school,Pankaj Bhoyar,Institutional,Prutha,,,,,"Nandgaon, mouza no-92, Tah- Hinganghat, Dist. Bhandara",Hinganghat,,,,,,,,
,Tirpude School,Vanita Tirpude,Institutional,Prutha,,,,,,Nagpur,,,,,,,,
,Posh logistics Landscape,Sachin Porshettiwar,Commercial,Prutha,,,,,"Gala No 1 to 12, Besides Bharat Benz,Mouza Gondkhairi, Tal- Kalmeshwar - Gondkhairi Rd, Nagpur, Maharashtra 440023",Gondkhairi,,,,,,,,
,Ajni Flat Scheme,Satish Bhoyar,Re-Development,Prutha,Aishwarya,,,,,Nagpur,,,,,,,,
,Dr. Giri Farmhouse,Pramod Giri,Private Bunglow,Prutha,,,,,,Gondkhairi,,,,,,,,
,Shataayu Hospital,Bharat Ganvir,Hospital,Prutha,,,,,"Shanti Nagar, Delanwadi, Ward, Brahmapuri, Maharashtra 441206",Brahmpuri,,,,,,,,
`;

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: "100percentdesign" },
  });
  if (!tenant) throw new Error("Tenant 100percentdesign not found");

  const memberships = await prisma.tenantMembership.findMany({
    where: { tenantId: tenant.id },
    include: { user: true, employee: true },
  });

  const findMemberId = (query: string | undefined): string | undefined => {
    if (!query || !query.trim()) return undefined;
    const q = query.trim().toLowerCase();
    const found = memberships.find((m) => {
      const fn = m.user.fullName.toLowerCase();
      const em = m.user.email.toLowerCase();
      const empId = m.employee?.employeeId?.toLowerCase() || "";
      return fn === q || fn.includes(q) || q.includes(fn) || em === q || empId === q;
    });
    return found?.id;
  };

  const rows = parseCsv(rawCsv);
  console.log(`Processing ${rows.length} CSV rows...`);

  let updatedCount = 0;
  let createdCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = (row["Project name"] || "").trim();
    if (!name) continue;

    const typology = (row["Typology"] || "").trim() || "Residential Architecture";
    const clientName = (row["Client Name"] || "").trim();
    const arch1Name = (row["Project Architect 1"] || "").trim();
    const arch2Name = (row["Project Architect 2"] || "").trim();
    const coordName = (row["Project Cordinator"] || "").trim();
    const contractorName = (row["Project Contractor"] || "").trim();
    const consultantName = (row["Project Consultant"] || "").trim();
    const siteAddress = (row["Site Address"] || "").trim();
    const siteCity = (row["Site City"] || "").trim();
    const googleMapLocation = (row["Google map location"] || "").trim();
    const plotArea = (row["Plot Area"] || "").trim();
    const constructionArea = (row["Total Construction Area"] || "").trim();
    const budgetRaw = (row["Budget"] || "").trim();
    const brief = (row["Brief Project Brief"] || "").trim();

    // Resolve client
    let primaryClientId: string | undefined = undefined;
    if (clientName) {
      let client = await prisma.client.findFirst({
        where: {
          tenantId: tenant.id,
          OR: [
            { name: { contains: clientName } },
            { company: { contains: clientName } },
          ],
        },
      });
      if (!client) {
        client = await prisma.client.create({
          data: {
            tenantId: tenant.id,
            name: clientName,
            isActive: true,
            notes: `Auto-registered via project "${name}" CSV import`,
          },
        });
      }
      primaryClientId = client.id;
    }

    // Resolve members
    const projectArchitectId = findMemberId(arch1Name);
    const projectManagerId = findMemberId(arch2Name);
    const projectCoordinatorId = findMemberId(coordName);

    // Resolve contractor
    let contractorId: string | undefined = undefined;
    if (contractorName) {
      let cont = await prisma.contractor.findFirst({
        where: {
          tenantId: tenant.id,
          OR: [
            { name: { contains: contractorName } },
            { firmName: { contains: contractorName } },
          ],
        },
      });
      if (!cont) {
        cont = await prisma.contractor.create({
          data: {
            tenantId: tenant.id,
            name: contractorName,
            firmName: contractorName,
            trade: "General Contractor",
            isActive: true,
          },
        });
      }
      contractorId = cont.id;
    }

    // Resolve consultant
    let consultantId: string | undefined = undefined;
    if (consultantName) {
      let cons = await prisma.consultant.findFirst({
        where: {
          tenantId: tenant.id,
          OR: [
            { name: { contains: consultantName } },
            { firmName: { contains: consultantName } },
          ],
        },
      });
      if (!cons) {
        cons = await prisma.consultant.create({
          data: {
            tenantId: tenant.id,
            name: consultantName,
            firmName: consultantName,
            discipline: "Architectural Consultant",
            isActive: true,
          },
        });
      }
      consultantId = cons.id;
    }

    let budget: number | undefined = undefined;
    if (budgetRaw) {
      const cleanB = Number(budgetRaw.replace(/[^0-9.]/g, ""));
      if (!isNaN(cleanB) && cleanB > 0) budget = cleanB;
    }

    // Check if project exists by name
    const existing = await prisma.project.findFirst({
      where: {
        tenantId: tenant.id,
        name: { equals: name },
      },
      include: {
        _count: { select: { tasks: true } },
      },
    });

    if (existing) {
      // UPDATE in place! (Preserves existing ID and all existing task relationships!)
      await prisma.project.update({
        where: { id: existing.id },
        data: {
          projectType: typology,
          primaryClientId: primaryClientId || existing.primaryClientId,
          projectArchitectId: projectArchitectId !== undefined ? projectArchitectId : existing.projectArchitectId,
          projectManagerId: projectManagerId !== undefined ? projectManagerId : existing.projectManagerId,
          projectCoordinatorId: projectCoordinatorId !== undefined ? projectCoordinatorId : existing.projectCoordinatorId,
          contractorId: contractorId !== undefined ? contractorId : existing.contractorId,
          consultantId: consultantId !== undefined ? consultantId : existing.consultantId,
          siteAddress: siteAddress || existing.siteAddress,
          siteCity: siteCity || existing.siteCity,
          googleMapLocation: googleMapLocation || existing.googleMapLocation,
          plotArea: plotArea || existing.plotArea,
          constructionArea: constructionArea || existing.constructionArea,
          budget: budget !== undefined ? budget : existing.budget,
          description: brief || existing.description,
        },
      });
      updatedCount++;
      console.log(`[UPDATE] ${existing.code} "${name}" [Typology: ${typology}] (Tasks preserved: ${existing._count.tasks})`);
    } else {
      // CREATE new project with next sequential code!
      const nextCode = await getNextProjectCode(tenant.id);
      const newProj = await prisma.project.create({
        data: {
          tenantId: tenant.id,
          code: nextCode,
          name: name,
          projectType: typology,
          primaryClientId,
          projectArchitectId,
          projectManagerId,
          projectCoordinatorId,
          contractorId,
          consultantId,
          siteAddress: siteAddress || undefined,
          siteCity: siteCity || undefined,
          googleMapLocation: googleMapLocation || undefined,
          plotArea: plotArea || undefined,
          constructionArea: constructionArea || undefined,
          budget,
          description: brief || undefined,
          status: "ACTIVE",
          currentPhase: "Brief",
          phases: {
            create: [
              { tenantId: tenant.id, phaseName: "Brief", sortOrder: 1, status: "IN_PROGRESS" },
              { tenantId: tenant.id, phaseName: "Site Survey", sortOrder: 2, status: "NOT_STARTED" },
              { tenantId: tenant.id, phaseName: "Concept", sortOrder: 3, status: "NOT_STARTED" },
              { tenantId: tenant.id, phaseName: "Space Planning", sortOrder: 4, status: "NOT_STARTED" },
              { tenantId: tenant.id, phaseName: "Detailed Design", sortOrder: 5, status: "NOT_STARTED" },
              { tenantId: tenant.id, phaseName: "3D Visualization", sortOrder: 6, status: "NOT_STARTED" },
              { tenantId: tenant.id, phaseName: "Working Drawings", sortOrder: 7, status: "NOT_STARTED" },
              { tenantId: tenant.id, phaseName: "BOQ & Tendering", sortOrder: 8, status: "NOT_STARTED" },
              { tenantId: tenant.id, phaseName: "Approvals & Sanctioning", sortOrder: 9, status: "NOT_STARTED" },
              { tenantId: tenant.id, phaseName: "Execution", sortOrder: 10, status: "NOT_STARTED" },
              { tenantId: tenant.id, phaseName: "Handover", sortOrder: 11, status: "NOT_STARTED" },
            ],
          },
        },
      });
      createdCount++;
      console.log(`[CREATE] ${newProj.code} "${name}" [Typology: ${typology}]`);
    }
  }

  console.log(`\nCOMPLETED SUCCESSFULLY! Updated: ${updatedCount}, Created: ${createdCount}`);

  // Verification: Verify all tasks and their project references
  const allTasks = await prisma.task.findMany({
    where: { tenantId: tenant.id },
    select: {
      id: true,
      title: true,
      project: { select: { id: true, code: true, name: true, projectType: true } },
    },
  });
  console.log(`\nVerified Tasks count: ${allTasks.length}`);
  for (const t of allTasks) {
    console.log(`- Task "${t.title}" -> Project: ${t.project.code} "${t.project.name}" [Typology: ${t.project.projectType}]`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
