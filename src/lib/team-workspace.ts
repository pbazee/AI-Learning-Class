import "server-only";

import { randomUUID } from "crypto";
import {
  EntitlementSource,
  EntitlementStatus,
  TeamWorkspaceInviteStatus,
  TeamWorkspaceMemberStatus,
  TeamWorkspaceRole,
  type Prisma,
} from "@prisma/client";
import { normalizeEmail } from "@/lib/admin-email";
import {
  getActiveCatalogEntitlement,
  revokeCatalogEntitlements,
  upsertTeamMemberEntitlement,
} from "@/lib/access-control";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export type TeamAdminContext = {
  workspaceId: string;
  workspaceName: string;
  inviteCode: string;
  seatLimit: number;
  role: TeamWorkspaceRole;
  ownerUserId: string;
  planEndsAt: Date | null;
};

export type TeamWorkspaceDashboardData = {
  workspace: {
    id: string;
    name: string;
    inviteCode: string;
    seatLimit: number;
    seatsUsed: number;
    seatsAvailable: number;
    role: TeamWorkspaceRole;
    planEndsAt: string | null;
  };
  metrics: {
    activeMembers: number;
    pendingInvites: number;
    assignedCourses: number;
    averageProgress: number;
  };
  members: Array<{
    id: string;
    userId: string;
    name: string;
    email: string;
    role: TeamWorkspaceRole;
    status: TeamWorkspaceMemberStatus;
    joinedAt: string;
    assignedCourses: number;
    startedCourses: number;
    completedLessons: number;
    averageProgress: number;
    lastActivity: string | null;
  }>;
  invites: Array<{
    id: string;
    invitedEmail: string | null;
    token: string;
    status: TeamWorkspaceInviteStatus;
    expiresAt: string;
    createdAt: string;
    inviteLink: string;
  }>;
  availableCourses: Array<{
    id: string;
    title: string;
    slug: string;
  }>;
};

function getAppOrigin() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function buildInviteLink(token: string) {
  return `${getAppOrigin()}/team/join/${encodeURIComponent(token)}`;
}

function createInviteCode() {
  return randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
}

function createInviteToken() {
  return randomUUID().replace(/-/g, "");
}

export async function ensureOwnerTeamWorkspace(
  db: DbClient,
  userId: string,
  name?: string | null
) {
  const existingWorkspace = await db.teamWorkspace.findFirst({
    where: { ownerUserId: userId },
    select: {
      id: true,
      name: true,
      inviteCode: true,
      seatLimit: true,
    },
  });

  const workspace =
    existingWorkspace ??
    (await db.teamWorkspace.create({
      data: {
        ownerUserId: userId,
        name: name?.trim() || "AI Learning Class Team",
        inviteCode: createInviteCode(),
        seatLimit: 10,
      },
      select: {
        id: true,
        name: true,
        inviteCode: true,
        seatLimit: true,
      },
    }));

  await db.teamWorkspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId,
      },
    },
    update: {
      role: TeamWorkspaceRole.OWNER,
      status: TeamWorkspaceMemberStatus.ACTIVE,
      revokedAt: null,
    },
    create: {
      workspaceId: workspace.id,
      userId,
      role: TeamWorkspaceRole.OWNER,
      status: TeamWorkspaceMemberStatus.ACTIVE,
      joinedAt: new Date(),
    },
  });

  return workspace;
}

export async function getTeamWorkspaceAdminContext(
  userId: string,
  db: DbClient = prisma
): Promise<TeamAdminContext | null> {
  const now = new Date();
  const membership = await db.teamWorkspaceMember.findFirst({
    where: {
      userId,
      status: TeamWorkspaceMemberStatus.ACTIVE,
      role: {
        in: [TeamWorkspaceRole.OWNER, TeamWorkspaceRole.ADMIN],
      },
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          inviteCode: true,
          seatLimit: true,
          ownerUserId: true,
        },
      },
    },
  });

  if (!membership) {
    return null;
  }

  const ownerEntitlement = await db.userEntitlement.findFirst({
    where: {
      userId: membership.workspace.ownerUserId,
      planSlug: "teams",
      status: EntitlementStatus.ACTIVE,
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
    orderBy: [{ endsAt: "desc" }, { createdAt: "desc" }],
    select: {
      endsAt: true,
    },
  });

  if (!ownerEntitlement) {
    return null;
  }

  return {
    workspaceId: membership.workspace.id,
    workspaceName: membership.workspace.name,
    inviteCode: membership.workspace.inviteCode,
    seatLimit: membership.workspace.seatLimit,
    role: membership.role,
    ownerUserId: membership.workspace.ownerUserId,
    planEndsAt: ownerEntitlement.endsAt ?? null,
  };
}

