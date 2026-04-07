import { Flex, Button, Grid } from "@chakra-ui/react";
import Plus from "@/assets/svg/plus.svg?react";
import Export from "@/assets/svg/export.svg?react";
import Filter from "@/assets/svg/filter.svg?react";
import Hand from "@/assets/svg/hand.svg?react";
import { colors } from "@/theme/colors";
import { useState } from "react";

interface ISpecsManagementActions {
  onFilter?: () => void;
  onExportCahierWord?: () => void;
  onExportCahierPdf?: () => void;
  onExportCahierTemplateDebug?: () => void;
  onExportFsdPdfFr?: () => void;
  onExportFsdWord?: () => void;
  isExportingCahierWord?: boolean;
  isExportingCahierPdf?: boolean;
  isExportingCahierTemplateDebug?: boolean;
  isExportingFsdPdfFr?: boolean;
  isExportingFsdWord?: boolean;
  onManual?: () => void;
}

export default function TestGenerationActions({
  onExportCahierWord,
  onExportCahierPdf,
  onExportCahierTemplateDebug,
  onExportFsdPdfFr,
  onExportFsdWord,
  isExportingCahierWord,
  isExportingCahierPdf,
  isExportingCahierTemplateDebug,
  isExportingFsdPdfFr,
  isExportingFsdWord,
  onFilter,
  onManual,
}: ISpecsManagementActions) {
  const [areSubActionsExpanded, setAreSubActionsExpanded] = useState(false);

  return (
    <Flex flexDirection="column" alignItems="flex-end">
      <Flex gap=".5rem" alignItems="center">
        <Button
          leftIcon={<Filter width="1rem" height="1rem" />}
          variant="lightBlue"
          onClick={() => {
            onFilter && onFilter();
          }}
        >
          Filtrer
        </Button>
        <Button
          leftIcon={<Export width="1rem" height="1rem" />}
          variant="light"
          isLoading={isExportingCahierWord}
          onClick={() => {
            onExportCahierWord && onExportCahierWord();
          }}
        >
          Exporter le cahier de recette
        </Button>
        <Button
          leftIcon={<Export width="1rem" height="1rem" />}
          variant="light"
          isLoading={isExportingCahierPdf}
          onClick={() => {
            onExportCahierPdf && onExportCahierPdf();
          }}
        >
          Exporter le cahier de recette en PDF
        </Button>
        <Button
          leftIcon={<Export width="1rem" height="1rem" />}
          variant="light"
          isLoading={isExportingCahierTemplateDebug}
          onClick={() => {
            onExportCahierTemplateDebug && onExportCahierTemplateDebug();
          }}
        >
          Exporter Cahier Template (Debug)
        </Button>
        <Button
          leftIcon={<Export width="1rem" height="1rem" />}
          variant="light"
          isLoading={isExportingFsdPdfFr}
          onClick={() => {
            onExportFsdPdfFr && onExportFsdPdfFr();
          }}
        >
          Exporter le FSD en PDF (FR)
        </Button>
        <Button
          leftIcon={<Export width="1rem" height="1rem" />}
          variant="light"
          isLoading={isExportingFsdWord}
          onClick={() => {
            onExportFsdWord && onExportFsdWord();
          }}
        >
          Exporter le FSD en Word
        </Button>
        <Button
          leftIcon={
            <Flex
              width="1.5rem"
              height="1.5rem"
              justifyContent="center"
              alignItems="center"
              background={colors.blue}
              borderRadius="50px"
            >
              <Plus width="1rem" height="1rem" color={colors.white} />
            </Flex>
          }
          variant="light"
          borderColor={colors.border}
          fontWeight="medium"
          padding=".5rem .75rem .5rem .5rem"
          color={colors.black}
          onClick={() => {
            setAreSubActionsExpanded((prev) => !prev);
          }}
        >
          Nouveau cas de test
        </Button>
      </Flex>
      <Grid
        transition="grid-template-rows 0.3s ease"
        gridTemplateRows={areSubActionsExpanded ? "1fr" : "0fr"}
        paddingTop={areSubActionsExpanded ? ".75rem" : ".25rem"}
      >
        <Flex gap=".5rem" alignItems="center" overflow="hidden">
          <Button
            leftIcon={
              <Hand width="1.25rem" height="1.25rem" color={colors.blue} />
            }
            variant="light"
            borderColor={colors.border}
            fontWeight="medium"
            paddingEnd="1rem"
            color={colors.black}
            onClick={() => {
              onManual && onManual();
            }}
          >
            Manuellement
          </Button>
        </Flex>
      </Grid>
    </Flex>
  );
}
