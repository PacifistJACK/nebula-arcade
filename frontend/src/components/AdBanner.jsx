import React, { useEffect } from 'react';

const AdBanner = ({ slot, format = 'auto', style = {} }) => {
    useEffect(() => {
        try {
            // Push ad after component mounts
            if (window.adsbygoogle && process.env.NODE_ENV === 'production') {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (e) {
            console.error('AdSense error:', e);
        }
    }, []);

    // Show placeholder in development
    if (process.env.NODE_ENV !== 'production') {
        return (
            <div
                className="border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center bg-gray-900/50"
                style={{ minHeight: '90px', ...style }}
            >
                <p className="text-gray-500 text-sm font-mono">Ad Placeholder</p>
            </div>
        );
    }

    return (
        <div style={style}>
            <ins
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // Replace with your AdSense ID
                data-ad-slot={slot}
                data-ad-format={format}
                data-full-width-responsive="true"
            />
        </div>
    );
};

export default AdBanner;
