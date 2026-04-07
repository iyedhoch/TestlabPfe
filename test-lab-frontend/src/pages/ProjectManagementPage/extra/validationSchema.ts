import * as yup from "yup";

export const validationSchema = yup.object({
  name: yup
    .string()
    .trim()
    .required("Le nom du projet est requis")
    .min(3, "Le nom doit contenir au moins 3 caractères")
    .max(100, "Le nom ne doit pas dépasser 100 caractères")
    .matches(/\S/, "Le nom ne peut pas être vide"),
  description: yup
    .string()
    .trim()
    .required("La description est requise")
    .min(2, "La description doit contenir au moins 2 caractères")
    .matches(/\S/, "La description ne peut pas être vide"),
  prefix: yup
    .string()
    .trim()
    .required("Le préfixe du projet est requis")
    .min(2, "Le préfixe du projet doit contenir au moins 2 caractères")
    .max(50, "Le préfixe du projet ne doit pas dépasser 50 caractères")
    .matches(/\S/, "Le préfixe ne peut pas être vide"),
  figmaLink: yup
    .string()
    .matches(/^https:\/\//, "Le lien doit commencer par https://"),
  status: yup.string().required("Le statut est requis"),
  attachment: yup
    .mixed<File>()
    .nullable()
    .test(
      "fileType",
      "Le fichier doit être une image (png, jpg, jpeg, webp)",
      (file) => {
        if (!file) return true;

        return ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(
          file.type
        );
      }
    ),
});
