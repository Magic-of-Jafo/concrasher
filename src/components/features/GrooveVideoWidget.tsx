"use client";

import React from "react";
import { Box } from "@mui/material";
import Script from "next/script";

interface GrooveVideoWidgetProps {
    id: string;
    permalink: string;
}

export default function GrooveVideoWidget({ id, permalink }: GrooveVideoWidgetProps) {
    return (
        <Box
            sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 0,
                '& groovevideo-widget': {
                    width: '100% !important',
                    height: '100% !important',
                    objectFit: 'cover',
                },
            }}
        >
            <link href="https://widget.groovevideo.com/widget/app.css" rel="stylesheet" />
            <Script
                src="https://widget.groovevideo.com/widget/app.js"
                strategy="lazyOnload"
            />

            <div dangerouslySetInnerHTML={{
                __html: `<groovevideo-widget id="${id}" permalink="${permalink}"></groovevideo-widget>`
            }} />
        </Box>
    );
} 