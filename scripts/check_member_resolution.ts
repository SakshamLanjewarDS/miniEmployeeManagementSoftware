import { parseCsv } from "../src/server/modules/csv/csv-parser";
import { prisma } from "../src/server/db/prisma";

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
  const rows = parseCsv(rawCsv);
  const memberships = await prisma.tenantMembership.findMany({
    include: { user: true, employee: true },
  });

  const memberNames = memberships.map(m => ({ id: m.id, name: m.user.fullName }));

  function findMember(q: string) {
    if (!q || !q.trim()) return null;
    const clean = q.trim().toLowerCase();
    const found = memberships.find(m => {
      const fn = m.user.fullName.toLowerCase();
      return fn === clean || fn.includes(clean) || clean.includes(fn);
    });
    return found ? { id: found.id, name: found.user.fullName } : null;
  }

  const arch1Set = new Set<string>();
  const arch2Set = new Set<string>();
  const coordSet = new Set<string>();
  const typSet = new Set<string>();

  for (const r of rows) {
    if (r["Project Architect 1"]) arch1Set.add(r["Project Architect 1"].trim());
    if (r["Project Architect 2"]) arch2Set.add(r["Project Architect 2"].trim());
    if (r["Project Cordinator"]) coordSet.add(r["Project Cordinator"].trim());
    if (r["Typology"]) typSet.add(r["Typology"].trim());
  }

  console.log("Typologies:", Array.from(typSet));
  console.log("\nProject Architect 1 resolution:");
  for (const a of arch1Set) {
    console.log(`- "${a}" ->`, findMember(a)?.name || "NOT FOUND");
  }

  console.log("\nProject Architect 2 resolution:");
  for (const a of arch2Set) {
    console.log(`- "${a}" ->`, findMember(a)?.name || "NOT FOUND");
  }

  console.log("\nCoordinator resolution:");
  for (const c of coordSet) {
    console.log(`- "${c}" ->`, findMember(c)?.name || "NOT FOUND");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
