import '@testing-library/jest-dom';

declare global {
    namespace jest {
        interface Matchers<R> {
            toBeInTheDocument(): R;
            toBeChecked(): R;
            toHaveClass(className: string): R;
            toHaveAttribute(attr: string, value?: string): R;
            toHaveTextContent(text: string | RegExp): R;
            toBeVisible(): R;
            toBeDisabled(): R;
            toBeEnabled(): R;
            toHaveValue(value: string | string[] | number): R;
            toBeEmpty(): R;
            toHaveFocus(): R;
            toHaveFormValues(expectedValues: Record<string, any>): R;
        }
    }
}

export { };
