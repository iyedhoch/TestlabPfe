import { Box, Flex, Text } from "@chakra-ui/react";

interface WorkflowStepBarProps {
  activeStep: 1 | 2 | 3;
}

const workflowSteps = [
  { index: 1, title: "Selection du contenu" },
  { index: 2, title: "Metadonnees et details" },
  { index: 3, title: "Apercu et modification" },
] as const;

export default function WorkflowStepBar({ activeStep }: WorkflowStepBarProps) {
  return (
    <Box overflowX="auto">
      <Flex minW="700px" align="center" justify="space-between" gap={4}>
        {workflowSteps.map((step, index) => {
          const isActive = step.index === activeStep;
          const isLast = index === workflowSteps.length - 1;

          return (
            <Flex key={step.index} align="center" flex="1" minW="0">
              <Flex align="center" gap={3} minW="0">
                <Flex
                  width={{ base: "2rem", md: "2.25rem" }}
                  height={{ base: "2rem", md: "2.25rem" }}
                  borderRadius="full"
                  align="center"
                  justify="center"
                  borderWidth="1px"
                  borderColor={isActive ? "blue.500" : "gray.300"}
                  bg={isActive ? "blue.500" : "white"}
                  color={isActive ? "white" : "gray.600"}
                  fontWeight="bold"
                  fontSize="sm"
                  flexShrink={0}
                >
                  {step.index}
                </Flex>
                <Text
                  fontSize={{ base: "xs", md: "sm" }}
                  fontWeight="semibold"
                  color={isActive ? "blue.600" : "gray.600"}
                  noOfLines={1}
                >
                  {step.title}
                </Text>
              </Flex>

              {!isLast ? (
                <Box
                  flex="1"
                  h="1px"
                  bg="gray.300"
                  mx={{ base: 2, md: 4 }}
                  minW={{ base: "1.5rem", md: "2.5rem" }}
                />
              ) : null}
            </Flex>
          );
        })}
      </Flex>
    </Box>
  );
}
