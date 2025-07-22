"use client";

import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import Script from "next/script";

interface GrooveVideoWidgetProps {
    id: string;
    permalink: string;
}

export default function GrooveVideoWidget({ id, permalink }: GrooveVideoWidgetProps) {
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    return (
        <Box
            sx={{
                width: '100%',
                height: '100%',
                zIndex: 0,
                '& groovevideo-widget': {
                    width: '100% !important',
                    height: '100% !important',
                    objectFit: 'cover',
                    position: 'absolute !important',
                    top: '0 !important',
                    left: '0 !important',
                    right: '0 !important',
                    bottom: '0 !important',
                },
                '& [class*="groovevideo-widget-outer-container"]': {
                    width: '100% !important',
                    height: '100% !important',
                },
                '& [class*="groovevideo-widget-inner-container"]': {
                    width: '100% !important',
                    height: '100% !important',
                },
                '& iframe': {
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
            <style jsx global>{`
                .groovevideo-widget-outer-container-UjAdn2s5J45xXy4uBUas,
                .groovevideo-widget-inner-container-UjAdn2s5J45xXy4uBUas {
                    width: 100vw !important;
                    height: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    position: static !important;
                    left: 50% !important;
                    right: 50% !important;
                    margin-left: -50vw !important;
                    margin-right: -50vw !important;
                }
                .groovevideo-widget-inner-container-UjAdn2s5J45xXy4uBUas {
                    position: static !important;
                    width: 100vw !important;
                    left: 50% !important;
                    right: 50% !important;
                    margin-left: -50vw !important;
                    margin-right: -50vw !important;
                }
                /* More specific override for the inner container */
                div.groovevideo-widget-inner-container-UjAdn2s5J45xXy4uBUas {
                    position: static !important;
                }
                /* Even more specific with attribute selector */
                div[class*="groovevideo-widget-inner-container"] {
                    position: static !important;
                }
                /* Most specific - target the exact class */
                .groovevideo-widget-inner-container-UjAdn2s5J45xXy4uBUas {
                    position: static !important;
                    position: relative !important;
                    position: static !important;
                }
                .groovevideo-widget-outer-container-UjAdn2s5J45xXy4uBUas iframe,
                .groovevideo-widget-inner-container-UjAdn2s5J45xXy4uBUas iframe {
                    width: 100vw !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    min-width: 100vw !important;
                    max-width: none !important;
                    min-height: 100% !important;
                    max-height: none !important;
                }
                /* Override any inline styles that might be set */
                iframe[src*="youtube.com"] {
                    width: 100vw !important;
                    height: 100% !important;
                    min-width: 100vw !important;
                    max-width: none !important;
                    min-height: 100% !important;
                    max-height: none !important;
                }
            `}</style>

            {isHydrated && (
                <div dangerouslySetInnerHTML={{
                    __html: `<groovevideo-widget id="${id}" permalink="${permalink}"></groovevideo-widget>`
                }} />
            )}
        </Box>
    );
} 