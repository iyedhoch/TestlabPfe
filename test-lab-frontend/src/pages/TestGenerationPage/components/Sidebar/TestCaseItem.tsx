import { colors } from "@/theme/colors";
import { Flex, Text, Box } from "@chakra-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Phase from "@/assets/svg/phase.svg?react";
import { useDispatch, useSelector } from "react-redux";
import {
  setSelectedTestCase,
  selectedTestCaseSelector,
  setSelectedTestSuite,
} from "@/app/slices/testGenerationSlice";

interface ITestCaseItem {
  id: string;
  name: string;
  summary?: string;
  testSuiteId?: string;
  depth?: number;
  suiteId?: string;
}

export default function TestCaseItem(testCase: ITestCaseItem) {
  const { id, name, depth = 0, suiteId } = testCase;
  const dispatch = useDispatch();
  const selectedTestCase = useSelector(selectedTestCaseSelector);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: {
      type: "testCase",
      testCase,
      suiteId,
    },
  });

  const isSelected = selectedTestCase && selectedTestCase?.id === id;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = () => {
    dispatch(
      setSelectedTestSuite({
        testSuite: null,
      })
    );

    dispatch(
      setSelectedTestCase({
        testCase,
      })
    );
  };

  const marginLeft = `${3.5 + depth * 1}rem`;

  return (
    <Flex
      ref={setNodeRef}
      style={style}
      {...attributes}
      alignItems="center"
      gap=".5rem"
      padding=".5rem .75rem"
      marginLeft={marginLeft}
      borderRadius=".5rem"
      bg={isSelected ? colors.blue : isDragging ? colors.body : "transparent"}
      _hover={{ bg: isSelected ? colors.blue : colors.body }}
      transition=".25s"
      cursor="pointer"
      marginBottom=".25rem"
      onClick={handleClick}
    >
      <Box
        {...listeners}
        width="1rem"
        height="1rem"
        flexShrink={0}
        color={isSelected ? "white" : colors.blue}
        cursor="grab"
        _active={{ cursor: "grabbing" }}
      >
        <Phase
          color={isSelected ? colors.white : colors.blue}
          width="100%"
          height="100%"
        />
      </Box>

      <Text
        fontSize="13px"
        fontWeight="500"
        flex="1"
        noOfLines={1}
        color={isSelected ? "white" : "inherit"}
      >
        {name}
      </Text>
    </Flex>
  );
}
