import Arrow from "@/assets/svg/arrow.svg?react";
import { Flex, IconButton, Button, Box } from "@chakra-ui/react";
import { colors } from "@/theme/colors";

interface IPagination {
  numberOfPages: number;
  page: number;
  onChange: (newPage: number) => void;
}

export default function Pagination({
  numberOfPages,
  page,
  onChange,
}: IPagination) {
  let pagination;

  if (numberOfPages > 2) {
    if (page > 1) {
      pagination = (
        <>
          <IconButton
            aria-label="Previous page"
            icon={
              <Box
                as={Arrow}
                width="1rem"
                height="1rem"
                sx={{ transform: "rotate(90deg)" }}
              />
            }
            onClick={() => onChange(page - 1)}
            size="sm"
            variant="ghost"
            _hover={{ bg: colors.body }}
            borderRadius=".5rem"
          />
          {page + 1 > numberOfPages && (
            <Button
              onClick={() => onChange(page - 2)}
              bg="#fff"
              border="1px solid"
              borderColor={colors.border}
              color={colors.text}
              _hover={{ bg: colors.blue, color: colors.white }}
              fontSize="13px"
              borderRadius=".5rem"
            >
              {page - 2}
            </Button>
          )}
          <Button
            onClick={() => onChange(page - 1)}
            bg="#fff"
            border="1px solid"
            borderColor={colors.border}
            color={colors.text}
            _hover={{ bg: colors.blue, color: colors.white }}
            fontSize="13px"
            borderRadius=".5rem"
          >
            {page - 1}
          </Button>
          <Button
            onClick={() => onChange(page)}
            bg={colors.blue}
            color={colors.white}
            _hover={{ bg: colors.blue, opacity: 0.9 }}
            fontSize="13px"
            borderRadius=".5rem"
          >
            {page}
          </Button>
          {page + 1 <= numberOfPages && (
            <>
              <Button
                onClick={() => onChange(page + 1)}
                bg="#fff"
                border="1px solid"
                borderColor={colors.border}
                color={colors.text}
                _hover={{ bg: colors.blue, color: colors.white }}
                fontSize="13px"
                borderRadius=".5rem"
              >
                {page + 1}
              </Button>
              <IconButton
                aria-label="Next page"
                icon={
                  <Box
                    as={Arrow}
                    width="1rem"
                    height="1rem"
                    sx={{ transform: "rotate(-90deg)" }}
                  />
                }
                onClick={() => onChange(page + 1)}
                size="sm"
                variant="ghost"
                _hover={{ bg: colors.body }}
                borderRadius=".5rem"
              />
            </>
          )}
        </>
      );
    } else {
      pagination = (
        <>
          <Button
            onClick={() => onChange(page)}
            bg={colors.blue}
            color={colors.white}
            _hover={{ bg: colors.blue, opacity: 0.9 }}
            fontSize="13px"
            borderRadius=".5rem"
          >
            {page}
          </Button>
          <Button
            onClick={() => onChange(page + 1)}
            bg="#fff"
            border="1px solid"
            borderColor={colors.border}
            color={colors.text}
            _hover={{ bg: colors.blue, color: colors.white }}
            fontSize="13px"
            borderRadius=".5rem"
          >
            {page + 1}
          </Button>
          <Button
            onClick={() => onChange(page + 2)}
            border="1px solid"
            bg="#fff"
            borderColor={colors.border}
            color={colors.text}
            _hover={{ bg: colors.blue, color: colors.white }}
            fontSize="13px"
            borderRadius=".5rem"
          >
            {page + 2}
          </Button>
          <IconButton
            aria-label="Next page"
            icon={
              <Box
                as={Arrow}
                width="1rem"
                height="1rem"
                sx={{ transform: "rotate(-90deg)" }}
              />
            }
            onClick={() => onChange(page + 1)}
            size="sm"
            variant="ghost"
            _hover={{ bg: colors.body }}
            borderRadius=".5rem"
          />
        </>
      );
    }
  } else {
    if (numberOfPages === 1) {
      pagination = null;
    } else {
      if (page === 1) {
        pagination = (
          <>
            <Button
              onClick={() => onChange(1)}
              bg={colors.blue}
              color={colors.white}
              _hover={{ bg: colors.blue, opacity: 0.9 }}
              fontSize="13px"
              borderRadius=".5rem"
            >
              1
            </Button>
            <Button
              onClick={() => onChange(2)}
              bg="#fff"
              border="1px solid"
              borderColor={colors.border}
              color={colors.text}
              _hover={{ bg: colors.blue, color: colors.white }}
              fontSize="13px"
              borderRadius=".5rem"
            >
              2
            </Button>
            <IconButton
              aria-label="Next page"
              icon={
                <Box
                  as={Arrow}
                  width="1rem"
                  height="1rem"
                  sx={{ transform: "rotate(-90deg)" }}
                />
              }
              onClick={() => onChange(2)}
              size="sm"
              variant="ghost"
              _hover={{ bg: colors.body }}
              borderRadius=".5rem"
            />
          </>
        );
      } else {
        pagination = (
          <>
            <IconButton
              aria-label="Previous page"
              icon={
                <Box
                  as={Arrow}
                  width="1rem"
                  height="1rem"
                  sx={{ transform: "rotate(90deg)" }}
                />
              }
              onClick={() => onChange(1)}
              size="sm"
              variant="ghost"
              _hover={{ bg: colors.body }}
              borderRadius=".5rem"
            />
            <Button
              onClick={() => onChange(1)}
              bg="#fff"
              border="1px solid"
              borderColor={colors.border}
              color={colors.text}
              _hover={{ bg: colors.blue, color: colors.white }}
              fontSize="13px"
              borderRadius=".5rem"
            >
              1
            </Button>
            <Button
              onClick={() => onChange(2)}
              bg={colors.blue}
              color={colors.white}
              _hover={{ bg: colors.blue, opacity: 0.9 }}
              fontSize="13px"
              borderRadius=".5rem"
            >
              2
            </Button>
          </>
        );
      }
    }
  }

  return (
    <Flex gap="0.5rem" alignItems="center" marginBottom="1rem">
      {pagination}
    </Flex>
  );
}
