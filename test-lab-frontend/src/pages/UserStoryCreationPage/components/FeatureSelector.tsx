import React from "react";
import {
  FormControl,
  FormLabel,
  Spinner,
  HStack,
  MenuItem,
  MenuButton,
  MenuList,
  Box,
  Menu,
  Input,
  FormErrorMessage,
} from "@chakra-ui/react";
import { IFeature } from "@/services";
import Arrow from "@/assets/svg/arrow.svg?react";

interface FeatureSelectorProps {
  features: IFeature[];
  selectedFeatureId: string;
  onFeatureChange: (featureId: string) => void;
  isLoading?: boolean;
  error?: string | null;
  isRequired?: boolean;
}

export const FeatureSelector: React.FC<FeatureSelectorProps> = ({
  features,
  selectedFeatureId,
  onFeatureChange,
  isLoading = false,
  error = null,
  isRequired = true,
}) => {
  const isInvalid = isRequired && !selectedFeatureId && !!error;

  return (
    <FormControl isRequired={isRequired} isInvalid={isInvalid}>
      <HStack>
        <FormControl
          isRequired
          isInvalid={!!error}
        >
          <FormLabel fontSize="13px">Feature</FormLabel>
          <Menu>
            <MenuButton width="100%">
              <Box position="relative">
                <Input
                  fontSize="13px"
                  placeholder="Select a feature"
                  name="priority"
                  readOnly
                  cursor="pointer"
                  value={features.find((f) => f.id === selectedFeatureId)?.name}
                  paddingRight="2.5rem"
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
            <MenuList zIndex={10000}>
              {features?.map((feature) => (
                <MenuItem
                  key={feature?.id}
                  fontSize="13px"
                  onClick={() => {
                    onFeatureChange(feature?.id);
                  }}
                >
                  {feature?.name}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
          <FormErrorMessage fontSize="12px">{error || "Please select a feature"}</FormErrorMessage>
        </FormControl>

        {/* <Select
          placeholder="Select a feature"
          value={selectedFeatureId}
          onChange={(e) => onFeatureChange(e.target.value)}
          isDisabled={isLoading}
        >
          {features.map((feature) => (
            <option key={feature.id} value={feature.id}>
              {feature.name}
            </option>
          ))}
        </Select> */}
        {isLoading && <Spinner size="sm" />}
      </HStack>
      {/* {isInvalid && (
        <FormErrorMessage>
          {error || "Please select a feature"}
        </FormErrorMessage>
      )} */}
    </FormControl>
  );
};
