import { colors } from "@/theme/colors";
import {
  Flex,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Input,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import Phase from "@/assets/svg/phase.svg?react";
import Summary from "@/assets/svg/summary.svg?react";
import Preconditions from "@/assets/svg/preconditions.svg?react";
import Steps from "@/assets/svg/steps.svg?react";
import Precondition from "./Precondition";
import { hexToRgba } from "@/utils/functions";
import { useSelector } from "react-redux";
import { selectedTestCaseSelector } from "@/app/slices/testGenerationSlice";
import {
  ITestCase,
  ITestSuite,
  useGetTestCaseByIdQuery,
  useUpdateTestCaseMutation,
  GET_TEST_CASE,
  GET_TEST_SUITES,
  TEST_GENERATION_QUERIES_PREFIX,
} from "@/services";
import PreconditionsSkeleton from "./skeletons/PreconditionsSkeleton";
import TestStepsSkeleton from "./skeletons/TestStepsSkeleton";
import StepsContainer from "./StepsContainer";
import { useMemo, useState, useRef, useEffect } from "react";
import { queryClient } from "@/App";

interface ITestCaseContainer {
  isLoadingTestSuites?: boolean;
  testSuites: ITestSuite[];
}

export default function TestCaseContainer({
  isLoadingTestSuites = false,
  testSuites,
}: ITestCaseContainer) {
  const toast = useToast();
  const selectedTestCase = useSelector(selectedTestCaseSelector);
  const { data: testCase } = useGetTestCaseByIdQuery(selectedTestCase?.id);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const summaryInputRef = useRef<HTMLTextAreaElement>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [summaryValue, setSummaryValue] = useState("");

  const { mutate: updateTestCase } = useUpdateTestCaseMutation();

  const sortedPreconditions = useMemo(() => {
    if (!testCase?.preconditions) return [];
    return [...testCase.preconditions].sort((a, b) => a.order - b.order);
  }, [testCase?.preconditions]);

  // Update local state when testCase changes
  useEffect(() => {
    if (testCase?.name) {
      setNameValue(testCase.name);
    }
    if (testCase?.summary) {
      setSummaryValue(testCase.summary);
    }
  }, [testCase?.name, testCase?.summary]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (isEditingSummary && summaryInputRef.current) {
      summaryInputRef.current.focus();
    }
  }, [isEditingSummary]);

  const handleUpdateName = () => {
    if (!testCase?.id) return;

    if (nameValue.trim() === "" || nameValue === testCase?.name) {
      setNameValue(testCase?.name || "");
      setIsEditingName(false);
      return;
    }

    updateTestCase(
      {
        id: testCase.id,
        name: nameValue,
        summary: summaryValue,
      },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey: [TEST_GENERATION_QUERIES_PREFIX, GET_TEST_SUITES],
            exact: false,
          });

          await queryClient.invalidateQueries({
            queryKey: [TEST_GENERATION_QUERIES_PREFIX, GET_TEST_CASE],
            exact: false,
          });

          toast({
            title: "Cas de test modifié",
            description: "Le nom a été modifié avec succès",
            status: "success",
            duration: 3000,
          });
          setIsEditingName(false);
        },
        onError: (error: any) => {
          toast({
            title: "Erreur de modification",
            description:
              error?.response?.data?.error ||
              error?.message ||
              "Erreur lors de la modification du nom",
            status: "error",
            duration: 4000,
          });
          setNameValue(testCase?.name || "");
          setIsEditingName(false);
        },
      }
    );
  };

  const handleUpdateSummary = () => {
    if (!testCase?.id) return;

    if (summaryValue.trim() === "" || summaryValue === testCase?.summary) {
      setSummaryValue(testCase?.summary || "");
      setIsEditingSummary(false);
      return;
    }

    updateTestCase(
      {
        id: testCase.id,
        name: nameValue,
        summary: summaryValue,
      },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey: [TEST_GENERATION_QUERIES_PREFIX, GET_TEST_SUITES],
            exact: false,
          });

          await queryClient.invalidateQueries({
            queryKey: [TEST_GENERATION_QUERIES_PREFIX, GET_TEST_CASE],
            exact: false,
          });

          toast({
            title: "Cas de test modifié",
            description: "Le résumé a été modifié avec succès",
            status: "success",
            duration: 3000,
          });
          setIsEditingSummary(false);
        },
        onError: (error: any) => {
          toast({
            title: "Erreur de modification",
            description:
              error?.response?.data?.error ||
              error?.message ||
              "Erreur lors de la modification du résumé",
            status: "error",
            duration: 4000,
          });
          setSummaryValue(testCase?.summary || "");
          setIsEditingSummary(false);
        },
      }
    );
  };

  return (
    <Flex
      border="1px solid"
      borderColor={colors.border}
      bg="white"
      borderRadius=".75rem"
      padding="1rem"
      flex="1"
      flexDirection="column"
    >
      {selectedTestCase ? (
        <>
          <Flex
            width="100%"
            background={hexToRgba(colors.blue, 0.05)}
            justifyContent="space-between"
            borderRadius=".5rem"
            padding="1rem"
            marginBottom="1.5rem"
          >
            <Flex alignItems="center" gap=".5rem" flex="1">
              <Phase color={colors.blue} />
              {isEditingName ? (
                <Input
                  ref={nameInputRef}
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onBlur={handleUpdateName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUpdateName();
                    } else if (e.key === "Escape") {
                      setNameValue(testCase?.name || "");
                      setIsEditingName(false);
                    }
                  }}
                  fontWeight="bold"
                  color={colors.blue}
                  size="sm"
                  variant="unstyled"
                  px="0.5rem"
                />
              ) : (
                <Text
                  fontWeight="bold"
                  color={colors.blue}
                  onDoubleClick={() => setIsEditingName(true)}
                  cursor="pointer"
                >
                  {testCase?.name}
                </Text>
              )}
            </Flex>
          </Flex>
          <Flex flexDirection="column" gap="1rem" marginBottom="1.5rem">
            <Flex gap=".5rem">
              <Summary />
              <Text fontWeight="500">Résumé</Text>
            </Flex>
            {isEditingSummary ? (
              <Textarea
                ref={summaryInputRef}
                value={summaryValue}
                onChange={(e) => setSummaryValue(e.target.value)}
                onBlur={handleUpdateSummary}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault(); // Prevent new line
                    handleUpdateSummary();
                  } else if (e.key === "Escape") {
                    setSummaryValue(testCase?.summary || "");
                    setIsEditingSummary(false);
                  }
                }}
                fontWeight="500"
                color={colors.text}
                fontSize=".85rem"
                size="sm"
                resize="vertical"
                minHeight="80px"
              />
            ) : (
              <Text
                fontWeight="500"
                color={colors.text}
                fontSize=".85rem"
                textAlign="justify"
                onDoubleClick={() => setIsEditingSummary(true)}
                cursor="pointer"
              >
                {testCase?.summary || "--"}
              </Text>
            )}
          </Flex>
          {/* Preconditions Section */}
          <Flex flexDirection="column" gap="1rem" marginBottom="1.5rem">
            <Flex gap=".5rem">
              <Preconditions />
              <Text fontWeight="500">Préconditions</Text>
            </Flex>
            {isLoadingTestSuites ? (
              <PreconditionsSkeleton />
            ) : (
              <Flex
                key={JSON.stringify(isLoadingTestSuites)}
                flexDirection="column"
                borderRadius=".5rem"
                border="1px solid"
                borderColor={colors.border}
              >
                {sortedPreconditions?.map((precondition, index) => (
                  <Precondition
                    key={precondition.id}
                    isLast={sortedPreconditions.length - 1 === index}
                    {...precondition}
                  />
                ))}
              </Flex>
            )}
          </Flex>
          <Flex flexDirection="column" gap="1rem">
            <Flex gap=".5rem">
              <Steps />
              <Text fontWeight="500">Étapes de test</Text>
            </Flex>
            {isLoadingTestSuites ? (
              <TestStepsSkeleton />
            ) : (
              <Flex
                key={JSON.stringify(isLoadingTestSuites)}
                borderRadius=".5rem"
                border="1px solid"
                borderColor={colors.border}
                overflow="hidden"
              >
                <Table variant="simple" size="sm">
                  <Thead bg={colors.body}>
                    <Tr>
                      <Th
                        py=".75rem"
                        width="5%"
                        textAlign="center"
                        textTransform="none"
                      >
                        #
                      </Th>
                      <Th width="42.5%" textAlign="center" textTransform="none">
                        Action
                      </Th>
                      <Th width="42.5%" textAlign="center" textTransform="none">
                        Résultat attendu
                      </Th>
                      <Th width="10%" textAlign="center" textTransform="none">
                        Actions
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    <StepsContainer
                      selectedTestCase={testCase as ITestCase}
                      testSuites={testSuites}
                    />
                  </Tbody>
                </Table>
              </Flex>
            )}
          </Flex>
        </>
      ) : (
        <Text fontSize=".85rem" color={colors.text}>
          Veuillez choisir un cas de test
        </Text>
      )}
    </Flex>
  );
}
