import { PaymentInitializeOptions } from '../..';
import { getOrderRequestBody } from '../../../order/internal-orders.mock';
import OrderRequestBody from '../../../order/order-request-body';

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

export function getPayloadCreditCard() {
    return {
        ..._getCreditCardRequestBody(),
        ..._getOrderPayload(),
    };
}

export function getPayloadVaulted() {
    return {
        ..._getVaultedInstrumentRequestBody(),
        ..._getOrderPayload(),
    };
}

export function getPayloadNonce() {
    return {
        ..._getNonceInstrumentRequestBody(),
        ..._getOrderPayload(),
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

function _getOrderPayload() {
    return {
        order: {
            id: 'id',
        },
    };
}

function _getCreditCardRequestBody(): OrderRequestBody {
    return {
        payment: {
            ...getOrderRequestBody().payment,
            methodId,
        },
    };
}

function _getNonceInstrumentRequestBody(): OrderRequestBody {
    return {
        payment: {
            paymentData: {
                nonce: 'nonce',
            },
            methodId,
        },
    };
}

function _getVaultedInstrumentRequestBody(): OrderRequestBody {
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
