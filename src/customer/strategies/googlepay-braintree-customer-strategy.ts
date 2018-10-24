import { CustomerCredentials, CustomerInitializeOptions, CustomerRequestOptions } from '../';
import { FormPoster } from '../../../node_modules/@bigcommerce/form-poster/lib';
import { CheckoutStore, InternalCheckoutSelectors } from '../../checkout';
import { InvalidArgumentError, MissingDataError, MissingDataErrorType, NotImplementedError } from '../../common/error/errors';
import { bindDecorator as bind } from '../../common/utility';
import { GooglePayAddress, GooglePayPaymentProcessor } from '../../payment/strategies/googlepay';
import { RemoteCheckoutActionCreator } from '../../remote-checkout';

import { CustomerStrategy } from './';

export default class GooglePayBraintreeCustomerStrategy extends CustomerStrategy {
    private _walletButton?: HTMLElement;

    constructor(
        store: CheckoutStore,
        private _remoteCheckoutActionCreator: RemoteCheckoutActionCreator,
        private _googlePayPaymentProcessor: GooglePayPaymentProcessor,
        private _formPoster: FormPoster
    ) {
        super(store);
    }

    initialize(options: CustomerInitializeOptions): Promise<InternalCheckoutSelectors> {
        if (this._isInitialized) {
            return super.initialize(options);
        }

        const { googlepaybraintree, methodId }  = options;

        if (!googlepaybraintree || !methodId) {
            throw new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
        }

        return this._googlePayPaymentProcessor.initialize(methodId)
            .then(() => {
                const walletButton = this._createSignInButton(googlepaybraintree.container);

                if (walletButton) {
                    this._walletButton = walletButton;
                    this._walletButton.addEventListener('click', this._handleWalletButtonClick);
                }
            })
            .then(() => super.initialize(options));
    }

    deinitialize(options?: CustomerRequestOptions): Promise<InternalCheckoutSelectors> {
        if (!this._isInitialized) {
            return super.deinitialize(options);
        }

        if (this._walletButton && this._walletButton.parentNode) {
            this._walletButton.parentNode.removeChild(this._walletButton);
            this._walletButton.removeEventListener('click', this._handleWalletButtonClick);
            this._walletButton = undefined;
        }

        return this._googlePayPaymentProcessor.deinitialize()
            .then(() => super.deinitialize(options));
    }

    signIn(credentials: CustomerCredentials, options?: CustomerRequestOptions): Promise<InternalCheckoutSelectors> {
        throw new NotImplementedError(
            'In order to sign in via Google Pay, the shopper must click on "Google Pay" button.'
        );
    }

    signOut(options?: CustomerRequestOptions): Promise<InternalCheckoutSelectors> {
        const state = this._store.getState();
        const payment = state.payment.getPaymentId();

        if (!payment) {
            return Promise.resolve(this._store.getState());
        }

        return this._store.dispatch(
            this._remoteCheckoutActionCreator.signOut(payment.providerId, options)
        );
    }

    private _createSignInButton(containerId: string): HTMLElement {
        const container = document.querySelector(`#${containerId}`);

        if (!container) {
            throw new InvalidArgumentError('Unable to create sign-in button without valid container ID.');
        }

        const button = this._googlePayPaymentProcessor.createButton(() => this._handleWalletButtonClick);

        container.appendChild(button);

        return button;
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
        if (error) {
            throw new Error(error.message);
        }
    }

    @bind
    private _handleWalletButtonClick(event: Event): Promise<void> {
        event.preventDefault();

        let billingAddress: GooglePayAddress;
        let shippingAddress: GooglePayAddress;

        return this._googlePayPaymentProcessor.displayWallet()
            .then(paymentData => {
                billingAddress = paymentData.cardInfo.billingAddress;
                shippingAddress = paymentData.shippingAddress;
                return this._googlePayPaymentProcessor.handleSuccess(paymentData);
            })
            .then(() => {
            return Promise.all([
                this._googlePayPaymentProcessor.updateShippingAddress(shippingAddress),
                this._googlePayPaymentProcessor.updateBillingAddress(billingAddress),
            ]).then(() => this._onPaymentSelectComplete())
            .catch(error => this._onError(error));
        });
    }
}
