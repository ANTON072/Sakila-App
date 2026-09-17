"use client";

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { useActionState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
} from "@/common";
import { login } from "../action";
import { loginSchema } from "../schema";

export function LoginForm() {
  const [lastResult, action, isPending] = useActionState(login, undefined);
  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: loginSchema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  return (
    <form {...getFormProps(form)} action={action} noValidate>
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Login to your account</CardTitle>
          <CardDescription>
            Enter your username below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!fields.username.errors?.length}>
              <FieldLabel>Username</FieldLabel>
              <Input {...getInputProps(fields.username, { type: "text" })} />
              <FieldError>{fields.username.errors}</FieldError>
            </Field>
            <Field data-invalid={!!fields.password.errors?.length}>
              <FieldLabel>Password</FieldLabel>
              <Input
                {...getInputProps(fields.password, { type: "password" })}
              />
              <FieldError>{fields.password.errors}</FieldError>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button type="submit" className="w-full" disabled={isPending}>
            Login
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
