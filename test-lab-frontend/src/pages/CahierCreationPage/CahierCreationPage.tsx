import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Select,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  useExportDocumentMutation,
  useGenerateCahierMutation,
  useGetCahierSelectionSuitesQuery,
  useListDocumentVersionsQuery,
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
      typeof item?.approvalDate === "string" ? item.approvalDate : getTodayIsoDate(),
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
  const generateCahierMutation = useGenerateCahierMutation();
  const exportDocumentMutation = useExportDocumentMutation();
  const projectVersionsQuery = useListDocumentVersionsQuery(
    selectedProject?.id,
    Boolean(selectedProject?.id)
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
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("");
  const [projectOwner, setProjectOwner] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isVersionTouched, setIsVersionTouched] = useState(false);
  const [approvals, setApprovals] = useState<ApprovalInput[]>([
    {
      approverName: authUsername || "",
      approverRole: "Approver",
      approvalDate: getTodayIsoDate(),
    },
  ]);
  const prefilledSourceIdRef = useRef<string | null>(null);
  const hydratedProjectIdRef = useRef<string | null>(null);

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
  }, [selectedProject, workflowSelection.projectId]);

  useEffect(() => {
    if (isVersionTouched) {
      return;
    }

    setVersion(String(nextCahierVersionNumber));
  }, [isVersionTouched, nextCahierVersionNumber]);

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
    setDescription((payload.description as string) || "");
    setObjective((payload.objective as string) || "");
    setProjectOwner((payload.projectOwner as string) || "");
    setApprovals(normalizeApprovalItems(payload.approvals));
    setStatus((payload.status as DocumentStatus) || workflowEditContext.status || "En cours");
    setVersion(String(nextCahierVersionNumber));
    setIsVersionTouched(false);
  }, [
    nextCahierVersionNumber,
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
    setApprovals((prev) => {
      if (prev.length === 0) {
        return [
          {
            approverName: authUsername,
            approverRole: "Approver",
            approvalDate: getTodayIsoDate(),
          },
        ];
      }

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
        approvalDate: getTodayIsoDate(),
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

  const handleGenerate = async () => {
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

    try {
      await generateCahierMutation.mutateAsync({
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
        description,
        objective,
        projectOwner,
        approvals,
        language: "fr",
        status,
        sourceVersionId: workflowEditContext.sourceVersionId || undefined,
        threadId: workflowEditContext.threadId || undefined,
        createdByName: joinedAuthors || authUsername || undefined,
      });
    } catch (error) {
      setSubmitError(getDocumentErrorMessage(error, "generate"));
    }
  };

  const handleGenerateWord = async () => {
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

    setSubmitError("");

    try {
      await exportDocumentMutation.mutateAsync({
        projectId: selectedProject.id,
        documentType: "cahier",
        format: "word",
      });
    } catch (error) {
      setSubmitError(getDocumentErrorMessage(error, "export"));
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
      <Box mx="-1rem" bg={colors.white} borderTop="1px solid" borderBottom="1px solid" borderColor={colors.border} px="1rem" py="1rem">
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
                  <Button size="xs" colorScheme="red" variant="outline" onClick={() => removeApproval(index)} alignSelf="flex-start" isDisabled={approvals.length === 1}>
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
            <Button
              variant="outline"
              colorScheme="blue"
              onClick={handleGenerateWord}
              isLoading={exportDocumentMutation.isPending}
              isDisabled={!selectedProject?.id}
            >
              Générer Cahier Word
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleGenerate}
              isLoading={generateCahierMutation.isPending}
              isDisabled={
                !title.trim() ||
                !projectName.trim() ||
                !clientName.trim() ||
                !date.trim() ||
                !hasAtLeastOneAuthor(authors)
              }
            >
              Générer Cahier
            </Button>
          </HStack>
        </VStack>
      </Box>
    </Flex>
  );
}
