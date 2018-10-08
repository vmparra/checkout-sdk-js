import { CustomerInitializeOptions } from '../';
import { createRequestSender } from '../../../node_modules/@bigcommerce/request-sender/lib';
import { getScriptLoader } from '../../../node_modules/@bigcommerce/script-loader/lib/';
import { BillingAddressActionCreator, BillingAddressRequestSender } from '../../billing';
import { CheckoutStore } from '../../checkout';
import { PaymentMethod, PaymentMethodActionCreator, PaymentMethodRequestSender } from '../../payment';
import { getGooglePay } from '../../payment/payment-methods.mock';
import { BraintreeScriptLoader, BraintreeSDKCreator } from '../../payment/strategies/braintree';
import { GooglePayBraintreeInitializer, GooglePayPaymentProcessor, GooglePayScriptLoader } from '../../payment/strategies/googlepay';
import { createShippingStrategyRegistry, ShippingStrategyActionCreator } from '../../shipping';

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
        new ShippingStrategyActionCreator(createShippingStrategyRegistry(store, requestSender)),
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
    InvalidContainer,
    Incomplete,
}

export function getCustomerInitilaizeOptions(mode: Mode = Mode.Full): CustomerInitializeOptions {
    const methodId = { methodId: 'googlepay' };
    const undefinedMethodId = { methodId: undefined };
    const container = { container: 'googlePayCheckoutButton' };
    const invalidContainer = { container: 'invalid_container' };
    const googlepay = { googlepaybraintree: { ...container } };
    const googlepayWithInvalidContainer = { googlepaybraintree: { ...invalidContainer } };

    switch (mode) {
        case Mode.Incomplete: {
            return { ...methodId };
        }
        case Mode.UndefinedMethodId: {
            return { ...undefinedMethodId, ...googlepay };
        }
        case Mode.InvalidContainer: {
            return { ...methodId, ...googlepayWithInvalidContainer };
        }
        default: {
            return { ...methodId, ...googlepay };
        }
     }
}
