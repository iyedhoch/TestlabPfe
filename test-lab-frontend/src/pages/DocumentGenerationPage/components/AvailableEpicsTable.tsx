import { colors } from "@/theme/colors";
import {
  Avatar,
  AvatarGroup,
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
import { Fragment, useState, type ReactNode } from "react";
import Arrow from "@/assets/svg/arrow.svg?react";
import EpicIcon from "@/assets/svg/epic.svg?react";
import { EpicStatus, IEpic } from "@/services";
import moment from "moment";

export const epicStatusToLabelMapper: Record<EpicStatus, string> = {
  [EpicStatus.NEW]: "Nouveau",
  [EpicStatus.COMPLETED]: "Terminé",
  [EpicStatus.IN_PROGRESS]: "En cours",
  [EpicStatus.PENDING]: "En attente",
};

interface AvailableEpicsTableProps {
  availableEpics: IEpic[];
  isLoading?: boolean;
  checkedEpicIds: Set<string>;
  checkedFeatureIds: Set<string>;
  checkedUserStoryIds: Set<string>;
  indeterminateEpicIds: Set<string>;
  indeterminateFeatureIds: Set<string>;
  onToggleEpic: (epicId: string) => void;
  onToggleFeature: (featureId: string) => void;
  onToggleUserStory: (userStoryId: string) => void;
}

export default function AvailableEpicsTable({
  availableEpics,
  isLoading = false,
  checkedEpicIds,
  checkedFeatureIds,
  checkedUserStoryIds,
  indeterminateEpicIds,
  indeterminateFeatureIds,
  onToggleEpic,
  onToggleFeature,
  onToggleUserStory,
}: AvailableEpicsTableProps) {
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());

  const toggleExpandEpic = (epicId: string) => {
    setExpandedEpics((prev) => {
      const next = new Set(prev);
      if (next.has(epicId)) {
        next.delete(epicId);
      } else {
        next.add(epicId);
      }
      return next;
    });
  };

  const toggleExpandFeature = (featureId: string) => {
    setExpandedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(featureId)) {
        next.delete(featureId);
      } else {
        next.add(featureId);
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

  if (availableEpics.length === 0) {
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
          Aucun epic disponible
        </Text>
      </Flex>
    );
  }

  const renderFeatureRows = (epic: IEpic): ReactNode[] => {
    if (!expandedEpics.has(epic.id)) {
      return [];
    }

    if (!epic.features?.length) {
      return [
        <Tr key={`${epic.id}-empty`} borderBlock="1px solid" borderColor={colors.border}>
          <Td py="0.75rem" pl="1rem" />
          <Td py="0.5rem">
            <Text fontSize="11px" color="gray.500" pl="1.6rem">
              Aucune feature liée à cet epic.
            </Text>
          </Td>
          <Td py="0.5rem" />
          <Td py="0.5rem" />
          <Td py="0.5rem" />
          <Td py="0.5rem" />
          <Td py="0.5rem" pr="1rem" />
        </Tr>,
      ];
    }

    return epic.features.flatMap((feature) => {
      const featureChecked = checkedFeatureIds.has(feature.id);
      const featureIndeterminate = indeterminateFeatureIds.has(feature.id);
      const hasStories = feature.userStories.length > 0;
      const featureExpanded = expandedFeatures.has(feature.id);

      const featureRows: ReactNode[] = [
        <Tr key={feature.id} borderBlock="1px solid" borderColor={colors.border} _hover={{ bg: colors.body }}>
          <Td py="0.75rem" pl="1rem" textAlign="center" verticalAlign="middle">
            <Checkbox
              isChecked={featureChecked}
              isIndeterminate={featureIndeterminate}
              onChange={() => onToggleFeature(feature.id)}
              colorScheme="blue"
            />
          </Td>
          <Td py="0.5rem" verticalAlign="middle" maxW="100%">
            <Flex align="center" gap={1} pl="1.6rem" minW={0} w="100%">
              {hasStories ? (
                <IconButton
                  icon={
                    <Box
                      as={Arrow}
                      width="1rem"
                      height="1rem"
                      sx={{
                        transform: featureExpanded ? "rotate(-180deg)" : "rotate(0deg)",
                        transition: "transform 0.3s ease-in-out",
                      }}
                    />
                  }
                  size="xs"
                  variant="ghost"
                  minW="auto"
                  aria-label="Toggle feature"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleExpandFeature(feature.id);
                  }}
                />
              ) : (
                <Box width="1.5rem" height="1.5rem" flexShrink={0} />
              )}
              <Box width="1rem" height="1rem" flexShrink={0}>
                <EpicIcon width="100%" height="100%" />
              </Box>
              <Text fontWeight="medium" fontSize="12px" noOfLines={1} minW={0} flex="1">
                {feature.name}
              </Text>
            </Flex>
          </Td>
          <Td py="0.5rem" />
          <Td py="0.5rem" />
          <Td py="0.5rem" />
          <Td py="0.5rem" />
          <Td py="0.5rem" pr="1rem" textAlign="center" verticalAlign="middle">
            <Text fontSize="11px" color={colors.text}>
              {feature.userStories.length}
            </Text>
          </Td>
        </Tr>,
      ];

      if (hasStories && featureExpanded) {
        featureRows.push(
          ...feature.userStories.map((story) => {
            const storyChecked = checkedUserStoryIds.has(story.id);

            return (
              <Tr
                key={story.id}
                borderBlock="1px solid"
                borderColor={colors.border}
                _hover={{ bg: colors.body }}
              >
                <Td py="0.75rem" pl="1rem" textAlign="center" verticalAlign="middle">
                  <Checkbox
                    isChecked={storyChecked}
                    onChange={() => onToggleUserStory(story.id)}
                    colorScheme="blue"
                  />
                </Td>
                <Td py="0.5rem" verticalAlign="middle" maxW="100%">
                    <Flex align="center" gap={2} pl="3.8rem" minW={0} w="100%">
                    <Box width="0.5rem" height="0.5rem" borderRadius="full" bg="blue.300" />
                      <Text fontWeight="medium" fontSize="12px" noOfLines={1} minW={0} flex="1">
                      {story.name}
                    </Text>
                  </Flex>
                </Td>
                <Td py="0.5rem" />
                <Td py="0.5rem" />
                <Td py="0.5rem" />
                <Td py="0.5rem" />
                <Td py="0.5rem" pr="1rem" />
              </Tr>
            );
          }),
        );
      }

      return featureRows;
    });
  };

  return (
    <Box borderRadius=".75rem" border={`1px solid ${colors.border}`} background={colors.white}>
      <TableContainer overflowX="auto">
        <Table
          variant="unstyled"
          width="100%"
          size="sm"
          minW="860px"
          sx={{
            tableLayout: "auto",
          }}
        >
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
                Tâches
              </Th>
              <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize=".7rem"
                color={colors.text}
                textAlign="center"
                py=".75rem"
                width="12%"
                whiteSpace="nowrap"
              >
                Date création
              </Th>
              <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize=".7rem"
                color={colors.text}
                textAlign="center"
                py=".75rem"
                width="12%"
                whiteSpace="nowrap"
              >
                Statut
              </Th>
              <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize=".7rem"
                color={colors.text}
                textAlign="center"
                py=".75rem"
                width="12%"
                whiteSpace="nowrap"
              >
                Créé par
              </Th>
              <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize=".7rem"
                color={colors.text}
                textAlign="center"
                py=".75rem"
                width="12%"
                whiteSpace="nowrap"
              >
                Assigné
              </Th>
              <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize=".7rem"
                color={colors.text}
                textAlign="center"
                pr="1rem"
                py=".75rem"
                width="16%"
                whiteSpace="nowrap"
              >
                Features / US
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {availableEpics.map((epic) => {
              const isSelected = checkedEpicIds.has(epic.id);
              const isIndeterminate = indeterminateEpicIds.has(epic.id);
              const featureCount = epic.features?.length || 0;
              const userStoryCount = epic.features.reduce(
                (total, feature) => total + feature.userStories.length,
                0,
              );

              return (
                <Fragment key={epic.id}>
                  <Tr borderBlock="1px solid" borderColor={colors.border} _hover={{ bg: colors.body }}>
                    <Td py="0.75rem" pl="1rem" textAlign="center" verticalAlign="middle">
                      <Checkbox
                        isChecked={isSelected}
                        isIndeterminate={isIndeterminate}
                        onChange={() => onToggleEpic(epic.id)}
                        colorScheme="blue"
                      />
                    </Td>
                    <Td py="0.5rem" verticalAlign="middle">
                      <Flex align="center" gap={1} w="100%" minW={0}>
                        <IconButton
                          icon={
                            <Box
                              as={Arrow}
                              width="1rem"
                              height="1rem"
                              sx={{
                                transform: expandedEpics.has(epic.id)
                                  ? "rotate(-180deg)"
                                  : "rotate(0deg)",
                                transition: "transform 0.3s ease-in-out",
                              }}
                            />
                          }
                          size="xs"
                          variant="ghost"
                          minW="auto"
                          aria-label="Toggle epic"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleExpandEpic(epic.id);
                          }}
                        />
                        <Box width="1rem" height="1rem" flexShrink={0}>
                          <EpicIcon width="100%" height="100%" />
                        </Box>
                        <Text fontWeight="medium" fontSize="12px" noOfLines={1} flex="1" minW={0}>
                          {epic.name}
                        </Text>
                        <Badge
                          padding=".15rem .35rem"
                          bg={colors.badge}
                          color={colors.text}
                          borderRadius="50px"
                          textTransform="capitalize"
                          fontSize="9px"
                          flexShrink={0}
                        >
                          <Text color="inherit">{featureCount} Features</Text>
                        </Badge>
                      </Flex>
                    </Td>
                    <Td textAlign="center" py="0.5rem" verticalAlign="middle">
                      <Text fontSize="11px" whiteSpace="nowrap">
                        {moment(epic.creationDate).format("DD/MM/YY")}
                      </Text>
                    </Td>
                    <Td textAlign="center" py="0.5rem" verticalAlign="middle">
                      <Badge
                        padding=".15rem .35rem"
                        colorScheme="green"
                        borderRadius="50px"
                        textTransform="capitalize"
                        fontSize="9px"
                        flexShrink={0}
                      >
                        {epicStatusToLabelMapper[epic.status as EpicStatus]}
                      </Badge>
                    </Td>
                    <Td textAlign="center" py="0.5rem" verticalAlign="middle">
                      <Flex justify="center">
                        <Avatar color="white" size="xs" name="Ali Belkadhi" />
                      </Flex>
                    </Td>
                    <Td textAlign="center" py="0.5rem" verticalAlign="middle">
                      <Flex justify="center">
                        <AvatarGroup size="xs" spacing="-0.4rem">
                          <Avatar bg={colors.blue} color={colors.white} name="Dhia Ben Hamouda" />
                          <Avatar bg="orange" color={colors.white} name="Hachem Ben Amor" />
                          <Avatar bg="red.300" color={colors.white} name="May Ben Rjab" />
                        </AvatarGroup>
                      </Flex>
                    </Td>
                    <Td textAlign="center" py="0.5rem" pr="1rem" verticalAlign="middle">
                      <Text fontSize="11px" color={colors.text}>
                        {featureCount} / {userStoryCount}
                      </Text>
                    </Td>
                  </Tr>
                  {renderFeatureRows(epic)}
                </Fragment>
              );
            })}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
}
