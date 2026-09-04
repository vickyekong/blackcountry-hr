export const staffSelect = {
  id: true,
  firstName: true,
  lastName: true,
  employeeCode: true,
} as const;

export const projectInclude = {
  manager: { select: staffSelect },
  members: {
    include: { employee: { select: staffSelect } },
    orderBy: { createdAt: "asc" as const },
  },
  tasks: {
    orderBy: { name: "asc" as const },
    include: {
      assignee: { select: staffSelect },
      comments: {
        orderBy: { createdAt: "desc" as const },
        take: 20,
        include: { author: { select: { id: true, name: true } } },
      },
      attachments: {
        select: { id: true, name: true, createdAt: true },
        orderBy: { createdAt: "desc" as const },
      },
    },
  },
} as const;
