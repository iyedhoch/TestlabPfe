import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  FormErrorMessage,
  HStack,
  Image,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Select,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ErrorBanner } from "@/components";
import { selectedProjectSelector } from "@/app/slices/projectSlice";
import {
  documentWorkflowDetailsSelector,
  documentWorkflowEditContextSelector,
  documentWorkflowSelectionSelector,
  setCahierWorkflowDetails,
} from "@/app/slices/documentWorkflowSlice";
import { authRoleSelector, authUsernameSelector } from "@/app/slices/authSlice";
import {
  DocumentStatus,
  useDownloadDocumentVersionMutation,
  useGenerateCahierDocumentMutation,
  useGetCahierSelectionSuitesQuery,
  useListDocumentVersionsQuery,
  useUploadDocumentLogoMutation,
} from "@/services";
import { colors } from "@/theme/colors";
import {
  validateCahierPayload,
  validateCahierWorkflowContext,
} from "@/utils/documents/validators";
import {
  getDocumentErrorMessage,
  getDocumentLoadErrorMessage,
} from "@/utils/documents/error-normalizer";
import {
  applyEditModeVersionBump,
  hasDocumentPayloadChanges,
} from "@/utils/documents/version-diff";
import { WorkflowStepBar } from "@/components";
import { canCreateOrEditDocumentType } from "@/utils/auth/permissions";

interface ApprovalInput {
  approverName: string;
  approverRole: string;
  approvalDate: string;
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

function joinAuthors(authors: string[]): string {
  return authors
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .join("; ");
}

function hasAtLeastOneAuthor(authors: string[]): boolean {
  return authors.some((item) => item.trim().length > 0);
}

function getPayloadLogo(
  payload: Record<string, unknown>,
  key: "companyLogo" | "clientLogo"
): string {
  const directValue = payload[key];
  if (typeof directValue === "string") {
    return directValue;
  }

  const metadata = payload.metadata;
  if (metadata && typeof metadata === "object") {
    const nestedValue = (metadata as Record<string, unknown>)[key];
    if (typeof nestedValue === "string") {
      return nestedValue;
    }
  }

  return "";
}

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeApprovalItems(value: unknown): ApprovalInput[] {
  return asArray<Partial<ApprovalInput>>(value).map((item) => ({
    approverName: typeof item?.approverName === "string" ? item.approverName : "",
    approverRole: typeof item?.approverRole === "string" ? item.approverRole : "",
    approvalDate:
      typeof item?.approvalDate === "string" ? item.approvalDate : "",
  }));
}

export default function CahierCreationPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selectedProject = useSelector(selectedProjectSelector);
  const workflowSelection = useSelector(documentWorkflowSelectionSelector);
  const workflowDetails = useSelector(documentWorkflowDetailsSelector);
  const workflowEditContext = useSelector(documentWorkflowEditContextSelector);
  const authUsername = useSelector(authUsernameSelector);
  const authRole = useSelector(authRoleSelector);
  const generateCahierDocumentMutation = useGenerateCahierDocumentMutation();
  const downloadVersionMutation = useDownloadDocumentVersionMutation();
  const uploadLogoMutation = useUploadDocumentLogoMutation();
  const projectVersionsQuery = useListDocumentVersionsQuery(
    selectedProject?.id,
    Boolean(selectedProject?.id),
    "cahier"
  );

  const selectedSuitesQuery = useGetCahierSelectionSuitesQuery(
    selectedProject?.id,
    Boolean(selectedProject?.id)
  );

  const selectedSuiteNames = useMemo(() => {
    const selectedSuiteIdSet = new Set(workflowSelection.selectedSuiteIds);

    return selectedSuitesQuery.data?.filter((suite) => {
      if (!selectedSuiteIdSet.has(suite.id)) {
        return false;
      }

      const parentId = suite.parentId;
      return !parentId || !selectedSuiteIdSet.has(parentId);
    }) || [];
  }, [selectedSuitesQuery.data, workflowSelection.selectedSuiteIds]);

