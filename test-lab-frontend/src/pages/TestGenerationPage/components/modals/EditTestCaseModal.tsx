import { queryClient } from "@/App";
import {
  selectedTestCaseSelector,
  setSelectedTestCase,
} from "@/app/slices/testGenerationSlice";
import {
  GET_TEST_CASE,
  GET_TEST_SUITES,
  TEST_GENERATION_QUERIES_PREFIX,
  useUpdateTestCaseMutation,
} from "@/services";
import { colors } from "@/theme/colors";
import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { useFormik } from "formik";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import * as yup from "yup";

const validationSchema = yup.object({
  name: yup.string().required("Le nom est requis"),
  summary: yup.string().required("Le résumé est requis"),
});

interface IEditTestCaseModal {
  isEditModalOpen: boolean;
  closeEditModal: () => void;
}

export default function EditTestCaseModal({
  isEditModalOpen,
  closeEditModal,
}: IEditTestCaseModal) {
  const selectedTestCase = useSelector(selectedTestCaseSelector);
  const dispatch = useDispatch();
  const toast = useToast();
  const formik = useFormik({
    initialValues: {
      name: selectedTestCase?.name || "",
      summary: selectedTestCase?.summary || "",
    },
    validationSchema,
    onSubmit: (values) => {
      handleUpdate(values);
    },
  });

  const { mutate: updateTestCase, isPending: isUpdatingTestCase } =
    useUpdateTestCaseMutation();

  useEffect(() => {
    if (selectedTestCase) {
      formik.setValues({
        name: selectedTestCase?.name,
        summary: selectedTestCase?.summary || "",
      });
    }
  }, [selectedTestCase?.id]);

  const handleCloseEditModal = () => {
    formik.resetForm();
    closeEditModal();
  };

  const handleUpdate = (values: { name: string; summary: string }) => {
    if (!selectedTestCase) return;

    updateTestCase(
      {
        id: selectedTestCase?.id,
        name: values?.name,
        summary: values?.summary,
      },
      {
        onSuccess: async (data) => {
          await queryClient.invalidateQueries({
            queryKey: [TEST_GENERATION_QUERIES_PREFIX, GET_TEST_SUITES],
          });

          await queryClient.invalidateQueries({
            queryKey: [TEST_GENERATION_QUERIES_PREFIX, GET_TEST_CASE],
            exact: false,
          });

          dispatch(setSelectedTestCase({ testCase: data }));

          console.log("DATA", data);

          toast({
            title: "Cas de test modifié",
            description: "Le cas de test a été modifié avec succès",
            status: "success",
            duration: 3000,
          });
          closeEditModal();
        },
        onError: (error: any) => {
          toast({
            title: "Erreur de modification",
            description:
              error?.response?.data?.error ||
              error?.message ||
              "Erreur lors de la modification du cas de test",
            status: "error",
            duration: 4000,
          });
        },
      }
    );
  };

  return (
    <>
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        size="lg"
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontSize="16px" fontWeight="600">
            Modifier le cas de test
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing="1rem">
              <FormControl
                isRequired
                isInvalid={formik.touched.name && !!formik.errors.name}
              >
                <FormLabel fontSize="14px" fontWeight="500">
                  Nom
                </FormLabel>
                <Input
                  name="name"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="Nom du cas de test"
                  fontSize="13px"
                />
                {formik.touched.name && formik.errors.name && (
                  <FormErrorMessage fontSize="12px">
                    {formik.errors.name}
                  </FormErrorMessage>
                )}
              </FormControl>

              <FormControl
                isRequired
                isInvalid={formik.touched.summary && !!formik.errors.summary}
              >
                <FormLabel fontSize="14px" fontWeight="500">
                  Résumé
                </FormLabel>
                <Input
                  name="summary"
                  value={formik.values.summary}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="Décrivez le résumé du cas de test"
                  fontSize="13px"
                />
                {formik.touched.summary && formik.errors.summary && (
                  <FormErrorMessage fontSize="12px">
                    {formik.errors.summary}
                  </FormErrorMessage>
                )}
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter gap=".5rem">
            <Button
              variant="ghost"
              onClick={handleCloseEditModal}
              fontSize="13px"
              isDisabled={isUpdatingTestCase}
            >
              Annuler
            </Button>
            <Button
              bg={colors.blue}
              color="white"
              fontSize="13px"
              isLoading={isUpdatingTestCase}
              onClick={() => {
                formik.handleSubmit();
              }}
              _hover={{ bg: "blue.600" }}
            >
              Mettre à jour le cas de test
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
