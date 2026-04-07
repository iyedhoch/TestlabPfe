import { colors } from "@/theme/colors";
import {
  Flex,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  IconButton,
  Box,
  Badge,
  useBreakpointValue,
  useDisclosure,
  useToast,
  Grid,
} from "@chakra-ui/react";
import Expand from "@/assets/svg/expand.svg?react";
import Collapse from "@/assets/svg/collapse.svg?react";
import SettingsAlt from "@/assets/svg/settingsAlt.svg?react";
import Toggle from "@/assets/svg/toggle.svg?react";
import Plus from "@/assets/svg/plus.svg?react";
import Arrow from "@/assets/svg/arrow.svg?react";
import Suite from "@/assets/svg/suite.svg?react";
import TestSuiteItem from "./TestSuiteItem";
import { useState, useEffect, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDispatch, useSelector } from "react-redux";
import { selectedProjectSelector } from "@/app/slices/projectSlice";
import {
  GET_TEST_SUITES,
  ITestCase,
  ITestSuite,
  TEST_GENERATION_QUERIES_PREFIX,
  useCreateTestSuiteMutation,
  useDeleteTestCaseMutation,
  useDeleteTestSuiteMutation,
  useMoveTestCaseMutation,
  useMoveTestSuiteMutation,
  useReorderTestSuitesMutation,
} from "@/services";
import SuiteCreationModal from "./modals/SuiteCreationModal";
import { queryClient } from "@/App";
import EditTestCaseModal from "../modals/EditTestCaseModal";
import { ConfirmationModal } from "@/components";
import {
  selectedTestCaseSelector,
  selectedTestSuiteSelector,
  setSelectedTestCase,
  setSelectedTestSuite,
} from "@/app/slices/testGenerationSlice";
import EditTestSuiteModal from "../modals/EditTestSuiteModal";
import MoveSuiteModal from "./modals/MoveSuiteModal";
import MoveCaseModal from "./modals/MoveCaseModal";
import NewTestCaseModal from "../modals/NewTestCaseModal";

export interface ITestSuiteItem extends ITestSuite {
  isExpanded?: boolean;
}

// Expansion state tracker
interface ExpansionState {
  [key: string]: boolean;
}

const MIN_WIDTH = 250;
const MAX_WIDTH = 500;
const DEFAULT_WIDTH = 300;

interface IExplorerSidebar {
  testSuitesData: ITestSuite[];
}

