import { IUserStory, StoryStatus } from "@/services";
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

interface IUserStoryInfoModal extends Omit<IUserStory, "featureId"> {
  isOpen: boolean;
  onClose: () => void;
}

const storyStatusToLabelMapper: Record<StoryStatus, string> = {
  [StoryStatus.TO_DO]: "À faire",
  [StoryStatus.IN_PROGRESS]: "En cours",
  [StoryStatus.DONE]: "Terminé",
  [StoryStatus.BLOCKED]: "Bloqué",
};

const storyPriorityToLabelMapper: Record<string, string> = {
  HIGH: "Haute",
  MEDIUM: "Moyenne",
  LOW: "Basse",
};

export default function UserStoryInfoModal({
  name,
  description,
  status,
  priority,
  creationDate,
  attachment,
  testCases,
  isOpen,
  onClose,
}: IUserStoryInfoModal) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  const {
    isOpen: isPreviewOpen,
    onOpen: onPreviewOpen,
    onClose: onPreviewClose,
  } = useDisclosure();

  return (
    <>
      <AlertDialog
        leastDestructiveRef={cancelRef}
        isOpen={isOpen}
        onClose={onClose}
        autoFocus={false}
        scrollBehavior="inside"
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent w="800px" maxW="1000px">
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Informations de la User Story
            </AlertDialogHeader>

            <AlertDialogBody>
              <Grid gridTemplateColumns="repeat(3, 1fr)" gap="1rem">
                <Box
                  bg={colors.body}
                  p="1rem"
                  borderRadius=".75rem"
                  border="1px solid"
                  borderColor={colors.border}
                >
                  <Text fontSize="13px" fontWeight="bold" color="gray.700">
                    Nom de la User Story
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
                    {storyStatusToLabelMapper[status]}
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
                    Priorité
                  </Text>
                  <Text fontSize="12px" mt="0.25rem">
                    {storyPriorityToLabelMapper[priority] || priority}
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
                    Nombre de Test Cases
                  </Text>
                  <Text fontSize="12px" mt="0.25rem">
                    {testCases?.length || 0}
                  </Text>
                </Box>

                {attachment && (
                  <Box
                    bg={colors.body}
                    p="1rem"
                    borderRadius=".75rem"
                    border="1px solid"
                    borderColor={colors.border}
                  >
                    <Text fontSize="13px" fontWeight="bold" color="gray.600">
                      Pièce jointe
                    </Text>
                    <Flex
                      cursor="pointer"
                      onClick={onPreviewOpen}
                      alignItems="center"
                      gap=".25rem"
                    >
                      <Text fontSize="12px" mt="0.25rem">
                        {"ouvrir l'attachement"}
                      </Text>
                    </Flex>
                  </Box>
                )}

                <Box
                  gridColumn={attachment ? "2/4" : "1/4"}
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
                    {description || "Aucune description"}
                  </Text>
                </Box>
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
