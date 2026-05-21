import { z } from "zod";

export const onboardingTextareaMaxLengths = {
  description: 320,
  mission: 280,
  vision: 280,
  valueProposition: 400,
  products: 700,
  idealCustomer: 420,
  painPoints: 420,
  communicationStyle: 420,
  differentials: 500,
  faq: 1200,
  processes: 700,
  rules: 500,
} as const;

export const onboardingFormSchema = z.object({
  companyName: z.string().trim().min(1, "Informe o nome da empresa"),
  industry: z.string().trim().min(1, "Informe o segmento da empresa"),
  description: z
    .string()
    .trim()
    .min(1, "Descreva brevemente a empresa")
    .max(
      onboardingTextareaMaxLengths.description,
      `Use no maximo ${onboardingTextareaMaxLengths.description} caracteres`,
    ),
  website: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || /^https?:\/\//.test(value), {
      message: "Use uma URL iniciando com http:// ou https://",
    }),
  mission: z
    .string()
    .trim()
    .min(1, "Informe a missão")
    .max(
      onboardingTextareaMaxLengths.mission,
      `Use no maximo ${onboardingTextareaMaxLengths.mission} caracteres`,
    ),
  vision: z
    .string()
    .trim()
    .min(1, "Informe a visão")
    .max(
      onboardingTextareaMaxLengths.vision,
      `Use no maximo ${onboardingTextareaMaxLengths.vision} caracteres`,
    ),
  valueProposition: z
    .string()
    .trim()
    .min(1, "Informe a proposta de valor")
    .max(
      onboardingTextareaMaxLengths.valueProposition,
      `Use no maximo ${onboardingTextareaMaxLengths.valueProposition} caracteres`,
    ),
  products: z
    .string()
    .trim()
    .min(1, "Liste os produtos ou serviços")
    .max(
      onboardingTextareaMaxLengths.products,
      `Use no maximo ${onboardingTextareaMaxLengths.products} caracteres`,
    ),
  pricing: z.string().trim().min(1, "Informe o modelo de precificação"),
  idealCustomer: z
    .string()
    .trim()
    .min(1, "Descreva o cliente ideal")
    .max(
      onboardingTextareaMaxLengths.idealCustomer,
      `Use no maximo ${onboardingTextareaMaxLengths.idealCustomer} caracteres`,
    ),
  painPoints: z
    .string()
    .trim()
    .min(1, "Descreva as dores do cliente")
    .max(
      onboardingTextareaMaxLengths.painPoints,
      `Use no maximo ${onboardingTextareaMaxLengths.painPoints} caracteres`,
    ),
  channels: z.string().trim().min(1, "Informe os canais de aquisição"),
  tone: z.string().trim().min(1, "Informe o tom de voz"),
  communicationStyle: z
    .string()
    .trim()
    .min(1, "Descreva o estilo de comunicação")
    .max(
      onboardingTextareaMaxLengths.communicationStyle,
      `Use no maximo ${onboardingTextareaMaxLengths.communicationStyle} caracteres`,
    ),
  avoidWords: z.string().trim().min(1, "Liste palavras ou expressões a evitar"),
  differentials: z
    .string()
    .trim()
    .min(1, "Descreva os diferenciais competitivos")
    .max(
      onboardingTextareaMaxLengths.differentials,
      `Use no maximo ${onboardingTextareaMaxLengths.differentials} caracteres`,
    ),
  faq: z
    .string()
    .trim()
    .min(1, "Liste as perguntas frequentes")
    .max(
      onboardingTextareaMaxLengths.faq,
      `Use no maximo ${onboardingTextareaMaxLengths.faq} caracteres`,
    ),
  processes: z
    .string()
    .trim()
    .min(1, "Descreva os processos-chave")
    .max(
      onboardingTextareaMaxLengths.processes,
      `Use no maximo ${onboardingTextareaMaxLengths.processes} caracteres`,
    ),
  rules: z
    .string()
    .trim()
    .min(1, "Informe as regras de negócio")
    .max(
      onboardingTextareaMaxLengths.rules,
      `Use no maximo ${onboardingTextareaMaxLengths.rules} caracteres`,
    ),
  tools: z.string().trim().min(1, "Informe as ferramentas utilizadas"),
});

export type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

export const defaultOnboardingFormValues: OnboardingFormValues = {
  companyName: "",
  industry: "",
  description: "",
  website: "",
  mission: "",
  vision: "",
  valueProposition: "",
  products: "",
  pricing: "",
  idealCustomer: "",
  painPoints: "",
  channels: "",
  tone: "",
  communicationStyle: "",
  avoidWords: "",
  differentials: "",
  faq: "",
  processes: "",
  rules: "",
  tools: "",
};

export const onboardingStepFields = {
  "company-basics": ["companyName", "industry", "description", "website"],
  positioning: ["mission", "vision", "valueProposition"],
  "products-services": ["products", "pricing"],
  "target-audience": ["idealCustomer", "painPoints", "channels"],
  "tone-of-voice": ["tone", "communicationStyle", "avoidWords"],
  "differentials-faq": ["differentials", "faq"],
  "processes-rules": ["processes", "rules", "tools"],
} as const satisfies Record<string, readonly (keyof OnboardingFormValues)[]>;

export function getOnboardingFormValues(
  data: Record<string, unknown>,
): OnboardingFormValues {
  const nextValues = { ...defaultOnboardingFormValues };

  for (const [stepKey, fields] of Object.entries(onboardingStepFields)) {
    const section = data[stepKey] as Record<string, unknown> | undefined;
    if (!section) continue;

    for (const field of fields) {
      const value = section[field];
      if (typeof value === "string") {
        nextValues[field] = value;
      }
    }
  }

  return nextValues;
}

export function buildOnboardingDraftData(
  values: OnboardingFormValues,
): Record<string, Record<string, string>> {
  return {
    "company-basics": {
      companyName: values.companyName,
      industry: values.industry,
      description: values.description,
      website: values.website,
    },
    positioning: {
      mission: values.mission,
      vision: values.vision,
      valueProposition: values.valueProposition,
    },
    "products-services": {
      products: values.products,
      pricing: values.pricing,
    },
    "target-audience": {
      idealCustomer: values.idealCustomer,
      painPoints: values.painPoints,
      channels: values.channels,
    },
    "tone-of-voice": {
      tone: values.tone,
      communicationStyle: values.communicationStyle,
      avoidWords: values.avoidWords,
    },
    "differentials-faq": {
      differentials: values.differentials,
      faq: values.faq,
    },
    "processes-rules": {
      processes: values.processes,
      rules: values.rules,
      tools: values.tools,
    },
  };
}
