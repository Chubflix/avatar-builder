import React from 'react';

/**
 * LightboxContent - Stops propagation for the content area
 */
export function LightboxContent({ children }) {
    return (
        <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            {children}
        </div>
    );
}
