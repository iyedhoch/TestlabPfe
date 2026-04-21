import { Flex, Text, Box, Input, Textarea, Button, VStack, HStack, FormControl, FormLabel, Divider, Badge, Select, Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectedProjectSelector } from "@/app/slices/projectSlice";
import {
  documentWorkflowDetailsSelector,
  documentWorkflowEditContextSelector,
  documentWorkflowSelectionSelector,
  setFsdWorkflowDetails,
} from "@/app/slices/documentWorkflowSlice";
import { authRoleSelector, authUsernameSelector } from "@/app/slices/authSlice";
import {
  DocumentStatus,
  IFsdApprovalInput,
  IFsdGlossaryInput,
  IFsdReferenceDocumentInput,
  IFsdRevisionInput,
  useGenerateFsdDocumentMutation,
  useGetFsdSelectionEpicsQuery,
  useListDocumentVersionsQuery,
} from "@/services";
import { colors } from "@/theme/colors";
import { useNavigate } from "react-router-dom";
import { ErrorBanner } from "@/components";
import {
  validateFsdPayload,
  validateFsdWorkflowContext,
} from "@/utils/documents/validators";
import { getDocumentErrorMessage } from "@/utils/documents/error-normalizer";
import { WorkflowStepBar } from "@/components";
import { canCreateOrEditDocumentType } from "@/utils/auth/permissions";

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultFsdPurpose(projectName?: string, projectDescription?: string): string {
  if (projectDescription?.trim()) {
    return projectDescription.trim();
  }

  if (projectName?.trim()) {
    return `Ce document de specification fonctionnelle definit le perimetre et les besoins du projet ${projectName}.`;
  }

  return "Ce document de specification fonctionnelle definit le perimetre et les besoins du projet.";
}

function normalizeAuthors(authors?: string[], author?: string): string[] {
  const normalized = (authors || [])
    .map((item) => (item || "").trim())
    .filter((item) => item.length > 0);

  if (normalized.length > 0) {
    return normalized;
  }

  if (author?.trim()) {
    return [author.trim()];
  }

  return [""];
}

function normalizeEditableAuthors(authors?: string[], author?: string): string[] {
  if (Array.isArray(authors) && authors.length > 0) {
    return authors.map((item) => (typeof item === "string" ? item : ""));
  }

  if (author?.trim()) {
    return [author.trim()];
  }

  return [""];
}

function joinAuthors(authors: string[]): string {
  return authors
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .join("; ");
}

