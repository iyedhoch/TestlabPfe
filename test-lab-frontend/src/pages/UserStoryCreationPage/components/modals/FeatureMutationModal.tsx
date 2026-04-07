import { ConfirmationModal } from "@/components";
import {
  FeaturePriority,
  FeatureStatus,
  GET_EPICS,
  IUpdateFeaturePayload,
  SPECIFICATIONS_QUERIES_PREFIX,
  useCreateFeatureMutation,
  useUpdateFeatureMutation,
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
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Textarea,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useFormik } from "formik";
import { useMemo, useRef } from "react";
import Arrow from "@/assets/svg/arrow.svg?react";
import { featureValidationSchema as validationSchema } from "../../extra/validationSchema";
import { queryClient } from "@/App";
import Plus from "@/assets/svg/plus.svg?react";

export const featureStatusToLabelMapper: Record<FeatureStatus, string> = {
  [FeatureStatus.NEW]: "Nouveau",
  [FeatureStatus.IN_PROGRESS]: "En cours",
  [FeatureStatus.COMPLETED]: "Terminé",
  [FeatureStatus.PENDING]: "En attente",
};

export const featurePriorityToLabelMapper: Record<FeaturePriority, string> = {
  [FeaturePriority.LOW]: "Basse",
  [FeaturePriority.MEDIUM]: "Moyenne",
  [FeaturePriority.HIGH]: "Haute",
  [FeaturePriority.CRITICAL]: "Critique",
};

interface IFeatureCreationModal {
  isOpen: boolean;
  onClose: () => void;
  epicId: string;
  isUpdate?: false;
  updateData?: never;
  setIsActionsOpen?: never;
}

