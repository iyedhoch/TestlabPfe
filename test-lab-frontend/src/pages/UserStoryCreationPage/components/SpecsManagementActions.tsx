import { Flex, Button, Grid } from "@chakra-ui/react";
import Plus from "@/assets/svg/plus.svg?react";
import Filter from "@/assets/svg/filter.svg?react";
import Figma from "@/assets/svg/figma.svg?react";
import Hand from "@/assets/svg/hand.svg?react";
import { colors } from "@/theme/colors";
import { useState } from "react";

interface ISpecsManagementActions {
  onFilter?: () => void;
  onManual?: () => void;
  onOpenFigma?: () => void;
}

export default function SpecsManagementActions({
  onFilter,
  onManual,
  onOpenFigma,
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
          leftIcon={<Figma width="1rem" height="1rem" />}
          variant="light"
          onClick={() => {
            onOpenFigma && onOpenFigma();
          }}
        >
          Ouvrir Figma
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
          Nouveau user story
        </Button>
      </Flex>
      <Grid
        transition="grid-template-rows 0.3s ease"
        gridTemplateRows={areSubActionsExpanded ? "1fr" : "0fr"}
        paddingTop={areSubActionsExpanded ? ".75rem" : ".25rem"}
      >
        <Flex gap=".5rem" alignItems="center" overflow="hidden">
          <Button
            leftIcon={<Hand width="1rem" height="1rem" />}
            variant="light"
            onClick={() => {
              onManual && onManual();
            }}
          >
            Manuel
          </Button>
        </Flex>
      </Grid>
    </Flex>
  );
}
