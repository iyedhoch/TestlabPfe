import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";

type WorkflowDocumentType = "fsd" | "cahier";
type PreviewEditPayloadSnapshot = Record<string, unknown>;

interface ICommitPreviewEditPayloadAction {
  documentType?: WorkflowDocumentType | null;
  payload: PreviewEditPayloadSnapshot | null;
  dirty?: boolean;
  trackHistory?: boolean;
}

const MAX_PREVIEW_EDIT_HISTORY = 50;

type WorkflowDocumentStatus = "Brouillon" | "En cours" | "Complete";

interface IFsdWorkflowDetailsState {
  projectName: string;
  clientName: string;
  title: string;
  version: string;
  date: string;
  authors: string[];
  author?: string;
  status: WorkflowDocumentStatus;
  purpose: string;
  projectOverview: string;
  methodology: string;
  approvals: Array<{ name: string; role: string; date: string }>;
  referenceDocuments: Array<{
    name: string;
    type: string;
    attachment: string;
  }>;
  glossary: Array<{ term: string; comment: string }>;
  revisions: Array<{
    date: string;
    version: string;
    status: string;
    authors: string[];
    author?: string;
  }>;
}

interface ICahierWorkflowDetailsState {
  projectName: string;
  clientName: string;
  title: string;
  version: string;
  date: string;
  authors: string[];
  author?: string;
  status: WorkflowDocumentStatus;
  description: string;
  objective: string;
  projectOwner: string;
  approvals: Array<{
    approverName: string;
    approverRole: string;
    approvalDate: string;
  }>;
}

interface IDocumentWorkflowSelectionState {
  projectId: string | null;
  documentType: WorkflowDocumentType;
  selectedEpicIds: string[];
  selectedFeatureIds: string[];
  selectedUserStoryIds: string[];
  selectedSuiteIds: string[];
  selectedTestCaseIds: string[];
  updatedAt: string | null;
}

interface IDocumentWorkflowSlice {
  selection: IDocumentWorkflowSelectionState;
  details: {
    fsd: IFsdWorkflowDetailsState | null;
    cahier: ICahierWorkflowDetailsState | null;
    updatedAt: string | null;
  };
  previewEdit: {
    documentType: WorkflowDocumentType | null;
    payload: Record<string, unknown> | null;
    dirty: boolean;
    updatedAt: string | null;
    historyPast: Array<Record<string, unknown>>;
    historyFuture: Array<Record<string, unknown>>;
  };
  editContext: {
    sourceVersionId: string | null;
    threadId: string | null;
    sourceVersionNumber: number | null;
    status: WorkflowDocumentStatus;
    createdByName: string | null;
    payloadSnapshot: Record<string, unknown> | null;
    mode: "create" | "edit";
  };
}

const initialState: IDocumentWorkflowSlice = {
  selection: {
    projectId: null,
    documentType: "fsd",
    selectedEpicIds: [],
    selectedFeatureIds: [],
    selectedUserStoryIds: [],
    selectedSuiteIds: [],
    selectedTestCaseIds: [],
    updatedAt: null,
  },
  details: {
    fsd: null,
    cahier: null,
    updatedAt: null,
  },
  previewEdit: {
    documentType: null,
    payload: null,
    dirty: false,
    updatedAt: null,
    historyPast: [],
    historyFuture: [],
  },
  editContext: {
    sourceVersionId: null,
    threadId: null,
    sourceVersionNumber: null,
    status: "En cours",
    createdByName: null,
    payloadSnapshot: null,
    mode: "create",
  },
};

