import { colors } from "@/theme/colors";
import {
  Badge,
  Box,
  Checkbox,
  Flex,
  IconButton,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { useMemo, useState, type ReactNode } from "react";
import Arrow from "@/assets/svg/arrow.svg?react";
import Folder from "@/assets/svg/folder.svg?react";
import Story from "@/assets/svg/story.svg?react";
import { ICahierSelectionSuite } from "@/services";

interface SuiteNode extends ICahierSelectionSuite {
  children: SuiteNode[];
}

interface AvailableSuitesTableProps {
  availableSuites: ICahierSelectionSuite[];
  checkedSuiteIds: Set<string>;
  checkedTestCaseIds: Set<string>;
  indeterminateSuiteIds: Set<string>;
  onToggleSuite: (suiteId: string) => void;
  onToggleTestCase: (testCaseId: string, suiteId: string) => void;
  isLoading?: boolean;
}

function buildSuiteTree(suites: ICahierSelectionSuite[]): SuiteNode[] {
  const nodesById = new Map<string, SuiteNode>();
  const roots: SuiteNode[] = [];

  suites.forEach((suite) => {
    nodesById.set(suite.id, { ...suite, children: [] });
  });

  nodesById.forEach((node) => {
    if (node.parentId && nodesById.has(node.parentId)) {
      nodesById.get(node.parentId)?.children.push(node);
      return;
    }

    roots.push(node);
  });

  const sortNodes = (nodes: SuiteNode[]): SuiteNode[] =>
    [...nodes]
      .sort((left, right) => {
        const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }
        return left.name.localeCompare(right.name);
      })
      .map((node): SuiteNode => ({
        ...node,
        children: sortNodes(node.children),
      }));

  return sortNodes(roots);
}

