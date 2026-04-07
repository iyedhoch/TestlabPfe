// Feature.tsx with Tag Support
import {
  Tr,
  Td,
  Flex,
  Text,
  Badge,
  IconButton,
  Box,
  Avatar,
  AvatarGroup,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import Arrow from "@/assets/svg/arrow.svg?react";
import FeatureIcon from "@/assets/svg/feature.svg?react";
import UserStory from "./UserStory";
import { useState } from "react";
import { colors } from "@/theme/colors";
import Plus from "@/assets/svg/plus.svg?react";
import {
  FeatureStatus,
  GET_EPICS,
  IFeature,
  ITag,
  IUpdateFeaturePayload,
  SPECIFICATIONS_QUERIES_PREFIX,
  useDeleteFeatureByIdMutation,
  useUpdateFeatureMutation,
} from "@/services";
import moment from "moment";
import { ActionsMenu, ConfirmationModal } from "@/components";
import FeatureMutationModal from "../modals/FeatureMutationModal";
import { queryClient } from "@/App";
import UserStoryMutationModal from "../modals/UserStoryMutationModal";
import FeatureInfoModal from "../modals/FeatureInfoModal";
import Tag from "./Tag";
import TagManagementModal from "../modals/TagManagementModal";

export const featureStatusToLabelMapper: Record<FeatureStatus, string> = {
  [FeatureStatus.NEW]: "Nouveau",
  [FeatureStatus.COMPLETED]: "Terminé",
  [FeatureStatus.IN_PROGRESS]: "En cours",
  [FeatureStatus.PENDING]: "En attente",
};

export default function Feature({
  name,
  creationDate,
  status,
  userStories,
  description,
  priority,
  id,
  tag,
}: IFeature) {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isStoriesSectionExpanded, setIsStoriesSectionExpanded] =
    useState(false);
  const toast = useToast();
  const {
    isOpen: isFeatureModalOpen,
    onClose: closeFeatureModal,
    onOpen: openFeatureModal,
  } = useDisclosure();
  const {
    isOpen: isDeleteModalOpen,
    onClose: closeDeleteModal,
    onOpen: openDeleteModal,
  } = useDisclosure();
  const { mutate: deleteFeature, isPending: isDeletingFeature } =
    useDeleteFeatureByIdMutation();
  const { mutate: updateFeature } = useUpdateFeatureMutation();
  const {
    isOpen: isStoryModalOpen,
    onClose: closeStoryModal,
    onOpen: openStoryModal,
  } = useDisclosure();
  const {
    isOpen: isFeatureInfoModalOpen,
    onClose: closeFeatureInfoModal,
    onOpen: openFeatureInfoModal,
  } = useDisclosure();
  const {
    isOpen: isTagModalOpen,
    onClose: closeTagModal,
    onOpen: openTagModal,
  } = useDisclosure();

  const handleSelectTag = (selectedTag: ITag) => {
    updateFeature(
      { featureId: id, tagId: selectedTag?.id } as IUpdateFeaturePayload,
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: [SPECIFICATIONS_QUERIES_PREFIX, GET_EPICS],
          });
          toast({
            title: "Tag ajouté",
            description: "Le tag a été ajouté avec succès",
            status: "success",
            duration: 3000,
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
      }
    );
  };

  const handleRemoveTag = () => {
    updateFeature({ featureId: id, tagId: null } as IUpdateFeaturePayload, {
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
        _hover={{ bg: colors.body }}
      >
        <Td
          paddingStart="3rem"
          py="0.75rem"
          cursor="pointer"
          onClick={() => {
            openFeatureInfoModal();
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
                    transform: isStoriesSectionExpanded
                      ? "rotate(-180deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.3s ease-in-out",
                  }}
                />
              }
              size="xs"
              variant="ghost"
              aria-label="Toggle feature"
              minW="auto"
              onClick={(e) => {
                e.stopPropagation();
                setIsStoriesSectionExpanded((prev) => !prev);
              }}
            />
            <Box width="1rem" height="1rem" flexShrink={0}>
              <FeatureIcon width="100%" height="100%" />
            </Box>
            <Text fontSize="12px" fontWeight="medium" noOfLines={1}>
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
              <Text color={colors.text}>
                {userStories?.length} User Stories
              </Text>
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
            colorScheme="blue"
            borderRadius="50px"
            textTransform="capitalize"
            fontSize="9px"
            flexShrink={0}
          >
            {featureStatusToLabelMapper[status]}
          </Badge>
        </Td>
        <Td textAlign="center" py="0.5rem">
          <Flex justify="center">
            <Avatar color="white" size="xs" name="Ali Belkhadi" />
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
                openFeatureModal();
              }}
              isOpen={isActionsOpen}
              onChange={(newValue) => {
                setIsActionsOpen(newValue);
              }}
            />
          </Flex>
        </Td>
      </Tr>
      {isStoriesSectionExpanded && (
        <>
          {userStories?.map((story) => (
            <UserStory key={story?.id} {...story} />
          ))}
          <Tr
            borderBlock="1px solid"
            borderColor={colors.border}
            _hover={{ bg: colors.body }}
          >
            <Td paddingStart="5.35rem" py="0.75rem">
              <Flex
                align="center"
                gap={1.5}
                cursor="pointer"
                onClick={() => {
                  openStoryModal();
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
                  Ajouter une user story
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
      <UserStoryMutationModal
        isOpen={isStoryModalOpen}
        onClose={closeStoryModal}
        isManualFlow={false}
        featureId={id}
      />
      <FeatureMutationModal
        isUpdate
        isOpen={isFeatureModalOpen}
        onClose={closeFeatureModal}
        updateData={{
          name,
          description,
          priority,
          status,
          featureId: id,
        }}
      />
      <ConfirmationModal
        isLoading={isDeletingFeature}
        ConfirmationLabel="Supprimer"
        title="Supprimer la feature"
        description={`Êtes-vous sûr de vouloir supprimer la feature "${name}" ? Cette action est irréversible.`}
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        isDeleteModal
        onConfirm={() => {
          deleteFeature(
            { id },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({
                  queryKey: [SPECIFICATIONS_QUERIES_PREFIX, GET_EPICS],
                  exact: false,
                });

                toast({
                  title: "Feature supprimé",
                  description: "La feature a été supprimé définitivement",
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
      <FeatureInfoModal
        isOpen={isFeatureInfoModalOpen}
        onClose={closeFeatureInfoModal}
        id={id}
        name={name}
        description={description}
        status={status}
        priority={priority}
        creationDate={creationDate}
        userStories={userStories}
      />
      <TagManagementModal
        isOpen={isTagModalOpen}
        onClose={closeTagModal}
        currentTag={tag}
        onSelectTag={handleSelectTag}
        onRemoveTag={tag ? handleRemoveTag : undefined}
        entityType="feature"
        entityName={name}
      />
    </>
  );
}
