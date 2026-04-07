import { selectedProjectSelector } from "@/app/slices/projectSlice";
import { selectedTestCaseSelector } from "@/app/slices/testGenerationSlice";
import {
  IMoveTestCasePayload,
  useGetTestSuitesByProjectIdQuery,
} from "@/services";
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
  Menu,
  MenuButton,
  Box,
  MenuList,
  MenuItem,
  Text,
} from "@chakra-ui/react";
import { useFormik } from "formik";
import { useSelector } from "react-redux";
import { useMemo } from "react";
import Arrow from "@/assets/svg/arrow.svg?react";
import * as Yup from "yup";

interface IMoveCaseModal {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: IMoveTestCasePayload) => void;
  isLoading?: boolean;
}

const validationSchema = Yup.object({
  destinationSuiteId: Yup.string().required("La suite destination est requis"),
});

const flattenTestSuites = (suites: any[], level: number = 0): any[] => {
  let result: any[] = [];

  suites?.forEach((suite) => {
    result.push({
      ...suite,
      level,
    });

    if (suite?.children && suite?.children?.length > 0) {
      const childSuites = flattenTestSuites(suite?.children, level + 1);
      result = result.concat(childSuites);
    }
  });

  return result;
};

const hasChildren = (suite: any): boolean => {
  return suite?.children && suite?.children?.length > 0;
};

export default function MoveCaseModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: IMoveCaseModal) {
  const selectedTestCase = useSelector(selectedTestCaseSelector);
  const selectedProject = useSelector(selectedProjectSelector);
  const { data: testSuites } = useGetTestSuitesByProjectIdQuery({
    projectId: selectedProject?.id as string,
  });

  const flattenedTestSuites = useMemo(() => {
    if (!testSuites) return [];

    return flattenTestSuites(testSuites);
  }, [testSuites]);

  const currentParentHasChildren = useMemo(() => {
    if (!selectedTestCase?.testSuiteId) return false;

    const currentParent = flattenedTestSuites?.find(
      (suite) => suite?.id === selectedTestCase?.testSuiteId
    );

    return hasChildren(currentParent);
  }, [flattenedTestSuites, selectedTestCase]);

  const availableTestSuites = useMemo(() => {
    if (!flattenedTestSuites || !selectedTestCase?.testSuiteId) {
      return flattenedTestSuites;
    }

    if (currentParentHasChildren) {
      return flattenedTestSuites.map((suite) => ({
        ...suite,
        isDisabled: suite?.id === selectedTestCase?.testSuiteId,
      }));
    }

    return flattenedTestSuites.filter(
      (suite) => suite?.id !== selectedTestCase?.testSuiteId
    );
  }, [flattenedTestSuites, selectedTestCase, currentParentHasChildren]);

  const { values, errors, touched, setFieldValue, handleSubmit } = useFormik({
    initialValues: {
      destinationSuiteId: "",
    },
    validationSchema,
    onSubmit: (values) => {
      onSubmit &&
        onSubmit({
          destinationSuiteId: values?.destinationSuiteId,
          testCaseId: selectedTestCase?.id as string,
        });
    },
  });

  const selectedDestinationSuite = useMemo(() => {
    return availableTestSuites?.find(
      (suite) => suite?.id === values?.destinationSuiteId
    );
  }, [availableTestSuites, values?.destinationSuiteId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Déplacer un cas de test</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            {selectedTestCase && (
              <FormControl isRequired>
                <FormLabel fontSize="13px">Cas de test à déplacer</FormLabel>
                <InputGroup>
                  <Input
                    disabled
                    value={selectedTestCase?.name}
                    fontSize="12px"
                  />
                </InputGroup>
              </FormControl>
            )}
            <FormControl
              isRequired
              isInvalid={
                !!(touched?.destinationSuiteId && errors?.destinationSuiteId)
              }
            >
              <FormLabel fontSize="13px">Suite de test destination</FormLabel>
              <Menu>
                <MenuButton width="100%">
                  <Box position="relative">
                    <Input
                      fontSize="13px"
                      name="destinationSuiteId"
                      placeholder="Sélectionner la suite destination"
                      readOnly
                      borderWidth={
                        errors?.destinationSuiteId ? "2px" : undefined
                      }
                      cursor="pointer"
                      value={selectedDestinationSuite?.name || ""}
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
                <MenuList zIndex={10000} maxHeight="300px" overflowY="auto">
                  {availableTestSuites?.map((suite) => (
                    <MenuItem
                      key={suite?.id}
                      fontSize="13px"
                      onClick={() => {
                        if (!suite?.isDisabled) {
                          setFieldValue("destinationSuiteId", suite?.id);
                        }
                      }}
                      paddingLeft={`${1 + suite?.level * 1.25}rem`}
                      isDisabled={suite?.isDisabled}
                      opacity={suite?.isDisabled ? 0.5 : 1}
                      cursor={suite?.isDisabled ? "not-allowed" : "pointer"}
                      _hover={{
                        bg: suite?.isDisabled ? "transparent" : "gray.100",
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={2}>
                        <Text as="span">📁</Text>
                        <Text>
                          {suite?.name}
                          {suite?.isDisabled && " (Suite actuelle)"}
                        </Text>
                      </Box>
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>
              <FormErrorMessage fontSize="12px">
                {errors?.destinationSuiteId}
              </FormErrorMessage>
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
            Déplacer le cas de test
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
