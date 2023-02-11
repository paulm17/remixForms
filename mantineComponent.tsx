import { forwardRef } from "react"
import { Button, Input, Select, SelectProps } from "@mantine/core"

export const MantineButton = forwardRef<
  HTMLButtonElement,
  JSX.IntrinsicElements["button"]
>(({ type, ...props }, ref) => <Button type={type} {...props} ref={ref} />)

export const MantineInput = forwardRef<
  HTMLInputElement,
  JSX.IntrinsicElements["input"]
>(({ type = "text", size, ...props }, ref) => (
  <Input {...props} type={type} ref={ref} />
))

export const MantineSelect = forwardRef<
  HTMLSelectElement,
  JSX.IntrinsicElements["select"] &
    SelectProps &
    React.RefAttributes<HTMLInputElement>
>(({ data, ...props }, ref) => <Select {...props} data={data} ref={ref} />)
