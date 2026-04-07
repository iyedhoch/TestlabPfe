// components/Tag.tsx
import { Flex, Text, Icon, IconButton, Box } from "@chakra-ui/react";
import Plus from "@/assets/svg/plus.svg?react";
import { colors } from "@/theme/colors";

interface TagProps {
  label?: string;
  color?: string;
  onClick?: () => void;
  onDelete?: () => void;
}

export default function Tag({ label, color, onClick, onDelete }: TagProps) {
  if (!label || !color) {
    // Show add icon when no tag
    return (
      <Flex
        alignItems="center"
        justifyContent="center"
        cursor="pointer"
        onClick={onClick}
        _hover={{ opacity: 0.7 }}
        transition="opacity 0.2s"
      >
        <Flex
          width="1.25rem"
          height="1.25rem"
          borderRadius="4px"
          bg={colors.border}
          alignItems="center"
          justifyContent="center"
        >
          <Icon
            as={Plus}
            width="0.75rem"
            height="0.75rem"
            color={colors.text}
          />
        </Flex>
      </Flex>
    );
  }

  return (
    <Flex
      alignItems="center"
      justifyContent="center"
      cursor="pointer"
      onClick={onClick}
      role="group"
      position="relative"
      marginInline=".25rem"
    >
      <Flex
        width="100%"
        paddingX="0.5rem"
        paddingY="0.25rem"
        borderRadius="4px"
        bg={color}
        alignItems="center"
        justifyContent="center"
        _groupHover={{ opacity: 0.8 }}
        transition="opacity 0.2s"
      >
        <Text fontSize="10px" fontWeight="medium" color="white" noOfLines={1}>
          {label}
        </Text>
      </Flex>

      {/* Delete Button - Only show if onDelete is provided */}
      {onDelete && (
        <Box
          position="absolute"
          top="-6px"
          right="-6px"
          opacity={0}
          _groupHover={{ opacity: 1 }}
          transition="opacity 0.2s"
        >
          <IconButton
            aria-label="Delete tag"
            icon={
              <Text fontSize="14px" fontWeight="bold">
                ×
              </Text>
            }
            size="xs"
            borderRadius="full"
            bg="red.500"
            color="white"
            minW="16px"
            height="16px"
            padding={0}
            _hover={{ bg: "red.600" }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          />
        </Box>
      )}
    </Flex>
  );
}
