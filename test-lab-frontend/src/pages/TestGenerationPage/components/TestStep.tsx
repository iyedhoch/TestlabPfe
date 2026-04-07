import { colors } from "@/theme/colors";
import { Tr, Td, Text, Flex, Input } from "@chakra-ui/react";
import { ActionsMenu, ConfirmationModal } from "@/components";
import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ITestStep } from "@/services";
import AddTestStepModal from "./modals/AddTestStepModal";
import useTestStepLogic from "../hooks/useTestStepLogic";

export interface TestStepProps extends ITestStep {
  testCaseId: string;
}

export default function TestStep(props: TestStepProps) {
  const { id, order, action, expectedResult } = props;
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const {
    closeAddModal,
    closeDeleteModal,
    isAddModalOpen,
    isDeleteModalOpen,
    openAddModal,
    openDeleteModal,
    isEditingAction,
    setIsEditingAction,
    isEditingExpectedResult,
    setIsEditingExpectedResult,
    handleUpdateAction,
    handleUpdateExpectedResult,
    expectedResultInputRef,
    expectedResultValue,
    actionInputRef,
    actionValue,
    setActionValue,
    setExpectedResultValue,
    handleAddTestStep,
    handleDelete,
    isCreatingTestStep,
    isDeletingTestStep,
  } = useTestStepLogic(props);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Only enable drag listeners when not editing
  const dragHandlers =
    isEditingAction || isEditingExpectedResult ? {} : listeners;

  return (
    <>
      <Tr
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...dragHandlers}
        bg={isDragging ? colors.body : "white"}
        _hover={{ bg: colors.body }}
        cursor={isEditingAction || isEditingExpectedResult ? "default" : "grab"}
        _active={{
          cursor:
            isEditingAction || isEditingExpectedResult ? "default" : "grabbing",
        }}
      >
        <Td width="5%" textAlign="center" py=".75rem">
          <Text fontSize="13px" fontWeight="600" color={colors.text}>
            {order}
          </Text>
        </Td>
        <Td
          width="42.5%"
          py=".75rem"
          textAlign="center"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsEditingAction(true);
          }}
          cursor={isEditingAction ? "text" : "grab"}
        >
          {isEditingAction ? (
            <Input
              ref={actionInputRef}
              value={actionValue}
              onChange={(e) => setActionValue(e.target.value)}
              onBlur={handleUpdateAction}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleUpdateAction();
                } else if (e.key === "Escape") {
                  setActionValue(action);
                  setIsEditingAction(false);
                }
              }}
              fontSize="13px"
              size="sm"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : (
            <Text fontSize="13px" color={colors.text}>
              {action}
            </Text>
          )}
        </Td>
        <Td
          width="42.5%"
          py=".75rem"
          textAlign="center"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsEditingExpectedResult(true);
          }}
          cursor={isEditingExpectedResult ? "text" : "grab"}
        >
          {isEditingExpectedResult ? (
            <Input
              ref={expectedResultInputRef}
              value={expectedResultValue}
              onChange={(e) => setExpectedResultValue(e.target.value)}
              onBlur={handleUpdateExpectedResult}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleUpdateExpectedResult();
                } else if (e.key === "Escape") {
                  setExpectedResultValue(expectedResult);
                  setIsEditingExpectedResult(false);
                }
              }}
              fontSize="13px"
              size="sm"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : (
            <Text fontSize="13px" color={colors.text}>
              {expectedResult}
            </Text>
          )}
        </Td>
        <Td
          width="10%"
          py=".75rem"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Flex justifyContent="center">
            <ActionsMenu
              onDelete={openDeleteModal}
              onAdd={openAddModal}
              isOpen={isActionsOpen}
              onChange={(newValue) => {
                setIsActionsOpen(newValue);
              }}
            />
          </Flex>
        </Td>
      </Tr>
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        isLoading={isDeletingTestStep}
        title="Supprimer l'étape de test"
        description={`Êtes-vous sûr de vouloir supprimer l'étape "${order}. ${action?.substring(
          0,
          50
        )}${
          action?.length > 50 ? "..." : ""
        }" ? Cette action est irréversible.`}
        isDeleteModal
        ConfirmationLabel="Supprimer"
      />
      <AddTestStepModal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        onSubmit={handleAddTestStep}
        isLoading={isCreatingTestStep}
      />
    </>
  );
}
