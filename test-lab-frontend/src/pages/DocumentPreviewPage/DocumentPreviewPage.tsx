import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
  Spinner,
  SimpleGrid,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { authRoleSelector, authUsernameSelector } from "@/app/slices/authSlice";
import {
  commitPreviewEditPayload,
  documentWorkflowDetailsSelector,
  documentWorkflowEditContextSelector,
  documentWorkflowPreviewEditSelector,
  documentWorkflowSelectionSelector,
  markPreviewEditClean,
  redoPreviewEditPayload,
  setPreviewEditPayload,
  undoPreviewEditPayload,
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
  applyEditModeVersionBump,
  hasDocumentPayloadChanges,
} from "@/utils/documents/version-diff";
import {
  useSaveCahierMutation,
  useSaveFsdMutation,
  useGetDocumentPreviewHtmlFromPayloadMutation,
  useListDocumentVersionsQuery,
  useDownloadDocumentVersionMutation,
} from "@/services";
import {
  IGenerateCahierPayload,
  IGenerateFsdPayload,
  IRichEditPageStyle,
} from "@/services/documents/document.types";

type DocumentType = "fsd" | "cahier";

type EditablePayload = IGenerateFsdPayload | IGenerateCahierPayload;
type EditableStyleMap = Record<string, string>;

type ToolbarAlignment = "left" | "center" | "right" | "justify";

interface ToolbarState {
  bold: boolean;
  italic: boolean;
  alignment: ToolbarAlignment;
  fontFamily: string;
  fontSize: string;
  textColor: string;
  sectionBackgroundColor: string;
}

const INITIAL_TOOLBAR_STATE: ToolbarState = {
  bold: false,
  italic: false,
  alignment: "left",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: "14px",
  textColor: "#111827",
  sectionBackgroundColor: "#ffffff",
};

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

function persistEditValueMap(
  payload: EditablePayload,
  path: string,
  nextValue: string
): EditablePayload {
  return {
    ...payload,
    editValues: {
      ...(payload.editValues || {}),
      [path]: nextValue,
    },
  };
}

function persistRichEditValueMap(
  payload: EditablePayload,
  path: string,
  nextValue: string
): EditablePayload {
  return {
    ...payload,
    richEditValues: {
      ...(payload.richEditValues || {}),
      [path]: nextValue,
    },
  };
}

function persistPageStyle(
  payload: EditablePayload,
  nextPageStyle: IRichEditPageStyle
): EditablePayload {
  return {
    ...payload,
    pageStyle: {
      ...(payload.pageStyle || {}),
      ...nextPageStyle,
    },
  };
}

function persistSectionBackgroundValueMap(
  payload: EditablePayload,
  path: string,
  nextValue: string
): EditablePayload {
  return {
    ...payload,
    sectionBackgroundValues: {
      ...(payload.sectionBackgroundValues || {}),
      [path]: nextValue,
    },
  };
}

function removeSectionBackgroundValueMap(
  payload: EditablePayload,
  path: string
): EditablePayload {
  const nextValues = { ...(payload.sectionBackgroundValues || {}) };
  delete nextValues[path];

  return {
    ...payload,
    sectionBackgroundValues: nextValues,
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

function getEditableHtml(element: HTMLElement): string {
  return element.innerHTML;
}

function getEditableElementFromNode(node: Node | null): HTMLElement | null {
  if (!node) {
    return null;
  }

  if (node instanceof HTMLElement) {
    return node.closest<HTMLElement>("[data-edit-path]");
  }

  const parent = node.parentElement;
  return parent?.closest<HTMLElement>("[data-edit-path]") || null;
}

function getCurrentEditableElement(iframeDocument: Document): HTMLElement | null {
  const selection = iframeDocument.getSelection();
  const fromSelection = getEditableElementFromNode(selection?.anchorNode || null);
  if (fromSelection) {
    return fromSelection;
  }

  const activeElement = iframeDocument.activeElement;
  if (activeElement instanceof HTMLElement) {
    return activeElement.closest<HTMLElement>("[data-edit-path]");
  }

  return null;
}

function getEditableElementsInRange(
  iframeDocument: Document,
  range: Range | null
): HTMLElement[] {
  if (!range) {
    return [];
  }

  return Array.from(iframeDocument.querySelectorAll<HTMLElement>("[data-edit-path]"))
    .filter((element) => range.intersectsNode(element));
}

function dedupeEditableElements(elements: Array<HTMLElement | null>): HTMLElement[] {
  const seenPaths = new Set<string>();
  const result: HTMLElement[] = [];

  elements.forEach((element) => {
    if (!element) {
      return;
    }

    const path = element.getAttribute("data-edit-path") || "";
    if (!path || seenPaths.has(path)) {
      return;
    }

    seenPaths.add(path);
    result.push(element);
  });

  return result;
}

function normalizeColorValue(value: string | null | undefined): string {
  if (!value) {
    return "#ffffff";
  }

  const normalized = value.replace(/\s+/g, " ").trim().toLowerCase();
  const rgbMatch = normalized.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);

  if (!rgbMatch) {
    return normalized;
  }

  const red = Number(rgbMatch[1]).toString(16).padStart(2, "0");
  const green = Number(rgbMatch[2]).toString(16).padStart(2, "0");
  const blue = Number(rgbMatch[3]).toString(16).padStart(2, "0");
  return `#${red}${green}${blue}`;
}

function resolveToolbarStateFromSelection(
  iframeDocument: Document,
  editableElement: HTMLElement | null,
  currentPayload: EditablePayload | null
): ToolbarState {
  if (!editableElement) {
    return {
      ...INITIAL_TOOLBAR_STATE,
      sectionBackgroundColor: currentPayload?.pageStyle?.backgroundColor || "#ffffff",
    };
  }

  const selection = iframeDocument.getSelection();
  const anchorNode = selection?.anchorNode || null;
  const anchorElement =
    anchorNode instanceof HTMLElement ? anchorNode : anchorNode?.parentElement || null;

  const styleSource =
    anchorElement && editableElement.contains(anchorElement)
      ? anchorElement
      : editableElement;

  const computedStyle = window.getComputedStyle(styleSource);
  const backgroundColor =
    editableElement.style.backgroundColor ||
    currentPayload?.sectionBackgroundValues?.[
      editableElement.getAttribute("data-edit-path") || ""
    ] ||
    "#ffffff";

  return {
    bold: Number.parseInt(computedStyle.fontWeight || "400", 10) >= 600 ||
      computedStyle.fontWeight === "bold",
    italic: computedStyle.fontStyle === "italic",
    alignment: (resolveAlignment(computedStyle.textAlign) || "left"),
    fontFamily: computedStyle.fontFamily || INITIAL_TOOLBAR_STATE.fontFamily,
    fontSize: computedStyle.fontSize || INITIAL_TOOLBAR_STATE.fontSize,
    textColor: normalizeColorValue(computedStyle.color),
    sectionBackgroundColor: normalizeColorValue(backgroundColor),
  };
}

function applyInlineStylesToSelection(
  iframeDocument: Document,
  styles: EditableStyleMap
): boolean {
  const selection = iframeDocument.getSelection();

  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return false;
  }

  const range = selection.getRangeAt(0);
  const wrapper = iframeDocument.createElement("span");

  Object.entries(styles).forEach(([property, value]) => {
    if (value) {
      wrapper.style.setProperty(property, value);
    }
  });

  try {
    range.surroundContents(wrapper);
  } catch {
    const fragment = range.extractContents();
    wrapper.appendChild(fragment);
    range.insertNode(wrapper);
  }

  selection.removeAllRanges();
  const nextRange = iframeDocument.createRange();
  nextRange.selectNodeContents(wrapper);
  selection.addRange(nextRange);
  return true;
}

