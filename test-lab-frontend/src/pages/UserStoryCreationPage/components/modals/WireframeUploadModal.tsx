import { ConfirmationModal } from "@/components";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  Flex,
  Icon,
  Textarea,
  useDisclosure,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { useFormik } from "formik";
import { useRef, useState } from "react";
import * as Yup from "yup";
import Plus from "@/assets/svg/plus.svg?react";
import FilePicker from "@/components/FilePicker/FilePicker";
import { FeatureSelector } from "../FeatureSelector";
import { IFeature } from "@/services";

interface WireframeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  features: IFeature[];
  isLoadingFeatures?: boolean;
  onSubmit: (data: {
    file: File | FileList;
    featureId: string;
    description: string;
  }) => void;
}

const validationSchema = Yup.object({
  file: Yup.mixed().required("Le fichier est requis"),
  featureId: Yup.string().required("La feature est requise"),
  description: Yup.string().required("La description est requise"),
});

export default function WireframeUploadModal({
  isOpen,
  onClose,
  features,
  isLoadingFeatures = false,
  onSubmit,
}: WireframeUploadModalProps) {
  const {
    isOpen: isConfirmationModalOpen,
    onClose: closeConfirmationModal,
    onOpen: openConfirmationModal,
  } = useDisclosure();
  const toast = useToast();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { values, handleSubmit, errors, touched, setFieldValue, resetForm } =
    useFormik({
      initialValues: {
        file: null as File | FileList | null,
        featureId: "",
        description: "",
      },
      validationSchema,
      onSubmit: () => {
        onClose();
        openConfirmationModal();
      },
    });

  const handleModalClose = () => {
    resetForm();
    onClose();
  };

  const confirmRequest = async () => {
    if (!values.file || !values.featureId || !values.description) return;

    setIsSubmitting(true);
    try {
      // normalize file (File or FileList)
      const rawFile = values.file as File | FileList | null;
      let fileToSend: File | null = null;
      if (!rawFile) throw new Error("Aucun fichier fourni");
      if ((rawFile as FileList).item) {
        const fl = rawFile as FileList;
        if (fl.length === 0) throw new Error("Aucun fichier fourni");
        fileToSend = fl[0];
      } else {
        fileToSend = rawFile as File;
      }

      // enforce image only
      const isImage =
        fileToSend.type.startsWith("image/") ||
        /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileToSend.name);
      if (!isImage) {
        toast({
          title: "Fichier non pris en charge",
          description: "Seuls les fichiers image sont acceptés.",
          status: "warning",
          duration: 4000,
        });
        setFieldValue("file", null);
        setIsSubmitting(false);
        return;
      }

      console.log("PAYLOAD", {
        file: fileToSend,
        featureId: values.featureId,
        description: values.description,
      });

      await onSubmit({
        file: fileToSend,
        featureId: values.featureId,
        description: values.description,
      });

      toast({
        title: "Fichier téléchargé",
        description: "Le fichier a été téléchargé avec succès",
        status: "success",
        duration: 3000,
      });

      closeConfirmationModal();
      resetForm();
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Téléchargement impossible",
        description: err?.message || "Erreur lors du téléchargement du fichier",
        status: "error",
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AlertDialog
        leastDestructiveRef={cancelRef}
        isOpen={isOpen}
        onClose={handleModalClose}
        autoFocus={false}
      >
        <AlertDialogOverlay zIndex={9999}>
          <AlertDialogContent width="550px" maxWidth="90vw">
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Télécharger un wireframe
            </AlertDialogHeader>
            <Flex
              width="2rem"
              height="2rem"
              bg="gray.100"
              borderRadius=".5rem"
              justifyContent="center"
              alignItems="center"
              cursor="pointer"
              transition=".3s"
              position="absolute"
              top="1rem"
              right="1rem"
              onClick={handleModalClose}
              _hover={{ bg: "gray.200" }}
            >
              <Icon
                color="gray.600"
                width="1.25rem"
                height="1.25rem"
                style={{ transform: "rotate(45deg)" }}
                as={Plus}
              />
            </Flex>
            <AlertDialogBody>
              <VStack spacing={4} align="stretch">
                <FeatureSelector
                  features={features}
                  selectedFeatureId={values.featureId}
                  onFeatureChange={(featureId) =>
                    setFieldValue("featureId", featureId)
                  }
                  isLoading={isLoadingFeatures}
                  error={touched.featureId ? errors.featureId : null}
                  isRequired
                />

                <FilePicker
                  label="Image du wireframe"
                  isRequired
                  isInvalid={!!(touched.file && errors.file)}
                  errorMessage={errors.file as string}
                  placeholder="Choisir une image..."
                  fontSize="13px"
                  accept="image/*"
                  multiple={false}
                  value={values.file}
                  onChange={(file) => setFieldValue("file", file)}
                />

                <Textarea
                  placeholder="Description du wireframe..."
                  value={values.description}
                  onChange={(e) => setFieldValue("description", e.target.value)}
                  isInvalid={!!(touched.description && errors.description)}
                  errorBorderColor="red.300"
                  size="sm"
                  resize="vertical"
                  minHeight="80px"
                />
                {touched.description && errors.description && (
                  <div style={{ color: "red", fontSize: "12px" }}>
                    {errors.description}
                  </div>
                )}
              </VStack>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                ref={cancelRef}
                fontSize="13px"
                bg="gray.100"
                color="gray.600"
                onClick={handleModalClose}
                _hover={{
                  backgroundColor: "gray.200",
                }}
              >
                Annuler
              </Button>
              <Button
                fontSize="13px"
                bg="blue.500"
                color="white"
                _hover={{
                  backgroundColor: "blue.600",
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
                ml={3}
              >
                Télécharger
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      <ConfirmationModal
        isLoading={isSubmitting}
        onClose={closeConfirmationModal}
        isOpen={isConfirmationModalOpen}
        title="Confirmation"
        ConfirmationLabel="Confirmer le téléchargement"
        description={`Êtes-vous sûr de vouloir télécharger ce wireframe?`}
        onConfirm={confirmRequest}
      />
    </>
  );
}
