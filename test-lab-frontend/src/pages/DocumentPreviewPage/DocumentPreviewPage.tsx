import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spinner,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { authRoleSelector, authUsernameSelector } from "@/app/slices/authSlice";
import {
  documentWorkflowDetailsSelector,
  documentWorkflowEditContextSelector,
  documentWorkflowPreviewEditSelector,
  documentWorkflowSelectionSelector,
  markPreviewEditClean,
  setPreviewEditPayload,
} from "@/app/slices/documentWorkflowSlice";
import { WorkflowStepBar } from "@/components";
import { canCreateOrEditDocumentType } from "@/utils/auth/permissions";
import {
  createCahierDraftFromPayloadSnapshot,
  createCahierDraftFromWorkflowDetails,
  createFsdDraftFromPayloadSnapshot,
  createFsdDraftFromWorkflowDetails,
  IWorkflowSelectionContext,
  mapCahierDraftToGeneratePayload,
  mapFsdDraftToGeneratePayload,
} from "@/utils/documents/step3-draft-mappers";
import {
  useSaveCahierMutation,
  useSaveFsdMutation,
  useGetDocumentPreviewHtmlFromPayloadMutation,
  useListDocumentVersionsQuery,
  useDownloadDocumentVersionMutation,
} from "@/services";
import { IGenerateCahierPayload, IGenerateFsdPayload } from "@/services/documents/document.types";

type DocumentType = "fsd" | "cahier";

type EditablePayload = IGenerateFsdPayload | IGenerateCahierPayload;

function isNumericSegment(segment: string): boolean {
  return /^\d+$/.test(segment);
}

function cloneForEditablePath(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => cloneForEditablePath(item));
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
      (accumulator, [key, item]) => {
        accumulator[key] = cloneForEditablePath(item);
        return accumulator;
      },
      {}
    );
  }

  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizePayloadToShape(value: unknown, shape: unknown): unknown {
  if (Array.isArray(shape)) {
    if (!Array.isArray(value)) {
      return cloneForEditablePath(shape);
    }

    return value.map((item, index) =>
      sanitizePayloadToShape(item, shape[index] ?? shape[0] ?? null)
    );
  }

  if (isPlainObject(shape)) {
    const shapeKeys = Object.keys(shape);

    if (shapeKeys.length === 0) {
      return isPlainObject(value) ? cloneForEditablePath(value) : {};
    }

    if (!isPlainObject(value)) {
      return cloneForEditablePath(shape);
    }

    return Object.keys(shape).reduce<Record<string, unknown>>((accumulator, key) => {
      accumulator[key] = sanitizePayloadToShape(value[key], shape[key]);
      return accumulator;
    }, {});
  }

  if (value === undefined || value === null) {
    return cloneForEditablePath(shape);
  }

  return value;
}

function coerceEditableValue(currentValue: unknown, rawValue: string): unknown {
  if (typeof currentValue === "number") {
    const normalized = rawValue.replace(/,/g, ".");
    const numericValue = Number(normalized);
    return Number.isFinite(numericValue) ? numericValue : currentValue;
  }

  if (typeof currentValue === "boolean") {
    const normalized = rawValue.trim().toLowerCase();
    if (["true", "1", "yes", "oui"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "non"].includes(normalized)) {
      return false;
    }
    return currentValue;
  }

  return rawValue;
}

function isFsdPayload(payload: EditablePayload): payload is IGenerateFsdPayload {
  return (
    "selectedEpicIds" in payload ||
    "selectedFeatureIds" in payload ||
    "selectedUserStoryIds" in payload ||
    "editValues" in payload
  );
}

function persistEditValueMap(
  payload: EditablePayload,
  path: string,
  nextValue: string
): EditablePayload {
  if (!isFsdPayload(payload)) {
    return payload;
  }

  return {
    ...payload,
    editValues: {
      ...(payload.editValues || {}),
      [path]: nextValue,
    },
  };
}

