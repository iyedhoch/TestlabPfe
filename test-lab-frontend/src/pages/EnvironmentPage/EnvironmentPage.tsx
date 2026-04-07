import { Box, Button, Flex } from "@chakra-ui/react";
import Plus from "@/assets/svg/plus.svg?react";
import { Pagination } from "@/components";
import { useState } from "react";
import EnvironmentsTable from "./components/EnvironmentTable";
import { useGetPaginatedEnvironmentsQuery } from "@/services";
import { useSelector } from "react-redux";
import { selectedProjectSelector } from "@/app/slices/projectSlice";
import NewEnvironmentSection from "./components/NewEnvironmentSection";

export default function EnvironmentPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [showNewEnvironmentSection, setShowNewEnvironmentSection] =
    useState(false);
  const selectedProject = useSelector(selectedProjectSelector);
  const { data, isLoading } = useGetPaginatedEnvironmentsQuery(
    selectedProject?.id as string,
    currentPage
  );

  return (
    <Box paddingInline="1rem">
      {!showNewEnvironmentSection && (
        <>
          <Flex
            justifyContent="space-between"
            alignItems="center"
            marginBottom="1rem"
            gap=".5rem"
          >
            <Box />
            <Flex gap=".5rem">
              <Button
                variant="basic"
                leftIcon={<Plus />}
                onClick={() => {
                  setShowNewEnvironmentSection(true);
                }}
              >
                Nouveau Environnement
              </Button>
            </Flex>
          </Flex>
          <EnvironmentsTable
            isLoadingEnvironments={isLoading}
            data={data?.data ?? []}
            currentPage={currentPage}
          />
          {data && data?.data?.length > 0 && (
            <Pagination
              page={currentPage}
              onChange={setCurrentPage}
              numberOfPages={data?.pagination?.totalPages ?? 1}
            />
          )}
        </>
      )}

      {showNewEnvironmentSection && (
        <NewEnvironmentSection
          onCancel={() => setShowNewEnvironmentSection(false)}
        />
      )}
    </Box>
  );
}
