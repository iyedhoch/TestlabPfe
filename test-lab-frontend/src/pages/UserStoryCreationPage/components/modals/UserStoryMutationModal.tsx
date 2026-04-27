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
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Grid,
  Input,
  useDisclosure,
  useToast,
  Flex,
  Image,
  Textarea,
  Icon,
} from "@chakra-ui/react";
import { useFormik } from "formik";
import { useMemo, useRef, useState } from "react";
import File from "@/assets/svg/file.svg?react";
import Plus from "@/assets/svg/plus.svg?react";
import { getUserStoryValidationSchema } from "../../extra/validationSchema";
import { queryClient } from "@/App";
import { colors } from "@/theme/colors";

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

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const initialValues = useMemo(() => {
    if (isUpdate && updateData) {
      if (updateData.attachment && typeof updateData.attachment === "string") {
        setPreviewUrl(updateData.attachment);
      }

      return {
        name: updateData?.name,
        description: updateData?.description,
        status: updateData?.status,
        priority: updateData.priority,
        attachment: updateData?.attachment || null,
      };
    }
    return defaultInitialValues;
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      setFieldValue("attachment", file);
      const url = URL.createObjectURL(file);

      setPreviewUrl(url);
    }
  };

  const handleFileIconClick = () => {
    fileInputRef.current?.click();
  };

  const handleModalClose = () => {
    resetForm();
    setPreviewUrl(null);
    onClose();
  };

  const handleRemoveAttachment = () => {
    setFieldValue("attachment", null);
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  };

  const confirmRequest = () => {
    if (isUpdate) {
      if (!updateData) return;

      // Check if attachment was explicitly removed (was a string, now null)
      const attachmentWasRemoved =
        typeof updateData?.attachment === "string" &&
        values?.attachment === null;

      updateUserStory(
        {
          name: values?.name,
          description: values?.description,
          status: values?.status,
          priority: values?.priority,
          attachment: values?.attachment as File,
          storyId: updateData?.storyId,
          tagId: updateData?.tagId,
          removeAttachment: attachmentWasRemoved,
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
            setPreviewUrl(null);
          },
          onError: (error) => {
            toast({
              title: "Mise à jour impossible",
              description:
                error?.message ||
                "Erreur lors de la mise à jour de la user story",
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
          ...values,
          attachment: values?.attachment as File,
          featureId: featureId,
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
            setPreviewUrl(null);
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
                  value={values.status}
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
              </Grid>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Flex w="100%" justify="space-between" align="center">
                <Flex align="center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    hidden
                  />
                  {!previewUrl ? (
                    <Flex
                      width="2.25rem"
                      height="2.25rem"
                      bg={colors.blue}
                      borderRadius=".5rem"
                      justifyContent="center"
                      alignItems="center"
                      cursor="pointer"
                      transition=".3s"
                      onClick={handleFileIconClick}
                      _hover={{ bg: "blue.600" }}
                    >
                      <Icon
                        color="white"
                        width="1.25rem"
                        height="1.25rem"
                        as={File}
                      />
                    </Flex>
                  ) : (
                    <Flex align="center" gap={2}>
                      <Image
                        src={previewUrl}
                        alt="Preview"
                        maxH="2.25rem"
                        objectFit="contain"
                        borderRadius="md"
                        border="1px solid"
                        borderColor="gray.300"
                      />
                      <Flex
                        width="2.25rem"
                        height="2.25rem"
                        bg={colors.blue}
                        borderRadius=".5rem"
                        justifyContent="center"
                        alignItems="center"
                        cursor="pointer"
                        transition=".3s"
                        onClick={handleRemoveAttachment}
                        _hover={{ bg: "blue.600" }}
                      >
                        <Icon
                          color="white"
                          width="1.25rem"
                          height="1.25rem"
                          style={{ transform: "rotate(45deg)" }}
                          as={Plus}
                        />
                      </Flex>
                    </Flex>
                  )}
                </Flex>
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
