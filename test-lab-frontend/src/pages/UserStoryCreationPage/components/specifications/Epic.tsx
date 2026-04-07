// components/Epic.tsx (Updated with Tag support)
import { colors } from "@/theme/colors";
import {
  Tr,
  Td,
  Flex,
  Text,
  Badge,
  Avatar,
  AvatarGroup,
  IconButton,
  useDisclosure,
  useToast,
  Box,
} from "@chakra-ui/react";
import Feature from "./Feature";
import Arrow from "@/assets/svg/arrow.svg?react";
import { ActionsMenu, ConfirmationModal } from "@/components";
import { useState } from "react";
import EpicIcon from "@/assets/svg/epic.svg?react";
import {
  EpicStatus,
  GET_EPICS,
  IEpic,
  ITag,
  IUpdateEpicPayload,
  SPECIFICATIONS_QUERIES_PREFIX,
  useDeleteEpicByIdMutation,
  useUpdateEpicMutation, // You'll need to add this mutation
} from "@/services";
import moment from "moment";
import { queryClient } from "@/App";
import Plus from "@/assets/svg/plus.svg?react";
import EpicMutationModal from "../modals/EpicMutationModal";
import FeatureMutationModal from "../modals/FeatureMutationModal";
import EpicInfoModal from "../modals/EpicInfoModal";
import Tag from "./Tag";
import TagManagementModal from "../modals/TagManagementModal";

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
  tag,
}: IEpic) {
  const {
    isOpen: isDeleteModalOpen,
    onClose: closeDeleteModal,
    onOpen: openDeleteModal,
  } = useDisclosure();
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isFeatureSectionExpanded, setIsFeatureSectionExpanded] =
    useState(false);
  const { mutate: deleteEpic, isPending: isDeletingEpic } =
    useDeleteEpicByIdMutation();
  const { mutate: updateEpic } = useUpdateEpicMutation();
  const toast = useToast();
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
  const {
    isOpen: isEpicInfoModalOpen,
    onClose: closeEpicInfoModal,
    onOpen: openEpicInfoModal,
  } = useDisclosure();
  const {
    isOpen: isTagModalOpen,
    onClose: closeTagModal,
    onOpen: openTagModal,
  } = useDisclosure();

  const handleSelectTag = (selectedTag: ITag) => {
    updateEpic({ epicId: id, tagId: selectedTag?.id } as IUpdateEpicPayload, {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [SPECIFICATIONS_QUERIES_PREFIX, GET_EPICS],
          exact: false,
        });
      },
      onError: (error: any) => {
        toast({
          title: "Erreur",
          description: error?.message || "Impossible d'ajouter le tag",
          status: "error",
          duration: 4000,
        });
      },
    });
  };

  const handleRemoveTag = () => {
    updateEpic({ epicId: id, tagId: null } as IUpdateEpicPayload, {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [SPECIFICATIONS_QUERIES_PREFIX, GET_EPICS],
        });
        toast({
          title: "Tag retiré",
          description: "Le tag a été retiré avec succès",
          status: "success",
          duration: 3000,
        });
      },
      onError: (error: any) => {
        toast({
          title: "Erreur",
          description: error?.message || "Impossible de retirer le tag",
          status: "error",
          duration: 4000,
        });
      },
    });
  };

  return (
    <>
      <Tr
        borderBlock="1px solid"
        borderColor={colors.border}
        overflow="hidden"
        background={colors.white}
        _hover={{ bg: colors.body }}
        sx={{
          "& td:first-of-type": {
            borderLeftRadius: ".5rem",
          },
          "& td:last-of-type": {
            borderRightRadius: ".5rem",
          },
        }}
      >
        <Td
          py="1rem"
          pl="1rem"
          cursor="pointer"
          onClick={() => {
            openEpicInfoModal();
          }}
        >
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
              onClick={(e) => {
                e.stopPropagation();
                setIsFeatureSectionExpanded((prev) => !prev);
              }}
              aria-label="Toggle epic"
            />
            <Box width="1rem" height="1rem" flexShrink={0}>
              <EpicIcon width="100%" height="100%" />
            </Box>
            <Text fontWeight="medium" fontSize="12px" noOfLines={1}>
              {name}
            </Text>
            <Badge
              padding=".15rem .35rem"
              color={colors.badge}
              borderRadius="50px"
              textTransform="capitalize"
              fontSize="9px"
              flexShrink={0}
            >
              <Text color={colors.text}>{features?.length} Features</Text>
            </Badge>
          </Flex>
        </Td>
        <Td
          textAlign="center"
          py="0.5rem"
          onClick={(e) => {
            e.stopPropagation();
            openTagModal();
          }}
        >
          <Tag
            onDelete={handleRemoveTag}
            label={tag?.label}
            color={tag?.color}
            onClick={openTagModal}
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
              <Avatar
                bg={colors.blue}
                color={colors.white}
                name="Dhia Ben Hamouda"
              />
              <Avatar
                bg={"orange"}
                color={colors.white}
                name="Hachem Ben Amor"
              />
              <Avatar bg={"red.300"} color={colors.white} name="May Ben Rjab" />
            </AvatarGroup>
          </Flex>
        </Td>
        <Td textAlign="center" py="0.5rem" pr="1rem">
          <Flex justifyContent="center">
            <ActionsMenu
              onDelete={() => {
                openDeleteModal();
              }}
              onEdit={() => {
                openEpicModal();
              }}
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
          <Tr
            borderBlock="1px solid"
            borderColor={colors.border}
            _hover={{ bg: colors.body }}
          >
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
            <Td textAlign="center" py="0.5rem"></Td>
            <Td textAlign="center" py="0.5rem"></Td>
            <Td textAlign="center" py="0.5rem"></Td>
            <Td textAlign="center" py="0.5rem"></Td>
            <Td textAlign="center" py="0.5rem"></Td>
            <Td textAlign="center" py="0.5rem" pr="1rem"></Td>
          </Tr>
        </>
      )}
      <FeatureMutationModal
        isOpen={isFeatureModalOpen}
        onClose={closeFeatureModal}
        epicId={id}
      />
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
                    error?.message ||
                    "Une erreur est survenue lors de la suppression",
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
      <EpicInfoModal
        isOpen={isEpicInfoModalOpen}
        onClose={closeEpicInfoModal}
        id={id}
        name={name}
        description={description}
        status={status}
        priority={priority}
        creationDate={creationDate}
        features={features}
      />
      <TagManagementModal
        isOpen={isTagModalOpen}
        onClose={closeTagModal}
        currentTag={tag}
        onSelectTag={handleSelectTag}
        onRemoveTag={tag ? handleRemoveTag : undefined}
        entityType="epic"
        entityName={name}
      />
    </>
  );
}