export default function AvailableSuitesTable({
  availableSuites,
  checkedSuiteIds,
  checkedTestCaseIds,
  indeterminateSuiteIds,
  onToggleSuite,
  onToggleTestCase,
  isLoading = false,
}: AvailableSuitesTableProps) {
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());

  const suiteTree = useMemo(() => buildSuiteTree(availableSuites), [availableSuites]);

  const toggleExpandSuite = (suiteId: string) => {
    setExpandedSuites((prev) => {
      const next = new Set(prev);
      if (next.has(suiteId)) {
        next.delete(suiteId);
      } else {
        next.add(suiteId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Flex justifyContent="center" alignItems="center" minH="200px">
        <Text color={colors.text}>Chargement...</Text>
      </Flex>
    );
  }

  if (suiteTree.length === 0) {
    return (
      <Flex
        borderWidth="1px"
        borderColor={colors.border}
        borderRadius=".75rem"
        padding="1rem"
        justifyContent="center"
        alignItems="center"
        minH="200px"
      >
        <Text fontSize="13px" color={colors.text}>
          Aucune suite disponible
        </Text>
      </Flex>
    );
  }

  const renderNodeRows = (nodes: SuiteNode[], depth = 0): ReactNode[] =>
    nodes.flatMap((node) => {
      const isChecked = checkedSuiteIds.has(node.id);
      const isIndeterminate = indeterminateSuiteIds.has(node.id);
      const isExpanded = expandedSuites.has(node.id);
      const hasChildren = node.children.length > 0;
      const hasCases = node.testCases.length > 0;
      const indent = `${depth * 1.2}rem`;

      const rows: ReactNode[] = [
        <Tr key={node.id} borderBlock="1px solid" borderColor={colors.border} _hover={{ bg: colors.body }}>
          <Td py="0.75rem" pl="1rem" textAlign="center" verticalAlign="middle">
            <Checkbox
              isChecked={isChecked}
              isIndeterminate={isIndeterminate}
              onChange={() => onToggleSuite(node.id)}
              colorScheme="blue"
            />
          </Td>
          <Td py="0.5rem" verticalAlign="middle" maxW="100%">
            <Flex align="center" gap={2} w="100%" minW={0} pl={indent}>
              {hasChildren || hasCases ? (
                <IconButton
                  icon={
                    <Box
                      as={Arrow}
                      width="1rem"
                      height="1rem"
                      sx={{
                        transform: isExpanded ? "rotate(-180deg)" : "rotate(0deg)",
                        transition: "transform 0.3s ease-in-out",
                      }}
                    />
                  }
                  size="xs"
                  variant="ghost"
                  minW="auto"
                  aria-label="Toggle suite"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleExpandSuite(node.id);
                  }}
                />
              ) : (
                <Box width="1.5rem" height="1.5rem" flexShrink={0} />
              )}
              <Box width="1rem" height="1rem" flexShrink={0} color={colors.blue}>
                <Folder color={isChecked ? colors.white : colors.blue} width="100%" height="100%" />
              </Box>
              <Text fontWeight="medium" fontSize="12px" noOfLines={1} flex="1" minW={0}>
                {node.name}
              </Text>
              <Badge
                padding=".15rem .35rem"
                bg={colors.badge}
                color={colors.text}
                borderRadius="50px"
                textTransform="capitalize"
                fontSize="9px"
                flexShrink={0}
                whiteSpace="nowrap"
              >
                {node.childSuiteCount} sous-suite(s)
              </Badge>
            </Flex>
          </Td>
          <Td textAlign="center" py="0.5rem" verticalAlign="middle">
            <Text fontSize="11px" whiteSpace="nowrap">
              {node.order ?? "-"}
            </Text>
          </Td>
          <Td textAlign="center" py="0.5rem" verticalAlign="middle">
            <Flex align="center" justify="center" gap="0.25rem" whiteSpace="nowrap">
              <Box width="0.85rem" height="0.85rem" flexShrink={0} color={colors.text}>
                <Story width="100%" height="100%" />
              </Box>
              <Text fontSize="11px">{node.testCaseCount}</Text>
            </Flex>
          </Td>
          <Td textAlign="center" py="0.5rem" pr="1rem" verticalAlign="middle">
            <Text fontSize="11px" color={colors.text}>
              {node.childSuiteCount}
            </Text>
          </Td>
        </Tr>,
      ];

      if (isExpanded) {
        if (hasCases) {
          rows.push(
            ...node.testCases.map((testCase) => {
              const checked = checkedTestCaseIds.has(testCase.id);

              return (
                <Tr key={testCase.id} borderBlock="1px solid" borderColor={colors.border} _hover={{ bg: colors.body }}>
                  <Td py="0.75rem" pl="1rem" textAlign="center" verticalAlign="middle">
                    <Checkbox
                      isChecked={checked}
                      onChange={() => onToggleTestCase(testCase.id, node.id)}
                      colorScheme="blue"
                    />
                  </Td>
                  <Td py="0.5rem" verticalAlign="middle" maxW="100%">
                    <Flex align="center" gap={2} pl={`calc(${indent} + 2.2rem)`} minW={0} w="100%">
                      <Box width="0.5rem" height="0.5rem" borderRadius="full" bg="blue.300" />
                      <Text fontWeight="medium" fontSize="12px" noOfLines={1} minW={0} flex="1">
                        {testCase.name}
                      </Text>
                    </Flex>
                  </Td>
                  <Td py="0.5rem" />
                  <Td py="0.5rem" />
                  <Td py="0.5rem" />
                </Tr>
              );
            }),
          );
        }

        if (hasChildren) {
          rows.push(...renderNodeRows(node.children, depth + 1));
        }
      }

      return rows;
    });

  return (
    <Box borderRadius=".75rem" border={`1px solid ${colors.border}`} background={colors.white}>
      <TableContainer overflowX="auto">
        <Table variant="unstyled" width="100%" size="sm" minW="860px" sx={{ tableLayout: "auto" }}>
          <Thead borderBottom="1px solid" borderColor={colors.border}>
            <Tr>
              <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize=".7rem"
                color={colors.text}
                textAlign="center"
                pl="1rem"
                py=".75rem"
                whiteSpace="nowrap"
              >
                Sélectionner
              </Th>
              <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize=".7rem"
                color={colors.text}
                textAlign="left"
                py=".75rem"
                whiteSpace="nowrap"
              >
                Suites / Cas de test
              </Th>
              <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize=".7rem"
                color={colors.text}
                textAlign="center"
                py=".75rem"
                width="16%"
                whiteSpace="nowrap"
              >
                Ordre
              </Th>
              <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize=".7rem"
                color={colors.text}
                textAlign="center"
                py=".75rem"
                width="14%"
                whiteSpace="nowrap"
              >
                Cas de test
              </Th>
              <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize=".7rem"
                color={colors.text}
                textAlign="center"
                pr="1rem"
                py=".75rem"
                width="18%"
                whiteSpace="nowrap"
              >
                Sous-suites
              </Th>
            </Tr>
          </Thead>
          <Tbody>{renderNodeRows(suiteTree)}</Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
}
