import { Flex, useDisclosure, useToast } from "@chakra-ui/react";
import TestGenerationActions from "./components/TestGenerationActions";
import ExplorerSidebar from "./components/Sidebar/ExplorerSidebar";
import TestCaseContainer from "./components/TestCaseContainer";
import { useSelector } from "react-redux";
import { selectedProjectSelector } from "@/app/slices/projectSlice";
import EmptyData from "@/components/EmptyData/EmptyData";
import {
  useGetTestSuitesByProjectIdQuery,
} from "@/services";
import NewTestCaseModal from "./components/modals/NewTestCaseModal";

export default function TestGenerationPage() {
  const toast = useToast();
  const selectedProject = useSelector(selectedProjectSelector);
  const {
    onOpen: openNewTestCaseModal,
    onClose: closeNewTestCaseModal,
    isOpen: isNewTestCaseModalOpen,
  } = useDisclosure();
  const {
    data: testSuites = [],
    isLoading: isLoadingTestSuites,
    isRefetching: isRefetchingTestSuites,
  } = useGetTestSuitesByProjectIdQuery({
    projectId: selectedProject?.id as string,
  });

  return (
    <Flex flexDirection="column" paddingInline="1rem" gap=".75rem">
      <Flex justifyContent="flex-end" alignItems="center">
        <TestGenerationActions
          onFilter={() => {}}
          onManual={() => {
            if (!selectedProject) {
              toast({
                title: "Projet requis",
                description: "Veuillez sélectionner un projet d'abord",
                status: "error",
                duration: 4000,
              });
            } else {
              openNewTestCaseModal();
            }
          }}
        />
      </Flex>
      {!selectedProject && (
        <EmptyData description="Aucun projet sélectionné pour le moment. Choisir un pour commencer" />
      )}
      {selectedProject && (
        <Flex gap=".75rem" paddingBottom="1rem">
          <ExplorerSidebar testSuitesData={testSuites} />
          <TestCaseContainer
            testSuites={testSuites}
            isLoadingTestSuites={isLoadingTestSuites || isRefetchingTestSuites}
          />
        </Flex>
      )}
      <NewTestCaseModal
        isOpen={isNewTestCaseModalOpen}
        onClose={closeNewTestCaseModal}
        isManualCaseFlow
      />
    </Flex>
  );
}
