'use client';

import React, { useState, forwardRef } from 'react';
import { TextField, TextFieldProps } from '@mui/material';

export const AutofillTextField = forwardRef<HTMLDivElement, TextFieldProps>((props, ref) => {
    const { value, onAnimationStart, name } = props;
    const [isAutofilled, setIsAutofilled] = useState(false);

    const handleAnimationStart = (e: React.AnimationEvent<HTMLInputElement>) => {
        const animationName = e.animationName;
        if (animationName === 'on-autofill-start') {
            setIsAutofilled(true);
        } else if (animationName === 'on-autofill-cancel') {
            setIsAutofilled(false);
        }
        onAnimationStart?.(e);
    };

    const shrink = isAutofilled || !!value;

    return (
        <TextField
            {...props}
            ref={ref}
            onAnimationStart={handleAnimationStart}
            InputLabelProps={{
                ...props.InputLabelProps,
                shrink,
            }}
        />
    );
});

AutofillTextField.displayName = 'AutofillTextField'; 