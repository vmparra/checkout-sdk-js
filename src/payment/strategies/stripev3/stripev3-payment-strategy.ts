import { CheckoutActionCreator, CheckoutStore, InternalCheckoutSelectors } from '../../../checkout';
import {
    InvalidArgumentError,
    MissingDataError,
    MissingDataErrorType,
    StandardError
} from '../../../common/error/errors';
import { OrderActionCreator, OrderRequestBody } from '../../../order';
import { OrderFinalizationNotRequiredError } from '../../../order/errors';
import { PaymentArgumentInvalidError } from '../../errors';
import PaymentActionCreator from '../../payment-action-creator';
import PaymentMethodActionCreator from '../../payment-method-action-creator';
import { PaymentInitializeOptions, PaymentRequestOptions } from '../../payment-request-options';
import PaymentStrategyActionCreator from '../../payment-strategy-action-creator';
import PaymentStrategy from '../payment-strategy';

import { StripeScriptLoader } from './index';

export default class StripeV3PaymentStrategy implements PaymentStrategy {
    private stripeJs: any;
    private cardElement: any;

    constructor(
        private _store: CheckoutStore,
        private _paymentMethodActionCreator: PaymentMethodActionCreator,
        private _paymentActionCreator: PaymentActionCreator,
        private _orderActionCreator: OrderActionCreator,
        private _stripeScriptLoader: StripeScriptLoader
    ) {}

    initialize(options?: PaymentInitializeOptions): Promise<InternalCheckoutSelectors> {
        if (!options) {
            throw new InvalidArgumentError('Unable to initialize payment because "options" argument is not provided.');
        }

        const DOMElement = options.stripev3;

        if (!DOMElement) {
            throw new InvalidArgumentError('Unable to initialize payment because "options" argument is not provided.');
        }

        return this._stripeScriptLoader.load('pk_test_OiGqP4ZezFBTJErOWeMFumjE') // options.initializationData.stripePublishableKey
            .then(stripeJs => {
                this.stripeJs = stripeJs;
                const elements = this.stripeJs.elements();
                this.cardElement = elements.create('card', {
                    style: DOMElement.inputStyles,
                });
                this.cardElement.mount('#' + DOMElement.cardElement);

                return Promise.resolve(this.cardElement);
            });
    }

    execute(payload: OrderRequestBody, options?: PaymentRequestOptions): Promise<InternalCheckoutSelectors> {
        const { payment, ...order } = payload;

        if (!payment) {
            throw new PaymentArgumentInvalidError(['payment.paymentData']);
        }

        if (!options) {
            throw new InvalidArgumentError('Unable to initialize payment because "options" argument is not provided.');
        }

        return this._store.dispatch(this._paymentMethodActionCreator.loadPaymentMethod(options.methodId))
            .then(state => {
                const paymentMethod = state.paymentMethods.getPaymentMethod(options.methodId);

                if (!paymentMethod || !paymentMethod.clientToken) {
                    throw new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
                }

                return this.stripeJs.handleCardPayment(
                    paymentMethod.clientToken, this.cardElement, {}
                ).then((stripeResponse: any) => {
                    if (stripeResponse.error) {
                        throw new MissingDataError(MissingDataErrorType.MissingCheckout);
                    } else {
                        const paymentPayload = {
                            methodId: payment.methodId,
                            paymentData: { nonce: stripeResponse.paymentIntent.id },
                        };

                        return this._store.dispatch(this._orderActionCreator.submitOrder(order, options))
                            .then(() => this._store.dispatch(this._paymentActionCreator.submitPayment(paymentPayload))
                                .catch(error => {
                                    throw new StandardError(error);
                                }));
                    }
                });
            })
            .catch((error: Error) => { throw new StandardError(error.message); });
    }

    finalize(options?: PaymentRequestOptions): Promise<InternalCheckoutSelectors> {
        return Promise.reject(new OrderFinalizationNotRequiredError());
    }

    deinitialize(options?: PaymentRequestOptions): Promise<InternalCheckoutSelectors> {
        return Promise.resolve(this._store.getState());
    }
}
