import { colors } from "@/theme/colors";
import {
  Box,
  Table,
  TableContainer,
  Tbody,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import Environment from "./Environment";
import { IEnvironment } from "@/services";
import EmptyData from "@/components/EmptyData/EmptyData";

interface IEnvironmentsTable {
  currentPage: number;
  data: IEnvironment[];
  isLoadingEnvironments: boolean;
}

export default function EnvironmentsTable({
  data,
  isLoadingEnvironments,
}: IEnvironmentsTable) {
  if (!isLoadingEnvironments && data?.length === 0) {
    return (
      <EmptyData
        description={
          "Aucun environnement trouvé pour le moment.\nCréez-en un pour commencer"
        }
      />
    );
  }

  return (
    <Box
      padding="1.5rem"
      marginBottom="1rem"
      borderRadius="12px"
      minHeight="425px"
      border={`1px solid ${colors.border}`}
      background={colors.white}
    >
      <TableContainer>
        <Table
          variant="unstyled"
          sx={{
            tableLayout: "fixed",
          }}
        >
          <Thead>
            <Tr>
              <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize="14px"
                textAlign="center"
                color={colors.text}
                paddingBottom="1.5rem"
              >
                Nom
              </Th>
              <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize="14px"
                textAlign="center"
                color={colors.text}
                paddingBottom="1.5rem"
              >
                Status
              </Th>
              {/* <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize="14px"
                textAlign="center"
                color={colors.text}
                paddingBottom="1.5rem"
              >
                Description
              </Th> */}
              <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize="14px"
                textAlign="center"
                color={colors.text}
                paddingBottom="1.5rem"
              >
                URL
              </Th>
              {/* <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize="14px"
                textAlign="center"
                color={colors.text}
                paddingBottom="1.5rem"
              >
                Date de Création
              </Th> */}
              <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize="14px"
                textAlign="center"
                color={colors.text}
                paddingBottom="1.5rem"
              >
                Dernière modification
              </Th>
              <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize="14px"
                textAlign="center"
                color={colors.text}
                paddingBottom="1.5rem"
              >
                Actions
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {isLoadingEnvironments
              ? Array.from({ length: 5 }).map((_, index) => (
                  <Environment
                    key={`skeleton-${index}`}
                    isGray={index % 2 === 0}
                    isLoading={true}
                    id=""
                    name=""
                    url=""
                    description=""
                    projectId=""
                    status=""
                    createdAt={new Date()}
                    updatedAt={new Date()}
                  />
                ))
              : data?.map((environment, index) => (
                  <Environment
                    key={environment?.id}
                    isGray={index % 2 === 0}
                    {...environment}
                  />
                ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
}
