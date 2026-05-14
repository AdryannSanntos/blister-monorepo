import { z } from "zod";

export const onboardingFormSchema = z.object({
  companyName: z.string().trim().min(1, "Informe o nome da empresa"),
  industry: z.string().trim().min(1, "Informe o segmento da empresa"),
  description: z.string().trim().min(1, "Descreva brevemente a empresa"),
  website: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || /^https?:\/\//.test(value), {
      message: "Use uma URL iniciando com http:// ou https://",
    }),
  mission: z.string().trim().min(1, "Informe a missão"),
  vision: z.string().trim().min(1, "Informe a visão"),
  valueProposition: z.string().trim().min(1, "Informe a proposta de valor"),
  products: z.string().trim().min(1, "Liste os produtos ou serviços"),
  pricing: z.string().trim().min(1, "Informe o modelo de precificação"),
  idealCustomer: z.string().trim().min(1, "Descreva o cliente ideal"),
  painPoints: z.string().trim().min(1, "Descreva as dores do cliente"),
  channels: z.string().trim().min(1, "Informe os canais de aquisição"),
  tone: z.string().trim().min(1, "Informe o tom de voz"),
  communicationStyle: z
    .string()
    .trim()
    .min(1, "Descreva o estilo de comunicação"),
  avoidWords: z.string().trim().min(1, "Liste palavras ou expressões a evitar"),
  differentials: z
    .string()
    .trim()
    .min(1, "Descreva os diferenciais competitivos"),
  faq: z.string().trim().min(1, "Liste as perguntas frequentes"),
  processes: z.string().trim().min(1, "Descreva os processos-chave"),
  rules: z.string().trim().min(1, "Informe as regras de negócio"),
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
