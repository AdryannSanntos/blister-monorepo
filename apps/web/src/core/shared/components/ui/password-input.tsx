"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "src/core/shared/components/ui/input-group";

type PasswordInputProps = Omit<
  React.ComponentProps<typeof InputGroupInput>,
  "type"
>;

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <InputGroup>
        <InputGroupInput
          ref={ref}
          type={visible ? "text" : "password"}
          className={className}
          {...props}
        />
        <InputGroupButton
          tabIndex={-1}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          onClick={() => setVisible((v) => !v)}
          className="mr-1"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </InputGroupButton>
      </InputGroup>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
