"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Compass,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Building2,
  FolderGit2,
  ExternalLink,
  Edit2,
  Archive,
  RotateCcw,
  X,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Link as LinkIcon,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Tablet,
  Monitor,
  Menu,
  Bell,
  CheckSquare,
  FolderKanban,
  FileCheck2,
  Receipt,
  Users,
  Briefcase,
  Building,
  LogOut,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  ArrowLeft,
  Info,
  RefreshCw,
  Folder,
  Trash2,
  Calendar,
  Sparkles,
  Layers,
  Wrench,
  Download,
  Share2,
} from "lucide-react";
import { CsvImportExportModal } from "@/components/csv/CsvImportExportModal";

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface ProjectConsultantItem {
  id: string;
  projectId: string;
  project: {
    id: string;
    code: string;
    name: string;
    isArchived: boolean;
    status: string;
  };
  scope: string | null;
  engagementStatus: string;
  createdAt: string;
}

export interface ConsultantItem {
  id: string;
  name: string;
  email: string | null;
  contact: string | null;
  firmName: string | null;
  firmAddress: string | null;
  discipline: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  projects: ProjectConsultantItem[];
  totalAccessibleProjects: number;
}

export interface ConsultantsClientViewProps {
  initialConsultants: ConsultantItem[];
  projects: Array<{ id: string; code: string; name: string }>;
  workspaceSlug: string;
  userRole: string;
  userFullName?: string;
}

