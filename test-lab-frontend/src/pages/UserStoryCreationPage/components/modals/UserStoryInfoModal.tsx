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
  SimpleGrid,
} from "@chakra-ui/react";
import moment from "moment";
import { useMemo, useRef, useState } from "react";

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
  fsdImages,
  testCases,
  isOpen,
  onClose,
}: IUserStoryInfoModal) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const storyImages = useMemo(() => {
    if (fsdImages?.length) {
      return fsdImages.map((image) => ({
        url: image.url,
        altText: image.altText || name,
        caption: image.caption || "",
      }));
    }

    if (attachment) {
      return [
        {
          url: attachment,
          altText: name,
          caption: "Pièce jointe",
        },
      ];
    }

    return [];
  }, [attachment, fsdImages, name]);

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

                {storyImages.length > 0 && (
                  <Box
                    gridColumn="1/4"
                    bg={colors.body}
                    p="1rem"
                    borderRadius=".75rem"
                    border="1px solid"
                    borderColor={colors.border}
                  >
                    <Text fontSize="13px" fontWeight="bold" color="gray.600">
                      Images
                    </Text>
                    <SimpleGrid columns={{ base: 2, md: 3 }} gap={3} mt={3}>
                      {storyImages.map((image) => (
                        <Box
                          key={image.url}
                          border="1px solid"
                          borderColor={colors.border}
                          borderRadius="md"
                          overflow="hidden"
                          bg="white"
                          cursor="pointer"
                          onClick={() => setPreviewUrl(image.url)}
                        >
                          <Image
                            src={image.url}
                            alt={image.altText}
                            width="100%"
                            height="180px"
                            objectFit="cover"
                          />
                          {image.caption ? (
                            <Text fontSize="11px" p="0.5rem" color="gray.600">
                              {image.caption}
                            </Text>
                          ) : null}
                        </Box>
                      ))}
                    </SimpleGrid>
                  </Box>
                )}

                <Box
                  gridColumn="1/4"
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
      {previewUrl && (
        <Modal
          isOpen={!!previewUrl}
          onClose={() => setPreviewUrl(null)}
          size="4xl"
          isCentered
        >
          <ModalOverlay />
          <ModalContent>
            <ModalBody p="1rem">
              <Image
                src={previewUrl}
                alt="Story image"
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
