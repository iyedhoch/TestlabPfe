import {
  Flex,
  Box,
  IconButton,
  Text,
  Image,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Portal,
  useDisclosure,
} from "@chakra-ui/react";
import { notifications, search, settings } from "@/assets";
import { colors } from "@/theme/colors";
import { useEffect, useMemo } from "react";
import Layers from "@/assets/svg/layers.svg?react";
import Plus from "@/assets/svg/plus.svg?react";
import Arrow from "@/assets/svg/arrow.svg?react";
import { useLocation } from "react-router-dom";
import { SidebarFeature } from "@/types";
import { useGetProjectsQuery } from "@/services";
import { useDispatch, useSelector } from "react-redux";
import {
  selectedProjectSelector,
  setSelectedProject,
} from "@/app/slices/projectSlice";
import ProjectMutationModal from "@/pages/ProjectManagementPage/components/modals/ProjectMutationModal";

function SearchInput() {
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
        placeholder="Rechercher..."
        style={{
          fontSize: 12,
          border: "none",
          outline: "none",
        }}
      />
    </Flex>
  );
}

function ProjectDropdown() {
  const { data: projects = [] } = useGetProjectsQuery();
  const selectedProject = useSelector(selectedProjectSelector);
  const dispatch = useDispatch();
  const {
    isOpen: isProjectCreationModalOpen,
    onClose: closeProjectCreationModal,
    onOpen: openProjectCreationModal,
  } = useDisclosure();

  useEffect(() => {
    if (selectedProject && projects?.length) {
      const updatedProject = projects?.find(
        (project) => project?.id === selectedProject?.id
      );

      if (
        updatedProject &&
        JSON.stringify(updatedProject) !== JSON.stringify(selectedProject)
      ) {
        dispatch(setSelectedProject({ selectedProject: updatedProject }));
      }
    }
  }, [projects, selectedProject, dispatch]);

  return (
    <>
      <Menu placement="bottom-end">
        <MenuButton
          as={Button}
          rightIcon={<Arrow />}
          leftIcon={
            <Flex alignItems="center" gap="1rem">
              <Box
                as="span"
                display="inline-flex"
                width="3.25rem"
                height="1.75rem"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                onClick={(e: React.MouseEvent<HTMLSpanElement>) => {
                  e.stopPropagation();
                  openProjectCreationModal();
                }}
              >
                <Plus />
              </Box>
              <Layers />
            </Flex>
          }
          background={colors.white}
          border="1px solid"
          borderColor={colors.border}
          borderRadius="3rem"
          paddingInline=".75rem"
          height="44px"
          boxShadow="0px 1px 3px rgba(16, 24, 40, 0.05)"
          _hover={{ background: "#F9FAFB" }}
          _active={{ background: "#F3F4F6" }}
          fontSize="14px"
          fontWeight="500"
          color={colors.blue}
        >
          {selectedProject ? selectedProject?.name : "Tous les projets"}
        </MenuButton>
        <Portal>
          <MenuList zIndex={1000}>
            {Array.isArray(projects) &&
              projects?.map((project) => (
                <MenuItem
                  key={project?.id}
                  onClick={() => {
                    dispatch(setSelectedProject({ selectedProject: project }));
                  }}
                  fontSize="14px"
                  _hover={{ background: "#F9FAFB" }}
                  background={
                    selectedProject === project ? "#F3F4F6" : "transparent"
                  }
                >
                  {project?.name}
                </MenuItem>
              ))}
          </MenuList>
        </Portal>
      </Menu>
      <ProjectMutationModal
        isProjectModalOpen={isProjectCreationModalOpen}
        closeProjectModal={closeProjectCreationModal}
      />
    </>
  );
}

export default function Header() {
  const location = useLocation();

  const pathnameToHeaderLabelMapper: Record<SidebarFeature, string> = {
    dashboard: "Tableau de bord",
    "project-mangement": "Gestion des projets",
    "specs-mangement": "Gestion des spécifications",
    "test-generation": "Génération des cas de test",
    "test-link-mcp": "Tableau de bord",
    automation: "Tableau de bord",
    training: "Tableau de bord",
    statistics: "Tableau de bord",
    estimation: "Tableau de bord",
    environment: "Tableau de bord",
  };

  const pathname = useMemo(() => {
    return location?.pathname?.split("/").join("") as SidebarFeature;
  }, [location?.pathname]);

  return (
    <Flex
      top="0px"
      position="sticky"
      background={colors.body}
      zIndex={900}
      padding="1rem"
      justifyContent="space-between"
      alignItems="center"
    >
      <Flex flexDirection="column">
        <Text fontSize="1.5rem" fontWeight="bold">
          {pathnameToHeaderLabelMapper[pathname] ||
            "Gestion des spécifications"}
        </Text>
        <Text fontSize=".75rem">
          Simplifiez la gestion de vos tâches BA & QA, au même endroit
        </Text>
      </Flex>
      <Flex gap=".5rem" alignItems="center">
        <SearchInput />
        <IconButton
          aria-label="Notifications"
          background={colors.white}
          icon={<Image src={notifications} />}
          borderColor={colors.border}
          borderRadius="50px"
          borderWidth="1px"
          width="10"
          height="10"
          _hover={{
            background: colors.body,
          }}
        />
        <IconButton
          aria-label="Paramètres"
          background={colors.white}
          icon={<Image src={settings} />}
          borderColor={colors.border}
          borderRadius="50px"
          borderWidth="1px"
          width="10"
          height="10"
          _hover={{
            background: colors.body,
          }}
        />
        <ProjectDropdown />
      </Flex>
    </Flex>
  );
}