export async function syncWorkspaceMemberAccessWindow(
  db: DbClient,
  workspaceId: string,
  endsAt: Date | null
) {
  const activeMembers = await db.teamWorkspaceMember.findMany({
    where: {
      workspaceId,
      status: TeamWorkspaceMemberStatus.ACTIVE,
      role: {
        in: [TeamWorkspaceRole.ADMIN, TeamWorkspaceRole.MEMBER],
      },
    },
    select: {
      userId: true,
    },
  });

  if (activeMembers.length === 0) {
    return;
  }

  if (!endsAt) {
    for (const member of activeMembers) {
      await revokeCatalogEntitlements(db, {
        userId: member.userId,
        source: EntitlementSource.TEAM,
        teamWorkspaceId: workspaceId,
      });
    }
    return;
  }

  const startsAt = new Date();

  for (const member of activeMembers) {
    await upsertTeamMemberEntitlement(db, {
      userId: member.userId,
      workspaceId,
      startsAt,
      endsAt,
    });
  }
}

export async function createTeamWorkspaceInvite(
  userId: string,
  email?: string | null
) {
  const context = await getTeamWorkspaceAdminContext(userId);

  if (!context) {
    throw new Error("You need an active Teams workspace to invite members.");
  }

  const normalizedEmail = normalizeEmail(email);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const [activeMembers, pendingInvites, existingUser] = await Promise.all([
    prisma.teamWorkspaceMember.count({
      where: {
        workspaceId: context.workspaceId,
        status: TeamWorkspaceMemberStatus.ACTIVE,
      },
    }),
    prisma.teamWorkspaceInvite.count({
      where: {
        workspaceId: context.workspaceId,
        status: TeamWorkspaceInviteStatus.PENDING,
        expiresAt: { gte: now },
      },
    }),
    normalizedEmail
      ? prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (activeMembers + pendingInvites >= context.seatLimit) {
    throw new Error("Your Teams workspace has reached its current seat limit.");
  }

  if (existingUser) {
    const existingMembership = await prisma.teamWorkspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: context.workspaceId,
          userId: existingUser.id,
        },
      },
      select: { status: true },
    });

    if (existingMembership?.status === TeamWorkspaceMemberStatus.ACTIVE) {
      throw new Error("That teammate already has access to this workspace.");
    }
  }

  const invite = await prisma.teamWorkspaceInvite.create({
    data: {
      workspaceId: context.workspaceId,
      invitedEmail: normalizedEmail || null,
      invitedById: userId,
      token: createInviteToken(),
      status: TeamWorkspaceInviteStatus.PENDING,
      expiresAt,
    },
    select: {
      id: true,
      invitedEmail: true,
      token: true,
      status: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return {
    ...invite,
    inviteLink: buildInviteLink(invite.token),
  };
}

export async function acceptTeamWorkspaceInvite(userId: string, token: string) {
  const normalizedToken = token.trim();
  const now = new Date();
  const [invite, user] = await Promise.all([
    prisma.teamWorkspaceInvite.findUnique({
      where: { token: normalizedToken },
      include: {
        workspace: {
          select: {
            id: true,
            ownerUserId: true,
            name: true,
          },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    }),
  ]);

  if (!invite || !user) {
    throw new Error("That team invite could not be found.");
  }

  if (invite.status !== TeamWorkspaceInviteStatus.PENDING) {
    throw new Error("This invite is no longer available.");
  }

  if (invite.expiresAt < now) {
    await prisma.teamWorkspaceInvite.update({
      where: { id: invite.id },
      data: {
        status: TeamWorkspaceInviteStatus.EXPIRED,
      },
    });
    throw new Error("This invite has expired.");
  }

  if (
    invite.invitedEmail &&
    normalizeEmail(user.email) !== normalizeEmail(invite.invitedEmail)
  ) {
    throw new Error("This invite was issued for a different email address.");
  }

  const ownerEntitlement = await prisma.userEntitlement.findFirst({
    where: {
      userId: invite.workspace.ownerUserId,
      planSlug: "teams",
      status: EntitlementStatus.ACTIVE,
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
    orderBy: [{ endsAt: "desc" }, { createdAt: "desc" }],
    select: {
      endsAt: true,
    },
  });

  if (!ownerEntitlement?.endsAt) {
    throw new Error("This Teams workspace no longer has active billing.");
  }

  const entitlementEndsAt = ownerEntitlement.endsAt;

  await prisma.$transaction(async (transaction) => {
    await transaction.teamWorkspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: invite.workspaceId,
          userId,
        },
      },
      update: {
        role: TeamWorkspaceRole.MEMBER,
        status: TeamWorkspaceMemberStatus.ACTIVE,
        revokedAt: null,
        invitedById: invite.invitedById,
      },
      create: {
        workspaceId: invite.workspaceId,
        userId,
        role: TeamWorkspaceRole.MEMBER,
        status: TeamWorkspaceMemberStatus.ACTIVE,
        invitedById: invite.invitedById,
      },
    });

    await upsertTeamMemberEntitlement(transaction, {
      userId,
      workspaceId: invite.workspaceId,
      startsAt: now,
      endsAt: entitlementEndsAt,
    });

    await transaction.teamWorkspaceInvite.update({
      where: { id: invite.id },
      data: {
        status: TeamWorkspaceInviteStatus.ACCEPTED,
        invitedUserId: userId,
        acceptedAt: now,
      },
    });
  });

  return {
    workspaceName: invite.workspace.name,
    workspaceId: invite.workspace.id,
  };
}

export async function revokeTeamWorkspaceInvite(userId: string, inviteId: string) {
  const context = await getTeamWorkspaceAdminContext(userId);

  if (!context) {
    throw new Error("You need an active Teams workspace to manage invites.");
  }

  await prisma.teamWorkspaceInvite.updateMany({
    where: {
      id: inviteId,
      workspaceId: context.workspaceId,
      status: TeamWorkspaceInviteStatus.PENDING,
    },
    data: {
      status: TeamWorkspaceInviteStatus.REVOKED,
    },
  });
}

export async function revokeTeamWorkspaceMember(userId: string, memberId: string) {
  const context = await getTeamWorkspaceAdminContext(userId);

  if (!context) {
    throw new Error("You need an active Teams workspace to manage members.");
  }

  const member = await prisma.teamWorkspaceMember.findFirst({
    where: {
      id: memberId,
      workspaceId: context.workspaceId,
    },
    select: {
      id: true,
      userId: true,
      role: true,
    },
  });

  if (!member) {
    throw new Error("That teammate could not be found.");
  }

  if (member.role === TeamWorkspaceRole.OWNER) {
    throw new Error("The workspace owner cannot be revoked.");
  }

  const now = new Date();

  await prisma.$transaction(async (transaction) => {
    await transaction.teamWorkspaceMember.update({
      where: { id: member.id },
      data: {
        status: TeamWorkspaceMemberStatus.REVOKED,
        revokedAt: now,
      },
    });

    await revokeCatalogEntitlements(transaction, {
      userId: member.userId,
      source: EntitlementSource.TEAM,
      teamWorkspaceId: context.workspaceId,
      at: now,
    });
  });
}

export async function bulkAssignCoursesToTeamMembers(
  userId: string,
  {
    courseIds,
    memberIds,
  }: {
    courseIds: string[];
    memberIds: string[];
  }
) {
  const context = await getTeamWorkspaceAdminContext(userId);

  if (!context || !context.planEndsAt) {
    throw new Error("You need an active Teams workspace to assign courses.");
  }

  const uniqueCourseIds = Array.from(new Set(courseIds.filter(Boolean)));
  const uniqueMemberIds = Array.from(new Set(memberIds.filter(Boolean)));

  if (uniqueCourseIds.length === 0 || uniqueMemberIds.length === 0) {
    throw new Error("Choose at least one course and one teammate.");
  }

  const [members, courses] = await Promise.all([
    prisma.teamWorkspaceMember.findMany({
      where: {
        workspaceId: context.workspaceId,
        id: { in: uniqueMemberIds },
        status: TeamWorkspaceMemberStatus.ACTIVE,
      },
      select: {
        id: true,
        userId: true,
      },
    }),
    prisma.course.findMany({
      where: {
        id: { in: uniqueCourseIds },
        isPublished: true,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (members.length === 0 || courses.length === 0) {
    throw new Error("The selected teammates or courses are no longer available.");
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.teamCourseAssignment.createMany({
      data: members.flatMap((member) =>
        courses.map((course) => ({
          workspaceId: context.workspaceId,
          courseId: course.id,
          assignedToUserId: member.userId,
          assignedByUserId: userId,
        }))
      ),
      skipDuplicates: true,
    });

    for (const member of members) {
      for (const course of courses) {
        await transaction.enrollment.upsert({
          where: {
            userId_courseId: {
              userId: member.userId,
              courseId: course.id,
            },
          },
          update: {
            status: "ACTIVE",
            expiresAt: context.planEndsAt,
          },
          create: {
            userId: member.userId,
            courseId: course.id,
            status: "ACTIVE",
            expiresAt: context.planEndsAt,
          },
        });
      }
    }
  });
}

export async function getTeamWorkspaceDashboardData(
  userId: string
): Promise<TeamWorkspaceDashboardData | null> {
  const context = await getTeamWorkspaceAdminContext(userId);

  if (!context) {
    return null;
  }

  const now = new Date();
  const workspace = await prisma.teamWorkspace.findUnique({
    where: { id: context.workspaceId },
    include: {
      members: {
        where: {
          status: TeamWorkspaceMemberStatus.ACTIVE,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      },
      invites: {
        where: {
          status: TeamWorkspaceInviteStatus.PENDING,
          expiresAt: { gte: now },
        },
        orderBy: { createdAt: "desc" },
      },
      assignments: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!workspace) {
    return null;
  }

  const memberUserIds = workspace.members.map((member) => member.userId);
  const [progressRows, enrollments, availableCourses] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: {
        userId: { in: memberUserIds },
      },
      select: {
        userId: true,
        isCompleted: true,
        updatedAt: true,
        lesson: {
          select: {
            module: {
              select: {
                courseId: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.enrollment.findMany({
      where: {
        userId: { in: memberUserIds },
        status: { in: ["ACTIVE", "COMPLETED"] },
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
      select: {
        userId: true,
        courseId: true,
      },
    }),
    prisma.course.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        title: true,
        slug: true,
        totalLessons: true,
      },
      orderBy: [{ isFeatured: "desc" }, { title: "asc" }],
    }),
  ]);

  const assignmentCourseIds = workspace.assignments.map((assignment) => assignment.courseId);
  const startedCourseIds = progressRows.map((row) => row.lesson.module.courseId);
  const enrolledCourseIds = enrollments.map((row) => row.courseId);
  const courseIds = Array.from(
    new Set([...assignmentCourseIds, ...startedCourseIds, ...enrolledCourseIds])
  );
  const courseMap = new Map(
    availableCourses
      .filter((course) => courseIds.includes(course.id))
      .map((course) => [course.id, course])
  );

  const assignmentCountByUserId = new Map<string, number>();
  const startedCourseSetByUserId = new Map<string, Set<string>>();
  const completedLessonCountByUserId = new Map<string, number>();
  const totalLessonCountByUserId = new Map<string, number>();
  const lastActivityByUserId = new Map<string, Date>();

  for (const assignment of workspace.assignments) {
    assignmentCountByUserId.set(
      assignment.assignedToUserId,
      (assignmentCountByUserId.get(assignment.assignedToUserId) ?? 0) + 1
    );
    const started = startedCourseSetByUserId.get(assignment.assignedToUserId) ?? new Set<string>();
    started.add(assignment.courseId);
    startedCourseSetByUserId.set(assignment.assignedToUserId, started);
  }

  for (const enrollment of enrollments) {
    const started = startedCourseSetByUserId.get(enrollment.userId) ?? new Set<string>();
    started.add(enrollment.courseId);
    startedCourseSetByUserId.set(enrollment.userId, started);
  }

  for (const row of progressRows) {
    const courseId = row.lesson.module.courseId;
    const started = startedCourseSetByUserId.get(row.userId) ?? new Set<string>();
    started.add(courseId);
    startedCourseSetByUserId.set(row.userId, started);

    if (row.isCompleted) {
      completedLessonCountByUserId.set(
        row.userId,
        (completedLessonCountByUserId.get(row.userId) ?? 0) + 1
      );
    }

    const currentLastActivity = lastActivityByUserId.get(row.userId);
    if (!currentLastActivity || currentLastActivity < row.updatedAt) {
      lastActivityByUserId.set(row.userId, row.updatedAt);
    }
  }

  for (const member of workspace.members) {
    const startedCourses = startedCourseSetByUserId.get(member.userId) ?? new Set<string>();
    let totalLessons = 0;

    for (const courseId of startedCourses) {
      totalLessons += courseMap.get(courseId)?.totalLessons ?? 0;
    }

    totalLessonCountByUserId.set(member.userId, totalLessons);
  }

  const members = workspace.members.map((member) => {
    const completedLessons = completedLessonCountByUserId.get(member.userId) ?? 0;
    const totalLessons = totalLessonCountByUserId.get(member.userId) ?? 0;
    const averageProgress =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      id: member.id,
      userId: member.userId,
      name: member.user.name || "Unnamed member",
      email: member.user.email,
      role: member.role,
      status: member.status,
      joinedAt: member.joinedAt.toISOString(),
      assignedCourses: assignmentCountByUserId.get(member.userId) ?? 0,
      startedCourses: (startedCourseSetByUserId.get(member.userId) ?? new Set<string>()).size,
      completedLessons,
      averageProgress,
      lastActivity: lastActivityByUserId.get(member.userId)?.toISOString() ?? null,
    };
  });

  const averageProgress =
    members.length > 0
      ? Math.round(
          members.reduce((sum, member) => sum + member.averageProgress, 0) / members.length
        )
      : 0;

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      inviteCode: workspace.inviteCode,
      seatLimit: workspace.seatLimit,
      seatsUsed: members.length,
      seatsAvailable: Math.max(workspace.seatLimit - members.length, 0),
      role: context.role,
      planEndsAt: context.planEndsAt?.toISOString() ?? null,
    },
    metrics: {
      activeMembers: members.length,
      pendingInvites: workspace.invites.length,
      assignedCourses: workspace.assignments.length,
      averageProgress,
    },
    members,
    invites: workspace.invites.map((invite) => ({
      id: invite.id,
      invitedEmail: invite.invitedEmail,
      token: invite.token,
      status: invite.status,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
      inviteLink: buildInviteLink(invite.token),
    })),
    availableCourses: availableCourses.map((course) => ({
      id: course.id,
      title: course.title,
      slug: course.slug,
    })),
  };
}

export async function exportTeamWorkspaceCsv(userId: string) {
  const data = await getTeamWorkspaceDashboardData(userId);

  if (!data) {
    throw new Error("You need an active Teams workspace to export reports.");
  }

  const lines = [
    [
      "Name",
      "Email",
      "Role",
      "Assigned Courses",
      "Started Courses",
      "Completed Lessons",
      "Average Progress",
      "Last Activity",
    ].join(","),
    ...data.members.map((member) =>
      [
        member.name,
        member.email,
        member.role,
        member.assignedCourses,
        member.startedCourses,
        member.completedLessons,
        `${member.averageProgress}%`,
        member.lastActivity ?? "",
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];

  return lines.join("\n");
}

export async function getUserTeamWorkspaceSummary(userId: string) {
  const context = await getTeamWorkspaceAdminContext(userId);

  if (!context) {
    return null;
  }

  const entitlement = await getActiveCatalogEntitlement(userId);

  if (entitlement.planSlug !== "teams" && context.role === TeamWorkspaceRole.OWNER) {
    return null;
  }

  return {
    workspaceId: context.workspaceId,
    workspaceName: context.workspaceName,
    role: context.role,
    seatLimit: context.seatLimit,
    planEndsAt: context.planEndsAt?.toISOString() ?? null,
  };
}
