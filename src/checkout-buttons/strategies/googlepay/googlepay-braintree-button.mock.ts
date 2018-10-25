import { createRequestSender } from '@bigcommerce/request-sender/lib';
import { getScriptLoader } from '@bigcommerce/script-loader/lib/';

import { CheckoutButtonMethodType } from '../';
import { BillingAddressActionCreator, BillingAddressRequestSender } from '../../../billing';
import { CheckoutRequestSender, CheckoutStore } from '../../../checkout';
import { PaymentMethod, PaymentMethodActionCreator, PaymentMethodRequestSender } from '../../../payment';
import { getGooglePay } from '../../../payment/payment-methods.mock';
import { BraintreeScriptLoader, BraintreeSDKCreator } from '../../../payment/strategies/braintree';
import { GooglePayBraintreeInitializer, GooglePayPaymentProcessor, GooglePayScriptLoader } from '../../../payment/strategies/googlepay';
import { ConsignmentActionCreator, ConsignmentRequestSender } from '../../../shipping';
import { CheckoutButtonInitializeOptions } from '../../checkout-button-options';

const requestSender = createRequestSender();
const scriptLoader = getScriptLoader();
const braintreeSdkCreator = new BraintreeSDKCreator(new BraintreeScriptLoader(scriptLoader));

export function getGooglePayPaymentProcessor(store: CheckoutStore): GooglePayPaymentProcessor {

    return new GooglePayPaymentProcessor(
        store,
        new PaymentMethodActionCreator(new PaymentMethodRequestSender(requestSender)),
        new GooglePayScriptLoader(scriptLoader),
        new GooglePayBraintreeInitializer(braintreeSdkCreator),
        new BillingAddressActionCreator(new BillingAddressRequestSender(requestSender)),
        new ConsignmentActionCreator(
                new ConsignmentRequestSender(requestSender),
                new CheckoutRequestSender(requestSender)),
        requestSender
    );
}

export function getPaymentMethod(): PaymentMethod {
    return {
        ...getGooglePay(),
        initializationData: {
            checkoutId: 'checkoutId',
            allowedCardTypes: ['visa', 'amex', 'mastercard'],
        },
    };
}

export enum Mode {
    Full,
    UndefinedMethodId,
    UndefinedContainer,
    InvalidContainer,
    Incomplete,
}

export function getCheckoutButtonOptions(mode: Mode = Mode.Full): CheckoutButtonInitializeOptions {
    const methodId = { methodId: CheckoutButtonMethodType.GOOGLEPAY_BRAINTREE };
    const undefinedMethodId = { methodId: '' };
    const containerId = 'googlePayCheckoutButton';
    const undefinedContainerId = { containerId : '' };
    const invalidContainerId = { containerId: 'invalid_container' };
    const googlepay = { googlepaybraintree: { } };

    switch (mode) {
        case Mode.Incomplete: {
            return { ...methodId };
        }
        case Mode.UndefinedMethodId: {
            return { ...undefinedMethodId, containerId };
        }
        case Mode.UndefinedContainer: {
            return { ...methodId, ...undefinedContainerId };
        }
        case Mode.InvalidContainer: {
            return { ...methodId, ...invalidContainerId };
        }
        default: {
            return { ...methodId, containerId, ...googlepay };
        }
    }
}
