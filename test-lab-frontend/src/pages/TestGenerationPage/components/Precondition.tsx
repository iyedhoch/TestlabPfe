import { IPrecondition, useUpdatePreconditionMutation } from "@/services";
import { colors } from "@/theme/colors";
import { Flex, Text, Input, useToast } from "@chakra-ui/react";
import { useState, useRef, useEffect } from "react";
import { queryClient } from "@/App";
import {
  GET_TEST_CASE,
  GET_TEST_SUITES,
  TEST_GENERATION_QUERIES_PREFIX,
} from "@/services";

export default function Precondition(
  props: IPrecondition & { isLast?: boolean }
) {
  const { isLast, order, content, id } = props;
  const toast = useToast();
  const contentInputRef = useRef<HTMLInputElement>(null);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [contentValue, setContentValue] = useState(content);

  const { mutate: updatePrecondition } = useUpdatePreconditionMutation();

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingContent && contentInputRef.current) {
      contentInputRef.current.focus();
    }
  }, [isEditingContent]);

  const handleUpdateContent = () => {
    if (contentValue.trim() === "" || contentValue === content) {
      setContentValue(content);
      setIsEditingContent(false);
      return;
    }

    updatePrecondition(
      {
        id,
        content: contentValue,
      },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey: [TEST_GENERATION_QUERIES_PREFIX, GET_TEST_SUITES],
            exact: false,
          });

          await queryClient.invalidateQueries({
            queryKey: [TEST_GENERATION_QUERIES_PREFIX, GET_TEST_CASE],
            exact: false,
          });

          toast({
            title: "Précondition modifiée",
            description: "La précondition a été modifiée avec succès",
            status: "success",
            duration: 3000,
          });
          setIsEditingContent(false);
        },
        onError: (error: any) => {
          toast({
            title: "Erreur de modification",
            description:
              error?.response?.data?.error ||
              error?.message ||
              "Erreur lors de la modification de la précondition",
            status: "error",
            duration: 4000,
          });
          setContentValue(content);
          setIsEditingContent(false);
        },
      }
    );
  };

  return (
    <Flex
      gap=".75rem"
      padding="1rem"
      {...(!isLast && { borderBottom: "1px solid" })}
      borderColor={colors.border}
      alignItems="center"
    >
      <Flex
        width="1.5rem"
        height="1.5rem"
        borderRadius="50%"
        justifyContent="center"
        alignItems="center"
        bg={colors.badge}
        flexShrink={0}
      >
        <Text fontSize="12px" color={colors.text}>
          {order?.toString()}
        </Text>
      </Flex>
      <Flex
        flex="1"
        onDoubleClick={() => setIsEditingContent(true)}
        cursor={isEditingContent ? "text" : "pointer"}
      >
        {isEditingContent ? (
          <Input
            ref={contentInputRef}
            value={contentValue}
            onChange={(e) => setContentValue(e.target.value)}
            onBlur={handleUpdateContent}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleUpdateContent();
              } else if (e.key === "Escape") {
                setContentValue(content);
                setIsEditingContent(false);
              }
            }}
            fontSize=".85rem"
            size="sm"
            fontWeight="500"
          />
        ) : (
          <Text color={colors.text} fontSize=".85rem" fontWeight="500">
            {content}
          </Text>
        )}
      </Flex>
    </Flex>
  );
}
