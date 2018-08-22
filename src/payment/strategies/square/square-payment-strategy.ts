import { RequestSender, Response } from '@bigcommerce/request-sender';

import { PaymentStrategy } from '../';
import { isNonceLike } from '../..';
import {
    NonceInstrument,
    PaymentActionCreator,
    PaymentInitializeOptions,
    PaymentMethodActionCreator,
    PaymentRequestOptions,
    PaymentStrategyActionCreator
} from '../../';
import { CheckoutActionCreator, CheckoutStore, InternalCheckoutSelectors } from '../../../checkout';
import {
    InvalidArgumentError,
    MissingDataError,
    MissingDataErrorType,
    NotInitializedError,
    NotInitializedErrorType,
    StandardError,
    TimeoutError,
    UnsupportedBrowserError,
} from '../../../common/error/errors';
import { toFormUrlEncoded } from '../../../common/http-request';
import { OrderActionCreator, OrderRequestBody } from '../../../order';
import PaymentMethod from '../../payment-method';

import { SquarePaymentForm, SquareScriptLoader } from '.';
import {
    CardData,
    Contact,
    DigitalWalletType,
    NonceGenerationError,
    SquareFormElement,
    SquareFormOptions
} from './square-form';

export default class SquarePaymentStrategy extends PaymentStrategy {
    private _paymentForm?: SquarePaymentForm;
    private _paymentMethod?: PaymentMethod;
    private _deferredRequestNonce?: DeferredPromise;

    constructor(
        store: CheckoutStore,
        private _checkoutActionCreator: CheckoutActionCreator,
        private _orderActionCreator: OrderActionCreator,
        private _paymentActionCreator: PaymentActionCreator,
        private _paymentMethodActionCreator: PaymentMethodActionCreator,
        private _paymentStrategyActionCreator: PaymentStrategyActionCreator,
        private _requestSender: RequestSender,
        private _scriptLoader: SquareScriptLoader
    ) {
        super(store);
    }

    initialize(options: PaymentInitializeOptions): Promise<InternalCheckoutSelectors> {
        const { methodId } = options;

        this._paymentMethod = this._store.getState().paymentMethods.getPaymentMethod(methodId);

        return this._scriptLoader.load()
            .then(createSquareForm =>
                new Promise((resolve, reject) => {
                    this._paymentForm = createSquareForm(
                        this._getFormOptions(options, { resolve, reject })
                    );

                    this._paymentForm.build();
                }))
            .then(() => super.initialize(options));
    }

    execute(orderRequest: OrderRequestBody, options?: PaymentRequestOptions): Promise<InternalCheckoutSelectors> {
        const { payment } = orderRequest;

        if (!payment || !payment.methodId) {
            throw new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
        }

        this._paymentMethod = this._store.getState().paymentMethods.getPaymentMethod(payment.methodId);

        if (!this._paymentMethod || !this._paymentMethod.initializationData) {
            throw new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
        }

        const { nonce } = this._paymentMethod.initializationData.paymentData;

        const nonceInstrument: NonceInstrument = {
            nonce,
        };

        return this._getPaymentData(nonceInstrument)
            .then(() => {
                return this._store.dispatch(this._orderActionCreator.submitOrder(orderRequest, options))
                    .then(() => {
                        return this._store.dispatch(this._paymentActionCreator.submitPayment({ ...payment, paymentData: nonceInstrument }));
                    });
            });
    }

    private _getCountryCode(countryName: string) {
        switch (countryName.toUpperCase()) {
            case 'UNITED STATES':
                return 'US';
            case 'NEW ZELAND':
                return 'NZ';
            case 'AUSTRALIA':
                return 'AU';
            default:
                return 'US';
        }
    }

