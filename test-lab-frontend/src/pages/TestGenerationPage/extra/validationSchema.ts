import * as yup from "yup";

export const generateDynamicValidationSchema = (isManualCaseFlow: boolean) => {
  return yup.object({
    name: yup.string().required("le titre est requis"),
    testSuiteId: isManualCaseFlow
      ? yup.string().required("le suite de test est requis")
      : yup.string(),
    summary: yup.string(),
    preconditions: yup
      .array()
      .of(
        yup.object({
          content: yup.string().required("La précondition est requise"),
        })
      )
      .min(1, "Au moins une précondition est requise"),
    testSteps: yup
      .array()
      .of(
        yup.object({
          action: yup.string().required("L'action est requise"),
          expectedResult: yup
            .string()
            .required("Le résultat attendu est requis"),
        })
      )
      .min(1, "Au moins une étape de test est requise"),
  });
};
