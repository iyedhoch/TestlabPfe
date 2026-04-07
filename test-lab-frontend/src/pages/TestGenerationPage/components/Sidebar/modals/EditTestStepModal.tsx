import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  VStack,
  FormErrorMessage,
  Input,
} from "@chakra-ui/react";
import { colors } from "@/theme/colors";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useEffect } from "react";

interface EditTestStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { action: string; expectedResult: string }) => void;
  isLoading?: boolean;
  defaultValues?: {
    action: string;
    expectedResult: string;
  };
}

const validationSchema = Yup.object({
  action: Yup.string().required("L'action est requise"),
  expectedResult: Yup.string().required("Le résultat attendu est requis"),
});

export default function EditTestStepModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  defaultValues,
}: EditTestStepModalProps) {
  const {
    setValues,
    resetForm,
    touched,
    errors,
    values,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useFormik({
    initialValues: {
      action: defaultValues?.action || "",
      expectedResult: defaultValues?.expectedResult || "",
    },
    validationSchema,
    onSubmit: (values) => {
      onSubmit(values);
    },
  });

  // Reset form when modal opens with new default values
  useEffect(() => {
    if (isOpen && defaultValues) {
      setValues({
        action: defaultValues.action,
        expectedResult: defaultValues.expectedResult,
      });
    }
  }, [isOpen, defaultValues]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="16px" fontWeight="600">
          Modifier l'étape de test
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing="1rem">
            <FormControl
              isRequired
              isInvalid={touched.action && !!errors.action}
            >
              <FormLabel fontSize="14px" fontWeight="500">
                Action
              </FormLabel>
              <Input
                name="action"
                value={values.action}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Décrivez l'action à effectuer"
                fontSize="13px"
              />
              {touched.action && errors.action && (
                <FormErrorMessage fontSize="12px">
                  {errors.action}
                </FormErrorMessage>
              )}
            </FormControl>

            <FormControl
              isRequired
              isInvalid={touched.expectedResult && !!errors.expectedResult}
            >
              <FormLabel fontSize="14px" fontWeight="500">
                Résultat attendu
              </FormLabel>
              <Input
                name="expectedResult"
                value={values.expectedResult}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Décrivez le résultat attendu"
                fontSize="13px"
              />
              {touched.expectedResult && errors.expectedResult && (
                <FormErrorMessage fontSize="12px">
                  {errors.expectedResult}
                </FormErrorMessage>
              )}
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter gap=".5rem">
          <Button
            variant="ghost"
            onClick={handleClose}
            fontSize="13px"
            isDisabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            bg={colors.blue}
            color="white"
            fontSize="13px"
            isLoading={isLoading}
            _hover={{ bg: "blue.600" }}
            onClick={() => {
              handleSubmit();
            }}
          >
            Mettre à jour le cas de test
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
