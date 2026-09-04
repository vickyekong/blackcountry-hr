export function goalsWhereForEmployee(
  companyId: string,
  employee: { id: string; department: string },
  year?: number
) {
  return {
    companyId,
    ...(year ? { periodYear: year } : {}),
    OR: [
      { employeeId: employee.id },
      { scope: "COMPANY" },
      { scope: "DEPARTMENT", department: employee.department },
    ],
  };
}