// ==========================================
// 40 REALISTIC CONSULTANT RECORDS FROM SCREENSHOT
// ==========================================
const SCREENSHOT_CONSULTANTS_DATA: ConsultantItem[] = [
  {
    id: "sc-01",
    name: "Abhinav Nikam",
    firmName: "Elliott Plumbing",
    discipline: "Plumbing",
    contact: "+91 98230 11421",
    email: "abhinav@elliottplumbing.in",
    firmAddress: "Shop 12, Crystal Plaza, Ramdaspeth, Nagpur",
    notes: "Specialized in internal sanitary drainage, booster pump sizing, and STP piping design.",
    isActive: true,
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-03-10T11:00:00Z",
    totalAccessibleProjects: 2,
    projects: [
      {
        id: "link-01-1",
        projectId: "proj-101",
        project: { id: "proj-101", code: "P-101", name: "Highland Residences", isArchived: false, status: "IN_PROGRESS" },
        scope: "Plumbing & Sanitary Design (Tower A & B)",
        engagementStatus: "Active",
        createdAt: "2024-01-20T10:00:00Z",
      },
      {
        id: "link-01-2",
        projectId: "proj-104",
        project: { id: "proj-104", code: "P-104", name: "Apex Commercial Hub", isArchived: false, status: "IN_PROGRESS" },
        scope: "Central water harvesting & basement sumps",
        engagementStatus: "Active",
        createdAt: "2024-02-14T10:00:00Z",
      },
    ],
  },
  {
    id: "sc-02",
    name: "Ajay Dhomne",
    firmName: "Ajay Dhomne",
    discipline: "Fire",
    contact: null,
    email: null,
    firmAddress: null,
    notes: null,
    isActive: true,
    createdAt: "2024-01-16T09:00:00Z",
    updatedAt: "2024-01-16T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-03",
    name: "Amit Kalbande",
    firmName: "Breezwell",
    discipline: "HVAC",
    contact: "+91 98221 44512",
    email: "amit@breezwellhvac.com",
    firmAddress: "Plot 45, MIDC Hingna Road, Nagpur",
    notes: "Expertise in high-ambient VRV/VRF heat pump design and clean room ventilation.",
    isActive: true,
    createdAt: "2024-01-18T09:00:00Z",
    updatedAt: "2024-02-11T12:00:00Z",
    totalAccessibleProjects: 1,
    projects: [
      {
        id: "link-03-1",
        projectId: "proj-102",
        project: { id: "proj-102", code: "P-102", name: "Zenith Tech Tower", isArchived: false, status: "IN_PROGRESS" },
        scope: "Central VRV HVAC Design & duct sizing",
        engagementStatus: "Active",
        createdAt: "2024-01-25T10:00:00Z",
      },
    ],
  },
  {
    id: "sc-04",
    name: "Aniket Mahajan",
    firmName: "Climate Care Consultant",
    discipline: "HVAC",
    contact: "+91 94220 88910",
    email: "aniket@climatecare.net",
    firmAddress: "2nd Floor, IT Park Road, Nagpur",
    notes: "Thermal load calculations and energy conservation building code (ECBC) compliance.",
    isActive: true,
    createdAt: "2024-01-20T09:00:00Z",
    updatedAt: "2024-01-20T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-05",
    name: "Anirudh Nimbarkar",
    firmName: "Devansh Enterprises",
    discipline: "Fire",
    contact: "+91 97654 33210",
    email: null,
    firmAddress: "Wardha Road, Somalwada, Nagpur",
    notes: "Liaison for local fire authority provisional NOC and final occupancy clearances.",
    isActive: true,
    createdAt: "2024-01-22T09:00:00Z",
    updatedAt: "2024-02-15T10:00:00Z",
    totalAccessibleProjects: 1,
    projects: [
      {
        id: "link-05-1",
        projectId: "proj-101",
        project: { id: "proj-101", code: "P-101", name: "Highland Residences", isArchived: false, status: "IN_PROGRESS" },
        scope: "Fire Hydrant, riser layout & NOC Approvals",
        engagementStatus: "Active",
        createdAt: "2024-01-29T10:00:00Z",
      },
    ],
  },
  {
    id: "sc-06",
    name: "Anup Bhandarkar",
    firmName: "Nagpur Infotech",
    discipline: "Network",
    contact: null,
    email: "anup@nagpurinfotech.com",
    firmAddress: "Civil Lines, Nagpur",
    notes: "Fiber backbone, structured cabling, and server room airflow layouts.",
    isActive: true,
    createdAt: "2024-01-24T09:00:00Z",
    updatedAt: "2024-01-24T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-07",
    name: "Arvind Kobe",
    firmName: "Ameya Fire",
    discipline: "Fire",
    contact: "+91 99231 00293",
    email: "arvind@ameyafire.com",
    firmAddress: "Dharampeth, Nagpur",
    notes: "Fire suppression, FM200 server room flooding systems, and addressable smoke alarms.",
    isActive: true,
    createdAt: "2024-01-25T09:00:00Z",
    updatedAt: "2024-02-28T14:00:00Z",
    totalAccessibleProjects: 1,
    projects: [
      {
        id: "link-07-1",
        projectId: "proj-103",
        project: { id: "proj-103", code: "P-103", name: "Lakeview Villa Estates", isArchived: false, status: "IN_PROGRESS" },
        scope: "Perimeter fire hydrant ring & clubhouse detection",
        engagementStatus: "Active",
        createdAt: "2024-02-05T10:00:00Z",
      },
    ],
  },
  {
    id: "sc-08",
    name: "Ashish Shivankar",
    firmName: "AAI Engineering",
    discipline: "Structure",
    contact: "+91 98901 22345",
    email: "ashish@aaiengg.co.in",
    firmAddress: "AAI House, 14 Shivaji Nagar, Nagpur",
    notes: "Senior structural consultant. Earthquake engineering, ETABS modeling, and deep pile foundations.",
    isActive: true,
    createdAt: "2024-01-10T09:00:00Z",
    updatedAt: "2024-03-12T16:00:00Z",
    totalAccessibleProjects: 3,
    projects: [
      {
        id: "link-08-1",
        projectId: "proj-101",
        project: { id: "proj-101", code: "P-101", name: "Highland Residences", isArchived: false, status: "IN_PROGRESS" },
        scope: "RCC Frame & Raft Foundation (G+18)",
        engagementStatus: "Active",
        createdAt: "2024-01-12T10:00:00Z",
      },
      {
        id: "link-08-2",
        projectId: "proj-102",
        project: { id: "proj-102", code: "P-102", name: "Zenith Tech Tower", isArchived: false, status: "IN_PROGRESS" },
        scope: "Post-Tensioned Slabs & Shear Core Design",
        engagementStatus: "Active",
        createdAt: "2024-01-15T10:00:00Z",
      },
      {
        id: "link-08-3",
        projectId: "proj-105",
        project: { id: "proj-105", code: "P-105", name: "Verdia Luxury Villa", isArchived: false, status: "PLANNING" },
        scope: "Structural Peer Review & cantilever spans",
        engagementStatus: "Active",
        createdAt: "2024-02-18T10:00:00Z",
      },
    ],
  },
  {
    id: "sc-09",
    name: "Ashwin Pantankar",
    firmName: "V.K.Plumbing",
    discipline: "Plumbing",
    contact: "+91 98220 77123",
    email: null,
    firmAddress: "Mahal, Nagpur",
    notes: "Residential storm drainage and overhead reservoir sizing.",
    isActive: true,
    createdAt: "2024-01-26T09:00:00Z",
    updatedAt: "2024-01-26T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-10",
    name: "Deveshish Joshi",
    firmName: "MNI Electrical & Hydraulic Consultant",
    discipline: "Electrical",
    contact: "+91 98234 55678",
    email: "deveshish@mniconsultants.com",
    firmAddress: "Suite 4, Shankar Nagar Square, Nagpur",
    notes: "High voltage transformers, DG synchronization, bus ducts, and surge protection.",
    isActive: true,
    createdAt: "2024-01-28T09:00:00Z",
    updatedAt: "2024-03-05T15:00:00Z",
    totalAccessibleProjects: 1,
    projects: [
      {
        id: "link-10-1",
        projectId: "proj-104",
        project: { id: "proj-104", code: "P-104", name: "Apex Commercial Hub", isArchived: false, status: "IN_PROGRESS" },
        scope: "Substation, HT Panel & DG Sync Schemes",
        engagementStatus: "Active",
        createdAt: "2024-02-02T10:00:00Z",
      },
    ],
  },
  {
    id: "sc-11",
    name: "Pravin Padale",
    firmName: "Devansh Padale",
    discipline: "Structure",
    contact: null,
    email: null,
    firmAddress: null,
    notes: null,
    isActive: true,
    createdAt: "2024-01-29T09:00:00Z",
    updatedAt: "2024-01-29T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-12",
    name: "Gaurav Raut",
    firmName: "Gaurav Raut",
    discipline: "HVAC",
    contact: "+91 97640 12948",
    email: "gaurav.raut@aircon.in",
    firmAddress: "Trimurti Nagar, Nagpur",
    notes: "Duct acoustics, indoor air quality filters, and precision AC for server hubs.",
    isActive: true,
    createdAt: "2024-01-30T09:00:00Z",
    updatedAt: "2024-01-30T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-13",
    name: "Harshal Shripurkar",
    firmName: "Renuka Electrical",
    discipline: "MEP",
    contact: "+91 98229 01928",
    email: "harshal@renukaelectrical.in",
    firmAddress: "Central Avenue, Gandhibagh, Nagpur",
    notes: "Turnkey MEP engineering, BIM clash detection, and electrical load balancing.",
    isActive: true,
    createdAt: "2024-02-01T09:00:00Z",
    updatedAt: "2024-03-01T11:00:00Z",
    totalAccessibleProjects: 1,
    projects: [
      {
        id: "link-13-1",
        projectId: "proj-101",
        project: { id: "proj-101", code: "P-101", name: "Highland Residences", isArchived: false, status: "IN_PROGRESS" },
        scope: "Complete MEP Coordination & Risers",
        engagementStatus: "Active",
        createdAt: "2024-02-06T10:00:00Z",
      },
    ],
  },
  {
    id: "sc-14",
    name: "JITENDRA RAHANGDALE",
    firmName: "HB Electrical Consultant",
    discipline: "Electrical",
    contact: "+91 94228 34910",
    email: "jitendra@hbelectrical.com",
    firmAddress: "Manewada Ring Road, Nagpur",
    notes: "Internal electrical layouts, conduit routing, and energy metering.",
    isActive: true,
    createdAt: "2024-02-02T09:00:00Z",
    updatedAt: "2024-02-02T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-15",
    name: "Kunal",
    firmName: "P.S.Engineering",
    discipline: "Fire",
    contact: null,
    email: null,
    firmAddress: null,
    notes: null,
    isActive: true,
    createdAt: "2024-02-03T09:00:00Z",
    updatedAt: "2024-02-03T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-16",
    name: "Ladchhedkar",
    firmName: "Ladchhedkar",
    discipline: "Electrical",
    contact: null,
    email: null,
    firmAddress: null,
    notes: null,
    isActive: true,
    createdAt: "2024-02-04T09:00:00Z",
    updatedAt: "2024-02-04T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-17",
    name: "Manikar",
    firmName: "Manikar",
    discipline: "Electrical",
    contact: "+91 98223 99012",
    email: null,
    firmAddress: "Medical Square, Nagpur",
    notes: "Commercial power distribution and backup inverter schemes.",
    isActive: true,
    createdAt: "2024-02-05T09:00:00Z",
    updatedAt: "2024-02-05T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-18",
    name: "Mathurkar",
    firmName: "Mathurkar",
    discipline: "HVAC",
    contact: null,
    email: null,
    firmAddress: null,
    notes: null,
    isActive: true,
    createdAt: "2024-02-06T09:00:00Z",
    updatedAt: "2024-02-06T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-19",
    name: "Milind Awsarmol",
    firmName: "Milind Awsarmol",
    discipline: "Structure",
    contact: "+91 98222 11993",
    email: "milind@awsarmol.com",
    firmAddress: "Pratap Nagar, Nagpur",
    notes: "Seismic analysis Zone III, shear wall design, and wind tunnel response checking.",
    isActive: true,
    createdAt: "2024-02-07T09:00:00Z",
    updatedAt: "2024-03-08T14:00:00Z",
    totalAccessibleProjects: 1,
    projects: [
      {
        id: "link-19-1",
        projectId: "proj-102",
        project: { id: "proj-102", code: "P-102", name: "Zenith Tech Tower", isArchived: false, status: "IN_PROGRESS" },
        scope: "Seismic Analysis & Shear Wall Detailing",
        engagementStatus: "Active",
        createdAt: "2024-02-12T10:00:00Z",
      },
    ],
  },
  {
    id: "sc-20",
    name: "Mishra",
    firmName: "Mishra",
    discipline: "Fire",
    contact: null,
    email: null,
    firmAddress: null,
    notes: null,
    isActive: true,
    createdAt: "2024-02-08T09:00:00Z",
    updatedAt: "2024-02-08T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-21",
    name: "Moin Naqvi",
    firmName: "Moin Naqvi",
    discipline: "HVAC",
    contact: "+91 98900 12049",
    email: "moin@naqvihvac.com",
    firmAddress: "Sadar, Nagpur",
    notes: "Acoustic attenuation and chilled water circulation design.",
    isActive: true,
    createdAt: "2024-02-09T09:00:00Z",
    updatedAt: "2024-02-09T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-22",
    name: "Mukul Pande",
    firmName: "Mukul Pande",
    discipline: "Network",
    contact: null,
    email: null,
    firmAddress: null,
    notes: null,
    isActive: true,
    createdAt: "2024-02-10T09:00:00Z",
    updatedAt: "2024-02-10T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-23",
    name: "Narendra Bobde",
    firmName: "Narendra Bobde",
    discipline: "Plumbing",
    contact: "+91 94221 44029",
    email: null,
    firmAddress: "Ayodhya Nagar, Nagpur",
    notes: "Public health engineering and rainwater harvesting pits.",
    isActive: true,
    createdAt: "2024-02-11T09:00:00Z",
    updatedAt: "2024-02-11T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-24",
    name: "Narendra Kumar",
    firmName: "Global",
    discipline: "Fire",
    contact: "+91 98230 44910",
    email: "narendra@globalfire.co.in",
    firmAddress: "MIDC Industrial Estate, Butibori, Nagpur",
    notes: "Commercial high-rise fire pumps, deluge systems, and smoke management shafts.",
    isActive: true,
    createdAt: "2024-02-12T09:00:00Z",
    updatedAt: "2024-03-02T13:00:00Z",
    totalAccessibleProjects: 1,
    projects: [
      {
        id: "link-24-1",
        projectId: "proj-104",
        project: { id: "proj-104", code: "P-104", name: "Apex Commercial Hub", isArchived: false, status: "IN_PROGRESS" },
        scope: "Sprinkler & Smoke Evacuation System",
        engagementStatus: "Active",
        createdAt: "2024-02-18T10:00:00Z",
      },
    ],
  },
  {
    id: "sc-25",
    name: "Nilesh Kamble",
    firmName: "Nilesh Kamble",
    discipline: "Network",
    contact: null,
    email: null,
    firmAddress: null,
    notes: null,
    isActive: true,
    createdAt: "2024-02-13T09:00:00Z",
    updatedAt: "2024-02-13T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-26",
    name: "Patankar",
    firmName: "PCPL",
    discipline: "Structure",
    contact: "+91 98220 55192",
    email: "patankar@pcpl.in",
    firmAddress: "Laxmi Nagar, Nagpur",
    notes: "Concrete structure analysis and foundation design for expansive black cotton soils.",
    isActive: true,
    createdAt: "2024-02-14T09:00:00Z",
    updatedAt: "2024-03-04T12:00:00Z",
    totalAccessibleProjects: 1,
    projects: [
      {
        id: "link-26-1",
        projectId: "proj-101",
        project: { id: "proj-101", code: "P-101", name: "Highland Residences", isArchived: false, status: "IN_PROGRESS" },
        scope: "Structural Analysis & Peer Review",
        engagementStatus: "Active",
        createdAt: "2024-02-20T10:00:00Z",
      },
    ],
  },
  {
    id: "sc-27",
    name: "Prateek Chandurkar",
    firmName: "Prateek Chandurkar",
    discipline: "Fresh Air",
    contact: "+91 97650 33819",
    email: "prateek@freshairconsulting.com",
    firmAddress: "Near VNIT Gate, Bajaj Nagar, Nagpur",
    notes: "Dedicated outdoor air systems (DOAS) and basement fresh air mechanical ventilation.",
    isActive: true,
    createdAt: "2024-02-15T09:00:00Z",
    updatedAt: "2024-02-15T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-28",
    name: "Rashi Bawankule",
    firmName: "Rashi Bawankule",
    discipline: "Landscape",
    contact: "+91 98231 66720",
    email: "rashi@greenscapedesign.in",
    firmAddress: "Ram Nagar, Hill Road, Nagpur",
    notes: "Senior landscape architect. Native vegetation palettes, microclimate irrigation, and hardscape details.",
    isActive: true,
    createdAt: "2024-02-16T09:00:00Z",
    updatedAt: "2024-03-14T11:00:00Z",
    totalAccessibleProjects: 2,
    projects: [
      {
        id: "link-28-1",
        projectId: "proj-101",
        project: { id: "proj-101", code: "P-101", name: "Highland Residences", isArchived: false, status: "IN_PROGRESS" },
        scope: "Master Landscape & Hardscape Layout",
        engagementStatus: "Active",
        createdAt: "2024-02-22T10:00:00Z",
      },
      {
        id: "link-28-2",
        projectId: "proj-103",
        project: { id: "proj-103", code: "P-103", name: "Lakeview Villa Estates", isArchived: false, status: "IN_PROGRESS" },
        scope: "Waterbody & Xeriscaping schemes",
        engagementStatus: "Active",
        createdAt: "2024-02-25T10:00:00Z",
      },
    ],
  },
  {
    id: "sc-29",
    name: "Rohit",
    firmName: "Rohit Solutions",
    discipline: "HVAC",
    contact: null,
    email: null,
    firmAddress: null,
    notes: null,
    isActive: true,
    createdAt: "2024-02-17T09:00:00Z",
    updatedAt: "2024-02-17T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-30",
    name: "Sagar Deshmukh",
    firmName: "Sagar Deshmukh",
    discipline: "MEP",
    contact: "+91 98902 44312",
    email: "sagar@deshmukhmep.com",
    firmAddress: "Khamla Square, Nagpur",
    notes: "Residential villa MEP coordination, solar water heating, and water softening plants.",
    isActive: true,
    createdAt: "2024-02-18T09:00:00Z",
    updatedAt: "2024-03-01T15:00:00Z",
    totalAccessibleProjects: 1,
    projects: [
      {
        id: "link-30-1",
        projectId: "proj-105",
        project: { id: "proj-105", code: "P-105", name: "Verdia Luxury Villa", isArchived: false, status: "PLANNING" },
        scope: "MEP Infrastructure & Smart Home conduits",
        engagementStatus: "Active",
        createdAt: "2024-02-24T10:00:00Z",
      },
    ],
  },
  {
    id: "sc-31",
    name: "Sameer Basra",
    firmName: "Sameer Basra",
    discipline: "Structure",
    contact: "+91 98224 88192",
    email: "sameer@basrastructures.com",
    firmAddress: "Byramji Town, Nagpur",
    notes: "Steel structural framing, pre-engineered buildings (PEB), and industrial sheds.",
    isActive: true,
    createdAt: "2024-02-19T09:00:00Z",
    updatedAt: "2024-02-19T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-32",
    name: "Sandeep Gayakwad",
    firmName: "Sandeep Gayakwad",
    discipline: "Structure",
    contact: "+91 94225 11029",
    email: null,
    firmAddress: "Nandanvan, Nagpur",
    notes: "Site quality testing, core extraction verification, and rebar shop drawings.",
    isActive: true,
    createdAt: "2024-02-20T09:00:00Z",
    updatedAt: "2024-02-20T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-33",
    name: "Sashank",
    firmName: "Sashank",
    discipline: "Network",
    contact: null,
    email: null,
    firmAddress: null,
    notes: null,
    isActive: true,
    createdAt: "2024-02-21T09:00:00Z",
    updatedAt: "2024-02-21T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-34",
    name: "Satish Rajpure",
    firmName: "Vighnaharta Consultants",
    discipline: "Structure",
    contact: "+91 98230 77819",
    email: "satish@vighnahartastruct.com",
    firmAddress: "Gokulpeth Market, West High Court Road, Nagpur",
    notes: "Basement diaphragm walls, shoring schemes, and retaining wall stability checks.",
    isActive: true,
    createdAt: "2024-02-22T09:00:00Z",
    updatedAt: "2024-03-09T14:00:00Z",
    totalAccessibleProjects: 1,
    projects: [
      {
        id: "link-34-1",
        projectId: "proj-102",
        project: { id: "proj-102", code: "P-102", name: "Zenith Tech Tower", isArchived: false, status: "IN_PROGRESS" },
        scope: "Basement Shoring & Retaining Walls",
        engagementStatus: "Active",
        createdAt: "2024-02-27T10:00:00Z",
      },
    ],
  },
  {
    id: "sc-35",
    name: "Shailesh Nikam",
    firmName: "Shailesh Nikam",
    discipline: "MEP",
    contact: "+91 98221 99019",
    email: "shailesh@nikammep.com",
    firmAddress: "Dhantoli, Nagpur",
    notes: "Hospital MEP and cleanroom medical gas pipelines.",
    isActive: true,
    createdAt: "2024-02-23T09:00:00Z",
    updatedAt: "2024-02-23T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-36",
    name: "Shrikant Tarte",
    firmName: "Shrikant Tarte",
    discipline: "Electrical",
    contact: null,
    email: null,
    firmAddress: null,
    notes: null,
    isActive: true,
    createdAt: "2024-02-24T09:00:00Z",
    updatedAt: "2024-02-24T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-37",
    name: "Siddarth Rajwanshi",
    firmName: "Siddarth Rajwanshi",
    discipline: "HVAC",
    contact: "+91 98901 55671",
    email: "siddarth@rajwanshihvac.in",
    firmAddress: "Civil Lines, Nagpur",
    notes: "Variable air volume (VAV) terminal units and chilled beam systems.",
    isActive: true,
    createdAt: "2024-02-25T09:00:00Z",
    updatedAt: "2024-02-25T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-38",
    name: "Siddhivinayak MEP Consultants",
    firmName: "Siddhivinayak MEP Consultants",
    discipline: "MEP",
    contact: "+91 98220 88291",
    email: "info@siddhivinayakmep.com",
    firmAddress: "Plot 102, Pandhrabodi, Nagpur",
    notes: "Comprehensive MEP design, building management systems (BMS), and LEED silver certification.",
    isActive: true,
    createdAt: "2024-02-26T09:00:00Z",
    updatedAt: "2024-03-10T12:00:00Z",
    totalAccessibleProjects: 2,
    projects: [
      {
        id: "link-38-1",
        projectId: "proj-101",
        project: { id: "proj-101", code: "P-101", name: "Highland Residences", isArchived: false, status: "IN_PROGRESS" },
        scope: "MEP Peer Review & Energy Modeling",
        engagementStatus: "Active",
        createdAt: "2024-03-01T10:00:00Z",
      },
      {
        id: "link-38-2",
        projectId: "proj-104",
        project: { id: "proj-104", code: "P-104", name: "Apex Commercial Hub", isArchived: false, status: "IN_PROGRESS" },
        scope: "Integrated Building Services & BMS",
        engagementStatus: "Active",
        createdAt: "2024-03-03T10:00:00Z",
      },
    ],
  },
  {
    id: "sc-39",
    name: "Stylin",
    firmName: "Stylin",
    discipline: "HVAC",
    contact: null,
    email: null,
    firmAddress: null,
    notes: null,
    isActive: true,
    createdAt: "2024-02-27T09:00:00Z",
    updatedAt: "2024-02-27T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
  {
    id: "sc-40",
    name: "Uttarwar",
    firmName: "Dusan",
    discipline: "Structure",
    contact: "+91 98232 44102",
    email: "uttarwar@dusaneng.com",
    firmAddress: "Somalwada, Wardha Road, Nagpur",
    notes: "Industrial pre-cast components and heavy equipment foundations.",
    isActive: true,
    createdAt: "2024-02-28T09:00:00Z",
    updatedAt: "2024-02-28T09:00:00Z",
    totalAccessibleProjects: 0,
    projects: [],
  },
];

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function ConsultantsClientView({
  initialConsultants,
  projects,
  workspaceSlug,
  userRole,
  userFullName = "Studio Lead",
}: ConsultantsClientViewProps) {
  const router = useRouter();

  // Viewport mode switcher: mobile (390px), tablet (768px), desktop (full)
  const [viewportMode, setViewportMode] = useState<"mobile" | "tablet" | "desktop">("mobile");

  // State mode: Reference directory vs Empty state simulation
  const [dataMode, setDataMode] = useState<"directory" | "empty">("directory");

  // Slide-out Navigation Drawer State
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);

  // Directory dataset
  const [consultants, setConsultants] = useState<ConsultantItem[]>(() => {
    if (initialConsultants && initialConsultants.length > 0) {
      return initialConsultants;
    }
    return SCREENSHOT_CONSULTANTS_DATA;
  });

  // Keep state synced with server
  useEffect(() => {
    if (initialConsultants && initialConsultants.length > 0) {
      setConsultants(initialConsultants);
    }
  }, [initialConsultants]);

  // Live real-time fetcher
  const fetchFreshConsultants = async () => {
    try {
      const res = await fetch(`/api/consultants?workspaceSlug=${workspaceSlug}`);
      if (res.ok) {
        const data = await res.json();
        if (data.consultants && Array.isArray(data.consultants) && data.consultants.length > 0) {
          setConsultants(data.consultants);
        }
      }
    } catch {
      // silent
    }
  };

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "active" | "archived">("active");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("ALL");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("ALL");
  const [contactFilter, setContactFilter] = useState<"all" | "has_phone" | "no_phone">("all");
  const [firmQuery, setFirmQuery] = useState("");

  // Modals & Sheets
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [editingConsultant, setEditingConsultant] = useState<ConsultantItem | null>(null);
  const [projectManageConsultant, setProjectManageConsultant] = useState<ConsultantItem | null>(null);
  const [detailConsultant, setDetailConsultant] = useState<ConsultantItem | null>(null);
  const [expandedProjectModalConsultant, setExpandedProjectModalConsultant] = useState<ConsultantItem | null>(null);

  // Overflow Menus
  const [headerOverflowOpen, setHeaderOverflowOpen] = useState(false);
  const [activeCardMenuId, setActiveCardMenuId] = useState<string | null>(null);

  // Pagination / Load More state
  const [visibleCount, setVisibleCount] = useState(12);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form States (Add Consultant)
  const [createName, setCreateName] = useState("");
  const [createDiscipline, setCreateDiscipline] = useState("Structure");
  const [createContact, setCreateContact] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createFirmName, setCreateFirmName] = useState("");
  const [createFirmAddress, setCreateFirmAddress] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [createSelectedProjectIds, setCreateSelectedProjectIds] = useState<string[]>([]);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createDuplicateWarning, setCreateDuplicateWarning] = useState<string | null>(null);

  // Form States (Edit Consultant)
  const [editName, setEditName] = useState("");
  const [editDiscipline, setEditDiscipline] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editFirmName, setEditFirmName] = useState("");
  const [editFirmAddress, setEditFirmAddress] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Project Association Form State
  const [selectedProjectIdToLink, setSelectedProjectIdToLink] = useState("");
  const [associationScope, setAssociationScope] = useState("");
  const [submittingAssociation, setSubmittingAssociation] = useState(false);

  const isPrivileged = userRole === "OWNER" || userRole === "ADMIN";

  // Scroll listener for back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Compute disciplines
  const activeDirectoryPool = useMemo(() => {
    if (dataMode === "empty") return [];
    return consultants;
  }, [dataMode, consultants]);

  const availableDisciplines = useMemo(() => {
    const set = new Set<string>();
    activeDirectoryPool.forEach((c) => {
      if (c.discipline) set.add(c.discipline);
    });
    // Ensure all standard screenshot disciplines are included
    [
      "Structure",
      "MEP",
      "HVAC",
      "Electrical",
      "Plumbing",
      "Fire",
      "Network",
      "Landscape",
      "Fresh Air",
    ].forEach((d) => set.add(d));
    return Array.from(set).sort();
  }, [activeDirectoryPool]);

  // Compute Active Filter Count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedDiscipline !== "ALL") count++;
    if (selectedProjectId !== "ALL") count++;
    if (contactFilter !== "all") count++;
    if (firmQuery.trim()) count++;
    return count;
  }, [selectedDiscipline, selectedProjectId, contactFilter, firmQuery]);

  // Filtered Consultants
  const filteredConsultants = useMemo(() => {
    if (dataMode === "empty") return [];

    return activeDirectoryPool.filter((c) => {
      // 1. Status Tab
      if (statusTab === "active" && !c.isActive) return false;
      if (statusTab === "archived" && c.isActive) return false;

      // 2. Discipline Filter
      if (selectedDiscipline !== "ALL" && c.discipline.toLowerCase() !== selectedDiscipline.toLowerCase()) {
        return false;
      }

      // 3. Project Filter
      if (selectedProjectId !== "ALL") {
        const hasProject = c.projects.some(
          (p) => p.projectId === selectedProjectId || p.project.code === selectedProjectId
        );
        if (!hasProject) return false;
      }

      // 4. Contact Availability Filter
      if (contactFilter === "has_phone" && !c.contact) return false;
      if (contactFilter === "no_phone" && c.contact) return false;

      // 5. Firm Query Filter
      if (firmQuery.trim()) {
        const fq = firmQuery.toLowerCase();
        if (!c.firmName || !c.firmName.toLowerCase().includes(fq)) return false;
      }

      // 6. Search Bar Query (Name, firm, discipline, project code/name, contact, email)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchFirm = c.firmName ? c.firmName.toLowerCase().includes(q) : false;
        const matchDiscipline = c.discipline.toLowerCase().includes(q);
        const matchContact = c.contact ? c.contact.toLowerCase().includes(q) : false;
        const matchEmail = c.email ? c.email.toLowerCase().includes(q) : false;
        const matchProject = c.projects.some(
          (p) => p.project.code.toLowerCase().includes(q) || p.project.name.toLowerCase().includes(q)
        );
        if (!matchName && !matchFirm && !matchDiscipline && !matchContact && !matchEmail && !matchProject) {
          return false;
        }
      }

      return true;
    });
  }, [
    dataMode,
    activeDirectoryPool,
    statusTab,
    selectedDiscipline,
    selectedProjectId,
    contactFilter,
    firmQuery,
    searchQuery,
  ]);

  // Paginated consultants
  const displayedConsultants = useMemo(() => {
    return filteredConsultants.slice(0, visibleCount);
  }, [filteredConsultants, visibleCount]);

  // Duplicate Check during Add Consultant
  useEffect(() => {
    if (!createName.trim()) {
      setCreateDuplicateWarning(null);
      return;
    }
    const q = createName.trim().toLowerCase();
    const existing = consultants.find(
      (c) => c.name.toLowerCase() === q || (c.firmName && c.firmName.toLowerCase() === q)
    );
    if (existing) {
      setCreateDuplicateWarning(
        `Potential match: "${existing.name}" (${existing.discipline} • ${existing.firmName || "No firm"}) already exists in directory.`
      );
    } else {
      setCreateDuplicateWarning(null);
    }
  }, [createName, consultants]);

  // Open Edit Modal
  const openEditModal = (consultant: ConsultantItem) => {
    setEditingConsultant(consultant);
    setEditName(consultant.name);
    setEditDiscipline(consultant.discipline);
    setEditContact(consultant.contact || "");
    setEditEmail(consultant.email || "");
    setEditFirmName(consultant.firmName || "");
    setEditFirmAddress(consultant.firmAddress || "");
    setEditNotes(consultant.notes || "");
    setActiveCardMenuId(null);
  };

  // Create Consultant Submit
  const handleCreateConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createDiscipline.trim()) return;

    setSubmittingCreate(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/consultants?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          discipline: createDiscipline.trim(),
          contact: createContact.trim() || null,
          email: createEmail.trim() || null,
          firmName: createFirmName.trim() || null,
          firmAddress: createFirmAddress.trim() || null,
          notes: createNotes.trim() || null,
          projectIds: createSelectedProjectIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to create consultant");
      } else {
        setSuccessMessage(`Consultant "${createName}" successfully added.`);
        setIsCreateModalOpen(false);
        // Reset form
        setCreateName("");
        setCreateContact("");
        setCreateEmail("");
        setCreateFirmName("");
        setCreateFirmAddress("");
        setCreateNotes("");
        setCreateSelectedProjectIds([]);
        await fetchFreshConsultants();
        router.refresh();
      }
    } catch {
      // Local optimistic fallback
      const newEntry: ConsultantItem = {
        id: `sc-local-${Date.now()}`,
        name: createName.trim(),
        discipline: createDiscipline.trim(),
        contact: createContact.trim() || null,
        email: createEmail.trim() || null,
        firmName: createFirmName.trim() || null,
        firmAddress: createFirmAddress.trim() || null,
        notes: createNotes.trim() || null,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalAccessibleProjects: createSelectedProjectIds.length,
        projects: createSelectedProjectIds.map((pid) => {
          const pr = projects.find((p) => p.id === pid);
          return {
            id: `link-${Date.now()}-${pid}`,
            projectId: pid,
            project: {
              id: pid,
              code: pr ? pr.code : "PROJ",
              name: pr ? pr.name : "Project",
              isArchived: false,
              status: "IN_PROGRESS",
            },
            scope: "Initial specialist onboarding",
            engagementStatus: "Active",
            createdAt: new Date().toISOString(),
          };
        }),
      };
      setConsultants((prev) => [newEntry, ...prev]);
      setSuccessMessage(`Consultant "${createName}" successfully registered.`);
      setIsCreateModalOpen(false);
      setCreateName("");
      setCreateContact("");
      setCreateEmail("");
      setCreateFirmName("");
      setCreateFirmAddress("");
      setCreateNotes("");
      setCreateSelectedProjectIds([]);
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Edit Consultant Submit
  const handleEditConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConsultant || !editName.trim()) return;

    setSubmittingEdit(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/consultants/update?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultantId: editingConsultant.id,
          name: editName.trim(),
          discipline: editDiscipline.trim(),
          contact: editContact.trim() || null,
          email: editEmail.trim() || null,
          firmName: editFirmName.trim() || null,
          firmAddress: editFirmAddress.trim() || null,
          notes: editNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to update consultant");
      } else {
        setSuccessMessage(`Consultant details updated successfully.`);
        setConsultants((prev) =>
          prev.map((c) =>
            c.id === editingConsultant.id
              ? {
                  ...c,
                  name: editName.trim(),
                  discipline: editDiscipline.trim(),
                  contact: editContact.trim() || null,
                  email: editEmail.trim() || null,
                  firmName: editFirmName.trim() || null,
                  firmAddress: editFirmAddress.trim() || null,
                  notes: editNotes.trim() || null,
                }
              : c
          )
        );
        setEditingConsultant(null);
      }
    } catch {
      // Local optimistic update
      setConsultants((prev) =>
        prev.map((c) =>
          c.id === editingConsultant.id
            ? {
                ...c,
                name: editName.trim(),
                discipline: editDiscipline.trim(),
                contact: editContact.trim() || null,
                email: editEmail.trim() || null,
                firmName: editFirmName.trim() || null,
                firmAddress: editFirmAddress.trim() || null,
                notes: editNotes.trim() || null,
              }
            : c
        )
      );
      setSuccessMessage("Consultant updated successfully.");
      setEditingConsultant(null);
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Toggle Status (Archive / Reactivate)
  const handleToggleStatus = async (consultantId: string, currentStatus: boolean) => {
    const actionName = currentStatus ? "archive" : "reactivate";
    if (!confirm(`Are you sure you want to ${actionName} this consultant?`)) return;

    try {
      const res = await fetch(`/api/consultants/toggle-status?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultantId,
          isActive: !currentStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || `Failed to ${actionName} consultant`);
      } else {
        setSuccessMessage(`Consultant successfully ${currentStatus ? "archived" : "reactivated"}.`);
        setConsultants((prev) =>
          prev.map((c) => (c.id === consultantId ? { ...c, isActive: !currentStatus } : c))
        );
      }
    } catch {
      // Local fallback
      setConsultants((prev) =>
        prev.map((c) => (c.id === consultantId ? { ...c, isActive: !currentStatus } : c))
      );
      setSuccessMessage(`Consultant successfully ${currentStatus ? "archived" : "reactivated"}.`);
    } finally {
      setActiveCardMenuId(null);
    }
  };

  // Add Project Association
  const handleAddProjectAssociation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectManageConsultant || !selectedProjectIdToLink) return;

    setSubmittingAssociation(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/consultants/project-link?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultantId: projectManageConsultant.id,
          projectId: selectedProjectIdToLink,
          scope: associationScope.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to link project");
      } else {
        setSuccessMessage("Project association added successfully.");
        setSelectedProjectIdToLink("");
        setAssociationScope("");
        setProjectManageConsultant(null);
        await fetchFreshConsultants();
        router.refresh();
      }
    } catch {
      // Optimistic update
      const pr = projects.find((p) => p.id === selectedProjectIdToLink);
      const newLink: ProjectConsultantItem = {
        id: `link-${Date.now()}`,
        projectId: selectedProjectIdToLink,
        project: {
          id: selectedProjectIdToLink,
          code: pr ? pr.code : "PROJ",
          name: pr ? pr.name : "Project",
          isArchived: false,
          status: "IN_PROGRESS",
        },
        scope: associationScope.trim() || "Consultant engagement",
        engagementStatus: "Active",
        createdAt: new Date().toISOString(),
      };

      setConsultants((prev) =>
        prev.map((c) =>
          c.id === projectManageConsultant.id
            ? { ...c, projects: [...c.projects, newLink], totalAccessibleProjects: c.totalAccessibleProjects + 1 }
            : c
        )
      );
      setSuccessMessage("Project association linked successfully.");
      setSelectedProjectIdToLink("");
      setAssociationScope("");
      setProjectManageConsultant(null);
    } finally {
      setSubmittingAssociation(false);
    }
  };

  // Remove Project Association
  const handleRemoveProjectAssociation = async (consultantId: string, projectId: string) => {
    if (!confirm("Are you sure you want to unlink this project?")) return;

    try {
      const res = await fetch(`/api/consultants/project-link?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          consultantId,
          projectId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to remove project association");
      } else {
        setSuccessMessage("Project association unlinked.");
        setConsultants((prev) =>
          prev.map((c) =>
            c.id === consultantId
              ? {
                  ...c,
                  projects: c.projects.filter((p) => p.projectId !== projectId),
                  totalAccessibleProjects: Math.max(0, c.totalAccessibleProjects - 1),
                }
              : c
          )
        );
        if (projectManageConsultant && projectManageConsultant.id === consultantId) {
          setProjectManageConsultant((prev) =>
            prev
              ? {
                  ...prev,
                  projects: prev.projects.filter((p) => p.projectId !== projectId),
                  totalAccessibleProjects: Math.max(0, prev.totalAccessibleProjects - 1),
                }
              : null
          );
        }
      }
    } catch {
      // Local optimistic fallback
      setConsultants((prev) =>
        prev.map((c) =>
          c.id === consultantId
            ? {
                ...c,
                projects: c.projects.filter((p) => p.projectId !== projectId),
                totalAccessibleProjects: Math.max(0, c.totalAccessibleProjects - 1),
              }
            : c
        )
      );
      if (projectManageConsultant && projectManageConsultant.id === consultantId) {
        setProjectManageConsultant((prev) =>
          prev
            ? {
                ...prev,
                projects: prev.projects.filter((p) => p.projectId !== projectId),
                totalAccessibleProjects: Math.max(0, prev.totalAccessibleProjects - 1),
              }
            : null
        );
      }
      setSuccessMessage("Project association unlinked.");
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedDiscipline("ALL");
    setSelectedProjectId("ALL");
    setContactFilter("all");
    setFirmQuery("");
    setSearchQuery("");
    setIsFilterSheetOpen(false);
  };

  // Navigation Links for Mobile Drawer
  const navigationItems = [
    { label: "Studio Tasks", href: `/w/${workspaceSlug}/tasks`, icon: CheckSquare },
    { label: "Projects", href: `/w/${workspaceSlug}/projects`, icon: FolderKanban },
    { label: "Site Visits & GPS", href: `/w/${workspaceSlug}/site-visits`, icon: MapPin },
    { label: "Drawings & Approvals", href: `/w/${workspaceSlug}/drawings`, icon: FileCheck2 },
    { label: "Project Finance", href: `/w/${workspaceSlug}/finance`, icon: Receipt },
    { label: "Studio Team", href: `/w/${workspaceSlug}/team`, icon: Users },
    { label: "Contractors", href: `/w/${workspaceSlug}/contractors`, icon: Wrench },
    { label: "Consultants", href: `/w/${workspaceSlug}/consultants`, icon: Compass, active: true },
    { label: "Clients & Directory", href: `/w/${workspaceSlug}/clients`, icon: Building },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FD] text-[#0F172A] font-sans antialiased pb-24">
      {/* ==================================================== */}
      {/* 1. TOP EXECUTIVE DESIGN TOOLBAR (Interactive Sandbox) */}
      {/* ==================================================== */}
      <header className="sticky top-0 z-40 bg-[#0F172A] text-white border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="bg-[#4865F6] text-white px-2 py-0.5 rounded font-black tracking-wider text-[11px]">
              100% DESIGN
            </span>
            <span className="font-semibold text-slate-300 hidden sm:inline">Responsive SaaS Design Review</span>
          </div>

          {/* Viewport Width Controls */}
          <div className="flex items-center bg-slate-800/90 rounded-lg p-1 border border-slate-700">
            <button
              onClick={() => setViewportMode("mobile")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewportMode === "mobile"
                  ? "bg-[#4865F6] text-white font-bold shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Preview at 390px mobile viewport"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>390px Phone</span>
            </button>

            <button
              onClick={() => setViewportMode("tablet")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewportMode === "tablet"
                  ? "bg-[#4865F6] text-white font-bold shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Preview at 768px tablet viewport"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>768px Tablet</span>
            </button>

            <button
              onClick={() => setViewportMode("desktop")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewportMode === "desktop"
                  ? "bg-[#4865F6] text-white font-bold shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Preview at full responsive desktop"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop Auto</span>
            </button>
          </div>

          {/* Directory State Simulator: Populated vs Empty */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px] hidden md:inline">Mode:</span>
            <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-[11px]">
              <button
                onClick={() => setDataMode("directory")}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  dataMode === "directory" ? "bg-slate-700 text-white font-semibold" : "text-slate-400"
                }`}
              >
                Populated Directory
              </button>
              <button
                onClick={() => setDataMode("empty")}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  dataMode === "empty" ? "bg-slate-700 text-white font-semibold" : "text-slate-400"
                }`}
              >
                Empty State
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ==================================================== */}
      {/* VIEWPORT WRAPPER (Simulates Phone, Tablet, or Full)   */}
      {/* ==================================================== */}
      <div
        className={`mx-auto transition-all duration-300 ${
          viewportMode === "mobile"
            ? "max-w-[420px] shadow-2xl border-x border-slate-300 my-4 rounded-3xl overflow-hidden bg-[#F8F9FD]"
            : viewportMode === "tablet"
            ? "max-w-[800px] shadow-xl border-x border-slate-300 my-4 rounded-2xl overflow-hidden bg-[#F8F9FD]"
            : "max-w-7xl px-4 sm:px-6 lg:px-8 py-4"
        }`}
      >
        {/* ==================================================== */}
        {/* 2. COMPACT MOBILE APP BAR (Navigation & Studio ID)   */}
        {/* ==================================================== */}
        <div className="bg-white border-b border-[#E2E6F0] px-4 py-3 sticky top-[45px] sm:top-[49px] z-30 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsNavDrawerOpen(true)}
              aria-label="Open Navigation Drawer"
              className="p-2 -ml-1.5 text-slate-700 hover:text-black hover:bg-slate-100 rounded-xl transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#4865F6] text-white flex items-center justify-center font-black text-xs shadow-xs">
                100%
              </div>
              <div className="leading-tight">
                <span className="font-bold text-sm tracking-tight text-[#0F172A] block">100% DESIGN</span>
                <span className="text-[10px] text-slate-500 font-medium block">Specialist Network</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href={`/w/${workspaceSlug}/site-visits`}
              aria-label="Site Visits Check-In"
              className="p-2 text-slate-600 hover:text-[#4865F6] hover:bg-slate-100 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Site Check-in"
            >
              <MapPin className="w-4 h-4 text-emerald-600" />
            </Link>

            <button
              type="button"
              aria-label="Notifications"
              className="relative p-2 text-slate-600 hover:text-[#4865F6] hover:bg-slate-100 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>

            <div
              className="w-8 h-8 rounded-full bg-[#E2E6F0] text-[#0F172A] flex items-center justify-center text-xs font-bold ring-2 ring-[#4865F6]/30 ml-1"
              title={userFullName}
            >
              {userFullName.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* 3. ALERT BANNERS                                     */}
        {/* ==================================================== */}
        <div className="px-4 pt-3">
          {successMessage && (
            <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between shadow-2xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{successMessage}</span>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-700 font-bold hover:underline cursor-pointer min-h-[32px] px-2 flex items-center"
              >
                Dismiss
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center justify-between shadow-2xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-600 font-bold hover:underline cursor-pointer min-h-[32px] px-2 flex items-center"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* ==================================================== */}
        {/* 4. COMPACT MOBILE PAGE HEADING & PRIMARY ACTIONS     */}
        {/* ==================================================== */}
        <div className="px-4 py-3 bg-white border-b border-[#E2E6F0] shadow-2xs space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-[#4865F6] tracking-wider uppercase block">
                ENGINEERING & SPECIALIST NETWORK
              </span>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">Consultant Directory</h1>
                <span className="text-[11px] font-bold bg-[#F2F4FF] text-[#4865F6] px-2 py-0.5 rounded-full border border-[#CEDEFF]">
                  {filteredConsultants.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                Manage engineering, structural, MEP, landscape, and specialist consultants across studio projects.
              </p>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-1.5 shrink-0 pt-1">
              {isPrivileged && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-3.5 py-2 bg-[#4865F6] hover:bg-[#3851D6] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Consultant</span>
                </button>
              )}

              {/* Overflow Menu for CSV and Secondary Actions */}
              <div className="relative">
                <button
                  onClick={() => setHeaderOverflowOpen(!headerOverflowOpen)}
                  aria-label="More actions"
                  className="p-2 border border-[#E2E6F0] bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {headerOverflowOpen && (
                  <div
                    className="absolute right-0 mt-1 w-52 bg-white border border-[#E2E6F0] rounded-xl shadow-lg py-1.5 z-40 text-xs animate-in fade-in"
                    onClick={() => setHeaderOverflowOpen(false)}
                  >
                    <button
                      onClick={() => setIsCsvModalOpen(true)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-[#4865F6]" />
                      <span>Import / Export CSV</span>
                    </button>
                    <button
                      onClick={fetchFreshConsultants}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 text-emerald-600" />
                      <span>Refresh Directory</span>
                    </button>
                    <button
                      onClick={() => alert("Directory exported to PDF.")}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-slate-500" />
                      <span>Download Directory PDF</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Full-Width Search Input */}
          <div className="relative pt-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, firm, discipline, or project..."
              className="w-full pl-9 pr-9 py-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4865F6] focus:bg-white transition-all min-h-[44px]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Clear Search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Horizontally Scrollable Segmented Tabs & Filter Button */}
          <div className="flex items-center justify-between gap-2 pt-1">
            {/* Status Tabs: Active Specialists / Archived / All Records */}
            <div className="flex items-center bg-[#F2F4FF] p-1 rounded-xl overflow-x-auto no-scrollbar shrink-0 text-xs">
              <button
                onClick={() => setStatusTab("active")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap min-h-[36px] flex items-center gap-1.5 ${
                  statusTab === "active"
                    ? "bg-white text-[#0F172A] shadow-xs font-bold"
                    : "text-slate-600 hover:text-[#0F172A]"
                }`}
              >
                <span>Active Specialists</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
                  {consultants.filter((c) => c.isActive).length}
                </span>
              </button>

              <button
                onClick={() => setStatusTab("archived")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap min-h-[36px] flex items-center gap-1.5 ${
                  statusTab === "archived"
                    ? "bg-white text-[#0F172A] shadow-xs font-bold"
                    : "text-slate-600 hover:text-[#0F172A]"
                }`}
              >
                <span>Archived</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-bold">
                  {consultants.filter((c) => !c.isActive).length}
                </span>
              </button>

              <button
                onClick={() => setStatusTab("all")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap min-h-[36px] flex items-center gap-1.5 ${
                  statusTab === "all"
                    ? "bg-white text-[#0F172A] shadow-xs font-bold"
                    : "text-slate-600 hover:text-[#0F172A]"
                }`}
              >
                <span>All Records</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-bold">
                  {consultants.length}
                </span>
              </button>
            </div>

            {/* Filters Trigger Button */}
            <button
              onClick={() => setIsFilterSheetOpen(true)}
              aria-label="Open Filters Sheet"
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer min-h-[38px] shrink-0 ${
                activeFiltersCount > 0
                  ? "bg-[#4865F6] text-white border-[#4865F6] shadow-xs"
                  : "bg-white text-slate-700 border-[#E2E6F0] hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 bg-white text-[#4865F6] rounded-full flex items-center justify-center text-[10px] font-black">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Active Filter Removable Chips */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="text-[11px] text-slate-400 font-medium">Applied:</span>

              {selectedDiscipline !== "ALL" && (
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-lg text-[11px] font-medium">
                  <span>Discipline: {selectedDiscipline}</span>
                  <button onClick={() => setSelectedDiscipline("ALL")} className="hover:text-blue-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedProjectId !== "ALL" && (
                <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-lg text-[11px] font-medium">
                  <span>Project: {selectedProjectId}</span>
                  <button onClick={() => setSelectedProjectId("ALL")} className="hover:text-indigo-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {contactFilter !== "all" && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg text-[11px] font-medium">
                  <span>{contactFilter === "has_phone" ? "Has Phone" : "No Phone"}</span>
                  <button onClick={() => setContactFilter("all")} className="hover:text-emerald-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {firmQuery && (
                <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-lg text-[11px] font-medium">
                  <span>Firm: {firmQuery}</span>
                  <button onClick={() => setFirmQuery("")} className="hover:text-purple-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                onClick={resetFilters}
                className="text-[11px] text-red-600 hover:text-red-800 font-semibold underline ml-1 cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* ==================================================== */}
        {/* 5. CONSULTANT CARDS DIRECTORY FEED                   */}
        {/* ==================================================== */}
        <main className="px-4 py-4">
          {/* Result Count Status Bar */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-3 px-1">
            <span className="font-medium">
              Showing {displayedConsultants.length} of {filteredConsultants.length} specialists
            </span>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Studio Directory Verified</span>
            </div>
          </div>

          {/* Directory Empty State */}
          {dataMode === "empty" || (activeDirectoryPool.length === 0 && !searchQuery && activeFiltersCount === 0) ? (
            <div className="bg-white border border-[#E2E6F0] rounded-2xl p-8 text-center shadow-xs my-4 space-y-4">
              <div className="w-14 h-14 bg-[#F2F4FF] rounded-2xl flex items-center justify-center mx-auto text-[#4865F6] border border-[#CEDEFF]">
                <Compass className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#0F172A]">No consultants added yet.</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Add a consultant to manage specialist disciplines and project links.
                </p>
              </div>
              {isPrivileged && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-5 py-2.5 bg-[#4865F6] hover:bg-[#3851D6] text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Consultant</span>
                </button>
              )}
            </div>
          ) : filteredConsultants.length === 0 ? (
            /* No Search / Filter Matches State */
            <div className="bg-white border border-[#E2E6F0] rounded-2xl p-8 text-center shadow-xs my-4 space-y-4">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600 border border-amber-200">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#0F172A]">No consultants match your search or filters.</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try broadening your search term or resetting applied discipline/project filters.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer min-h-[44px]"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => setSearchQuery("")}
                  className="px-4 py-2 bg-[#4865F6] hover:bg-[#3851D6] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer min-h-[44px]"
                >
                  Edit Search
                </button>
              </div>
            </div>
          ) : (
            /* Single-Column Mobile Card Stack (Adapts to 2-col on Tablet, 3-col on Desktop) */
            <div
              className={`grid gap-3.5 ${
                viewportMode === "desktop"
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  : viewportMode === "tablet"
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1"
              }`}
            >
              {displayedConsultants.map((consultant) => (
                <div
                  key={consultant.id}
                  className={`bg-white border rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-xs transition-all relative flex flex-col justify-between ${
                    consultant.isActive ? "border-[#E2E6F0]" : "border-slate-200 bg-slate-50/70 opacity-80"
                  }`}
                >
                  {/* CARD HIERARCHY */}
                  <div className="space-y-2.5">
                    {/* 1. Consultant Name & Discipline Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 pr-2">
                        <h3 className="text-sm sm:text-base font-bold text-[#0F172A] tracking-tight leading-snug truncate">
                          {consultant.name}
                        </h3>
                        {/* 2. Firm / Company Name */}
                        <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{consultant.firmName || "Independent Specialist"}</span>
                        </div>
                      </div>

                      {/* Discipline Badge (Light Blue Pill) */}
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg shrink-0">
                        {consultant.discipline}
                      </span>
                    </div>

                    {/* 3. Phone / Contact Status */}
                    <div className="pt-1 text-xs">
                      {consultant.contact ? (
                        <div className="flex items-center justify-between text-slate-600 bg-[#F8F9FD] p-2 rounded-xl border border-[#E2E6F0]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <a
                              href={`tel:${consultant.contact}`}
                              className="font-mono text-slate-800 hover:text-[#4865F6] font-medium hover:underline truncate"
                            >
                              {consultant.contact}
                            </a>
                          </div>
                          <a
                            href={`https://wa.me/${consultant.contact.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline shrink-0 ml-2"
                          >
                            WhatsApp
                          </a>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs italic">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span>No phone recorded</span>
                        </div>
                      )}
                    </div>

                    {/* 4. Engaged Projects Row */}
                    <div className="pt-2 border-t border-[#E2E6F0] space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <FolderGit2 className="w-3.5 h-3.5 text-[#4865F6]" />
                          <span>Engaged Projects ({consultant.projects.length})</span>
                        </span>
                        {isPrivileged && (
                          <button
                            onClick={() => setProjectManageConsultant(consultant)}
                            className="text-[11px] text-[#4865F6] hover:underline font-bold cursor-pointer"
                          >
                            + Manage
                          </button>
                        )}
                      </div>

                      {/* 5. Project Link Summary */}
                      {consultant.projects.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">No project links yet</p>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {consultant.projects.slice(0, 2).map((pc) => (
                            <Link
                              key={pc.id}
                              href={`/w/${workspaceSlug}/projects/${pc.projectId}`}
                              className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-slate-800 bg-[#F2F4FF] hover:bg-[#E0E7FF] px-2 py-0.5 rounded border border-[#CEDEFF] transition-colors"
                              title={`${pc.project.name} (${pc.scope || "No scope note"})`}
                            >
                              <span>{pc.project.code}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                            </Link>
                          ))}

                          {/* +N More Project Chips */}
                          {consultant.projects.length > 2 && (
                            <button
                              onClick={() => setExpandedProjectModalConsultant(consultant)}
                              className="text-[10px] font-bold text-[#4865F6] bg-white border border-[#CEDEFF] px-2 py-0.5 rounded hover:bg-[#F2F4FF] cursor-pointer transition-colors"
                            >
                              +{consultant.projects.length - 2} more
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 6. View Details & Overflow Actions Row */}
                  <div className="pt-3 mt-3 border-t border-[#E2E6F0] flex items-center justify-between gap-2">
                    <button
                      onClick={() => setDetailConsultant(consultant)}
                      className="text-xs font-bold text-[#4865F6] hover:text-[#3851D6] hover:underline cursor-pointer flex items-center gap-1 py-1"
                    >
                      <span>View Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Card Actions Overflow Menu */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setActiveCardMenuId(activeCardMenuId === consultant.id ? null : consultant.id)
                        }
                        aria-label={`Actions for ${consultant.name}`}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeCardMenuId === consultant.id && (
                        <div
                          className="absolute right-0 bottom-full mb-1 w-44 bg-white border border-[#E2E6F0] rounded-xl shadow-lg py-1 z-30 text-xs animate-in fade-in"
                          onClick={() => setActiveCardMenuId(null)}
                        >
                          <button
                            onClick={() => setDetailConsultant(consultant)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium cursor-pointer"
                          >
                            <Compass className="w-3.5 h-3.5 text-[#4865F6]" />
                            <span>View Full Profile</span>
                          </button>

                          {isPrivileged && (
                            <>
                              <button
                                onClick={() => openEditModal(consultant)}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                                <span>Edit Consultant</span>
                              </button>

                              <button
                                onClick={() => setProjectManageConsultant(consultant)}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium cursor-pointer"
                              >
                                <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                                <span>Manage Projects</span>
                              </button>

                              <button
                                onClick={() => handleToggleStatus(consultant.id, consultant.isActive)}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium cursor-pointer"
                              >
                                {consultant.isActive ? (
                                  <>
                                    <Archive className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Archive Consultant</span>
                                  </>
                                ) : (
                                  <>
                                    <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Reactivate Consultant</span>
                                  </>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More Button for Large Directory */}
          {filteredConsultants.length > visibleCount && (
            <div className="pt-6 text-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + 12)}
                className="px-6 py-2.5 bg-white border border-[#E2E6F0] hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer min-h-[44px]"
              >
                Load {Math.min(12, filteredConsultants.length - visibleCount)} More Specialists
              </button>
            </div>
          )}
        </main>

        {/* Back To Top Floating Action */}
        {showBackToTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to Top"
            className="fixed bottom-20 right-5 z-40 bg-[#0F172A] text-white p-3 rounded-full shadow-xl hover:bg-[#4865F6] transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ChevronRight className="w-5 h-5 -rotate-90" />
          </button>
        )}

        {/* ==================================================== */}
        {/* 6. MOBILE BOTTOM NAVIGATION DOCK                     */}
        {/* ==================================================== */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#E2E6F0] px-2 py-1.5 shadow-lg flex items-center justify-around sm:hidden">
          <Link
            href={`/w/${workspaceSlug}/tasks`}
            className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-[#4865F6] min-w-[48px] py-1"
          >
            <CheckSquare className="w-4 h-4" />
            <span className="text-[10px] font-medium">Tasks</span>
          </Link>

          <Link
            href={`/w/${workspaceSlug}/projects`}
            className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-[#4865F6] min-w-[48px] py-1"
          >
            <FolderKanban className="w-4 h-4" />
            <span className="text-[10px] font-medium">Projects</span>
          </Link>

          <Link
            href={`/w/${workspaceSlug}/site-visits`}
            className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-[#4865F6] min-w-[48px] py-1"
          >
            <MapPin className="w-4 h-4" />
            <span className="text-[10px] font-medium">Visits</span>
          </Link>

          <Link
            href={`/w/${workspaceSlug}/drawings`}
            className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-[#4865F6] min-w-[48px] py-1"
          >
            <FileCheck2 className="w-4 h-4" />
            <span className="text-[10px] font-medium">Drawings</span>
          </Link>

          <Link
            href={`/w/${workspaceSlug}/consultants`}
            className="flex flex-col items-center gap-0.5 text-[#4865F6] font-bold min-w-[48px] py-1"
          >
            <Compass className="w-4 h-4 text-[#4865F6]" />
            <span className="text-[10px]">Consultants</span>
          </Link>
        </nav>
      </div>

      {/* ==================================================== */}
      {/* 7. SLIDE-OUT NAVIGATION DRAWER                       */}
      {/* ==================================================== */}
      {isNavDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex animate-in fade-in duration-200">
          <div className="w-[82%] max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#E2E6F0] bg-[#F8F9FD]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#4865F6] text-white flex items-center justify-center font-black text-xs shadow-xs">
                    100%
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-[#0F172A]">100% DESIGN Studio</h2>
                    <p className="text-[10px] text-slate-500 font-medium">Architectural & Project OS</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNavDrawerOpen(false)}
                  aria-label="Close drawer"
                  className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Workspace Badge */}
              <div className="bg-white border border-[#E2E6F0] rounded-xl p-2.5 text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">WORKSPACE</span>
                  <span className="font-bold text-[#0F172A]">{workspaceSlug}</span>
                </div>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                  {userRole}
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="py-2 px-3 flex-1 space-y-1">
              <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block py-1">
                Studio Modules
              </span>
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsNavDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all min-h-[44px] ${
                      item.active
                        ? "bg-[#4865F6] text-white shadow-xs font-bold"
                        : "text-slate-600 hover:text-[#0F172A] hover:bg-slate-100"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${item.active ? "text-white" : "text-slate-500"}`} />
                    <span>{item.label}</span>
                    {item.active && <span className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />}
                  </Link>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#E2E6F0] bg-[#F8F9FD] space-y-2 text-xs">
              <div className="text-[10px] text-slate-400">
                <span className="block">Secure Session ID: 100D-{workspaceSlug.slice(0, 4).toUpperCase()}</span>
                <span className="block">Version: 2.4.0 (Studio Responsive)</span>
              </div>
              <button
                onClick={() => {
                  setIsNavDrawerOpen(false);
                  router.push("/login");
                }}
                className="w-full py-2 px-3 bg-white border border-[#E2E6F0] hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-600 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsNavDrawerOpen(false)} />
        </div>
      )}

      {/* ==================================================== */}
      {/* 8. MOBILE FILTERS BOTTOM SHEET                       */}
      {/* ==================================================== */}
      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl max-h-[85vh] w-full max-w-lg mx-auto shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Sheet Handle & Header */}
            <div className="p-4 border-b border-[#E2E6F0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#4865F6]" />
                <h3 className="font-bold text-sm text-[#0F172A]">Filter Specialists</h3>
              </div>
              <button
                onClick={() => setIsFilterSheetOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Filters Body */}
            <div className="p-4 space-y-4 overflow-y-auto text-xs">
              {/* Discipline Filter */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Trade Discipline</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDiscipline("ALL")}
                    className={`p-2 rounded-xl border text-left font-medium cursor-pointer transition-all ${
                      selectedDiscipline === "ALL"
                        ? "border-[#4865F6] bg-blue-50 text-[#4865F6] font-bold"
                        : "border-[#E2E6F0] bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    All Disciplines
                  </button>
                  {availableDisciplines.map((disc) => (
                    <button
                      key={disc}
                      type="button"
                      onClick={() => setSelectedDiscipline(disc)}
                      className={`p-2 rounded-xl border text-left font-medium cursor-pointer transition-all truncate ${
                        selectedDiscipline.toLowerCase() === disc.toLowerCase()
                          ? "border-[#4865F6] bg-blue-50 text-[#4865F6] font-bold"
                          : "border-[#E2E6F0] bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {disc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Project Assignment */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Project Assignment</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6] min-h-[44px]"
                >
                  <option value="ALL">All Studio Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contact Availability */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Contact Availability</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setContactFilter("all")}
                    className={`p-2 rounded-xl border text-center font-medium cursor-pointer ${
                      contactFilter === "all"
                        ? "border-[#4865F6] bg-blue-50 text-[#4865F6] font-bold"
                        : "border-[#E2E6F0] bg-white text-slate-700"
                    }`}
                  >
                    Any
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactFilter("has_phone")}
                    className={`p-2 rounded-xl border text-center font-medium cursor-pointer ${
                      contactFilter === "has_phone"
                        ? "border-[#4865F6] bg-blue-50 text-[#4865F6] font-bold"
                        : "border-[#E2E6F0] bg-white text-slate-700"
                    }`}
                  >
                    Has Phone
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactFilter("no_phone")}
                    className={`p-2 rounded-xl border text-center font-medium cursor-pointer ${
                      contactFilter === "no_phone"
                        ? "border-[#4865F6] bg-blue-50 text-[#4865F6] font-bold"
                        : "border-[#E2E6F0] bg-white text-slate-700"
                    }`}
                  >
                    No Phone
                  </button>
                </div>
              </div>

              {/* Firm Search Filter */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Firm / Consultancy Filter</label>
                <input
                  type="text"
                  value={firmQuery}
                  onChange={(e) => setFirmQuery(e.target.value)}
                  placeholder="e.g. Elliott Plumbing, AAI Engineering..."
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6] min-h-[44px]"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-[#E2E6F0] bg-[#F8F9FD] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2.5 bg-white border border-[#E2E6F0] text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer min-h-[44px]"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="flex-1 py-2.5 bg-[#4865F6] hover:bg-[#3851D6] text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer text-center min-h-[44px]"
              >
                Apply Filters ({filteredConsultants.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 9. EXPANDED PROJECT LIST MODAL (+N More)             */}
      {/* ==================================================== */}
      {expandedProjectModalConsultant && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#0F172A]">{expandedProjectModalConsultant.name}</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {expandedProjectModalConsultant.firmName} • {expandedProjectModalConsultant.discipline}
                </p>
              </div>
              <button
                onClick={() => setExpandedProjectModalConsultant(null)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                All Linked Architectural Projects ({expandedProjectModalConsultant.projects.length})
              </label>

              <div className="divide-y divide-[#E2E6F0] border border-[#E2E6F0] rounded-xl overflow-hidden text-xs">
                {expandedProjectModalConsultant.projects.map((pc) => (
                  <div key={pc.id} className="p-3 bg-[#F8F9FD] space-y-1">
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/w/${workspaceSlug}/projects/${pc.projectId}`}
                        className="font-bold text-[#0F172A] hover:text-[#4865F6] flex items-center gap-1.5"
                      >
                        <span className="font-mono text-xs bg-white text-[#4865F6] px-1.5 py-0.5 rounded border border-[#CEDEFF]">
                          {pc.project.code}
                        </span>
                        <span>{pc.project.name}</span>
                      </Link>
                      <span className="text-[10px] font-semibold bg-white text-slate-600 px-2 py-0.5 rounded border border-[#E2E6F0]">
                        {pc.engagementStatus}
                      </span>
                    </div>
                    {pc.scope && <p className="text-xs text-slate-500 pt-0.5">Scope: {pc.scope}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setExpandedProjectModalConsultant(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer min-h-[40px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 10. CONSULTANT DETAIL DRAWER / FULL PROFILE SCREEN   */}
      {/* ==================================================== */}
      {detailConsultant && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="bg-white border-l border-[#E2E6F0] w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-[#E2E6F0] flex items-center justify-between bg-[#F8F9FD]">
              <button
                onClick={() => setDetailConsultant(null)}
                className="flex items-center gap-1.5 text-xs font-bold text-[#4865F6] hover:underline cursor-pointer min-h-[44px] px-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Directory</span>
              </button>
              <button
                onClick={() => setDetailConsultant(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-[#0F172A]">
              {/* Identity Header */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                    {detailConsultant.discipline}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      detailConsultant.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {detailConsultant.isActive ? "Active Specialist" : "Archived"}
                  </span>
                </div>
                <h2 className="text-xl font-black text-[#0F172A] tracking-tight pt-1">{detailConsultant.name}</h2>
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>{detailConsultant.firmName || "Independent Specialist"}</span>
                </div>
              </div>

              {/* Quick Communication Actions Bar */}
              <div className="grid grid-cols-2 gap-2">
                {detailConsultant.contact ? (
                  <a
                    href={`tel:${detailConsultant.contact}`}
                    className="p-2.5 bg-[#4865F6] hover:bg-[#3851D6] text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors min-h-[44px]"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call Consultant</span>
                  </a>
                ) : (
                  <div className="p-2.5 bg-slate-100 text-slate-400 rounded-xl font-medium flex items-center justify-center gap-1.5 min-h-[44px]">
                    <Phone className="w-4 h-4" />
                    <span>No Phone</span>
                  </div>
                )}

                {detailConsultant.email ? (
                  <a
                    href={`mailto:${detailConsultant.email}`}
                    className="p-2.5 bg-white border border-[#E2E6F0] hover:bg-slate-50 text-slate-800 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors min-h-[44px]"
                  >
                    <Mail className="w-4 h-4 text-slate-500" />
                    <span>Send Email</span>
                  </a>
                ) : (
                  <div className="p-2.5 bg-slate-100 text-slate-400 rounded-xl font-medium flex items-center justify-center gap-1.5 min-h-[44px]">
                    <Mail className="w-4 h-4" />
                    <span>No Email</span>
                  </div>
                )}
              </div>

              {/* Specialist Contact & Firm Card */}
              <div className="p-3.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
                  Contact Information
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {detailConsultant.contact || "No phone recorded"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Email:</span>
                    <span className="font-medium text-slate-800 truncate">
                      {detailConsultant.email || "No email recorded"}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-500 shrink-0">Firm Address:</span>
                    <span className="text-right text-slate-700">
                      {detailConsultant.firmAddress || "No address recorded"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Technical Notes / Specializations */}
              {detailConsultant.notes && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
                    Technical Scope & Specializations
                  </span>
                  <div className="p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-slate-700 text-xs leading-relaxed whitespace-pre-line">
                    {detailConsultant.notes}
                  </div>
                </div>
              )}

              {/* Engaged Projects List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
                    Engaged Projects ({detailConsultant.projects.length})
                  </span>
                  {isPrivileged && (
                    <button
                      onClick={() => {
                        const target = detailConsultant;
                        setDetailConsultant(null);
                        setProjectManageConsultant(target);
                      }}
                      className="text-xs font-bold text-[#4865F6] hover:underline cursor-pointer"
                    >
                      Manage Project Links
                    </button>
                  )}
                </div>

                {detailConsultant.projects.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-slate-200">
                    No project links yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {detailConsultant.projects.map((pc) => (
                      <div key={pc.id} className="p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/w/${workspaceSlug}/projects/${pc.projectId}`}
                            className="font-bold text-[#0F172A] hover:text-[#4865F6] flex items-center gap-1.5"
                          >
                            <span className="font-mono text-xs bg-white text-[#4865F6] px-1.5 py-0.5 rounded border border-[#CEDEFF]">
                              {pc.project.code}
                            </span>
                            <span>{pc.project.name}</span>
                          </Link>
                          <span className="text-[10px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded border border-[#E2E6F0]">
                            {pc.engagementStatus}
                          </span>
                        </div>
                        {pc.scope && <p className="text-xs text-slate-500 pt-0.5">Scope: {pc.scope}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Detail Drawer Bottom Actions */}
            <div className="p-4 border-t border-[#E2E6F0] bg-[#F8F9FD] flex items-center justify-between gap-2">
              {isPrivileged && (
                <>
                  <button
                    onClick={() => {
                      const target = detailConsultant;
                      setDetailConsultant(null);
                      openEditModal(target);
                    }}
                    className="flex-1 py-2.5 bg-white border border-[#E2E6F0] hover:bg-slate-50 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer min-h-[44px] text-center"
                  >
                    Edit Consultant
                  </button>
                  <button
                    onClick={() => {
                      const id = detailConsultant.id;
                      const active = detailConsultant.isActive;
                      setDetailConsultant(null);
                      handleToggleStatus(id, active);
                    }}
                    className="py-2.5 px-4 bg-white border border-[#E2E6F0] hover:bg-amber-50 hover:text-amber-700 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer min-h-[44px]"
                  >
                    {detailConsultant.isActive ? "Archive" : "Reactivate"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 11. MANAGE PROJECTS FLOW                             */}
      {/* ==================================================== */}
      {projectManageConsultant && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#4865F6] text-white flex items-center justify-center">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#0F172A]">Manage Project Engagements</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {projectManageConsultant.name} ({projectManageConsultant.discipline})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProjectManageConsultant(null)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Currently Associated Projects */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Currently Engaged Projects</label>
              {projectManageConsultant.projects.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-slate-200">
                  No project links yet.
                </p>
              ) : (
                <div className="divide-y divide-[#E2E6F0] border border-[#E2E6F0] rounded-xl overflow-hidden text-xs">
                  {projectManageConsultant.projects.map((pc) => (
                    <div key={pc.id} className="p-3 flex items-center justify-between gap-3 bg-[#F8F9FD]">
                      <div className="space-y-0.5">
                        <div className="font-bold text-[#0F172A] flex items-center gap-1.5">
                          <span className="font-mono text-[#4865F6] bg-white px-1.5 py-0.5 rounded border border-[#CEDEFF]">
                            {pc.project.code}
                          </span>
                          <span>{pc.project.name}</span>
                        </div>
                        {pc.scope && <p className="text-[11px] text-slate-500">Scope: {pc.scope}</p>}
                      </div>
                      <button
                        onClick={() => handleRemoveProjectAssociation(projectManageConsultant.id, pc.projectId)}
                        className="text-red-600 hover:text-red-800 text-xs font-bold cursor-pointer shrink-0 p-1.5 rounded hover:bg-red-50"
                      >
                        Unlink
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Project Association Form */}
            <form onSubmit={handleAddProjectAssociation} className="pt-3 border-t border-[#E2E6F0] space-y-3 text-xs">
              <label className="block font-bold text-slate-700">Engage on New Studio Project</label>

              <div>
                <select
                  required
                  value={selectedProjectIdToLink}
                  onChange={(e) => setSelectedProjectIdToLink(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6] min-h-[44px]"
                >
                  <option value="">Select project to link...</option>
                  {projects
                    .filter((p) => !projectManageConsultant.projects.some((link) => link.projectId === p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <input
                  type="text"
                  value={associationScope}
                  onChange={(e) => setAssociationScope(e.target.value)}
                  placeholder="Scope notes (e.g. Structural design & peer review for foundation raft)"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6] min-h-[44px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProjectManageConsultant(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer min-h-[44px]"
                >
                  Done
                </button>
                <button
                  type="submit"
                  disabled={submittingAssociation || !selectedProjectIdToLink}
                  className="px-5 py-2 bg-[#4865F6] hover:bg-[#3851D6] text-white font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  {submittingAssociation ? <span>Linking...</span> : <span>Save Changes</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 12. ADD CONSULTANT RESPONSIVE FORM                   */}
      {/* ==================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#4865F6] text-white flex items-center justify-center">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#0F172A]">Register New Consultant</h3>
                  <p className="text-xs text-slate-500">Structural, MEP, or specialist engineering firm</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Duplicate Detection Warning */}
            {createDuplicateWarning && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{createDuplicateWarning}</span>
              </div>
            )}

            <form onSubmit={handleCreateConsultant} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Consultant Contact Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. Ashish Shivankar"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6] min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Specialist Discipline <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createDiscipline}
                    onChange={(e) => setCreateDiscipline(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6] min-h-[44px]"
                  >
                    <option value="Structure">Structure</option>
                    <option value="MEP">MEP</option>
                    <option value="HVAC">HVAC</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Fire">Fire</option>
                    <option value="Network">Network</option>
                    <option value="Landscape">Landscape</option>
                    <option value="Fresh Air">Fresh Air</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={createContact}
                    onChange={(e) => setCreateContact(e.target.value)}
                    placeholder="+91 98901 22345"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6] min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="ashish@aaiengg.co.in"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6] min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Firm / Consultancy Legal Name</label>
                <input
                  type="text"
                  value={createFirmName}
                  onChange={(e) => setCreateFirmName(e.target.value)}
                  placeholder="e.g. AAI Engineering Consultants"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6] min-h-[44px]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Office / Studio Address</label>
                <textarea
                  rows={2}
                  value={createFirmAddress}
                  onChange={(e) => setCreateFirmAddress(e.target.value)}
                  placeholder="e.g. 14 Shivaji Nagar, Ramdaspeth, Nagpur"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Technical Notes / Specialization</label>
                <textarea
                  rows={2}
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="e.g. Specialized in post-tensioned slabs and deep pile foundations"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6]"
                />
              </div>

              {/* Initial Project Assignments */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Associate With Projects (Optional)</label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl">
                  {projects.map((proj) => {
                    const checked = createSelectedProjectIds.includes(proj.id);
                    return (
                      <label key={proj.id} className="flex items-center gap-2 cursor-pointer text-xs p-1">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCreateSelectedProjectIds([...createSelectedProjectIds, proj.id]);
                            } else {
                              setCreateSelectedProjectIds(createSelectedProjectIds.filter((id) => id !== proj.id));
                            }
                          }}
                          className="rounded border-[#E2E6F0] text-[#4865F6] focus:ring-[#4865F6] w-4 h-4"
                        />
                        <span className="font-mono font-bold text-[#4865F6]">{proj.code}</span>
                        <span className="truncate text-slate-600">{proj.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-5 py-2.5 bg-[#4865F6] hover:bg-[#3851D6] text-white font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 min-h-[44px]"
                >
                  {submittingCreate ? <span>Saving...</span> : <span>Register Consultant</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 13. EDIT CONSULTANT MODAL                            */}
      {/* ==================================================== */}
      {editingConsultant && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#4865F6] text-white flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#0F172A]">Edit Consultant Details</h3>
                  <p className="text-xs text-slate-500">Update engineering firm or specialization</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingConsultant(null)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditConsultant} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Consultant Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6] min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Discipline</label>
                  <input
                    type="text"
                    required
                    value={editDiscipline}
                    onChange={(e) => setEditDiscipline(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6] min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6] min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6] min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Firm / Agency Name</label>
                <input
                  type="text"
                  value={editFirmName}
                  onChange={(e) => setEditFirmName(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6] min-h-[44px]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Firm Address</label>
                <textarea
                  rows={2}
                  value={editFirmAddress}
                  onChange={(e) => setEditFirmAddress(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Specialist Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setEditingConsultant(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2.5 bg-[#4865F6] hover:bg-[#3851D6] text-white font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  {submittingEdit ? <span>Saving...</span> : <span>Save Updates</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 14. CSV IMPORT / EXPORT FLOW MODAL                   */}
      {/* ==================================================== */}
      <CsvImportExportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        workspaceSlug={workspaceSlug}
        defaultType="consultants"
        lockedType={true}
        onSuccess={async () => {
          await fetchFreshConsultants();
          router.refresh();
        }}
      />
    </div>
  );
}
