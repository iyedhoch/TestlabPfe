import { Flex, Text } from "@chakra-ui/react";
import { colors } from "@/theme/colors";
import { hexToRgba } from "@/utils/functions";
import SidebarItem from "./SidebarItem";
import { useLocation } from "react-router-dom";
import { ISidebarItem } from "@/types";
import Spark from "@/assets/svg/spark.svg?react";
import { useState } from "react";
import ProfileCard from "./ProfileCard";

const mainMenuItems: ISidebarItem[] = [
  {
    path: "/dashboard",
    label: "Tableau de bord",
    icon: "dashboard",
  },
  {
    path: "/project-mangement",
    label: "Gestion des projets",
    icon: "project-mangement",
  },
  {
    path: "/specs-mangement",
    label: "Gestion des spécifications",
    icon: "specs-mangement",
    children: [
      {
        path: "/specs-mangement/stories",
        label: "Espace création user stories",
        icon: "specs-mangement",
      },
    ],
  },
  {
    path: "/test-generation",
    label: "Génération des cas de test",
    icon: "test-generation",
  },
  {
    path: "/environment",
    label: "Gestion de l'Environnement",
    icon: "environment",
  },
  {
    path: "/document-generation",
    label: "document-generation",
    icon: "specs-mangement",
  },
];

const integrationItems: ISidebarItem[] = [
  {
    path: "/test-link-mcp",
    label: "TestLink MCP",
    icon: "test-link-mcp",
  },
  {
    path: "/automation",
    label: "Automatisation",
    icon: "automation",
  },
];

const reportItems: ISidebarItem[] = [
  {
    path: "/training",
    label: "Formations",
    icon: "training",
  },
  {
    path: "/statistics",
    label: "Analytiques",
    icon: "statistics",
  },
  {
    path: "/estimation",
    label: "Estimation",
    icon: "estimation",
  },
];

export default function Sidebar() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isChildActive = (item: ISidebarItem) => {
    if (!item.children) return false;
    return item.children.some((child) => location.pathname === child.path);
  };

  return (
    <Flex
      width={isCollapsed ? "80px" : "280px"}
      position="sticky"
      top="0px"
      padding="1rem"
      background={`linear-gradient(${colors.blue}, ${colors.darkBlue})`}
      flexDirection="column"
      height="100vh"
      transition="width 0.3s ease"
    >
      <Flex
        width="100%"
        gap="1rem"
        alignItems="center"
        flexShrink={0}
        justifyContent={isCollapsed ? "center" : "flex-start"}
      >
        <Flex
          background={hexToRgba(colors.white, 0.2)}
          borderRadius="1rem"
          height="52px"
          width="52px"
          justifyContent="center"
          alignItems="center"
          borderWidth="1px"
          borderColor={hexToRgba(colors.white, 0.2)}
          flexShrink={0}
          cursor="pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
          _hover={{ background: hexToRgba(colors.white, 0.25) }}
          transition="background 0.2s ease"
        >
          <Spark color={colors.white} />
        </Flex>
        {!isCollapsed && (
          <Flex flexDirection="column" flex="1" minWidth="0">
            <Text
              fontSize={24}
              color={colors.white}
              fontWeight="bold"
              noOfLines={1}
            >
              TestLab
            </Text>
            <Text fontSize={12} fontWeight="medium" color={colors.light}>
              WORKSPACE
            </Text>
          </Flex>
        )}
      </Flex>

      <Flex
        flex="1"
        flexDirection="column"
        gap="2.5rem"
        marginTop="2rem"
        marginBottom="1rem"
        overflowY="auto"
        overflowX="hidden"
        css={{
          "&::-webkit-scrollbar-thumb": {
            background: hexToRgba(colors.white, 0),
          },
          "&::-webkit-scrollbar": {
            width: "3px",
            marginLeft: "5px",
          },
        }}
      >
        <Flex flexDirection="column" gap="1rem">
          {!isCollapsed && (
            <Text
              fontSize={11}
              fontWeight="bold"
              color={colors.light}
              textTransform="uppercase"
              paddingLeft="0.75rem"
            >
              Menu principal
            </Text>
          )}
          {mainMenuItems.map((item) => (
            <SidebarItem
              key={item?.path}
              label={item?.label}
              icon={item?.icon}
              isActive={isActive(item?.path)}
              isChildActive={isChildActive(item)}
              path={item?.path}
              children={item?.children}
              isCollapsed={isCollapsed}
            />
          ))}
        </Flex>
        <Flex flexDirection="column" gap="1rem">
          {!isCollapsed && (
            <Text
              fontSize={11}
              fontWeight="bold"
              color={colors.light}
              textTransform="uppercase"
              paddingLeft="0.75rem"
            >
              Intégrations
            </Text>
          )}
          {integrationItems.map((item) => (
            <SidebarItem
              key={item?.path}
              label={item?.label}
              icon={item?.icon}
              isActive={isActive(item?.path)}
              isChildActive={isChildActive(item)}
              path={item?.path}
              children={item?.children}
              isCollapsed={isCollapsed}
            />
          ))}
        </Flex>
        <Flex flexDirection="column" gap="1rem">
          {!isCollapsed && (
            <Text
              fontSize={11}
              fontWeight="bold"
              color={colors.light}
              textTransform="uppercase"
              paddingLeft="0.75rem"
            >
              Rapports
            </Text>
          )}
          {reportItems.map((item) => (
            <SidebarItem
              key={item?.path}
              label={item?.label}
              icon={item?.icon}
              isActive={isActive(item?.path)}
              isChildActive={isChildActive(item)}
              path={item?.path}
              children={item?.children}
              isCollapsed={isCollapsed}
            />
          ))}
        </Flex>
      </Flex>
      <ProfileCard />
    </Flex>
  );
}
