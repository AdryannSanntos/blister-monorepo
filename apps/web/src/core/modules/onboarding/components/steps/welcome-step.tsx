"use client";

import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";

export function WelcomeStep() {
  return (
    <CardHeader className="text-center">
      <CardTitle className="text-2xl">Bem-vindo ao Company OS</CardTitle>
      <CardDescription className="mx-auto max-w-md text-base">
        Vamos configurar o contexto da sua empresa em poucos passos. Essas
        informações alimentam o Company Brain — a inteligência que conhece seu
        negócio.
      </CardDescription>
    </CardHeader>
  );
}
