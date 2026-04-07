import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  VStack,
  Input,
  FormErrorMessage,
} from "@chakra-ui/react";
import { useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";

interface AddTestStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { action: string; expectedResult: string }) => void;
  isLoading?: boolean;
}

const validationSchema = Yup.object({
  action: Yup.string().required("L'action est requise"),
  expectedResult: Yup.string().required("Le résultat attendu est requis"),
});

export default function AddTestStepModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: AddTestStepModalProps) {
  const formik = useFormik({
    initialValues: {
      action: "",
      expectedResult: "",
    },
    validationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: (values) => {
      onSubmit({
        action: values.action.trim(),
        expectedResult: values.expectedResult.trim(),
      });
    },
  });

  useEffect(() => {
    if (!isOpen) {
      formik.resetForm();
    }
  }, [isOpen]);

  // Only show errors after submit attempt
  const showActionError = formik.submitCount > 0 && !!formik.errors.action;
  const showExpectedResultError =
    formik.submitCount > 0 && !!formik.errors.expectedResult;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Ajouter une étape de test</ModalHeader>
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired isInvalid={showActionError}>
              <FormLabel fontSize="14px" fontWeight="500">
                Action
              </FormLabel>
              <Input
                name="action"
                value={formik.values.action}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="Décrivez l'action à effectuer..."
                fontSize="13px"
              />
              {showActionError && (
                <FormErrorMessage fontSize="12px">
                  {formik.errors.action}
                </FormErrorMessage>
              )}
            </FormControl>
            <FormControl isRequired isInvalid={showExpectedResultError}>
              <FormLabel fontSize="14px" fontWeight="500">
                Résultat attendu
              </FormLabel>
              <Input
                name="expectedResult"
                value={formik.values.expectedResult}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="Décrivez le résultat attendu..."
                fontSize="13px"
              />
              {showExpectedResultError && (
                <FormErrorMessage fontSize="12px">
                  {formik.errors.expectedResult}
                </FormErrorMessage>
              )}
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="gray" onClick={onClose} isDisabled={isLoading}>
            Annuler
          </Button>
          <Button
            variant="basic"
            isLoading={isLoading}
            onClick={() => {
              formik.handleSubmit();
            }}
          >
            Ajouter étape de test
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
