import { colors } from "@/theme/colors";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Icon,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import Arrow from "@/assets/svg/arrow.svg?react";
import { useFormik } from "formik";
import Preconditions from "@/assets/svg/preconditions.svg?react";
import Steps from "@/assets/svg/steps.svg?react";
import Plus from "@/assets/svg/plus.svg?react";
import { generateDynamicValidationSchema } from "../../extra/validationSchema";
import {
  GET_TEST_SUITES,
  ICreateTestCasePayload,
  TEST_GENERATION_QUERIES_PREFIX,
  useCreateTestCaseMutation,
  useGetTestSuitesByProjectIdQuery,
} from "@/services";
import { useSelector } from "react-redux";
import { selectedProjectSelector } from "@/app/slices/projectSlice";
import { queryClient } from "@/App";
import { selectedTestSuiteSelector } from "@/app/slices/testGenerationSlice";
import { useMemo } from "react";

interface INewTestCaseModal {
  isOpen: boolean;
  onClose: () => void;
  isManualCaseFlow: boolean;
}

export default function NewTestCaseModal({
  isOpen,
  onClose,
  isManualCaseFlow,
}: INewTestCaseModal) {
  const toast = useToast();
  const selectedProject = useSelector(selectedProjectSelector);
  const selectedTestSuite = useSelector(selectedTestSuiteSelector);
  const { data: testSuites } = useGetTestSuitesByProjectIdQuery({
    projectId: selectedProject?.id as string,
  });
  const { mutate: createTestCase, isPending: isCreatingTestCase } =
    useCreateTestCaseMutation();

  const initialValues = useMemo(() => {
    return {
      summary: "",
      name: "",
      testSuiteId: isManualCaseFlow ? "" : (selectedTestSuite?.id as string),
      preconditions: [{ content: "" }],
      testSteps: [{ action: "", expectedResult: "" }],
    };
  }, [isManualCaseFlow, selectedTestSuite?.id]);

  const dynamicValidationSchema = useMemo(() => {
    return generateDynamicValidationSchema(isManualCaseFlow);
  }, [isManualCaseFlow]);

  const {
    values,
    touched,
    errors,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    resetForm,
  } = useFormik({
    initialValues,
    validationSchema: dynamicValidationSchema,
    onSubmit: (values) => {
      const payload: ICreateTestCasePayload = {
        ...values,
        ...(selectedTestSuite && { testSuiteId: selectedTestSuite?.id }),
        preconditions: values.preconditions.map((pc, index) => ({
          content: pc.content,
          order: index + 1,
        })),
        testSteps: values.testSteps.map((step, index) => ({
          action: step.action,
          expectedResult: step.expectedResult,
          order: index + 1,
        })),
      };

      createTestCase(payload, {
        onSuccess: () => {
          toast({
            title: "Cas de test créé",
            description: "Le cas de test a été créé avec succès",
            status: "success",
            duration: 3000,
          });

          queryClient.invalidateQueries({
            queryKey: [TEST_GENERATION_QUERIES_PREFIX, GET_TEST_SUITES],
          });

          resetForm();
          onClose();
        },
        onError: (error) => {
          toast({
            title: "Erreur",
            description:
              error?.message ||
              "Une erreur s'est produite lors de la création du cas de test",
            status: "error",
            duration: 4000,
          });
        },
      });
    },
  });

  const addPrecondition = () => {
    setFieldValue("preconditions", [...values.preconditions, { content: "" }]);
  };

  const removePrecondition = (index: number) => {
    const newPreconditions = values.preconditions.filter((_, i) => i !== index);
    setFieldValue("preconditions", newPreconditions);
  };

  const updatePrecondition = (index: number, value: string) => {
    const newPreconditions = [...values.preconditions];
    newPreconditions[index] = { content: value };
    setFieldValue("preconditions", newPreconditions);
    setFieldValue(`preconditions[${index}].content`, value, true);
  };

  const addTestStep = () => {
    setFieldValue("testSteps", [
      ...values.testSteps,
      { action: "", expectedResult: "" },
    ]);
  };

  const removeTestStep = (index: number) => {
    const newTestSteps = values.testSteps.filter((_, i) => i !== index);
    setFieldValue("testSteps", newTestSteps);
  };

  const updateTestStep = (
    index: number,
    field: "action" | "expectedResult",
    value: string
  ) => {
    const newTestSteps = [...values.testSteps];
    newTestSteps[index][field] = value;
    setFieldValue("testSteps", newTestSteps);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="3xl" isCentered>
      <ModalOverlay />
      <ModalContent maxH="90vh" maxW={{ base: "95vw", "2xl": "95vw" }}>
        <ModalHeader>Nouveau cas de test</ModalHeader>
        <ModalCloseButton />
        <ModalBody overflowY="auto">
          <Flex flexDirection="column" gap="1rem">
            <FormControl
              isRequired
              isInvalid={!!(touched?.name && errors?.name)}
            >
              <FormLabel fontSize="13px">Titre</FormLabel>
              <Input
                placeholder="Entrer le titre du cas de test..."
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

            {isManualCaseFlow && (
              <FormControl
                isRequired
                isInvalid={!!(touched?.testSuiteId && errors?.testSuiteId)}
              >
                <FormLabel fontSize="13px">Suite de test associé</FormLabel>
                <Menu>
                  <MenuButton width="100%">
                    <Box position="relative">
                      <Input
                        fontSize="13px"
                        name="priority"
                        placeholder="Sélectionner la suite de test associée"
                        readOnly
                        borderWidth={errors?.testSuiteId ? "2px" : undefined}
                        cursor="pointer"
                        value={
                          testSuites?.find(
                            (suite) => suite?.id === values?.testSuiteId
                          )?.name
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
                    {testSuites?.map((suite) => (
                      <MenuItem
                        key={suite?.id}
                        fontSize="13px"
                        onClick={() => {
                          setFieldValue("testSuiteId", suite?.id);
                        }}
                      >
                        {suite?.name}
                      </MenuItem>
                    ))}
                  </MenuList>
                </Menu>
                <FormErrorMessage fontSize="12px">
                  {errors?.testSuiteId}
                </FormErrorMessage>
              </FormControl>
            )}

            <FormControl isInvalid={!!(touched?.summary && errors?.summary)}>
              <FormLabel fontSize="13px">Résumé</FormLabel>
              <Textarea
                placeholder="Entrer le résumé du cas de test..."
                fontSize="13px"
                value={values?.summary}
                name="summary"
                onChange={handleChange}
                onBlur={handleBlur}
                rows={4}
                resize="none"
              />
              <FormErrorMessage fontSize="12px">
                {errors?.summary}
              </FormErrorMessage>
            </FormControl>

            {/* PRECONDITIONS SECTION */}
            <Flex flexDirection="column" gap=".75rem">
              <Flex gap=".5rem" alignItems="center">
                <Preconditions />
                <Text fontWeight="500">Préconditions</Text>
              </Flex>

              {values.preconditions.map((precondition, index) => {
                const preconditionErrors = errors?.preconditions?.[index] as
                  | { content?: string }
                  | undefined;
                const preconditionTouched = touched?.preconditions?.[index] as
                  | { content?: boolean }
                  | undefined;

                return (
                  <Flex key={index} gap=".5rem" alignItems="flex-start">
                    <FormControl
                      flex="1"
                      isInvalid={
                        !!(
                          preconditionTouched?.content &&
                          preconditionErrors?.content
                        )
                      }
                    >
                      <FormLabel fontSize="13px">
                        Précondition {index + 1}
                      </FormLabel>
                      <Input
                        fontSize="13px"
                        placeholder="Décrire la précondition..."
                        value={precondition.content}
                        onChange={(e) =>
                          updatePrecondition(index, e.target.value)
                        }
                      />
                      <FormErrorMessage fontSize="12px">
                        {preconditionErrors?.content}
                      </FormErrorMessage>
                    </FormControl>
                    {index === values.preconditions.length - 1 && (
                      <Flex
                        width="2.25rem"
                        height="2.25rem"
                        bg={colors.blue}
                        borderRadius=".5rem"
                        justifyContent="center"
                        alignItems="center"
                        cursor="pointer"
                        transition=".3s"
                        onClick={addPrecondition}
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
                    {index !== values.preconditions.length - 1 &&
                      values.preconditions.length > 1 && (
                        <Flex
                          width="2.25rem"
                          height="2.25rem"
                          bg={colors.blue}
                          borderRadius=".5rem"
                          justifyContent="center"
                          alignItems="center"
                          cursor="pointer"
                          transition=".3s"
                          onClick={() => removePrecondition(index)}
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

            {/* TEST STEPS SECTION */}
            <Flex flexDirection="column" gap=".75rem">
              <Flex gap=".5rem" alignItems="center">
                <Steps />
                <Text fontWeight="500">Étapes de test</Text>
              </Flex>

              {values.testSteps.map((step, index) => {
                const testStepErrors = errors?.testSteps?.[index] as
                  | { action?: string; expectedResult?: string }
                  | undefined;
                const testStepTouched = touched?.testSteps?.[index] as
                  | { action?: boolean; expectedResult?: boolean }
                  | undefined;

                return (
                  <Flex key={index} gap=".75rem" alignItems="flex-start">
                    <FormControl
                      flex="1"
                      isInvalid={
                        !!(testStepTouched?.action && testStepErrors?.action)
                      }
                    >
                      <FormLabel fontSize="13px">Action {index + 1}</FormLabel>
                      <Input
                        fontSize="13px"
                        placeholder="Décrire l'action..."
                        value={step.action}
                        onChange={(e) =>
                          updateTestStep(index, "action", e.target.value)
                        }
                        onBlur={handleBlur}
                      />
                      <FormErrorMessage fontSize="12px">
                        {testStepErrors?.action}
                      </FormErrorMessage>
                    </FormControl>

                    <FormControl
                      flex="1"
                      isInvalid={
                        !!(
                          testStepTouched?.expectedResult &&
                          testStepErrors?.expectedResult
                        )
                      }
                    >
                      <FormLabel fontSize="13px">
                        Résultat attendu {index + 1}
                      </FormLabel>
                      <Input
                        fontSize="13px"
                        placeholder="Décrire le résultat attendu..."
                        value={step.expectedResult}
                        onChange={(e) =>
                          updateTestStep(
                            index,
                            "expectedResult",
                            e.target.value
                          )
                        }
                        onBlur={handleBlur}
                      />
                      <FormErrorMessage fontSize="12px">
                        {testStepErrors?.expectedResult}
                      </FormErrorMessage>
                    </FormControl>

                    {index === values.testSteps.length - 1 && (
                      <Flex
                        width="2.25rem"
                        height="2.25rem"
                        bg={colors.blue}
                        borderRadius=".5rem"
                        justifyContent="center"
                        alignItems="center"
                        cursor="pointer"
                        transition=".3s"
                        onClick={addTestStep}
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
                    {index !== values.testSteps.length - 1 &&
                      values.testSteps.length > 1 && (
                        <Flex
                          width="2.25rem"
                          height="2.25rem"
                          bg={colors.blue}
                          borderRadius=".5rem"
                          justifyContent="center"
                          alignItems="center"
                          cursor="pointer"
                          transition=".3s"
                          onClick={() => removeTestStep(index)}
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
        </ModalBody>

        <ModalFooter>
          <Flex gap=".75rem">
            <Button variant="gray" onClick={handleClose}>
              Annuler
            </Button>
            <Button
              variant="basic"
              onClick={() => handleSubmit()}
              isLoading={isCreatingTestCase}
            >
              Ajouter cas de test
            </Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
