import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  Select,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import { useSelector } from "react-redux";
import { selectedProjectSelector } from "@/app/slices/projectSlice";
import { useExportDocumentMutation, useGetProjectsQuery } from "@/services";

type DocumentType = "cahier" | "fsd";
type DocumentFormat = "pdf" | "word" | "excel";

const documentCards: any[] = [
  {
    id: "cahier",
    title: "Cahier de recette",
    description:
      "Document de validation fonctionnelle et scénarios de test complets pour votre projet.",
    status: "ready",
    exportButtons: [
      { label: "Word", documentType: "cahier", format: "word" },
      { label: "PDF", documentType: "cahier", format: "pdf" },
      { label: "Excel", documentType: "cahier", format: "excel" },
    ],
  },
  {
    id: "fsd",
    title: "Spécification fonctionnelle",
    description:
      "Description détaillée des besoins fonctionnels et règles métier du système.",
    status: "ready",
    exportButtons: [
      { label: "Word", documentType: "fsd", format: "word" },
      { label: "PDF", documentType: "fsd", format: "pdf" },
    ],
  },
  {
    id: "manual",
    title: "Manuel d'utilisation",
    description:
      "Guide utilisateur clair avec procédures détaillées et captures d'écran.",
    status: "pending",
    exportButtons: [],
  },
];

export default function DocumentGenerationPage() {
  const [language, setLanguage] = useState("fr");
  const [currentExportKey, setCurrentExportKey] = useState<string | null>(null);

  const { data: projects = [] } = useGetProjectsQuery();
  const exportMutation = useExportDocumentMutation();
  const selectedProject: any = useSelector(selectedProjectSelector);

  useEffect(() => {
    console.log("API call disabled for migration step");
  }, []);

  const triggerExport = (key: string, payload: any) => {
    if (!selectedProject?.id) {
      return;
    }

    setCurrentExportKey(key);
    exportMutation.mutate(payload, {
      onError: (error) => {
        console.error("Document export failed:", error);
      },
      onSettled: () => {
        setCurrentExportKey(null);
      },
    });
  };

  const isExporting = exportMutation.isPending;

  return (
    <Box minH="100vh" bg="gray.50">
      <Box maxW="7xl" mx="auto" px={{ base: 4, md: 6 }} py={{ base: 8, md: 10 }}>
        <Box textAlign="center" mb={12}>
          <Heading size="lg" color="gray.800" mb={3}>
            Gestionnaire de Documents
          </Heading>
          <Text color="gray.600" maxW="2xl" mx="auto">
            Gérez, générez et exportez vos livrables documentaires en toute simplicité.
          </Text>
        </Box>

        <Flex
          flexDirection={{ base: "column", md: "row" }}
          alignItems={{ base: "stretch", md: "end" }}
          justifyContent="center"
          gap={6}
          mb={12}
        >
          <Box w={{ base: "100%", md: "sm" }}>
            <Text fontSize="sm" fontWeight="semibold" mb={2} color="gray.700">
              Langue
            </Text>
            <Select
              value={language}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                setLanguage(event.target.value)
              }
              bg="white"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </Select>
          </Box>
        </Flex>

        <Flex alignItems="center" justifyContent="space-between" mb={6}>
          <Text
            fontSize="sm"
            fontWeight="bold"
            color="gray.500"
            textTransform="uppercase"
            letterSpacing="wide"
          >
            Types de documents
          </Text>
          <Badge colorScheme="blue" variant="subtle" px={3} py={1} borderRadius="full">
            {projects.length} projet(s)
          </Badge>
        </Flex>

        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={6} mb={12}>
          {documentCards.map((doc) => (
            <Box
              key={doc.id}
              bg="white"
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="xl"
              p={6}
              boxShadow="sm"
              transition="all 0.2s ease"
              _hover={{ boxShadow: "lg", borderColor: "blue.200" }}
            >
              <Flex alignItems="start" justifyContent="space-between" mb={4}>
                <Box
                  w={12}
                  h={12}
                  borderRadius="lg"
                  bg="gray.100"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="gray.500"
                  fontWeight="bold"
                >
                  {doc.title.slice(0, 1)}
                </Box>
                <Badge
                  colorScheme={doc.status === "ready" ? "green" : doc.status === "draft" ? "orange" : "blue"}
                  variant="subtle"
                >
                  {doc.status === "ready" ? "PRÊT" : doc.status === "draft" ? "BROUILLON" : "EN ATTENTE"}
                </Badge>
              </Flex>

              <Heading size="md" mb={2} color="gray.800">
                {doc.title}
              </Heading>
              <Text fontSize="sm" color="gray.600" mb={6} noOfLines={3}>
                {doc.description}
              </Text>

              {doc.exportButtons.length > 0 ? (
                <Grid templateColumns={doc.id === "cahier" ? "repeat(3, 1fr)" : "repeat(2, 1fr)"} gap={2}>
                  {doc.exportButtons.map((button: any) => (
                    <Button
                      key={`${doc.id}-${button.label}`}
                      size="sm"
                      colorScheme="blue"
                      isDisabled={!selectedProject || isExporting}
                      isLoading={isExporting && currentExportKey === `${doc.id}-${button.label}`}
                      onClick={() =>
                        triggerExport(`${doc.id}-${button.label}`, {
                          projectId: selectedProject.id,
                          documentType: button.documentType as DocumentType,
                          format: button.format as DocumentFormat,
                        })
                      }
                    >
                      Exporter {button.label}
                    </Button>
                  ))}
                </Grid>
              ) : (
                <Button size="sm" variant="outline" w="full" isDisabled>
                  Prévisualiser
                </Button>
              )}
            </Box>
          ))}
        </SimpleGrid>

        <Box
          borderWidth="2px"
          borderStyle="dashed"
          borderColor="gray.300"
          borderRadius="xl"
          p={{ base: 8, md: 12 }}
          textAlign="center"
          bg="white"
          _hover={{ borderColor: "blue.200", bg: "blue.50" }}
          transition="all 0.2s ease"
        >
          <Box
            w={16}
            h={16}
            borderRadius="full"
            bg="gray.100"
            mx="auto"
            mb={4}
            display="flex"
            alignItems="center"
            justifyContent="center"
            color="gray.500"
            fontSize="2xl"
          >
            +
          </Box>
          <Heading size="md" mb={2} color="gray.800">
            Besoin d'un autre format ?
          </Heading>
          <Text color="gray.600" maxW="2xl" mx="auto">
            Personnalisez vos propres modèles d'exportation ou contactez notre équipe pour des besoins spécifiques.
          </Text>
        </Box>

        {exportMutation.isError ? (
          <Text mt={4} color="red.600" fontSize="sm">
            {exportMutation.error instanceof Error
              ? exportMutation.error.message
              : "Export failed."}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}
