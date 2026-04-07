import { colors } from "@/theme/colors";
import {
  Flex,
  useDisclosure,
  useToast,
  Tr,
  Td,
  Skeleton,
  Checkbox,
} from "@chakra-ui/react";
import moment from "moment";
import {
  GET_PAGINATED_PROJECTS,
  GET_PROJECTS,
  IProject,
  PROJECT_QUERIES_PREFIX,
  ProjectStatus,
  useDeleteProjectMutation,
} from "@/services";
import { queryClient } from "@/App";
import { ActionsMenu, ConfirmationModal } from "@/components";
import ProjectMutationModal from "./modals/ProjectMutationModal";
import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  selectedProjectSelector,
  setSelectedProject,
} from "@/app/slices/projectSlice";
import ProjectInfoModal from "./modals/ProjectInfoModal";

export const projectStatusToLabelMapper: Record<ProjectStatus, string> = {
  [ProjectStatus.ACTIVE]: "Actif",
  [ProjectStatus.ARCHIVED]: "Archivé",
  [ProjectStatus.COMPLETED]: "Terminé",
  [ProjectStatus.ON_HOLD]: "En attente",
};

interface IProjectExtras extends IProject {
  isGray: boolean;
  isLoading?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export default function Project({
  id,
  description,
  name,
  creationDate,
  isGray,
  attachment,
  isLoading,
  isSelected = false,
  onToggleSelect,
  status,
  prefix,
  figmaLink,
}: IProjectExtras) {
  const toast = useToast();
  const dispatch = useDispatch();
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const {
    isOpen: isProjectUpdateModalOpen,
    onClose: closeProjectUpdateModal,
    onOpen: openProjectCreationModal,
  } = useDisclosure();
  const {
    isOpen: isInfoModalOpen,
    onClose: closeInfoModal,
    onOpen: openInfoModal,
  } = useDisclosure();
  const {
    isOpen: isConfirmationModalOpen,
    onClose: closeConfirmationModal,
    onOpen: openConfirmationModal,
  } = useDisclosure();
  const { mutate: deleteProject, isPending: isDeletingProject } =
    useDeleteProjectMutation();
  const selectedProject = useSelector(selectedProjectSelector);

  const isCurrentProjectFocused = useMemo(() => {
    return selectedProject?.id === id;
  }, [selectedProject, id]);

  const handleDelete = () => {
    deleteProject(
      {
        id,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: [PROJECT_QUERIES_PREFIX, GET_PAGINATED_PROJECTS],
          });

          queryClient.invalidateQueries({
            queryKey: [PROJECT_QUERIES_PREFIX, GET_PROJECTS],
          });

          toast({
            title: "Projet supprimé",
            description: "Le projet a été supprimé définitivement",
            status: "success",
            duration: 3000,
          });
          closeConfirmationModal();
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
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onToggleSelect?.();
  };

  if (isLoading) {
    return (
      <Tr background={isGray ? colors.body : colors.white}>
        <Td textAlign="center">
          <Skeleton height="20px" borderRadius="md" />
        </Td>
        <Td textAlign="center">
          <Skeleton height="20px" borderRadius="md" />
        </Td>
        <Td textAlign="center">
          <Skeleton height="20px" borderRadius="md" />
        </Td>
        <Td textAlign="center">
          <Skeleton height="20px" borderRadius="md" />
        </Td>
        <Td textAlign="center">
          <Skeleton height="20px" borderRadius="md" />
        </Td>
        <Td textAlign="center">
          <Flex height="42px" justifyContent="center" alignItems="center">
            <Skeleton height="32px" width="32px" borderRadius="md" />
          </Flex>
        </Td>
      </Tr>
    );
  }

  return (
    <>
      <Tr
        background={isGray ? colors.body : colors.white}
        onClick={() => {
          dispatch(
            setSelectedProject({
              selectedProject: {
                id,
                description,
                name,
              } as IProject,
            })
          );
        }}
        sx={{
          borderRadius: ".5rem",
          transition:
            "outline .25s ease-in-out, outline-offset .25s ease-in-out",
          ...(isCurrentProjectFocused && {
            outline: `2px solid ${colors.blue}`,
            outlineOffset: "-2px",
          }),
          ...(!isCurrentProjectFocused && {
            outline: "2px solid transparent",
            outlineOffset: "-2px",
          }),
          "& td:first-of-type": {
            borderLeftRadius: ".5rem",
          },
          "& td:last-of-type": {
            borderRightRadius: ".5rem",
          },
        }}
      >
        <Td
          fontSize="14px"
          cursor="pointer"
          textAlign="center"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Checkbox isChecked={isSelected} onChange={handleCheckboxChange} />
        </Td>
        <Td fontSize="14px" cursor="pointer" textAlign="center">
          {name}
        </Td>
        <Td fontSize="14px" cursor="pointer" textAlign="center">
          {description}
        </Td>
        <Td fontSize="14px" cursor="pointer" textAlign="center">
          {projectStatusToLabelMapper[status]}
        </Td>
        <Td fontSize="14px" cursor="pointer" textAlign="center">
          {moment(creationDate).format("DD/MM/YYYY")}
        </Td>
        <Td cursor="pointer" textAlign="center">
          <Flex
            height="42px"
            justifyContent="center"
            transition=".25s"
            position="relative"
          >
            <ActionsMenu
              isOpen={isActionsOpen}
              onChange={setIsActionsOpen}
              onDelete={openConfirmationModal}
              onEdit={openProjectCreationModal}
              onView={openInfoModal}
            />
          </Flex>
        </Td>
      </Tr>
      <ProjectInfoModal
        isOpen={isInfoModalOpen}
        onClose={closeInfoModal}
        attachment={attachment}
        creationDate={creationDate}
        description={description}
        name={name}
        status={status}
        prefix={prefix}
        figmaLink={figmaLink}
        id={id}
      />
      <ProjectMutationModal
        setIsActionsOpen={setIsActionsOpen}
        closeProjectModal={closeProjectUpdateModal}
        isProjectModalOpen={isProjectUpdateModalOpen}
        isUpdateModal
        updateData={{
          id,
          name,
          description,
          attachment: attachment as string,
          prefix,
          status,
          figmaLink,
        }}
      />
      <ConfirmationModal
        isDeleteModal
        isOpen={isConfirmationModalOpen}
        onClose={closeConfirmationModal}
        onConfirm={handleDelete}
        isLoading={isDeletingProject}
        ConfirmationLabel="Supprimer"
        title="Supprimer le projet"
        description={`Êtes-vous sûr de vouloir supprimer le project '${name}' ? Cette
            action est irréversible.`}
      />
    </>
  );
}
