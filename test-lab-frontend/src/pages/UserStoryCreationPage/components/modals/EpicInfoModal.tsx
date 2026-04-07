import { IEpic, EpicStatus } from "@/services";
import { colors } from "@/theme/colors";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  Text,
  Box,
  Grid,
} from "@chakra-ui/react";
import moment from "moment";
import { useRef } from "react";

interface IEpicInfoModal extends Omit<IEpic, "projectId"> {
  isOpen: boolean;
  onClose: () => void;
}

const epicStatusToLabelMapper: Record<EpicStatus, string> = {
  [EpicStatus.NEW]: "Nouveau",
  [EpicStatus.COMPLETED]: "Terminé",
  [EpicStatus.IN_PROGRESS]: "En cours",
  [EpicStatus.PENDING]: "En attente",
};

const epicPriorityToLabelMapper: Record<string, string> = {
  HIGH: "Haute",
  MEDIUM: "Moyenne",
  LOW: "Basse",
};

export default function EpicInfoModal({
  name,
  description,
  status,
  priority,
  creationDate,
  features,
  isOpen,
  onClose,
}: IEpicInfoModal) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog
      leastDestructiveRef={cancelRef}
      isOpen={isOpen}
      onClose={onClose}
      autoFocus={false}
    >
      <AlertDialogOverlay>
        <AlertDialogContent w="800px" maxW="1000px">
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Informations de l'Epic
          </AlertDialogHeader>

          <AlertDialogBody>
            <Grid gridTemplateColumns="repeat(3, 1fr)" gap="1rem">
              <Box
                bg={colors.body}
                p="1rem"
                borderRadius=".75rem"
                border="1px solid"
                borderColor={colors.border}
              >
                <Text fontSize="13px" fontWeight="bold" color="gray.700">
                  Nom de l'Epic
                </Text>
                <Text fontSize="12px" mt="0.25rem">
                  {name}
                </Text>
              </Box>

              <Box
                bg={colors.body}
                p="1rem"
                borderRadius=".75rem"
                border="1px solid"
                borderColor={colors.border}
              >
                <Text fontSize="13px" fontWeight="bold" color="gray.700">
                  Statut
                </Text>
                <Text fontSize="12px" mt="0.25rem">
                  {epicStatusToLabelMapper[status]}
                </Text>
              </Box>

              <Box
                bg={colors.body}
                p="1rem"
                borderRadius=".75rem"
                border="1px solid"
                borderColor={colors.border}
              >
                <Text fontSize="13px" fontWeight="bold" color="gray.700">
                  Priorité
                </Text>
                <Text fontSize="12px" mt="0.25rem">
                  {epicPriorityToLabelMapper[priority] || priority}
                </Text>
              </Box>

              <Box
                bg={colors.body}
                p="1rem"
                borderRadius=".75rem"
                border="1px solid"
                borderColor={colors.border}
              >
                <Text fontSize="13px" fontWeight="bold" color="gray.600">
                  Date de création
                </Text>
                <Text fontSize="12px" mt="0.25rem">
                  {moment(creationDate).format("DD/MM/YYYY")}
                </Text>
              </Box>

              <Box
                bg={colors.body}
                p="1rem"
                borderRadius=".75rem"
                border="1px solid"
                borderColor={colors.border}
              >
                <Text fontSize="13px" fontWeight="bold" color="gray.600">
                  Nombre de Features
                </Text>
                <Text fontSize="12px" mt="0.25rem">
                  {features?.length || 0}
                </Text>
              </Box>

              <Box
                gridColumn="1/4"
                bg={colors.body}
                p="1rem"
                borderRadius=".75rem"
                border="1px solid"
                borderColor={colors.border}
              >
                <Text fontSize="13px" fontWeight="bold" color="gray.700">
                  Description
                </Text>
                <Text fontSize="12px" mt="0.25rem">
                  {description || "Aucune description"}
                </Text>
              </Box>
            </Grid>
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button
              ref={cancelRef}
              fontSize="13px"
              bg="blue.500"
              color="white"
              onClick={onClose}
              _hover={{ backgroundColor: "blue.600" }}
            >
              Fermer
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}