  const [title, setTitle] = useState("");
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [version, setVersion] = useState("1");
  const [date, setDate] = useState(getTodayIsoDate());
  const [authors, setAuthors] = useState<string[]>([""]);
  const [status, setStatus] = useState<DocumentStatus>("En cours");
  const [companyLogo, setCompanyLogo] = useState("");
  const [clientLogo, setClientLogo] = useState("");
  const [companyLogoPreview, setCompanyLogoPreview] = useState("");
  const [clientLogoPreview, setClientLogoPreview] = useState("");
  const [companyLogoError, setCompanyLogoError] = useState("");
  const [clientLogoError, setClientLogoError] = useState("");
  const [isCompanyLogoUploading, setIsCompanyLogoUploading] = useState(false);
  const [isClientLogoUploading, setIsClientLogoUploading] = useState(false);
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("");
  const [projectOwner, setProjectOwner] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isVersionTouched, setIsVersionTouched] = useState(false);
  const [approvals, setApprovals] = useState<ApprovalInput[]>([]);
  const prefilledSourceIdRef = useRef<string | null>(null);
  const hydratedProjectIdRef = useRef<string | null>(null);
  const companyLogoInputRef = useRef<HTMLInputElement | null>(null);
  const clientLogoInputRef = useRef<HTMLInputElement | null>(null);

  const nextCahierVersionNumber = useMemo(() => {
    if (workflowEditContext.mode === "edit" && workflowEditContext.sourceVersionNumber) {
      return workflowEditContext.sourceVersionNumber + 1;
    }

    const versions = projectVersionsQuery.data || [];
    const cahierVersions = versions.filter((item) => item.documentType === "cahier");
    if (cahierVersions.length === 0) {
      return 1;
    }

    const maxVersion = Math.max(...cahierVersions.map((item) => item.versionNumber));
    return maxVersion + 1;
  }, [projectVersionsQuery.data, workflowEditContext.mode, workflowEditContext.sourceVersionNumber]);

  useEffect(() => {
    return () => {
      if (companyLogoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(companyLogoPreview);
      }
    };
  }, [companyLogoPreview]);

  useEffect(() => {
    return () => {
      if (clientLogoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(clientLogoPreview);
      }
    };
  }, [clientLogoPreview]);

  useEffect(() => {
    if (!canCreateOrEditDocumentType(authRole, "cahier")) {
      navigate("/document-generation");
      return;
    }

    const workflowValidation = validateCahierWorkflowContext({
      selectedProjectId: selectedProject?.id,
      workflowProjectId: workflowSelection.projectId,
      workflowDocumentType: workflowSelection.documentType,
      selectedSuiteIds: workflowSelection.selectedSuiteIds,
    });

    if (!workflowValidation.isValid) {
      navigate("/document-generation/Selection-du-contenu");
    }
  }, [authRole, navigate, selectedProject?.id, workflowSelection]);

  useEffect(() => {
    if (!selectedProject) {
      return;
    }

    // Only hydrate if we haven't hydrated for this project yet
    if (hydratedProjectIdRef.current === selectedProject.id) {
      return;
    }
    hydratedProjectIdRef.current = selectedProject.id;

    const persistedDetails = workflowDetails.cahier;
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
      setCompanyLogo(persistedDetails.companyLogo || "");
      setClientLogo(persistedDetails.clientLogo || "");
      setCompanyLogoPreview(persistedDetails.companyLogo || "");
      setClientLogoPreview(persistedDetails.clientLogo || "");
      setDescription(persistedDetails.description || "");
      setObjective(persistedDetails.objective || "");
      setProjectOwner(persistedDetails.projectOwner || "");
      setApprovals(normalizeApprovalItems(persistedDetails.approvals));
      setVersion(persistedDetails.version || "1");
      return;
    }

    setProjectName(selectedProject.name || "");
    setClientName(selectedProject.name || "");
    setTitle(`Cahier de recette - ${selectedProject.name}`);
    setDescription(selectedProject.description || "");
    setObjective(
      selectedProject.description ||
        `Valider les scénarios de test du projet ${selectedProject.name}.`
    );
    setProjectOwner((selectedProject as { projectOwner?: string })?.projectOwner || "");
    setCompanyLogo("");
    setClientLogo("");
    setCompanyLogoPreview("");
    setClientLogoPreview("");
  }, [selectedProject, workflowSelection.projectId]);

  useEffect(() => {
    if (workflowEditContext.mode === "edit" && workflowEditContext.payloadSnapshot) {
      return;
    }

    if (isVersionTouched) {
      return;
    }

    setVersion(String(nextCahierVersionNumber));
  }, [
    isVersionTouched,
    nextCahierVersionNumber,
    workflowEditContext.mode,
    workflowEditContext.payloadSnapshot,
  ]);

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
    setTitle((payload.title as string) || "");
    setProjectName((payload.projectName as string) || "");
    setClientName((payload.clientName as string) || "");
    setDate((payload.date as string) || getTodayIsoDate());
    setAuthors(normalizeAuthors(payload.authors as string[] | undefined, payload.author as string | undefined));
    const nextCompanyLogo = getPayloadLogo(payload, "companyLogo");
    const nextClientLogo = getPayloadLogo(payload, "clientLogo");
    setCompanyLogo(nextCompanyLogo);
    setClientLogo(nextClientLogo);
    setCompanyLogoPreview(nextCompanyLogo);
    setClientLogoPreview(nextClientLogo);
    setDescription((payload.description as string) || "");
    setObjective((payload.objective as string) || "");
    setProjectOwner((payload.projectOwner as string) || "");
    setApprovals(normalizeApprovalItems(payload.approvals));
    setStatus((payload.status as DocumentStatus) || workflowEditContext.status || "En cours");
    setVersion((payload.version as string) || String(workflowEditContext.sourceVersionNumber || 1));
    setIsVersionTouched(false);
  }, [
    workflowEditContext.mode,
    workflowEditContext.payloadSnapshot,
    workflowEditContext.sourceVersionId,
    workflowEditContext.sourceVersionNumber,
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
    setApprovals((prev) => {
      return prev.map((approval, index) =>
        index === 0 && !approval.approverName
          ? { ...approval, approverName: authUsername }
          : approval
      );
    });
  }, [authUsername]);

  useEffect(() => {
    if (!selectedProject?.id || workflowSelection.documentType !== "cahier") {
      return;
    }

    dispatch(
      setCahierWorkflowDetails({
        projectName,
        clientName,
        title,
        version,
        date,
        authors,
        status,
        companyLogo,
        clientLogo,
        description,
        objective,
        projectOwner,
        approvals,
      })
    );
  }, [
    approvals,
    authors,
    clientName,
    companyLogo,
    clientLogo,
    date,
    description,
    dispatch,
    objective,
    projectName,
    projectOwner,
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
        approverName: "",
        approverRole: "",
        approvalDate: "",
      },
    ]);
  };

  const updateApproval = (index: number, field: keyof ApprovalInput, value: string) => {
    setApprovals((prev) =>
      prev.map((approval, currentIndex) =>
        currentIndex === index ? { ...approval, [field]: value } : approval
      )
    );
  };

  const removeApproval = (index: number) => {
    setApprovals((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
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

  const handleCompanyLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setCompanyLogoError("Veuillez selectionner une image valide.");
      return;
    }

    setCompanyLogoError("");
    setIsCompanyLogoUploading(true);
    const previewUrl = URL.createObjectURL(file);
    setCompanyLogoPreview(previewUrl);

    const previousLogo = companyLogo;

    try {
      const result = await uploadLogoMutation.mutateAsync(file);
      setCompanyLogo(result.url || "");
      setCompanyLogoPreview(result.url || "");
    } catch (error) {
      setCompanyLogoError(
        getDocumentErrorMessage(error, "generate") ||
          "Le televersement du logo a echoue."
      );
      setCompanyLogo(previousLogo || "");
      setCompanyLogoPreview(previousLogo || "");
    } finally {
      setIsCompanyLogoUploading(false);
    }
  };

  const handleClientLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setClientLogoError("Veuillez selectionner une image valide.");
      return;
    }

    setClientLogoError("");
    setIsClientLogoUploading(true);
    const previewUrl = URL.createObjectURL(file);
    setClientLogoPreview(previewUrl);

    const previousLogo = clientLogo;

    try {
      const result = await uploadLogoMutation.mutateAsync(file);
      setClientLogo(result.url || "");
      setClientLogoPreview(result.url || "");
    } catch (error) {
      setClientLogoError(
        getDocumentErrorMessage(error, "generate") ||
          "Le televersement du logo a echoue."
      );
      setClientLogo(previousLogo || "");
      setClientLogoPreview(previousLogo || "");
    } finally {
      setIsClientLogoUploading(false);
    }
  };

  const handleRemoveCompanyLogo = () => {
    setCompanyLogo("");
    setCompanyLogoPreview("");
    setCompanyLogoError("");
    setIsCompanyLogoUploading(false);
    if (companyLogoInputRef.current) {
      companyLogoInputRef.current.value = "";
    }
  };

  const handleRemoveClientLogo = () => {
    setClientLogo("");
    setClientLogoPreview("");
    setClientLogoError("");
    setIsClientLogoUploading(false);
    if (clientLogoInputRef.current) {
      clientLogoInputRef.current.value = "";
    }
  };

  const handleGenerate = async (format: "pdf" | "word") => {
    const workflowValidation = validateCahierWorkflowContext({
      selectedProjectId: selectedProject?.id,
      workflowProjectId: workflowSelection.projectId,
      workflowDocumentType: workflowSelection.documentType,
      selectedSuiteIds: workflowSelection.selectedSuiteIds,
    });

    if (!workflowValidation.isValid || !selectedProject?.id) {
      setSubmitError(
        workflowValidation.message ||
          "Le contexte de generation est invalide. Retournez a l'etape 1."
      );
      return;
    }

    const payloadValidation = validateCahierPayload({
      title,
      projectName,
      clientName,
      date,
      authors,
      approvals,
    });

    if (!payloadValidation.isValid) {
      setSubmitError(payloadValidation.message || "Veuillez corriger les champs obligatoires.");
      return;
    }

    setSubmitError("");

    const joinedAuthors = joinAuthors(authors);
    const sourcePayloadSnapshot = workflowEditContext.payloadSnapshot as
      | Record<string, unknown>
      | null;

    const filledApprovals = approvals
      .map((approval) => ({
        approverName: approval.approverName.trim(),
        approverRole: approval.approverRole.trim(),
        approvalDate: approval.approvalDate.trim(),
      }))
      .filter(
        (approval) =>
          approval.approverName.length > 0 ||
          approval.approverRole.length > 0 ||
          approval.approvalDate.length > 0
      );

    const basePayload = {
      projectId: selectedProject.id,
      selectedSuiteIds: workflowSelection.selectedSuiteIds,
      selectedTestCaseIds: workflowSelection.selectedTestCaseIds,
      title,
      projectName,
      clientName,
      version,
      date,
      authors,
      author: joinedAuthors,
      companyLogo: companyLogo || undefined,
      clientLogo: clientLogo || undefined,
      description,
      objective,
      projectOwner,
      approvals: filledApprovals.length > 0 ? filledApprovals : undefined,
      language: "fr" as const,
      status,
      sourceVersionId: workflowEditContext.sourceVersionId || undefined,
      threadId: workflowEditContext.threadId || undefined,
      createdByName: joinedAuthors || authUsername || undefined,
    };

    const hasChanges = hasDocumentPayloadChanges(basePayload, sourcePayloadSnapshot);

    if (
      workflowEditContext.mode === "edit" &&
      workflowEditContext.sourceVersionId &&
      !hasChanges
    ) {
      await downloadVersionMutation.mutateAsync({
        versionId: workflowEditContext.sourceVersionId,
        format,
      });
      return;
    }

    const versionedPayload = applyEditModeVersionBump(basePayload, {
      mode: workflowEditContext.mode,
      sourceVersionNumber: workflowEditContext.sourceVersionNumber,
      sourcePayloadSnapshot,
    });

    try {
      await generateCahierDocumentMutation.mutateAsync({
        format,
        payload: versionedPayload,
      });
    } catch (error) {
      setSubmitError(getDocumentErrorMessage(error, "generate"));
    }
  };

  const suitesLoadError = selectedSuitesQuery.isError
    ? getDocumentLoadErrorMessage("les suites selectionnees", selectedSuitesQuery.error)
    : "";

  const handleContinueToStepThree = () => {
    const workflowValidation = validateCahierWorkflowContext({
      selectedProjectId: selectedProject?.id,
      workflowProjectId: workflowSelection.projectId,
      workflowDocumentType: workflowSelection.documentType,
      selectedSuiteIds: workflowSelection.selectedSuiteIds,
    });

    if (!workflowValidation.isValid) {
      setSubmitError(
        workflowValidation.message ||
          "Le contexte de generation est invalide. Retournez a l'etape 1."
      );
      return;
    }

    const payloadValidation = validateCahierPayload({
      title,
      projectName,
      clientName,
      date,
      authors,
      approvals,
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
      <Box
        position="sticky"
        top="86px"
        zIndex={10}
        mx="-1rem"
        bg={colors.white}
        borderTop="1px solid"
        borderBottom="1px solid"
        borderColor={colors.border}
        px="1rem"
        py="1rem"
      >
        <WorkflowStepBar activeStep={2} />
      </Box>

      <Box
        background={colors.white}
        padding="1.5rem"
        border="1px solid"
        borderColor={colors.border}
        borderRadius=".75rem"
      >
        <Text fontSize="24px" fontWeight="bold" color={colors.text} mb="0.5rem">
          Créer Cahier de recette - Remplir les détails
        </Text>
        <Text fontSize="14px" color={colors.text}>
          Complétez les informations ci-dessous pour générer votre cahier de recette.
        </Text>
      </Box>

      {selectedSuiteNames.length > 0 && (
        <Box
          background={colors.white}
          padding="1.5rem"
          border="1px solid"
          borderColor={colors.border}
          borderRadius=".75rem"
        >
          <Text fontSize="14px" fontWeight="bold" color={colors.text} mb="1rem">
            Suites sélectionnées:
          </Text>
          <Flex gap="0.65rem" flexWrap="wrap">
            {selectedSuiteNames.map((suite) => (
              <Badge
                key={suite.id}
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
                {suite.name}
              </Badge>
            ))}
          </Flex>
        </Box>
      )}

      {suitesLoadError ? (
        <ErrorBanner message={suitesLoadError} borderRadius=".75rem" padding="1rem" />
      ) : null}

      <Box
        background={colors.white}
        padding="2rem"
        border="1px solid"
        borderColor={colors.border}
        borderRadius=".75rem"
      >
        <VStack spacing="2rem" align="stretch">
          <VStack spacing="1rem" align="stretch">
            <Text fontSize="16px" fontWeight="bold" color={colors.text}>
              Informations du document
            </Text>

            <FormControl>
              <FormLabel fontSize="13px" fontWeight="medium" color={colors.text}>
                Nom du projet
              </FormLabel>
              <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} size="sm" borderColor={colors.border} />
              <Text fontSize="12px" color="gray.500" mt="0.25rem">
                Prérempli depuis le projet sélectionné, modifiable avant génération.
              </Text>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="13px" fontWeight="medium" color={colors.text}>
                Nom du client
              </FormLabel>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} size="sm" borderColor={colors.border} />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="13px" fontWeight="medium" color={colors.text}>
                Titre du document
              </FormLabel>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} size="sm" borderColor={colors.border} />
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
                <Select value={status} onChange={(e) => setStatus(e.target.value as DocumentStatus)} size="sm" borderColor={colors.border}>
                  <option value="Brouillon">Brouillon</option>
                  <option value="En cours">En cours</option>
                  <option value="Complete">Complete</option>
                </Select>
              </FormControl>

              <FormControl flex="1">
                <FormLabel fontSize="13px" fontWeight="medium" color={colors.text}>
                  Date
                </FormLabel>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} size="sm" borderColor={colors.border} />
              </FormControl>
            </HStack>
            <VStack spacing="1rem" align="stretch" w="100%">
                <Text fontSize="16px" fontWeight="bold" color={colors.text}>
                  Logos du document
                </Text>
                <HStack spacing="1rem" align="stretch" flexWrap="wrap">
                  {/* Company logo field - same code as before */}
                  <FormControl isInvalid={Boolean(companyLogoError)} flex="1" minW="280px">
                    <FormLabel fontSize="13px" fontWeight="medium" color={colors.text}>
                      Logo entreprise
                    </FormLabel>
                    <Box
                      border="1px dashed"
                      borderColor={colors.border}
                      borderRadius="md"
                      padding="0.75rem"
                      background="gray.50"
                    >
                      <Input
                        type="file"
                        ref={companyLogoInputRef}
                        accept="image/*"
                        onChange={handleCompanyLogoChange}
                        display="none"
                      />
                      <Flex align="start" gap="0.75rem">
                        {/* --- Image preview – stretches horizontally --- */}
                        <Box
                          flex="1"
                          border="1px solid"
                          borderColor={colors.border}
                          borderRadius="md"
                          bg={colors.white}
                          minH="140px"
                          maxH="260px"
                          maxW="400px"
                          mx="auto" 
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          overflow="hidden"
                        >
                          {companyLogoPreview ? (
                            <Image
                              src={companyLogoPreview}
                              alt="Logo entreprise"
                              maxW="100%"
                              maxH="100%"
                              objectFit="contain"
                              p={2}
                            />
                          ) : (
                            <Text fontSize="13px" color="gray.400" py={6}>
                              Aucun logo sélectionné
                            </Text>
                          )}
                        </Box>

                        {/* --- Buttons – stacked vertically, compact --- */}
                        <VStack spacing="0.5rem" flexShrink={0}>
                          <Button
                            size="sm"
                            variant="outline"
                            colorScheme="blue"
                            onClick={() => companyLogoInputRef.current?.click()}
                            isLoading={isCompanyLogoUploading}
                            whiteSpace="nowrap"
                          >
                            Choisir un fichier
                          </Button>
                          {companyLogoPreview && (
                            <Button
                              size="sm"
                              variant="outline"
                              colorScheme="red"
                              onClick={handleRemoveCompanyLogo}
                              isDisabled={isCompanyLogoUploading}
                              whiteSpace="nowrap"
                            >
                              Retirer
                            </Button>
                          )}
                        </VStack>
                      </Flex>
                    </Box>
                    {companyLogoError && (
                      <FormErrorMessage fontSize="12px">{companyLogoError}</FormErrorMessage>
                    )}
                  </FormControl>

                  {/* Client logo field */}
                  <FormControl isInvalid={Boolean(clientLogoError)} flex="1" minW="280px">
                    <FormLabel fontSize="13px" fontWeight="medium" color={colors.text}>
                      Logo client
                    </FormLabel>
                    <Box
                      border="1px dashed"
                      borderColor={colors.border}
                      borderRadius="md"
                      padding="0.75rem"
                      background="gray.50"
                    >
                      <Input
                        type="file"
                        ref={clientLogoInputRef}
                        accept="image/*"
                        onChange={handleClientLogoChange}
                        display="none"
                      />
                      <Flex align="start" gap="0.75rem">
                        {/* --- Image preview – stretches horizontally --- */}
                        <Box
                          flex="1"
                          border="1px solid"
                          borderColor={colors.border}
                          borderRadius="md"
                          bg={colors.white}
                          minH="140px"
                          maxH="260px"
                          maxW="400px"
                          mx="auto" 
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          overflow="hidden"
                        >
                          {clientLogoPreview ? (
                            <Image
                              src={clientLogoPreview}
                              alt="Logo client"
                              maxW="100%"
                              maxH="100%"
                              objectFit="contain"
                              p={2}
                            />
                          ) : (
                            <Text fontSize="13px" color="gray.400" py={6}>
                              Aucun logo sélectionné
                            </Text>
                          )}
                        </Box>

                        {/* --- Buttons – stacked vertically, compact --- */}
                        <VStack spacing="0.5rem" flexShrink={0}>
                          <Button
                            size="sm"
                            variant="outline"
                            colorScheme="blue"
                            onClick={() => clientLogoInputRef.current?.click()}
                            isLoading={isClientLogoUploading}
                            whiteSpace="nowrap"
                          >
                            Choisir un fichier
                          </Button>
                          {clientLogoPreview && (
                            <Button
                              size="sm"
                              variant="outline"
                              colorScheme="red"
                              onClick={handleRemoveClientLogo}
                              isDisabled={isClientLogoUploading}
                              whiteSpace="nowrap"
                            >
                              Retirer
                            </Button>
                          )}
                        </VStack>
                      </Flex>
                    </Box>
                    {clientLogoError && (
                      <FormErrorMessage fontSize="12px">{clientLogoError}</FormErrorMessage>
                    )}
                  </FormControl>
                </HStack>
              </VStack>
          </VStack>

          <Divider />

          <VStack spacing="1rem" align="stretch">
            <Text fontSize="16px" fontWeight="bold" color={colors.text}>
              Contexte et objectifs
            </Text>

            <FormControl>
              <FormLabel fontSize="13px" fontWeight="medium" color={colors.text}>
                Description du projet
              </FormLabel>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} size="sm" borderColor={colors.border} />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="13px" fontWeight="medium" color={colors.text}>
                Objectif du document
              </FormLabel>
              <Textarea value={objective} onChange={(e) => setObjective(e.target.value)} rows={3} size="sm" borderColor={colors.border} />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="13px" fontWeight="medium" color={colors.text}>
                Responsable projet
              </FormLabel>
              <Input value={projectOwner} onChange={(e) => setProjectOwner(e.target.value)} size="sm" borderColor={colors.border} />
            </FormControl>

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

            {approvals.map((approval, index) => (
              <Box key={index} padding="1rem" border="1px solid" borderColor={colors.border} borderRadius=".5rem">
                <VStack spacing="0.75rem" align="stretch">
                  <HStack spacing="1rem" align="stretch">
                    <FormControl flex="1">
                      <FormLabel fontSize="12px" fontWeight="medium" color={colors.text}>
                        Nom
                      </FormLabel>
                      <Input value={approval.approverName} onChange={(e) => updateApproval(index, "approverName", e.target.value)} size="sm" borderColor={colors.border} />
                    </FormControl>
                    <FormControl flex="1">
                      <FormLabel fontSize="12px" fontWeight="medium" color={colors.text}>
                        Rôle
                      </FormLabel>
                      <Input value={approval.approverRole} onChange={(e) => updateApproval(index, "approverRole", e.target.value)} size="sm" borderColor={colors.border} />
                    </FormControl>
                    <FormControl flex="1">
                      <FormLabel fontSize="12px" fontWeight="medium" color={colors.text}>
                        Date
                      </FormLabel>
                      <Input type="date" value={approval.approvalDate} onChange={(e) => updateApproval(index, "approvalDate", e.target.value)} size="sm" borderColor={colors.border} />
                    </FormControl>
                  </HStack>
                  <Button size="xs" colorScheme="red" variant="outline" onClick={() => removeApproval(index)} alignSelf="flex-start">
                    Supprimer
                  </Button>
                </VStack>
              </Box>
            ))}
          </VStack>

          <Divider />

          {submitError ? (
            <ErrorBanner message={submitError} />
          ) : null}

          <HStack spacing="1rem" justify="flex-end">
            <Button variant="outline" onClick={() => navigate("/document-generation")}>Annuler</Button>
            <Button variant="outline" colorScheme="blue" onClick={handleContinueToStepThree}>
              Continuer vers l'etape 3
            </Button>
            <Menu>
              <MenuButton
                as={Button}
                colorScheme="blue"
                isLoading={generateCahierDocumentMutation.isPending}
                isDisabled={
                  !title.trim() ||
                  !projectName.trim() ||
                  !clientName.trim() ||
                  !date.trim() ||
                  !hasAtLeastOneAuthor(authors)
                }
              >
                Générer Cahier
              </MenuButton>
              <MenuList>
                <MenuItem onClick={() => handleGenerate("pdf")}>PDF</MenuItem>
                <MenuItem onClick={() => handleGenerate("word")}>WORD</MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </VStack>
      </Box>
    </Flex>
  );
}
