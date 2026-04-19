import {
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import EditIcon from "@/assets/svg/edit.svg?react";
import TrashIcon from "@/assets/svg/trash.svg?react";
import { ConfirmationModal } from "@/components";
import {
  clearDocumentWorkflowSelection,
  setCahierSuiteSelection,
  setDocumentWorkflowEditContext,
  setFsdEpicSelection,
} from "@/app/slices/documentWorkflowSlice";
import { authRoleSelector } from "@/app/slices/authSlice";
import { selectedProjectSelector } from "@/app/slices/projectSlice";
import {
  IDocumentVersionDetail,
  IDocumentVersionListItem,
  useDeleteDocumentVersionMutation,
  useDownloadDocumentVersionMutation,
  useGetDocumentVersionQuery,
  useListDocumentVersionsQuery,
} from "@/services";
import {
  canCreateAtLeastOneDocument,
  canCreateOrEditDocumentType,
} from "@/utils/auth/permissions";

type DocumentDownloadFormat = "pdf" | "word" | "excel";

function getStatusColor(status: string): string {
  if (status === "Brouillon") {
    return "gray";
  }
  if (status === "En cours") {
    return "orange";
  }
  return "green";
}

function getDocumentTypeLabel(type: string): string {
  return type === "fsd" ? "FSD" : "Cahier";
}

function getFormatOptions(type: string): DocumentDownloadFormat[] {
  if (type === "fsd") {
    return ["pdf", "word"];
  }
  return ["pdf", "word", "excel"];
}

function formatDate(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return input;
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function DownloadIcon() {
  return (
    <Icon viewBox="0 0 24 24" boxSize={4}>
      <path
        fill="currentColor"
        d="M12 3a1 1 0 0 1 1 1v8.17l2.59-2.58a1 1 0 1 1 1.41 1.41l-4.3 4.3a1 1 0 0 1-1.4 0L7 10.99A1 1 0 0 1 8.4 9.58L11 12.17V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z"
      />
    </Icon>
  );
}

export default function DocumentGenerationListPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selectedProject = useSelector(selectedProjectSelector);
  const authRole = useSelector(authRoleSelector);

  const { data: versions = [], isLoading, isError } = useListDocumentVersionsQuery(
    selectedProject?.id,
    Boolean(selectedProject?.id)
  );

  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [deleteVersionId, setDeleteVersionId] = useState<string | null>(null);

  const versionDetailQuery = useGetDocumentVersionQuery(
    editingVersionId || undefined,
    Boolean(editingVersionId)
  );

  const deleteMutation = useDeleteDocumentVersionMutation();
  const downloadMutation = useDownloadDocumentVersionMutation();

  useEffect(() => {
    if (!versionDetailQuery.data || !editingVersionId) {
      return;
    }

    const detail: IDocumentVersionDetail = versionDetailQuery.data;
    const payload = detail.payloadSnapshot as Record<string, unknown>;

    if (detail.documentType === "fsd") {
      dispatch(
        setFsdEpicSelection({
          projectId: detail.projectId,
          selectedEpicIds: (payload.selectedEpicIds as string[]) || [],
          selectedFeatureIds: (payload.selectedFeatureIds as string[]) || [],
          selectedUserStoryIds: (payload.selectedUserStoryIds as string[]) || [],
        })
      );
    } else {
      dispatch(
        setCahierSuiteSelection({
          projectId: detail.projectId,
          selectedSuiteIds: (payload.selectedSuiteIds as string[]) || [],
          selectedTestCaseIds: (payload.selectedTestCaseIds as string[]) || [],
        })
      );
    }

    dispatch(
      setDocumentWorkflowEditContext({
        sourceVersionId: detail.id,
        threadId: detail.threadId,
        sourceVersionNumber: detail.versionNumber,
        status: detail.status,
        createdByName: detail.createdByName,
        payloadSnapshot: payload,
        mode: "edit",
      })
    );

    navigate("/document-generation/Selection-du-contenu");
    setEditingVersionId(null);
  }, [dispatch, editingVersionId, navigate, versionDetailQuery.data]);

  const handleCreateNew = () => {
    if (!canCreateAtLeastOneDocument(authRole)) {
      return;
    }

    dispatch(clearDocumentWorkflowSelection());
    navigate("/document-generation/Selection-du-contenu");
  };

  const handleDelete = () => {
    if (!deleteVersionId) {
      return;
    }

    deleteMutation.mutate(deleteVersionId, {
      onSettled: () => {
        setDeleteVersionId(null);
      },
    });
  };

  const handleDownload = (row: IDocumentVersionListItem, format: DocumentDownloadFormat) => {
    downloadMutation.mutate({ versionId: row.id, format });
  };

  const downloadingVersionId = downloadMutation.isPending
    ? downloadMutation.variables?.versionId || null
    : null;

  if (!selectedProject?.id) {
    return (
      <Box p={6}>
        <Text color="orange.600" fontSize="sm">
          Selectionnez un projet pour afficher les documents generes.
        </Text>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50" px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }}>
      <Flex justify="space-between" align={{ base: "start", md: "center" }} gap={4} mb={6}>
        <Box>
          <Heading size="md" color="gray.800" mb={1}>
            Documents generes
          </Heading>
          <Text fontSize="sm" color="gray.600">
            Projet: {selectedProject.name}
          </Text>
        </Box>

        <Button
          colorScheme="blue"
          borderRadius="full"
          px={5}
          onClick={handleCreateNew}
          isDisabled={!canCreateAtLeastOneDocument(authRole)}
        >
          Creer un nouveau document
        </Button>
      </Flex>

      {isLoading ? (
        <Flex bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" py={16} justify="center" align="center" gap={3}>
          <Spinner size="sm" color="blue.500" />
          <Text fontSize="sm" color="gray.600">
            Chargement des versions...
          </Text>
        </Flex>
      ) : null}

      {!isLoading && isError ? (
        <Box bg="white" borderWidth="1px" borderColor="red.200" borderRadius="xl" p={6}>
          <Text color="red.600" fontSize="sm">
            Impossible de charger la liste des documents generes.
          </Text>
        </Box>
      ) : null}

      {!isLoading && !isError && versions.length === 0 ? (
        <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={10} textAlign="center">
          <VStack spacing={3}>
            <Heading size="sm" color="gray.700">
              Aucun document genere
            </Heading>
            <Text fontSize="sm" color="gray.600">
              Lancez votre premier workflow pour creer une version FSD ou Cahier.
            </Text>
            <Button
              mt={2}
              colorScheme="blue"
              onClick={handleCreateNew}
              isDisabled={!canCreateAtLeastOneDocument(authRole)}
            >
              Creer un nouveau document
            </Button>
          </VStack>
        </Box>
      ) : null}

      {!isLoading && !isError && versions.length > 0 ? (
        <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" overflowX="auto">
          <Table size="md" variant="simple">
            <Thead>
              <Tr>
                <Th>Nom du document</Th>
                <Th>Cree par</Th>
                <Th>Date</Th>
                <Th>Statut</Th>
                <Th textAlign="right" pr={6}>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {versions.map((row) => {
                const availableFormats = getFormatOptions(row.documentType);
                const isRowDownloading = downloadingVersionId === row.id;
                const canEditRow = canCreateOrEditDocumentType(
                  authRole,
                  row.documentType
                );

                return (
                  <Tr key={row.id}>
                    <Td py={4}>
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="semibold" color="gray.800">
                          {row.documentName}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {getDocumentTypeLabel(row.documentType)} • v{row.versionNumber}
                        </Text>
                      </VStack>
                    </Td>
                    <Td py={4}>
                      <HStack spacing={2}>
                        <Avatar
                          size="xs"
                          name={row.createdByName}
                          bg="blue.100"
                          color="blue.700"
                        >
                          {row.createdByInitials}
                        </Avatar>
                        <Text fontSize="sm" color="gray.700">
                          {row.createdByName}
                        </Text>
                      </HStack>
                    </Td>
                    <Td py={4}>
                      <Text fontSize="sm" color="gray.700">
                        {formatDate(row.createdAt)}
                      </Text>
                    </Td>
                    <Td py={4}>
                      <Badge
                        colorScheme={getStatusColor(row.status)}
                        variant="subtle"
                        borderRadius="full"
                        px={3}
                        py={1}
                        fontSize="11px"
                        textTransform="none"
                      >
                        {row.status}
                      </Badge>
                    </Td>
                    <Td py={4}>
                      <HStack spacing={1} justify="flex-end" pr={2}>
                        <Menu placement="bottom-end">
                          <MenuButton
                            as={IconButton}
                            aria-label="Telecharger le document"
                            icon={<DownloadIcon />}
                            variant="ghost"
                            size="sm"
                            borderRadius="full"
                            isDisabled={isRowDownloading}
                            isLoading={isRowDownloading}
                            _hover={{ bg: "blue.50", color: "blue.600" }}
                          />
                          <MenuList minW="120px" py={1}>
                            {availableFormats.map((format) => (
                              <MenuItem
                                key={`${row.id}-${format}`}
                                fontSize="sm"
                                onClick={() => handleDownload(row, format)}
                              >
                                {format.toUpperCase()}
                              </MenuItem>
                            ))}
                          </MenuList>
                        </Menu>

                        <IconButton
                          aria-label="Modifier la version"
                          icon={<EditIcon width="1rem" />}
                          variant="ghost"
                          size="sm"
                          borderRadius="full"
                          onClick={() => setEditingVersionId(row.id)}
                          isDisabled={!canEditRow}
                          isLoading={editingVersionId === row.id && versionDetailQuery.isLoading}
                          _hover={{ bg: "blue.50", color: "blue.600" }}
                        />

                        <IconButton
                          aria-label="Supprimer la version"
                          icon={<TrashIcon width="1rem" />}
                          variant="ghost"
                          size="sm"
                          borderRadius="full"
                          color="red.500"
                          onClick={() => setDeleteVersionId(row.id)}
                          isDisabled={!canEditRow}
                          isLoading={deleteMutation.isPending && deleteMutation.variables === row.id}
                          _hover={{ bg: "red.50", color: "red.600" }}
                        />
                      </HStack>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Box>
      ) : null}

      <ConfirmationModal
        title="Supprimer la version"
        description="Voulez-vous vraiment supprimer cette version ? Cette action est irreversible."
        isOpen={Boolean(deleteVersionId)}
        isLoading={deleteMutation.isPending}
        onClose={() => setDeleteVersionId(null)}
        onConfirm={handleDelete}
        isDeleteModal
        ConfirmationLabel="Supprimer"
      />
    </Box>
  );
}
