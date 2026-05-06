import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Grid,
  Heading,
  HStack,
  Select,
  SimpleGrid,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { selectedProjectSelector } from "@/app/slices/projectSlice";
import { authRoleSelector } from "@/app/slices/authSlice";
import {
  clearDocumentWorkflowEditContext,
  documentWorkflowSelectionSelector,
  setCahierSuiteSelection,
  setFsdEpicSelection,
} from "@/app/slices/documentWorkflowSlice";
import {
  EpicPriority,
  EpicStatus,
  FeaturePriority,
  FeatureStatus,
  IFsdSelectionEpic,
  useExportDocumentMutation,
  useGetCahierSelectionSuitesQuery,
  useGetFsdSelectionEpicsQuery,
  useGetProjectsQuery,
  ICahierSelectionSuite,
  IEpic,
  StoryPriority,
  StoryStatus,
} from "@/services";
import { useNavigate } from "react-router-dom";
import AvailableEpicsTable from "./components/AvailableEpicsTable";
import AvailableSuitesTable from "./components/AvailableSuitesTable";
import {
  getDocumentErrorMessage,
  getDocumentLoadErrorMessage,
} from "@/utils/documents/error-normalizer";
import { WorkflowStepBar } from "@/components";
import { canCreateOrEditDocumentType } from "@/utils/auth/permissions";

type DocumentType = "cahier" | "fsd";
type DocumentFormat = "pdf" | "word" | "excel";
type SelectionDocumentType = "fsd" | "cahier";

const documentCards: any[] = [
  {
    id: "cahier",
    title: "Cahier de recette",
    description:
      "Document de validation fonctionnelle et scénarios de test complets pour votre projet.",
    status: "ready",
    exportButtons: [
      { label: "Word", documentType: "cahier", format: "word" },
      { label: "PDF", documentType: "cahier", format: "pdf" },
      { label: "Excel", documentType: "cahier", format: "excel" },
    ],
  },
  {
    id: "fsd",
    title: "Spécification fonctionnelle",
    description:
      "Description détaillée des besoins fonctionnels et règles métier du système.",
    status: "ready",
    exportButtons: [
      { label: "Word", documentType: "fsd", format: "word" },
      { label: "PDF", documentType: "fsd", format: "pdf" },
    ],
  },
  {
    id: "manual",
    title: "Manuel d'utilisation",
    description:
      "Guide utilisateur clair avec procédures détaillées et captures d'écran.",
    status: "pending",
    exportButtons: [],
  },
];

