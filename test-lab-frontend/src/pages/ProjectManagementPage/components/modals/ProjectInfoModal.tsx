import { IProject, ProjectStatus } from "@/services";
import { colors } from "@/theme/colors";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  Text,
  Box,
  Grid,
  Image,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  useDisclosure,
  Flex,
} from "@chakra-ui/react";
import moment from "moment";
import { useRef } from "react";

interface IProjectInfoModal extends IProject {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProjectInfoModal({
  attachment,
  creationDate,
  description,
  name,
  isOpen,
  onClose,
  status,
  prefix,
  figmaLink,
}: IProjectInfoModal) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  const {
    isOpen: isPreviewOpen,
    onOpen: onPreviewOpen,
    onClose: onPreviewClose,
  } = useDisclosure();

  const projectStatusToLabelMapper: Record<ProjectStatus, string> = {
    [ProjectStatus.ACTIVE]: "Actif",
    [ProjectStatus.ARCHIVED]: "Archivé",
    [ProjectStatus.COMPLETED]: "Terminé",
    [ProjectStatus.ON_HOLD]: "En attente",
  };

  return (
    <>
      <AlertDialog
        leastDestructiveRef={cancelRef}
        isOpen={isOpen}
        onClose={onClose}
        autoFocus={false}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent w="800px" maxW="1000px">
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Informations du projet
            </AlertDialogHeader>

            <AlertDialogBody>
              {attachment && (
                <Flex
                  onClick={onPreviewOpen}
                  cursor="pointer"
                  justifyContent="center"
                  gridColumn="span 3"
                  marginBottom="1rem"
                >
                  <Image
                    border="1px solid"
                    borderColor={colors.border}
                    borderRadius=".5rem"
                    height={{ base: "175px", "2xl": "500px" }}
                    src={attachment}
                  />
                </Flex>
              )}
              <Grid gridTemplateColumns="repeat(3, 1fr)" gap="1rem">
                <Box
                  bg={colors.body}
                  p="1rem"
                  borderRadius=".75rem"
                  border="1px solid"
                  borderColor={colors.border}
                >
                  <Text fontSize="13px" fontWeight="bold" color="gray.700">
                    Nom du projet
                  </Text>
                  <Text fontSize="12px" mt="0.25rem">
                    {name}
                  </Text>
                </Box>

                <Box
                  bg={colors.body}
                  p="1rem"
                  borderRadius=".75rem"
                  border="1px solid"
                  borderColor={colors.border}
                >
                  <Text fontSize="13px" fontWeight="bold" color="gray.700">
                    Statut
                  </Text>
                  <Text fontSize="12px" mt="0.25rem">
                    {projectStatusToLabelMapper[status]}
                  </Text>
                </Box>

                <Box
                  bg={colors.body}
                  p="1rem"
                  borderRadius=".75rem"
                  border="1px solid"
                  borderColor={colors.border}
                >
                  <Text fontSize="13px" fontWeight="bold" color="gray.700">
                    Description
                  </Text>
                  <Text fontSize="12px" mt="0.25rem">
                    {description}
                  </Text>
                </Box>

                <Box
                  bg={colors.body}
                  p="1rem"
                  borderRadius=".75rem"
                  border="1px solid"
                  borderColor={colors.border}
                >
                  <Text fontSize="13px" fontWeight="bold" color="gray.600">
                    Date de création
                  </Text>
                  <Text fontSize="12px" mt="0.25rem">
                    {moment(creationDate).format("DD/MM/YYYY")}
                  </Text>
                </Box>
                <Box
                  bg={colors.body}
                  p="1rem"
                  borderRadius=".75rem"
                  border="1px solid"
                  borderColor={colors.border}
                >
                  <Text fontSize="13px" fontWeight="bold" color="gray.600">
                    Préfixe du projet
                  </Text>
                  <Text fontSize="12px" mt="0.25rem">
                    {prefix}
                  </Text>
                </Box>
                {figmaLink && (
                  <Box
                    bg={colors.body}
                    p="1rem"
                    borderRadius=".75rem"
                    border="1px solid"
                    borderColor={colors.border}
                  >
                    <Text fontSize="13px" fontWeight="bold" color="gray.600">
                      Lien figma
                    </Text>
                    <Flex
                      cursor="pointer"
                      onClick={() => {
                        if (figmaLink) {
                          window.open(
                            figmaLink,
                            "_blank",
                            "noopener,noreferrer"
                          );
                        }
                      }}
                      alignItems="center"
                      gap=".25rem"
                    >
                      <Text fontSize="12px" mt="0.25rem">
                        {"ouvrir le lien"}
                      </Text>
                    </Flex>
                  </Box>
                )}
              </Grid>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                ref={cancelRef}
                fontSize="13px"
                bg="blue.500"
                color="white"
                onClick={onClose}
                _hover={{ backgroundColor: "blue.600" }}
              >
                Fermer
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      {attachment && (
        <Modal
          isOpen={isPreviewOpen}
          onClose={onPreviewClose}
          size="xl"
          isCentered
        >
          <ModalOverlay />
          <ModalContent>
            <ModalBody p="1rem">
              <Image
                src={attachment}
                alt="Pièce jointe"
                maxH="80vh"
                mx="auto"
                borderRadius=".5rem"
              />
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
    </>
  );
}
