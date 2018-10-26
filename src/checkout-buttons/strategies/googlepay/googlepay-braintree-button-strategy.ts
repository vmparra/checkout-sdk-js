import { FormPoster } from '@bigcommerce/form-poster';

import { Checkout, CheckoutActionCreator, CheckoutStore } from '../../../checkout';
import { InvalidArgumentError, MissingDataError, MissingDataErrorType, NotInitializedError, NotInitializedErrorType } from '../../../common/error/errors';
import { bindDecorator as bind } from '../../../common/utility';
import { GooglePayPaymentProcessor } from '../../../payment/strategies/googlepay';
import { CheckoutButtonInitializeOptions } from '../../checkout-button-options';
import CheckoutButtonStrategy from '../checkout-button-strategy';

export default class GooglePayBraintreeButtonStrategy extends CheckoutButtonStrategy {
    private _methodId?: string;
    private _checkout?: Checkout;
    private _walletButton?: HTMLElement;

    constructor(
        private _store: CheckoutStore,
        private _formPoster: FormPoster,
        private _checkoutActionCreator: CheckoutActionCreator,
        private _googlePayPaymentProcessor: GooglePayPaymentProcessor
    ) {
        super();
    }

    initialize(options: CheckoutButtonInitializeOptions): Promise<void> {
        const { containerId, methodId } = options;

        if (!containerId || !methodId) {
            throw new InvalidArgumentError('Unable to proceed because "containerId" argument is not provided.');
        }

        if (this._isInitialized[containerId]) {
            return super.initialize(options);
        }

        this._methodId = methodId;

        return this._store.dispatch(this._checkoutActionCreator.loadDefaultCheckout())
            .then(stateCheckout => {
                this._checkout = stateCheckout.checkout.getCheckout();
                if (!this._checkout || !this._checkout.cart.id) {
                    throw new MissingDataError(MissingDataErrorType.MissingCart);
                }

                return this._googlePayPaymentProcessor.initialize(this._getMethodId())
                    .then(() => {
                        this._walletButton = this._createSignInButton(containerId);

                        if (this._walletButton) {
                            this._walletButton.addEventListener('click', this._handleWalletButtonClick);
                        }
                    });
            }).then(() => super.initialize(options));
    }

    deinitialize(): Promise<void> {
        if (!this._isInitialized) {
            return super.deinitialize();
        }

        if (this._walletButton && this._walletButton.parentNode) {
            this._walletButton.parentNode.removeChild(this._walletButton);
            this._walletButton.removeEventListener('click', this._handleWalletButtonClick);
            this._walletButton = undefined;
        }

        return this._googlePayPaymentProcessor.deinitialize()
            .then(() => super.deinitialize());
    }

    private _createSignInButton(containerId: string): HTMLElement {
        const container = document.querySelector(`#${containerId}`);

        if (!container) {
            throw new InvalidArgumentError('Unable to create sign-in button without valid container ID.');
        }

        const googlePayButton = this._googlePayPaymentProcessor.createButton(() => this._onPaymentSelectComplete);

        container.appendChild(googlePayButton);

        return googlePayButton;
    }

    private _getMethodId(): string {
        if (!this._methodId) {
            throw new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized);
        }

        return this._methodId;
    }

    @bind
    private _handleWalletButtonClick(event: Event): Promise<void> {
        event.preventDefault();

        return this._googlePayPaymentProcessor.displayWallet()
            .then(paymentData =>
                this._googlePayPaymentProcessor.handleSuccess(paymentData)
                    .then(() => this._googlePayPaymentProcessor.updateShippingAddress(paymentData.shippingAddress)))
            .then(() => this._onPaymentSelectComplete())
            .catch(error => this._onError(error));
    }

    private _onPaymentSelectComplete(): void {
        this._formPoster.postForm('/checkout.php', {
            headers: {
                Accept: 'text/html',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
    }

    private _onError(error?: Error): void {
        if (error && error.message !== 'CANCELED') {
            throw new Error(error.message);
        }
    }
}
