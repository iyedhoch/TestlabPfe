import { ConfirmationModal } from "@/components";
import {
  GET_PAGINATED_ENVIRONMENTS,
  IUpdateEnvironmentPayload,
  ENVIRONMENT_QUERIES_PREFIX,
  useCreateEnvironmentMutation,
  useUpdateEnvironmentMutation,
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
  Text,
  Icon,
  Textarea,
} from "@chakra-ui/react";
import { useFormik } from "formik";
import { SetStateAction, useMemo, useRef } from "react";
import * as Yup from "yup";
import { queryClient } from "@/App";
import { colors } from "@/theme/colors";
import Plus from "@/assets/svg/plus.svg?react";
// import Copy from "@/assets/svg/copy.svg?react";
import { useSelector } from "react-redux";
import { selectedProjectSelector } from "@/app/slices/projectSlice";

interface IModalBase {
  closeEnvironmentModal: () => void;
  isEnvironmentModalOpen: boolean;
  setIsActionsOpen?: React.Dispatch<SetStateAction<boolean>>;
}

interface IEnvironmentCreationModal extends IModalBase {
  isUpdateModal?: false;
  updateData?: never;
}

interface IEnvironmentUpdateModal extends IModalBase {
  isUpdateModal: true;
  updateData: IUpdateEnvironmentPayload & {
    envItems?: Array<{
      id?: string;
      environmentKey?: string;
      key?: string;
      value: string;
    }>;
  };
}

type IEnvironmentMutationModal =
  | IEnvironmentCreationModal
  | IEnvironmentUpdateModal;

const validationSchema = Yup.object({
  name: Yup.string().required("Le nom est requis"),
  url: Yup.string().url("URL invalide").required("L'URL est requise"),
  description: Yup.string(),
  status: Yup.string(),
  envItems: Yup.array().of(
    Yup.object().shape({
      key: Yup.string().required("La clé est requise"),
      value: Yup.string().required("La valeur est requise"),
    })
  ),
});

const defaultInitialValues = {
  name: "",
  url: "",
  description: "",
  status: "Projet",
  envItems: [{ key: "", value: "" }],
};

