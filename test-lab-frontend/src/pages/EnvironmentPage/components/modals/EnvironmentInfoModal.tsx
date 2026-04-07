import { IEnvironment } from "@/services";
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
  Flex,
  Icon,
} from "@chakra-ui/react";
import moment from "moment";
import { useRef } from "react";
import Copy from "@/assets/svg/copy.svg?react";

interface IEnvironmentInfoModal extends IEnvironment {
  isOpen: boolean;
  onClose: () => void;
}

export default function EnvironmentInfoModal({
  name,
  url,
  description,
  status,
  createdAt,
  updatedAt,
  envItems,
  isOpen,
  onClose,
}: IEnvironmentInfoModal) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <AlertDialog
      leastDestructiveRef={cancelRef}
      isOpen={isOpen}
      onClose={onClose}
      autoFocus={false}
      isCentered
    >
      <AlertDialogOverlay>
        <AlertDialogContent w="900px" maxW="95vw">
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Informations de l'environnement
          </AlertDialogHeader>

          <AlertDialogBody maxH="70vh" overflowY="auto">
            <Flex flexDirection="column" gap="1.5rem">
              {/* Environment Details Section */}
              <Grid gridTemplateColumns="repeat(3, 1fr)" gap="1rem">
                <Box
                  bg={colors.body}
                  p="1rem"
                  borderRadius=".75rem"
                  border="1px solid"
                  borderColor={colors.border}
                >
                  <Text fontSize="13px" fontWeight="bold" color="gray.700">
                    Nom
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
                    {status}
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
                    URL
                  </Text>
                  <Text
                    fontSize="12px"
                    mt="0.25rem"
                    color="blue.500"
                    cursor="pointer"
                    textDecoration="underline"
                    onClick={() => window.open(url, "_blank")}
                    noOfLines={1}
                  >
                    {url}
                  </Text>
                </Box>

                <Box
                  gridColumn="span 3"
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
                    {moment(createdAt).format("DD/MM/YYYY")}
                  </Text>
                </Box>

                <Box
                  bg={colors.body}
                  p="1rem"
                  borderRadius=".75rem"
                  border="1px solid"
                  borderColor={colors.border}
                  gridColumn="span 2"
                >
                  <Text fontSize="13px" fontWeight="bold" color="gray.600">
                    Date de dernière modification
                  </Text>
                  <Text fontSize="12px" mt="0.25rem">
                    {moment(updatedAt).format("DD/MM/YYYY")}
                  </Text>
                </Box>
              </Grid>

              {/* Environment Items Section */}
              {envItems && envItems.length > 0 && (
                <Flex flexDirection="column" gap="1rem">
                  <Text fontSize="15px" fontWeight="600" color="gray.700">
                    Identifiants de l'Environnement ({envItems.length})
                  </Text>

                  <Grid gap=".75rem">
                    {/* Header */}
                    <Grid
                      gridTemplateColumns="1fr 2fr auto"
                      gap="1rem"
                      paddingX=".5rem"
                    >
                      <Text fontSize="13px" fontWeight="600" color="gray.600">
                        Clé
                      </Text>
                      <Text fontSize="13px" fontWeight="600" color="gray.600">
                        Valeur
                      </Text>
                      <Box width="2rem" />
                    </Grid>

                    {/* Items */}
                    {envItems.map((item, index) => (
                      <Grid
                        key={index}
                        gridTemplateColumns="1fr 2fr auto"
                        gap="1rem"
                        alignItems="center"
                        bg={colors.body}
                        p=".75rem"
                        borderRadius=".5rem"
                        border="1px solid"
                        borderColor={colors.border}
                      >
                        <Text
                          fontSize="13px"
                          fontWeight="500"
                          color={colors.blue}
                        >
                          {item.environmentKey}
                        </Text>
                        <Text fontSize="13px" color="gray.700" noOfLines={1}>
                          {item.value}
                        </Text>
                        <Flex
                          width="2.25rem"
                          height="2.25rem"
                          bg="gray.100"
                          borderRadius=".5rem"
                          justifyContent="center"
                          alignItems="center"
                          cursor="pointer"
                          transition=".3s"
                          _hover={{ bg: "gray.200" }}
                          onClick={() => handleCopyToClipboard(item.value)}
                        >
                          <Icon
                            color="gray.600"
                            width="1rem"
                            height="1rem"
                            as={Copy}
                          />
                        </Flex>
                      </Grid>
                    ))}
                  </Grid>
                </Flex>
              )}

              {(!envItems || envItems.length === 0) && (
                <Box
                  bg={colors.body}
                  p="1.5rem"
                  borderRadius=".75rem"
                  border="1px solid"
                  borderColor={colors.border}
                  textAlign="center"
                >
                  <Text fontSize="13px" color="gray.500">
                    Aucun identifiant d'environnement défini
                  </Text>
                </Box>
              )}
            </Flex>
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
