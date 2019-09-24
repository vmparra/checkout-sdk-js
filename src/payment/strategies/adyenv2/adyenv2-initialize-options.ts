import Omit from '../../../common/types/omit';

import { CreditCardComponentOptions } from './adyenv2';

/**
 * A set of options that are required to initialize the AdyenV2 payment method.
 *
 * Once AdyenV2 payment is initialized, credit card form fields, provided by the
 * payment provider as iframes, will be inserted into the current page. These
 * options provide a location and styling for each of the form fields.
 */
export default interface AdyenV2PaymentInitializeOptions {
    /**
     * The location to insert the Adyen component.
     */
    containerId: string;

    /**
     * The location to insert the Adyen 3DS component.
     */
    container3DSId: string;

    /**
     * Optional. Overwriting the default options
     */
    options?: Omit<CreditCardComponentOptions, 'onChange'>;

    /**
     * Specify Three3DSChallenge Widget Size
     */
    threeDS2ChallengeWidgetSize?: string;

    on3DSLoading?(): void;

    on3DSComplete?(): void;
}