function updatePayloadAtPath(
  payload: EditablePayload,
  path: string,
  nextValue: string
): EditablePayload {
  const segments = path.split(".").filter(Boolean);

  if (segments.length === 0) {
    return payload;
  }

  const root = cloneForEditablePath(payload) as Record<string, unknown>;
  let cursor: Record<string, unknown> | unknown[] = root;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const key = isNumericSegment(segment) ? Number(segment) : segment;

    if (Array.isArray(cursor)) {
      const arrayIndex = Number(key);
      const existing = cursor[arrayIndex];

      if (existing === undefined) {
        return payload;
      }

      if (existing === null || typeof existing !== "object") {
        return payload;
      }

      cursor = cursor[arrayIndex] as Record<string, unknown> | unknown[];
      continue;
    }

    const existing = cursor[key as string];

    if (existing === undefined) {
      return payload;
    }

    if (existing === null || typeof existing !== "object") {
      return payload;
    }

    cursor = cursor[key as string] as Record<string, unknown> | unknown[];
  }

  const lastSegment = segments[segments.length - 1];
  const lastKey = isNumericSegment(lastSegment) ? Number(lastSegment) : lastSegment;

  if (Array.isArray(cursor)) {
    if (cursor[Number(lastKey)] === undefined) {
      return payload;
    }
    const currentValue = cursor[Number(lastKey)];
    cursor[Number(lastKey)] = coerceEditableValue(currentValue, nextValue);
  } else {
    if (!(lastKey as string in cursor)) {
      return payload;
    }
    const currentValue = cursor[lastKey as string];
    cursor[lastKey as string] = coerceEditableValue(currentValue, nextValue);
  }

  return root as unknown as EditablePayload;
}

function getEditableValue(element: HTMLElement): string {
  return element.innerText.replace(/\u00a0/g, " ").trim();
}

function buildAutoEditPath(element: HTMLElement, root: HTMLElement): string {
  const segments: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== root) {
    const parentElement: HTMLElement | null = current.parentElement;
    if (!parentElement) {
      break;
    }

    const currentTagName = current.tagName;
    const siblings = Array.from(parentElement.children).filter(
      (candidate: Element) => candidate.tagName === currentTagName
    );
    const index = Math.max(0, siblings.indexOf(current));
    segments.unshift(`${current.tagName.toLowerCase()}${index}`);
    current = parentElement;
  }

  return `auto.${segments.join(".")}`;
}

function shouldAutoMarkEditable(element: HTMLElement): boolean {
  if (element.hasAttribute("data-edit-path")) {
    return false;
  }

  if (element.closest("style,script")) {
    return false;
  }

  const textContent = element.textContent?.replace(/\u00a0/g, " ").trim() || "";
  if (!textContent.length) {
    return false;
  }

  if (element.children.length > 0) {
    return false;
  }

  return true;
}

function syncEditableNodes(document: Document, path: string, value: string): void {
  document.querySelectorAll<HTMLElement>(`[data-edit-path="${path}"]`).forEach((element) => {
    if (element.isContentEditable) {
      element.textContent = value;
    }
  });
}

function hydrateEditableNodesFromPayload(
  iframeDocument: Document,
  payload: EditablePayload | null
): void {
  if (!payload || !isFsdPayload(payload) || !payload.editValues) {
    return;
  }

  Object.entries(payload.editValues).forEach(([path, value]) => {
    syncEditableNodes(iframeDocument, path, value);
  });
}

function joinAuthors(authors: string[]): string {
  return authors
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .join("; ");
}

function detectDocumentType(
  selectionType: "fsd" | "cahier",
  payloadSnapshot: Record<string, unknown> | null
): "fsd" | "cahier" {
  if (!payloadSnapshot) {
    return selectionType;
  }

  if (Array.isArray(payloadSnapshot.selectedSuiteIds)) {
    return "cahier";
  }

  if (Array.isArray(payloadSnapshot.selectedEpicIds)) {
    return "fsd";
  }

  return selectionType;
}

