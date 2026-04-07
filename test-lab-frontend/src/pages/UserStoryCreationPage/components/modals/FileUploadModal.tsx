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
  useDisclosure,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { useFormik } from "formik";
import { useRef, useState } from "react";
import * as Yup from "yup";
import Plus from "@/assets/svg/plus.svg?react";
import  FilePicker from "@/components/FilePicker/FilePicker";
import { FeatureSelector } from "../FeatureSelector";
import { IFeature } from "@/services";

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  features: IFeature[];
  isLoadingFeatures?: boolean;
  onSubmit: (data: { file: File | FileList; featureId: string }) => void;
}

const validationSchema = Yup.object({
  file: Yup.mixed().required("Le fichier est requis"),
  featureId: Yup.string().required("La feature est requise"),
});

export default function FileUploadModal({
  isOpen,
  onClose,
  features,
  isLoadingFeatures = false,
  onSubmit,
}: FileUploadModalProps) {
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
    if (!values.file || !values.featureId) return;

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

      // enforce PDF only
      const isPdf = fileToSend.type === "application/pdf" || fileToSend.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        toast({ title: "Fichier non pris en charge", description: "Seuls les fichiers PDF sont acceptés.", status: "warning", duration: 4000 });
        setFieldValue("file", null);
        setIsSubmitting(false);
        return;
      }

      await onSubmit({
        file: fileToSend,
        featureId: values.featureId,
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
        description:
          err?.message || "Erreur lors du téléchargement du fichier",
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
              Télécharger un fichier
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
                  label="Fichier"
                  isRequired
                  isInvalid={!!(touched.file && errors.file)}
                  errorMessage={errors.file as string}
                  placeholder="Choisir un fichier..."
                  fontSize="13px"
                  accept="application/pdf, .pdf"
                  multiple={false}
                  value={values.file}
                  onChange={(file) => setFieldValue("file", file)}
                />
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
        description={`Êtes-vous sûr de vouloir télécharger ce fichier?`}
        onConfirm={confirmRequest}
      />
    </>
  );
}