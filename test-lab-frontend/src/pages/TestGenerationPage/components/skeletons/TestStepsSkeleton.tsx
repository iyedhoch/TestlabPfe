import { colors } from "@/theme/colors";
import {
  Flex,
  Skeleton,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";

export default function TestStepsSkeleton() {
  return (
    <Flex
      borderRadius=".5rem"
      border="1px solid"
      borderColor={colors.border}
      overflow="hidden"
    >
      <Table variant="simple" size="sm">
        <Thead bg={colors.body}>
          <Tr>
            <Th py=".75rem" width="5%" textAlign="center" textTransform="none">
              #
            </Th>
            <Th width="42.5%" textAlign="center" textTransform="none">
              Action
            </Th>
            <Th width="42.5%" textAlign="center" textTransform="none">
              Résultat attendu
            </Th>
            <Th width="10%" textAlign="center" textTransform="none">
              Actions
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {[1, 2, 3, 4].map((index) => (
            <Tr key={index} bg="white">
              <Td width="5%" textAlign="center" py=".75rem">
                <Skeleton height="16px" width="20px" mx="auto" />
              </Td>
              <Td width="42.5%" py=".75rem" textAlign="center">
                <Skeleton height="16px" width="80%" mx="auto" />
              </Td>
              <Td width="42.5%" py=".75rem" textAlign="center">
                <Skeleton height="16px" width="80%" mx="auto" />
              </Td>
              <Td width="10%" py=".75rem">
                <Flex justifyContent="center">
                  <Skeleton height="20px" width="20px" borderRadius="4px" />
                </Flex>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Flex>
  );
}
