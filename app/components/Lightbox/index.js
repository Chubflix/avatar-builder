import React from 'react';
import { LightboxProvider, useLightbox } from '../../context/LightboxContext';
import { LightboxOverlay } from './LightboxOverlay';
import { LightboxContent } from './LightboxContent';
import { LightboxFlagControls } from './LightboxFlagControls';
import { LightboxControls } from './LightboxControls';
import { LightboxNavigation } from './LightboxNavigation';
import { LightboxImage } from './LightboxImage';
import { LightboxComparison } from './LightboxComparison';
import { LightboxDetails } from './LightboxDetails';
import { LightboxInfo } from './LightboxInfo';
import { LightboxActions } from './LightboxActions';
import { LightboxLocationPicker } from './LightboxLocationPicker';

/**
 * Lightbox - Default compound component for displaying images in a lightbox
 *
 * @example
 * <Lightbox {...props}>
 *   <Lightbox.Overlay>
 *     <Lightbox.Content>
 *       <Lightbox.FlagControls />
 *       <Lightbox.Controls />
 *       <Lightbox.Navigation />
 *       <div className="lightbox-main-content">
 *         <Lightbox.Comparison />
 *         <Lightbox.Image />
 *         <Lightbox.Details />
 *       </div>
 *       <div className="lightbox-content-wrapper">
 *         <Lightbox.Info />
 *         <Lightbox.Actions />
 *       </div>
 *     </Lightbox.Content>
 *     <Lightbox.LocationPicker />
 *   </Lightbox.Overlay>
 * </Lightbox>
 *
 * For custom lightbox implementations, use LightboxProvider directly:
 * @example
 * function MyCustomLightbox({ children, ...props }) {
 *   return <LightboxProvider {...props}>{children}</LightboxProvider>;
 * }
 * MyCustomLightbox.Controls = MyCustomControls;
 * MyCustomLightbox.Image = LightboxImage; // Reuse what you need
 */
function Lightbox({ children, ...props }) {
    return (
        <LightboxProvider {...props}>
            {children}
        </LightboxProvider>
    );
}

// Attach sub-components for default implementation
Lightbox.Overlay = LightboxOverlay;
Lightbox.Content = LightboxContent;
Lightbox.FlagControls = LightboxFlagControls;
Lightbox.Controls = LightboxControls;
Lightbox.Navigation = LightboxNavigation;
Lightbox.Image = LightboxImage;
Lightbox.Comparison = LightboxComparison;
Lightbox.Details = LightboxDetails;
Lightbox.Info = LightboxInfo;
Lightbox.Actions = LightboxActions;
Lightbox.LocationPicker = LightboxLocationPicker;

// Export the provider for custom lightbox implementations
export { LightboxProvider };

// Export the hook for custom components
export { useLightbox };

// Export all sub-components individually for mix-and-match composition
export {
    LightboxOverlay,
    LightboxContent,
    LightboxFlagControls,
    LightboxControls,
    LightboxNavigation,
    LightboxImage,
    LightboxComparison,
    LightboxDetails,
    LightboxInfo,
    LightboxActions,
    LightboxLocationPicker
};

export default Lightbox;
