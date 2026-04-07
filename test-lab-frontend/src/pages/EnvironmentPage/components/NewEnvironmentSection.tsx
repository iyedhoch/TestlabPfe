import { colors } from "@/theme/colors";
import {
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Icon,
  Input,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { useFormik } from "formik";
import * as Yup from "yup";
import Arrow from "@/assets/svg/arrow.svg?react";
import Plus from "@/assets/svg/plus.svg?react";
import { useSelector } from "react-redux";
import { selectedProjectSelector } from "@/app/slices/projectSlice";
import {
  ENVIRONMENT_QUERIES_PREFIX,
  GET_PAGINATED_ENVIRONMENTS,
  useCreateEnvironmentMutation,
} from "@/services";
import { queryClient } from "@/App";

interface INewEnvironmentSection {
  onCancel: () => void;
}

const validationSchema = Yup.object().shape({
  name: Yup.string().required("Le nom est requis"),
  url: Yup.string().required("L'URL est requis"),
  description: Yup.string(),
  envItems: Yup.array().of(
    Yup.object().shape({
      key: Yup.string().required("La clé est requise"),
      value: Yup.string().required("La valeur est requise"),
    })
  ),
});

export default function NewEnvironmentSection({
  onCancel,
}: INewEnvironmentSection) {
  const toast = useToast();
  const selectedProject = useSelector(selectedProjectSelector);
  const { mutate: createEnvironment, isPending: isCreatingEnvironment } =
    useCreateEnvironmentMutation();

  const {
    values,
    touched,
    errors,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
  } = useFormik({
    initialValues: {
      name: "",
      url: "",
      description: "",
      envItems: [{ key: "", value: "" }],
    },
    validationSchema,
    onSubmit: (values) => {
      if (!selectedProject?.id) {
        toast({
          title: "Erreur",
          description: "Aucun projet sélectionné",
          status: "error",
          duration: 4000,
        });
        return;
      }

      const payload = {
        name: values.name,
        url: values.url,
        description: values.description,
        projectId: selectedProject.id,
        status: "Projet",
        envItems: values.envItems.filter((item) => item.key && item.value),
      };

      createEnvironment(payload, {
        onSuccess: () => {
          toast({
            title: "Environnement créé",
            description: "L'environnement a été créé avec succès",
            status: "success",
            duration: 3000,
          });

          queryClient.invalidateQueries({
            queryKey: [ENVIRONMENT_QUERIES_PREFIX, GET_PAGINATED_ENVIRONMENTS],
            exact: false,
          });

          onCancel();
        },
        onError: (error: any) => {
          toast({
            title: "Erreur",
            description:
              error?.message ||
              "Une erreur s'est produite lors de la création de l'environnement",
            status: "error",
            duration: 4000,
          });
        },
      });
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

  return (
    <Flex
      border="1px solid"
      borderColor={colors.border}
      bg="white"
      borderRadius=".75rem"
      padding="1rem"
      marginBottom="1rem"
      flexDirection="column"
    >
      {/* Header */}
      <Flex alignItems="center" gap=".5rem" marginBottom="2rem">
        <Flex
          width="2rem"
          height="2rem"
          bg="gray.100"
          borderRadius=".5rem"
          justifyContent="center"
          alignItems="center"
          cursor="pointer"
          transition=".3s"
          onClick={onCancel}
        >
          <Icon
            color="gray.600"
            width="1.25rem"
            height="1.25rem"
            style={{ transform: "rotate(90deg)" }}
            as={Arrow}
          />
        </Flex>
        <Text fontWeight="500">Créer un Nouvel Environnement</Text>
      </Flex>

      <Flex flexDirection="column" gap="1.5rem">
        {/* Details de l'Environnement Section */}
        <Flex flexDirection="column" gap="1rem">
          <Text fontSize="15px" fontWeight="600">
            Détails de l'Environnement
          </Text>

          <FormControl isRequired isInvalid={!!(touched?.name && errors?.name)}>
            <FormLabel fontSize="13px">Nom</FormLabel>
            <Input
              placeholder="Saisir le nom de l'Environnement"
              fontSize="13px"
              value={values?.name}
              name="name"
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <FormErrorMessage fontSize="12px">{errors?.name}</FormErrorMessage>
          </FormControl>

          <FormControl isRequired isInvalid={!!(touched?.url && errors?.url)}>
            <FormLabel fontSize="13px">URL</FormLabel>
            <Input
              placeholder="Saisir l'URL de l'Environnement"
              fontSize="13px"
              value={values?.url}
              name="url"
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <FormErrorMessage fontSize="12px">{errors?.url}</FormErrorMessage>
          </FormControl>

          <FormControl
            isInvalid={!!(touched?.description && errors?.description)}
          >
            <FormLabel fontSize="13px">Description</FormLabel>
            <Textarea
              placeholder="Saisir la description de l'Environnement"
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
        </Flex>

        {/* Identifiants de l'Environnement Section */}
        <Flex flexDirection="column" gap="1rem">
          <Flex flexDirection="column" gap=".5rem">
            <Text fontSize="15px" fontWeight="600">
              Identifiants de l'Environnement
            </Text>
            <Text fontSize="12px" color="gray.500">
              Définissez des valeurs sensibles en tant qu'identifiants
              d'Environnement et référencez-les dans vos tests en utilisant{" "}
              <Text as="span" color={colors.blue} fontWeight="500">
                {"{CREDENTIAL_KEY}"}
              </Text>{" "}
              pour insérer la valeur que vous avez enregistrée de manière
              sécurisée.
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
                  isInvalid={!!(envItemTouched?.key && envItemErrors?.key)}
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
                  isInvalid={!!(envItemTouched?.value && envItemErrors?.value)}
                >
                  <FormLabel fontSize="13px">Valeur {index + 1}</FormLabel>
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

        {/* Footer Buttons */}
        <Flex justifyContent="center" gap=".75rem" marginTop="1rem">
          <Button variant="gray" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            variant="basic"
            onClick={() => handleSubmit()}
            isLoading={isCreatingEnvironment}
          >
            Créer l'environnement
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
}
