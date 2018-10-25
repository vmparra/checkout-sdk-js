import { createRequestSender } from '@bigcommerce/request-sender/lib';
import { getScriptLoader } from '@bigcommerce/script-loader/lib/';

import { CheckoutButtonMethodType } from '../';
import { BillingAddressActionCreator, BillingAddressRequestSender } from '../../../billing';
import { CheckoutStore } from '../../../checkout';
import { PaymentMethod, PaymentMethodActionCreator, PaymentMethodRequestSender } from '../../../payment';
import { getGooglePay } from '../../../payment/payment-methods.mock';
import { BraintreeScriptLoader, BraintreeSDKCreator } from '../../../payment/strategies/braintree';
import { GooglePayBraintreeInitializer, GooglePayPaymentProcessor, GooglePayScriptLoader } from '../../../payment/strategies/googlepay';
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
    const container = { container: 'googlePayCheckoutButton' };
    const undefinedContainer = { containerId: '' };
    const invalidContainerId = { containerId: 'invalid_container' };
    const invalidContainer = { container: 'invalid_container' };
    const googlepay = { googlepaybraintree: { } };
    const googlepayWithUndefinedContainer = { googlepaybraintree: { ...undefinedContainer } };
    const googlepayWithInvalidContainer = { googlepaybraintree: { ...invalidContainer } };

    switch (mode) {
        case Mode.Incomplete: {
            return { ...methodId, containerId };
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
