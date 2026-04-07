import {
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Box,
  Text,
  HStack,
  IconButton,
  Button,
  Icon,
  FormControlProps,
} from "@chakra-ui/react";
import { useRef, useState, ChangeEvent } from "react";
import File from "@/assets/svg/file.svg?react";
import Plus from "@/assets/svg/plus.svg?react";

interface IFilePicker extends Omit<FormControlProps, "onChange"> {
  label?: string;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  placeholder?: string;
  fontSize?: string;
  accept?: string;
  multiple?: boolean;
  value?: File | FileList | null;
  onChange?: (files: File | FileList | null) => void;
}

export default function FilePicker({
  label,
  isRequired = false,
  isInvalid = false,
  errorMessage = "",
  placeholder = "Choisir un fichier...",
  fontSize = "13px",
  accept = "image/*",
  multiple = false,
  value = null,
  onChange,
  ...props
}: IFilePicker) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | FileList | null>(
    value
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files || files.length === 0) {
      setSelectedFile(null);
      setFileName("");
      onChange?.(null);
      return;
    }

    if (multiple) {
      setSelectedFile(files);
      setFileName(`${files.length} file(s) selected`);
      onChange?.(files);
    } else {
      const file = files[0];
      setSelectedFile(file);
      setFileName(file.name);
      onChange?.(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onChange?.(null);
  };

  return (
    <FormControl
      marginTop=".5rem"
      isRequired={isRequired}
      isInvalid={isInvalid}
      {...props}
    >
      {label && (
        <FormLabel fontSize={fontSize} mb="2">
          {label}
        </FormLabel>
      )}
      <Box position="relative">
        <Input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          multiple={multiple}
          display="none"
        />
        <Box
          border="1px solid"
          borderColor={isInvalid ? "red.300" : "gray.200"}
          borderRadius="md"
          bg="white"
          p="0"
          _hover={{
            borderColor: isInvalid ? "red.400" : "gray.300",
          }}
          _focusWithin={{
            borderColor: isInvalid ? "red.500" : "blue.500",
            boxShadow: isInvalid
              ? "0 0 0 1px var(--chakra-colors-red-500)"
              : "0 0 0 1px var(--chakra-colors-blue-500)",
          }}
          transition="all 0.2s"
        >
          <HStack spacing={0} align="stretch" minH="40px">
            <Box
              flex="1"
              px="3"
              py="2"
              display="flex"
              alignItems="center"
              fontSize={fontSize}
              color={fileName ? "gray.700" : "gray.500"}
            >
              {fileName ? (
                <HStack spacing={2} width="100%">
                  <Icon as={File} fontSize="14px" color="gray.500" />
                  <Text noOfLines={1} flex="1">
                    {fileName}
                  </Text>
                </HStack>
              ) : (
                placeholder
              )}
            </Box>
            <HStack spacing={0} borderLeft="1px solid" borderColor="gray.200">
              {selectedFile && (
                <IconButton
                  aria-label="Clear file"
                  icon={
                    <Box transform="rotate(45deg)">
                      <Plus color="#777" />
                    </Box>
                  }
                  size="sm"
                  variant="ghost"
                  borderRadius="0"
                  borderRight="1px solid"
                  borderColor="gray.200"
                  onClick={handleClearFile}
                  _hover={{ bg: "gray.100" }}
                  fontSize="14px"
                  h="100%"
                  px="3"
                />
              )}
              <Button
                leftIcon={
                  <File color="#777" width="1.25rem" height="1.25rem" />
                }
                size="sm"
                variant="ghost"
                borderRadius="0"
                color="#555"
                borderTopRightRadius="md"
                borderBottomRightRadius="md"
                onClick={handleButtonClick}
                _hover={{ bg: "gray.100" }}
                fontSize={fontSize}
                fontWeight="medium"
                h="100%"
                px="4"
              >
                Choisir
              </Button>
            </HStack>
          </HStack>
        </Box>
      </Box>
      {isInvalid && errorMessage && (
        <FormErrorMessage fontSize="12px" mt="1">
          {errorMessage}
        </FormErrorMessage>
      )}
    </FormControl>
  );
}
