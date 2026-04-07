import { colors } from "@/theme/colors";
import {
  Box,
  Table,
  TableContainer,
  Tbody,
  Th,
  Thead,
  Tr,
  Checkbox,
} from "@chakra-ui/react";
import Project from "./Project";
import { ProjectStatus, useGetPaginatedProjectsQuery } from "@/services";
import { SetStateAction, useEffect } from "react";
import EmptyData from "@/components/EmptyData/EmptyData";

interface IProjectsTable {
  currentPage: number;
  selectedProjects: string[];
  setSelectedProjects: React.Dispatch<SetStateAction<string[]>>;
}

export default function ProjectsTable({
  currentPage,
  selectedProjects,
  setSelectedProjects,
}: IProjectsTable) {
  const { data, isLoading: isLoadingProjects } =
    useGetPaginatedProjectsQuery(currentPage);

  useEffect(() => {
    setSelectedProjects([]);
  }, [currentPage]);

  const projects = data?.data ?? [];

  const isAllSelected =
    projects?.length > 0 && selectedProjects.length === projects?.length;

  const isIndeterminate =
    selectedProjects.length > 0 &&
    selectedProjects.length < (projects?.length || 0);

  const handleSelectAll = () => {
    if (isAllSelected || isIndeterminate) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(projects?.map((p) => p.id) || []);
    }
  };

  const handleToggleProject = (projectId: string) => {
    setSelectedProjects((prev) => {
      if (prev.includes(projectId)) {
        return prev.filter((id) => id !== projectId);
      } else {
        return [...prev, projectId];
      }
    });
  };

  if (!isLoadingProjects && projects?.length === 0) {
    return (
      <EmptyData
        description={`Aucun projet trouvé pour le moment. créez-en un pour commencer`}
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
        <Table variant="unstyled">
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
                <Checkbox
                  isChecked={isAllSelected}
                  isIndeterminate={isIndeterminate}
                  onChange={handleSelectAll}
                />
              </Th>
              <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize="14px"
                textAlign="center"
                color={colors.text}
                paddingBottom="1.5rem"
              >
                Projet
              </Th>
              <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize="14px"
                textAlign="center"
                color={colors.text}
                paddingBottom="1.5rem"
              >
                Description
              </Th>
              <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize="14px"
                textAlign="center"
                color={colors.text}
                paddingBottom="1.5rem"
              >
                Statut
              </Th>
              <Th
                textTransform="capitalize"
                fontWeight="bold"
                fontSize="14px"
                textAlign="center"
                color={colors.text}
                paddingBottom="1.5rem"
              >
                Date de création
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
            {isLoadingProjects
              ? Array.from({ length: 5 }).map((_, index) => (
                  <Project
                    key={`skeleton-${index}`}
                    isGray={index % 2 === 0}
                    isLoading={true}
                    id=""
                    description=""
                    name=""
                    creationDate={new Date()}
                    attachment=""
                    prefix=""
                    figmaLink=""
                    status={ProjectStatus.ACTIVE}
                  />
                ))
              : projects?.map((project, index) => (
                  <Project
                    key={project?.id}
                    isGray={index % 2 === 0}
                    isSelected={selectedProjects.includes(project.id)}
                    onToggleSelect={() => handleToggleProject(project.id)}
                    {...project}
                  />
                ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
}
