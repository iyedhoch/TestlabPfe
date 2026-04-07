import { colors } from "@/theme/colors";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
} from "@chakra-ui/react";
import React from "react";

interface IConfirmationModal {
  title: string;
  description: string;
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleteModal?: boolean;
  ConfirmationLabel?: string;
}

export default function ConfirmationModal({
  description,
  isLoading,
  isOpen,
  onClose,
  title,
  onConfirm,
  isDeleteModal = false,
  ConfirmationLabel,
}: IConfirmationModal) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog
      leastDestructiveRef={cancelRef}
      isOpen={isOpen}
      onClose={onClose}
    >
      <AlertDialogOverlay zIndex={9999}>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            {title}
          </AlertDialogHeader>
          <AlertDialogBody>{description}</AlertDialogBody>
          <AlertDialogFooter>
            <Button
              fontSize="13px"
              bg="gray.100"
              color="gray.600"
              _hover={{
                backgroundColor: "gray.200",
              }}
              onClick={onClose}
            >
              Annuler
            </Button>
            <Button
              ml={3}
              isLoading={isLoading}
              fontSize="13px"
              onClick={onConfirm}
              _hover={{
                backgroundColor: colors.blue,
              }}
              {...(isDeleteModal && {
                bg: "red.500",
                _hover: {
                  background: "red.600",
                },
              })}
            >
              {ConfirmationLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}
