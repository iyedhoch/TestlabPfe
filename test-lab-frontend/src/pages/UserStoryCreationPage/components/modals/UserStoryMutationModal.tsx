import { ConfirmationModal, Dropdown } from "@/components";
import {
  GET_EPICS,
  IUpdateUserStoryPayload,
  SPECIFICATIONS_QUERIES_PREFIX,
  StoryPriority,
  StoryStatus,
  useCreateUserStoryMutation,
  useUpdateUserStoryMutation,
} from "@/services";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Grid,
  Icon,
  Image,
  Input,
  SimpleGrid,
  Text,
  Textarea,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useFormik } from "formik";
import { useEffect, useMemo, useRef, useState } from "react";
import FileIcon from "@/assets/svg/file.svg?react";
import Plus from "@/assets/svg/plus.svg?react";
import { queryClient } from "@/App";
import { getUserStoryValidationSchema } from "../../extra/validationSchema";
import { colors } from "@/theme/colors";
import { IUserStoryImage } from "@/services";

type PreviewImage = {
  file: globalThis.File;
  previewUrl: string;
};

export const userStoryStatusToLabelMapper: Record<StoryStatus, string> = {
  [StoryStatus.TO_DO]: "À faire",
  [StoryStatus.IN_PROGRESS]: "En cours",
  [StoryStatus.DONE]: "Terminé",
  [StoryStatus.BLOCKED]: "Bloqué",
};

export const userStoryPriorityToLabelMapper: Record<StoryPriority, string> = {
  [StoryPriority.LOW]: "Basse",
  [StoryPriority.MEDIUM]: "Moyenne",
  [StoryPriority.HIGH]: "Haute",
};

interface IUserStoryCreationModal {
  isOpen: boolean;
  onClose: () => void;
  featureId: string;
  isUpdate?: false;
  updateData?: never;
  setIsActionsOpen?: never;
  isManualFlow: boolean;
}

interface IUserStoryUpdateModal {
  isOpen: boolean;
  onClose: () => void;
  featureId?: never;
  isUpdate: true;
  updateData: IUpdateUserStoryPayload;
  setIsActionsOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  isManualFlow: boolean;
}

type IUserStoryMutationModal = IUserStoryCreationModal | IUserStoryUpdateModal;

const defaultInitialValues = {
  name: "",
  description: "",
  status: StoryStatus.TO_DO,
  priority: StoryPriority.MEDIUM,
  attachment: null as File | string | null,
};

