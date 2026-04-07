import { ConfirmationModal, Dropdown, FilePicker } from "@/components";
import {
  GET_PAGINATED_PROJECTS,
  GET_PROJECTS,
  IUpdateProjectPayload,
  PROJECT_QUERIES_PREFIX,
  ProjectStatus,
  useCreateProjectMutation,
  useUpdateProjectMutation,
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
} from "@chakra-ui/react";
import { useFormik } from "formik";
import { SetStateAction, useMemo, useRef } from "react";
import { validationSchema } from "../../extra/validationSchema";
import { queryClient } from "@/App";
import { projectStatusToLabelMapper } from "../Project";

interface IModalBase {
  closeProjectModal: () => void;
  isProjectModalOpen: boolean;
  setIsActionsOpen?: React.Dispatch<SetStateAction<boolean>>;
}

interface IProjectCreationModal extends IModalBase {
  isUpdateModal?: false;
  updateData?: never;
}

interface IProjectUpdateModal extends IModalBase {
  isUpdateModal: true;
  updateData: IUpdateProjectPayload;
}

type IProjectMutationModal = IProjectCreationModal | IProjectUpdateModal;

const defaultInitialValues = {
  name: "",
  prefix: "",
  description: "",
  figmaLink: "",
  status: ProjectStatus.ACTIVE,
  attachment: null,
};

