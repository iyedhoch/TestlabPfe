import { Box, Flex, Text, useBreakpointValue } from "@chakra-ui/react";
import { colors } from "@/theme/colors";
import { ReactNode } from "react";

interface IInfoCard {
  label: string;
  value: string;
  badge: string;
  icon: ReactNode;
  firstGradient: string;
  secondGradient: string;
}

export default function InfoCard({
  label,
  value,
  badge,
  icon,
  firstGradient,
  secondGradient,
}: IInfoCard) {
  const cardGap = useBreakpointValue({ base: "1rem", "2xl": "4rem" });

  return (
    <Box
      padding="1rem"
      borderRadius="12px"
      border="1px solid"
      borderColor={colors.border}
      background={colors.white}
    >
      <Flex flexDirection="column" gap={cardGap}>
        <Flex
          width="100%"
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Flex flexDirection="column">
            <Text fontSize=".875rem" fontWeight="medium">
              {label}
            </Text>
            <Text fontWeight="semibold" fontSize="2rem">
              {value}
            </Text>
          </Flex>
          <Flex
            justifyContent="center"
            alignItems="center"
            width="2.5rem"
            height="2.5rem"
            borderRadius=".5rem"
            background={`linear-gradient(${firstGradient}, ${secondGradient})`}
          >
            {icon}
          </Flex>
        </Flex>
        <Box
          background="#E0F2FE80"
          borderRadius="50px"
          padding=".25rem .75rem"
          alignSelf="flex-start"
        >
          <Text color={colors.blue} fontWeight="bold" fontSize="12px">
            {badge}
          </Text>
        </Box>
      </Flex>
    </Box>
  );
}
