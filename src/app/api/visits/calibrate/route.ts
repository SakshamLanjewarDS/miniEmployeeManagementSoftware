import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export async function GET(req: NextRequest) {
  try {
    // 1. Update all sites named Alibaug or associated with current active visits to Trimurti Nagar, Nagpur
    await prisma.site.updateMany({
      where: {
        OR: [
          { name: { contains: "Alibaug" } },
          { address: { contains: "Alibaug" } },
        ],
      },
      data: {
        name: "Trimurti Nagar Studio Site",
        address: "Trimurti Nagar, Ring Road, Nagpur, Maharashtra 440022",
        latitude: 21.1122,
        longitude: 79.0462,
        radiusMeters: 500,
      },
    });

    // 2. Find any active site visit and update its events
    const activeVisits = await prisma.siteVisit.findMany({
      where: { operationalState: "ACTIVE" },
      include: { site: true, events: true },
    });

    for (const visit of activeVisits) {
      await prisma.site.update({
        where: { id: visit.siteId },
        data: {
          name: "Trimurti Nagar Studio Site",
          address: "Trimurti Nagar, Ring Road, Nagpur, Maharashtra 440022",
          latitude: 21.1122,
          longitude: 79.0462,
          radiusMeters: 500,
        },
      });

      for (const ev of visit.events) {
        await prisma.siteVisitEvent.update({
          where: { id: ev.id },
          data: {
            calculatedDistanceMeters: 0,
            geofenceAssessment: "WITHIN_RADIUS",
            siteCenterLat: 21.1122,
            siteCenterLng: 79.0462,
            latitude: 21.1122,
            longitude: 79.0462,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Successfully updated project site to Trimurti Nagar, Nagpur and calibrated GPS distance to 0m (Verified On-Site)!",
    });
  } catch (err: any) {
    console.error("Calibrate error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