export default function ExplorerSidebar({ testSuitesData }: IExplorerSidebar) {
  const selectedProject = useSelector(selectedProjectSelector);
  const selectedTestCase = useSelector(selectedTestCaseSelector);
  const selectedTestSuite = useSelector(selectedTestSuiteSelector);
  const [testSuites, setTestSuites] = useState<ITestSuite[]>([]);
  const [expansionState, setExpansionState] = useState<ExpansionState>({});
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProjectExpanded, setIsProjectExpanded] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [isManualCaseFlow, setIsManualCaseFlow] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const sidebarHeight = useBreakpointValue({ base: "425px", "2xl": "775px" });
  const { mutate: createTestSuite, isPending: isCreatingTestSuite } =
    useCreateTestSuiteMutation();
  const { mutate: reorderTestSuites } = useReorderTestSuitesMutation();
  const {
    onOpen: openSuiteCreationModal,
    onClose: closeSuiteCreationModal,
    isOpen: isSuiteCreationModalOpen,
  } = useDisclosure();
  const {
    onOpen: openNewTestCaseModal,
    onClose: closeNewTestCaseModal,
    isOpen: isNewTestCaseModalOpen,
  } = useDisclosure();
  const {
    onOpen: openMoveSuiteModal,
    onClose: closeMoveSuiteModal,
    isOpen: isMoveSuiteModalOpen,
  } = useDisclosure();
  const {
    onOpen: openMoveCaseModal,
    onClose: closeMoveCaseModal,
    isOpen: isMoveCaseModalOpen,
  } = useDisclosure();
  const toast = useToast();
  const dispatch = useDispatch();
  const {
    isOpen: isDeleteCaseModalOpen,
    onOpen: openDeleteCaseModal,
    onClose: closeDeleteCaseModal,
  } = useDisclosure();
  const {
    isOpen: isEditCaseModalOpen,
    onOpen: openEditCaseModal,
    onClose: closeEditCaseModal,
  } = useDisclosure();
  const {
    isOpen: isDeleteSuiteModalOpen,
    onOpen: openDeleteSuiteModal,
    onClose: closeDeleteSuiteModal,
  } = useDisclosure();
  const {
    isOpen: isEditSuiteModalOpen,
    onOpen: openEditSuiteModal,
    onClose: closeEditSuiteModal,
  } = useDisclosure();

  const { mutate: deleteTestCase, isPending: isDeletingTestCase } =
    useDeleteTestCaseMutation();
  const { mutate: deleteTestSuite, isPending: isDeletingTestSuite } =
    useDeleteTestSuiteMutation();
  const { mutate: moveTestCase, isPending: isMovingTestCase } =
    useMoveTestCaseMutation();
  const { mutate: moveTestSuite, isPending: isMovingTestSuite } =
    useMoveTestSuiteMutation();

  // Initialize expansion state when data changes
  useEffect(() => {
    if (testSuitesData) {
      setTestSuites(testSuitesData);

      // Build initial expansion state - all expanded by default
      const buildExpansionState = (suites: ITestSuite[]): ExpansionState => {
        const state: ExpansionState = {};

        const traverse = (suites: ITestSuite[]) => {
          suites.forEach((suite) => {
            state[suite.id] = true; // Expand by default
            if (suite.children && suite.children.length > 0) {
              traverse(suite.children);
            }
          });
        };

        traverse(suites);
        return state;
      };

      setExpansionState(buildExpansionState(testSuitesData));
    }
  }, [testSuitesData]);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth =
        e.clientX - (sidebarRef.current?.getBoundingClientRect().left || 0);

      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTestSuites((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reorderedItems = arrayMove(items, oldIndex, newIndex);

        // Update orders and send to backend
        const suitesWithNewOrder = reorderedItems.map((suite, index) => ({
          id: suite?.id,
          order: index,
        }));

        if (selectedProject?.id) {
          reorderTestSuites(
            {
              projectId: selectedProject.id,
              suites: suitesWithNewOrder,
            },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({
                  queryKey: [TEST_GENERATION_QUERIES_PREFIX, GET_TEST_SUITES],
                });
              },
              onError: (error: any) => {
                toast({
                  title: "Erreur de réorganisation",
                  description:
                    error?.response?.data?.error ||
                    error?.message ||
                    "Erreur lors de la réorganisation des suites",
                  status: "error",
                  duration: 4000,
                });
                // Revert on error
                queryClient.invalidateQueries({
                  queryKey: [TEST_GENERATION_QUERIES_PREFIX, GET_TEST_SUITES],
                });
              },
            }
          );
        }

        return reorderedItems;
      });
    }
  };

  const handleToggleSuite = (suiteId: string) => {
    setExpansionState((prev) => ({
      ...prev,
      [suiteId]: !prev[suiteId],
    }));
  };

  const handleExpandAll = () => {
    setIsProjectExpanded(true);

    // Set all suites to expanded
    const expandAll = (suites: ITestSuite[]): ExpansionState => {
      const state: ExpansionState = {};

      const traverse = (suites: ITestSuite[]) => {
        suites.forEach((suite) => {
          state[suite.id] = true;
          if (suite.children && suite.children.length > 0) {
            traverse(suite.children);
          }
        });
      };

      traverse(suites);
      return state;
    };

    setExpansionState(expandAll(testSuites));
  };

  const handleCollapseAll = () => {
    setIsProjectExpanded(false);

    // Set all suites to collapsed
    const collapseAll = (suites: ITestSuite[]): ExpansionState => {
      const state: ExpansionState = {};

      const traverse = (suites: ITestSuite[]) => {
        suites.forEach((suite) => {
          state[suite.id] = false;
          if (suite.children && suite.children.length > 0) {
            traverse(suite.children);
          }
        });
      };

      traverse(suites);
      return state;
    };

    setExpansionState(collapseAll(testSuites));
  };

  const handleReorderTestCases = (
    suiteId: string,
    newTestCases: ITestCase[]
  ) => {
    const reorderInSuite = (suites: ITestSuite[]): ITestSuite[] => {
      return suites.map((suite) => {
        if (suite.id === suiteId) {
          return { ...suite, testCases: newTestCases };
        }
        if (suite.children && suite.children.length > 0) {
          return {
            ...suite,
            children: reorderInSuite(suite.children),
          };
        }
        return suite;
      });
    };

    setTestSuites((prevSuites) => reorderInSuite(prevSuites));
  };

  const handleDeleteTestCase = () => {
    if (!selectedTestCase) return;

    deleteTestCase(selectedTestCase?.id, {
      onSuccess: () => {
        dispatch(setSelectedTestCase({ testCase: null }));

        queryClient.invalidateQueries({
          queryKey: [TEST_GENERATION_QUERIES_PREFIX, GET_TEST_SUITES],
        });

        toast({
          title: "Cas de test supprimé",
          description: "Le cas de test a été supprimé avec succès",
          status: "success",
          duration: 3000,
        });
        closeDeleteCaseModal();
      },
      onError: (error: any) => {
        console.log("ERROR", error);

        toast({
          title: "Erreur de suppression",
          description:
            error?.response?.data?.error ||
            error?.message ||
            "Erreur lors de la suppression du cas de test",
          status: "error",
          duration: 4000,
        });
      },
    });
  };

  const handleDeleteTestSuite = () => {
    if (!selectedTestSuite) return;

    deleteTestSuite(selectedTestSuite?.id, {
      onSuccess: () => {
        dispatch(setSelectedTestSuite({ testSuite: null }));

        queryClient.invalidateQueries({
          queryKey: [TEST_GENERATION_QUERIES_PREFIX, GET_TEST_SUITES],
        });

        toast({
          title: "Suite de test supprimé",
          description: "Le suite de test a été supprimé avec succès",
          status: "success",
          duration: 3000,
        });
        closeDeleteSuiteModal();
      },
      onError: (error: any) => {
        console.log("ERROR", error);

        toast({
          title: "Erreur de suppression",
          description:
            error?.response?.data?.error ||
            error?.message ||
            "Erreur lors de la suppression du suite de test",
          status: "error",
          duration: 4000,
        });
      },
    });
  };

  // Helper to count all suites recursively
  const countAllSuites = (suites: ITestSuite[]): number => {
    return suites.reduce((count, suite) => {
      return count + 1 + (suite.children ? countAllSuites(suite.children) : 0);
    }, 0);
  };

  return (
    <Flex
      ref={sidebarRef}
      position="relative"
      border="1px solid"
      borderColor={colors.border}
      bg="white"
      zIndex={1}
      borderRadius=".75rem"
      minHeight={sidebarHeight}
      padding="1rem"
      width={isCollapsed ? "60px" : `${sidebarWidth}px`}
      flexDirection="column"
      transition={isResizing ? "none" : "width 0.3s ease"}
      overflow="hidden"
    >
      <Flex width="100%" alignItems="center" justifyContent="space-between">
        {!isCollapsed && (
          <Text fontSize=".8rem" fontWeight="500" color="gray.400">
            EXPLORER
          </Text>
        )}
        <Flex gap=".5rem" ml={isCollapsed ? "0" : "auto"}>
          {!isCollapsed && (
            <>
              <Expand cursor="pointer" onClick={handleCollapseAll} />
              <Collapse cursor="pointer" onClick={handleExpandAll} />
              <Menu>
                <MenuButton>
                  <SettingsAlt cursor="pointer" />
                </MenuButton>
                <MenuList zIndex={10000} minWidth="125px">
                  <MenuItem
                    fontSize="13px"
                    onClick={() => {
                      if (selectedTestCase) {
                        openEditCaseModal();
                      } else {
                        openEditSuiteModal();
                      }
                    }}
                  >
                    <Text>Modifier</Text>
                  </MenuItem>
                  <MenuItem
                    fontSize="13px"
                    onClick={() => {
                      if (selectedTestCase) {
                        openDeleteCaseModal();
                      } else {
                        openDeleteSuiteModal();
                      }
                    }}
                  >
                    <Text>Supprimer</Text>
                  </MenuItem>
                  <MenuItem
                    fontSize="13px"
                    onClick={() => {
                      if (selectedTestSuite) {
                        openMoveSuiteModal();
                      } else {
                        openMoveCaseModal();
                      }
                    }}
                  >
                    <Text>déplacer</Text>
                  </MenuItem>
                </MenuList>
              </Menu>
              <Menu>
                <MenuButton>
                  <Flex
                    width="1.5rem"
                    height="1.5rem"
                    bg={colors.blue}
                    borderRadius=".5rem"
                    justifyContent="center"
                    alignItems="center"
                    cursor="pointer"
                    transition=".3s"
                    _hover={{ bg: "blue.600" }}
                  >
                    <Icon color="white" width="1rem" height="1rem" as={Plus} />
                  </Flex>
                </MenuButton>
                <MenuList zIndex={10000}>
                  <MenuItem
                    fontSize="13px"
                    onClick={() => {
                      openSuiteCreationModal();
                    }}
                  >
                    <Text>Suite de test</Text>
                  </MenuItem>
                  <MenuItem
                    fontSize="13px"
                    onClick={() => {
                      if (selectedTestSuite) {
                        setIsManualCaseFlow(false);
                      } else {
                        setIsManualCaseFlow(true);
                      }
                      openNewTestCaseModal();
                    }}
                  >
                    <Text>Cas de test</Text>
                  </MenuItem>
                </MenuList>
              </Menu>
            </>
          )}
          <Toggle
            cursor="pointer"
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)",
              transition: ".5s",
            }}
          />
        </Flex>
      </Flex>
      {!isCollapsed && (
        <>
          <Flex
            bg={colors.border}
            width="100%"
            height="1px"
            marginBlock="1rem"
          />
          <Flex flexDirection="column">
            {/* Project Name - Level 1 - Always Visible */}
            {selectedProject && (
              <Flex
                alignItems="center"
                gap=".5rem"
                padding=".5rem .75rem"
                borderRadius=".5rem"
                _hover={{ bg: colors.body }}
                cursor="pointer"
                marginBottom=".25rem"
              >
                <IconButton
                  icon={
                    <Box
                      as={Arrow}
                      width=".85rem"
                      height=".85rem"
                      sx={{
                        transform: isProjectExpanded
                          ? "rotate(0deg)"
                          : "rotate(-90deg)",
                        transition: "transform 0.3s ease-in-out",
                      }}
                    />
                  }
                  size="xs"
                  variant="ghost"
                  minW="auto"
                  aria-label="Toggle project"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsProjectExpanded(!isProjectExpanded);
                  }}
                />

                <Box
                  width="1.1rem"
                  height="1.1rem"
                  flexShrink={0}
                  color={colors.blue}
                >
                  <Suite width="100%" height="100%" />
                </Box>

                <Flex
                  justifyContent="space-between"
                  gap=".5rem"
                  alignItems="center"
                  width="100%"
                >
                  <Text fontSize="13px" fontWeight="500" noOfLines={1}>
                    {selectedProject?.name}
                  </Text>
                  <Badge
                    padding=".15rem .35rem"
                    color={colors.badge}
                    borderRadius="50px"
                    textTransform="capitalize"
                    fontSize="9px"
                    flexShrink={0}
                  >
                    <Text color={colors.text}>
                      {countAllSuites(testSuites)}
                    </Text>
                  </Badge>
                </Flex>
              </Flex>
            )}

            {/* Test Suites - Level 2 */}
            <Grid
              transition="grid-template-rows 0.5s ease"
              gridTemplateRows={isProjectExpanded ? "1fr" : "0fr"}
              overflow="hidden"
            >
              <Flex flexDirection="column" overflow="hidden">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={testSuites?.map((suite) => suite?.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {testSuites
                      ?.sort((a, b) => a.order - b.order)
                      ?.map((suite) => (
                        <TestSuiteItem
                          key={suite?.id}
                          {...suite}
                          projectId={suite?.projectId}
                          testCases={suite.testCases || []}
                          isExpanded={expansionState[suite.id] ?? true}
                          onToggle={handleToggleSuite}
                          onReorderTestCases={handleReorderTestCases}
                          expansionState={expansionState}
                          depth={0}
                        />
                      ))}
                  </SortableContext>
                </DndContext>
              </Flex>
            </Grid>
          </Flex>
        </>
      )}

      {/* Resize Handle */}
      {!isCollapsed && (
        <Box
          position="absolute"
          right="0"
          top="0"
          bottom="0"
          width="4px"
          cursor="col-resize"
          bg="transparent"
          transition="background 0.2s"
          onMouseDown={() => setIsResizing(true)}
          zIndex={10}
        />
      )}

      {/* MODALS */}
      <SuiteCreationModal
        isOpen={isSuiteCreationModalOpen}
        onClose={closeSuiteCreationModal}
        isLoading={isCreatingTestSuite}
        onSubmit={({ name, parentId }) => {
          if (!selectedProject) return;

          createTestSuite(
            {
              name,
              projectId: selectedProject?.id,
              ...(parentId && { parentId }),
            },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({
                  queryKey: [TEST_GENERATION_QUERIES_PREFIX, GET_TEST_SUITES],
                  exact: false,
                });

                toast({
                  title: "Suite créee",
                  description: "La suite de test a été ajouté avec succès",
                  status: "success",
                  duration: 3000,
                });
                closeSuiteCreationModal();
              },
              onError: (error) => {
                toast({
                  title: "Création impossible",
                  description:
                    error?.message || "Erreur lors de la création de la suite",
                  status: "error",
                  duration: 4000,
                });
              },
            }
          );
        }}
      />

      <NewTestCaseModal
        isOpen={isNewTestCaseModalOpen}
        onClose={closeNewTestCaseModal}
        isManualCaseFlow={isManualCaseFlow}
      />

      <MoveSuiteModal
        isOpen={isMoveSuiteModalOpen}
        onClose={closeMoveSuiteModal}
        isLoading={isMovingTestSuite}
        onSubmit={(payload) => {
          moveTestSuite(
            {
              destinationSuiteId: payload?.destinationSuiteId,
              suiteId: payload?.suiteId,
            },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({
                  queryKey: [TEST_GENERATION_QUERIES_PREFIX, GET_TEST_SUITES],
                  exact: false,
                });

                toast({
                  title: "Suite déplacé",
                  description: "La suite de test a été déplacé avec succès",
                  status: "success",
                  duration: 3000,
                });
                closeMoveSuiteModal();
              },
              onError: (error) => {
                toast({
                  title: "Déplacement impossible",
                  description:
                    error?.message ||
                    "Erreur lors de la déplacement de la suite",
                  status: "error",
                  duration: 4000,
                });
              },
            }
          );
        }}
      />

      <MoveCaseModal
        isOpen={isMoveCaseModalOpen}
        onClose={closeMoveCaseModal}
        isLoading={isMovingTestCase}
        onSubmit={(payload) => {
          moveTestCase(
            {
              destinationSuiteId: payload?.destinationSuiteId,
              testCaseId: payload?.testCaseId,
            },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({
                  queryKey: [TEST_GENERATION_QUERIES_PREFIX, GET_TEST_SUITES],
                  exact: false,
                });

                toast({
                  title: "Cas de test déplacé",
                  description: "Le cas de test a été déplacé avec succès",
                  status: "success",
                  duration: 3000,
                });
                closeMoveCaseModal();
              },
              onError: (error) => {
                toast({
                  title: "Déplacement impossible",
                  description:
                    error?.message ||
                    "Erreur lors de la déplacement du cas de test",
                  status: "error",
                  duration: 4000,
                });
              },
            }
          );
        }}
      />

      <ConfirmationModal
        isOpen={isDeleteCaseModalOpen}
        onClose={closeDeleteCaseModal}
        onConfirm={handleDeleteTestCase}
        isLoading={isDeletingTestCase}
        title="Supprimer le cas de test"
        description={`Êtes-vous sûr de vouloir supprimer le cas de test "${selectedTestCase?.name}" ? Cette action est irréversible et supprimera également toutes les préconditions et étapes de test associées.`}
        isDeleteModal
        ConfirmationLabel="Supprimer"
      />

      <ConfirmationModal
        isOpen={isDeleteSuiteModalOpen}
        onClose={closeDeleteSuiteModal}
        onConfirm={handleDeleteTestSuite}
        isLoading={isDeletingTestSuite}
        title="Supprimer le suite de test"
        description={`Êtes-vous sûr de vouloir supprimer le suite de test "${selectedTestSuite?.name}" ? Cette action est irréversible et supprimera également toutes les préconditions et étapes de test associées.`}
        isDeleteModal
        ConfirmationLabel="Supprimer"
      />

      <EditTestCaseModal
        closeEditModal={closeEditCaseModal}
        isEditModalOpen={isEditCaseModalOpen}
      />

      <EditTestSuiteModal
        isEditModalOpen={isEditSuiteModalOpen}
        closeEditModal={closeEditSuiteModal}
      />
    </Flex>
  );
}
