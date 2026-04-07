import { colors } from "@/theme/colors";
import { Flex, Text, Box } from "@chakra-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Phase from "@/assets/svg/phase.svg?react";

interface IPhaseItem {
  id: string;
  title: string;
}

export default function PhaseItem({ id, title }: IPhaseItem) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Flex
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      alignItems="center"
      gap=".5rem"
      padding=".5rem .75rem"
      paddingLeft="4.5rem"
      borderRadius=".5rem"
      bg={isDragging ? colors.body : "transparent"}
      _hover={{ bg: colors.body }}
      cursor="grab"
      _active={{ cursor: "grabbing" }}
      marginBottom=".25rem"
    >
      <Box width="1rem" height="1rem" flexShrink={0} color={colors.blue}>
        <Phase width="100%" height="100%" />
      </Box>

      <Text fontSize="13px" fontWeight="500" flex="1" noOfLines={1}>
        {title}
      </Text>
    </Flex>
  );
}