export default function EnvironmentMutationModal({
  closeEnvironmentModal,
  isEnvironmentModalOpen,
  isUpdateModal = false,
  setIsActionsOpen,
  updateData,
}: IEnvironmentMutationModal) {
  const {
    isOpen: isConfirmationModalOpen,
    onClose: closeConfirmationModal,
    onOpen: openConfirmationModal,
  } = useDisclosure();
  const environmentCreationCancelRef = useRef<HTMLButtonElement>(null);
  const selectedProject = useSelector(selectedProjectSelector);
  const { mutate: createEnvironment, isPending: isCreatingEnvironment } =
    useCreateEnvironmentMutation();
  const { mutate: updateEnvironment, isPending: isUpdatingEnvironment } =
    useUpdateEnvironmentMutation();
  const toast = useToast();

  const initialValues = useMemo(() => {
    if (isUpdateModal && updateData) {
      return {
        name: updateData?.name || "",
        url: updateData?.url || "",
        description: updateData?.description || "",
        status: updateData?.status || "Projet",
        envItems:
          updateData?.envItems && updateData.envItems.length > 0
            ? updateData.envItems.map((item) => ({
                // Backend returns 'environmentKey', frontend uses 'key'
                key: (item as any).environmentKey || item.key || "",
                value: item.value || "",
              }))
            : [{ key: "", value: "" }],
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
    handleBlur,
    resetForm,
    setFieldValue,
  } = useFormik({
    initialValues,
    enableReinitialize: true,
    validateOnMount: false,
    validationSchema,
    onSubmit: () => {
      if (isUpdateModal) {
        closeEnvironmentModal();
        openConfirmationModal();
      } else {
        confirmRequest();
      }
    },
  });

  const addEnvItem = () => {
    setFieldValue("envItems", [...values.envItems, { key: "", value: "" }]);
  };

  const removeEnvItem = (index: number) => {
    const newEnvItems = values.envItems.filter((_, i) => i !== index);
    setFieldValue("envItems", newEnvItems);
  };

  const updateEnvItem = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const newEnvItems = [...values.envItems];
    newEnvItems[index][field] = value;
    setFieldValue("envItems", newEnvItems);
  };

  const confirmRequest = () => {
    if (isUpdateModal) {
      if (!updateData) return;

      updateEnvironment(
        {
          id: updateData?.id,
          name: values.name?.trim(),
          url: values.url?.trim(),
          description: values.description?.trim(),
          status: values?.status,
          envItems: values.envItems
            .filter((item) => item.key && item.value)
            .map((item) => ({
              key: item.key.trim(),
              value: item.value.trim(),
            })),
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: [
                ENVIRONMENT_QUERIES_PREFIX,
                GET_PAGINATED_ENVIRONMENTS,
              ],
            });

            toast({
              title: "Environnement mis à jour",
              description: "L'environnement a été mis à jour avec succès",
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
                error?.message ||
                "Erreur lors de la mise à jour de l'environnement",
              status: "error",
              duration: 4000,
            });
          },
        }
      );
    } else {
      if (!selectedProject?.id) {
        toast({
          title: "Erreur",
          description: "Aucun projet sélectionné",
          status: "error",
          duration: 4000,
        });
        return;
      }

      createEnvironment(
        {
          name: values?.name?.trim() as string,
          url: values?.url?.trim() as string,
          description: values?.description?.trim(),
          status: values?.status,
          projectId: selectedProject.id,
          envItems: values.envItems
            .filter((item) => item.key && item.value)
            .map((item) => ({
              key: item.key.trim(),
              value: item.value.trim(),
            })),
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: [
                ENVIRONMENT_QUERIES_PREFIX,
                GET_PAGINATED_ENVIRONMENTS,
              ],
            });

            toast({
              title: "Environnement créé",
              description: "Le nouvel environnement a été ajouté avec succès",
              status: "success",
              duration: 3000,
            });

            closeEnvironmentModal();
            resetForm();
          },
          onError: (error) => {
            toast({
              title: "Création impossible",
              description:
                error?.message ||
                "Erreur lors de la création de l'environnement",
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
    closeEnvironmentModal();
  };

  return (
    <>
      <AlertDialog
        leastDestructiveRef={environmentCreationCancelRef}
        isOpen={isEnvironmentModalOpen}
        onClose={handleModalClose}
        autoFocus={false}
        isCentered
      >
        <AlertDialogOverlay zIndex={9999}>
          <AlertDialogContent maxWidth="1000px" width="900px" maxH="90vh">
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {isUpdateModal
                ? "Mettre à jour l'environnement"
                : "Créer un nouvel environnement"}
            </AlertDialogHeader>
            <AlertDialogBody overflowY="auto">
              <Flex flexDirection="column" gap="1.5rem">
                {/* Environment Details */}
                <Flex flexDirection="column" gap="1rem">
                  <Text fontSize="15px" fontWeight="600">
                    Détails de l'Environnement
                  </Text>

                  <Grid gap="1rem">
                    <Grid gap=".75rem" gridTemplateColumns="repeat(2, 1fr)">
                      <FormControl
                        isRequired
                        isInvalid={!!(touched.name && errors?.name)}
                      >
                        <FormLabel fontSize="13px">Nom</FormLabel>
                        <Input
                          placeholder="Entrer le nom..."
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
                        isInvalid={!!(touched?.url && errors?.url)}
                      >
                        <FormLabel fontSize="13px">URL</FormLabel>
                        <Input
                          placeholder="Entrer l'URL..."
                          fontSize="13px"
                          value={values?.url}
                          name="url"
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                        <FormErrorMessage fontSize="12px">
                          {errors?.url}
                        </FormErrorMessage>
                      </FormControl>
                    </Grid>

                    <FormControl
                      isInvalid={!!(touched.description && errors?.description)}
                    >
                      <FormLabel fontSize="13px">Description</FormLabel>
                      <Textarea
                        placeholder="Entrer la description..."
                        fontSize="13px"
                        value={values?.description}
                        name="description"
                        onChange={handleChange}
                        onBlur={handleBlur}
                        rows={3}
                        resize="none"
                      />
                      <FormErrorMessage fontSize="12px">
                        {errors?.description}
                      </FormErrorMessage>
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="13px">Statut</FormLabel>
                      <Input
                        placeholder="Entrer le statut..."
                        fontSize="13px"
                        value={values?.status}
                        name="status"
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </FormControl>
                  </Grid>
                </Flex>

                {/* Environment Items */}
                <Flex flexDirection="column" gap="1rem">
                  <Flex flexDirection="column" gap=".5rem">
                    <Text fontSize="15px" fontWeight="600">
                      Identifiants de l'Environnement
                    </Text>
                    <Text fontSize="12px" color="gray.500">
                      Définissez des valeurs sensibles en tant qu'identifiants
                      d'Environnement et référencez-les dans vos tests en
                      utilisant{" "}
                      <Text as="span" color={colors.blue} fontWeight="500">
                        {"{CREDENTIAL_KEY}"}
                      </Text>{" "}
                      pour insérer la valeur que vous avez enregistrée de
                      manière sécurisée.
                    </Text>
                  </Flex>

                  {/* EnvItems List */}
                  {values.envItems.map((envItem, index) => {
                    const envItemErrors = errors?.envItems?.[index] as
                      | { key?: string; value?: string }
                      | undefined;
                    const envItemTouched = touched?.envItems?.[index] as
                      | { key?: boolean; value?: boolean }
                      | undefined;

                    return (
                      <Flex key={index} gap="1rem" alignItems="flex-start">
                        <FormControl
                          flex="1"
                          isInvalid={
                            !!(envItemTouched?.key && envItemErrors?.key)
                          }
                        >
                          <FormLabel fontSize="13px">Clé {index + 1}</FormLabel>
                          <Input
                            fontSize="13px"
                            placeholder="CREDENTIAL_NAME"
                            value={envItem.key}
                            onChange={(e) =>
                              updateEnvItem(index, "key", e.target.value)
                            }
                            onBlur={handleBlur}
                          />
                          <FormErrorMessage fontSize="12px">
                            {envItemErrors?.key}
                          </FormErrorMessage>
                        </FormControl>

                        <FormControl
                          flex="1"
                          isInvalid={
                            !!(envItemTouched?.value && envItemErrors?.value)
                          }
                        >
                          <FormLabel fontSize="13px">
                            Valeur {index + 1}
                          </FormLabel>
                          <Input
                            fontSize="13px"
                            placeholder="Valeur"
                            value={envItem.value}
                            onChange={(e) =>
                              updateEnvItem(index, "value", e.target.value)
                            }
                            onBlur={handleBlur}
                          />
                          <FormErrorMessage fontSize="12px">
                            {envItemErrors?.value}
                          </FormErrorMessage>
                        </FormControl>

                        {/* Action Buttons */}
                        {index === values.envItems.length - 1 && (
                          <Flex
                            width="2.25rem"
                            height="2.25rem"
                            bg={colors.blue}
                            borderRadius=".5rem"
                            justifyContent="center"
                            alignItems="center"
                            cursor="pointer"
                            transition=".3s"
                            onClick={addEnvItem}
                            _hover={{ bg: "blue.600" }}
                            marginTop="1.75rem"
                            flexShrink={0}
                          >
                            <Icon
                              color="white"
                              width="1.25rem"
                              height="1.25rem"
                              as={Plus}
                            />
                          </Flex>
                        )}
                        {index !== values.envItems.length - 1 &&
                          values.envItems.length > 1 && (
                            <Flex
                              width="2.25rem"
                              height="2.25rem"
                              bg={colors.blue}
                              borderRadius=".5rem"
                              justifyContent="center"
                              alignItems="center"
                              cursor="pointer"
                              transition=".3s"
                              onClick={() => removeEnvItem(index)}
                              _hover={{ bg: "blue.600" }}
                              marginTop="1.75rem"
                              flexShrink={0}
                            >
                              <Icon
                                color="white"
                                width="1.25rem"
                                height="1.25rem"
                                style={{ transform: "rotate(45deg)" }}
                                as={Plus}
                              />
                            </Flex>
                          )}
                      </Flex>
                    );
                  })}
                </Flex>
              </Flex>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button variant="gray" onClick={handleModalClose}>
                Annuler
              </Button>
              <Button
                isLoading={isCreatingEnvironment || isUpdatingEnvironment}
                variant="basic"
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
                ml={3}
              >
                {isUpdateModal
                  ? "Mettre à jour l'environnement"
                  : "Créer l'environnement"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      <ConfirmationModal
        isLoading={
          isUpdateModal ? isUpdatingEnvironment : isCreatingEnvironment
        }
        onClose={closeConfirmationModal}
        isOpen={isConfirmationModalOpen}
        title="Confirmation"
        ConfirmationLabel={
          isUpdateModal ? "Confirmer l'opération" : "Confirmer la création"
        }
        description={`Êtes-vous sûr de vouloir ${
          isUpdateModal ? "mettre à jour" : "créer"
        } l'environnement '${values?.name}'?`}
        onConfirm={confirmRequest}
      />
    </>
  );
}
