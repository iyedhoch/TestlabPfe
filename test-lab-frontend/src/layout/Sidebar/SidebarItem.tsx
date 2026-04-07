import {
  Flex,
  Text,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Portal,
} from "@chakra-ui/react";
import { colors } from "@/theme/colors";
import { hexToRgba } from "@/utils/functions";
import { Link as NavLink, useNavigate } from "react-router-dom";
import { ReactNode, useState } from "react";
import { ISidebarItem, SidebarFeature } from "@/types";
import Stats from "@/assets/svg/stats.svg?react";
import Education from "@/assets/svg/education.svg?react";
import Flash from "@/assets/svg/flash.svg?react";
import Link from "@/assets/svg/link.svg?react";
import Lab from "@/assets/svg/labAlt.svg?react";
import Document from "@/assets/svg/document.svg?react";
import Folder from "@/assets/svg/folder.svg?react";
import Grid from "@/assets/svg/grid.svg?react";
import Arrow from "@/assets/svg/arrow.svg?react";
import Key from "@/assets/svg/key.svg?react";

interface SidebarItemProps extends ISidebarItem {
  isActive: boolean;
  isChildActive?: boolean;
  isCollapsed?: boolean;
}

export default function SidebarItem({
  label,
  icon,
  isActive = false,
  isChildActive = false,
  path = "#",
  children,
  isCollapsed = false,
}: SidebarItemProps) {
  const [isExpanded, setIsExpanded] = useState(isActive || isChildActive);
  const navigate = useNavigate();

  const iconColor = isActive ? colors.white : colors.light;

  const itemToIconMapper: Record<SidebarFeature, ReactNode> = {
    dashboard: <Grid width={20} height={20} color={iconColor} />,
    "project-mangement": <Folder color={iconColor} />,
    "specs-mangement": <Document color={iconColor} />,
    "test-generation": <Lab color={iconColor} />,
    estimation: <Stats color={iconColor} />,
    "test-link-mcp": <Link color={iconColor} />,
    automation: <Flash color={iconColor} />,
    training: <Education color={iconColor} />,
    statistics: <Stats color={iconColor} />,
    environment: <Key color={iconColor} />,
  };

  const hasChildren = children && children.length > 0;

  const handleClick = () => {
    if (hasChildren && !isCollapsed) {
      setIsExpanded(!isExpanded);
    }
  };

  const ItemContent = (
    <Flex
      alignItems="center"
      padding="0.75rem"
      borderRadius="0.75rem"
      gap="0.75rem"
      cursor="pointer"
      background={
        isActive || isChildActive ? hexToRgba(colors.white, 0.2) : "transparent"
      }
      _hover={{
        background: hexToRgba(
          colors.white,
          isActive || isChildActive ? 0.25 : 0.1
        ),
      }}
      transition="background 0.2s ease"
      onClick={hasChildren ? handleClick : undefined}
      justifyContent={isCollapsed ? "center" : "flex-start"}
    >
      {itemToIconMapper[icon]}
      {!isCollapsed && (
        <>
          <Text
            fontSize="12px"
            fontWeight="medium"
            color={isActive ? colors.white : colors.light}
            flex="1"
            noOfLines={1}
          >
            {label}
          </Text>
          {hasChildren && (
            <Arrow
              width="1rem"
              height="1rem"
              color={isActive ? colors.white : colors.light}
              style={{
                transform: isExpanded ? "rotate(-180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
          )}
        </>
      )}
    </Flex>
  );

  // When collapsed with children, show as a menu
  if (isCollapsed && hasChildren) {
    return (
      <Menu placement="right-start" offset={[0, 8]}>
        <MenuButton as="div" width="100%">
          <Tooltip
            label={label}
            placement="right"
            hasArrow
            bg={colors.darkBlue}
          >
            {ItemContent}
          </Tooltip>
        </MenuButton>
        <Portal>
          <MenuList
            bg={colors.darkBlue}
            borderColor={hexToRgba(colors.white, 0.2)}
            minW="200px"
          >
            {children?.map((child) => (
              <MenuItem
                key={child.path}
                onClick={() => navigate(child.path)}
                bg="transparent"
                color={
                  window.location.pathname === child.path
                    ? colors.white
                    : colors.light
                }
                _hover={{ bg: hexToRgba(colors.white, 0.1) }}
                fontSize="12px"
              >
                <Flex align="center" gap=".5rem">
                  <Flex
                    width="4px"
                    height="4px"
                    borderRadius="50%"
                    background={
                      window.location.pathname === child.path
                        ? colors.white
                        : colors.light
                    }
                  />
                  <Text>{child.label}</Text>
                </Flex>
              </MenuItem>
            ))}
          </MenuList>
        </Portal>
      </Menu>
    );
  }

  // When collapsed without children
  const wrappedContent = isCollapsed ? (
    <Tooltip label={label} placement="right" hasArrow bg={colors.darkBlue}>
      {ItemContent}
    </Tooltip>
  ) : (
    ItemContent
  );

  return (
    <Flex flexDirection="column">
      {hasChildren ? (
        wrappedContent
      ) : (
        <NavLink to={path} style={{ textDecoration: "none" }}>
          {wrappedContent}
        </NavLink>
      )}

      {hasChildren && !isCollapsed && (
        <Flex
          display="grid"
          gridTemplateRows={isExpanded ? "1fr" : "0fr"}
          transition="grid-template-rows 0.5s ease"
          overflow="hidden"
        >
          <Flex
            flexDirection="column"
            paddingLeft="2rem"
            marginTop={isExpanded ? ".75rem" : "0px"}
            transition=".5s"
            gap="0.5rem"
            minHeight="0"
            overflow="hidden"
          >
            {children?.map((child) => (
              <NavLink
                key={child.path}
                to={child.path}
                style={{ textDecoration: "none" }}
              >
                <Flex
                  alignItems="center"
                  padding="0.5rem 0.75rem"
                  borderRadius="0.5rem"
                  cursor="pointer"
                  background={
                    window.location.pathname === child.path
                      ? hexToRgba(colors.white, 0.15)
                      : "transparent"
                  }
                  _hover={{
                    background: hexToRgba(colors.white, 0.1),
                  }}
                  transition="background 0.2s ease"
                >
                  <Flex
                    width="4px"
                    height="4px"
                    borderRadius="50%"
                    background={
                      window.location.pathname === child.path
                        ? colors.white
                        : colors.light
                    }
                    marginRight="0.75rem"
                  />
                  <Text
                    fontSize={11}
                    fontWeight="medium"
                    color={
                      window.location.pathname === child.path
                        ? colors.white
                        : colors.light
                    }
                    noOfLines={1}
                  >
                    {child.label}
                  </Text>
                </Flex>
              </NavLink>
            ))}
          </Flex>
        </Flex>
      )}
    </Flex>
  );
}
