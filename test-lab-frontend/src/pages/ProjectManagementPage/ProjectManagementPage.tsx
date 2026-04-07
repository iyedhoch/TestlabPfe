import { Box, Button, Flex, useDisclosure } from "@chakra-ui/react";
import Plus from "@/assets/svg/plus.svg?react";
import ProjectsTable from "./components/ProjectsTable";
import ProjectMutationModal from "./components/modals/ProjectMutationModal";
import Export from "@/assets/svg/export.svg?react";
import { Pagination } from "@/components";
import { useState } from "react";
import {
  useExportProjectsMutation,
  useGetPaginatedProjectsQuery,
} from "@/services";

export default function ProjectManagementPage() {
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const {
    isOpen: isProjectCreationModalOpen,
    onClose: closeProjectCreationModal,
    onOpen: openProjectCreationModal,
  } = useDisclosure();
  const { data } = useGetPaginatedProjectsQuery();
  const { mutate: exportProjects, isPending: isExportingProjects } =
    useExportProjectsMutation();

  return (
    <Box paddingInline="1rem">
      <Flex
        justifyContent="space-between"
        alignItems="center"
        marginBottom="1rem"
        gap=".5rem"
      >
        <Box />
        <Flex gap=".5rem">
          {data?.data && data?.data?.length > 0 && (
            <Button
              isLoading={isExportingProjects}
              leftIcon={<Export width="1rem" height="1rem" />}
              variant="light"
              onClick={() => {
                exportProjects({
                  projectIds: selectedProjects,
                });
              }}
            >
              Exporter
            </Button>
          )}
          <Button
            variant="basic"
            leftIcon={<Plus />}
            onClick={() => {
              openProjectCreationModal();
            }}
          >
            Nouveau Projet
          </Button>
        </Flex>
      </Flex>
      <ProjectsTable
        selectedProjects={selectedProjects}
        setSelectedProjects={setSelectedProjects}
        currentPage={currentPage}
      />
      <Pagination
        page={currentPage}
        onChange={setCurrentPage}
        numberOfPages={data?.pagination?.totalPages ?? 1}
      />
      <ProjectMutationModal
        isProjectModalOpen={isProjectCreationModalOpen}
        closeProjectModal={closeProjectCreationModal}
      />
    </Box>
  );
}
