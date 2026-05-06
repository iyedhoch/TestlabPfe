import { ConfirmationModal, Dropdown } from "@/components";
import {
  EpicPriority,
  EpicStatus,
  GET_EPICS,
  IUpdateEpicPayload,
  SPECIFICATIONS_QUERIES_PREFIX,
  useCreateEpicMutation,
  useGetAllTagsQuery,
  useUpdateEpicMutation,
} from "@/services";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Grid,
  Icon,
  Input,
  Textarea,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useFormik } from "formik";
import { useMemo, useRef } from "react";
import { epicStatusToLabelMapper } from "../specifications/Epic";
import { epicValidationSchema as validationSchema } from "../../extra/validationSchema";
import { queryClient } from "@/App";
import { useSelector } from "react-redux";
import { selectedProjectSelector } from "@/app/slices/projectSlice";
import Plus from "@/assets/svg/plus.svg?react";

export const epicPriorityToLabelMapper: Record<EpicPriority, string> = {
  [EpicPriority.LOW]: "Basse",
  [EpicPriority.MEDIUM]: "Moyenne",
  [EpicPriority.HIGH]: "Haute",
  [EpicPriority.CRITICAL]: "Critique",
};

interface IEpicCreationModal {
  isOpen: boolean;
  onClose: () => void;
  isUpdate?: false;
  updateData?: never;
  setIsActionsOpen?: never;
}

interface IEpicUpdateModal {
  isOpen: boolean;
  onClose: () => void;
  isUpdate: true;
  updateData: IUpdateEpicPayload;
  setIsActionsOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

type IEpicMutationModal = IEpicCreationModal | IEpicUpdateModal;

const defaultInitialValues = {
  name: "",
  description: "",
  status: EpicStatus.NEW,
  priority: EpicPriority.MEDIUM,
  //tagId: "",
};

export default function EpicMutationModal({
  isOpen,
  onClose,
  isUpdate = false,
  updateData,
  setIsActionsOpen,
}: IEpicMutationModal) {
  const {
    isOpen: isConfirmationModalOpen,
    onClose: closeConfirmationModal,
    onOpen: openConfirmationModal,
  } = useDisclosure();
  const toast = useToast();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const selectedProject = useSelector(selectedProjectSelector);
  const { mutate: createEpic, isPending: isCreatingEpic } =
    useCreateEpicMutation();
  const { mutate: updateEpic, isPending: isUpdatingEpic } =
    useUpdateEpicMutation();
  const { data: tags } = useGetAllTagsQuery();

  const initialValues = useMemo(() => {
    if (isUpdate && updateData) {
      return {
        name: updateData?.name,
        description: updateData?.description,
        status: updateData?.status,
        priority: updateData?.priority,
        tagId: updateData?.tagId,
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
    setFieldValue,
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

      updateEpic(
        {
          name: values?.name,
          description: values?.description,
          status: values?.status,
          priority: values?.priority,
          epicId: updateData?.epicId,
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: [SPECIFICATIONS_QUERIES_PREFIX, GET_EPICS],
              exact: false,
            });

            toast({
              title: "Epic mis à jour",
              description: "L'epic a été mis à jour avec succès",
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
                error?.message || "Erreur lors de la mise à jour de l'epic",
              status: "error",
              duration: 4000,
            });
          },
        }
      );
    } else {
      if (!selectedProject) return;

      createEpic(
        {
          ...values,
          projectId: selectedProject?.id,
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: [SPECIFICATIONS_QUERIES_PREFIX, GET_EPICS],
              exact: false,
            });

            toast({
              title: "Epic créé",
              description: "Le nouvel epic a été ajouté avec succès",
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
                error?.message || "Erreur lors de la création de l'epic",
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
              {isUpdate ? "Mettre à jour l'epic" : "Créer un nouvel epic"}
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
                    placeholder="Entrer le titre de l'epic..."
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
                  options={epicStatusToLabelMapper}
                  onChange={(name, value) => setFieldValue(name, value)}
                  isRequired
                  isInvalid={!!errors.status}
                  error={errors.status}
                  touched={touched.status}
                />

                <Dropdown
                  label="Priorité"
                  name="priority"
                  value={values.priority}
                  options={epicPriorityToLabelMapper}
                  onChange={(name, value) => setFieldValue(name, value)}
                  isRequired
                  isInvalid={!!errors.priority}
                  error={errors.priority}
                  touched={touched.priority}
                />
{/*}}
                <Dropdown
                  label="Tag"
                  name="tagId"
                  value={values.tagId || ""}
                  options={
                    tags?.map((tag) => ({
                      value: tag.id,
                      label: tag.label,
                    })) || []
                  }
                  onChange={(name, value) => setFieldValue(name, value)}
                  isInvalid={!!errors.tagId}
                  error={errors.tagId}
                  touched={touched.tagId}
                  placeholder="Sélectionner un tag"
                />
*/}
                <FormControl
                  gridColumn="1/3"
                  isInvalid={!!(touched?.description && errors?.description)}
                >
                  <FormLabel fontSize="13px">Description</FormLabel>
                  <Textarea
                    placeholder="Entrer la description de l'epic..."
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
                {isUpdate ? "Mettre à jour l'epic" : "Créer l'epic"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      <ConfirmationModal
        isLoading={isUpdate ? isUpdatingEpic : isCreatingEpic}
        onClose={closeConfirmationModal}
        isOpen={isConfirmationModalOpen}
        title="Confirmation"
        ConfirmationLabel={
          isUpdate ? "Confirmer la mise à jour" : "Confirmer la création"
        }
        description={`Êtes-vous sûr de vouloir ${
          isUpdate ? "mettre à jour" : "créer"
        } l'epic '${values?.name}'?`}
        onConfirm={confirmRequest}
      />
    </>
  );
}
