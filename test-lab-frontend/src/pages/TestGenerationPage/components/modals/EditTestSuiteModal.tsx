import { queryClient } from "@/App";
import {
  selectedTestSuiteSelector,
  setSelectedTestSuite,
} from "@/app/slices/testGenerationSlice";
import {
  GET_TEST_SUITES,
  TEST_GENERATION_QUERIES_PREFIX,
  useUpdateTestSuiteMutation,
} from "@/services";
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
} from "@chakra-ui/react";
import { useFormik } from "formik";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import * as yup from "yup";

const validationSchema = yup.object({
  name: yup.string().required("Le nom est requis"),
});

interface IEditTestSuiteModal {
  isEditModalOpen: boolean;
  closeEditModal: () => void;
}

export default function EditTestSuiteModal({
  isEditModalOpen,
  closeEditModal,
}: IEditTestSuiteModal) {
  const selectedTestSuite = useSelector(selectedTestSuiteSelector);
  const dispatch = useDispatch();
  const toast = useToast();
  const formik = useFormik({
    initialValues: {
      name: selectedTestSuite?.name || "",
    },
    validationSchema,
    onSubmit: (values) => {
      handleUpdate(values);
    },
  });

  const { mutate: updateTestSuite, isPending: isUpdatingTestSuite } =
    useUpdateTestSuiteMutation();

  useEffect(() => {
    if (selectedTestSuite) {
      formik.setValues({
        name: selectedTestSuite?.name,
      });
    }
  }, [selectedTestSuite?.id]);

  const handleCloseEditModal = () => {
    formik.resetForm();
    closeEditModal();
  };

  const handleUpdate = (values: { name: string }) => {
    if (!selectedTestSuite) return;

    updateTestSuite(
      {
        id: selectedTestSuite?.id,
        name: values?.name,
      },
      {
        onSuccess: async (data) => {
          await queryClient.invalidateQueries({
            queryKey: [TEST_GENERATION_QUERIES_PREFIX, GET_TEST_SUITES],
          });

          dispatch(
            setSelectedTestSuite({
              testSuite: {
                ...selectedTestSuite,
                name: data?.name,
              },
            })
          );

          toast({
            title: "Suite de test modifiée",
            description: "La suite de test a été modifiée avec succès",
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
              "Erreur lors de la modification de la suite de test",
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
            Modifier la suite de test
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
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
                placeholder="Nom de la suite de test"
                fontSize="13px"
              />
              {formik.touched.name && formik.errors.name && (
                <FormErrorMessage fontSize="12px">
                  {formik.errors.name}
                </FormErrorMessage>
              )}
            </FormControl>
          </ModalBody>

          <ModalFooter gap=".5rem">
            <Button
              variant="gray"
              onClick={handleCloseEditModal}
              isDisabled={isUpdatingTestSuite}
            >
              Annuler
            </Button>
            <Button
              variant="basic"
              isLoading={isUpdatingTestSuite}
              onClick={() => {
                formik.handleSubmit();
              }}
            >
              Mettre à jour la suite de test
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
