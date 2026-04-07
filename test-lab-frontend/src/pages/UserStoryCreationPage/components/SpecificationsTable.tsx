import { colors } from "@/theme/colors";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  TableContainer,
  Td,
  Flex,
  Text,
} from "@chakra-ui/react";
import Epic from "./specifications/Epic";
import { useGetEpicsByProjectIdQuery } from "@/services";
import { useSelector } from "react-redux";
import { selectedProjectSelector } from "@/app/slices/projectSlice";
import { useMemo } from "react";
import Plus from "@/assets/svg/plus.svg?react";
import SkeletonRow from "./SkeletonRow";

interface ISpecificationsTable {
  openEpicModal: () => void;
}

export default function SpecificationsTable({
  openEpicModal,
}: ISpecificationsTable) {
  const selectedProject = useSelector(selectedProjectSelector);
  const { data: epics, isLoading } = useGetEpicsByProjectIdQuery({
    projectId: selectedProject?.id as string,
  });

  const totalUserStoriesCount = useMemo(() => {
    let sum = 0;

    epics?.forEach((epic) => {
      epic?.features.forEach((feature) => {
        feature?.userStories?.forEach(() => {
          sum++;
        });
      });
    });

    return sum;
  }, [epics]);

  return (
    <Box
      marginBottom="1rem"
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
                width="30%"
              >
                {totalUserStoriesCount} Tâches
              </Th>
              <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize=".7rem"
                color={colors.text}
                textAlign="center"
                py=".75rem"
                width="10%"
              >
                Tags
              </Th>
              <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize=".7rem"
                color={colors.text}
                textAlign="center"
                py=".75rem"
                width="10%"
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
                width="10%"
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
                width="5%"
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
                width="10%"
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
                width="10%"
              >
                Actions
              </Th>
            </Tr>
          </Thead>
          <Tbody overflow="hidden">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <SkeletonRow key={index} />
              ))
            ) : epics?.length === 0 ? (
              <Tr>
                <Td colSpan={7}>
                  <Flex padding="1rem">
                    <Text fontSize="13px">Aucune epic trouvé</Text>
                  </Flex>
                </Td>
              </Tr>
            ) : (
              <>
                {epics?.map((epic, index) => (
                  <Epic key={index} {...epic} />
                ))}
              </>
            )}
            {selectedProject && (
              <Tr
                borderBlock="1px solid"
                borderColor={colors.border}
                _hover={{ bg: colors.body }}
              >
                <Td paddingStart=".9rem" py="0.75rem">
                  <Flex
                    align="center"
                    gap={1.5}
                    cursor="pointer"
                    onClick={() => {
                      openEpicModal();
                    }}
                  >
                    <Flex
                      align="center"
                      justify="center"
                      width="1.3rem"
                      height="1.3rem"
                      borderRadius="4px"
                      bg={colors.blue}
                      color={colors.white}
                      fontSize="16px"
                      fontWeight="bold"
                      flexShrink={0}
                    >
                      <Plus width="1rem" height="1rem" />
                    </Flex>
                    <Text fontSize="12px" color={colors.text}>
                      Ajouter un epic
                    </Text>
                  </Flex>
                </Td>
                <Td textAlign="center" py="0.5rem"></Td>
                <Td textAlign="center" py="0.5rem"></Td>
                <Td textAlign="center" py="0.5rem"></Td>
                <Td textAlign="center" py="0.5rem"></Td>
                <Td textAlign="center" py="0.5rem"></Td>
                <Td textAlign="center" py="0.5rem" pr="1rem"></Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
}
