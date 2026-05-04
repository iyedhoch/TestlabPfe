import { ConfirmationModal } from "@/components";
import {
  GET_EPICS,
  SPECIFICATIONS_QUERIES_PREFIX,
  StoryPriority,
  StoryStatus,
  useCreateUserStoryMutation,
  useGetEpicsByProjectIdQuery,
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
  FormControl,
  FormErrorMessage,
  FormLabel,
  Grid,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  useDisclosure,
  useToast,
  Flex,
  Image,
  Textarea,
  Icon,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import { useFormik } from "formik";
import { useEffect, useRef, useState, useMemo } from "react";
import Arrow from "@/assets/svg/arrow.svg?react";
import File from "@/assets/svg/file.svg?react";
import Plus from "@/assets/svg/plus.svg?react";
import { getUserStoryValidationSchema } from "../../extra/validationSchema";
import { queryClient } from "@/App";
import { colors } from "@/theme/colors";
import { useSelector } from "react-redux";
import { selectedProjectSelector } from "@/app/slices/projectSlice";

type PreviewImage = {
  file: File;
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

interface IManualStoryModal {
  isOpen: boolean;
  onClose: () => void;
}

const defaultInitialValues = {
  epicId: "",
  featureId: "",
  name: "",
  description: "",
  sprint: "Sprint N°1",
  status: StoryStatus.TO_DO,
  priority: StoryPriority.MEDIUM,
  attachment: null as File | string | null,
};

export default function ManualStoryModal({
  isOpen,
  onClose,
}: IManualStoryModal) {
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
  const selectedProject = useSelector(selectedProjectSelector);
  const { data: epics } = useGetEpicsByProjectIdQuery({
    projectId: selectedProject?.id as string,
  });

  const [selectedImages, setSelectedImages] = useState<PreviewImage[]>([]);

  const dynamicValidationSchema = useMemo(() => {
    return getUserStoryValidationSchema(false, true);
  }, [false]);

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
    initialValues: defaultInitialValues,
    enableReinitialize: true,
    validateOnMount: false,
    validationSchema: dynamicValidationSchema,
    onSubmit: () => {
      onClose();
      openConfirmationModal();
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length > 0) {
      const previews = files.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      setSelectedImages((currentImages) => [...currentImages, ...previews]);
      event.target.value = "";
    }
  };

  const handleFileIconClick = () => {
    fileInputRef.current?.click();
  };

  const normalizedEpics = useMemo(() => {
    if (Array.isArray(epics)) {
      return epics;
    }

    const maybeWrappedEpics = epics as unknown as
      | { epics?: unknown; data?: unknown }
      | undefined;

    if (Array.isArray(maybeWrappedEpics?.epics)) {
      return maybeWrappedEpics.epics;
    }

    if (Array.isArray(maybeWrappedEpics?.data)) {
      return maybeWrappedEpics.data;
    }

    return [];
  }, [epics]);

  const selectedEpic = useMemo(() => {
    return normalizedEpics.find((epic) => epic.id === values.epicId);
  }, [normalizedEpics, values.epicId]);

  const availableFeatures = useMemo(() => {
    return selectedEpic?.features || [];
  }, [selectedEpic]);

  const selectedEpicName = selectedEpic?.name || "Sélectionner un epic";
  const selectedFeatureName =
    availableFeatures.find((f) => f.id === values.featureId)?.name ||
    "Sélectionner une feature";

  const handleModalClose = () => {
    selectedImages.forEach((image) => {
      if (image.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(image.previewUrl);
      }
    });
    resetForm();
    setSelectedImages([]);
    onClose();
  };

  const handleRemoveAttachment = (index: number) => {
    setSelectedImages((currentImages) => {
      const nextImages = [...currentImages];
      const [removedImage] = nextImages.splice(index, 1);

      if (removedImage?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(removedImage.previewUrl);
      }

      return nextImages;
    });
  };

  const confirmRequest = () => {
    if (!values.featureId) {
      toast({
        title: "Feature requise",
        description: "Veuillez sélectionner une feature",
        status: "error",
        duration: 3000,
      });
      return;
    }

    createUserStory(
      {
        ...values,
        attachments: selectedImages.map((image) => image.file),
        featureId: values?.featureId,
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
              Créer une nouvelle user story
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
                  isInvalid={!!(touched?.epicId && errors?.epicId)}
                >
                  <FormLabel fontSize="13px">Epic</FormLabel>
                  <Menu>
                    <MenuButton width="100%">
                      <Box position="relative">
                        <Input
                          fontSize="13px"
                          name="epicId"
                          readOnly
                          cursor="pointer"
                          value={selectedEpicName}
                          paddingRight="2.5rem"
                          borderWidth="1.5px"
                        />
                        <Box
                          position="absolute"
                          right="0.75rem"
                          top="50%"
                          transform="translateY(-50%)"
                          pointerEvents="none"
                        >
                          <Arrow width="1rem" height="1rem" />
                        </Box>
                      </Box>
                    </MenuButton>
                    <MenuList zIndex={10000}>
                      {normalizedEpics.map((epic) => (
                        <MenuItem
                          key={epic.id}
                          fontSize="13px"
                          onClick={() => {
                            setFieldValue("epicId", epic.id);
                            // Reset feature when epic changes
                            setFieldValue("featureId", "");
                          }}
                        >
                          {epic.name}
                        </MenuItem>
                      ))}
                    </MenuList>
                  </Menu>
                  <FormErrorMessage fontSize="12px">
                    {errors?.epicId}
                  </FormErrorMessage>
                </FormControl>

                <FormControl
                  isRequired
                  isInvalid={!!(touched?.featureId && errors?.featureId)}
                >
                  <FormLabel fontSize="13px">Feature</FormLabel>
                  <Menu>
                    <MenuButton width="100%">
                      <Box position="relative">
                        <Input
                          fontSize="13px"
                          name="featureId"
                          readOnly
                          cursor="pointer"
                          value={selectedFeatureName}
                          paddingRight="2.5rem"
                          borderWidth="1.5px"
                        />
                        <Box
                          position="absolute"
                          right="0.75rem"
                          top="50%"
                          transform="translateY(-50%)"
                          pointerEvents="none"
                        >
                          <Arrow width="1rem" height="1rem" />
                        </Box>
                      </Box>
                    </MenuButton>
                    <MenuList zIndex={10000}>
                      {availableFeatures.length > 0 ? (
                        availableFeatures.map((feature) => (
                          <MenuItem
                            key={feature.id}
                            fontSize="13px"
                            onClick={() => {
                              setFieldValue("featureId", feature.id);
                            }}
                          >
                            {feature.name}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem fontSize="13px" isDisabled>
                          Aucune feature disponible
                        </MenuItem>
                      )}
                    </MenuList>
                  </Menu>
                  <FormErrorMessage fontSize="12px">
                    {errors?.featureId}
                  </FormErrorMessage>
                </FormControl>

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

                <FormControl
                  isRequired
                  isInvalid={!!(touched?.status && errors?.status)}
                >
                  <FormLabel fontSize="13px">Statut</FormLabel>
                  <Menu>
                    <MenuButton width="100%">
                      <Box position="relative">
                        <Input
                          fontSize="13px"
                          name="status"
                          readOnly
                          cursor="pointer"
                          value={
                            userStoryStatusToLabelMapper[
                              values.status as StoryStatus
                            ]
                          }
                          paddingRight="2.5rem"
                        />
                        <Box
                          position="absolute"
                          right="0.75rem"
                          top="50%"
                          transform="translateY(-50%)"
                          pointerEvents="none"
                        >
                          <Arrow width="1rem" height="1rem" />
                        </Box>
                      </Box>
                    </MenuButton>
                    <MenuList zIndex={10000}>
                      {Object.values(StoryStatus).map((status) => (
                        <MenuItem
                          key={status}
                          fontSize="13px"
                          onClick={() => {
                            handleChange({
                              target: { name: "status", value: status },
                            });
                          }}
                        >
                          {userStoryStatusToLabelMapper[status]}
                        </MenuItem>
                      ))}
                    </MenuList>
                  </Menu>
                  <FormErrorMessage fontSize="12px">
                    {errors?.status}
                  </FormErrorMessage>
                </FormControl>

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
                    height={{ base: "160px", "2xl": "480px" }}
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

                  {selectedImages.length > 0 ? (
                    <SimpleGrid columns={{ base: 2, md: 3, xl: 4 }} gap={3}>
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
                            alt={`Selected image ${index + 1}`}
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
                            onClick={() => handleRemoveAttachment(index)}
                          >
                            Retirer
                          </Button>
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
                    Créer la user story
                  </Button>
                </Flex>
              </Flex>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      <ConfirmationModal
        isLoading={isCreatingUserStory}
        onClose={closeConfirmationModal}
        isOpen={isConfirmationModalOpen}
        title="Confirmation"
        ConfirmationLabel={"Confirmer la création"}
        description={`Êtes-vous sûr de vouloir créer la user story '${values?.name}'?`}
        onConfirm={confirmRequest}
      />
    </>
  );
}
