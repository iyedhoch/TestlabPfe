import { colors } from "@/theme/colors";
import {
  Avatar,
  AvatarGroup,
  Badge,
  Box,
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
import { useState } from "react";
import Arrow from "@/assets/svg/arrow.svg?react";
import EpicIcon from "@/assets/svg/epic.svg?react";
import { ActionsMenu } from "@/components";
import { EpicStatus, IEpic } from "@/services";
import moment from "moment";
import Feature from "../../UserStoryCreationPage/components/specifications/Feature";

export const epicStatusToLabelMapper: Record<EpicStatus, string> = {
  [EpicStatus.NEW]: "Nouveau",
  [EpicStatus.COMPLETED]: "Terminé",
  [EpicStatus.IN_PROGRESS]: "En cours",
  [EpicStatus.PENDING]: "En attente",
};

interface SelectedEpicsTableProps {
  selectedEpics: IEpic[];
  onRemoveEpic: (epicId: string) => void;
}

export default function SelectedEpicsTable({
  selectedEpics,
  onRemoveEpic,
}: SelectedEpicsTableProps) {
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const [activeActionsEpicId, setActiveActionsEpicId] = useState<string | null>(
    null
  );

  const toggleExpandEpic = (epicId: string) => {
    const newExpanded = new Set(expandedEpics);
    if (newExpanded.has(epicId)) {
      newExpanded.delete(epicId);
    } else {
      newExpanded.add(epicId);
    }
    setExpandedEpics(newExpanded);
  };

  if (selectedEpics.length === 0) {
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
          Aucun epic sélectionné
        </Text>
      </Flex>
    );
  }

  return (
    <Box
      borderRadius=".75rem"
      border={`1px solid ${colors.border}`}
      background={colors.white}
    >
      <TableContainer overflowX="auto">
        <Table
          variant="unstyled"
          width="100%"
          size="sm"
          sx={{
            tableLayout: "fixed",
          }}
        >
          <Thead borderBottom="1px solid" borderColor={colors.border}>
            <Tr>
              <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize=".7rem"
                color={colors.text}
                textAlign="left"
                pl="1rem"
                py=".75rem"
                width="35%"
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
                width="13%"
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
              >
                Actions
              </Th>
            </Tr>
          </Thead>
          <Tbody overflow="hidden">
            {selectedEpics.map((epic) => (
              <Box key={epic.id}>
                <Tr
                  borderBlock="1px solid"
                  borderColor={colors.border}
                  overflow="hidden"
                  _hover={{ bg: colors.body }}
                >
                  <Td py="1rem" pl="1rem">
                    <Flex align="center" gap={1}>
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
                        onClick={() => toggleExpandEpic(epic.id)}
                      />
                      <Box width="1rem" height="1rem" flexShrink={0}>
                        <EpicIcon width="100%" height="100%" />
                      </Box>
                      <Text fontWeight="medium" fontSize="12px" noOfLines={1}>
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
                        <Text color="inherit">{epic.features?.length} Features</Text>
                      </Badge>
                    </Flex>
                  </Td>
                  <Td textAlign="center" py="0.5rem">
                    <Text fontSize="11px" whiteSpace="nowrap">
                      {moment(epic.creationDate).format("DD/MM/YY")}
                    </Text>
                  </Td>
                  <Td textAlign="center" py="0.5rem">
                    <Badge
                      padding=".15rem .35rem"
                      colorScheme="green"
                      borderRadius="50px"
                      textTransform="capitalize"
                      fontSize="9px"
                      flexShrink={0}
                    >
                      {epicStatusToLabelMapper[epic.status]}
                    </Badge>
                  </Td>
                  <Td textAlign="center" py="0.5rem">
                    <Flex justify="center">
                      <Avatar color="white" size="xs" name="Ali Belkadhi " />
                    </Flex>
                  </Td>
                  <Td textAlign="center" py="0.5rem">
                    <Flex justify="center">
                      <AvatarGroup size="xs" spacing="-0.4rem">
                        <Avatar
                          bg={colors.blue}
                          color={colors.white}
                          name="Dhia Ben Hamouda"
                        />
                        <Avatar
                          bg="orange"
                          color={colors.white}
                          name="Hachem Ben Amor"
                        />
                        <Avatar
                          bg="red.300"
                          color={colors.white}
                          name="May Ben Rjab"
                        />
                      </AvatarGroup>
                    </Flex>
                  </Td>
                  <Td textAlign="center" py="0.5rem" pr="1rem">
                    <Flex justifyContent="center" onClick={(e) => e.stopPropagation()}>
                      <ActionsMenu
                        onDelete={() => onRemoveEpic(epic.id)}
                        onEdit={() => {}}
                        isOpen={activeActionsEpicId === epic.id}
                        onChange={(newValue) => {
                          setActiveActionsEpicId(newValue ? epic.id : null);
                        }}
                      />
                    </Flex>
                  </Td>
                </Tr>
                {expandedEpics.has(epic.id) && epic.features && (
                  <>
                    {epic.features.map((feature) => (
                      <Feature key={feature?.id} {...feature} />
                    ))}
                  </>
                )}
              </Box>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
}
