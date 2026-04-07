import {
  Text,
  Flex,
  Grid,
  Box,
  Skeleton,
  useBreakpointValue,
} from "@chakra-ui/react";
import InfoCard from "./components/InfoCard";
import Lab from "@/assets/svg/lab.svg?react";
import Folder from "@/assets/svg/folderAlt.svg?react";
import Increase from "@/assets/svg/increase.svg?react";
import Clock from "@/assets/svg/clock.svg?react";
import { colors } from "@/theme/colors";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useGetDashboardData } from "@/services";

const CustomDot = (props: any) => {
  const { cx, cy } = props;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill="white"
      stroke={colors.blue}
      strokeWidth={3}
    />
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload?.length) {
    return (
      <Box
        background="white"
        padding=".5rem .75rem"
        border="1px solid"
        borderColor={colors.border}
        borderRadius=".5rem"
        boxShadow="0 2px 8px rgba(0,0,0,0.1)"
      >
        <Text fontSize="12px" fontWeight="bold">
          {payload[0].payload.month}
        </Text>
        <Text fontSize="12px" color={colors.blue}>
          {payload[0].value} tests
        </Text>
      </Box>
    );
  }

  return null;
};

export default function DashboardPage() {
  const { data, isLoading } = useGetDashboardData();
  const chartContainerHeight = useBreakpointValue({ base: 350, "2xl": 500 });
  const skeletonHeight = useBreakpointValue({ base: 150, "2xl": 225 });

  return (
    <Flex flexDirection="column" gap="1rem" paddingInline="1rem">
      {isLoading && (
        <Flex flexDirection="column" gap="1rem">
          <Grid templateColumns="repeat(4, 1fr)" gap=".75rem">
            <Skeleton borderRadius=".5rem" height={skeletonHeight} />
            <Skeleton borderRadius=".5rem" height={skeletonHeight} />
            <Skeleton borderRadius=".5rem" height={skeletonHeight} />
            <Skeleton borderRadius=".5rem" height={skeletonHeight} />
          </Grid>
          <Skeleton borderRadius=".5rem" height={{ base: 310, "2xl": 590 }} />
        </Flex>
      )}
      {data && !isLoading && (
        <>
          <Grid templateColumns="repeat(4, 1fr)" gap=".75rem">
            <InfoCard
              firstGradient={colors.body}
              secondGradient={colors.light}
              icon={<Folder color={colors.blue} />}
              label="Projets actifs"
              value={data?.statistics?.activeProjects?.count?.toString()}
              badge={data?.statistics?.activeProjects?.badge}
            />
            <InfoCard
              firstGradient={colors.body}
              secondGradient={colors.light}
              icon={<Lab color={colors.blue} />}
              label="Cas de test"
              value={data?.statistics?.testCases?.count?.toString()}
              badge={data?.statistics?.testCases?.badge}
            />
            <InfoCard
              firstGradient={colors.body}
              secondGradient={colors.light}
              icon={<Increase color={colors.blue} />}
              label="Couverture"
              value={`${data?.statistics?.coverage?.percentage}%`}
              badge={data?.statistics?.coverage?.badge}
            />
            <InfoCard
              firstGradient={colors.body}
              secondGradient={colors.light}
              icon={<Clock color={colors.blue} />}
              label="Dernière exécution"
              value={data?.statistics?.lastExecution?.time}
              badge={data?.statistics?.lastExecution?.badge}
            />
          </Grid>
          <Flex
            padding="1rem"
            background={colors.white}
            border="1px solid"
            borderColor={colors.border}
            borderRadius=".75rem"
            flexDirection="column"
            gap="1.5rem"
          >
            <Flex flexDirection="column" gap=".25rem">
              <Text fontWeight="bold" fontSize="18px">
                Tendance d'exécution
              </Text>
              <Text fontSize="13px" color="gray.500">
                Suivi des performances de test ({data?.executionTrend?.period})
              </Text>
            </Flex>
            <ResponsiveContainer width="100%" height={chartContainerHeight}>
              <LineChart
                data={data?.executionTrend?.data}
                margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9CA3AF", fontSize: 13 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9CA3AF", fontSize: 13 }}
                  dx={-10}
                  domain={[0, 250]}
                  ticks={[0, 50, 100, 150, 200, 250]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="linear"
                  dataKey="value"
                  stroke={colors.blue}
                  strokeWidth={3}
                  dot={<CustomDot />}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Flex>
          <Box padding=".25rem" />
        </>
      )}
    </Flex>
  );
}
