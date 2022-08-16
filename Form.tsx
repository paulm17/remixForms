import React, { PropsWithoutRef, useEffect, useMemo, useState } from "react"
import { SomeZodObject, z, ZodTypeAny } from "zod"
import {
  useForm,
  UseFormReturn,
  FieldError,
  Path,
  UseFormProps,
  ValidationMode,
  DeepPartial,
} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import createField, { FieldProps, FieldType } from "./createField"
import mapChildren from "./mapChildren"
import defaultRenderField from "./defaultRenderField"
import inferLabel from "./inferLabel"
import { shapeInfo, ZodTypeName } from "./shapeInfo"
import { concat } from "lodash/fp"
import { ButtonProps } from "@mantine/core"
import { RegularIcons } from "../fontAwesomeIcon"

export type FormMethod = "get" | "post" | "put" | "patch" | "delete"

export type Field<SchemaType> = {
  shape: ZodTypeAny | undefined
  fieldType: FieldType
  name: keyof SchemaType
  required: boolean
  label?: string
  options?: Option[]
  errors?: string[]
  autoFocus?: boolean
  defaultValue?: any
  value?: any
  hidden?: boolean
  multiline?: boolean
  placeholder?: string
}

type FieldComponent<Schema extends SomeZodObject> =
  React.ForwardRefExoticComponent<FieldProps<Schema> & React.RefAttributes<any>>

export type RenderFieldProps<Schema extends SomeZodObject> = Field<
  z.infer<Schema>
> & {
  Field: FieldComponent<Schema>
}

export type RenderField<Schema extends SomeZodObject> = (
  props: RenderFieldProps<Schema>,
) => JSX.Element

export type Option = { name: string } & Required<
  Pick<React.OptionHTMLAttributes<HTMLOptionElement>, "value">
>

type Options<SchemaType> = Partial<Record<keyof SchemaType, Option[]>>

type Children<Schema extends SomeZodObject> = (
  helpers: {
    Field: FieldComponent<Schema>
    Errors: React.ComponentType<JSX.IntrinsicElements["div"]> | string
    Error: React.ComponentType<JSX.IntrinsicElements["div"]> | string
    Button:
      | React.ComponentType<JSX.IntrinsicElements["button"] & ButtonProps>
      | string
  } & UseFormReturn<z.infer<Schema>, any>,
) => React.ReactNode

export type FormValues<SchemaType> = Partial<Record<keyof SchemaType, any>>

export type FormErrors<SchemaType> = Partial<
  Record<keyof SchemaType | "_global", string[]>
>

export type FormProps<Schema extends SomeZodObject> = {
  mode?: keyof ValidationMode
  renderField?: RenderField<Schema>
  fieldComponent?: React.ComponentType<JSX.IntrinsicElements["div"]> | string
  globalErrorsComponent?:
    | React.ComponentType<JSX.IntrinsicElements["div"]>
    | string
  fieldErrorsComponent?:
    | React.ComponentType<JSX.IntrinsicElements["div"]>
    | string
  errorComponent?: React.ComponentType<JSX.IntrinsicElements["div"]> | string
  labelComponent?: React.ComponentType<JSX.IntrinsicElements["label"]> | string
  inputComponent?:
    | React.ForwardRefExoticComponent<
        React.PropsWithoutRef<JSX.IntrinsicElements["input"]> &
          React.RefAttributes<HTMLInputElement>
      >
    | string
  multilineComponent?:
    | React.ForwardRefExoticComponent<
        React.PropsWithoutRef<JSX.IntrinsicElements["textarea"]> &
          React.RefAttributes<HTMLTextAreaElement>
      >
    | string
  selectComponent?:
    | React.ForwardRefExoticComponent<
        React.PropsWithoutRef<JSX.IntrinsicElements["select"]> &
          React.RefAttributes<HTMLSelectElement>
      >
    | string
  checkboxComponent?:
    | React.ForwardRefExoticComponent<
        React.PropsWithoutRef<JSX.IntrinsicElements["input"]> &
          React.RefAttributes<HTMLInputElement>
      >
    | string
  checkboxWrapperComponent?:
    | React.ComponentType<JSX.IntrinsicElements["div"]>
    | string
  buttonComponent?:
    | React.ComponentType<JSX.IntrinsicElements["button"]>
    | string
  buttonLabel?: string
  pendingButtonLabel?: string
  method?: FormMethod
  schema: Schema
  defaultValues?: DeepPartial<z.infer<Schema>>
  errors?: FormErrors<z.infer<Schema>>
  values?: FormValues<z.infer<Schema>>
  labels?: Partial<Record<keyof z.infer<Schema>, string>>
  placeholders?: Partial<Record<keyof z.infer<Schema>, string>>
  options?: Options<z.infer<Schema>>
  hiddenFields?: Array<keyof z.infer<Schema>>
  multiline?: Array<keyof z.infer<Schema>>
  beforeChildren?: React.ReactNode
  parseActionData?: (data: any) => any
  onSubmit: (values: z.infer<Schema>) => Promise<void | OnSubmitResult>
  children?: Children<Schema>
}

