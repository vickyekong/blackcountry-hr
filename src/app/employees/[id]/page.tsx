import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Badge, employeeStatusVariant } from "@/components/ui/badge";
import { employeeFullName } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  employeeSexLabel,
  employeeStatusLabel,
} from "@/lib/employees/status";
import { StaffPortalCard } from "@/components/employees/staff-portal-card";
import { EmployeeRecordHub } from "@/components/employees/employee-record-hub";
import { ensureStaffPortalSchema } from "@/lib/ensure-staff-portal-schema";
import { ensurePeopleSchema } from "@/lib/ensure-people-schema";
import { can } from "@/lib/permissions";

export default async function EmployeeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  await ensureStaffPortalSchema();
  await ensurePeopleSchema();
  const employee = await prisma.employee.findFirst({
    where: { id: params.id, companyId: session!.user.companyId },
    include: {
      leaveBalances: true,
      user: { select: { email: true, role: true } },
      manager: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          jobTitle: true,
        },
      },
    },
  });

  if (!employee) notFound();

  const canManage = can(session!.user.role, "manageEmployees");

  return (
    <AppShell>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">{employee.employeeCode}</p>
          <h1 className="text-2xl font-semibold text-ink">
            {employeeFullName(employee.firstName, employee.lastName)}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {employee.jobTitle} · {employee.department}
            {employee.sex ? ` · ${employeeSexLabel(employee.sex)}` : ""}
          </p>
        </div>
        <Badge variant={employeeStatusVariant(employee.status)}>
          {employeeStatusLabel(employee.status)}
        </Badge>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {canManage && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/employees/${employee.id}/edit`}>Edit employee</Link>
          </Button>
        )}
      </div>

      <StaffPortalCard
        employeeId={employee.id}
        employmentType={employee.employmentType}
        portalEmail={
          employee.user?.role === "EMPLOYEE" ? employee.user.email : null
        }
        suggestedEmail={employee.workEmail}
      />

      <div className="mt-8">
        <EmployeeRecordHub
          canManage={canManage}
          canReview={can(session!.user.role, "viewEmployees")}
          employee={{
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            department: employee.department,
            jobTitle: employee.jobTitle,
            employmentType: employee.employmentType,
            status: employee.status,
            sex: employee.sex,
            startDate: employee.startDate.toISOString(),
            endDate: employee.endDate?.toISOString() ?? null,
            dateOfBirth: employee.dateOfBirth?.toISOString() ?? null,
            probationEnd: employee.probationEnd?.toISOString() ?? null,
            workLocation: employee.workLocation,
            phone: employee.phone,
            workEmail: employee.workEmail,
            addressLine: employee.addressLine,
            nextOfKinName: employee.nextOfKinName,
            nextOfKinPhone: employee.nextOfKinPhone,
            emergencyContactName: employee.emergencyContactName,
            emergencyContactPhone: employee.emergencyContactPhone,
            tin: employee.tin,
            rsaPin: employee.rsaPin,
            nhfNumber: employee.nhfNumber,
            bankName: employee.bankName,
            bankAccountNumber: employee.bankAccountNumber,
            basicSalaryKobo: employee.basicSalaryKobo.toString(),
            housingAllowanceKobo: employee.housingAllowanceKobo.toString(),
            transportAllowanceKobo: employee.transportAllowanceKobo.toString(),
            otherTaxableAllowancesKobo:
              employee.otherTaxableAllowancesKobo.toString(),
            manager: employee.manager,
            leaveBalances: employee.leaveBalances.map((b) => ({
              id: b.id,
              leaveType: b.leaveType,
              entitledDays: b.entitledDays,
              usedDays: b.usedDays,
            })),
          }}
        />
      </div>
    </AppShell>
  );
}
