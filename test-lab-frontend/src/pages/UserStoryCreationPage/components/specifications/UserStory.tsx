import {
  Tr,
  Flex,
  Text,
  Td,
  Badge,
  Avatar,
  AvatarGroup,
  Box,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import Story from "@/assets/svg/story.svg?react";
import { colors } from "@/theme/colors";
import {
  GET_EPICS,
  ITag,
  IUpdateUserStoryPayload,
  IUserStory,
  SPECIFICATIONS_QUERIES_PREFIX,
  StoryStatus,
  useDeleteUserStoryByIdMutation,
  useUpdateUserStoryMutation,
} from "@/services";
import moment from "moment";
import { ActionsMenu, ConfirmationModal } from "@/components";
import { useState } from "react";
import { queryClient } from "@/App";
import UserStoryMutationModal from "../modals/UserStoryMutationModal";
import UserStoryInfoModal from "../modals/UserStoryInfoModal";
import Tag from "./Tag";
import TagManagementModal from "../modals/TagManagementModal";

export const StoryStatusToLabelMapper: Record<StoryStatus, string> = {
  [StoryStatus.TO_DO]: "À faire",
  [StoryStatus.IN_PROGRESS]: "En cours",
  [StoryStatus.DONE]: "Terminé",
  [StoryStatus.BLOCKED]: "Bloqué",
};

export default function UserStory({
  name,
  creationDate,
  status,
  id,
  priority,
  description,
  attachment,
  testCases,
  tag,
}: IUserStory) {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  // const [isTestCasesSectionExpanded, setIsTestCasesSectionExpanded] =
  //   useState(false);
  const {
    isOpen: isDeleteModalOpen,
    onClose: closeDeleteModal,
    onOpen: openDeleteModal,
  } = useDisclosure();
  const {
    isOpen: isStoryModalOpen,
    onClose: closeStoryModal,
    onOpen: openStoryModal,
  } = useDisclosure();
  const {
    isOpen: isStoryInfoModalOpen,
    onClose: closeStoryInfoModal,
    onOpen: openStoryInfoModal,
  } = useDisclosure();
  const {
    isOpen: isTagModalOpen,
    onClose: closeTagModal,
    onOpen: openTagModal,
  } = useDisclosure();
  const { mutate: deleteUserStory, isPending: isDeletingUserStory } =
    useDeleteUserStoryByIdMutation();
  const { mutate: updateUserStory } = useUpdateUserStoryMutation();
  const toast = useToast();

  const handleSelectTag = (selectedTag: ITag) => {
    updateUserStory(
      {
        storyId: id,
        tagId: selectedTag.id,
        priority,
        status,
        description,
        name,
        attachment,
      },
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
    updateUserStory(
      {
        storyId: id,
        tagId: null,
        priority,
        status,
        description,
        name,
        attachment,
      } as IUpdateUserStoryPayload,
      {
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
      }
    );
  };

  return (
    <>
      <Tr
        borderBlock="1px solid"
        borderColor={colors.border}
        _hover={{ bg: colors.body }}
      >
        <Td
          paddingStart="5.5rem"
          py="1rem"
          cursor="pointer"
          maxW={{ base: "375px", "2xl": undefined }}
          onClick={() => {
            openStoryInfoModal();
          }}
        >
          <Flex align="center" gap={1.5}>
            {/* <IconButton
              icon={
                <Box
                  as={Arrow}
                  width="1rem"
                  height="1rem"
                  sx={{
                    transform: isTestCasesSectionExpanded
                      ? "rotate(-180deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.3s ease-in-out",
                  }}
                />
              }
              size="xs"
              variant="ghost"
              aria-label="Toggle test cases"
              minW="auto"
              onClick={(e) => {
                e.stopPropagation();
                setIsTestCasesSectionExpanded((prev) => !prev);
              }}
            /> */}
            <Box width="1rem" height="1rem" flexShrink={0}>
              <Story width="100%" height="100%" />
            </Box>
            <Text
              fontWeight="medium"
              fontSize="12px"
              noOfLines={1}
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
            >
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
                {testCases?.length || 0} Test Cases
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
            colorScheme="purple"
            borderRadius="50px"
            textTransform="capitalize"
            fontSize="9px"
            flexShrink={0}
          >
            {StoryStatusToLabelMapper[status]}
          </Badge>
        </Td>
        <Td textAlign="center" py="0.5rem">
          <Flex justify="center">
            <Avatar color="white" size="xs" name="Ali Belkadhi" />
          </Flex>
        </Td>
        <Td textAlign="center" py="0.5rem">
          <Flex justify="center">
            <AvatarGroup size="xs" max={1} spacing="-0.4rem">
              <Avatar bg={colors.blue} color={colors.white} name="Assignee" />
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
                openStoryModal();
              }}
              isOpen={isActionsOpen}
              onChange={(newValue) => {
                setIsActionsOpen(newValue);
              }}
            />
          </Flex>
        </Td>
      </Tr>
      {/* {isTestCasesSectionExpanded && (
        <>
          {testCases?.map((testCase) => (
            <TestCase key={testCase?.id} {...testCase} />
          ))}
          <Tr
            borderBlock="1px solid"
            borderColor={colors.border}
            _hover={{ bg: colors.body }}
          >
            <Td paddingStart="6.75rem" py="0.75rem">
              <Flex
                align="center"
                gap={1.5}
                cursor="pointer"
                onClick={() => {
                  // openTestCaseModal();
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
                  Ajouter un test case
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
      )} */}
      {/* <TestCaseMutationModal
        isOpen={isTestCaseModalOpen}
        onClose={closeTestCaseModal}
        userStoryId={id}
      /> */}
      <UserStoryMutationModal
        isManualFlow={false}
        isUpdate
        isOpen={isStoryModalOpen}
        onClose={closeStoryModal}
        updateData={{
          name,
          description,
          status,
          priority,
          storyId: id,
          attachment,
          tagId: tag?.id,
        }}
      />
      <ConfirmationModal
        isLoading={isDeletingUserStory}
        ConfirmationLabel="Supprimer"
        title="Supprimer la user story"
        description={`Êtes-vous sûr de vouloir supprimer la user story "${name}" ? Cette action est irréversible.`}
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        isDeleteModal
        onConfirm={() => {
          deleteUserStory(
            { id },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({
                  queryKey: [SPECIFICATIONS_QUERIES_PREFIX, GET_EPICS],
                  exact: false,
                });

                toast({
                  title: "User Story supprimé",
                  description: "La user story a été supprimé définitivement",
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
      <UserStoryInfoModal
        isOpen={isStoryInfoModalOpen}
        onClose={closeStoryInfoModal}
        id={id}
        name={name}
        description={description}
        status={status}
        priority={priority}
        creationDate={creationDate}
        attachment={attachment}
        testCases={testCases}
      />
      <TagManagementModal
        isOpen={isTagModalOpen}
        onClose={closeTagModal}
        currentTag={tag}
        onSelectTag={handleSelectTag}
        onRemoveTag={tag ? handleRemoveTag : undefined}
        entityType="user-story"
        entityName={name}
      />
    </>
  );
}