export default function ProjectMutationModal({
  closeProjectModal,
  isProjectModalOpen,
  isUpdateModal = false,
  setIsActionsOpen,
  updateData,
}: IProjectMutationModal) {
  const {
    isOpen: isConfirmationModalOpen,
    onClose: closeConfirmationModal,
    onOpen: openConfirmationModal,
  } = useDisclosure();
  const projectCreationCancelRef = useRef<HTMLButtonElement>(null);
  const { mutate: createProject, isPending: isCreatingProject } =
    useCreateProjectMutation();
  const { mutate: updateProject, isPending: isUpdatingProject } =
    useUpdateProjectMutation();
  const toast = useToast();

  const initialValues = useMemo(() => {
    if (isUpdateModal && updateData) {
      return {
        name: updateData?.name,
        description: updateData?.description,
        prefix: updateData?.prefix,
        figmaLink: updateData?.figmaLink,
        status: updateData?.status,
        attachment: null,
      };
    }
    return defaultInitialValues;
  }, [isUpdateModal, updateData]);

  const {
    values,
    handleSubmit,
    errors,
    touched,
    handleChange,
    resetForm,
    setFieldValue,
  } = useFormik({
    initialValues,
    enableReinitialize: true,
    validateOnMount: false,
    validationSchema,
    onSubmit: () => {
      if (isUpdateModal) {
        closeProjectModal();
        openConfirmationModal();
      } else {
        confirmRequest();
      }
    },
  });

  const confirmRequest = () => {
    if (isUpdateModal) {
      if (!updateData) return;

      updateProject(
        {
          id: updateData?.id,
          name: values.name?.trim(),
          description: values.description?.trim(),
          prefix: values.prefix?.trim(),
          status: values?.status,
          figmaLink: values?.figmaLink,
          attachment: values?.attachment,
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: [PROJECT_QUERIES_PREFIX, GET_PAGINATED_PROJECTS],
            });

            queryClient.invalidateQueries({
              queryKey: [PROJECT_QUERIES_PREFIX, GET_PROJECTS],
            });

            toast({
              title: "Projet mis à jour",
              description: "Le projet a été mis à jour avec succès",
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
                error?.message || "Erreur lors de la mise à jour du projet",
              status: "error",
              duration: 4000,
            });
          },
        }
      );
    } else {
      createProject(
        {
          name: values?.name,
          description: values?.description,
          attachment: values?.attachment,
          prefix: values?.prefix,
          status: values?.status,
          figmaLink: values?.figmaLink,
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: [PROJECT_QUERIES_PREFIX, GET_PAGINATED_PROJECTS],
            });

            queryClient.invalidateQueries({
              queryKey: [PROJECT_QUERIES_PREFIX, GET_PROJECTS],
            });

            toast({
              title: "Projet créé",
              description: "Le nouveau projet a été ajouté avec succès",
              status: "success",
              duration: 3000,
            });

            closeProjectModal();
            resetForm();
          },
          onError: (error) => {
            toast({
              title: "Création impossible",
              description:
                error?.message || "Erreur lors de la création du projet",
              status: "error",
              duration: 4000,
            });
          },
        }
      );
    }
  };

  const handleModalClose = () => {
    resetForm();
    closeProjectModal();
  };

  return (
    <>
      <AlertDialog
        leastDestructiveRef={projectCreationCancelRef}
        isOpen={isProjectModalOpen}
        onClose={handleModalClose}
        autoFocus={false}
      >
        <AlertDialogOverlay zIndex={9999}>
          <AlertDialogContent maxWidth="1000px" width="650px">
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {isUpdateModal
                ? "Mettre à jour le projet"
                : "Créer un nouveau projet"}
            </AlertDialogHeader>
            <AlertDialogBody>
              <Grid gap=".5rem">
                <Grid gap=".75rem" gridTemplateColumns="repeat(2, 1fr)">
                  <FormControl
                    isRequired
                    isInvalid={!!(touched.name && errors?.name)}
                  >
                    <FormLabel fontSize="13px">Nom du projet</FormLabel>
                    <Input
                      placeholder="Entrer le nom du projet..."
                      fontSize="13px"
                      value={values?.name}
                      name="name"
                      onChange={handleChange}
                    />
                    <FormErrorMessage fontSize="12px">
                      {errors?.name}
                    </FormErrorMessage>
                  </FormControl>
                  <FormControl
                    isRequired
                    isInvalid={!!(touched?.description && errors?.description)}
                  >
                    <FormLabel fontSize="13px">Description du projet</FormLabel>
                    <Input
                      placeholder="Entrer la description du projet..."
                      fontSize="13px"
                      value={values?.description}
                      name="description"
                      onChange={handleChange}
                    />
                    <FormErrorMessage fontSize="12px">
                      {errors?.description}
                    </FormErrorMessage>
                  </FormControl>
                </Grid>

                <Grid gap=".75rem" gridTemplateColumns="repeat(2, 1fr)">
                  <FormControl
                    isRequired
                    isInvalid={!!(touched.prefix && errors?.prefix)}
                  >
                    <FormLabel fontSize="13px">Préfix du projet</FormLabel>
                    <Input
                      placeholder="Entrer le préfix du projet..."
                      fontSize="13px"
                      value={values?.prefix}
                      name="prefix"
                      onChange={handleChange}
                    />
                    <FormErrorMessage fontSize="12px">
                      {errors?.prefix}
                    </FormErrorMessage>
                  </FormControl>
                  <FormControl
                    isInvalid={!!(touched?.figmaLink && errors?.figmaLink)}
                  >
                    <FormLabel fontSize="13px">Lien figma</FormLabel>
                    <Input
                      placeholder="Entrer le lien figma..."
                      fontSize="13px"
                      value={values?.figmaLink}
                      name="figmaLink"
                      onChange={handleChange}
                    />
                    <FormErrorMessage fontSize="12px">
                      {errors?.figmaLink}
                    </FormErrorMessage>
                  </FormControl>
                </Grid>

                <Grid gap=".75rem" gridTemplateColumns="repeat(2, 1fr)">
                  <Dropdown
                    label="Statut du projet"
                    name="status"
                    value={values?.status}
                    options={projectStatusToLabelMapper}
                    onChange={(name, value) => setFieldValue(name, value)}
                    isRequired
                    isInvalid={!!(touched?.status && errors?.status)}
                    error={errors?.status}
                    touched={touched?.status}
                  />


                </Grid>

                <FilePicker
                  isInvalid={!!(touched?.attachment && errors?.attachment)}
                  errorMessage={errors?.attachment}
                  label="Pièce jointe"
                  value={values.attachment}
                  onChange={(file) => {
                    setFieldValue("attachment", file);
                  }}
                />
              </Grid>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button variant="gray" onClick={handleModalClose}>
                Annuler
              </Button>
              <Button
                isLoading={isCreatingProject}
                variant="basic"
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
                ml={3}
              >
                {isUpdateModal ? "Mettre à jour le projet" : "Créer le projet"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      <ConfirmationModal
        isLoading={isUpdateModal ? isUpdatingProject : isCreatingProject}
        onClose={closeConfirmationModal}
        isOpen={isConfirmationModalOpen}
        title="Confirmation"
        ConfirmationLabel={
          isUpdateModal ? "Confirmer l'opération" : "Confirmer la création"
        }
        description={`Êtes-vous sûr de vouloir ${
          isUpdateModal ? "mettre à jour" : "créer"
        } le projet '${values?.name}'?`}
        onConfirm={confirmRequest}
      />
    </>
  );
}
