import { Flex, Text, useDisclosure, useToast } from "@chakra-ui/react";
import SpecificationsTable from "./components/SpecificationsTable";
import { useSelector } from "react-redux";
import { selectedProjectSelector } from "@/app/slices/projectSlice";
import { colors } from "@/theme/colors";
import EpicMutationModal from "./components/modals/EpicMutationModal";
import ManualStoryModal from "./components/modals/ManualStoryModal";
import SpecsManagementActions from "./components/SpecsManagementActions";
import { useNavigate } from "react-router-dom";

export default function UserStoryCreationPage() {
  const selectedProject = useSelector(selectedProjectSelector);
  const navigate = useNavigate();
  const {
    isOpen: isEpicModalOpen,
    onClose: closeEpicModal,
    onOpen: openEpicModal,
  } = useDisclosure();
  const {
    isOpen: isManualStoryModalOpen,
    onClose: closeManualStoryModal,
    onOpen: openManualStoryModal,
  } = useDisclosure();
  const toast = useToast();

  return (
    <>
      <Flex flexDirection="column" paddingInline="1rem" gap=".75rem">
        {selectedProject ? (
          <>
            <Flex justifyContent="flex-end" alignItems="center">
              <SpecsManagementActions
                onFilter={() => {}}
                onManual={openManualStoryModal}
                onOpenFigma={() => {
                  if (selectedProject?.figmaLink) {
                    window.open(
                      selectedProject?.figmaLink,
                      "_blank",
                      "noopener,noreferrer"
                    );
                  } else {
                    toast({
                      title: "Lien non diponible",
                      description:
                        "Le lien figma associé au projet est introuvable",
                      status: "error",
                      duration: 4000,
                    });
                  }
                }}
                onCreateFsd={() => {
                  navigate("/fsd-creation");
                }}
              />
            </Flex>
            <SpecificationsTable openEpicModal={openEpicModal} />
          </>
        ) : (
          <Flex
            background={colors.white}
            padding="1rem"
            border="1px solid"
            borderColor={colors.border}
            borderRadius=".5rem"
          >
            <Text fontSize="14px">
              Veuillez sélectionner un projet pour consulter ses épics
            </Text>
          </Flex>
        )}
      </Flex>
      <EpicMutationModal isOpen={isEpicModalOpen} onClose={closeEpicModal} />
      <ManualStoryModal
        isOpen={isManualStoryModalOpen}
        onClose={closeManualStoryModal}
      />
    </>
  );
}
