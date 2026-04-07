import { colors } from "@/theme/colors";
import { Box, Flex, Text } from "@chakra-ui/react";
import NoData from "@/assets/svg/empty.svg?react";
import { ReactNode } from "react";

interface IEmptyData {
  picture?: ReactNode;
  description: string;
}

export default function EmptyData({
  picture = <NoData width="300px" height="300px" />,
  description,
}: IEmptyData) {
  return (
    <>
      <Box
        padding="1.5rem"
        marginBottom="1rem"
        borderRadius="12px"
        minHeight="425px"
        border={`1px solid ${colors.border}`}
        background={colors.white}
        justifyContent="center"
        alignItems="center"
      >
        <Flex flexDirection="column" alignItems="center">
          {picture}
          <Text
            color={colors.text}
            fontWeight="bold"
            textAlign="center"
            fontSize="1.1rem"
            whiteSpace="pre-line"
          >
            {description}
          </Text>
        </Flex>
      </Box>
    </>
  );
}
