import React from "react";
import Mlyn, { Show } from "react-mlyn";

interface FieldProps {
  label: string;
  field: any;
}

const RenderDefaultHeader = (props: FieldProps) => {
  const { label } = props;
  return <Mlyn.Div>{label}</Mlyn.Div>;
};

const RenderDefaultError = (props: FieldProps) => {
  const { field } = props;
  return <Mlyn.Div style={{ color: "red" }}>{field.error}</Mlyn.Div>;
};

export const Field = (
  props: FieldProps & {
    renderHeader?: () => React.ReactElement;
    renderError?: () => React.ReactElement;
    children: React.ReactElement | (() => React.ReactElement);
  }
) => {
  const { field } = props;
  const {
    renderHeader = () => <RenderDefaultHeader {...props} />,
    renderError = () => <RenderDefaultError {...props} />,
    children,
  } = props;
  return (
    <div>
      {renderHeader()}
      {typeof children === "function"
        ? children()
        : React.cloneElement(children, {
            onBlur: field.onBlur,
            onFocus: field.onFocus,
            bindValue: field.value,
          })}
      <Show
        when={() => {
          return field.error() && field.touched();
        }}
      >
        {renderError}
      </Show>
    </div>
  );
};
