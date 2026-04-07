import { extendTheme } from "@chakra-ui/react";
import { colors } from "./colors";

const theme = extendTheme({
  components: {
    Button: {
      baseStyle: {
        fontWeight: "medium",
        borderRadius: "100px",
      },
      variants: {
        basic: {
          background: colors.blue,
          fontSize: "12px",
          height: "unset",
          color: "white",
          padding: ".75rem .75rem",
          _hover: {
            background: "blue.600",
          },
        },
        gray: {
          background: "gray.100",
          fontSize: "12px",
          height: "unset",
          color: "gray.600",
          padding: ".75rem .75rem",
          _hover: {
            background: "gray.200",
          },
        },
        light: {
          background: "white",
          height: "unset",
          color: "blue.500",
          fontSize: "12px",
          fontWeight: "bold",
          padding: ".75rem .75rem",
          border: "1px solid",
          borderColor: colors.blue,
          _hover: {
            background: colors.body,
          },
        },
        lightBlue: {
          background: colors.lightBlue,
          height: "unset",
          color: "white",
          fontSize: "12px",
          fontWeight: "bold",
          padding: ".75rem .75rem",
          _hover: {
            background: "#0EA5E9",
          },
        },
        black: {
          background: colors.black,
          height: "unset",
          color: "white",
          fontSize: "12px",
          fontWeight: "bold",
          padding: ".75rem .75rem",
          _hover: {
            background: "#444444",
          },
        },
        green: {
          background: colors.green,
          height: "unset",
          color: "white",
          fontSize: "12px",
          // fontWeight: "bold",
          padding: ".75rem .75rem",
          _hover: {
            background: "#00B3C9",
          },
        },
      },
      defaultProps: {
        variant: "basic",
      },
    },
  },
});

export default theme;
