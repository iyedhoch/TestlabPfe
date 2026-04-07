import { Flex, useDisclosure, useToast } from "@chakra-ui/react";
import TestGenerationActions from "./components/TestGenerationActions";
import ExplorerSidebar from "./components/Sidebar/ExplorerSidebar";
import TestCaseContainer from "./components/TestCaseContainer";
import { useSelector } from "react-redux";
import { selectedProjectSelector } from "@/app/slices/projectSlice";
import EmptyData from "@/components/EmptyData/EmptyData";
import {
  useExportDocumentMutation,
  useGetProjectsQuery,
  useGetTestSuitesByProjectIdQuery,
} from "@/services";
import NewTestCaseModal from "./components/modals/NewTestCaseModal";
import { useState } from "react";

export default function TestGenerationPage() {
  const toast = useToast();
  const selectedProject = useSelector(selectedProjectSelector);
  const [currentExportKey, setCurrentExportKey] = useState<string | null>(null);
  const { data: projects = [], isSuccess: isProjectsLoaded } =
    useGetProjectsQuery();
  const { mutate: exportDocument, isPending: isExportingDocument } =
    useExportDocumentMutation();
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

  const getSelectedProjectId = () => {
    if (!selectedProject?.id) {
      toast({
        title: "Projet requis",
        description: "Veuillez sélectionner un projet d'abord",
        status: "error",
        duration: 4000,
      });
      return null;
    }

    if (
      isProjectsLoaded &&
      !projects.some((project) => project.id === selectedProject.id)
    ) {
      toast({
        title: "Projet introuvable",
        description:
          "Le projet sélectionné n'existe plus côté serveur. Re-sélectionnez un projet.",
        status: "error",
        duration: 4000,
      });
      return null;
    }

    return selectedProject.id;
  };

  const triggerExport = (
    exportKey: string,
    payload: Parameters<typeof exportDocument>[0]
  ) => {
    setCurrentExportKey(exportKey);
    exportDocument(payload, {
      onSettled: () => {
        setCurrentExportKey(null);
      },
    });
  };

  const exportCahierWord = () => {
    const projectId = getSelectedProjectId();
    if (!projectId) {
      return;
    }

    triggerExport("cahier-word", {
      projectId,
      documentType: "cahier",
      format: "word",
    });
  };

  const exportCahierPdf = () => {
    const projectId = getSelectedProjectId();
    if (!projectId) {
      return;
    }

    triggerExport("cahier-pdf", {
      projectId,
      documentType: "cahier",
      format: "pdf",
    });
  };

  const exportCahierTemplateDebug = () => {
    const projectId = getSelectedProjectId();
    if (!projectId) {
      return;
    }

    triggerExport("cahier-template-debug", {
      projectId,
      documentType: "cahier",
      format: "pdf",
      pathSuffix: "pdf-template-debug",
    });
  };

  const exportFsdPdfFr = () => {
    const projectId = getSelectedProjectId();
    if (!projectId) {
      return;
    }

    triggerExport("fsd-pdf-fr", {
      projectId,
      documentType: "fsd",
      format: "pdf",
      language: "fr",
    });
  };

  const exportFsdWord = () => {
    const projectId = getSelectedProjectId();
    if (!projectId) {
      return;
    }

    triggerExport("fsd-word", {
      projectId,
      documentType: "fsd",
      format: "word",
    });
  };

  return (
    <Flex flexDirection="column" paddingInline="1rem" gap=".75rem">
      <Flex justifyContent="flex-end" alignItems="center">
        <TestGenerationActions
          onFilter={() => {}}
          onExportCahierWord={exportCahierWord}
          onExportCahierPdf={exportCahierPdf}
          onExportCahierTemplateDebug={exportCahierTemplateDebug}
          onExportFsdPdfFr={exportFsdPdfFr}
          onExportFsdWord={exportFsdWord}
          isExportingCahierWord={
            isExportingDocument && currentExportKey === "cahier-word"
          }
          isExportingCahierPdf={
            isExportingDocument && currentExportKey === "cahier-pdf"
          }
          isExportingCahierTemplateDebug={
            isExportingDocument && currentExportKey === "cahier-template-debug"
          }
          isExportingFsdPdfFr={
            isExportingDocument && currentExportKey === "fsd-pdf-fr"
          }
          isExportingFsdWord={
            isExportingDocument && currentExportKey === "fsd-word"
          }
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
