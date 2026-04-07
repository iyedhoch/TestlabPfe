import { colors } from "@/theme/colors";
import { Flex, SkeletonText } from "@chakra-ui/react";

export default function PreconditionsSkeleton() {
  return (
    <Flex
      flexDirection="column"
      borderRadius=".5rem"
      border="1px solid"
      borderColor={colors.border}
    >
      {[1, 2, 3]?.map((index) => (
        <Flex
          key={index}
          padding="1rem"
          borderBottom={index !== 3 ? `1px solid ${colors.border}` : "none"}
        >
          <SkeletonText noOfLines={2} spacing="4" width="100%" />
        </Flex>
      ))}
    </Flex>
  );
}
