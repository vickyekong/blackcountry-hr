import { prisma } from "@/lib/db";
import type { ChangeRequestType, Prisma } from "@prisma/client";
import { payrollApproverCompanyIds } from "@/lib/tenancy/workspace";

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function validateChangePayload(
  type: ChangeRequestType,
  payload: Record<string, unknown>
): { ok: true; normalized: Record<string, string> } | { ok: false; error: string } {
  if (type === "BANK") {
    const bankName = String(payload.bankName ?? "").trim();
    const bankAccountNumber = digitsOnly(String(payload.bankAccountNumber ?? ""));
    if (!bankName) return { ok: false, error: "Bank name is required" };
    if (bankAccountNumber.length !== 10) {
      return { ok: false, error: "NUBAN account number must be 10 digits" };
    }
    return { ok: true, normalized: { bankName, bankAccountNumber } };
  }

  if (type === "TAX_RELIEF") {
    const tin = String(payload.tin ?? "").trim();
    const annualRent = String(payload.annualRentNaira ?? "").trim();
    const rent = Number(annualRent);
    if (tin && tin.length < 5) {
      return { ok: false, error: "TIN looks too short" };
    }
    if (annualRent && (Number.isNaN(rent) || rent < 0)) {
      return { ok: false, error: "Annual rent must be a valid amount" };
    }
    if (!tin && !annualRent) {
      return { ok: false, error: "Provide TIN and/or annual rent for relief" };
    }
    return {
      ok: true,
      normalized: {
        ...(tin ? { tin } : {}),
        ...(annualRent ? { annualRentNaira: String(rent) } : {}),
      },
    };
  }

  if (type === "NEXT_OF_KIN") {
    const nextOfKinName = String(payload.nextOfKinName ?? "").trim();
    const nextOfKinPhone = String(payload.nextOfKinPhone ?? "").trim();
    if (!nextOfKinName || !nextOfKinPhone) {
      return { ok: false, error: "Next of kin name and phone are required" };
    }
    return { ok: true, normalized: { nextOfKinName, nextOfKinPhone } };
  }

  if (type === "GENERAL") {
    const subject = String(payload.subject ?? "").trim();
    const message = String(payload.message ?? "").trim();
    if (subject.length < 3) {
      return { ok: false, error: "Give your request a short subject" };
    }
    if (message.length < 8) {
      return { ok: false, error: "Describe what you need from the company" };
    }
    return { ok: true, normalized: { subject, message } };
  }

  const addressLine = String(payload.addressLine ?? "").trim();
  if (!addressLine || addressLine.length < 8) {
    return { ok: false, error: "Provide a full residential address" };
  }
  return { ok: true, normalized: { addressLine } };
}

export async function submitChangeRequest(options: {
  companyId: string;
  employeeId: string;
  type: ChangeRequestType;
  payload: Record<string, unknown>;
  note?: string;
}) {
  const validated = validateChangePayload(options.type, options.payload);
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const pending =
    options.type === "GENERAL"
      ? null
      : await prisma.employeeChangeRequest.findFirst({
          where: {
            employeeId: options.employeeId,
            type: options.type,
            status: "PENDING",
          },
        });
  if (pending) {
    throw new Error("You already have a pending request of this type");
  }

  return prisma.employeeChangeRequest.create({
    data: {
      companyId: options.companyId,
      employeeId: options.employeeId,
      type: options.type,
      payload: validated.normalized as Prisma.InputJsonValue,
      note: options.note,
      status: "PENDING",
    },
  });
}

export async function notifySuperAdminOfChangeRequest(options: {
  companyId: string;
  requestId: string;
  employeeName: string;
  type: string;
  submittedByName?: string;
}) {
  const recipientCompanyIds = await payrollApproverCompanyIds(options.companyId);
  const admins = await prisma.user.findMany({
    where: {
      companyId: { in: recipientCompanyIds },
      role: "SUPER_ADMIN",
    },
    select: { id: true },
  });

  const who = options.submittedByName
    ? options.submittedByName
    : "Staff";
  const title = "Change request awaiting your approval";
  const body = `${who} submitted a ${options.type.replace(/_/g, " ").toLowerCase()} update for ${options.employeeName}. Approve or reject in HR Ask.`;
  const linkUrl = `/hr-ask?tab=changes`;

  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((u) => ({
      companyId: options.companyId,
      userId: u.id,
      type: "CHANGE_REQUEST",
      title,
      body,
      linkUrl,
      entityType: "EmployeeChangeRequest",
      entityId: options.requestId,
    })),
  });
}

/** @deprecated use notifySuperAdminOfChangeRequest */
export async function notifyHrOfChangeRequest(options: {
  companyId: string;
  requestId: string;
  employeeName: string;
  type: string;
}) {
  return notifySuperAdminOfChangeRequest(options);
}