interface IFeatureUpdateModal {
  isOpen: boolean;
  onClose: () => void;
  epicId?: never;
  isUpdate: true;
  updateData: IUpdateFeaturePayload;
  setIsActionsOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

type IFeatureMutationModal = IFeatureCreationModal | IFeatureUpdateModal;

const defaultInitialValues = {
  name: "",
  description: "",
  sprint: "Sprint N°1",
  status: FeatureStatus.NEW,
  priority: FeaturePriority.MEDIUM,
};

export default function FeatureMutationModal({
  isOpen,
  onClose,
  isUpdate = false,
  updateData,
  setIsActionsOpen,
  epicId,
}: IFeatureMutationModal) {
  const {
    isOpen: isConfirmationModalOpen,
    onClose: closeConfirmationModal,
    onOpen: openConfirmationModal,
  } = useDisclosure();
  const toast = useToast();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const { mutate: createFeature, isPending: isCreatingFeature } =
    useCreateFeatureMutation();
  const { mutate: updateFeature, isPending: isUpdatingFeature } =
    useUpdateFeatureMutation();

  const initialValues = useMemo(() => {
    if (isUpdate && updateData) {
      return {
        name: updateData?.name,
        description: updateData?.description,
        status: updateData?.status,
        priority: updateData.priority,
      };
    }
    return defaultInitialValues;
  }, [isUpdate, updateData]);

  const {
    values,
    handleSubmit,
    errors,
    touched,
    handleChange,
    resetForm,
    handleBlur,
  } = useFormik({
    initialValues,
    enableReinitialize: true,
    validateOnMount: false,
    validationSchema,
    onSubmit: () => {
      onClose();
      openConfirmationModal();
    },
  });

  const handleModalClose = () => {
    resetForm();
    onClose();
  };

  const confirmRequest = () => {
    if (isUpdate) {
      if (!updateData) return;

      updateFeature(
        {
          name: values?.name,
          description: values?.description,
          status: values?.status,
          priority: values?.priority,
          featureId: updateData?.featureId,
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: [SPECIFICATIONS_QUERIES_PREFIX, GET_EPICS],
              exact: false,
            });

            toast({
              title: "Feature mise à jour",
              description: "La feature a été mise à jour avec succès",
              status: "success",
              duration: 3000,
            });

            closeConfirmationModal();
            setIsActionsOpen && setIsActionsOpen(false);
            resetForm();
          },
          onError: (error) => {
            toast({
              title: "Mise à jour impossible",
              description:
                error?.message || "Erreur lors de la mise à jour de la feature",
              status: "error",
              duration: 4000,
            });
          },
        }
      );
    } else {
      if (!epicId) return;

      createFeature(
        {
          ...values,
          epicId: epicId,
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: [SPECIFICATIONS_QUERIES_PREFIX, GET_EPICS],
              exact: false,
            });

            toast({
              title: "Feature créée",
              description: "La nouvelle feature a été ajoutée avec succès",
              status: "success",
              duration: 3000,
            });

            closeConfirmationModal();
            resetForm();
          },
          onError: (error) => {
            toast({
              title: "Création impossible",
              description:
                error?.message || "Erreur lors de la création de la feature",
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
      >
        <AlertDialogOverlay zIndex={9999}>
          <AlertDialogContent width="650px" maxWidth="1000px">
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {isUpdate
                ? "Mettre à jour la feature"
                : "Créer une nouvelle feature"}
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
                    placeholder="Entrer le titre de la feature..."
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
                            featureStatusToLabelMapper[
                              values.status as FeatureStatus
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
                      {Object.values(FeatureStatus).map((status) => (
                        <MenuItem
                          key={status}
                          fontSize="13px"
                          onClick={() => {
                            handleChange({
                              target: { name: "status", value: status },
                            });
                          }}
                        >
                          {featureStatusToLabelMapper[status]}
                        </MenuItem>
                      ))}
                    </MenuList>
                  </Menu>
                  <FormErrorMessage fontSize="12px">
                    {errors?.status}
                  </FormErrorMessage>
                </FormControl>

                <FormControl
                  isRequired
                  isInvalid={!!(touched?.priority && errors?.priority)}
                >
                  <FormLabel fontSize="13px">Priorité</FormLabel>
                  <Menu>
                    <MenuButton width="100%">
                      <Box position="relative">
                        <Input
                          fontSize="13px"
                          name="priority"
                          readOnly
                          cursor="pointer"
                          value={
                            featurePriorityToLabelMapper[
                              values.priority as FeaturePriority
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
                      {Object.values(FeaturePriority).map((priority) => (
                        <MenuItem
                          key={priority}
                          fontSize="13px"
                          onClick={() => {
                            handleChange({
                              target: { name: "priority", value: priority },
                            });
                          }}
                        >
                          {featurePriorityToLabelMapper[priority]}
                        </MenuItem>
                      ))}
                    </MenuList>
                  </Menu>
                  <FormErrorMessage fontSize="12px">
                    {errors?.priority}
                  </FormErrorMessage>
                </FormControl>

                <FormControl
                  gridColumn="1/3"
                  isInvalid={!!(touched?.description && errors?.description)}
                >
                  <FormLabel fontSize="13px">Description</FormLabel>
                  <Textarea
                    placeholder="Entrer la description de la feature..."
                    fontSize="13px"
                    value={values?.description}
                    name="description"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    resize="none"
                  />
                  <FormErrorMessage fontSize="12px">
                    {errors?.description}
                  </FormErrorMessage>
                </FormControl>
              </Grid>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                ref={cancelRef}
                fontSize="13px"
                bg="gray.100"
                color="gray.600"
                onClick={handleModalClose}
                _hover={{
                  backgroundColor: "gray.200",
                }}
              >
                Annuler
              </Button>
              <Button
                fontSize="13px"
                bg="blue.500"
                color="white"
                _hover={{
                  backgroundColor: "blue.600",
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
                ml={3}
              >
                {isUpdate ? "Mettre à jour la feature" : "Créer la feature"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      <ConfirmationModal
        isLoading={isUpdate ? isUpdatingFeature : isCreatingFeature}
        onClose={closeConfirmationModal}
        isOpen={isConfirmationModalOpen}
        title="Confirmation"
        ConfirmationLabel={
          isUpdate ? "Confirmer la mise à jour" : "Confirmer la création"
        }
        description={`Êtes-vous sûr de vouloir ${
          isUpdate ? "mettre à jour" : "créer"
        } la feature '${values?.name}'?`}
        onConfirm={confirmRequest}
      />
    </>
  );
}
