import { Flex } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import Header from "../Header/Header";
import { colors } from "@/theme/colors";

export default function Container() {
  return (
    <Flex minHeight="100vh" flexDirection="row">
      <Sidebar />
      <Flex flexDirection="column" bg={colors.body} flex="1">
        <Header />
        <Outlet />
      </Flex>
    </Flex>
  );
}
