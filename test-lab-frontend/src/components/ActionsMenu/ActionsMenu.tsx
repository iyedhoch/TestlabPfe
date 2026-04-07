import More from "@/assets/svg/more.svg?react";
import Cross from "@/assets/svg/cross.svg?react";
import Trash from "@/assets/svg/trash.svg?react";
import Edit from "@/assets/svg/edit.svg?react";
import Add from "@/assets/svg/add.svg?react";
import Details from "@/assets/svg/details.svg?react";
import { Box, Flex, IconButton } from "@chakra-ui/react";
import { colors } from "@/theme/colors";

interface IActionsMenu {
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  onAdd?: () => void;
  isOpen: boolean;
  onChange: (newValue: boolean) => void;
}

export default function ActionsMenu({
  onDelete,
  onEdit,
  onAdd,
  isOpen,
  onView,
  onChange,
}: IActionsMenu) {
  return (
    <Flex
      width="115px"
      height="42px"
      justifyContent="center"
      alignItems="center"
    >
      <Box
        opacity={isOpen ? 0 : 1}
        transform={isOpen ? "scale(0.8)" : "scale(1)"}
        transition="all 0.2s ease-in-out"
        position={isOpen ? "absolute" : "relative"}
        pointerEvents={isOpen ? "none" : "auto"}
      >
        <IconButton
          width="2.5rem"
          height="2.5rem"
          aria-label="Actions"
          icon={<More />}
          onClick={(e) => {
            e.stopPropagation();
            onChange && onChange(true);
          }}
          background={colors.white}
          border={"1px solid"}
          borderColor={colors.lightBlue}
          color="white"
          size="sm"
          borderRadius="0.5rem"
          _hover={{
            opacity: 0.75,
          }}
        />
      </Box>
      <Flex
        height="42px"
        gap=".25rem"
        opacity={isOpen ? 1 : 0}
        transform={isOpen ? "scale(1)" : "scale(0.8)"}
        transition="all 0.2s ease-in-out"
        position={isOpen ? "relative" : "absolute"}
        pointerEvents={isOpen ? "auto" : "none"}
        border="1px solid"
        borderColor={colors.blue}
        borderRadius="0.5rem"
        padding=".25rem"
        background="white"
      >
        {onView && (
          <IconButton
            aria-label="View"
            icon={<Details width="1.25rem" />}
            onClick={(e) => {
              e.stopPropagation();
              onView && onView();
            }}
            background="transparent"
            color="#999"
            size="sm"
            _hover={{
              background: "#F3F4F6",
            }}
          />
        )}
        {onAdd && (
          <IconButton
            aria-label="Add"
            icon={<Add width="1.5rem" />}
            onClick={(e) => {
              e.stopPropagation();
              onAdd && onAdd();
            }}
            background="transparent"
            color={colors.lightBlue}
            size="sm"
            _hover={{
              background: "#E6F2FF",
            }}
          />
        )}
        {onEdit && (
          <IconButton
            aria-label="Edit"
            icon={<Edit width="1.25rem" />}
            onClick={(e) => {
              e.stopPropagation();
              onEdit && onEdit();
            }}
            background="transparent"
            color={colors.blue}
            size="sm"
            _hover={{
              background: "#E6F2FF",
            }}
          />
        )}
        {onDelete && (
          <IconButton
            aria-label="Delete"
            icon={<Trash width="1.25rem" />}
            onClick={(e) => {
              e.stopPropagation();
              onDelete && onDelete();
            }}
            background="transparent"
            color="#EF4444"
            size="sm"
            _hover={{
              background: "#FEE2E2",
            }}
          />
        )}
        <IconButton
          aria-label="Close"
          icon={<Cross width="1.25rem" />}
          onClick={(e) => {
            e.stopPropagation();
            onChange && onChange(false);
          }}
          background="transparent"
          color="#6B7280"
          size="sm"
          _hover={{
            background: "#F3F4F6",
          }}
        />
      </Flex>
    </Flex>
  );
}
