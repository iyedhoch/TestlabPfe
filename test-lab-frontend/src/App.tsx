import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppRoutes from "@/routes/AppRoutes";
import { ChakraProvider } from "@chakra-ui/react";
import { Provider as StoreProvider } from "react-redux";
import theme from "@/theme/theme";
import { store, persistor } from "@/app/store";
import { PersistGate } from "redux-persist/integration/react";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider store={store}>
        <PersistGate persistor={persistor}>
          <ChakraProvider theme={theme}>
            <AppRoutes />
          </ChakraProvider>
        </PersistGate>
      </StoreProvider>
    </QueryClientProvider>
  );
}
