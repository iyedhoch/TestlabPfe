import { colors } from "@/theme/colors";
import {
  Avatar,
  AvatarGroup,
  Badge,
  Box,
  Flex,
  IconButton,
  Td,
  Text,
  Tr,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import Feature from "./Feature";
import Arrow from "@/assets/svg/arrow.svg?react";
import EpicIcon from "@/assets/svg/epic.svg?react";
import Plus from "@/assets/svg/plus.svg?react";
import { ActionsMenu, ConfirmationModal } from "@/components";
import {
  EpicStatus,
  GET_EPICS,
  IEpic,
  SPECIFICATIONS_QUERIES_PREFIX,
  useDeleteEpicByIdMutation,
} from "@/services";
import moment from "moment";
import { queryClient } from "@/App";
import EpicMutationModal from "../modals/EpicMutationModal";
import Tag from "./Tag";
import FeatureMutationModal from "../modals/FeatureMutationModal";

export const epicStatusToLabelMapper: Record<EpicStatus, string> = {
  [EpicStatus.NEW]: "Nouveau",
  [EpicStatus.COMPLETED]: "Terminé",
  [EpicStatus.IN_PROGRESS]: "En cours",
  [EpicStatus.PENDING]: "En attente",
};

export default function Epic({
  id,
  creationDate,
  name,
  status,
  features,
  description,
  priority,
}: IEpic) {
  const {
    isOpen: isDeleteModalOpen,
    onClose: closeDeleteModal,
    onOpen: openDeleteModal,
  } = useDisclosure();
  const {
    isOpen: isEpicModalOpen,
    onClose: closeEpicModal,
    onOpen: openEpicModal,
  } = useDisclosure();
  const {
    isOpen: isFeatureModalOpen,
    onClose: closeFeatureModal,
    onOpen: openFeatureModal,
  } = useDisclosure();

  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isFeatureSectionExpanded, setIsFeatureSectionExpanded] = useState(false);
  const { mutate: deleteEpic, isPending: isDeletingEpic } = useDeleteEpicByIdMutation();
  const toast = useToast();

  return (
    <>
      <Tr
        borderBlock="1px solid"
        borderColor={colors.border}
        overflow="hidden"
        _hover={{ bg: colors.body }}
      >
        <Td py="1rem" pl="1rem">
          <Flex align="center" gap={1}>
            <IconButton
              icon={
                <Box
                  as={Arrow}
                  width="1rem"
                  height="1rem"
                  sx={{
                    transform: isFeatureSectionExpanded
                      ? "rotate(-180deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.3s ease-in-out",
                  }}
                />
              }
              size="xs"
              variant="ghost"
              minW="auto"
              aria-label="Toggle epic"
              onClick={(event) => {
                event.stopPropagation();
                setIsFeatureSectionExpanded((prev) => !prev);
              }}
            />
            <Box width="1rem" height="1rem" flexShrink={0}>
              <EpicIcon width="100%" height="100%" />
            </Box>
            <Text fontWeight="medium" fontSize="12px" noOfLines={1}>
              {name}
            </Text>
            <Badge
              padding=".15rem .35rem"
              bg={colors.badge}
              color={colors.text}
              borderRadius="50px"
              textTransform="capitalize"
              fontSize="9px"
              flexShrink={0}
            >
              <Text color="inherit">{features?.length} Features</Text>
            </Badge>
          </Flex>
        </Td>
        <Td textAlign="center" py="0.5rem">
          <Tag
            label={undefined}
            color={undefined}
            onClick={() => {}}
            onDelete={() => {}}
          />
        </Td>
        <Td textAlign="center" py="0.5rem">
          <Text fontSize="11px" whiteSpace="nowrap">
            {moment(creationDate).format("DD/MM/YY")}
          </Text>
        </Td>
        <Td textAlign="center" py="0.5rem">
          <Badge
            padding=".15rem .35rem"
            colorScheme="green"
            borderRadius="50px"
            textTransform="capitalize"
            fontSize="9px"
            flexShrink={0}
          >
            {epicStatusToLabelMapper[status]}
          </Badge>
        </Td>
        <Td textAlign="center" py="0.5rem">
          <Flex justify="center">
            <Avatar color="white" size="xs" name="Ali Belkadhi " />
          </Flex>
        </Td>
        <Td textAlign="center" py="0.5rem">
          <Flex justify="center">
            <AvatarGroup size="xs" spacing="-0.4rem">
              <Avatar bg={colors.blue} color={colors.white} name="Dhia Ben Hamouda" />
              <Avatar bg="orange" color={colors.white} name="Hachem Ben Amor" />
              <Avatar bg="red.300" color={colors.white} name="May Ben Rjab" />
            </AvatarGroup>
          </Flex>
        </Td>
        <Td textAlign="center" py="0.5rem" pr="1rem">
          <Flex
            justifyContent="center"
            onClick={(event) => event.stopPropagation()}
          >
            <ActionsMenu
              onDelete={openDeleteModal}
              onEdit={openEpicModal}
              isOpen={isActionsOpen}
              onChange={(newValue) => {
                setIsActionsOpen(newValue);
              }}
            />
          </Flex>
        </Td>
      </Tr>
      {isFeatureSectionExpanded && (
        <>
          {features?.map((feature) => (
            <Feature key={feature?.id} {...feature} />
          ))}
          <Tr borderBlock="1px solid" borderColor={colors.border} _hover={{ bg: colors.body }}>
            <Td paddingStart="2.9rem" py="0.75rem">
              <Flex
                align="center"
                gap={1.5}
                cursor="pointer"
                onClick={() => {
                  openFeatureModal();
                }}
              >
                <Flex
                  align="center"
                  justify="center"
                  width="1.3rem"
                  height="1.3rem"
                  borderRadius="4px"
                  bg={colors.blue}
                  color={colors.white}
                  fontSize="16px"
                  fontWeight="bold"
                  flexShrink={0}
                >
                  <Plus width="1rem" height="1rem" />
                </Flex>
                <Text fontSize="12px" color={colors.text}>
                  Ajouter une feature
                </Text>
              </Flex>
            </Td>
            <Td textAlign="center" py="0.5rem" />
            <Td textAlign="center" py="0.5rem" />
            <Td textAlign="center" py="0.5rem" />
            <Td textAlign="center" py="0.5rem" />
            <Td textAlign="center" py="0.5rem" />
            <Td textAlign="center" py="0.5rem" pr="1rem" />
          </Tr>
        </>
      )}
      <FeatureMutationModal isOpen={isFeatureModalOpen} onClose={closeFeatureModal} epicId={id} />
      <ConfirmationModal
        isLoading={isDeletingEpic}
        ConfirmationLabel="Supprimer"
        title="Supprimer l'Epic"
        description={`Êtes-vous sûr de vouloir supprimer l'Epic "${name}" ? Cette action est irréversible.`}
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        isDeleteModal
        onConfirm={() => {
          if (!id) return;

          deleteEpic(
            { id },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({
                  queryKey: [SPECIFICATIONS_QUERIES_PREFIX, GET_EPICS],
                  exact: false,
                });

                toast({
                  title: "Epic supprimé",
                  description: "L'epic a été supprimé définitivement",
                  status: "success",
                  duration: 3000,
                });
                closeDeleteModal();
              },
              onError: (error) => {
                toast({
                  title: "Suppression impossible",
                  description:
                    error?.message || "Une erreur est survenue lors de la suppression",
                  status: "error",
                  duration: 4000,
                });
              },
            }
          );
        }}
      />
      <EpicMutationModal
        isUpdate
        isOpen={isEpicModalOpen}
        onClose={closeEpicModal}
        updateData={{
          description,
          name,
          priority,
          status,
          epicId: id,
        }}
      />
    </>
  );
}