import { colors } from "@/theme/colors";
import { Flex, Text, IconButton, Box, Badge, Grid } from "@chakra-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Arrow from "@/assets/svg/arrow.svg?react";
import Folder from "@/assets/svg/folder.svg?react";
import TestCaseItem from "./TestCaseItem";
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
import { ITestCase, ITestSuite } from "@/services";
import { useDispatch, useSelector } from "react-redux";
import {
  selectedTestSuiteSelector,
  setSelectedTestCase,
  setSelectedTestSuite,
} from "@/app/slices/testGenerationSlice";
import { useRef } from "react";

interface ExpansionState {
  [key: string]: boolean;
}

interface ITestSuiteItem extends ITestSuite {
  isExpanded?: boolean;
  onToggle?: (suiteId: string) => void;
  onReorderTestCases?: (suiteId: string, newTestCases: ITestCase[]) => void;
  expansionState?: ExpansionState;
  depth?: number;
}

export default function TestSuiteItem({
  id,
  name,
  testCases = [],
  projectId,
  isExpanded = false,
  onToggle,
  onReorderTestCases,
  children = [],
  expansionState = {},
  depth = 0,
}: ITestSuiteItem) {
  const dispatch = useDispatch();
  const selectedTestSuite = useSelector(selectedTestSuiteSelector);
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const isSelected = selectedTestSuite && selectedTestSuite?.id === id;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const testCaseSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleTestCaseDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = testCases.findIndex((item) => item.id === active.id);
      const newIndex = testCases.findIndex((item) => item.id === over.id);
      const newTestCases = arrayMove(testCases, oldIndex, newIndex);
      onReorderTestCases?.(id, newTestCases);
    }
  };

  const handleSelect = () => {
    dispatch(
      setSelectedTestSuite({
        testSuite: {
          id,
          name,
          testCases,
          projectId,
        },
      })
    );

    dispatch(
      setSelectedTestCase({
        testCase: null,
      })
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (mouseDownPos.current) {
      const deltaX = Math.abs(e.clientX - mouseDownPos.current.x);
      const deltaY = Math.abs(e.clientY - mouseDownPos.current.y);

      // If mouse moved less than 5 pixels, it's a click, not a drag
      if (deltaX < 5 && deltaY < 5) {
        handleSelect();
      }
    }
    mouseDownPos.current = null;
  };

  // Calculate margin based on depth
  const marginLeft = `${1 + depth * 1.1}rem`; // 1rem base + 1rem per depth level

  return (
    <>
      <Flex
        ref={setNodeRef}
        style={style}
        alignItems="center"
        gap=".5rem"
        marginLeft={marginLeft}
        marginBottom=".25rem"
        padding=".25rem"
        {...attributes}
      >
        {/* Combined blue section with arrow and content - entire section is draggable */}
        <Flex
          flex="1"
          alignItems="center"
          gap=".5rem"
          borderRadius=".5rem"
          bg={
            isSelected ? colors.blue : isDragging ? colors.body : "transparent"
          }
          _hover={{ bg: isSelected ? colors.blue : colors.body }}
          padding=".35rem .5rem"
          transition="background 0.25s"
          cursor="grab"
          _active={{ cursor: "grabbing" }}
          {...listeners}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        >
          {/* Arrow button */}
          <Box
            display="flex"
            alignItems="center"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
          >
            <IconButton
              icon={
                <Box
                  as={Arrow}
                  width=".85rem"
                  height=".85rem"
                  color={isSelected ? colors.white : "gray.600"}
                  sx={{
                    transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                    transition: "transform 0.3s ease-in-out",
                  }}
                />
              }
              size="xs"
              variant="ghost"
              minW="auto"
              aria-label="Toggle suite"
              onClick={(e) => {
                e.stopPropagation();
                onToggle?.(id);
              }}
              _hover={{
                bg: "transparent",
              }}
            />
          </Box>

          {/* Content area */}
          <Flex flex="1" alignItems="center" gap=".5rem">
            <Box width="1rem" height="1rem" flexShrink={0} color={colors.blue}>
              <Folder
                color={isSelected ? colors.white : colors.blue}
                width="100%"
                height="100%"
              />
            </Box>

            <Flex
              justifyContent="space-between"
              gap=".5rem"
              alignItems="center"
              width="100%"
            >
              <Text
                fontSize="13px"
                fontWeight="500"
                color={isSelected ? colors.white : undefined}
                noOfLines={1}
              >
                {name}
              </Text>
              <Badge
                padding=".15rem .35rem"
                color={colors.badge}
                borderRadius="50px"
                textTransform="capitalize"
                fontSize="9px"
                flexShrink={0}
              >
                <Text color={colors.text}>{testCases?.length}</Text>
              </Badge>
            </Flex>
          </Flex>
        </Flex>
      </Flex>

      <Grid
        transition="grid-template-rows 0.5s ease"
        gridTemplateRows={isExpanded ? "1fr" : "0fr"}
        overflow="hidden"
      >
        <Flex flexDirection="column" overflow="hidden">
          {/* Render child suites first */}
          {children && children.length > 0 && (
            <>
              {children
                .sort((a, b) => a.order - b.order)
                .map((childSuite) => (
                  <TestSuiteItem
                    key={childSuite.id}
                    {...childSuite}
                    isExpanded={expansionState[childSuite.id] ?? true}
                    onToggle={onToggle}
                    onReorderTestCases={onReorderTestCases}
                    expansionState={expansionState}
                    depth={depth + 1}
                  />
                ))}
            </>
          )}

          {/* Render test cases */}
          {testCases.length > 0 && (
            <DndContext
              sensors={testCaseSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleTestCaseDragEnd}
            >
              <SortableContext
                items={testCases.map((testCase) => testCase?.id)}
                strategy={verticalListSortingStrategy}
              >
                {testCases.map((testCase) => (
                  <TestCaseItem key={testCase.id} {...testCase} depth={depth} />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </Flex>
      </Grid>
    </>
  );
}