export const documentWorkflowSlice = createSlice({
  name: "documentWorkflowSlice",
  initialState,
  reducers: {
    setFsdEpicSelection: (state, action) => {
      state.selection.projectId = action.payload.projectId;
      state.selection.documentType = "fsd";
      state.selection.selectedEpicIds = action.payload.selectedEpicIds;
      state.selection.selectedFeatureIds = action.payload.selectedFeatureIds || [];
      state.selection.selectedUserStoryIds = action.payload.selectedUserStoryIds || [];
      state.selection.selectedSuiteIds = [];
      state.selection.selectedTestCaseIds = [];
      state.selection.updatedAt = new Date().toISOString();

      if (state.details.cahier) {
        state.details.cahier = null;
      }
    },
    setCahierSuiteSelection: (state, action) => {
      state.selection.projectId = action.payload.projectId;
      state.selection.documentType = "cahier";
      state.selection.selectedSuiteIds = action.payload.selectedSuiteIds;
      state.selection.selectedTestCaseIds = action.payload.selectedTestCaseIds || [];
      state.selection.selectedEpicIds = [];
      state.selection.selectedFeatureIds = [];
      state.selection.selectedUserStoryIds = [];
      state.selection.updatedAt = new Date().toISOString();

      if (state.details.fsd) {
        state.details.fsd = null;
      }
    },
    setFsdWorkflowDetails: (state, action) => {
      state.details.fsd = {
        projectName: action.payload.projectName || "",
        clientName: action.payload.clientName || "",
        title: action.payload.title || "",
        version: action.payload.version || "",
        date: action.payload.date || "",
        authors: action.payload.authors || [""],
        author:
          action.payload.author ||
          (Array.isArray(action.payload.authors)
            ? action.payload.authors.filter((item: string) => item?.trim()).join("; ")
            : ""),
        status: action.payload.status || "En cours",
        purpose: action.payload.purpose || "",
        projectOverview: action.payload.projectOverview || "",
        methodology: action.payload.methodology || "",
        approvals: action.payload.approvals || [],
        referenceDocuments: action.payload.referenceDocuments || [],
        glossary: action.payload.glossary || [],
        revisions: action.payload.revisions || [],
      };
      state.details.updatedAt = new Date().toISOString();
    },
    setCahierWorkflowDetails: (state, action) => {
      state.details.cahier = {
        projectName: action.payload.projectName || "",
        clientName: action.payload.clientName || "",
        title: action.payload.title || "",
        version: action.payload.version || "",
        date: action.payload.date || "",
        authors: action.payload.authors || [""],
        author:
          action.payload.author ||
          (Array.isArray(action.payload.authors)
            ? action.payload.authors.filter((item: string) => item?.trim()).join("; ")
            : ""),
        status: action.payload.status || "En cours",
        description: action.payload.description || "",
        objective: action.payload.objective || "",
        projectOwner: action.payload.projectOwner || "",
        approvals: action.payload.approvals || [],
      };
      state.details.updatedAt = new Date().toISOString();
    },
    setDocumentWorkflowEditContext: (state, action) => {
      state.editContext = {
        sourceVersionId: action.payload.sourceVersionId || null,
        threadId: action.payload.threadId || null,
        sourceVersionNumber:
          typeof action.payload.sourceVersionNumber === "number"
            ? action.payload.sourceVersionNumber
            : null,
        status: action.payload.status || "En cours",
        createdByName: action.payload.createdByName || null,
        payloadSnapshot: action.payload.payloadSnapshot || null,
        mode: action.payload.mode || "create",
      };
    },
    setPreviewEditPayload: (state, action) => {
      state.previewEdit.documentType = action.payload.documentType || null;
      state.previewEdit.payload = action.payload.payload || null;
      state.previewEdit.dirty = Boolean(action.payload.dirty);
      state.previewEdit.updatedAt = new Date().toISOString();
      state.previewEdit.historyPast = [];
      state.previewEdit.historyFuture = [];
    },
    commitPreviewEditPayload: (
      state,
      action: PayloadAction<ICommitPreviewEditPayloadAction>
    ) => {
      const {
        documentType,
        payload,
        dirty = true,
        trackHistory = false,
      } = action.payload;

      if (trackHistory && state.previewEdit.payload) {
        state.previewEdit.historyPast.push(state.previewEdit.payload);
        if (state.previewEdit.historyPast.length > MAX_PREVIEW_EDIT_HISTORY) {
          state.previewEdit.historyPast.shift();
        }
        state.previewEdit.historyFuture = [];
      }

      state.previewEdit.documentType = documentType ?? state.previewEdit.documentType;
      state.previewEdit.payload = payload;
      state.previewEdit.dirty = Boolean(dirty);
      state.previewEdit.updatedAt = new Date().toISOString();
    },
    undoPreviewEditPayload: (state) => {
      if (state.previewEdit.historyPast.length === 0) {
        return;
      }

      const previousPayload = state.previewEdit.historyPast.pop() || null;

      if (state.previewEdit.payload) {
        state.previewEdit.historyFuture.unshift(state.previewEdit.payload);
      }

      state.previewEdit.payload = previousPayload;
      state.previewEdit.dirty = true;
      state.previewEdit.updatedAt = new Date().toISOString();
    },
    redoPreviewEditPayload: (state) => {
      if (state.previewEdit.historyFuture.length === 0) {
        return;
      }

      const nextPayload = state.previewEdit.historyFuture.shift() || null;

      if (state.previewEdit.payload) {
        state.previewEdit.historyPast.push(state.previewEdit.payload);
        if (state.previewEdit.historyPast.length > MAX_PREVIEW_EDIT_HISTORY) {
          state.previewEdit.historyPast.shift();
        }
      }

      state.previewEdit.payload = nextPayload;
      state.previewEdit.dirty = true;
      state.previewEdit.updatedAt = new Date().toISOString();
    },
    patchPreviewEditPayload: (state, action) => {
      if (!state.previewEdit.payload) {
        state.previewEdit.payload = action.payload.patch || null;
      } else {
        state.previewEdit.payload = {
          ...state.previewEdit.payload,
          ...(action.payload.patch || {}),
        };
      }

      state.previewEdit.dirty = true;
      state.previewEdit.updatedAt = new Date().toISOString();
    },
    markPreviewEditClean: (state) => {
      state.previewEdit.dirty = false;
      state.previewEdit.updatedAt = new Date().toISOString();
    },
    resetPreviewEditPayload: (state) => {
      state.previewEdit = initialState.previewEdit;
    },
    clearDocumentWorkflowEditContext: (state) => {
      state.editContext = initialState.editContext;
    },
    clearDocumentWorkflowSelection: (state) => {
      state.selection = initialState.selection;
      state.details = initialState.details;
      state.previewEdit = initialState.previewEdit;
      state.editContext = initialState.editContext;
    },
  },
});

export const documentWorkflowSelectionSelector = (state: RootState) =>
  state.rootReducer.documentWorkflowReducer.selection;

export const documentWorkflowDetailsSelector = (state: RootState) =>
  state.rootReducer.documentWorkflowReducer.details;

export const documentWorkflowEditContextSelector = (state: RootState) =>
  state.rootReducer.documentWorkflowReducer.editContext;

export const documentWorkflowPreviewEditSelector = (state: RootState) =>
  state.rootReducer.documentWorkflowReducer.previewEdit;

export const {
  setFsdEpicSelection,
  setCahierSuiteSelection,
  setFsdWorkflowDetails,
  setCahierWorkflowDetails,
  setDocumentWorkflowEditContext,
  setPreviewEditPayload,
  commitPreviewEditPayload,
  undoPreviewEditPayload,
  redoPreviewEditPayload,
  patchPreviewEditPayload,
  markPreviewEditClean,
  resetPreviewEditPayload,
  clearDocumentWorkflowEditContext,
  clearDocumentWorkflowSelection,
} = documentWorkflowSlice.actions;

export const documentWorkflowReducer = documentWorkflowSlice.reducer;
