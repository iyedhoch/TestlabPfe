import { selectedTestSuiteSelector } from "@/app/slices/testGenerationSlice";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  VStack,
  InputGroup,
} from "@chakra-ui/react";
import { useFormik } from "formik";
import { useSelector } from "react-redux";
import * as Yup from "yup";

interface ISuiteCreationModal {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; parentId?: string }) => void;
  isLoading?: boolean;
}

const validationSchema = Yup.object({
  name: Yup.string()
    .required("Le titre du suite est requis")
    .min(5, "Le token doit contenir au moins 5 caractères"),
});

export default function SuiteCreationModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: ISuiteCreationModal) {
  const selectedTestSuite = useSelector(selectedTestSuiteSelector);
  const { values, errors, touched, handleChange, handleSubmit } = useFormik({
    initialValues: {
      name: "",
    },
    validationSchema,
    onSubmit: (values) => {
      onSubmit &&
        onSubmit({
          name: values?.name,
          ...(selectedTestSuite && { parentId: selectedTestSuite?.id }),
        });
    },
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Créer une suite de test</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            {selectedTestSuite && (
              <FormControl isRequired>
                <FormLabel fontSize="13px">Suite de test parent</FormLabel>
                <InputGroup>
                  <Input
                    disabled
                    value={selectedTestSuite?.name}
                    fontSize="12px"
                  />
                </InputGroup>
              </FormControl>
            )}
            <FormControl isRequired isInvalid={!!(errors.name && touched.name)}>
              <FormLabel fontSize="13px">Titre du suite</FormLabel>
              <InputGroup>
                <Input
                  name="name"
                  value={values?.name}
                  onChange={handleChange}
                  fontSize="12px"
                  placeholder="Titre du suite"
                />
              </InputGroup>
              <FormErrorMessage fontSize="12px">{errors.name}</FormErrorMessage>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="gray" type="button" onClick={onClose} mr={3}>
            Annuler
          </Button>
          <Button
            variant="basic"
            type="submit"
            isLoading={isLoading}
            isDisabled={false}
            onClick={() => {
              handleSubmit();
            }}
          >
            Créer suite de test
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
