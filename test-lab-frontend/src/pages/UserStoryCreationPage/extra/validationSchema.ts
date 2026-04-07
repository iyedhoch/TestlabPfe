import { EpicPriority, EpicStatus } from "@/services";
import * as yup from "yup";

export const epicValidationSchema = yup.object({
  name: yup
    .string()
    .required("Le titre est requis")
    .min(3, "Le titre doit contenir au moins 3 caractères")
    .max(100, "Le titre ne peut pas dépasser 100 caractères"),
  description: yup.string(),
  tagId: yup.string(),
  status: yup
    .string()
    .required("Le statut est requis")
    .oneOf(Object.values(EpicStatus), "Statut invalide"),
  priority: yup
    .string()
    .required("La priorité est requise")
    .oneOf(Object.values(EpicPriority), "Priorité invalide"),
});

export const featureValidationSchema = yup.object({
  name: yup
    .string()
    .required("Le titre est requis")
    .min(3, "Le titre doit contenir au moins 3 caractères")
    .max(100, "Le titre ne peut pas dépasser 100 caractères"),
  description: yup.string(),
  status: yup.string().required("Le statut est requis"),
  priority: yup.string().required("La priorité est requise"),
});

export const getUserStoryValidationSchema = (
  isUpdate: boolean,
  isManualFlow: boolean
) =>
  yup.object({
    name: yup
      .string()
      .required("Le titre est requis")
      .min(3, "Le titre doit contenir au moins 3 caractères")
      .max(100, "Le titre ne peut pas dépasser 100 caractères"),
    description: yup.string(),
    status: yup.string().required("Le statut est requis"),
    priority: yup.string().required("La priorité est requise"),
    epicId: isUpdate
      ? yup.string().notRequired()
      : isManualFlow
      ? yup.string().required("L'epic est requis")
      : yup.string().notRequired(),
    featureId: isUpdate
      ? yup.string().notRequired()
      : isManualFlow
      ? yup.string().required("Le feature est requis")
      : yup.string().notRequired(),
  });