export interface FormProps2<S extends z.ZodType<any, any>>
  extends Omit<PropsWithoutRef<JSX.IntrinsicElements["form"]>, "onSubmit"> {
  /** Icon, Text to display in the submit button */
  submitIcon?: RegularIcons
  submitText?: string
  schema?: S
  onSubmit: (values: z.infer<S>) => Promise<void | OnSubmitResult>
  onCancel?: (values: z.infer<S>) => void
  initialValues?: UseFormProps<z.infer<S>>["defaultValues"]
}

interface OnSubmitResult {
  FORM_ERROR?: string
  [prop: string]: any
}

export const FORM_ERROR = "FORM_ERROR"

const fieldTypes: Record<ZodTypeName, FieldType> = {
  ZodString: "string",
  ZodNumber: "number",
  ZodBoolean: "boolean",
  ZodDate: "date",
  ZodEnum: "string",
}

export function Form<Schema extends SomeZodObject>({
  mode = "onSubmit",
  renderField = defaultRenderField,
  fieldComponent,
  globalErrorsComponent: Errors = "div",
  errorComponent: Error = "div",
  fieldErrorsComponent,
  labelComponent,
  inputComponent,
  multilineComponent,
  selectComponent,
  checkboxComponent,
  checkboxWrapperComponent,
  buttonComponent: Button = "button",
  buttonLabel: rawButtonLabel = "OK",
  pendingButtonLabel = "OK",
  method = "post",
  schema,
  beforeChildren,
  parseActionData,
  children: childrenFn,
  labels,
  placeholders,
  options,
  hiddenFields,
  multiline,
  defaultValues,
  errors: errorsProp,
  values: valuesProp,
  ...props
}: FormProps<Schema>) {
  type SchemaType = z.infer<Schema>

  const unparsedActionData = undefined
  const actionErrors = [] as FormErrors<SchemaType>
  const actionValues = [] as FormValues<SchemaType>
  const errors = { ...errorsProp, ...actionErrors }
  const values = { ...valuesProp, ...actionValues }

  const form = useForm<SchemaType>({
    resolver: zodResolver(schema),
    mode,
    defaultValues,
  })

  const { formState, setError } = form
  const { errors: formErrors, isValid } = formState
  const [disabled, setDisabled] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const { onSubmit, ...newProps } = props

  const onSubmitAction = async values => {
    const result = (await onSubmit(values)) || {}
    for (const [key, value] of Object.entries(result)) {
      if (key === FORM_ERROR) {
        setFormError(value)
      } else {
        setError(key as any, {
          type: "submit",
          message: value,
        })
      }
    }
  }

  const Field = useMemo(
    () =>
      createField<Schema>({
        register: form.register,
        fieldComponent,
        labelComponent,
        inputComponent,
        multilineComponent,
        selectComponent,
        checkboxComponent,
        checkboxWrapperComponent,
        fieldErrorsComponent,
        errorComponent: Error,
      }),
    [
      fieldComponent,
      labelComponent,
      inputComponent,
      multilineComponent,
      selectComponent,
      checkboxComponent,
      checkboxWrapperComponent,
      fieldErrorsComponent,
      Error,
      form.register,
    ],
  )

  // handle errors
  useEffect(() => {
    for (const stringKey in schema.shape) {
      const key = stringKey as keyof SchemaType
      if (errors && errors[key]?.length) {
        try {
          form.setFocus(key as Path<SchemaType>)
        } catch {}
      }
    }
  }, [errors, errorsProp, form, schema.shape, unparsedActionData])

  // handle autofocus
  let autoFocused = false
  let fields: Field<SchemaType>[] = []
  for (const stringKey in schema.shape) {
    const key = stringKey as keyof SchemaType
    const message = (formErrors[key] as unknown as FieldError)?.message
    const shape = schema.shape[stringKey]
    const errorsArray = (message && [message]) || (errors && errors[key])

    const fieldErrors =
      errorsArray && errorsArray.length ? errorsArray : undefined

    const autoFocus = Boolean(fieldErrors && !autoFocused)
    if (autoFocus) autoFocused = true

    const { typeName, optional, nullable, getDefaultValue, enumValues } =
      shapeInfo(shape)

    const fieldType = typeName ? fieldTypes[typeName] : "string"
    const required = !(optional || nullable)
    const propOptions = options && options[key]

    const enumOptions = enumValues
      ? enumValues.map((value: string) => ({
          name: inferLabel(value),
          value,
        }))
      : undefined

    const rawOptions = propOptions || enumOptions

    const fieldOptions =
      rawOptions && !required
        ? concat([{ name: "", value: "" }], rawOptions)
        : rawOptions

    const label = (labels && labels[key]) || inferLabel(String(stringKey))

    fields.push({
      shape,
      fieldType,
      name: stringKey,
      required,
      label,
      options: fieldOptions,
      errors: fieldErrors,
      autoFocus,
      value: (values && values[key]) || (getDefaultValue && getDefaultValue()),
      defaultValue:
        (defaultValues && defaultValues[stringKey]) ||
        (getDefaultValue && getDefaultValue()),
      hidden: hiddenFields && Boolean(hiddenFields.find(item => item === key)),
      multiline: multiline && Boolean(multiline.find(item => item === key)),
      placeholder: placeholders && placeholders[key],
    })
  }

  const globalErrors = errors?._global || []

  if (formError?.length) {
    globalErrors!.push(formError)
  }

  // submit button label
  const buttonLabel = formState.isSubmitting
    ? pendingButtonLabel
    : rawButtonLabel

  if (childrenFn) {
    const children = childrenFn({
      Field,
      Errors,
      Error,
      Button,
      ...form,
    })

    return (
      <form
        autoComplete="off"
        method={method}
        onSubmit={form.handleSubmit(onSubmitAction)}
        {...newProps}
      >
        {beforeChildren}
        {mapChildren(children, child => {
          if (!React.isValidElement(child)) return child

          if (child.type === Field) {
            const { name } = child.props
            const field = fields.find(field => field.name === name)

            const autoFocus = autoFocused
              ? field?.autoFocus
              : child.props.autoFocus

            if (!child.props.children && field) {
              return renderField({
                Field,
                ...field,
                ...child.props,
                autoFocus,
              })
            }

            return React.cloneElement(child, {
              shape: field?.shape,
              fieldType: field?.fieldType,
              label: field?.label,
              placeholder: field?.placeholder,
              required: field?.required,
              options: field?.options,
              value: field?.value,
              errors: field?.errors,
              hidden: field?.hidden,
              multiline: field?.multiline,
              ...child.props,
              autoFocus,
            })
          } else if (child.type === Errors) {
            if (!child.props.children && !globalErrors?.length) return null

            if (child.props.children || !globalErrors?.length) {
              return React.cloneElement(child, {
                role: "alert",
                ...child.props,
              })
            }

            return React.cloneElement(child, {
              role: "alert",
              children: globalErrors.map(error => (
                <Error key={error}>{error}</Error>
              )),
              ...child.props,
            })
          } else if (child.type === Button) {
            return React.cloneElement(child, {
              disabled,
              children: buttonLabel,
              ...child.props,
            })
          } else {
            return child
          }
        })}
      </form>
    )
  }

  return (
    <form
      method={method}
      onSubmit={form.handleSubmit(onSubmitAction)}
      {...newProps}
    >
      {beforeChildren}
      {fields.map(field => renderField({ Field, ...field }))}
      {globalErrors?.length && (
        <Errors role="alert">
          {globalErrors.map(error => (
            <Error key={error}>{error}</Error>
          ))}
        </Errors>
      )}
      <Button disabled={disabled}>{buttonLabel}</Button>
    </form>
  )
}