export default function UserStoryMutationModal({
  isOpen,
  onClose,
  isUpdate = false,
  updateData,
  setIsActionsOpen,
  featureId,
  isManualFlow,
}: IUserStoryMutationModal) {
  const {
    isOpen: isConfirmationModalOpen,
    onClose: closeConfirmationModal,
    onOpen: openConfirmationModal,
  } = useDisclosure();
  const toast = useToast();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: createUserStory, isPending: isCreatingUserStory } =
    useCreateUserStoryMutation();
  const { mutate: updateUserStory, isPending: isUpdatingUserStory } =
    useUpdateUserStoryMutation();

  const [selectedImages, setSelectedImages] = useState<PreviewImage[]>([]);
  const [isLegacyAttachmentRemoved, setIsLegacyAttachmentRemoved] =
    useState(false);

  const [newImageCaptions, setNewImageCaptions] = useState<string[]>([]);
  const [editedCaptions, setEditedCaptions] = useState<Record<string, string>>({});
  const [imageIdsToDelete, setImageIdsToDelete] = useState<string[]>([]);

  const initialValues = useMemo(() => {
    if (!isUpdate || !updateData) {
      return defaultInitialValues;
    }

    return {
      name: updateData.name,
      description: updateData.description,
      status: updateData.status,
      priority: updateData.priority,
      attachment: updateData.attachment || null,
    };
  }, [isUpdate, updateData]);

  const dynamicValidationSchema = useMemo(() => {
    return getUserStoryValidationSchema(isUpdate, isManualFlow);
  }, [isUpdate]);

  const {
    values,
    handleSubmit,
    errors,
    touched,
    handleChange,
    resetForm,
    handleBlur,
    setFieldValue,
  } = useFormik({
    initialValues,
    enableReinitialize: true,
    validateOnMount: false,
    validationSchema: dynamicValidationSchema,
    onSubmit: () => {
      onClose();
      openConfirmationModal();
    },
  });

  const legacyAttachmentUrl =
    isUpdate &&
    !isLegacyAttachmentRemoved &&
    !updateData?.fsdImages?.length &&
    typeof updateData?.attachment === "string"
      ? updateData.attachment
      : null;

  const existingImages = useMemo(() => {
  if (isUpdate && updateData?.fsdImages?.length) {
    return updateData.fsdImages
      .filter((img: IUserStoryImage) => !imageIdsToDelete.includes(img.id!))
      .map((img: IUserStoryImage) => ({
        id: img.id!,
        url: img.url,
        caption: img.caption || '',
        removable: true,   // allow delete button
      }));
  }

  if (legacyAttachmentUrl) {
    return [{ id: '', url: legacyAttachmentUrl, caption: 'Pièce jointe', removable: true }];
  }

  return [];
}, [legacyAttachmentUrl, updateData?.fsdImages, imageIdsToDelete]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedImages([]);
    setIsLegacyAttachmentRemoved(false);
  }, [isOpen, updateData?.storyId]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(event.target.files ?? []);

  if (files.length === 0) {
    return;
  }

  const previews = files.map((file) => ({
    file,
    previewUrl: URL.createObjectURL(file),
  }));

  setSelectedImages((currentImages) => [...currentImages, ...previews]);
  setNewImageCaptions((prev) => [...prev, ...files.map((f) => f.name)]);
  event.target.value = "";
};

  const handleFileIconClick = () => {
    fileInputRef.current?.click();
  };

  const handleModalClose = () => {
    selectedImages.forEach((image) => {
      if (image.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(image.previewUrl);
      }
    });

    resetForm();
    setSelectedImages([]);
    setIsLegacyAttachmentRemoved(false);
    onClose();
  };

  const handleRemoveSelectedImage = (index: number) => {
  setSelectedImages((currentImages) => {
    const nextImages = [...currentImages];
    const [removedImage] = nextImages.splice(index, 1);
    if (removedImage?.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(removedImage.previewUrl);
    }
    return nextImages;
  });
  // Remove caption at the same index
  setNewImageCaptions((prev) => {
    const next = [...prev];
    next.splice(index, 1);
    return next;
  });
};

  const handleRemoveLegacyAttachment = () => {
    setIsLegacyAttachmentRemoved(true);
  };
  const handleNewCaptionChange = (index: number, value: string) => {
    setNewImageCaptions((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
  });
  };

  const handleExistingCaptionChange = (imageId: string, value: string) => {
    setEditedCaptions((prev) => ({ ...prev, [imageId]: value }));
  };

  const handleDeleteExistingImage = (imageId: string) => {
    setImageIdsToDelete((prev) => [...prev, imageId]);
  };

  const confirmRequest = () => {
  if (isUpdate) {
    if (!updateData) return;

    updateUserStory(
      {
        name: values?.name,
        description: values?.description,
        status: values?.status,
        priority: values?.priority,
        attachments: selectedImages.map((image) => image.file),
        storyId: updateData.storyId,
        tagId: updateData.tagId,
        removeAttachment: isLegacyAttachmentRemoved,
        // New fields for captions and image management
        captions: newImageCaptions.length > 0 ? newImageCaptions : undefined,
        imageCaptions: Object.keys(editedCaptions).length > 0
          ? Object.entries(editedCaptions).map(([id, caption]) => ({ id, caption }))
          : undefined,
        imageIdsToDelete: imageIdsToDelete.length > 0 ? imageIdsToDelete : undefined,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: [SPECIFICATIONS_QUERIES_PREFIX, GET_EPICS],
            exact: false,
          });

          toast({
            title: "User Story mise à jour",
            description: "La user story a été mise à jour avec succès",
            status: "success",
            duration: 3000,
          });

          closeConfirmationModal();
          setIsActionsOpen && setIsActionsOpen(false);
          resetForm();
          selectedImages.forEach((image) => {
            if (image.previewUrl.startsWith("blob:")) {
              URL.revokeObjectURL(image.previewUrl);
            }
          });
          setSelectedImages([]);
          setIsLegacyAttachmentRemoved(false);
          setNewImageCaptions([]);
          setEditedCaptions({});
          setImageIdsToDelete([]);
        },
        onError: (error) => {
          toast({
            title: "Mise à jour impossible",
            description:
              error?.message || "Erreur lors de la mise à jour de la user story",
            status: "error",
            duration: 4000,
          });
        },
      }
    );
     } else {
      if (!featureId) return;

      createUserStory(
        {
          name: values.name ?? '',
          description: values.description ?? '',
          status: values.status ?? StoryStatus.TO_DO,
          priority: values.priority ?? StoryPriority.MEDIUM,
          attachments: selectedImages.map((image) => image.file),
          featureId,
          captions: newImageCaptions.length > 0 ? newImageCaptions : undefined,
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: [SPECIFICATIONS_QUERIES_PREFIX, GET_EPICS],
              exact: false,
            });

            toast({
              title: "User Story créée",
              description: "La nouvelle user story a été ajoutée avec succès",
              status: "success",
              duration: 3000,
            });

            closeConfirmationModal();
            resetForm();
            selectedImages.forEach((image) => {
              if (image.previewUrl.startsWith("blob:")) {
                URL.revokeObjectURL(image.previewUrl);
              }
            });
            setSelectedImages([]);
            setIsLegacyAttachmentRemoved(false);
            setNewImageCaptions([]);
            setEditedCaptions({});
            setImageIdsToDelete([]);
          },
          onError: (error) => {
            toast({
              title: "Création impossible",
              description:
                error?.message || "Erreur lors de la création de la user story",
              status: "error",
              duration: 4000,
            });
          },
        }
      );
    }
  };

  return (
    <>
      <AlertDialog
        leastDestructiveRef={cancelRef}
        isOpen={isOpen}
        onClose={handleModalClose}
        autoFocus={false}
        scrollBehavior="inside"
        isCentered
      >
        <AlertDialogOverlay zIndex={9999}>
          <AlertDialogContent
            key={String(isOpen)}
            height="90vh"
            maxW="95vw"
            maxH="95vh"
            borderRadius="md"
          >
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {isUpdate
                ? "Mettre à jour la user story"
                : "Créer une nouvelle user story"}
            </AlertDialogHeader>
            <Flex
              width="2rem"
              height="2rem"
              bg="gray.100"
              borderRadius=".5rem"
              justifyContent="center"
              alignItems="center"
              cursor="pointer"
              transition=".3s"
              position="absolute"
              top="1rem"
              right="1rem"
              onClick={onClose}
            >
              <Icon
                color="gray.600"
                width="1.25rem"
                height="1.25rem"
                style={{ transform: "rotate(45deg)" }}
                as={Plus}
              />
            </Flex>
            <AlertDialogBody>
              <Grid gridTemplateColumns="repeat(2, 1fr)" gap=".75rem">
                <FormControl
                  isRequired
                  isInvalid={!!(touched.name && errors?.name)}
                >
                  <FormLabel fontSize="13px">Titre</FormLabel>
                  <Input
                    placeholder="Entrer le titre de la user story..."
                    fontSize="13px"
                    value={values?.name}
                    name="name"
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <FormErrorMessage fontSize="12px">
                    {errors?.name}
                  </FormErrorMessage>
                </FormControl>

                <Dropdown
                  label="Statut"
                  name="status"
                  value={values.status ?? ''}
                  options={userStoryStatusToLabelMapper}
                  onChange={(name, value) => setFieldValue(name, value)}
                  isRequired
                  isInvalid={!!errors.status}
                  error={errors.status}
                  touched={touched.status}
                />

                <FormControl
                  gridColumn="1/3"
                  isInvalid={!!(touched?.description && errors?.description)}
                >
                  <FormLabel fontSize="13px">Description</FormLabel>
                  <Textarea
                    placeholder="Entrer la description de la user story..."
                    fontSize="13px"
                    value={values?.description}
                    name="description"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    noOfLines={4}
                    resize="none"
                    overflowY="auto"
                    onWheel={(e) => e.stopPropagation()}
                    height={{ base: "260px", "2xl": "550px" }}
                  />
                  <FormErrorMessage fontSize="12px">
                    {errors?.description}
                  </FormErrorMessage>
                </FormControl>

                <FormControl gridColumn="1/3">
                  <Flex justify="space-between" align="center" mb="0.5rem">
                    <FormLabel fontSize="13px" mb="0">
                      Images
                    </FormLabel>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      borderColor={colors.blue}
                      color={colors.blue}
                      onClick={handleFileIconClick}
                      _hover={{ bg: "blue.50" }}
                      leftIcon={<Icon as={FileIcon} />}
                    >
                      Ajouter des images
                    </Button>
                  </Flex>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    hidden
                  />

                  {existingImages.length > 0 || selectedImages.length > 0 ? (
                    <SimpleGrid columns={{ base: 2, md: 3, xl: 4 }} gap={3}>
                      {/* Existing images (update mode) */}
                      {existingImages.map((image) => (
                        <Box
                          key={image.id || image.url}
                          border="1px solid"
                          borderColor="gray.200"
                          borderRadius="md"
                          overflow="hidden"
                          bg="white"
                          position="relative"
                        >
                          <Image
                            src={image.url}
                            alt="Story image"
                            width="100%"
                            height="160px"
                            objectFit="cover"
                          />
                          <Button
                            type="button"
                            size="xs"
                            position="absolute"
                            top="0.5rem"
                            right="0.5rem"
                            bg="white"
                            color="red.500"
                            onClick={() => handleDeleteExistingImage(image.id)}
                          >
                            Supprimer
                          </Button>
                          <Box px={2} pb={2}>
                            <Input
                              size="xs"
                              mt={1}
                              value={editedCaptions[image.id] ?? image.caption}
                              onChange={(e) => handleExistingCaptionChange(image.id, e.target.value)}
                              placeholder="Légende"
                              fontSize="11px"
                            />
                          </Box>
                        </Box>
                      ))}

                      {/* Newly selected images */}
                      {selectedImages.map((image, index) => (
                        <Box
                          key={image.previewUrl}
                          border="1px solid"
                          borderColor="gray.200"
                          borderRadius="md"
                          overflow="hidden"
                          bg="white"
                          position="relative"
                        >
                          <Image
                            src={image.previewUrl}
                            alt={`New image ${index + 1}`}
                            width="100%"
                            height="160px"
                            objectFit="cover"
                          />
                          <Button
                            type="button"
                            size="xs"
                            position="absolute"
                            top="0.5rem"
                            right="0.5rem"
                            bg="white"
                            color="gray.700"
                            onClick={() => handleRemoveSelectedImage(index)}
                          >
                            Retirer
                          </Button>
                          <Box px={2} pb={2}>
                            <Input
                              size="xs"
                              mt={1}
                              value={newImageCaptions[index] || ''}
                              onChange={(e) => handleNewCaptionChange(index, e.target.value)}
                              placeholder="Légende"
                              fontSize="11px"
                            />
                          </Box>
                        </Box>
                      ))}
                    </SimpleGrid>
                  ) : (
                    <Flex
                      minH="120px"
                      border="1px dashed"
                      borderColor="gray.300"
                      borderRadius="md"
                      align="center"
                      justify="center"
                      bg="gray.50"
                      color="gray.500"
                      px="1rem"
                      textAlign="center"
                    >
                      <Text fontSize="12px">
                        Ajoutez une ou plusieurs images pour la user story.
                      </Text>
                    </Flex>
                  )}
                </FormControl>
              </Grid>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Flex w="100%" justify="space-between" align="center">
                <Flex>
                  <Button
                    ref={cancelRef}
                    fontSize="13px"
                    bg="gray.100"
                    color="gray.600"
                    onClick={handleModalClose}
                    _hover={{ backgroundColor: "gray.200" }}
                  >
                    Annuler
                  </Button>
                  <Button
                    ml={3}
                    fontSize="13px"
                    bg="blue.500"
                    color="white"
                    _hover={{ backgroundColor: "blue.600" }}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSubmit();
                    }}
                  >
                    {isUpdate
                      ? "Mettre à jour la user story"
                      : "Créer la user story"}
                  </Button>
                </Flex>
              </Flex>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      <ConfirmationModal
        isLoading={isUpdate ? isUpdatingUserStory : isCreatingUserStory}
        onClose={closeConfirmationModal}
        isOpen={isConfirmationModalOpen}
        title="Confirmation"
        ConfirmationLabel={
          isUpdate ? "Confirmer la mise à jour" : "Confirmer la création"
        }
        description={`Êtes-vous sûr de vouloir ${
          isUpdate ? "mettre à jour" : "créer"
        } la user story '${values?.name}'?`}
        onConfirm={confirmRequest}
      />
    </>
  );
}
