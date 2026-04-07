//@ts-nocheck
import {
  Box,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
} from "@chakra-ui/react";
import Arrow from "@/assets/svg/arrow.svg?react";

interface IDropdownOption {
  value: string;
  label: string;
}

interface IDropdownProps {
  label: string;
  name: string;
  value: string;
  options: IDropdownOption[] | Record<string, string>;
  onChange: (name: string, value: string) => void;
  isRequired?: boolean;
  isInvalid?: boolean;
  error?: string;
  touched?: boolean;
  placeholder?: string;
  isDisabled?: boolean;
  fontSize?: string;
  labelFontSize?: string;
}

export default function Dropdown({
  label,
  name,
  value,
  options,
  onChange,
  isRequired = false,
  isInvalid = false,
  error,
  touched = false,
  placeholder = "Sélectionner une option",
  isDisabled = false,
  fontSize = "13px",
  labelFontSize = "13px",
}: IDropdownProps) {
  // Convert options to array format if it's a Record
  const optionsArray: IDropdownOption[] = Array.isArray(options)
    ? options
    : Object.entries(options).map(([key, label]) => ({
        value: key,
        label: label,
      }));

  // Find the display label for the current value
  const displayValue =
    optionsArray.find((opt) => opt.value === value)?.label || placeholder;

  return (
    <FormControl
      isRequired={isRequired}
      isInvalid={isInvalid && touched}
      isDisabled={isDisabled}
    >
      <FormLabel fontSize={labelFontSize}>{label}</FormLabel>
      <Menu>
        <MenuButton width="100%" isDisabled={isDisabled}>
          <Box position="relative">
            <Input
              fontSize={fontSize}
              name={name}
              readOnly
              cursor="pointer"
              value={displayValue}
              paddingRight="2.5rem"
              _disabled={{
                opacity: 0.6,
                cursor: "not-allowed",
              }}
            />
            <Box
              position="absolute"
              right="0.75rem"
              top="50%"
              transform="translateY(-50%)"
              pointerEvents="none"
            >
              <Arrow width="1rem" height="1rem" />
            </Box>
          </Box>
        </MenuButton>
        <MenuList zIndex={10000} maxH="300px" overflowY="auto">
          {optionsArray.map((option) => (
            <MenuItem
              key={option.value}
              fontSize={fontSize}
              onClick={() => onChange(name, option.value)}
              bg={value === option.value ? "gray.100" : "transparent"}
              _hover={{ bg: "gray.50" }}
            >
              {option.label}
            </MenuItem>
          ))}
        </MenuList>
      </Menu>
      {isInvalid && touched && error && (
        <FormErrorMessage fontSize="12px">{error}</FormErrorMessage>
      )}
    </FormControl>
  );
}
