import { selectedProjectSelector } from "@/app/slices/projectSlice";
import { selectedTestSuiteSelector } from "@/app/slices/testGenerationSlice";
import {
  IMoveTestSuitePayload,
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

interface IMoveSuiteModal {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: IMoveTestSuitePayload) => void;
  isLoading?: boolean;
}

const validationSchema = Yup.object({
  destinationSuiteId: Yup.string()
    .nullable()
    .required("La suite destination est requis"),
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

// Helper to find parent suite by recursively searching the tree
const findParentSuite = (suites: any[], childId: string): any | null => {
  for (const suite of suites) {
    // Check if this suite has the child in its children array
    if (suite?.children?.some((child: any) => child?.id === childId)) {
      return suite;
    }

    // Recursively search in children
    if (suite?.children && suite?.children?.length > 0) {
      const found = findParentSuite(suite?.children, childId);
      if (found) {
        return found;
      }
    }
  }

  return null;
};

// Check if the selected suite is a child of the target suite
// const isChildOf = (selectedSuiteId: string, targetSuite: any): boolean => {
//   if (!targetSuite?.children || targetSuite?.children?.length === 0) {
//     return false;
//   }

//   return targetSuite?.children?.some(
//     (child: any) => child?.id === selectedSuiteId
//   );
// };

// Check if the selected suite is a descendant (child, grandchild, etc.) of the target suite
const isDescendantOf = (selectedSuiteId: string, targetSuite: any): boolean => {
  if (!targetSuite?.children || targetSuite?.children?.length === 0) {
    return false;
  }

  // Check direct children
  if (
    targetSuite?.children?.some((child: any) => child?.id === selectedSuiteId)
  ) {
    return true;
  }

  // Check descendants recursively
  return targetSuite?.children?.some((child: any) =>
    isDescendantOf(selectedSuiteId, child)
  );
};

export default function MoveSuiteModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: IMoveSuiteModal) {
  const selectedTestSuite = useSelector(selectedTestSuiteSelector);
  const selectedProject = useSelector(selectedProjectSelector);
  const { data: testSuites } = useGetTestSuitesByProjectIdQuery({
    projectId: selectedProject?.id as string,
  });

  // Find the current parent of the selected suite
  const currentParent = useMemo(() => {
    if (!testSuites || !selectedTestSuite) return null;

    return findParentSuite(testSuites, selectedTestSuite?.id);
  }, [testSuites, selectedTestSuite]);

  const availableTestSuites = useMemo(() => {
    if (!testSuites || !selectedTestSuite) return [];

    // Flatten all suites first
    const allFlattened = flattenTestSuites(testSuites);

    // Filter and mark suites
    return allFlattened
      .filter((suite) => {
        // Don't show the suite itself
        if (suite?.id === selectedTestSuite?.id) {
          return false;
        }

        // Keep the current parent (we'll mark it as disabled later)
        if (currentParent && suite?.id === currentParent?.id) {
          return true;
        }

        // Don't show suites where the selected suite is a CHILD
        // (this prevents moving into its own children/descendants)
        if (isDescendantOf(selectedTestSuite?.id, suite)) {
          return false;
        }

        return true;
      })
      .map((suite) => ({
        ...suite,
        // Mark the current parent as disabled
        isDisabled: currentParent && suite?.id === currentParent?.id,
      }));
  }, [testSuites, selectedTestSuite, currentParent]);

  const { values, errors, touched, setFieldValue, handleSubmit } = useFormik({
    initialValues: {
      destinationSuiteId: "",
    },
    validationSchema,
    onSubmit: (values) => {
      onSubmit &&
        onSubmit({
          destinationSuiteId: values?.destinationSuiteId,
          suiteId: selectedTestSuite?.id as string,
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
        <ModalHeader>Déplacer une suite de test</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            {selectedTestSuite && (
              <FormControl isRequired>
                <FormLabel fontSize="13px">Suite à déplacer</FormLabel>
                <InputGroup>
                  <Input
                    disabled
                    value={selectedTestSuite?.name}
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
              <FormLabel fontSize="13px">Suite déstination</FormLabel>
              <Menu>
                <MenuButton width="100%">
                  <Box position="relative">
                    <Input
                      fontSize="13px"
                      name="priority"
                      placeholder="Sélectionner le suite déstination"
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
                  {/* All test suites with hierarchy */}
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
                          {suite?.isDisabled && " (Parent actuel)"}
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
            _active={{
              bg: "blue.600",
            }}
          >
            Déplacer suite de test
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