function applyBlockStyles(
  element: HTMLElement,
  styles: EditableStyleMap
): void {
  Object.entries(styles).forEach(([property, value]) => {
    if (!value) {
      return;
    }

    element.style.setProperty(property, value);
  });
}

function snapshotEditableElement(
  payload: EditablePayload,
  path: string,
  element: HTMLElement
): EditablePayload {
  return persistRichEditValueMap(
    persistEditValueMap(payload, path, getEditableValue(element)),
    path,
    getEditableHtml(element)
  );
}

function snapshotEditableElements(
  payload: EditablePayload,
  editableElements: HTMLElement[]
): EditablePayload {
  return editableElements.reduce<EditablePayload>((nextPayload, element) => {
    const path = element.getAttribute("data-edit-path");

    if (!path) {
      return nextPayload;
    }

    return snapshotEditableElement(
      updatePayloadAtPath(nextPayload, path, getEditableValue(element)),
      path,
      element
    );
  }, payload);
}

function applyPageBackgroundColor(
  iframeDocument: Document,
  backgroundColor?: string
): void {
  if (backgroundColor) {
    iframeDocument.body.style.backgroundColor = backgroundColor;
    iframeDocument.documentElement.style.backgroundColor = backgroundColor;
  }

  const styleId = "document-preview-page-background-style";
  let styleElement = iframeDocument.getElementById(styleId) as HTMLStyleElement | null;

  if (!styleElement) {
    styleElement = iframeDocument.createElement("style");
    styleElement.id = styleId;
    iframeDocument.head.appendChild(styleElement);
  }

  styleElement.textContent = `
    html,
    body {
      background-color: ${backgroundColor || "#ffffff"};
      margin: 0;
    }

    @page {
      margin: 0;
    }

    body {
      padding: 18mm 14mm;
    }

    article.page {
      background-color: transparent;
    }

    td,
    th {
      background-color: #ffffff;
    }
  `;
}

function resolveFontFamilyLabel(fontFamily: string): string {
  const normalized = fontFamily.toLowerCase();
  const match = FONT_FAMILY_OPTIONS.find((option) =>
    option.value.toLowerCase().includes(normalized) || normalized.includes(option.label.toLowerCase())
  );

  return match?.label || "Police";
}

function resolveAlignment(value: string): ToolbarAlignment | null {
  if (["left", "center", "right", "justify"].includes(value)) {
    return value as ToolbarAlignment;
  }

  return null;
}

