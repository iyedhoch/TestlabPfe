import { colors } from "@/theme/colors";
import {
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Text,
  InputGroup,
  InputRightElement,
  useToast,
} from "@chakra-ui/react";
import { hexToRgba } from "@/utils/functions";
import Spark from "@/assets/svg/spark.svg?react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { isAuthenticatedSelector, signIn } from "@/app/slices/authSlice";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";

const SignInSchema = Yup.object({
  identifier: Yup.string().required("L'identifiant est obligatoire"),
  password: Yup.string()
    .min(4, "Le mot de passe doit contenir au moins 4 caractères")
    .required("Le mot de passe est obligatoire"),
});

export default function SignInPage() {
  const isAuthenticated = useSelector(isAuthenticatedSelector);
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();

  const formik = useFormik({
    initialValues: {
      identifier: "",
      password: "",
      rememberMe: true,
    },
    validationSchema: SignInSchema,
    onSubmit: async (formValues) => {
      setIsSigningIn(true);

      try {
        const response = await api.post("/api/auth/login", {
          identifier: formValues.identifier,
          password: formValues.password,
        });

        const user = response.data?.user;
        const accessToken = response.data?.accessToken;

        dispatch(
          signIn({
            username: user?.username || formValues.identifier,
            userId: user?.id || "",
            role: user?.role || null,
            token: accessToken || "",
          })
        );

        navigate("/dashboard");

        toast({
          title: "Connexion réussie",
          description: "Vous êtes maintenant connecté",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } catch {
        toast({
          title: "Connexion refusée",
          description: "Identifiant ou mot de passe invalide.",
          status: "error",
          duration: 3500,
          isClosable: true,
        });
      } finally {
        setIsSigningIn(false);
      }
    },
  });

  const { touched, handleChange, handleSubmit, handleBlur, errors, values } =
    formik;

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated]);

  return (
    <Flex>
      {/* LEFT SIDE */}
      <Flex height="100vh" width="50%">
        <Flex
          width="100%"
          margin="1rem"
          background={`linear-gradient(${colors.blue}, ${colors.darkBlue})`}
          borderRadius=".75rem"
          flexDirection="column"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Flex
            width="100%"
            gap="1rem"
            margin="1rem"
            alignItems="center"
            flexShrink={0}
            justifyContent={"flex-start"}
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
              _hover={{ background: hexToRgba(colors.white, 0.25) }}
              transition="background 0.2s ease"
            >
              <Spark color={colors.white} />
            </Flex>
            <Flex flexDirection="column" flex="1" minWidth="0">
              <Text fontSize={24} color={colors.white} fontWeight="bold">
                TestLab
              </Text>
              <Text fontSize={12} fontWeight="medium" color={colors.light}>
                WORKSPACE
              </Text>
            </Flex>
          </Flex>

          <Flex width="100%" padding=".75rem" flexDirection="column">
            <Text
              fontSize="2.25rem"
              fontWeight="semibold"
              color={colors.white}
              whiteSpace="pre-line"
              marginBottom="1rem"
              lineHeight="2.75rem"
              marginLeft="1rem"
            >
              {"What’s our\nJobseekers said"}
            </Text>

            <Text
              color={colors.white}
              whiteSpace="pre-line"
              fontWeight="light"
              marginBottom="3rem"
              fontSize="1.25rem"
              marginLeft="1rem"
            >
              {`TestLab helps jobseekers practice, improve and\nsucceed in real-world assessments“`}
            </Text>

            <Flex justifyContent="center" width="100%">
              <Text color={colors.white} fontSize=".85rem">
                &copy; {new Date().getFullYear()} All rights reserved.
              </Text>
            </Flex>
          </Flex>
        </Flex>
      </Flex>

      {/* RIGHT SIDE (FORM) */}
      <Flex
        height="100vh"
        width="50%"
        justifyContent="center"
        alignItems="center"
      >
        <Flex
          as="form"
          gap="1rem"
          padding="1rem"
          flexDirection="column"
          width="400px"
        >
          <Flex flexDirection="column" gap=".25rem">
            <Text fontSize="1.45rem" fontWeight="bold">
              Log in to your account
            </Text>
            <Text fontSize=".9rem">
              Welcome back, please fill it with your information
            </Text>
          </Flex>

          {/* EMAIL */}
          <FormControl isRequired isInvalid={!!(touched.identifier && errors.identifier)}>
            <FormLabel fontSize="13px">Email ou username</FormLabel>
            <Input
              placeholder="Entrer votre email ou username..."
              fontSize="13px"
              value={values.identifier}
              name="identifier"
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <FormErrorMessage fontSize="12px">{errors.identifier}</FormErrorMessage>
          </FormControl>

          {/* PASSWORD */}
          <FormControl
            isRequired
            isInvalid={!!(touched.password && errors.password)}
          >
            <FormLabel fontSize="13px">Mot de passe</FormLabel>

            <InputGroup>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Entrer votre mot de passe..."
                fontSize="13px"
                value={values.password}
                name="password"
                onChange={handleChange}
                onBlur={handleBlur}
                pr="4.5rem"
              />

              <InputRightElement width="4.5rem">
                <Button
                  h="1.75rem"
                  fontSize=".65rem"
                  borderRadius="5px"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "Masquer" : "Afficher"}
                </Button>
              </InputRightElement>
            </InputGroup>

            <FormErrorMessage fontSize="12px">
              {errors.password}
            </FormErrorMessage>
          </FormControl>

          {/* REMEMBER */}
          <Flex justifyContent="space-between" alignItems="center">
            <Flex gap=".5rem">
              <Checkbox
                name="rememberMe"
                isChecked={values.rememberMe}
                onChange={handleChange}
              />
              <Text fontSize=".8rem">Remember me</Text>
            </Flex>
            <Text textDecoration="underline" fontSize=".75rem">
              Forgot Password ?
            </Text>
          </Flex>

          <Button
            isLoading={isSigningIn}
            _hover={{
              bg: "blue.600",
            }}
            onClick={() => {
              handleSubmit();
            }}
          >
            Sign in
          </Button>

          <Button variant="light">Create Account</Button>
        </Flex>
      </Flex>
    </Flex>
  );
}