export default function DocumentPreviewPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const currentDocumentTypeRef = useRef<DocumentType | null>(null);
  const currentPayloadRef = useRef<EditablePayload | null>(null);
  const previewLoadedRef = useRef(false);
  const previewRequestIdRef = useRef(0);
  const lastPreviewKeyRef = useRef("");
  const inFlightPreviewKeyRef = useRef("");
  const workflowSelection = useSelector(documentWorkflowSelectionSelector);
  const workflowDetails = useSelector(documentWorkflowDetailsSelector);
  const workflowEditContext = useSelector(documentWorkflowEditContextSelector);
  const workflowPreviewEdit = useSelector(documentWorkflowPreviewEditSelector);
  const authRole = useSelector(authRoleSelector);
  const authUsername = useSelector(authUsernameSelector);
  const saveFsdMutation = useSaveFsdMutation();
  const saveCahierMutation = useSaveCahierMutation();
  const previewFromPayloadMutation = useGetDocumentPreviewHtmlFromPayloadMutation();
  const downloadVersionMutation = useDownloadDocumentVersionMutation();

  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoadError, setPreviewLoadError] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewRetryNonce, setPreviewRetryNonce] = useState(0);

  const fallbackSelection = useMemo<IWorkflowSelectionContext | null>(() => {
    if (!workflowSelection.projectId) {
      return null;
    }

    return {
      projectId: workflowSelection.projectId,
      selectedEpicIds: workflowSelection.selectedEpicIds,
      selectedFeatureIds: workflowSelection.selectedFeatureIds,
      selectedUserStoryIds: workflowSelection.selectedUserStoryIds,
      selectedSuiteIds: workflowSelection.selectedSuiteIds,
      selectedTestCaseIds: workflowSelection.selectedTestCaseIds,
    };
  }, [workflowSelection]);

  const draft = useMemo(() => {
    if (!fallbackSelection) {
      return null;
    }

    const documentType = detectDocumentType(
      workflowSelection.documentType,
      workflowEditContext.payloadSnapshot
    );

    if (workflowEditContext.mode === "edit" && workflowEditContext.payloadSnapshot) {
      if (documentType === "cahier") {
        return createCahierDraftFromPayloadSnapshot(
          workflowEditContext.payloadSnapshot,
          fallbackSelection
        );
      }

      return createFsdDraftFromPayloadSnapshot(
        workflowEditContext.payloadSnapshot,
        fallbackSelection
      );
    }

    if (documentType === "cahier") {
      if (!workflowDetails.cahier) {
        return null;
      }

      return createCahierDraftFromWorkflowDetails(
        workflowDetails.cahier,
        fallbackSelection
      );
    }

    if (!workflowDetails.fsd) {
      return null;
    }

    return createFsdDraftFromWorkflowDetails(workflowDetails.fsd, fallbackSelection);
  }, [
    fallbackSelection,
    workflowDetails.cahier,
    workflowDetails.fsd,
    workflowEditContext.mode,
    workflowEditContext.payloadSnapshot,
    workflowSelection.documentType,
  ]);

  const documentType: DocumentType | null = draft?.documentType ?? null;
  const canEdit = documentType ? canCreateOrEditDocumentType(authRole, documentType) : false;

  useEffect(() => {
    currentDocumentTypeRef.current = documentType;
  }, [documentType]);

  const generatedPayload = useMemo<IGenerateFsdPayload | IGenerateCahierPayload | null>(() => {
    if (!draft || !fallbackSelection || !documentType) {
      return null;
    }

    if (documentType === "fsd") {
      const fsdDraft = draft as Extract<typeof draft, { documentType: "fsd" }>;
      const joinedAuthors = joinAuthors(fsdDraft.authors);
      return mapFsdDraftToGeneratePayload(fsdDraft, {
        sourceVersionId: workflowEditContext.sourceVersionId || undefined,
        threadId: workflowEditContext.threadId || undefined,
        createdByName: joinedAuthors || authUsername || undefined,
        language: "fr",
      });
    }

    const cahierDraft = draft as Extract<typeof draft, { documentType: "cahier" }>;
    const joinedAuthors = joinAuthors(cahierDraft.authors);
    return mapCahierDraftToGeneratePayload(cahierDraft, {
      sourceVersionId: workflowEditContext.sourceVersionId || undefined,
      threadId: workflowEditContext.threadId || undefined,
      createdByName: joinedAuthors || authUsername || undefined,
      language: "fr",
    });
  }, [
    authUsername,
    documentType,
    draft,
    fallbackSelection,
    workflowEditContext.sourceVersionId,
    workflowEditContext.threadId,
  ]);

  useEffect(() => {
    if (!documentType || !generatedPayload) {
      previewLoadedRef.current = false;
      return;
    }

    const shouldInitialize =
      !workflowPreviewEdit.payload || workflowPreviewEdit.documentType !== documentType;

    if (!shouldInitialize) {
      return;
    }

    dispatch(
      setPreviewEditPayload({
        documentType,
        payload: generatedPayload,
        dirty: false,
      })
    );
  }, [dispatch, documentType, generatedPayload, workflowPreviewEdit.documentType, workflowPreviewEdit.payload]);

  const currentPreviewPayload = useMemo<IGenerateFsdPayload | IGenerateCahierPayload | null>(() => {
    if (workflowPreviewEdit.payload) {
      return workflowPreviewEdit.payload as unknown as
        | IGenerateFsdPayload
        | IGenerateCahierPayload;
    }

    return generatedPayload;
  }, [generatedPayload, workflowPreviewEdit.payload]);

  useEffect(() => {
    currentPayloadRef.current = currentPreviewPayload as EditablePayload | null;
  }, [currentPreviewPayload]);

  const previewRequestKey = useMemo(() => {
    if (!fallbackSelection || !documentType || !currentPreviewPayload) {
      return "";
    }

    return JSON.stringify({
      projectId: fallbackSelection.projectId,
      documentType,
      payload: currentPreviewPayload,
      retryNonce: previewRetryNonce,
    });
  }, [currentPreviewPayload, documentType, fallbackSelection, previewRetryNonce]);

  useEffect(() => {
    if (workflowPreviewEdit.dirty && previewLoadedRef.current) {
      return;
    }

    if (!previewRequestKey) {
      setPreviewHtml("");
      setPreviewLoadError("");
      setIsPreviewLoading(false);
      previewLoadedRef.current = false;
      lastPreviewKeyRef.current = "";
      return;
    }

    if (previewRequestKey === lastPreviewKeyRef.current && previewLoadedRef.current) {
      return;
    }

    if (previewRequestKey === inFlightPreviewKeyRef.current) {
      return;
    }

    const requestId = previewRequestIdRef.current + 1;
    previewRequestIdRef.current = requestId;
    lastPreviewKeyRef.current = previewRequestKey;
    inFlightPreviewKeyRef.current = previewRequestKey;

    const loadPreview = async () => {
      if (!fallbackSelection || !documentType || !currentPreviewPayload) {
        setPreviewHtml("");
        setPreviewLoadError("");
        setIsPreviewLoading(false);
        previewLoadedRef.current = false;
        return;
      }

      try {
        setPreviewLoadError("");
        setIsPreviewLoading(true);

        const html = await new Promise<string>((resolve, reject) => {
          const timeoutId = window.setTimeout(() => {
            reject(new Error("Preview timeout"));
          }, 35000);

          previewFromPayloadMutation
            .mutateAsync({
              projectId: fallbackSelection.projectId,
              documentType,
              payload: currentPreviewPayload,
            })
            .then((result) => {
              window.clearTimeout(timeoutId);
              resolve(result);
            })
            .catch((error) => {
              window.clearTimeout(timeoutId);
              reject(error);
            });
        });

        if (previewRequestIdRef.current !== requestId) {
          return;
        }

        setPreviewHtml(html || "");
        previewLoadedRef.current = true;
      } catch {
        if (previewRequestIdRef.current !== requestId) {
          return;
        }

        setPreviewHtml("");
        setPreviewLoadError("Impossible de charger l'aperçu du document. Vérifiez la connexion ou réessayez.");
        previewLoadedRef.current = false;
        inFlightPreviewKeyRef.current = "";
      } finally {
        if (previewRequestIdRef.current === requestId) {
          setIsPreviewLoading(false);
          inFlightPreviewKeyRef.current = "";
        }
      }
    };

    loadPreview();
  }, [
    previewRequestKey,
    currentPreviewPayload,
    documentType,
    fallbackSelection,
    workflowPreviewEdit.dirty,
    previewFromPayloadMutation.mutateAsync,
  ]);

  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    const iframeDocument = iframe?.contentDocument;

    if (!iframeDocument) {
      return;
    }

    const editableStyleId = "document-preview-inline-editor-style";
    if (!iframeDocument.getElementById(editableStyleId)) {
      const style = iframeDocument.createElement("style");
      style.id = editableStyleId;
      style.textContent = `
        [data-edit-path] {
          border-radius: 2px;
          transition: background-color 0.15s ease, outline-color 0.15s ease;
        }

        [data-edit-path]:hover {
          background-color: rgba(31, 78, 121, 0.06);
        }

        [data-edit-path]:focus {
          outline: 1px solid rgba(31, 78, 121, 0.35);
          background-color: rgba(31, 78, 121, 0.08);
        }
      `;
      iframeDocument.head.appendChild(style);
    }

    const body = iframeDocument.body;

    body
      .querySelectorAll<HTMLElement>("h1,h2,h3,h4,p,li,th,td,span")
      .forEach((element) => {
        if (!shouldAutoMarkEditable(element)) {
          return;
        }

        element.setAttribute("data-edit-path", buildAutoEditPath(element, body));
        element.setAttribute("data-auto-edit-path", "true");
      });

    iframeDocument.querySelectorAll<HTMLElement>("[data-edit-path]").forEach((element) => {
      element.setAttribute("contenteditable", "true");
      element.setAttribute("spellcheck", "false");
      element.setAttribute("data-inline-editable", "true");
    });

    hydrateEditableNodesFromPayload(iframeDocument, currentPayloadRef.current);

    const handleInput = (event: Event) => {
      const target = event.target as HTMLElement | null;

      if (!target) {
        return;
      }

      const editableTarget = target.closest<HTMLElement>("[data-edit-path]");

      if (!editableTarget) {
        return;
      }

      const path = editableTarget.getAttribute("data-edit-path");

      if (!path) {
        return;
      }

      const currentPayload = currentPayloadRef.current;

      if (!currentPayload) {
        return;
      }

      const nextValue = getEditableValue(editableTarget);
      const nextPayload = persistEditValueMap(
        updatePayloadAtPath(currentPayload, path, nextValue),
        path,
        nextValue
      );

      syncEditableNodes(iframeDocument, path, nextValue);

      dispatch(
        setPreviewEditPayload({
          documentType: currentDocumentTypeRef.current || documentType,
          payload: nextPayload,
          dirty: true,
        })
      );
    };

    type EditableDocument = Document & {
      __inlineEditHandler?: EventListener;
    };

    const editableDocument = iframeDocument as EditableDocument;
    if (editableDocument.__inlineEditHandler) {
      iframeDocument.body.removeEventListener("input", editableDocument.__inlineEditHandler);
    }

    editableDocument.__inlineEditHandler = handleInput;
    iframeDocument.body.addEventListener("input", handleInput);
  };

  const versionsQuery = useListDocumentVersionsQuery(
    fallbackSelection?.projectId,
    Boolean(fallbackSelection)
  );

  const isGenerating = saveFsdMutation.isPending || saveCahierMutation.isPending;
  const isDownloading = downloadVersionMutation.isPending;

  const handleRegenerateAndSave = async () => {
    if (!draft || !fallbackSelection || !documentType || !currentPreviewPayload) {
      setSubmitError("Impossible de sauvegarder sans contexte valide.");
      return;
    }

    if (!canEdit) {
      setSubmitError("Votre role ne permet pas de modifier ce type de document.");
      return;
    }

    setSubmitError("");
    setSubmitSuccess("");

    try {
      const sanitizedPayload = sanitizePayloadToShape(
        currentPreviewPayload,
        generatedPayload
      ) as IGenerateFsdPayload | IGenerateCahierPayload;

      if (documentType === "fsd") {
        await saveFsdMutation.mutateAsync(sanitizedPayload as IGenerateFsdPayload);
      } else {
        await saveCahierMutation.mutateAsync(sanitizedPayload as IGenerateCahierPayload);
      }

      await versionsQuery.refetch();
      dispatch(markPreviewEditClean());

      setSubmitSuccess("Document sauvegardé.");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Echec de la regeneration du document."
      );
    }
  };

  const handleDownloadLatestVersion = async (format: "pdf" | "word") => {
    if (workflowPreviewEdit.dirty) {
      toast({
        title: "Sauvegarde requise",
        description: "Vous avez des modifications non sauvegardées. Cliquez sur Sauvegarder avant de télécharger.",
        status: "warning",
        duration: 3500,
      });
      return;
    }

    if (!versionsQuery.data || versionsQuery.data.length === 0) {
      toast({
        title: "Aucune version disponible",
        description: "Aucune version du document n'est disponible au téléchargement.",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    const latestVersion = versionsQuery.data[0];

    try {
      await downloadVersionMutation.mutateAsync({
        versionId: latestVersion.id,
        format,
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Echec du telechargement du document."
      );
    }
  };

  if (!fallbackSelection || !draft) {
    return (
      <Box p={6}>
        <Alert status="warning" borderRadius="md" mb={4}>
          <AlertIcon />
          Impossible d'ouvrir l'etape 3 sans contexte valide. Revenez a l'etape 1 puis etape 2.
        </Alert>
        <Button colorScheme="blue" onClick={() => navigate("/document-generation/Selection-du-contenu")}>
          Retour a l'etape 1
        </Button>
      </Box>
    );
  }

  return (
    <Flex direction="column" gap={6} p={{ base: 4, md: 6 }}>
      <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="lg" p={4}>
        <WorkflowStepBar activeStep={3} />
      </Box>

      <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="lg" p={6}>
        <HStack justify="space-between" align="start" mb={6}>
          <Box>
            <Heading size="md" mb={2}>
              Etape 3 - Aperçu du document
            </Heading>
            <Text fontSize="sm" color="gray.600">
              Consultez et téléchargez votre document. Cliquez sur Sauvegarder pour enregistrer vos modifications.
            </Text>
          </Box>
          <Badge colorScheme={draft.documentType === "fsd" ? "blue" : "green"}>
            {draft.documentType.toUpperCase()}
          </Badge>
        </HStack>

        <VStack align="stretch" spacing={4}>
          <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="white" minH="800px" overflow="hidden">
            {isPreviewLoading ? (
              <Flex minH="800px" align="center" justify="center" direction="column" gap={3}>
                <Spinner color="blue.500" />
                <Text fontSize="sm" color="gray.600">
                  Chargement du document...
                </Text>
              </Flex>
            ) : previewLoadError ? (
              <Alert status="error" borderRadius="none">
                <AlertIcon />
                <HStack justify="space-between" w="100%">
                  <Text fontSize="sm">{previewLoadError}</Text>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPreviewLoadError("");
                      setPreviewRetryNonce((previous) => previous + 1);
                    }}
                  >
                    Reessayer
                  </Button>
                </HStack>
              </Alert>
            ) : (
              <iframe
                title="Aperçu document"
                srcDoc={previewHtml}
                ref={iframeRef}
                onLoad={handleIframeLoad}
                style={{ width: "100%", height: "800px", border: "0" }}
              />
            )}
          </Box>

          {submitError ? (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {submitError}
            </Alert>
          ) : null}

          {submitSuccess ? (
            <Alert status="success" borderRadius="md">
              <AlertIcon />
              {submitSuccess}
            </Alert>
          ) : null}
        </VStack>

        <HStack justify="space-between" align="center" flexWrap="wrap" gap={3} mt={6}>
          <Text fontSize="sm" color="gray.600">
            {workflowEditContext.mode === "edit"
              ? `Édition depuis la version source ${workflowEditContext.sourceVersionNumber ?? "-"}`
              : "Création à partir du contexte courant"}
          </Text>

          <HStack justify="flex-end" flexWrap="wrap" gap={2}>
            <Button variant="outline" onClick={() => navigate(-1)}>
              Retour
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleRegenerateAndSave}
              isLoading={isGenerating}
              isDisabled={!canEdit}
            >
              Sauvegarder
            </Button>
            <Menu>
              <MenuButton
                as={Button}
                colorScheme="green"
                isLoading={isDownloading}
                isDisabled={workflowPreviewEdit.dirty || !versionsQuery.data || versionsQuery.data.length === 0}
              >
                Télécharger
              </MenuButton>
              <MenuList>
                <MenuItem onClick={() => handleDownloadLatestVersion("pdf")}>PDF</MenuItem>
                <MenuItem onClick={() => handleDownloadLatestVersion("word")}>WORD</MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </HStack>
      </Box>
    </Flex>
  );
}
