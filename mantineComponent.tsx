import { forwardRef } from "react"
import { Button, Input, Select } from "@mantine/core"

export const MantineInput = forwardRef<
  HTMLInputElement,
  JSX.IntrinsicElements["input"]
>(({ type = "text", size, ...props }, ref) => (
  <Input {...props} type={type} ref={ref} />
))

export const MantineButton = forwardRef<
  HTMLButtonElement,
  JSX.IntrinsicElements["button"]
>(({ type = "button", ...props }, ref) => (
  <Button {...props} type={type} ref={ref} />
))

type selectProps = {
  data: { value: string; label: string }[]
  dropdownPosition?: "top" | "bottom"
}

export const MantineSelect = forwardRef<
  HTMLInputElement,
  selectProps & JSX.IntrinsicElements["select"]
>(({ data, ...props }, ref) => <Select {...props} ref={ref} data={data} />)
