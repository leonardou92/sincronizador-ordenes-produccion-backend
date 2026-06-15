function normalizeDepartment(value: string): string {
  return value.trim().toLowerCase();
}

function getAllowedItDepartments(): Set<string> {
  const main = process.env.LOGIN_IT_DEPARTMENT_NAME?.trim() || "IT";
  const aliases = process.env.LOGIN_IT_DEPARTMENT_ALIASES?.trim() ?? "";

  const names = [main, ...aliases.split(",").map((item) => item.trim())]
    .filter(Boolean)
    .map(normalizeDepartment);

  return new Set(names);
}

export function isItDepartment(department: string | null | undefined): boolean {
  if (!department?.trim()) {
    return false;
  }

  return getAllowedItDepartments().has(normalizeDepartment(department));
}