const HR_REVIEWABLE = new Set(["NEXT_OF_KIN", "ADDRESS", "GENERAL"]);

/** Staff-submitted requests: HR for personal/general, Super Admin for bank/tax. */
export async function notifyReviewersOfChangeRequest(options: {
  companyId: string;
  requestId: string;
  employeeName: string;
  type: string;
  submittedByName: string;
  fromStaff: boolean;
}) {
  const roles = HR_REVIEWABLE.has(options.type)
    ? (["HR_ADMIN", "SUPER_ADMIN"] as const)
    : (["SUPER_ADMIN"] as const);

  const recipientCompanyIds = await payrollApproverCompanyIds(options.companyId);
  const reviewers = await prisma.user.findMany({
    where: {
      companyId: { in: recipientCompanyIds },
      role: { in: [...roles] },
    },
    select: { id: true },
  });
  if (reviewers.length === 0) return;

  const who = options.fromStaff
    ? `${options.employeeName} (staff portal)`
    : `HR (${options.submittedByName})`;
  const title = "Request awaiting review";
  const body = `${who} submitted a ${options.type.replace(/_/g, " ").toLowerCase()} request. Open HR Ask to approve or send back.`;

  await prisma.notification.createMany({
    data: reviewers.map((u) => ({
      companyId: options.companyId,
      userId: u.id,
      type: "CHANGE_REQUEST",
      title,
      body,
      linkUrl: "/hr-ask?tab=changes",
      entityType: "EmployeeChangeRequest",
      entityId: options.requestId,
    })),
  });
}

export async function notifyEmployeeOfChangeReview(options: {
  employeeId: string;
  companyId: string;
  requestId: string;
  type: string;
  action: "approve" | "reject";
  reviewNote?: string;
}) {
  const user = await prisma.user.findFirst({
    where: {
      employeeId: options.employeeId,
      companyId: options.companyId,
      role: "EMPLOYEE",
    },
    select: { id: true },
  });
  if (!user) return;

  const label = options.type.replace(/_/g, " ").toLowerCase();
  const approved = options.action === "approve";
  await prisma.notification.create({
    data: {
      companyId: options.companyId,
      userId: user.id,
      type: "CHANGE_REQUEST_REVIEW",
      title: approved
        ? `Your ${label} request was approved`
        : `Your ${label} request was sent back`,
      body: options.reviewNote
        ? options.reviewNote
        : approved
          ? "HR / Super Admin approved your request."
          : "HR / Super Admin sent this request back. Open Requests for details.",
      linkUrl: "/staff/requests",
      entityType: "EmployeeChangeRequest",
      entityId: options.requestId,
    },
  });
}

export async function reviewChangeRequest(options: {
  companyId: string;
  requestId: string;
  reviewerId: string;
  action: "approve" | "reject";
  reviewNote?: string;
}) {
  const req = await prisma.employeeChangeRequest.findFirst({
    where: { id: options.requestId, companyId: options.companyId },
  });
  if (!req) throw new Error("Request not found");
  if (req.status !== "PENDING") throw new Error("Request is not pending");

  if (options.action === "reject") {
    return prisma.employeeChangeRequest.update({
      where: { id: req.id },
      data: {
        status: "REJECTED",
        reviewedById: options.reviewerId,
        reviewedAt: new Date(),
        reviewNote: options.reviewNote,
      },
    });
  }

  const payload = req.payload as Record<string, string>;

  if (req.type === "BANK") {
    await prisma.employee.update({
      where: { id: req.employeeId },
      data: {
        bankName: payload.bankName,
        bankAccountNumber: payload.bankAccountNumber,
      },
    });
  } else if (req.type === "TAX_RELIEF") {
    await prisma.employee.update({
      where: { id: req.employeeId },
      data: {
        ...(payload.tin ? { tin: payload.tin } : {}),
        ...(payload.annualRentNaira
          ? {
              annualRentKobo: BigInt(
                Math.round(Number(payload.annualRentNaira) * 100)
              ),
            }
          : {}),
      },
    });
  } else if (req.type === "NEXT_OF_KIN") {
    await prisma.employee.update({
      where: { id: req.employeeId },
      data: {
        nextOfKinName: payload.nextOfKinName,
        nextOfKinPhone: payload.nextOfKinPhone,
      },
    });
  } else if (req.type === "ADDRESS") {
    await prisma.employee.update({
      where: { id: req.employeeId },
      data: { addressLine: payload.addressLine },
    });
  }

  return prisma.employeeChangeRequest.update({
    where: { id: req.id },
    data: {
      status: "APPROVED",
      reviewedById: options.reviewerId,
      reviewedAt: new Date(),
      reviewNote: options.reviewNote,
    },
  });
}