const FONT_FAMILY_OPTIONS = [
  { label: "Arial", value: 'Arial, Helvetica, sans-serif' },
  { label: "Helvetica", value: 'Helvetica, Arial, sans-serif' },
  { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { label: "Georgia", value: 'Georgia, "Times New Roman", serif' },
  { label: "Verdana", value: 'Verdana, Geneva, sans-serif' },
  { label: "Tahoma", value: 'Tahoma, Geneva, sans-serif' },
  { label: "Trebuchet MS", value: '"Trebuchet MS", Helvetica, sans-serif' },
  { label: "Garamond", value: 'Garamond, "Times New Roman", serif' },
  { label: "Palatino", value: '"Palatino Linotype", Palatino, serif' },
  { label: "Bookman", value: '"Bookman Old Style", Bookman, serif' },
  { label: "Courier New", value: '"Courier New", Courier, monospace' },
  { label: "Lucida Console", value: '"Lucida Console", Monaco, monospace' },
  { label: "Monaco", value: 'Monaco, "Lucida Console", monospace' },
  { label: "Segoe UI", value: '"Segoe UI", Tahoma, sans-serif' },
  { label: "Calibri", value: 'Calibri, "Segoe UI", sans-serif' },
  { label: "Cambria", value: 'Cambria, Georgia, serif' },
  { label: "Franklin Gothic", value: '"Franklin Gothic Medium", "Arial Narrow", sans-serif' },
  { label: "Gill Sans", value: '"Gill Sans", "Gill Sans MT", Calibri, sans-serif' },
  { label: "Century Gothic", value: '"Century Gothic", Futura, sans-serif' },
  { label: "Impact", value: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif' },
] as const;

const FONT_SIZE_PRESET_OPTIONS = [
  { label: "10", value: "10px" },
  { label: "12", value: "12px" },
  { label: "14", value: "14px" },
  { label: "16", value: "16px" },
  { label: "18", value: "18px" },
  { label: "20", value: "20px" },
  { label: "24", value: "24px" },
  { label: "28", value: "28px" },
] as const;

const TEXT_COLOR_OPTIONS = [
  { label: "Noir", value: "#111827" },
  { label: "Gris", value: "#4b5563" },
  { label: "Bleu", value: "#2563eb" },
  { label: "Bleu marine", value: "#1e3a8a" },
  { label: "Cyan", value: "#0891b2" },
  { label: "Vert", value: "#15803d" },
  { label: "Vert fonce", value: "#166534" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Rose", value: "#db2777" },
  { label: "Rouge", value: "#dc2626" },
  { label: "Orange", value: "#ea580c" },
  { label: "Jaune", value: "#ca8a04" },
  { label: "Marron", value: "#92400e" },
] as const;

const PAGE_COLOR_OPTIONS = [
  { label: "Blanc", value: "#ffffff" },
  { label: "Gris tres clair", value: "#f9fafb" },
  { label: "Ivoire", value: "#fff7ed" },
  { label: "Creme", value: "#fefce8" },
  { label: "Menthe", value: "#ecfdf5" },
  { label: "Bleu clair", value: "#eff6ff" },
  { label: "Lavande", value: "#f5f3ff" },
  { label: "Rose clair", value: "#fff1f2" },
  { label: "Gris clair", value: "#f3f4f6" },
] as const;

const SECTION_BACKGROUND_OPTIONS = [
  { label: "Blanc", value: "#ffffff" },
  { label: "Gris tres clair", value: "#f9fafb" },
  { label: "Jaune clair", value: "#fef3c7" },
  { label: "Bleu clair", value: "#dbeafe" },
  { label: "Vert clair", value: "#d1fae5" },
  { label: "Rose clair", value: "#fce7f3" },
  { label: "Violet clair", value: "#ede9fe" },
  { label: "Orange clair", value: "#ffedd5" },
] as const;

function normalizeFontSizeInput(value: string): string | null {
  const normalized = value.trim().replace(/,/g, ".");
  if (!normalized.length) {
    return null;
  }

  const numericValue = Number(normalized);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  if (numericValue < 1 || numericValue > 200) {
    return null;
  }

  return `${numericValue}px`;
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

function syncRichEditableNodes(document: Document, path: string, html: string): void {
  document.querySelectorAll<HTMLElement>(`[data-edit-path="${path}"]`).forEach((element) => {
    if (element.isContentEditable) {
      element.innerHTML = html;
    }
  });
}

function hydrateEditableNodesFromPayload(
  iframeDocument: Document,
  payload: EditablePayload | null
): void {
  if (!payload) {
    return;
  }

  applyPageBackgroundColor(iframeDocument, payload.pageStyle?.backgroundColor);

  Object.entries(payload.richEditValues || {}).forEach(([path, value]) => {
    syncRichEditableNodes(iframeDocument, path, value);
  });

  Object.entries(payload.sectionBackgroundValues || {}).forEach(([path, value]) => {
    iframeDocument
      .querySelectorAll<HTMLElement>(`[data-edit-path="${path}"]`)
      .forEach((element) => {
        if (element.isContentEditable) {
          element.style.backgroundColor = value;
        }
      });
  });

  Object.entries(payload.editValues || {}).forEach(([path, value]) => {
    if (payload.richEditValues?.[path]) {
      return;
    }

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
  const lastFocusedEditablePathRef = useRef<string>("");
  const lastSelectionRangeRef = useRef<Range | null>(null);
  const comparisonBaselineRef = useRef<Record<string, unknown> | null>(null);
  const comparisonVersionIdRef = useRef<string | null>(null);
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
  const [customFontSizeInput, setCustomFontSizeInput] = useState("14");
  const [customTextColor, setCustomTextColor] = useState("#111827");
  const [customSectionColor, setCustomSectionColor] = useState("#ffffff");
  const [toolbarState, setToolbarState] = useState<ToolbarState>(INITIAL_TOOLBAR_STATE);
  const canEditRef = useRef(false);
  const historyPastRef = useRef<Array<Record<string, unknown>>>([]);
  const historyFutureRef = useRef<Array<Record<string, unknown>>>([]);

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
    canEditRef.current = canEdit;
  }, [canEdit]);

  useEffect(() => {
    historyPastRef.current = workflowPreviewEdit.historyPast;
    historyFutureRef.current = workflowPreviewEdit.historyFuture;
  }, [workflowPreviewEdit.historyFuture, workflowPreviewEdit.historyPast]);

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

  const commitPreviewPayload = (
    nextPayload: EditablePayload,
    options?: { trackHistory?: boolean; dirty?: boolean }
  ) => {
    currentPayloadRef.current = nextPayload;

    dispatch(
      commitPreviewEditPayload({
        documentType: currentDocumentTypeRef.current || documentType || null,
        payload: nextPayload as unknown as Record<string, unknown>,
        dirty: options?.dirty ?? true,
        trackHistory: options?.trackHistory ?? false,
      })
    );
  };

  const refreshEditablePayloadFromElements = (
    editableElements: HTMLElement[],
    currentPayload: EditablePayload,
    options?: { trackHistory?: boolean }
  ) => {
    const nextPayload = snapshotEditableElements(currentPayload, editableElements);

    commitPreviewPayload(nextPayload, {
      trackHistory: options?.trackHistory ?? false,
    });

    return nextPayload;
  };

  const applyPayloadToEditor = (nextPayload: EditablePayload | null) => {
    const iframeDocument = iframeRef.current?.contentDocument;

    if (!iframeDocument || !nextPayload) {
      return;
    }

    currentPayloadRef.current = nextPayload;
    hydrateEditableNodesFromPayload(iframeDocument, nextPayload);

    const editableElement = getCurrentEditableElement(iframeDocument);
    if (editableElement) {
      const path = editableElement.getAttribute("data-edit-path");
      if (path) {
        lastFocusedEditablePathRef.current = path;
      }
    }
    setToolbarState(
      resolveToolbarStateFromSelection(iframeDocument, editableElement, nextPayload)
    );
  };

  const restoreSelectionRange = (iframeDocument: Document): void => {
    const selection = iframeDocument.getSelection();
    const hasLiveRange = Boolean(selection && selection.rangeCount > 0);

    if (hasLiveRange || !lastSelectionRangeRef.current) {
      return;
    }

    selection?.removeAllRanges();
    selection?.addRange(lastSelectionRangeRef.current.cloneRange());
  };

  const getEditableTargetsFromSelection = (iframeDocument: Document): HTMLElement[] => {
    const selection = iframeDocument.getSelection();
    const liveRange = selection && selection.rangeCount > 0
      ? selection.getRangeAt(0)
      : lastSelectionRangeRef.current;

    const fromRange = getEditableElementsInRange(iframeDocument, liveRange);
    const currentEditable = getCurrentEditableElement(iframeDocument);
    const fromLastFocused = lastFocusedEditablePathRef.current
      ? iframeDocument.querySelector<HTMLElement>(
          `[data-edit-path="${lastFocusedEditablePathRef.current}"]`
        )
      : null;

    return dedupeEditableElements([...fromRange, currentEditable, fromLastFocused]);
  };

  const resolveFormattingTargetElement = (
    iframeDocument: Document
  ): HTMLElement | null => {
    restoreSelectionRange(iframeDocument);

    const fromSelection = getCurrentEditableElement(iframeDocument);
    if (fromSelection) {
      const path = fromSelection.getAttribute("data-edit-path");
      if (path) {
        lastFocusedEditablePathRef.current = path;
      }
      return fromSelection;
    }

    if (!lastFocusedEditablePathRef.current) {
      return null;
    }

    return iframeDocument.querySelector<HTMLElement>(
      `[data-edit-path="${lastFocusedEditablePathRef.current}"]`
    );
  };

  const handleUndo = () => {
    if (!canEditRef.current || historyPastRef.current.length === 0) {
      return;
    }

    const previousPayload =
      historyPastRef.current[historyPastRef.current.length - 1] as unknown as EditablePayload;

    const currentPayload = currentPayloadRef.current as unknown as Record<string, unknown> | null;
    historyPastRef.current = historyPastRef.current.slice(0, -1);
    if (currentPayload) {
      historyFutureRef.current = [currentPayload, ...historyFutureRef.current];
    }

    dispatch(undoPreviewEditPayload());
    applyPayloadToEditor(previousPayload);
  };

  const handleRedo = () => {
    if (!canEditRef.current || historyFutureRef.current.length === 0) {
      return;
    }

    const nextPayload = historyFutureRef.current[0] as unknown as EditablePayload;

    const currentPayload = currentPayloadRef.current as unknown as Record<string, unknown> | null;
    historyFutureRef.current = historyFutureRef.current.slice(1);
    if (currentPayload) {
      historyPastRef.current = [...historyPastRef.current, currentPayload].slice(-50);
    }

    dispatch(redoPreviewEditPayload());
    applyPayloadToEditor(nextPayload);
  };

  const refreshPayloadFromSelection = (
    iframeDocument: Document,
    currentPayload: EditablePayload,
    options?: { trackHistory?: boolean }
  ): EditablePayload => {
    const editableTargets = getEditableTargetsFromSelection(iframeDocument);

    if (editableTargets.length === 0) {
      return currentPayload;
    }

    return refreshEditablePayloadFromElements(editableTargets, currentPayload, options);
  };

  const applyToolbarFormatting = (
    action:
      | "bold"
      | "italic"
      | "fontFamily"
      | "fontSize"
      | "textColor"
      | "sectionColor"
      | "sectionColorClear"
      | "alignLeft"
      | "alignCenter"
      | "alignRight"
      | "alignJustify"
      | "pageColor",
    value?: string
  ) => {
    const iframeDocument = iframeRef.current?.contentDocument;

    if (!iframeDocument || !currentPayloadRef.current) {
      return;
    }

    restoreSelectionRange(iframeDocument);

    if (action === "pageColor") {
      const nextPayload = persistPageStyle(currentPayloadRef.current, {
        backgroundColor: value,
      });

      applyPageBackgroundColor(iframeDocument, value);
      commitPreviewPayload(nextPayload, { trackHistory: true });
      return;
    }

    if (action === "sectionColor") {
      const editableTargets = getEditableTargetsFromSelection(iframeDocument);

      if (editableTargets.length === 0 || !value) {
        return;
      }

      let nextPayload = currentPayloadRef.current;

      editableTargets.forEach((editableElement) => {
        const path = editableElement.getAttribute("data-edit-path");
        if (!path) {
          return;
        }

        editableElement.style.backgroundColor = value;
        nextPayload = persistSectionBackgroundValueMap(nextPayload, path, value);
      });

      commitPreviewPayload(nextPayload, { trackHistory: true });

      const focusTarget = editableTargets[0] || null;
      setToolbarState(
        resolveToolbarStateFromSelection(iframeDocument, focusTarget, nextPayload)
      );
      return;
    }

    if (action === "sectionColorClear") {
      const editableTargets = getEditableTargetsFromSelection(iframeDocument);

      if (editableTargets.length === 0) {
        return;
      }

      let nextPayload = currentPayloadRef.current;

      editableTargets.forEach((editableElement) => {
        const path = editableElement.getAttribute("data-edit-path");
        if (!path) {
          return;
        }

        editableElement.style.backgroundColor = "";
        nextPayload = removeSectionBackgroundValueMap(nextPayload, path);
      });

      commitPreviewPayload(nextPayload, { trackHistory: true });

      const focusTarget = editableTargets[0] || null;
      setToolbarState(
        resolveToolbarStateFromSelection(iframeDocument, focusTarget, nextPayload)
      );
      return;
    }

    const editableElement = resolveFormattingTargetElement(iframeDocument);

    if (!editableElement) {
      return;
    }

    const styleMap: EditableStyleMap = {};

    if (action === "bold") {
      styleMap["font-weight"] = "700";
    }

    if (action === "italic") {
      styleMap["font-style"] = "italic";
    }

    if (action === "fontFamily" && value) {
      styleMap["font-family"] = value;
    }

    if (action === "fontSize" && value) {
      styleMap["font-size"] = value;
    }

    if (action === "textColor" && value) {
      styleMap.color = value;
    }

    if (action === "alignLeft") {
      styleMap["text-align"] = "left";
    }

    if (action === "alignCenter") {
      styleMap["text-align"] = "center";
    }

    if (action === "alignRight") {
      styleMap["text-align"] = "right";
    }

    if (action === "alignJustify") {
      styleMap["text-align"] = "justify";
    }

    const isAlignmentAction =
      action === "alignLeft" ||
      action === "alignCenter" ||
      action === "alignRight" ||
      action === "alignJustify";

    const selectionApplied =
      !isAlignmentAction && applyInlineStylesToSelection(iframeDocument, styleMap);

    if (!selectionApplied) {
      applyBlockStyles(editableElement, styleMap);
    }

    const nextPayload = refreshPayloadFromSelection(
      iframeDocument,
      currentPayloadRef.current,
      { trackHistory: true }
    );

    setToolbarState(
      resolveToolbarStateFromSelection(iframeDocument, editableElement, nextPayload)
    );
  };

  useEffect(() => {
    if (workflowEditContext.mode === "edit" && workflowEditContext.payloadSnapshot) {
      comparisonBaselineRef.current = workflowEditContext.payloadSnapshot;
      comparisonVersionIdRef.current = workflowEditContext.sourceVersionId || null;
      return;
    }

    comparisonBaselineRef.current = generatedPayload as Record<string, unknown> | null;
    comparisonVersionIdRef.current = null;
  }, [
    generatedPayload,
    workflowEditContext.mode,
    workflowEditContext.payloadSnapshot,
    workflowEditContext.sourceVersionId,
  ]);

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
    applyPageBackgroundColor(iframeDocument, currentPayloadRef.current?.pageStyle?.backgroundColor);

    body
      .querySelectorAll<HTMLElement>("h1,h2,h3,h4,p,li,th,td,span")
      .forEach((element) => {
        if (!shouldAutoMarkEditable(element)) {
          return;
        }

        element.setAttribute("data-edit-path", buildAutoEditPath(element, body));
        element.setAttribute("data-auto-edit-path", "true");
      });

    iframeDocument.body.setAttribute("contenteditable", "true");
    iframeDocument.body.setAttribute("spellcheck", "false");

    iframeDocument.querySelectorAll<HTMLElement>("[data-edit-path]").forEach((element) => {
      element.removeAttribute("contenteditable");
      element.removeAttribute("spellcheck");
      element.setAttribute("data-inline-editable", "true");
    });

    hydrateEditableNodesFromPayload(iframeDocument, currentPayloadRef.current);

    const syncToolbarState = () => {
      restoreSelectionRange(iframeDocument);

      const editableElement = getCurrentEditableElement(iframeDocument);
      if (editableElement) {
        const path = editableElement.getAttribute("data-edit-path");
        if (path) {
          lastFocusedEditablePathRef.current = path;
        }
      }
      setToolbarState(
        resolveToolbarStateFromSelection(iframeDocument, editableElement, currentPayloadRef.current)
      );
    };

    const sanitizePastedContent = (html: string): string => {
      const parser = new DOMParser();
      const parsed = parser.parseFromString(html, "text/html");

      parsed.body.querySelectorAll("*").forEach((element) => {
        Array.from(element.attributes).forEach((attribute) => {
          const attributeName = attribute.name.toLowerCase();
          if (["style", "class", "id", "data-cke-filler", "lang"].includes(attributeName)) {
            element.removeAttribute(attribute.name);
          }
        });
      });

      return parsed.body.innerHTML;
    };

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

      lastFocusedEditablePathRef.current = path;

      const nextPayload = refreshPayloadFromSelection(iframeDocument, currentPayload);
      currentPayloadRef.current = nextPayload;
      syncToolbarState();
    };

    const handleSelectionChange = () => {
      const selection = iframeDocument.getSelection();
      if (selection && selection.rangeCount > 0) {
        lastSelectionRangeRef.current = selection.getRangeAt(0).cloneRange();
      }

      syncToolbarState();
    };

    const handlePaste = (event: ClipboardEvent) => {
      const editableTarget = resolveFormattingTargetElement(iframeDocument);

      if (!editableTarget) {
        return;
      }

      const pastedText = event.clipboardData?.getData("text/plain") || "";
      const pastedHtml = event.clipboardData?.getData("text/html") || "";

      if (!pastedText && !pastedHtml) {
        return;
      }

      event.preventDefault();

      const selection = iframeDocument.getSelection();
      if (!selection || selection.rangeCount === 0) {
        editableTarget.insertAdjacentText("beforeend", pastedText || "");
        return;
      }

      const range = selection.getRangeAt(0);
      const cleanHtml = pastedHtml ? sanitizePastedContent(pastedHtml) : "";

      if (cleanHtml) {
        const fragment = range.createContextualFragment(cleanHtml);
        range.deleteContents();
        range.insertNode(fragment);
      } else {
        range.deleteContents();
        range.insertNode(iframeDocument.createTextNode(pastedText));
      }

      const path = editableTarget.getAttribute("data-edit-path");
      const currentPayload = currentPayloadRef.current;

      if (path && currentPayload) {
        lastFocusedEditablePathRef.current = path;
        const nextPayload = refreshPayloadFromSelection(iframeDocument, currentPayload, {
          trackHistory: true,
        });
        currentPayloadRef.current = nextPayload;
      }

      syncToolbarState();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const modifierPressed = isMac ? event.metaKey : event.ctrlKey;

      if (!modifierPressed) {
        return;
      }

      const loweredKey = event.key.toLowerCase();

      if (loweredKey === "z" && !event.shiftKey) {
        if (historyPastRef.current.length === 0) {
          return;
        }
        event.preventDefault();
        handleUndo();
        return;
      }

      if ((loweredKey === "z" && event.shiftKey) || loweredKey === "y") {
        if (historyFutureRef.current.length === 0) {
          return;
        }
        event.preventDefault();
        handleRedo();
      }
    };

    type EditableDocument = Document & {
      __inlineEditHandler?: EventListener;
      __inlinePasteHandler?: EventListener;
      __inlineSelectionHandler?: EventListener;
      __inlineKeyupHandler?: EventListener;
      __inlineMouseupHandler?: EventListener;
      __inlineFocusinHandler?: EventListener;
      __inlineKeydownHandler?: EventListener;
    };

    const editableDocument = iframeDocument as EditableDocument;
    if (editableDocument.__inlineEditHandler) {
      iframeDocument.body.removeEventListener("input", editableDocument.__inlineEditHandler);
    }
    if (editableDocument.__inlinePasteHandler) {
      iframeDocument.body.removeEventListener("paste", editableDocument.__inlinePasteHandler);
    }
    if (editableDocument.__inlineSelectionHandler) {
      iframeDocument.removeEventListener("selectionchange", editableDocument.__inlineSelectionHandler);
    }
    if (editableDocument.__inlineKeyupHandler) {
      iframeDocument.body.removeEventListener("keyup", editableDocument.__inlineKeyupHandler);
    }
    if (editableDocument.__inlineMouseupHandler) {
      iframeDocument.body.removeEventListener("mouseup", editableDocument.__inlineMouseupHandler);
    }
    if (editableDocument.__inlineFocusinHandler) {
      iframeDocument.body.removeEventListener("focusin", editableDocument.__inlineFocusinHandler);
    }
    if (editableDocument.__inlineKeydownHandler) {
      iframeDocument.removeEventListener("keydown", editableDocument.__inlineKeydownHandler);
    }

    editableDocument.__inlineEditHandler = handleInput;
    editableDocument.__inlinePasteHandler = handlePaste as unknown as EventListener;
    editableDocument.__inlineSelectionHandler = handleSelectionChange;
    editableDocument.__inlineKeyupHandler = syncToolbarState;
    editableDocument.__inlineMouseupHandler = syncToolbarState;
    editableDocument.__inlineFocusinHandler = syncToolbarState;
    editableDocument.__inlineKeydownHandler = handleKeyDown as unknown as EventListener;

    iframeDocument.body.addEventListener("input", handleInput);
    iframeDocument.body.addEventListener("paste", handlePaste);
    iframeDocument.addEventListener("selectionchange", handleSelectionChange);
    iframeDocument.body.addEventListener("keyup", syncToolbarState);
    iframeDocument.body.addEventListener("mouseup", syncToolbarState);
    iframeDocument.body.addEventListener("focusin", syncToolbarState);
    iframeDocument.addEventListener("keydown", handleKeyDown);

    syncToolbarState();
  };

  const versionsQuery = useListDocumentVersionsQuery(
    fallbackSelection?.projectId,
    Boolean(fallbackSelection)
  );

  const isGenerating = saveFsdMutation.isPending || saveCahierMutation.isPending;
  const isDownloading = downloadVersionMutation.isPending;
  const activePageColor = currentPreviewPayload?.pageStyle?.backgroundColor || "#ffffff";
  const canUndo = canEdit && workflowPreviewEdit.historyPast.length > 0;
  const canRedo = canEdit && workflowPreviewEdit.historyFuture.length > 0;

  useEffect(() => {
    setCustomTextColor(toolbarState.textColor || "#111827");
    setCustomSectionColor(toolbarState.sectionBackgroundColor || "#ffffff");
    setCustomFontSizeInput((toolbarState.fontSize || "14px").replace("px", ""));
  }, [toolbarState]);

  const applyCustomFontSize = () => {
    const resolvedSize = normalizeFontSizeInput(customFontSizeInput);

    if (!resolvedSize) {
      toast({
        title: "Taille invalide",
        description: "Entrez une taille numerique entre 1 et 200.",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    applyToolbarFormatting("fontSize", resolvedSize);
  };

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

      const sourcePayloadSnapshot = comparisonBaselineRef.current;
      const hasChanges = hasDocumentPayloadChanges(
        sanitizedPayload,
        sourcePayloadSnapshot
      );

      if (workflowEditContext.mode === "edit" && !hasChanges) {
        dispatch(markPreviewEditClean());
        setSubmitSuccess("Aucune modification détectée. Version inchangée.");
        return;
      }

      const versionedPayload = applyEditModeVersionBump(sanitizedPayload, {
        mode: workflowEditContext.mode,
        sourceVersionNumber: workflowEditContext.sourceVersionNumber,
        sourcePayloadSnapshot,
      });

      if (documentType === "fsd") {
        await saveFsdMutation.mutateAsync(versionedPayload as IGenerateFsdPayload);
      } else {
        await saveCahierMutation.mutateAsync(versionedPayload as IGenerateCahierPayload);
      }

      const refreshedVersions = await versionsQuery.refetch();
      comparisonBaselineRef.current = versionedPayload as unknown as Record<string, unknown>;
      comparisonVersionIdRef.current = refreshedVersions.data?.[0]?.id || comparisonVersionIdRef.current;
      dispatch(
        setPreviewEditPayload({
          documentType,
          payload: versionedPayload,
          dirty: false,
        })
      );

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

    const sourcePayloadSnapshot = comparisonBaselineRef.current;
    const currentPayload = currentPreviewPayload as
      | IGenerateFsdPayload
      | IGenerateCahierPayload
      | null;
    const hasChanges = currentPayload
      ? hasDocumentPayloadChanges(currentPayload, sourcePayloadSnapshot)
      : false;

    if (
      workflowEditContext.mode === "edit" &&
      comparisonVersionIdRef.current &&
      !hasChanges
    ) {
      try {
        await downloadVersionMutation.mutateAsync({
          versionId: comparisonVersionIdRef.current,
          format,
        });
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : "Echec du telechargement du document."
        );
      }
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
      <Box
        position="sticky"
        top="86px"
        zIndex={10}
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="lg"
        p={4}
      >
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
          <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="gray.50" p={3}>
            <HStack align="center" wrap="wrap" spacing={2}>
              <Menu>
                <MenuButton as={Button} size="sm" variant="outline" isDisabled={!canEdit}>
                  Police: {resolveFontFamilyLabel(toolbarState.fontFamily)}
                </MenuButton>
                <MenuList maxH="18rem" overflowY="auto">
                  {FONT_FAMILY_OPTIONS.map((option) => (
                    <MenuItem
                      key={option.label}
                      fontFamily={option.value}
                      onClick={() => applyToolbarFormatting("fontFamily", option.value)}
                    >
                      {option.label}
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>

              <Popover placement="bottom-start">
                <PopoverTrigger>
                  <Button size="sm" variant="outline" isDisabled={!canEdit}>
                    Aa {toolbarState.fontSize.replace("px", "")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent w="20rem">
                  <PopoverArrow />
                  <PopoverCloseButton />
                  <PopoverBody>
                    <VStack align="stretch" spacing={3}>
                      <HStack spacing={2}>
                        <Input
                          size="sm"
                          inputMode="decimal"
                          value={customFontSizeInput}
                          onChange={(event) => setCustomFontSizeInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              applyCustomFontSize();
                            }
                          }}
                          isDisabled={!canEdit}
                          placeholder="14"
                        />
                        <Button size="sm" variant="outline" isDisabled={!canEdit} onClick={applyCustomFontSize}>
                          Appliquer
                        </Button>
                      </HStack>
                      <SimpleGrid columns={4} spacing={2}>
                        {FONT_SIZE_PRESET_OPTIONS.map((option) => (
                          <Button
                            key={option.label}
                            size="sm"
                            variant="outline"
                            onClick={() => applyToolbarFormatting("fontSize", option.value)}
                            isDisabled={!canEdit}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </SimpleGrid>
                    </VStack>
                  </PopoverBody>
                </PopoverContent>
              </Popover>

              <HStack spacing={1}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleUndo}
                  isDisabled={!canUndo}
                >
                  Undo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRedo}
                  isDisabled={!canRedo}
                >
                  Redo
                </Button>
                <Button
                  size="sm"
                  variant={toolbarState.bold ? "solid" : "outline"}
                  colorScheme={toolbarState.bold ? "blue" : undefined}
                  onClick={() => applyToolbarFormatting("bold")}
                  isDisabled={!canEdit}
                >
                  B
                </Button>
                <Button
                  size="sm"
                  variant={toolbarState.italic ? "solid" : "outline"}
                  colorScheme={toolbarState.italic ? "blue" : undefined}
                  fontStyle="italic"
                  onClick={() => applyToolbarFormatting("italic")}
                  isDisabled={!canEdit}
                >
                  I
                </Button>
              </HStack>

              <Menu>
                <MenuButton
                  as={Button}
                  size="sm"
                  variant={toolbarState.alignment ? "solid" : "outline"}
                  colorScheme={toolbarState.alignment ? "blue" : undefined}
                  isDisabled={!canEdit}
                >
                  Alignement {toolbarState.alignment}
                </MenuButton>
                <MenuList>
                  <MenuItem onClick={() => applyToolbarFormatting("alignLeft")}>Gauche</MenuItem>
                  <MenuItem onClick={() => applyToolbarFormatting("alignCenter")}>Centre</MenuItem>
                  <MenuItem onClick={() => applyToolbarFormatting("alignRight")}>Droite</MenuItem>
                  <MenuItem onClick={() => applyToolbarFormatting("alignJustify")}>Justifier</MenuItem>
                </MenuList>
              </Menu>

              <Menu>
                <MenuButton as={Button} size="sm" variant="outline" isDisabled={!canEdit}>
                  Couleur texte
                </MenuButton>
                <MenuList p={3} minW="18rem">
                  <VStack align="stretch" spacing={2}>
                    <HStack spacing={2} wrap="wrap">
                      {TEXT_COLOR_OPTIONS.map((option) => (
                        <Button
                          key={option.label}
                          size="xs"
                          minW="2rem"
                          h="2rem"
                          p={0}
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor="gray.300"
                          bg={option.value}
                          _hover={{ bg: option.value }}
                          onClick={() => {
                            setCustomTextColor(option.value);
                            applyToolbarFormatting("textColor", option.value);
                          }}
                          isDisabled={!canEdit}
                          aria-label={option.label}
                          title={option.label}
                        />
                      ))}
                    </HStack>
                    <HStack spacing={2}>
                      <Input
                        type="color"
                        size="sm"
                        w="3rem"
                        p={1}
                        value={customTextColor}
                        isDisabled={!canEdit}
                        onChange={(event) => {
                          const nextColor = event.target.value;
                          setCustomTextColor(nextColor);
                          applyToolbarFormatting("textColor", nextColor);
                        }}
                      />
                      <Text fontSize="sm" color="gray.600">
                        Couleur personnalisee
                      </Text>
                    </HStack>
                  </VStack>
                </MenuList>
              </Menu>

              <Menu>
                <MenuButton
                  as={Button}
                  size="sm"
                  variant={toolbarState.sectionBackgroundColor !== "#ffffff" ? "solid" : "outline"}
                  colorScheme={toolbarState.sectionBackgroundColor !== "#ffffff" ? "blue" : undefined}
                  isDisabled={!canEdit}
                >
                  Fond section
                </MenuButton>
                <MenuList p={3} minW="18rem">
                  <VStack align="stretch" spacing={2}>
                    <HStack spacing={2} wrap="wrap">
                      {SECTION_BACKGROUND_OPTIONS.map((option) => (
                        <Button
                          key={option.label}
                          size="xs"
                          minW="2rem"
                          h="2rem"
                          p={0}
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor="gray.300"
                          bg={option.value}
                          _hover={{ bg: option.value }}
                          onClick={() => {
                            setCustomSectionColor(option.value);
                            applyToolbarFormatting("sectionColor", option.value);
                          }}
                          isDisabled={!canEdit}
                          aria-label={option.label}
                          title={option.label}
                        />
                      ))}
                    </HStack>
                    <MenuItem onClick={() => applyToolbarFormatting("sectionColorClear")}>
                      Effacer le fond de section
                    </MenuItem>
                    <HStack spacing={2}>
                      <Input
                        type="color"
                        size="sm"
                        w="3rem"
                        p={1}
                        value={customSectionColor}
                        isDisabled={!canEdit}
                        onChange={(event) => {
                          const nextColor = event.target.value;
                          setCustomSectionColor(nextColor);
                          applyToolbarFormatting("sectionColor", nextColor);
                        }}
                      />
                      <Text fontSize="sm" color="gray.600">
                        Couleur personnalisee
                      </Text>
                    </HStack>
                  </VStack>
                </MenuList>
              </Menu>

              <Menu>
                <MenuButton as={Button} size="sm" variant="outline" isDisabled={!canEdit}>
                  Couleur page
                </MenuButton>
                <MenuList p={3} minW="18rem">
                  <VStack align="stretch" spacing={2}>
                    <HStack spacing={2} wrap="wrap">
                      {PAGE_COLOR_OPTIONS.map((option) => (
                        <Button
                          key={option.label}
                          size="xs"
                          minW="2rem"
                          h="2rem"
                          p={0}
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor="gray.300"
                          bg={option.value}
                          _hover={{ bg: option.value }}
                          onClick={() => applyToolbarFormatting("pageColor", option.value)}
                          isDisabled={!canEdit}
                          aria-label={option.label}
                          title={option.label}
                        />
                      ))}
                    </HStack>
                    <HStack spacing={2}>
                      <Input
                        type="color"
                        size="sm"
                        w="3rem"
                        p={1}
                        value={activePageColor}
                        isDisabled={!canEdit}
                        onChange={(event) => applyToolbarFormatting("pageColor", event.target.value)}
                      />
                      <Text fontSize="sm" color="gray.600">
                        Fond personnalise
                      </Text>
                    </HStack>
                  </VStack>
                </MenuList>
              </Menu>
            </HStack>
          </Box>

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
