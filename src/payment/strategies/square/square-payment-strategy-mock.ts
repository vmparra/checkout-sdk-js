import { PaymentInitializeOptions } from '../..';
import { OrderRequestBody } from '../../../order';
import { getOrderRequestBody } from '../../../order/internal-orders.mock';

import { CardBrand, CardData, DigitalWalletType } from './square-form';

const methodId = 'square';

export function getCardData(): CardData {
    return {
        card_brand: CardBrand.masterCard,
        last_4: 1234,
        exp_month: 1,
        exp_year: 2020,
        billing_postal_code: '12345',
        digital_wallet_type: DigitalWalletType.masterpass,
    };
}

export function getPayloadCreditCard(): OrderRequestBody {
    return {
        payment: {
            ...getOrderRequestBody().payment,
            methodId,
        },
    };
}

export function getPayloadVaulted() {
    return {
        ...getVaultedInstrumentRequestBody(),
        ...getOrderPayload(),
    };
}

export function getPayloadNonce() {
    return {
        ...getNonceInstrumentRequestBody(),
        ...getOrderPayload(),
    };
}

export function getSquarePaymentInitializeOptions(): PaymentInitializeOptions {
    return {
        methodId,
        square: {
            cardNumber: {
                elementId: 'cardNumber',
            },
            cvv: {
                elementId: 'cvv',
            },
            expirationDate: {
                elementId: 'expirationDate',
            },
            postalCode: {
                elementId: 'postalCode',
            },
            onPaymentSelect: () => { },
        },
    };
}

function getOrderPayload() {
    return {
        order: {
            id: 'id',
        },
    };
}

function getNonceInstrumentRequestBody(): OrderRequestBody {
    return {
        payment: {
            paymentData: {
                nonce: 'nonce',
            },
            methodId,
        },
    };
}

function getVaultedInstrumentRequestBody(): OrderRequestBody {
    return {
        useStoreCredit: true,
        payment: {
            paymentData: {
                instrumentId: 'string',
            },
            methodId,
        },
    };
}
