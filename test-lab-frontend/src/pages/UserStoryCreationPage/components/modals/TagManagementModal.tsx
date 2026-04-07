import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Flex,
  Text,
  Button,
  Input,
  Box,
  useToast,
  Grid,
  IconButton,
  useDisclosure,
} from "@chakra-ui/react";
import { colors } from "@/theme/colors";
import { useState, useEffect } from "react";
import {
  useGetAllTagsQuery,
  useCreateTagMutation,
  useDeleteTagMutation,
  SPECIFICATIONS_QUERIES_PREFIX,
  GET_TAGS,
  ITag,
} from "@/services";
import { queryClient } from "@/App";
import { ConfirmationModal } from "@/components";

interface TagManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTag?: ITag;
  onSelectTag: (tag: ITag) => void;
  onRemoveTag?: () => void;
  entityType: "epic" | "feature" | "user-story";
  entityName: string;
}

const PRESET_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

export default function TagManagementModal({
  isOpen,
  onClose,
  currentTag,
  onSelectTag,
  onRemoveTag,
  entityType,
}: TagManagementModalProps) {
  const toast = useToast();
  const { data: tags, isLoading: isLoadingTags } = useGetAllTagsQuery();
  const { mutate: createTag, isPending: isCreatingTag } =
    useCreateTagMutation();
  const { mutate: deleteTag, isPending: isDeletingTag } =
    useDeleteTagMutation();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [tagToDelete, setTagToDelete] = useState<{
    id: number;
    label: string;
  } | null>(null);

  const {
    isOpen: isDeleteModalOpen,
    onClose: closeDeleteModal,
    onOpen: openDeleteModal,
  } = useDisclosure();

  useEffect(() => {
    if (!isOpen) {
      setIsCreatingNew(false);
      setNewTagLabel("");
      setSelectedColor(PRESET_COLORS[0]);
      setTagToDelete(null);
    }
  }, [isOpen]);

  const entityTypeLabel = {
    epic: "l'Epic",
    feature: "la Feature",
    "user-story": "la User Story",
  }[entityType];

  const handleCreateTag = () => {
    if (!newTagLabel.trim()) {
      toast({
        title: "Label requis",
        description: "Veuillez entrer un label pour le tag",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    createTag(
      { label: newTagLabel.trim(), color: selectedColor },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({
            queryKey: [SPECIFICATIONS_QUERIES_PREFIX, GET_TAGS],
          });

          toast({
            title: "Tag créé",
            description: "Le tag a été créé avec succès",
            status: "success",
            duration: 3000,
          });

          onSelectTag(data.data);
          onClose();
        },
        onError: (error: any) => {
          toast({
            title: "Erreur",
            description: error?.message || "Impossible de créer le tag",
            status: "error",
            duration: 4000,
          });
        },
      }
    );
  };

  const handleDeleteTag = () => {
    if (!tagToDelete) return;

    deleteTag(tagToDelete.id, {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [SPECIFICATIONS_QUERIES_PREFIX, GET_TAGS],
        });

        toast({
          title: "Tag supprimé",
          description: "Le tag a été supprimé avec succès",
          status: "success",
          duration: 3000,
        });
        closeDeleteModal();
        setTagToDelete(null);
      },
      onError: (error: any) => {
        toast({
          title: "Erreur",
          description: error?.message || "Impossible de supprimer le tag",
          status: "error",
          duration: 4000,
        });
      },
    });
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent width="475px" maxWidth="1000px">
          <ModalHeader fontSize="16px">
            Gérer le tag de {entityTypeLabel}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Flex flexDirection="column" gap="1rem">
              {currentTag && (
                <Flex
                  flexDirection="column"
                  gap="0.5rem"
                  padding="1rem"
                  bg={colors.body}
                  borderRadius="0.5rem"
                >
                  <Text fontSize="12px" fontWeight="medium" color={colors.text}>
                    Tag actuel
                  </Text>
                  <Flex alignItems="center" justifyContent="space-between">
                    <Flex
                      paddingX="0.75rem"
                      paddingY="0.5rem"
                      borderRadius="4px"
                      bg={currentTag.color}
                      alignItems="center"
                    >
                      <Text
                        fontSize="12px"
                        fontWeight="medium"
                        color="white"
                        textAlign="center"
                      >
                        {currentTag.label}
                      </Text>
                    </Flex>
                    {onRemoveTag && (
                      <Button
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => {
                          onRemoveTag();
                          onClose();
                        }}
                      >
                        Retirer
                      </Button>
                    )}
                  </Flex>
                </Flex>
              )}

              {!isCreatingNew ? (
                <>
                  <Flex flexDirection="column" gap="0.5rem">
                    <Text
                      fontSize="12px"
                      fontWeight="medium"
                      color={colors.text}
                    >
                      Sélectionner un tag existant
                    </Text>
                    {isLoadingTags ? (
                      <Text
                        fontSize="12px"
                        color={colors.text}
                        padding="1rem"
                        textAlign="center"
                      >
                        Chargement...
                      </Text>
                    ) : !tags || tags?.length === 0 ? (
                      <Flex
                        padding="1rem"
                        bg={colors.body}
                        borderRadius="0.5rem"
                        justifyContent="center"
                      >
                        <Text fontSize="12px" color={colors.text}>
                          Aucun tag disponible. Créez-en un nouveau.
                        </Text>
                      </Flex>
                    ) : (
                      <Grid
                        gridTemplateColumns="repeat(3, 1fr)"
                        gap="0.5rem"
                        maxHeight="300px"
                        padding="0.25rem"
                      >
                        {tags?.map((tag: any) => (
                          <Flex
                            key={tag.id}
                            position="relative"
                            paddingX="0.75rem"
                            paddingY="0.5rem"
                            borderRadius="4px"
                            bg={tag.color}
                            alignItems="center"
                            justifyContent="center"
                            cursor="pointer"
                            onClick={() => {
                              onSelectTag(tag);
                              onClose();
                            }}
                            _hover={{ opacity: 0.8 }}
                            transition="opacity 0.2s"
                            role="group"
                          >
                            <Text
                              fontSize="12px"
                              fontWeight="medium"
                              color="white"
                              textAlign="center"
                              noOfLines={1}
                            >
                              {tag?.label}
                            </Text>
                            <IconButton
                              aria-label="Delete tag"
                              icon={<Text fontSize="14px">×</Text>}
                              size="xs"
                              position="absolute"
                              top="-6px"
                              right="-6px"
                              borderRadius="full"
                              bg="red.500"
                              color="white"
                              minW="20px"
                              height="20px"
                              opacity={0}
                              _groupHover={{ opacity: 1 }}
                              _hover={{ bg: "red.600" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setTagToDelete({
                                  id: tag.id,
                                  label: tag.label,
                                });
                                openDeleteModal();
                              }}
                            />
                          </Flex>
                        ))}
                      </Grid>
                    )}
                  </Flex>

                  <Button
                    size="sm"
                    colorScheme="blue"
                    onClick={() => setIsCreatingNew(true)}
                  >
                    Créer un nouveau tag
                  </Button>
                </>
              ) : (
                <Flex flexDirection="column" gap="1rem">
                  <Flex flexDirection="column" gap="0.5rem">
                    <Text
                      fontSize="12px"
                      fontWeight="medium"
                      color={colors.text}
                    >
                      Label du tag
                    </Text>
                    <Input
                      placeholder="Ex: Frontend, Backend, Bug..."
                      fontSize="13px"
                      value={newTagLabel}
                      onChange={(e) => setNewTagLabel(e.target.value)}
                    />
                  </Flex>

                  <Flex flexDirection="column" gap="0.5rem">
                    <Text
                      fontSize="12px"
                      fontWeight="medium"
                      color={colors.text}
                    >
                      Couleur
                    </Text>
                    <Flex gap="0.5rem" flexWrap="wrap">
                      {PRESET_COLORS.map((color) => (
                        <Box
                          key={color}
                          width="2rem"
                          height="2rem"
                          bg={color}
                          borderRadius="4px"
                          cursor="pointer"
                          border={
                            selectedColor === color
                              ? `3px solid ${colors.blue}`
                              : "3px solid transparent"
                          }
                          onClick={() => setSelectedColor(color)}
                          _hover={{ opacity: 0.8 }}
                          transition="all 0.2s"
                        />
                      ))}
                    </Flex>
                  </Flex>

                  <Flex gap="0.5rem">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsCreatingNew(false)}
                    >
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      onClick={handleCreateTag}
                      isLoading={isCreatingTag}
                    >
                      Créer le tag
                    </Button>
                  </Flex>
                </Flex>
              )}
            </Flex>
          </ModalBody>
        </ModalContent>
      </Modal>

      <ConfirmationModal
        isLoading={isDeletingTag}
        ConfirmationLabel="Supprimer"
        title="Supprimer le tag"
        description={`Êtes-vous sûr de vouloir supprimer le tag "${tagToDelete?.label}" ? Cette action est irréversible.`}
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        isDeleteModal
        onConfirm={handleDeleteTag}
      />
    </>
  );
}