export default function DocumentGenerationPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [language, setLanguage] = useState("fr");
  const [currentExportKey, setCurrentExportKey] = useState<string | null>(null);
  const [selectionDocumentType, setSelectionDocumentType] =
    useState<SelectionDocumentType>("fsd");
  const [selectedFsdEpicIds, setSelectedFsdEpicIds] = useState<string[]>([]);
  const [selectedFsdFeatureIds, setSelectedFsdFeatureIds] = useState<string[]>([]);
  const [selectedFsdUserStoryIds, setSelectedFsdUserStoryIds] = useState<string[]>([]);
  const [selectedCahierSuiteIds, setSelectedCahierSuiteIds] = useState<string[]>([]);
  const [selectedCahierTestCaseIds, setSelectedCahierTestCaseIds] = useState<string[]>([]);

  const handleDocumentTypeChange = (nextType: SelectionDocumentType) => {
    setSelectionDocumentType(nextType);
    dispatch(clearDocumentWorkflowEditContext());
  };

  const { data: projects = [] } = useGetProjectsQuery();
  const exportMutation = useExportDocumentMutation();
  const selectedProject: any = useSelector(selectedProjectSelector);
  const authRole = useSelector(authRoleSelector);
  const workflowSelection = useSelector(documentWorkflowSelectionSelector);
  const fsdSelectionQuery = useGetFsdSelectionEpicsQuery(
    selectedProject?.id,
    selectionDocumentType === "fsd"
  );

  const allEpics = useMemo<IEpic[]>(() => {
    const epics = fsdSelectionQuery.data || [];

    return epics.map((epic: IFsdSelectionEpic) => ({
      id: epic.id,
      name: epic.name,
      description: "",
      creationDate: new Date(),
      status: EpicStatus.NEW,
      priority: EpicPriority.MEDIUM,
      projectId: selectedProject?.id || "",
      features: epic.features.map((feature) => ({
        id: feature.id,
        name: feature.name,
        description: "",
        creationDate: new Date(),
        status: FeatureStatus.NEW,
        priority: FeaturePriority.MEDIUM,
        epicId: epic.id,
        userStories: feature.userStories.map((story) => ({
          id: story.id,
          name: story.name,
          description: "",
          priority: StoryPriority.MEDIUM,
          status: StoryStatus.TO_DO,
          creationDate: new Date(),
          featureId: feature.id,
          testCases: [],
        })),
      })),
    }));
  }, [fsdSelectionQuery.data, selectedProject?.id]);

  const epicsLoading = fsdSelectionQuery.isLoading;
  const epicsError = fsdSelectionQuery.isError;
  const epicsErrorDetails = fsdSelectionQuery.error;
  const cahierSelectionQuery = useGetCahierSelectionSuitesQuery(
    selectedProject?.id,
    selectionDocumentType === "cahier"
  );

  useEffect(() => {
    console.log("API call disabled for migration step");
  }, []);

  useEffect(() => {
    setSelectedFsdEpicIds([]);
    setSelectedFsdFeatureIds([]);
    setSelectedFsdUserStoryIds([]);
    setSelectedCahierSuiteIds([]);
    setSelectedCahierTestCaseIds([]);
  }, [selectedProject?.id, selectionDocumentType]);

  useEffect(() => {
    if (!selectedProject?.id || !workflowSelection?.projectId) {
      return;
    }

    if (selectedProject.id !== workflowSelection.projectId) {
      return;
    }

    if (
      workflowSelection.documentType === "fsd" &&
      workflowSelection.selectedEpicIds.length > 0
    ) {
      setSelectionDocumentType("fsd");
      setSelectedFsdEpicIds(workflowSelection.selectedEpicIds);
      setSelectedFsdFeatureIds(workflowSelection.selectedFeatureIds || []);
      setSelectedFsdUserStoryIds(workflowSelection.selectedUserStoryIds || []);
      return;
    }

    if (
      workflowSelection.documentType === "cahier" &&
      workflowSelection.selectedSuiteIds.length > 0
    ) {
      setSelectionDocumentType("cahier");
      setSelectedCahierSuiteIds(workflowSelection.selectedSuiteIds);
      setSelectedCahierTestCaseIds(workflowSelection.selectedTestCaseIds || []);
    }
  }, [selectedProject?.id, workflowSelection]);

  useEffect(() => {
    if (authRole === "QA" && selectionDocumentType === "fsd") {
      handleDocumentTypeChange("cahier");
      return;
    }

    if (authRole === "BA" && selectionDocumentType === "cahier") {
      handleDocumentTypeChange("fsd");
    }
  }, [authRole, selectionDocumentType]);

  const triggerExport = (key: string, payload: any) => {
    if (!selectedProject?.id) {
      return;
    }

    setCurrentExportKey(key);
    exportMutation.mutate(payload, {
      onSettled: () => {
        setCurrentExportKey(null);
      },
    });
  };

  const isExporting = exportMutation.isPending;

  const cahierSuites = cahierSelectionQuery.data ?? [];
  const fsdLoadErrorMessage = epicsError
    ? getDocumentLoadErrorMessage("les epics", epicsErrorDetails)
    : "";
  const cahierLoadErrorMessage = cahierSelectionQuery.isError
    ? getDocumentLoadErrorMessage(
        "les suites de test",
        cahierSelectionQuery.error
      )
    : "";
  const exportErrorMessage = exportMutation.isError
    ? getDocumentErrorMessage(exportMutation.error, "export")
    : "";

  const fsdRelations = useMemo(() => {
    const epicById = new Map<string, IEpic>();
    const featureToEpicId = new Map<string, string>();
    const featureToStoryIds = new Map<string, string[]>();
    const storyToFeatureId = new Map<string, string>();
    const epicToFeatureIds = new Map<string, string[]>();

    allEpics.forEach((epic) => {
      epicById.set(epic.id, epic);
      const featureIds = epic.features.map((feature) => feature.id);
      epicToFeatureIds.set(epic.id, featureIds);

      epic.features.forEach((feature) => {
        featureToEpicId.set(feature.id, epic.id);
        const storyIds = feature.userStories.map((story) => story.id);
        featureToStoryIds.set(feature.id, storyIds);
        feature.userStories.forEach((story) => {
          storyToFeatureId.set(story.id, feature.id);
        });
      });
    });

    return {
      epicById,
      featureToEpicId,
      featureToStoryIds,
      storyToFeatureId,
      epicToFeatureIds,
    };
  }, [allEpics]);

  const cahierRelations = useMemo(() => {
    const suiteById = new Map<string, ICahierSelectionSuite>();
    const childrenByParent = new Map<string | null, string[]>();
    const suiteToTestCaseIds = new Map<string, string[]>();
    const testCaseToSuiteId = new Map<string, string>();

    cahierSuites.forEach((suite) => {
      suiteById.set(suite.id, suite);
      const parentKey = suite.parentId ?? null;
      const currentChildren = childrenByParent.get(parentKey) ?? [];
      childrenByParent.set(parentKey, [...currentChildren, suite.id]);

      const testCaseIds = suite.testCases.map((testCase) => testCase.id);
      suiteToTestCaseIds.set(suite.id, testCaseIds);
      suite.testCases.forEach((testCase) => {
        testCaseToSuiteId.set(testCase.id, suite.id);
      });
    });

    return {
      suiteById,
      childrenByParent,
      suiteToTestCaseIds,
      testCaseToSuiteId,
    };
  }, [cahierSuites]);

  const deriveFsdEpicIds = (
    featureIds: Set<string>,
    storyIds: Set<string>
  ): Set<string> => {
    const epicIds = new Set<string>();
    featureIds.forEach((featureId) => {
      const epicId = fsdRelations.featureToEpicId.get(featureId);
      if (epicId) {
        epicIds.add(epicId);
      }
    });
    storyIds.forEach((storyId) => {
      const featureId = fsdRelations.storyToFeatureId.get(storyId);
      if (!featureId) {
        return;
      }
      const epicId = fsdRelations.featureToEpicId.get(featureId);
      if (epicId) {
        epicIds.add(epicId);
      }
    });
    return epicIds;
  };

  const syncFsdSelection = (featureIds: Set<string>, storyIds: Set<string>) => {
    const epicIds = deriveFsdEpicIds(featureIds, storyIds);
    setSelectedFsdFeatureIds(Array.from(featureIds));
    setSelectedFsdUserStoryIds(Array.from(storyIds));
    setSelectedFsdEpicIds(Array.from(epicIds));
  };

  const toggleFsdEpicSelection = (epicId: string) => {
    const featureIds = new Set(selectedFsdFeatureIds);
    const storyIds = new Set(selectedFsdUserStoryIds);

    const epicFeatureIds = fsdRelations.epicToFeatureIds.get(epicId) ?? [];
    const epicStoryIds = epicFeatureIds.flatMap(
      (featureId) => fsdRelations.featureToStoryIds.get(featureId) ?? []
    );

    const isFullySelected =
      epicFeatureIds.every((id) => featureIds.has(id)) &&
      epicStoryIds.every((id) => storyIds.has(id));

    if (isFullySelected) {
      epicFeatureIds.forEach((id) => featureIds.delete(id));
      epicStoryIds.forEach((id) => storyIds.delete(id));
    } else {
      epicFeatureIds.forEach((id) => featureIds.add(id));
      epicStoryIds.forEach((id) => storyIds.add(id));
    }

    syncFsdSelection(featureIds, storyIds);
  };

  const toggleFsdFeatureSelection = (featureId: string) => {
    const featureIds = new Set(selectedFsdFeatureIds);
    const storyIds = new Set(selectedFsdUserStoryIds);
    const featureStoryIds = fsdRelations.featureToStoryIds.get(featureId) ?? [];

    const isFullySelected =
      featureIds.has(featureId) && featureStoryIds.every((id) => storyIds.has(id));

    if (isFullySelected) {
      featureIds.delete(featureId);
      featureStoryIds.forEach((id) => storyIds.delete(id));
    } else {
      featureIds.add(featureId);
      featureStoryIds.forEach((id) => storyIds.add(id));
    }

    syncFsdSelection(featureIds, storyIds);
  };

  const toggleFsdUserStorySelection = (storyId: string) => {
    const featureIds = new Set(selectedFsdFeatureIds);
    const storyIds = new Set(selectedFsdUserStoryIds);
    const parentFeatureId = fsdRelations.storyToFeatureId.get(storyId);

    if (storyIds.has(storyId)) {
      storyIds.delete(storyId);
    } else {
      storyIds.add(storyId);
      if (parentFeatureId) {
        featureIds.add(parentFeatureId);
      }
    }

    syncFsdSelection(featureIds, storyIds);
  };

  const collectSuiteDescendants = (suiteId: string): string[] => {
    const children = cahierRelations.childrenByParent.get(suiteId) ?? [];
    return [suiteId, ...children.flatMap((childId) => collectSuiteDescendants(childId))];
  };

  const collectSuiteDescendantTestCases = (suiteId: string): string[] => {
    const descendantSuiteIds = collectSuiteDescendants(suiteId);
    return descendantSuiteIds.flatMap(
      (id) => cahierRelations.suiteToTestCaseIds.get(id) ?? []
    );
  };

  const syncCahierSelection = (suiteIds: Set<string>, testCaseIds: Set<string>) => {
    setSelectedCahierSuiteIds(Array.from(suiteIds));
    setSelectedCahierTestCaseIds(Array.from(testCaseIds));
  };

  const toggleCahierSuiteSelection = (suiteId: string) => {
    const suiteIds = new Set(selectedCahierSuiteIds);
    const testCaseIds = new Set(selectedCahierTestCaseIds);
    const descendantSuiteIds = collectSuiteDescendants(suiteId);
    const descendantCaseIds = collectSuiteDescendantTestCases(suiteId);

    const isFullySelected =
      descendantSuiteIds.every((id) => suiteIds.has(id)) &&
      descendantCaseIds.every((id) => testCaseIds.has(id));

    if (isFullySelected) {
      descendantSuiteIds.forEach((id) => suiteIds.delete(id));
      descendantCaseIds.forEach((id) => testCaseIds.delete(id));
    } else {
      descendantSuiteIds.forEach((id) => suiteIds.add(id));
      descendantCaseIds.forEach((id) => testCaseIds.add(id));
    }

    syncCahierSelection(suiteIds, testCaseIds);
  };

  const toggleCahierTestCaseSelection = (testCaseId: string, suiteId: string) => {
    const suiteIds = new Set(selectedCahierSuiteIds);
    const testCaseIds = new Set(selectedCahierTestCaseIds);

    if (testCaseIds.has(testCaseId)) {
      testCaseIds.delete(testCaseId);
    } else {
      testCaseIds.add(testCaseId);
      suiteIds.add(suiteId);

      let cursor: string | null = suiteId;
      while (cursor) {
        const current = cahierRelations.suiteById.get(cursor);
        if (!current) {
          break;
        }
        suiteIds.add(current.id);
        cursor = current.parentId;
      }
    }

    syncCahierSelection(suiteIds, testCaseIds);
  };

  const checkedFsdEpicIds = useMemo(
    () => new Set(selectedFsdEpicIds),
    [selectedFsdEpicIds]
  );
  const checkedFsdFeatureIds = useMemo(
    () => new Set(selectedFsdFeatureIds),
    [selectedFsdFeatureIds]
  );
  const checkedFsdUserStoryIds = useMemo(
    () => new Set(selectedFsdUserStoryIds),
    [selectedFsdUserStoryIds]
  );

  const indeterminateFsdFeatureIds = useMemo(() => {
    const indeterminateIds = new Set<string>();
    allEpics.forEach((epic) => {
      epic.features.forEach((feature) => {
        const storyIds = feature.userStories.map((story) => story.id);
        if (storyIds.length === 0) {
          return;
        }
        const selectedCount = storyIds.filter((id) => checkedFsdUserStoryIds.has(id)).length;
        const fullyChecked = selectedCount === storyIds.length && checkedFsdFeatureIds.has(feature.id);
        if (selectedCount > 0 && !fullyChecked) {
          indeterminateIds.add(feature.id);
        }
      });
    });
    return indeterminateIds;
  }, [allEpics, checkedFsdFeatureIds, checkedFsdUserStoryIds]);

  const indeterminateFsdEpicIds = useMemo(() => {
    const indeterminateIds = new Set<string>();
    allEpics.forEach((epic) => {
      const featureIds = epic.features.map((feature) => feature.id);
      const storyIds = epic.features.flatMap((feature) =>
        feature.userStories.map((story) => story.id)
      );

      const selectedFeatureCount = featureIds.filter((id) => checkedFsdFeatureIds.has(id)).length;
      const selectedStoryCount = storyIds.filter((id) => checkedFsdUserStoryIds.has(id)).length;

      const fullyChecked =
        checkedFsdEpicIds.has(epic.id) &&
        selectedFeatureCount === featureIds.length &&
        (storyIds.length === 0 || selectedStoryCount === storyIds.length);

      if ((selectedFeatureCount > 0 || selectedStoryCount > 0) && !fullyChecked) {
        indeterminateIds.add(epic.id);
      }
    });
    return indeterminateIds;
  }, [allEpics, checkedFsdEpicIds, checkedFsdFeatureIds, checkedFsdUserStoryIds]);

  const checkedCahierSuiteIds = useMemo(
    () => new Set(selectedCahierSuiteIds),
    [selectedCahierSuiteIds]
  );
  const checkedCahierTestCaseIds = useMemo(
    () => new Set(selectedCahierTestCaseIds),
    [selectedCahierTestCaseIds]
  );

  const indeterminateCahierSuiteIds = useMemo(() => {
    const ids = new Set<string>();

    const hasAnySelectionInSuite = (suiteId: string): boolean => {
      const directCases = cahierRelations.suiteToTestCaseIds.get(suiteId) ?? [];
      if (directCases.some((id) => checkedCahierTestCaseIds.has(id))) {
        return true;
      }
      const children = cahierRelations.childrenByParent.get(suiteId) ?? [];
      if (children.some((childId) => checkedCahierSuiteIds.has(childId))) {
        return true;
      }
      return children.some((childId) => hasAnySelectionInSuite(childId));
    };

    cahierSuites.forEach((suite) => {
      const descendantSuites = collectSuiteDescendants(suite.id);
      const descendantCases = collectSuiteDescendantTestCases(suite.id);

      const fullyChecked =
        descendantSuites.every((id) => checkedCahierSuiteIds.has(id)) &&
        descendantCases.every((id) => checkedCahierTestCaseIds.has(id));

      if (!fullyChecked && hasAnySelectionInSuite(suite.id)) {
        ids.add(suite.id);
      }
    });

    return ids;
  }, [
    cahierSuites,
    checkedCahierSuiteIds,
    checkedCahierTestCaseIds,
    cahierRelations.childrenByParent,
    cahierRelations.suiteToTestCaseIds,
  ]);

  const areAllSelected =
    selectionDocumentType === "fsd"
      ? allEpics.length > 0 &&
        allEpics.every((epic) => checkedFsdEpicIds.has(epic.id)) &&
        allEpics
          .flatMap((epic) => epic.features)
          .every((feature) => checkedFsdFeatureIds.has(feature.id)) &&
        allEpics
          .flatMap((epic) => epic.features)
          .flatMap((feature) => feature.userStories)
          .every((story) => checkedFsdUserStoryIds.has(story.id))
      : cahierSuites.length > 0 &&
        cahierSuites.every((suite) => checkedCahierSuiteIds.has(suite.id)) &&
        cahierSuites
          .flatMap((suite) => suite.testCases)
          .every((testCase) => checkedCahierTestCaseIds.has(testCase.id));

  const toggleSelectAll = () => {
    if (areAllSelected) {
      setSelectedFsdEpicIds([]);
      setSelectedFsdFeatureIds([]);
      setSelectedFsdUserStoryIds([]);
      setSelectedCahierSuiteIds([]);
      setSelectedCahierTestCaseIds([]);
      return;
    }
    if (selectionDocumentType === "fsd") {
      const epicIds = allEpics.map((epic) => epic.id);
      const featureIds = allEpics.flatMap((epic) => epic.features.map((feature) => feature.id));
      const storyIds = allEpics.flatMap((epic) =>
        epic.features.flatMap((feature) => feature.userStories.map((story) => story.id))
      );
      setSelectedFsdEpicIds(epicIds);
      setSelectedFsdFeatureIds(featureIds);
      setSelectedFsdUserStoryIds(storyIds);
    } else {
      setSelectedCahierSuiteIds(cahierSuites.map((suite) => suite.id));
      setSelectedCahierTestCaseIds(
        cahierSuites.flatMap((suite) => suite.testCases.map((testCase) => testCase.id))
      );
    }
  };

  const canContinueToStepTwo =
    Boolean(selectedProject?.id) &&
    (selectionDocumentType === "fsd"
      ? selectedFsdEpicIds.length > 0 || selectedFsdFeatureIds.length > 0 || selectedFsdUserStoryIds.length > 0
      : selectedCahierSuiteIds.length > 0 || selectedCahierTestCaseIds.length > 0);

  const handleContinueToStepTwo = () => {
    if (!canContinueToStepTwo || !selectedProject?.id) {
      return;
    }

    if (selectionDocumentType === "fsd") {
      dispatch(
        setFsdEpicSelection({
          projectId: selectedProject.id,
          selectedEpicIds: selectedFsdEpicIds,
          selectedFeatureIds: selectedFsdFeatureIds,
          selectedUserStoryIds: selectedFsdUserStoryIds,
        })
      );
      navigate("/document-generation/Metadonnees-et-details/fsd");
      return;
    }

    dispatch(
      setCahierSuiteSelection({
        projectId: selectedProject.id,
        selectedSuiteIds: selectedCahierSuiteIds,
        selectedTestCaseIds: selectedCahierTestCaseIds,
      })
    );

    navigate("/document-generation/Metadonnees-et-details/cahier");
  };



  return (
    <Box minH="100vh" bg="gray.50">
      <Box
          position="sticky"
          top="86px"   // to be below the top navigation bar
          zIndex={10}
          bg="white"
          borderTopWidth="1px"
          borderBottomWidth="1px"
          borderColor="gray.200"
      >
      <Box maxW="7xl" mx="auto" px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }}>
          <WorkflowStepBar activeStep={1} />
        </Box>
      </Box>

      <Box maxW="7xl" mx="auto" px={{ base: 4, md: 6 }} py={{ base: 8, md: 10 }}>
        <Box textAlign="center" mb={12}>
          <Heading size="lg" color="gray.800" mb={3}>
            Gestionnaire de Documents
          </Heading>
          <Text color="gray.600" maxW="2xl" mx="auto">
            Gérez, générez et exportez vos livrables documentaires en toute simplicité.
          </Text>
        </Box>

        <Flex
          flexDirection={{ base: "column", md: "row" }}
          alignItems={{ base: "stretch", md: "end" }}
          justifyContent="center"
          gap={6}
          mb={12}
        >
          <Box w={{ base: "100%", md: "sm" }}>
            <Text fontSize="sm" fontWeight="semibold" mb={2} color="gray.700">
              Langue
            </Text>
            <Select
              value={language}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                setLanguage(event.target.value)
              }
              bg="white"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </Select>
          </Box>
        </Flex>

        <Box
          bg="white"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="xl"
          p={6}
          mb={10}
          boxShadow="sm"
        >
          <Flex
            justifyContent="space-between"
            alignItems={{ base: "start", md: "center" }}
            flexDirection={{ base: "column", md: "row" }}
            gap={4}
            mb={4}
          >
            <Box>
              <Heading size="md" color="gray.800" mb={1}>
                Nouveau workflow - Etape 1: Selection des donnees
              </Heading>
              <Text fontSize="sm" color="gray.600">
                Selectionnez les epics (FSD) ou suites de test (Cahier) a inclure dans la prochaine etape.
              </Text>
            </Box>

            <HStack spacing={2}>
              <Button
                size="sm"
                variant={selectionDocumentType === "fsd" ? "solid" : "outline"}
                colorScheme="blue"
                onClick={() => handleDocumentTypeChange("fsd")}
                isDisabled={!canCreateOrEditDocumentType(authRole, "fsd")}
              >
                FSD
              </Button>
              <Button
                size="sm"
                variant={selectionDocumentType === "cahier" ? "solid" : "outline"}
                colorScheme="blue"
                onClick={() => handleDocumentTypeChange("cahier")}
                isDisabled={!canCreateOrEditDocumentType(authRole, "cahier")}
              >
                Cahier de Recette
              </Button>
            </HStack>
          </Flex>

          {!selectedProject?.id ? (
            <Text fontSize="sm" color="orange.600">
              Selectionnez d'abord un projet pour charger les donnees disponibles.
            </Text>
          ) : (
            <>
              <Divider mb={4} />

              {selectionDocumentType === "fsd" ? (
                <Box mb={4}>
                  <Flex justifyContent="space-between" alignItems="center" mb={3}>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                      Epics disponibles
                    </Text>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorScheme="blue"
                      onClick={toggleSelectAll}
                      isDisabled={allEpics.length === 0 || epicsLoading}
                    >
                      {areAllSelected ? "Tout deselectionner" : "Tout selectionner"}
                    </Button>
                  </Flex>
                  <AvailableEpicsTable
                    availableEpics={allEpics}
                    checkedEpicIds={checkedFsdEpicIds}
                    checkedFeatureIds={checkedFsdFeatureIds}
                    checkedUserStoryIds={checkedFsdUserStoryIds}
                    indeterminateEpicIds={indeterminateFsdEpicIds}
                    indeterminateFeatureIds={indeterminateFsdFeatureIds}
                    onToggleEpic={toggleFsdEpicSelection}
                    onToggleFeature={toggleFsdFeatureSelection}
                    onToggleUserStory={toggleFsdUserStorySelection}
                    isLoading={epicsLoading}
                  />
                  {fsdLoadErrorMessage ? (
                    <Text fontSize="sm" color="red.600" mt={2}>
                      {fsdLoadErrorMessage}
                    </Text>
                  ) : null}
                  {!epicsLoading && !fsdLoadErrorMessage && allEpics.length === 0 ? (
                    <Text fontSize="sm" color="gray.600" mt={2}>
                      Aucun epic disponible pour ce projet.
                    </Text>
                  ) : null}
                </Box>
              ) : (
                <Box mb={4}>
                  <Flex justifyContent="space-between" alignItems="center" mb={3}>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                      Suites de test disponibles
                    </Text>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorScheme="blue"
                      onClick={toggleSelectAll}
                      isDisabled={cahierSuites.length === 0 || cahierSelectionQuery.isLoading}
                    >
                      {areAllSelected ? "Tout deselectionner" : "Tout selectionner"}
                    </Button>
                  </Flex>
                  {cahierSelectionQuery.isLoading ? (
                    <Flex py={8} justifyContent="center" alignItems="center" gap={3}>
                      <Spinner size="sm" color="blue.500" />
                      <Text fontSize="sm" color="gray.600">
                        Chargement des suites de test...
                      </Text>
                    </Flex>
                  ) : cahierSelectionQuery.isError ? (
                    <Text fontSize="sm" color="red.600">
                      {cahierLoadErrorMessage}
                    </Text>
                  ) : (
                    <AvailableSuitesTable
                      availableSuites={cahierSuites}
                      checkedSuiteIds={checkedCahierSuiteIds}
                      checkedTestCaseIds={checkedCahierTestCaseIds}
                      indeterminateSuiteIds={indeterminateCahierSuiteIds}
                      onToggleSuite={toggleCahierSuiteSelection}
                      onToggleTestCase={toggleCahierTestCaseSelection}
                      isLoading={false}
                    />
                  )}
                  {!cahierSelectionQuery.isLoading &&
                  !cahierSelectionQuery.isError &&
                  cahierSuites.length === 0 ? (
                    <Text fontSize="sm" color="gray.600" mt={2}>
                      Aucune suite de test disponible pour ce projet.
                    </Text>
                  ) : null}
                  <Flex mt={4} alignItems="center" gap={2}>
                    <Text fontSize="sm" color="gray.600" fontWeight="medium">
                      {selectedCahierSuiteIds.length + selectedCahierTestCaseIds.length}{" "}
                      element(s) selectionne(s)
                    </Text>
                  </Flex>
                </Box>
              )}

              <Flex
                mt={6}
                alignItems={{ base: "start", md: "center" }}
                justifyContent="flex-end"
                flexDirection={{ base: "column", md: "row" }}
                gap={3}
              >
                <Button
                  size="sm"
                  colorScheme="blue"
                  isDisabled={!canContinueToStepTwo}
                  onClick={handleContinueToStepTwo}
                >
                  Continuer vers l'etape 2
                </Button>
              </Flex>
              {exportErrorMessage ? (
                <Text fontSize="sm" color="red.600" mt={3}>
                  {exportErrorMessage}
                </Text>
              ) : null}

            </>
          )}
        </Box>

        <Flex alignItems="center" justifyContent="space-between" mb={6}>
          <Text
            fontSize="sm"
            fontWeight="bold"
            color="gray.500"
            textTransform="uppercase"
            letterSpacing="wide"
          >
            Types de documents
          </Text>
          <Badge colorScheme="blue" variant="subtle" px={3} py={1} borderRadius="full">
            {projects.length} projet(s)
          </Badge>
        </Flex>

        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={6} mb={12}>
          {documentCards.map((doc) => (
            <Box
              key={doc.id}
              bg="white"
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="xl"
              p={6}
              boxShadow="sm"
              transition="all 0.2s ease"
              _hover={{ boxShadow: "lg", borderColor: "blue.200" }}
            >
              <Flex alignItems="start" justifyContent="space-between" mb={4}>
                <Box
                  w={12}
                  h={12}
                  borderRadius="lg"
                  bg="gray.100"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="gray.500"
                  fontWeight="bold"
                >
                  {doc.title.slice(0, 1)}
                </Box>
                <Badge
                  colorScheme={doc.status === "ready" ? "green" : doc.status === "draft" ? "orange" : "blue"}
                  variant="subtle"
                >
                  {doc.status === "ready" ? "PRÊT" : doc.status === "draft" ? "BROUILLON" : "EN ATTENTE"}
                </Badge>
              </Flex>

              <Heading size="md" mb={2} color="gray.800">
                {doc.title}
              </Heading>
              <Text fontSize="sm" color="gray.600" mb={6} noOfLines={3}>
                {doc.description}
              </Text>

              {doc.exportButtons.length > 0 ? (
                <Grid templateColumns={doc.id === "cahier" ? "repeat(3, 1fr)" : "repeat(2, 1fr)"} gap={2}>
                  {doc.exportButtons.map((button: any) => (
                    <Button
                      key={`${doc.id}-${button.label}`}
                      size="sm"
                      colorScheme="blue"
                      isDisabled={!selectedProject || isExporting}
                      isLoading={isExporting && currentExportKey === `${doc.id}-${button.label}`}
                      onClick={() =>
                        triggerExport(`${doc.id}-${button.label}`, {
                          projectId: selectedProject.id,
                          documentType: button.documentType as DocumentType,
                          format: button.format as DocumentFormat,
                          mode:
                            button.documentType === "fsd" &&
                            button.format === "pdf"
                              ? "fsd-updated-template-test"
                              : undefined,
                          language:
                            button.documentType === "fsd"
                              ? (language as "en" | "fr")
                              : undefined,
                        })
                      }
                    >
                      Exporter {button.label}
                    </Button>
                  ))}
                </Grid>
              ) : (
                <Button size="sm" variant="outline" w="full" isDisabled>
                  Prévisualiser
                </Button>
              )}
            </Box>
          ))}
        </SimpleGrid>

        <Box
          borderWidth="2px"
          borderStyle="dashed"
          borderColor="gray.300"
          borderRadius="xl"
          p={{ base: 8, md: 12 }}
          textAlign="center"
          bg="white"
          _hover={{ borderColor: "blue.200", bg: "blue.50" }}
          transition="all 0.2s ease"
        >
          <Box
            w={16}
            h={16}
            borderRadius="full"
            bg="gray.100"
            mx="auto"
            mb={4}
            display="flex"
            alignItems="center"
            justifyContent="center"
            color="gray.500"
            fontSize="2xl"
          >
            +
          </Box>
          <Heading size="md" mb={2} color="gray.800">
            Besoin d'un autre format ?
          </Heading>
          <Text color="gray.600" maxW="2xl" mx="auto">
            Personnalisez vos propres modèles d'exportation ou contactez notre équipe pour des besoins spécifiques.
          </Text>
        </Box>

        {exportMutation.isError ? (
          <Text mt={4} color="red.600" fontSize="sm">
            {exportMutation.error instanceof Error
              ? exportMutation.error.message
              : "Export failed."}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}
