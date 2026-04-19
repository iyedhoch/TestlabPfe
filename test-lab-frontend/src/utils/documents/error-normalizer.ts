import { AxiosError } from "axios";

type DocumentActionContext = "load" | "export" | "generate" | "download";

interface ErrorResponsePayload {
  message?: string | string[];
  error?: string;
}

interface NormalizedDocumentError {
  statusCode?: number;
  isNetworkError: boolean;
  serverMessage?: string;
  clientMessage?: string;
}

function isAxiosError(error: unknown): error is AxiosError<ErrorResponsePayload> {
  return error instanceof AxiosError;
}

export function normalizeDocumentError(error: unknown): NormalizedDocumentError {
  if (isAxiosError(error)) {
    const payload = error.response?.data;
    const serverMessage = Array.isArray(payload?.message)
      ? payload?.message.join("; ")
      : payload?.message || payload?.error;

    return {
      statusCode: error.response?.status,
      isNetworkError: !error.response,
      serverMessage,
      clientMessage: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      isNetworkError: false,
      clientMessage: error.message,
    };
  }

  return {
    isNetworkError: false,
    clientMessage: "Une erreur inattendue est survenue.",
  };
}

export function getDocumentErrorMessage(
  error: unknown,
  context: DocumentActionContext
): string {
  const normalized = normalizeDocumentError(error);

  if (normalized.isNetworkError) {
    return "Impossible de contacter le serveur. Verifiez votre connexion puis reessayez.";
  }

  if (normalized.statusCode === 404) {
    return "Le projet selectionne est introuvable.";
  }

  if (normalized.statusCode === 400) {
    if (context === "generate") {
      return (
        normalized.serverMessage ||
        "Les informations du document sont invalides. Verifiez les champs obligatoires."
      );
    }
    return normalized.serverMessage || "La requete est invalide. Verifiez les donnees saisies.";
  }

  if (normalized.statusCode === 500) {
    if (context === "load") {
      return "Le serveur n'a pas pu charger les donnees demandees.";
    }

    if (context === "download") {
      return "Le fichier genere est invalide. Reessayez la generation.";
    }

    return "Une erreur serveur est survenue pendant la generation du document.";
  }

  return (
    normalized.serverMessage ||
    normalized.clientMessage ||
    "Une erreur est survenue. Merci de reessayer."
  );
}

export function getDocumentLoadErrorMessage(
  resourceLabel: string,
  error: unknown
): string {
  const message = getDocumentErrorMessage(error, "load");
  return `Impossible de charger ${resourceLabel}. ${message}`;
}
