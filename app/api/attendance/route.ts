import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const demoClasses = [
  { id: "c-10a", name: "10A" },
  { id: "c-11b", name: "11B" },
];

const demoDivisions = [
  { id: "d-it", name: "IT" },
  { id: "d-hr", name: "HR" },
];

const demoUsers = [
  { id: "u-student-1", name: "Alya Putri", role: "STUDENT", phone: "6281234567800", classId: "c-10a", divisionId: "d-it" },
  { id: "u-teacher-1", name: "Budi Santoso", role: "TEACHER", phone: null, classId: "c-11b", divisionId: "d-hr" },
  { id: "u-staff-1", name: "Chandra Wijaya", role: "STAFF", phone: null, classId: null, divisionId: "d-hr" },
] as const;

const demoAttendance = [
  { id: "a-1", userId: "u-student-1", status: "PRESENT", timestamp: new Date().toISOString(), snapshotUrl: null },
  { id: "a-2", userId: "u-teacher-1", status: "LATE", timestamp: new Date(Date.now() - 1000 * 60 * 40).toISOString(), snapshotUrl: null },
  { id: "a-3", userId: "u-staff-1", status: "PRESENT", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), snapshotUrl: null },
] as const;

const timeframeStart = (timeframe: string | null) => {
  const now = new Date();
  const date = new Date(now);
  switch (timeframe) {
    case "WEEKLY":
      date.setDate(now.getDate() - 7);
      return date;
    case "MONTHLY":
      date.setMonth(now.getMonth() - 1);
      return date;
    case "SEMESTER":
      date.setMonth(now.getMonth() - 6);
      return date;
    case "ACADEMIC_YEAR":
      date.setFullYear(now.getFullYear() - 1);
      return date;
    default:
      return undefined;
  }
};

const mapDemoRecords = () =>
  demoAttendance.map((attendance) => {
    const user = demoUsers.find((candidate) => candidate.id === attendance.userId)!;
    const classData = demoClasses.find((item) => item.id === user.classId) ?? null;
    const divisionData = demoDivisions.find((item) => item.id === user.divisionId) ?? null;
    return {
      ...attendance,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        phone: user.phone,
        class: classData,
        division: divisionData,
      },
    };
  });

const applyFilters = (records: ReturnType<typeof mapDemoRecords>, params: URLSearchParams) => {
  const role = params.get("role");
  const classId = params.get("classId");
  const divisionId = params.get("divisionId");
  const userId = params.get("userId");
  const start = timeframeStart(params.get("timeframe"));

  return records.filter((record) => {
    if (role && record.user.role !== role) return false;
    if (classId && record.user.class?.id !== classId) return false;
    if (divisionId && record.user.division?.id !== divisionId) return false;
    if (userId && record.user.id !== userId) return false;
    if (start && new Date(record.timestamp) < start) return false;
    return true;
  });
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const hasDb = Boolean(process.env.DATABASE_URL);

  if (!hasDb) {
    const records = applyFilters(mapDemoRecords(), params);
    return NextResponse.json({
      records,
      users: demoUsers.map((user) => ({ id: user.id, name: user.name, role: user.role })),
      classes: demoClasses,
      divisions: demoDivisions,
      mockMode: true,
    });
  }

  try {
    const role = params.get("role") || undefined;
    const classId = params.get("classId") || undefined;
    const divisionId = params.get("divisionId") || undefined;
    const userId = params.get("userId") || undefined;
    const start = timeframeStart(params.get("timeframe"));

    const records = await prisma.attendance.findMany({
      where: {
        userId,
        ...(start ? { timestamp: { gte: start } } : {}),
        user: {
          ...(role ? { role: role as any } : {}),
          ...(classId ? { classId } : {}),
          ...(divisionId ? { divisionId } : {}),
        },
      },
      include: {
        user: {
          include: {
            class: true,
            division: true,
          },
        },
      },
      orderBy: { timestamp: "desc" },
    });

    const [users, classes, divisions] = await Promise.all([
      prisma.user.findMany({ select: { id: true, name: true, role: true }, orderBy: { name: "asc" } }),
      prisma.class.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.division.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);

    return NextResponse.json({ records, users, classes, divisions, mockMode: false });
  } catch {
    // Safe fallback for first deployment if database migration/setup is incomplete.
    const records = applyFilters(mapDemoRecords(), params);
    return NextResponse.json({
      records,
      users: demoUsers.map((user) => ({ id: user.id, name: user.name, role: user.role })),
      classes: demoClasses,
      divisions: demoDivisions,
      mockMode: true,
      warning: "Database query failed. Returned demo dataset.",
    });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.userId !== "string" || !body.userId.trim()) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const status = body.status;
  if (status !== "PRESENT" && status !== "LATE") {
    return NextResponse.json({ error: "status must be PRESENT or LATE" }, { status: 400 });
  }

  const hasDb = Boolean(process.env.DATABASE_URL);
  const timestamp = body.timestamp ? new Date(body.timestamp) : new Date();

  if (!hasDb) {
    const user = demoUsers.find((candidate) => candidate.id === body.userId);
    if (!user) {
      return NextResponse.json({ error: "Unknown user in mock mode" }, { status: 404 });
    }

    return NextResponse.json(
      {
        record: {
          id: `mock-${Date.now()}`,
          userId: user.id,
          status,
          timestamp: timestamp.toISOString(),
          snapshotUrl: typeof body.snapshotUrl === "string" ? body.snapshotUrl : null,
          user: {
            id: user.id,
            name: user.name,
            role: user.role,
          },
        },
        mockMode: true,
      },
      { status: 201 },
    );
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const record = await prisma.attendance.create({
      data: {
        userId: body.userId,
        status,
        timestamp,
        snapshotUrl: typeof body.snapshotUrl === "string" ? body.snapshotUrl : null,
      },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return NextResponse.json({ record, mockMode: false }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save attendance" }, { status: 500 });
  }
}
