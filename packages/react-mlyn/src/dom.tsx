import { PrimitiveSubject } from "mlyn";
import React from "react";
import { seal, mlynify } from "./utils";

const InputBase = mlynify<React.HTMLProps<HTMLInputElement>>("input");
const TextareaBase = mlynify<React.HTMLProps<HTMLTextAreaElement>>("textarea");
const SelectBase = mlynify<React.HTMLProps<HTMLSelectElement>>("select");

interface BindChecked {
  "bind:checked"?: PrimitiveSubject<boolean>;
  bindChecked?: PrimitiveSubject<boolean>;
}

interface BindValue {
  "bind:value"?: PrimitiveSubject<string>;
  bindValue?: PrimitiveSubject<string>;
}

type InputProps = Parameters<typeof InputBase>[0] & BindChecked & BindValue;
type SelectProps = Parameters<typeof SelectBase>[0] & BindValue;
type TextareaProps = Parameters<typeof TextareaBase>[0] & BindValue;

const bindChecked = <T extends object>(propsClone: T) => {
  const checked$ = propsClone["bind:checked"] || propsClone["bindChecked"];
  if (checked$) {
    const subject$ = checked$;
    propsClone["checked$"] = subject$;
    propsClone["onChange"] = (e) => {
      subject$((e.target as HTMLInputElement).checked);
    };
    delete propsClone["bind:checked"];
    delete propsClone["bindChecked"];
  }
};

const bindValue = <T extends object>(propsClone: T) => {
  const value$ = propsClone["bind:value"] || propsClone["bindValue"];
  if (value$) {
    const subject$ = value$;
    propsClone["value$"] = subject$;
    propsClone["onChange"] = (e) => {
      subject$((e.target as HTMLInputElement).value);
    };
    delete propsClone["bind:value"];
    delete propsClone["bindValue"];
  }
  return propsClone;
};

const Textarea = seal((props: TextareaProps) => {
  const propsClone: TextareaProps = { ...props };
  bindValue<TextareaProps>(propsClone);
  return <TextareaBase {...propsClone} />;
});

const Select = seal((props: SelectProps) => {
  const propsClone: SelectProps = { ...props };
  bindValue<SelectProps>(propsClone);
  return <SelectBase {...propsClone} />;
});

const Input = seal((props: InputProps) => {
  const propsClone = { ...props };
  bindValue(propsClone);
  bindChecked(propsClone);
  return <InputBase {...propsClone} />;
});

const Div = mlynify<React.HTMLProps<HTMLDivElement>>("div");
const Span = mlynify<React.HTMLProps<HTMLSpanElement>>("span");
const A = mlynify<React.HTMLProps<HTMLAnchorElement>>("a");
const Table = mlynify<React.HTMLProps<HTMLTableElement>>("table");
const Tr = mlynify<React.HTMLProps<HTMLTableRowElement>>("tr");
const Td = mlynify<React.HTMLProps<HTMLTableCellElement>>("td");
const Button = mlynify<React.HTMLProps<HTMLButtonElement>>("button");

export const Mlyn: {
  Div: typeof Div;
  Input: typeof Input;
  Button: typeof Button;
  Span: typeof Span;
  A: typeof A;
  Table: typeof Table;
  Tr: typeof Tr;
  Td: typeof Td;
  Textarea: typeof Textarea;
  Select: typeof Select;
} = {
  Div,
  Input,
  Button,
  Span,
  A,
  Table,
  Tr,
  Td,
  Textarea,
  Select,
};
