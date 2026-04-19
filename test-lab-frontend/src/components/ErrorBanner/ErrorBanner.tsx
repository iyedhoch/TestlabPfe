import { Box, Text } from "@chakra-ui/react";

interface ErrorBannerProps {
  message: string;
  borderRadius?: string;
  padding?: string;
}

export default function ErrorBanner({
  message,
  borderRadius = ".5rem",
  padding = "0.75rem",
}: ErrorBannerProps) {
  return (
    <Box border="1px solid" borderColor="red.200" bg="red.50" borderRadius={borderRadius} p={padding}>
      <Text fontSize="13px" color="red.700">
        {message}
      </Text>
    </Box>
  );
}