function hasAtLeastOneAuthor(authors: string[]): boolean {
  return authors.some((item) => item.trim().length > 0);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeApprovalItems(value: unknown): IFsdApprovalInput[] {
  return asArray<Partial<IFsdApprovalInput>>(value).map((item) => ({
    name: typeof item?.name === "string" ? item.name : "",
    role: typeof item?.role === "string" ? item.role : "",
    date: typeof item?.date === "string" ? item.date : getTodayIsoDate(),
  }));
}

function normalizeReferenceDocumentItems(
  value: unknown
): IFsdReferenceDocumentInput[] {
  return asArray<Partial<IFsdReferenceDocumentInput>>(value).map((item) => ({
    name: typeof item?.name === "string" ? item.name : "",
    type: typeof item?.type === "string" ? item.type : "",
    attachment: typeof item?.attachment === "string" ? item.attachment : "",
  }));
}

function normalizeGlossaryItems(value: unknown): IFsdGlossaryInput[] {
  return asArray<Partial<IFsdGlossaryInput>>(value).map((item) => ({
    term: typeof item?.term === "string" ? item.term : "",
    comment: typeof item?.comment === "string" ? item.comment : "",
  }));
}

function normalizeRevisionItems(value: unknown): IFsdRevisionInput[] {
  return asArray<Partial<IFsdRevisionInput>>(value).map((item) => ({
    date: typeof item?.date === "string" ? item.date : getTodayIsoDate(),
    version: typeof item?.version === "string" ? item.version : "",
    status: typeof item?.status === "string" ? item.status : "",
    authors: normalizeEditableAuthors(
      Array.isArray(item?.authors) ? (item.authors as string[]) : undefined,
      typeof item?.author === "string" ? item.author : undefined
    ),
    author: typeof item?.author === "string" ? item.author : undefined,
  }));
}

export default function FsdCreationPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selectedProject = useSelector(selectedProjectSelector);
  const workflowSelection = useSelector(documentWorkflowSelectionSelector);
  const workflowDetails = useSelector(documentWorkflowDetailsSelector);
  const workflowEditContext = useSelector(documentWorkflowEditContextSelector);
  const authUsername = useSelector(authUsernameSelector);
  const authRole = useSelector(authRoleSelector);
  const generateFsdDocumentMutation = useGenerateFsdDocumentMutation();
  const fsdEpicsQuery = useGetFsdSelectionEpicsQuery(selectedProject?.id, Boolean(selectedProject?.id));
  const projectVersionsQuery = useListDocumentVersionsQuery(
    selectedProject?.id,
    Boolean(selectedProject?.id)
  );

  // Form state
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("1");
  const [date, setDate] = useState(getTodayIsoDate());
  const [authors, setAuthors] = useState<string[]>([""]);
  const [status, setStatus] = useState<DocumentStatus>("En cours");
  const [purpose, setPurpose] = useState("");
  const [projectOverview, setProjectOverview] = useState("");
  const [methodology, setMethodology] = useState("");
  const [revisions, setRevisions] = useState<IFsdRevisionInput[]>([]);
  const [approvals, setApprovals] = useState<IFsdApprovalInput[]>([]);
  const [referenceDocuments, setReferenceDocuments] = useState<IFsdReferenceDocumentInput[]>([]);
  const [glossary, setGlossary] = useState<IFsdGlossaryInput[]>([]);
  const [submitError, setSubmitError] = useState("");
  const [isVersionTouched, setIsVersionTouched] = useState(false);
  const prefilledSourceIdRef = useRef<string | null>(null);
  const hydratedProjectIdRef = useRef<string | null>(null);

  const selectedEpicNames = useMemo(() => {
    const epicNameById = new Map(
      (fsdEpicsQuery.data || []).map((epic) => [epic.id, epic.name])
    );

    return (workflowSelection.selectedEpicIds || []).map(
      (epicId) => epicNameById.get(epicId) || epicId
    );
  }, [fsdEpicsQuery.data, workflowSelection.selectedEpicIds]);

  const nextFsdVersionNumber = useMemo(() => {
    if (workflowEditContext.mode === "edit" && workflowEditContext.sourceVersionNumber) {
      return workflowEditContext.sourceVersionNumber + 1;
    }

    const versions = projectVersionsQuery.data || [];
    const fsdVersions = versions.filter((item) => item.documentType === "fsd");
    if (fsdVersions.length === 0) {
      return 1;
    }

    const maxVersion = Math.max(...fsdVersions.map((item) => item.versionNumber));
    return maxVersion + 1;
  }, [projectVersionsQuery.data, workflowEditContext.mode, workflowEditContext.sourceVersionNumber]);

  // Initialize form with project data (only on project change, not every Redux update)
  useEffect(() => {
    if (selectedProject) {
      // Only hydrate if we haven't hydrated for this project yet
      if (hydratedProjectIdRef.current === selectedProject.id) {
        return;
      }
      hydratedProjectIdRef.current = selectedProject.id;

      const persistedDetails = workflowDetails.fsd;
      const hasPersistedDataForProject =
        workflowSelection.projectId === selectedProject.id &&
        persistedDetails &&
        typeof persistedDetails.projectName === "string" &&
        persistedDetails.projectName.trim().length > 0;

      if (hasPersistedDataForProject) {
        setProjectName(persistedDetails.projectName || "");
        setClientName(persistedDetails.clientName || "");
        setTitle(persistedDetails.title || "");
        setDate(persistedDetails.date || getTodayIsoDate());
        setAuthors(normalizeAuthors(persistedDetails.authors, persistedDetails.author));
        setStatus(persistedDetails.status || "En cours");
        setPurpose(persistedDetails.purpose || "");
        setProjectOverview(persistedDetails.projectOverview || "");
        setMethodology(persistedDetails.methodology || "");
        setApprovals(normalizeApprovalItems(persistedDetails.approvals));
        setReferenceDocuments(
          normalizeReferenceDocumentItems(persistedDetails.referenceDocuments)
        );
        setGlossary(normalizeGlossaryItems(persistedDetails.glossary));
        setRevisions(normalizeRevisionItems(persistedDetails.revisions));
        setVersion(persistedDetails.version || "1");
        return;
      }

      setProjectName(selectedProject.name || "");
      setClientName((selectedProject as { clientName?: string })?.clientName || selectedProject.name || "");
      setTitle(`FSD - ${selectedProject.name}`);
      setPurpose(
        getDefaultFsdPurpose(
          selectedProject.name,
          (selectedProject as { description?: string })?.description
        )
      );
      setProjectOverview((selectedProject as { description?: string })?.description || "");
    }
  }, [selectedProject, workflowSelection.projectId]);

  useEffect(() => {
    if (isVersionTouched) {
      return;
    }

    setVersion(String(nextFsdVersionNumber));
  }, [isVersionTouched, nextFsdVersionNumber]);

  useEffect(() => {
    if (workflowEditContext.mode !== "edit" || !workflowEditContext.payloadSnapshot) {
      prefilledSourceIdRef.current = null;
      setStatus("En cours");
      setIsVersionTouched(false);
      return;
    }

    if (prefilledSourceIdRef.current === workflowEditContext.sourceVersionId) {
      return;
    }
    prefilledSourceIdRef.current = workflowEditContext.sourceVersionId;

    const payload = workflowEditContext.payloadSnapshot as Record<string, unknown>;
    setProjectName((payload.projectName as string) || "");
    setClientName((payload.clientName as string) || "");
    setTitle((payload.title as string) || "");
    setDate((payload.date as string) || getTodayIsoDate());
    setAuthors(normalizeAuthors(payload.authors as string[] | undefined, payload.author as string | undefined));
    setPurpose((payload.purpose as string) || "");
    setProjectOverview((payload.projectOverview as string) || "");
    setMethodology((payload.methodology as string) || "");
    setApprovals(normalizeApprovalItems(payload.approvals));
    setReferenceDocuments(normalizeReferenceDocumentItems(payload.referenceDocuments));
    setGlossary(normalizeGlossaryItems(payload.glossary));
    setRevisions(normalizeRevisionItems(payload.revisions));
    setStatus((payload.status as DocumentStatus) || workflowEditContext.status || "En cours");
    setVersion(String(nextFsdVersionNumber));
    setIsVersionTouched(false);
  }, [
    nextFsdVersionNumber,
    workflowEditContext.mode,
    workflowEditContext.payloadSnapshot,
    workflowEditContext.sourceVersionId,
    workflowEditContext.status,
  ]);

  useEffect(() => {
    if (!authUsername) {
      return;
    }

    setAuthors((prev) => {
      if (prev.some((item) => item.trim().length > 0)) {
        return prev;
      }

      return authUsername ? [authUsername] : prev;
    });
  }, [authUsername]);

  useEffect(() => {
    if (!canCreateOrEditDocumentType(authRole, "fsd")) {
      navigate("/document-generation");
      return;
    }

    const workflowValidation = validateFsdWorkflowContext({
      selectedProjectId: selectedProject?.id,
      workflowProjectId: workflowSelection?.projectId,
      workflowDocumentType: workflowSelection?.documentType,
      selectedEpicIds: workflowSelection?.selectedEpicIds || [],
    });

    if (!workflowValidation.isValid) {
      navigate("/document-generation/Selection-du-contenu");
    }
  }, [authRole, navigate, selectedProject?.id, workflowSelection]);

  useEffect(() => {
    if (!selectedProject?.id || workflowSelection.documentType !== "fsd") {
      return;
    }

    dispatch(
      setFsdWorkflowDetails({
        projectName,
        clientName,
        title,
        version,
        date,
        authors,
        status,
        purpose,
        projectOverview,
        methodology,
        approvals,
        referenceDocuments,
        glossary,
        revisions,
      })
    );
  }, [
    approvals,
    authors,
    clientName,
    date,
    dispatch,
    glossary,
    methodology,
    projectName,
    projectOverview,
    purpose,
    referenceDocuments,
    revisions,
    selectedProject?.id,
    status,
    title,
    version,
    workflowSelection.documentType,
  ]);

  const addApproval = () => {
    setApprovals((prev) => [
      ...prev,
      {
        name: "",
        role: "",
        date: getTodayIsoDate(),
      },
    ]);
  };

  const addRevision = () => {
    setRevisions((prev) => [
      ...prev,
      {
        date: getTodayIsoDate(),
        version: "",
        status: "",
        authors: [""],
      },
    ]);
  };

  const updateRevision = (
    index: number,
    field: "date" | "version" | "status",
    value: string
  ) => {
    setRevisions((prev) =>
      prev.map((revision, currentIndex) =>
        currentIndex === index ? { ...revision, [field]: value } : revision
      )
    );
  };

  const addMetadataAuthor = () => {
    setAuthors((prev) => [...prev, ""]);
  };

  const updateMetadataAuthor = (index: number, value: string) => {
    setAuthors((prev) =>
      prev.map((item, currentIndex) => (currentIndex === index ? value : item))
    );
  };

  const removeMetadataAuthor = (index: number) => {
    setAuthors((prev) => (prev.length <= 1 ? prev : prev.filter((_, currentIndex) => currentIndex !== index)));
  };

  const addRevisionAuthor = (revisionIndex: number) => {
    setRevisions((prev) =>
      prev.map((revision, currentIndex) =>
        currentIndex === revisionIndex
          ? {
              ...revision,
              authors: [...normalizeEditableAuthors(revision.authors, revision.author), ""],
            }
          : revision
      )
    );
  };

  const updateRevisionAuthor = (
    revisionIndex: number,
    authorIndex: number,
    value: string
  ) => {
    setRevisions((prev) =>
      prev.map((revision, currentIndex) => {
        if (currentIndex !== revisionIndex) {
          return revision;
        }

        const nextAuthors = normalizeEditableAuthors(revision.authors, revision.author).map(
          (item, currentAuthorIndex) =>
            currentAuthorIndex === authorIndex ? value : item
        );

        return {
          ...revision,
          authors: nextAuthors,
        };
      })
    );
  };

  const removeRevisionAuthor = (revisionIndex: number, authorIndex: number) => {
    setRevisions((prev) =>
      prev.map((revision, currentIndex) => {
        if (currentIndex !== revisionIndex) {
          return revision;
        }

        const existing = normalizeEditableAuthors(revision.authors, revision.author);
        if (existing.length <= 1) {
          return revision;
        }

        return {
          ...revision,
          authors: existing.filter((_, currentAuthorIndex) => currentAuthorIndex !== authorIndex),
        };
      })
    );
  };

  const removeRevision = (index: number) => {
    setRevisions((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const updateApproval = (
    index: number,
    field: keyof IFsdApprovalInput,
    value: string
  ) => {
    setApprovals((prev) =>
      prev.map((approval, currentIndex) =>
        currentIndex === index ? { ...approval, [field]: value } : approval
      )
    );
  };

  const removeApproval = (index: number) => {
    setApprovals((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const addReferenceDocument = () => {
    setReferenceDocuments((prev) => [
      ...prev,
      {
        name: "",
        type: "",
        attachment: "",
      },
    ]);
  };

  const updateReferenceDocument = (
    index: number,
    field: keyof IFsdReferenceDocumentInput,
    value: string
  ) => {
    setReferenceDocuments((prev) =>
      prev.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeReferenceDocument = (index: number) => {
    setReferenceDocuments((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const addGlossaryEntry = () => {
    setGlossary((prev) => [
      ...prev,
      {
        term: "",
        comment: "",
      },
    ]);
  };

  const updateGlossaryEntry = (
    index: number,
    field: keyof IFsdGlossaryInput,
    value: string
  ) => {
    setGlossary((prev) =>
      prev.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeGlossaryEntry = (index: number) => {
    setGlossary((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleGenerateFsd = async (format: "pdf" | "word") => {
    const workflowValidation = validateFsdWorkflowContext({
      selectedProjectId: selectedProject?.id,
      workflowProjectId: workflowSelection?.projectId,
      workflowDocumentType: workflowSelection?.documentType,
      selectedEpicIds: workflowSelection?.selectedEpicIds || [],
    });

    if (!workflowValidation.isValid || !selectedProject?.id) {
      setSubmitError(
        workflowValidation.message ||
          "Le contexte de generation est invalide. Retournez a l'etape 1."
      );
      return;
    }

    const payloadValidation = validateFsdPayload({
      title,
      projectName,
      clientName,
      date,
      authors,
      purpose,
      projectOverview,
      methodology,
      approvals,
      referenceDocuments,
      glossary,
      revisions,
    });

    if (!payloadValidation.isValid) {
      setSubmitError(payloadValidation.message || "Veuillez corriger les champs obligatoires.");
      return;
    }

    setSubmitError("");

    const filledApprovals = approvals.filter(
      (approval) =>
        approval.name.trim() && approval.role.trim() && approval.date.trim()
    );

    const filledReferenceDocuments = referenceDocuments.filter(
      (item) => item.name.trim() && item.type.trim() && item.attachment.trim()
    );

    const filledGlossary = glossary.filter(
      (item) => item.term.trim() && item.comment.trim()
    );

    const filledRevisions = revisions.filter(
      (item) =>
        item.date.trim() &&
        item.version.trim() &&
        item.status.trim() &&
        hasAtLeastOneAuthor(normalizeAuthors(item.authors, item.author))
    );

    const joinedAuthors = joinAuthors(authors);

    try {
      await generateFsdDocumentMutation.mutateAsync({
        format,
        payload: {
          projectId: selectedProject.id,
          selectedEpicIds: workflowSelection.selectedEpicIds,
          selectedFeatureIds: workflowSelection.selectedFeatureIds,
          selectedUserStoryIds: workflowSelection.selectedUserStoryIds,
          mode: format === "pdf" ? "fsd-updated-template-test" : undefined,
          title,
          projectName,
          clientName,
          version,
          date,
          authors,
          author: joinedAuthors,
          purpose,
          projectOverview,
          methodology,
          approvals: filledApprovals.length > 0 ? filledApprovals : undefined,
          referenceDocuments:
            filledReferenceDocuments.length > 0 ? filledReferenceDocuments : undefined,
          glossary: filledGlossary.length > 0 ? filledGlossary : undefined,
          revisions:
            filledRevisions.length > 0
              ? filledRevisions.map((item) => ({
                  ...item,
                  authors: normalizeAuthors(item.authors, item.author),
                  author: joinAuthors(normalizeAuthors(item.authors, item.author)),
                }))
              : undefined,
          language: "fr",
          status,
          sourceVersionId: workflowEditContext.sourceVersionId || undefined,
          threadId: workflowEditContext.threadId || undefined,
          createdByName: joinedAuthors || authUsername || undefined,
        },
      });
    } catch (error) {
      setSubmitError(getDocumentErrorMessage(error, "generate"));
    }
  };

  const handleCancel = () => {
    navigate("/document-generation");
  };

  const handleContinueToStepThree = () => {
    const workflowValidation = validateFsdWorkflowContext({
      selectedProjectId: selectedProject?.id,
      workflowProjectId: workflowSelection?.projectId,
      workflowDocumentType: workflowSelection?.documentType,
      selectedEpicIds: workflowSelection?.selectedEpicIds || [],
    });

    if (!workflowValidation.isValid) {
      setSubmitError(
        workflowValidation.message ||
          "Le contexte de generation est invalide. Retournez a l'etape 1."
      );
      return;
    }

    const payloadValidation = validateFsdPayload({
      title,
      projectName,
      clientName,
      date,
      authors,
      purpose,
      projectOverview,
      methodology,
      approvals,
      referenceDocuments,
      glossary,
      revisions,
    });

    if (!payloadValidation.isValid) {
      setSubmitError(payloadValidation.message || "Veuillez corriger les champs obligatoires.");
      return;
    }

    setSubmitError("");
    navigate("/document-generation/Aperçu-et-modification");
  };

  return (
    <Flex flexDirection="column" paddingInline="1rem" gap="1rem" pb="2rem">
      <Box mx="-1rem" bg={colors.white} borderTop="1px solid" borderBottom="1px solid" borderColor={colors.border} px="1rem" py="1rem">
        <WorkflowStepBar activeStep={2} />
      </Box>

      {/* Header */}
      <Box
        background={colors.white}
        padding="1.5rem"
        border="1px solid"
        borderColor={colors.border}
        borderRadius=".75rem"
      >
        <Text fontSize="24px" fontWeight="bold" color={colors.text} mb="0.5rem">
          Créer FSD - Remplir les détails
        </Text>
        <Text fontSize="14px" color={colors.text}>
          Complétez les informations ci-dessous pour générer votre Functional Specification Document
        </Text>
      </Box>

      {/* Selected Epics Display */}
      {workflowSelection?.selectedEpicIds && workflowSelection.selectedEpicIds.length > 0 && (
        <Box
          background={colors.white}
          padding="1.5rem"
          border="1px solid"
          borderColor={colors.border}
          borderRadius=".75rem"
        >
          <Text fontSize="14px" fontWeight="bold" color={colors.text} mb="1rem">
            Épics sélectionnés:
          </Text>
          <Flex gap="0.65rem" flexWrap="wrap">
            {selectedEpicNames.map((epicName, index) => (
              <Badge
                key={`${epicName}-${index}`}
                colorScheme="blue"
                variant="solid"
                borderRadius="full"
                px="0.85rem"
                py="0.4rem"
                fontSize="13px"
                fontWeight="semibold"
                textTransform="none"
                lineHeight="1.2"
              >
                {epicName}
              </Badge>
            ))}
          </Flex>
        </Box>
      )}

      {/* Main Form */}
      <Box
        background={colors.white}
        padding="2rem"
        border="1px solid"
        borderColor={colors.border}
        borderRadius=".75rem"
      >
        <VStack spacing="2rem" align="stretch">
          {/* Section 1: Metadata */}
          <VStack spacing="1rem" align="stretch">
            <Text fontSize="16px" fontWeight="bold" color={colors.text}>
              Informations du Document
            </Text>

            <FormControl>
              <FormLabel fontSize="13px" fontWeight="medium" color={colors.text}>
                Nom du Projet
              </FormLabel>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Nom du projet"
                size="sm"
                borderColor={colors.border}
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="13px" fontWeight="medium" color={colors.text}>
                Nom du Client
              </FormLabel>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nom du client"
                size="sm"
                borderColor={colors.border}
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="13px" fontWeight="medium" color={colors.text}>
                Titre du Document
              </FormLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre FSD"
                size="sm"
                borderColor={colors.border}
              />
            </FormControl>

            <HStack spacing="1rem" align="stretch">
              <FormControl flex="1">
                <FormLabel fontSize="13px" fontWeight="medium" color={colors.text}>
                  Version
                </FormLabel>
                <Input
                  value={version}
                  onChange={(e) => {
                    setIsVersionTouched(true);
                    setVersion(e.target.value);
                  }}
                  placeholder="1.0"
                  size="sm"
                  borderColor={colors.border}
                />
              </FormControl>

              <FormControl flex="1">
                <FormLabel fontSize="13px" fontWeight="medium" color={colors.text}>
                  Auteur
                </FormLabel>
                <VStack align="stretch" spacing={2}>
                  {authors.map((authorItem, authorIndex) => (
                    <HStack key={authorIndex} spacing={2}>
                      <Input
                        value={authorItem}
                        onChange={(e) => updateMetadataAuthor(authorIndex, e.target.value)}
                        placeholder="Nom auteur"
                        size="sm"
                        borderColor={colors.border}
                      />
                      <Button
                        size="xs"
                        variant="outline"
                        colorScheme="red"
                        onClick={() => removeMetadataAuthor(authorIndex)}
                        isDisabled={authors.length === 1}
                      >
                        Supprimer
                      </Button>
                    </HStack>
                  ))}
                  <Button size="xs" variant="outline" colorScheme="blue" onClick={addMetadataAuthor}>
                    + Ajouter auteur
                  </Button>
                </VStack>
              </FormControl>

              <FormControl flex="1">
                <FormLabel fontSize="13px" fontWeight="medium" color={colors.text}>
                  Statut
                </FormLabel>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as DocumentStatus)}
                  size="sm"
                  borderColor={colors.border}
                >
                  <option value="Brouillon">Brouillon</option>
                  <option value="En cours">En cours</option>
                  <option value="Complete">Complete</option>
                </Select>
              </FormControl>

              <FormControl flex="1">
                <FormLabel fontSize="13px" fontWeight="medium" color={colors.text}>
                  Date
                </FormLabel>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  size="sm"
                  borderColor={colors.border}
                />
              </FormControl>
            </HStack>
          </VStack>

          <Divider />

          {/* Section 2: Description Fields */}
          <VStack spacing="1rem" align="stretch">
            <Text fontSize="16px" fontWeight="bold" color={colors.text}>
              Description et Objectifs
            </Text>

            <FormControl>
              <FormLabel fontSize="13px" fontWeight="medium" color={colors.text}>
                Objectif du Document {" "}
                <Text as="span" color="red">
                  *
                </Text>
              </FormLabel>
              <Textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Décrivez l'objectif principal du FSD..."
                rows={3}
                size="sm"
                borderColor={colors.border}
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="13px" fontWeight="medium" color={colors.text}>
                Aperçu du projet
              </FormLabel>
              <Textarea
                value={projectOverview}
                onChange={(e) => setProjectOverview(e.target.value)}
                placeholder="Décrivez le contexte global du projet..."
                rows={3}
                size="sm"
                borderColor={colors.border}
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="13px" fontWeight="medium" color={colors.text}>
                Méthodologie
              </FormLabel>
              <Textarea
                value={methodology}
                onChange={(e) => setMethodology(e.target.value)}
                placeholder="Décrivez la méthodologie utilisée pour ce document..."
                rows={3}
                size="sm"
                borderColor={colors.border}
              />
            </FormControl>
          </VStack>

          <Divider />

          <VStack spacing="1rem" align="stretch">
            <Flex justify="space-between" align="center">
              <Text fontSize="16px" fontWeight="bold" color={colors.text}>
                Contrôle de révision
              </Text>
              <Button size="xs" colorScheme="blue" onClick={addRevision} variant="outline">
                + Ajouter
              </Button>
            </Flex>

            {revisions.length > 0 ? (
              <VStack spacing="1rem" align="stretch">
                {revisions.map((revision, index) => (
                  <Box
                    key={index}
                    padding="1rem"
                    border="1px solid"
                    borderColor={colors.border}
                    borderRadius=".5rem"
                  >
                    <VStack spacing="0.75rem" align="stretch">
                      <HStack spacing="1rem" align="stretch">
                        <FormControl flex="1">
                          <FormLabel fontSize="12px" fontWeight="medium" color={colors.text}>
                            Date
                          </FormLabel>
                          <Input
                            type="date"
                            value={revision.date}
                            onChange={(e) => updateRevision(index, "date", e.target.value)}
                            size="sm"
                            borderColor={colors.border}
                          />
                        </FormControl>
                        <FormControl flex="1">
                          <FormLabel fontSize="12px" fontWeight="medium" color={colors.text}>
                            Version
                          </FormLabel>
                          <Input
                            value={revision.version}
                            onChange={(e) => updateRevision(index, "version", e.target.value)}
                            placeholder="1.0"
                            size="sm"
                            borderColor={colors.border}
                          />
                        </FormControl>
                        <FormControl flex="1">
                          <FormLabel fontSize="12px" fontWeight="medium" color={colors.text}>
                            Statut
                          </FormLabel>
                          <Input
                            value={revision.status}
                            onChange={(e) => updateRevision(index, "status", e.target.value)}
                            placeholder="Brouillon, En revue, Validé..."
                            size="sm"
                            borderColor={colors.border}
                          />
                        </FormControl>
                        <FormControl flex="1">
                          <FormLabel fontSize="12px" fontWeight="medium" color={colors.text}>
                            Auteur
                          </FormLabel>
                          <VStack align="stretch" spacing={2}>
                            {normalizeEditableAuthors(revision.authors, revision.author).map((revisionAuthor, authorIndex) => (
                              <HStack key={`${index}-${authorIndex}`} spacing={2}>
                                <Input
                                  value={revisionAuthor}
                                  onChange={(e) =>
                                    updateRevisionAuthor(index, authorIndex, e.target.value)
                                  }
                                  placeholder="Auteur"
                                  size="sm"
                                  borderColor={colors.border}
                                />
                                <Button
                                  size="xs"
                                  variant="outline"
                                  colorScheme="red"
                                  onClick={() => removeRevisionAuthor(index, authorIndex)}
                                  isDisabled={normalizeEditableAuthors(revision.authors, revision.author).length === 1}
                                >
                                  Supprimer
                                </Button>
                              </HStack>
                            ))}
                            <Button
                              size="xs"
                              variant="outline"
                              colorScheme="blue"
                              onClick={() => addRevisionAuthor(index)}
                            >
                              + Ajouter auteur
                            </Button>
                          </VStack>
                        </FormControl>
                      </HStack>

                      <Button
                        size="xs"
                        colorScheme="red"
                        variant="outline"
                        onClick={() => removeRevision(index)}
                        alignSelf="flex-start"
                      >
                        Supprimer
                      </Button>
                    </VStack>
                  </Box>
                ))}
              </VStack>
            ) : null}
          </VStack>

          <Divider />

          <VStack spacing="1rem" align="stretch">
            <Flex justify="space-between" align="center">
              <Text fontSize="16px" fontWeight="bold" color={colors.text}>
                Approbations
              </Text>
              <Button size="xs" colorScheme="blue" onClick={addApproval} variant="outline">
                + Ajouter
              </Button>
            </Flex>

            {approvals.length > 0 ? (
              <VStack spacing="1rem" align="stretch">
                {approvals.map((approval, index) => (
                  <Box
                    key={index}
                    padding="1rem"
                    border="1px solid"
                    borderColor={colors.border}
                    borderRadius=".5rem"
                  >
                    <VStack spacing="0.75rem" align="stretch">
                      <HStack spacing="1rem" align="stretch">
                        <FormControl flex="1">
                          <FormLabel fontSize="12px" fontWeight="medium" color={colors.text}>
                            Nom
                          </FormLabel>
                          <Input
                            value={approval.name}
                            onChange={(e) => updateApproval(index, "name", e.target.value)}
                            placeholder="Nom"
                            size="sm"
                            borderColor={colors.border}
                          />
                        </FormControl>
                        <FormControl flex="1">
                          <FormLabel fontSize="12px" fontWeight="medium" color={colors.text}>
                            Rôle
                          </FormLabel>
                          <Input
                            value={approval.role}
                            onChange={(e) => updateApproval(index, "role", e.target.value)}
                            placeholder="Rôle"
                            size="sm"
                            borderColor={colors.border}
                          />
                        </FormControl>
                        <FormControl flex="1">
                          <FormLabel fontSize="12px" fontWeight="medium" color={colors.text}>
                            Date
                          </FormLabel>
                          <Input
                            type="date"
                            value={approval.date}
                            onChange={(e) => updateApproval(index, "date", e.target.value)}
                            size="sm"
                            borderColor={colors.border}
                          />
                        </FormControl>
                      </HStack>

                      <Button
                        size="xs"
                        colorScheme="red"
                        variant="outline"
                        onClick={() => removeApproval(index)}
                        alignSelf="flex-start"
                      >
                        Supprimer
                      </Button>
                    </VStack>
                  </Box>
                ))}
              </VStack>
            ) : null}
          </VStack>

          <Divider />

          <VStack spacing="1rem" align="stretch">
            <Flex justify="space-between" align="center">
              <Text fontSize="16px" fontWeight="bold" color={colors.text}>
                Documents de référence et liens
              </Text>
              <Button size="xs" colorScheme="blue" onClick={addReferenceDocument} variant="outline">
                + Ajouter
              </Button>
            </Flex>

            {referenceDocuments.length > 0 && (
              <VStack spacing="1rem" align="stretch">
                {referenceDocuments.map((item, index) => (
                  <Box
                    key={index}
                    padding="1rem"
                    border="1px solid"
                    borderColor={colors.border}
                    borderRadius=".5rem"
                  >
                    <VStack spacing="0.75rem" align="stretch">
                      <FormControl>
                        <FormLabel fontSize="12px" fontWeight="medium" color={colors.text}>
                          Document / nom de lien
                        </FormLabel>
                        <Input
                          value={item.name}
                          onChange={(e) => updateReferenceDocument(index, "name", e.target.value)}
                          placeholder="Document / nom de lien"
                          size="sm"
                          borderColor={colors.border}
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel fontSize="12px" fontWeight="medium" color={colors.text}>
                          Type
                        </FormLabel>
                        <Input
                          value={item.type}
                          onChange={(e) => updateReferenceDocument(index, "type", e.target.value)}
                          placeholder="Type"
                          size="sm"
                          borderColor={colors.border}
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel fontSize="12px" fontWeight="medium" color={colors.text}>
                          Attachement
                        </FormLabel>
                        <Input
                          value={item.attachment}
                          onChange={(e) => updateReferenceDocument(index, "attachment", e.target.value)}
                          placeholder="Attachement"
                          size="sm"
                          borderColor={colors.border}
                        />
                      </FormControl>

                      <Button
                        size="xs"
                        colorScheme="red"
                        variant="outline"
                        onClick={() => removeReferenceDocument(index)}
                        alignSelf="flex-start"
                      >
                        Supprimer
                      </Button>
                    </VStack>
                  </Box>
                ))}
              </VStack>
            )}
          </VStack>

          <Divider />

          <VStack spacing="1rem" align="stretch">
            <Flex justify="space-between" align="center">
              <Text fontSize="16px" fontWeight="bold" color={colors.text}>
                Glossaire et abréviations
              </Text>
              <Button size="xs" colorScheme="blue" onClick={addGlossaryEntry} variant="outline">
                + Ajouter
              </Button>
            </Flex>

            {glossary.length > 0 ? (
              <VStack spacing="1rem" align="stretch">
                {glossary.map((item, index) => (
                  <Box
                    key={index}
                    padding="1rem"
                    border="1px solid"
                    borderColor={colors.border}
                    borderRadius=".5rem"
                  >
                    <VStack spacing="0.75rem" align="stretch">
                      <HStack spacing="1rem" align="stretch">
                        <FormControl flex="1">
                          <FormLabel fontSize="12px" fontWeight="medium" color={colors.text}>
                            Terme
                          </FormLabel>
                          <Input
                            value={item.term}
                            onChange={(e) => updateGlossaryEntry(index, "term", e.target.value)}
                            placeholder="Terme"
                            size="sm"
                            borderColor={colors.border}
                          />
                        </FormControl>
                        <FormControl flex="2">
                          <FormLabel fontSize="12px" fontWeight="medium" color={colors.text}>
                            Commentaire
                          </FormLabel>
                          <Input
                            value={item.comment}
                            onChange={(e) => updateGlossaryEntry(index, "comment", e.target.value)}
                            placeholder="Commentaire"
                            size="sm"
                            borderColor={colors.border}
                          />
                        </FormControl>
                      </HStack>

                      <Button
                        size="xs"
                        colorScheme="red"
                        variant="outline"
                        onClick={() => removeGlossaryEntry(index)}
                        alignSelf="flex-start"
                      >
                        Supprimer
                      </Button>
                    </VStack>
                  </Box>
                ))}
              </VStack>
            ) : null}
          </VStack>

          <Divider />

          {/* Action Buttons */}
          {submitError ? (
            <ErrorBanner message={submitError} />
          ) : null}
          <HStack spacing="1rem" justify="flex-end">
            <Button variant="outline" onClick={handleCancel}>
              Annuler
            </Button>
            <Button variant="outline" colorScheme="blue" onClick={handleContinueToStepThree}>
              Continuer vers l'etape 3
            </Button>
            <Menu>
              <MenuButton
                as={Button}
                colorScheme="blue"
                isLoading={generateFsdDocumentMutation.isPending}
                isDisabled={
                  !title.trim() ||
                  !projectName.trim() ||
                  !clientName.trim() ||
                  !date.trim() ||
                  !hasAtLeastOneAuthor(authors) ||
                  !purpose.trim()
                }
              >
                Générer FSD
              </MenuButton>
              <MenuList>
                <MenuItem onClick={() => handleGenerateFsd("pdf")}>PDF</MenuItem>
                <MenuItem onClick={() => handleGenerateFsd("word")}>WORD</MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </VStack>
      </Box>
    </Flex>
  );
}
