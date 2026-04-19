import type { UserRole } from "@/app/slices/authSlice";
import type { DocumentType } from "@/services";

export function canCreateOrEditDocumentType(
  role: UserRole | null | undefined,
  documentType: DocumentType
): boolean {
  if (role === "ADMIN") {
    return true;
  }

  if (role === "QA") {
    return documentType === "cahier";
  }

  if (role === "BA") {
    return documentType === "fsd";
  }

  return false;
}

export function canCreateAtLeastOneDocument(role: UserRole | null | undefined): boolean {
  return role === "ADMIN" || role === "QA" || role === "BA";
}
