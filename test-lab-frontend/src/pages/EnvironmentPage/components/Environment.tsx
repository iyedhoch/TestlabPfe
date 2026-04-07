import { colors } from "@/theme/colors";
import {
  Flex,
  useDisclosure,
  useToast,
  Tr,
  Td,
  Skeleton,
} from "@chakra-ui/react";
import {
  GET_PAGINATED_ENVIRONMENTS,
  IEnvironment,
  ENVIRONMENT_QUERIES_PREFIX,
  useDeleteEnvironmentMutation,
} from "@/services";
import { queryClient } from "@/App";
import { ActionsMenu, ConfirmationModal } from "@/components";
import EnvironmentMutationModal from "./modals/EnvironmentMutationModal";
import { useState } from "react";
import EnvironmentInfoModal from "./modals/EnvironmentInfoModal";
import moment from "moment/min/moment-with-locales";

moment.locale("fr");

interface IEnvironmentExtras extends IEnvironment {
  isGray: boolean;
  isLoading?: boolean;
}

export default function Environment({
  id,
  name,
  url,
  description,
  envItems,
  status,
  createdAt,
  updatedAt,
  isGray,
  isLoading,
  projectId,
}: IEnvironmentExtras) {
  const toast = useToast();
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const {
    isOpen: isEnvironmentUpdateModalOpen,
    onClose: closeEnvironmentUpdateModal,
    onOpen: openEnvironmentUpdateModal,
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
  const { mutate: deleteEnvironment, isPending: isDeletingEnvironment } =
    useDeleteEnvironmentMutation();

  const handleDelete = () => {
    deleteEnvironment(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: [ENVIRONMENT_QUERIES_PREFIX, GET_PAGINATED_ENVIRONMENTS],
          });

          toast({
            title: "Environnement supprimé",
            description: "L'environnement a été supprimé définitivement",
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
      <Tr background={isGray ? colors.body : colors.white}>
        <Td width="10%" fontSize="14px" textAlign="center">
          {name}
        </Td>
        <Td fontSize="14px" textAlign="center">
          {status}
        </Td>
        {/* <Td fontSize="14px" cursor="pointer" textAlign="center">
          {description}
        </Td> */}
        <Td
          fontSize="14px"
          textAlign="center"
          color="blue.500"
          textDecoration="underline"
          cursor="pointer"
          onClick={() => window.open(url, "_blank")}
        >
          {`${url?.slice(0, 22)}...`}
        </Td>
        {/* <Td fontSize="14px" cursor="pointer" textAlign="center">
          {moment(createdAt).fromNow()}
        </Td> */}
        <Td fontSize="14px" textAlign="center">
          {moment(updatedAt).fromNow()}
        </Td>
        <Td textAlign="center">
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
              onEdit={openEnvironmentUpdateModal}
              onView={openInfoModal}
            />
          </Flex>
        </Td>
      </Tr>
      <EnvironmentInfoModal
        isOpen={isInfoModalOpen}
        onClose={closeInfoModal}
        id={id}
        name={name}
        url={url}
        description={description}
        envItems={envItems}
        status={status}
        createdAt={createdAt}
        updatedAt={updatedAt}
        projectId={projectId}
      />
      <EnvironmentMutationModal
        setIsActionsOpen={setIsActionsOpen}
        closeEnvironmentModal={closeEnvironmentUpdateModal}
        isEnvironmentModalOpen={isEnvironmentUpdateModalOpen}
        isUpdateModal
        updateData={{
          id,
          name,
          url,
          description,
          envItems: envItems as any,
          status,
        }}
      />
      <ConfirmationModal
        isDeleteModal
        isOpen={isConfirmationModalOpen}
        onClose={closeConfirmationModal}
        onConfirm={handleDelete}
        isLoading={isDeletingEnvironment}
        ConfirmationLabel="Supprimer"
        title="Supprimer l'environnement"
        description={`Êtes-vous sûr de vouloir supprimer l'environnement '${name}' ? Cette action est irréversible.`}
      />
    </>
  );
}
