import { queryClient } from "@/App";
import {
  GET_TEST_CASE,
  GET_TEST_SUITES,
  TEST_GENERATION_QUERIES_PREFIX,
  useCreateTestStepMutation,
  useDeleteTestStepMutation,
  useUpdateTestStepMutation,
} from "@/services";
import { useDisclosure, useToast } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { TestStepProps } from "../components/TestStep";

export default function useTestStepLogic({
  action,
  expectedResult,
  order,
  id,
  testCaseId,
}: TestStepProps) {
  const toast = useToast();
  const actionInputRef = useRef<HTMLInputElement>(null);
  const expectedResultInputRef = useRef<HTMLInputElement>(null);
  const [isEditingAction, setIsEditingAction] = useState(false);
  const [isEditingExpectedResult, setIsEditingExpectedResult] = useState(false);
  const [actionValue, setActionValue] = useState(action);
  const [expectedResultValue, setExpectedResultValue] =
    useState(expectedResult);
  const {
    isOpen: isDeleteModalOpen,
    onOpen: openDeleteModal,
    onClose: closeDeleteModal,
  } = useDisclosure();
  const {
    isOpen: isAddModalOpen,
    onOpen: openAddModal,
    onClose: closeAddModal,
  } = useDisclosure();
  const { mutate: deleteTestStep, isPending: isDeletingTestStep } =
    useDeleteTestStepMutation();
  const { mutate: updateTestStep, isPending: isUpdatingTestStep } =
    useUpdateTestStepMutation();
  const { mutate: createTestStep, isPending: isCreatingTestStep } =
    useCreateTestStepMutation();

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingAction && actionInputRef.current) {
      actionInputRef.current.focus();
    }
  }, [isEditingAction]);

  useEffect(() => {
    if (isEditingExpectedResult && expectedResultInputRef.current) {
      expectedResultInputRef.current.focus();
    }
  }, [isEditingExpectedResult]);

  const handleDelete = () => {
    deleteTestStep(id, {
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
          title: "Étape supprimée",
          description: "L'étape de test a été supprimée avec succès",
          status: "success",
          duration: 3000,
        });
        closeDeleteModal();
      },
      onError: (error: any) => {
        toast({
          title: "Erreur de suppression",
          description:
            error?.response?.data?.error ||
            error?.message ||
            "Erreur lors de la suppression de l'étape",
          status: "error",
          duration: 4000,
        });
      },
    });
  };

  const handleUpdateAction = () => {
    if (actionValue.trim() === "" || actionValue === action) {
      setActionValue(action);
      setIsEditingAction(false);
      return;
    }

    updateTestStep(
      {
        id,
        action: actionValue,
        expectedResult: expectedResultValue,
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
            title: "Étape modifiée",
            description: "L'action a été modifiée avec succès",
            status: "success",
            duration: 3000,
          });
          setIsEditingAction(false);
        },
        onError: (error: any) => {
          toast({
            title: "Erreur de modification",
            description:
              error?.response?.data?.error ||
              error?.message ||
              "Erreur lors de la modification de l'action",
            status: "error",
            duration: 4000,
          });
          setActionValue(action);
          setIsEditingAction(false);
        },
      }
    );
  };

  const handleUpdateExpectedResult = () => {
    if (
      expectedResultValue.trim() === "" ||
      expectedResultValue === expectedResult
    ) {
      setExpectedResultValue(expectedResult);
      setIsEditingExpectedResult(false);
      return;
    }

    updateTestStep(
      {
        id,
        action: actionValue,
        expectedResult: expectedResultValue,
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
            title: "Étape modifiée",
            description: "Le résultat attendu a été modifié avec succès",
            status: "success",
            duration: 3000,
          });
          setIsEditingExpectedResult(false);
        },
        onError: (error: any) => {
          toast({
            title: "Erreur de modification",
            description:
              error?.response?.data?.error ||
              error?.message ||
              "Erreur lors de la modification du résultat attendu",
            status: "error",
            duration: 4000,
          });
          setExpectedResultValue(expectedResult);
          setIsEditingExpectedResult(false);
        },
      }
    );
  };

  const handleAddTestStep = (data: {
    action: string;
    expectedResult: string;
  }) => {
    createTestStep(
      {
        testCaseId,
        action: data?.action,
        expectedResult: data?.expectedResult,
        insertAfterOrder: order,
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
            title: "Étape ajoutée",
            description: "L'étape de test a été ajoutée avec succès",
            status: "success",
            duration: 3000,
          });
          closeAddModal();
        },
        onError: (error: any) => {
          toast({
            title: "Erreur d'ajout",
            description:
              error?.response?.data?.error ||
              error?.message ||
              "Erreur lors de l'ajout de l'étape",
            status: "error",
            duration: 4000,
          });
        },
      }
    );
  };

  return {
    isDeleteModalOpen,
    openDeleteModal,
    closeDeleteModal,
    isAddModalOpen,
    openAddModal,
    closeAddModal,
    isEditingAction,
    setIsEditingAction,
    isEditingExpectedResult,
    setIsEditingExpectedResult,
    handleUpdateExpectedResult,
    handleUpdateAction,
    expectedResultValue,
    expectedResultInputRef,
    actionValue,
    actionInputRef,
    setActionValue,
    setExpectedResultValue,
    isDeletingTestStep,
    isUpdatingTestStep,
    handleDelete,
    handleAddTestStep,
    isCreatingTestStep,
  };
}
