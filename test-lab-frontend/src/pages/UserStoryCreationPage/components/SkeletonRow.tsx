import { colors } from "@/theme/colors";
import { Flex, Skeleton, SkeletonCircle, Td, Tr } from "@chakra-ui/react";

export default function SkeletonRow() {
  return (
    <Tr
      background={colors.white}
      sx={{
        "& td:first-of-type": { borderLeftRadius: ".5rem" },
        "& td:last-of-type": { borderRightRadius: ".5rem" },
      }}
    >
      <Td py="1rem" pl="1rem">
        <Flex align="center" gap={1.5}>
          <Skeleton height="3" width="100%" maxW="150px" />
        </Flex>
      </Td>
      <Td textAlign="center" py="0.5rem">
        <Skeleton height="3" width="60px" mx="auto" />
      </Td>
      <Td textAlign="center" py="0.5rem">
        <Skeleton height="3" width="70px" mx="auto" />
      </Td>
      <Td textAlign="center" py="0.5rem">
        <Skeleton height="3" width="60px" mx="auto" />
      </Td>
      <Td textAlign="center" py="0.5rem">
        <SkeletonCircle size="5" mx="auto" />
      </Td>
      <Td textAlign="center" py="0.5rem">
        <Flex justify="center" gap={1}>
          {[1, 2].map((i) => (
            <SkeletonCircle key={i} size="5" />
          ))}
        </Flex>
      </Td>
      <Td textAlign="center" py="0.5rem" pr="1rem">
        <Skeleton height="6" width="6" mx="auto" />
      </Td>
    </Tr>
  );
}
