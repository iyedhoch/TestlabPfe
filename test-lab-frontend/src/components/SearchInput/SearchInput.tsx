import { Flex, Image } from "@chakra-ui/react";
import { colors } from "@/theme/colors";
import { search } from "@/assets";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = "Rechercher...",
}: SearchInputProps) {
  return (
    <Flex
      alignItems="center"
      gap="0.5rem"
      padding=".75rem"
      background={colors.white}
      borderRadius="3rem"
      border="1px solid"
      borderColor={colors.border}
      width="250px"
      boxShadow="0px 1px 3px rgba(16, 24, 40, 0.05)"
    >
      <Image src={search} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          fontSize: 12,
          border: "none",
          outline: "none",
          width: "100%",
          background: "transparent",
        }}
      />
    </Flex>
  );
}