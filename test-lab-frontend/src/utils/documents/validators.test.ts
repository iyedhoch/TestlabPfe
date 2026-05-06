import { describe, expect, it } from "vitest";
import {
  validateCahierPayload,
  validateCahierWorkflowContext,
  validateFsdPayload,
  validateFsdWorkflowContext,
} from "./validators";

describe("validateFsdWorkflowContext", () => {
  it("returns valid for a correct FSD workflow context", () => {
    const result = validateFsdWorkflowContext({
      selectedProjectId: "project-1",
      workflowProjectId: "project-1",
      workflowDocumentType: "fsd",
      selectedEpicIds: ["epic-1"],
    });

    expect(result).toEqual({ isValid: true });
  });

  it("fails when project is missing", () => {
    const result = validateFsdWorkflowContext({
      selectedProjectId: undefined,
      workflowProjectId: "project-1",
      workflowDocumentType: "fsd",
      selectedEpicIds: ["epic-1"],
    });

    expect(result.isValid).toBe(false);
    expect(result.message).toContain("Aucun projet selectionne");
  });

  it("fails when no epics are selected", () => {
    const result = validateFsdWorkflowContext({
      selectedProjectId: "project-1",
      workflowProjectId: "project-1",
      workflowDocumentType: "fsd",
      selectedEpicIds: [],
    });

    expect(result.isValid).toBe(false);
    expect(result.message).toContain("Aucun epic selectionne");
  });
});

describe("validateCahierWorkflowContext", () => {
  it("returns valid for a correct Cahier workflow context", () => {
    const result = validateCahierWorkflowContext({
      selectedProjectId: "project-1",
      workflowProjectId: "project-1",
      workflowDocumentType: "cahier",
      selectedSuiteIds: ["suite-1"],
    });

    expect(result).toEqual({ isValid: true });
  });

  it("fails when document type is incorrect", () => {
    const result = validateCahierWorkflowContext({
      selectedProjectId: "project-1",
      workflowProjectId: "project-1",
      workflowDocumentType: "fsd",
      selectedSuiteIds: ["suite-1"],
    });

    expect(result.isValid).toBe(false);
    expect(result.message).toContain("n'est pas un cahier");
  });

  it("fails when no suites are selected", () => {
    const result = validateCahierWorkflowContext({
      selectedProjectId: "project-1",
      workflowProjectId: "project-1",
      workflowDocumentType: "cahier",
      selectedSuiteIds: [],
    });

    expect(result.isValid).toBe(false);
    expect(result.message).toContain("Aucune suite selectionnee");
  });
});

describe("validateFsdPayload", () => {
  const validPayload = {
    title: "FSD",
    projectName: "Project A",
    clientName: "Client A",
    date: "2026-04-12",
    authors: ["Author"],
    purpose: "Purpose",
    approvals: [],
    referenceDocuments: [],
  };

  it("returns valid when all required fields are present", () => {
    expect(validateFsdPayload(validPayload)).toEqual({ isValid: true });
  });

  it("fails when title is empty", () => {
    const result = validateFsdPayload({ ...validPayload, title: "   " });

    expect(result.isValid).toBe(false);
    expect(result.message).toContain("titre du document est obligatoire");
  });

  it("fails when one approval is incomplete", () => {
    const result = validateFsdPayload({
      ...validPayload,
      approvals: [{ name: "QA Lead", role: "Approver", date: "" }],
    });

    expect(result.isValid).toBe(false);
    expect(result.message).toContain("Chaque approbation doit contenir");
  });

  it("fails when one reference document is incomplete", () => {
    const result = validateFsdPayload({
      ...validPayload,
      referenceDocuments: [
        { name: "Spec source", type: "Lien", attachment: "" },
      ],
    });

    expect(result.isValid).toBe(false);
    expect(result.message).toContain("Chaque document de reference doit contenir");
  });

  it("fails when no metadata author exists", () => {
    const result = validateFsdPayload({ ...validPayload, authors: ["  "] });

    expect(result.isValid).toBe(false);
    expect(result.message).toContain("Ajoutez au moins un auteur");
  });
});

describe("validateCahierPayload", () => {
  const validApproval = {
    approverName: "Approver",
    approverRole: "Role",
    approvalDate: "2026-04-12",
  };

  const validPayload = {
    title: "Cahier",
    projectName: "Project A",
    clientName: "Client A",
    date: "2026-04-12",
    authors: ["Author"],
    approvals: [validApproval],
  };

  it("returns valid when all required fields are present", () => {
    expect(validateCahierPayload(validPayload)).toEqual({ isValid: true });
  });

  it("returns valid when approvals are empty", () => {
    const result = validateCahierPayload({ ...validPayload, approvals: [] });

    expect(result.isValid).toBe(true);
  });

  it("fails when one approval is incomplete", () => {
    const result = validateCahierPayload({
      ...validPayload,
      approvals: [{ ...validApproval, approverRole: "" }],
    });

    expect(result.isValid).toBe(false);
    expect(result.message).toContain("Chaque approbation doit contenir");
  });

  it("fails when no metadata author exists", () => {
    const result = validateCahierPayload({ ...validPayload, authors: [] });

    expect(result.isValid).toBe(false);
    expect(result.message).toContain("Ajoutez au moins un auteur");
  });
});