    private _getPaymentData(nonce: NonceInstrument): Promise<NonceInstrument> {
        if (isNonceLike(nonce)) {
            return Promise.resolve(nonce);
        }

        return new Promise<NonceInstrument>((resolve, reject) => {
            if (!this._paymentForm) {
                throw new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized);
            }

            if (this._deferredRequestNonce) {
                this._deferredRequestNonce.reject(new TimeoutError());
            }

            this._deferredRequestNonce = { resolve, reject };
            this._paymentForm.requestCardNonce();
        });
    }

    private _getFormOptions(options: PaymentInitializeOptions, deferred: DeferredPromise): SquareFormOptions {
        const { square: squareOptions, methodId } = options;

        if (!squareOptions || !this._paymentMethod) {
            throw new InvalidArgumentError('Unable to proceed because "options.square" argument is not provided.');
        }

        return {
            ...squareOptions,
            ...this._paymentMethod.initializationData,
            callbacks: {
                cardNonceResponseReceived: (errors, nonce, cardData, billingContact, shippingContact) => {
                    if (cardData && cardData.digital_wallet_type !== DigitalWalletType.none) {
                        this._setExternalCheckoutData(nonce, cardData, billingContact, shippingContact)
                            .then(() => this._paymentInstrumentSelected(methodId))
                            .then(() => squareOptions.onPaymentSelect && squareOptions.onPaymentSelect())
                            .catch(error => this._handleError(error));
                    } else {
                        this._cardNonceResponseReceived(nonce, errors);
                    }
                },
                createPaymentRequest: () => this._paymentRequestPayload(),
                methodsSupported: methods => {
                    const { masterpass } = squareOptions;
                    if (masterpass) {
                        this._showPaymentMethods(methods, masterpass);
                    }
                },
                paymentFormLoaded: () => {
                    deferred.resolve();
                    this._setPostalCode();
                },
                unsupportedBrowserDetected: () => deferred.reject(new UnsupportedBrowserError()),
            },
        };
    }

    private _cardNonceResponseReceived(nonce?: string, errors?: NonceGenerationError[]): void {
        if (!this._deferredRequestNonce) {
            throw new StandardError();
        }

        if (errors) {
            this._deferredRequestNonce.reject(this._parseNonceGenerationErrors(errors));
        }
        if (nonce) {
            this._deferredRequestNonce.resolve({ nonce });
        }
    }

    private _handleError(error: Error): never {
        if (error.name === 'SquareError') {
            throw new StandardError(error.message);
        }

        throw error;
    }

    private _parseNonceGenerationErrors(errors: NonceGenerationError[]) {
        const messages: string = errors
            .map(error => error.message)
            .join(', ');

        return messages;
    }

    private _paymentInstrumentSelected(methodId: string) {
        return this._store.dispatch(this._paymentStrategyActionCreator.widgetInteraction(() => {
                return Promise.all([
                    this._store.dispatch(this._checkoutActionCreator.loadCurrentCheckout()),
                    this._store.dispatch(this._paymentMethodActionCreator.loadPaymentMethod(methodId)),
                ]);
        }, { methodId }), { queueId: 'widgetInteraction' });
    }

    private _paymentRequestPayload() {
        const state = this._store.getState();
        const checkout = state.checkout.getCheckout();
        const storeConfig = state.config.getStoreConfig();

        if (!checkout) {
            throw new MissingDataError(MissingDataErrorType.MissingCheckout);
        }

        if (!storeConfig) {
            throw new MissingDataError(MissingDataErrorType.MissingCheckoutConfig);
        }

        return {
            requestShippingAddress: true,
            requestBillingInfo: true,
            currencyCode: storeConfig.currency.code,
            countryCode: this._getCountryCode(storeConfig.storeProfile.storeCountry),
            total: {
                label: storeConfig.storeProfile.storeName,
                amount: checkout.subtotal.toString(),
                pending: false,
            },
        };
    }

    private _setExternalCheckoutData(nonce?: string, cardData?: CardData, billingContact?: Contact, shippingContact?: Contact): Promise<Response> {
        return this._requestSender.post('/checkout.php', {
            headers: {
                Accept: 'text/html',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: toFormUrlEncoded({
                nonce,
                provider: 'squarev2',
                action: 'set_external_checkout',
                cardData: JSON.stringify(cardData),
                billingContact: JSON.stringify(billingContact),
                shippingContact: JSON.stringify(shippingContact),
            }),
        });
    }

    private _setPostalCode() {
        const state = this._store.getState();
        const billingAddress = state.billingAddress.getBillingAddress();

        if (!this._paymentForm) {
            throw new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized);
        }

        if (billingAddress && billingAddress.postalCode) {
            this._paymentForm.setPostalCode(billingAddress.postalCode);
        }
    }

    private _showPaymentMethods(methods: { [key: string]: boolean }, element: SquareFormElement) {
        const masterpassBtn = document.getElementById(element.elementId);
        if (masterpassBtn && methods.masterpass) {
            masterpassBtn.style.display = 'inline-block';
        }
    }
}

export interface DeferredPromise {
    resolve(resolution?: NonceInstrument): void;
    reject(reason?: any): void;
}

/**
 * A set of options that are required to initialize the Square payment method.
 *
 * Once Square payment is initialized, credit card form fields, provided by the
 * payment provider as iframes, will be inserted into the current page. These
 * options provide a location and styling for each of the form fields.
 */
export interface SquarePaymentInitializeOptions {
    /**
     * The location to insert the credit card number form field.
     */
    cardNumber: SquareFormElement;

    /**
     * The location to insert the CVV form field.
     */
    cvv: SquareFormElement;

    /**
     * The location to insert the expiration date form field.
     */
    expirationDate: SquareFormElement;

    /**
     * The location to insert the postal code form field.
     */
    postalCode: SquareFormElement;

    /**
     * The CSS class to apply to all form fields.
     */
    inputClass?: string;

    /**
     * The set of CSS styles to apply to all form fields.
     */
    inputStyles?: Array<{ [key: string]: string }>;

    /**
     * Initialize Masterpass placeholder ID
     */
    masterpass?: SquareFormElement;

    /**
     * A callback that gets called when the customer selects a payment option.
     */
    onPaymentSelect?(): void;
}
