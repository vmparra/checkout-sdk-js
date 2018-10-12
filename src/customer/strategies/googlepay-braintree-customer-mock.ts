import { CustomerInitializeOptions } from '../';
import { PaymentMethod } from '../../payment';
import { getGooglePay } from '../../payment/payment-methods.mock';

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
