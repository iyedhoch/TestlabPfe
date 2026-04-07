import { colors } from "@/theme/colors";
import { Avatar, Flex, Text } from "@chakra-ui/react";
import Logout from "@/assets/svg/logout.svg?react";
import { hexToRgba } from "@/utils/functions";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { signOut } from "@/app/slices/authSlice";

export default function ProfileCard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  return (
    <Flex
      borderRadius="1rem"
      justifyContent="space-between"
      alignItems="center"
      padding="0.8125rem"
      background={hexToRgba(colors.black, 0.2)}
      marginTop="auto"
      flexShrink={0}
    >
      <Flex gap=".75rem" alignItems="center">
        <Avatar
          width="10"
          height="10"
          name="Nicolas"
          background={`linear-gradient(${colors.lightBlue}, ${colors.blue})`}
        />
        <Flex flexDirection="column">
          <Text fontSize={13} fontWeight="medium" color={colors.white}>
            Version : Alpha 1.0.0
          </Text>
          <Text fontSize={11} color={colors.light}>
            nicolas@testlab.io
          </Text>
        </Flex>
      </Flex>
      <Logout
        color={hexToRgba(colors.light, 0.35)}
        cursor="pointer"
        onClick={() => {
          dispatch(signOut());
          navigate("/");
        }}
      />
    </Flex>
  );
}
