import { PaymentMethodActionCreator } from '../..';
import { RequestSender } from '../../../../node_modules/@bigcommerce/request-sender/lib';
import { AddressRequestBody } from '../../../address';
import { BillingAddressActionCreator, BillingAddressUpdateRequestBody } from '../../../billing';
import { CheckoutStore, InternalCheckoutSelectors } from '../../../checkout';
import {
    MissingDataError,
    MissingDataErrorType,
    NotInitializedError,
    NotInitializedErrorType,
    StandardError,
} from '../../../common/error/errors';
import toFormUrlEncoded from '../../../common/http-request/to-form-url-encoded';
import { RemoteCheckoutSynchronizationError } from '../../../remote-checkout/errors';
import { ShippingStrategyActionCreator } from '../../../shipping';

import {
    ButtonColor,
    ButtonType,
    EnvironmentType,
    GooglePaymentsError,
    GooglePaymentData,
    GooglePayAddress,
    GooglePayClient,
    GooglePayInitializer,
    GooglePayPaymentDataRequestV1,
    GooglePayScriptLoader,
    GooglePaySDK,
    TokenizePayload
} from './';

export default class GooglePayPaymentProcessor {
    private _googlePaymentsClient!: GooglePayClient;
    private _methodId!: string;
    private _googlePaymentDataRequest!: GooglePayPaymentDataRequestV1;

    constructor(
        private _store: CheckoutStore,
        private _paymentMethodActionCreator: PaymentMethodActionCreator,
        private _googlePayScriptLoader: GooglePayScriptLoader,
        private _googlePayInitializer: GooglePayInitializer,
        private _billingAddressActionCreator: BillingAddressActionCreator,
        private _shippingStrategyActionCreator: ShippingStrategyActionCreator,
        private _requestSender: RequestSender
    ) { }

    initialize(methodId: string): Promise<void> {
        this._methodId = methodId;

        return this._configureWallet();
    }

    deinitialize(): Promise<void> {
        return this._googlePayInitializer.teardown();
    }

    createButton(onClick: () => {},
                 buttonType: ButtonType = ButtonType.Short,
                 buttonColor: ButtonColor = ButtonColor.Default): HTMLElement {
        return this._googlePaymentsClient.createButton({
            buttonColor,
            buttonType,
            onClick,
        });
    }

    updateBillingAddress(billingAddress: GooglePayAddress): Promise<InternalCheckoutSelectors> {
        if (!this._methodId) {
            throw new RemoteCheckoutSynchronizationError();
        }

        const remoteBillingAddress = this._store.getState().billingAddress.getBillingAddress();

        if (!remoteBillingAddress) {
            throw new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
        }

        const googlePayAddressMapped: BillingAddressUpdateRequestBody = this._mapGooglePayAddressToBillingAddress(billingAddress, remoteBillingAddress.id);

        return this._store.dispatch(
            this._billingAddressActionCreator.updateAddress(googlePayAddressMapped)
        );
    }

    updateShippingAddress(shippingAddress: GooglePayAddress): Promise<InternalCheckoutSelectors | void> {
        if (!this._methodId) {
            throw new RemoteCheckoutSynchronizationError();
        }

        if (!shippingAddress) {
            return Promise.resolve();
        }

        return this._store.dispatch(
            this._shippingStrategyActionCreator.updateAddress(this._mapGooglePayAddressToShippingAddress(shippingAddress))
        );
    }

    displayWallet(): Promise<GooglePaymentData> {
        if (!this._googlePaymentsClient && !this._googlePaymentDataRequest) {
            throw new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized);
        }

        return this._googlePaymentsClient.isReadyToPay({
            allowedPaymentMethods: this._googlePaymentDataRequest.allowedPaymentMethods,
        }).then( response => {
            if (response.result) {
                return this._googlePaymentsClient.loadPaymentData(this._googlePaymentDataRequest)
                    .then(paymentData => paymentData)
                    .catch((err: GooglePaymentsError) => {
                        throw new Error(err.statusCode);
                    });
            } else {
                throw new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized);
            }
        });
    }

    handleSuccess(paymentData: GooglePaymentData): Promise<any> {
        return this._googlePayInitializer.parseResponse(paymentData)
            .then(tokenizedPayload => this._postForm(tokenizedPayload));
    }

    parseResponse(paymentData: GooglePaymentData): Promise<TokenizePayload> {
        return this._googlePayInitializer.parseResponse(paymentData);
    }

    private _configureWallet(): Promise<void> {
        return this._store.dispatch(this._paymentMethodActionCreator.loadPaymentMethod(this._methodId))
            .then(state => {
                const paymentMethod = state.paymentMethods.getPaymentMethod(this._methodId);
                const checkout = state.checkout.getCheckout();
                const hasShippingAddress = !!state.shippingAddress.getShippingAddress();

                if (!paymentMethod) {
                    throw new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
                }

                if (!checkout) {
                    throw new MissingDataError(MissingDataErrorType.MissingCheckout);
                }

                const { testMode } = paymentMethod.config;

                return Promise.all([
                    this._googlePayScriptLoader.load(),
                    this._googlePayInitializer.initialize(checkout, paymentMethod, hasShippingAddress),
                ])
                    .then(([googlePay, googlePayPaymentDataRequest]) => {
                        this._googlePaymentsClient = this._getGooglePaymentsClient(googlePay, true);
                        this._googlePaymentDataRequest = googlePayPaymentDataRequest;
                    })
                    .catch((error: Error) => {
                        throw new StandardError(error.message);
                    });
            });
    }

    private _getCardInformation(cardInformation: { cardType: string, lastFour: string }) {
        return {
            type: cardInformation.cardType,
            number: cardInformation.lastFour,
        };
    }

    private _getGooglePaymentsClient(google: GooglePaySDK, testMode?: boolean): GooglePayClient {
        if (testMode === undefined) {
            throw new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
        }

        const environment: EnvironmentType = testMode ? 'TEST' : 'PRODUCTION';

        return new google.payments.api.PaymentsClient({ environment });
    }

    private _mapGooglePayAddressToBillingAddress(address: GooglePayAddress, id: string): BillingAddressUpdateRequestBody {
        return {
            id,
            firstName: address.name.split(' ').slice(0, -1).join(' '),
            lastName: address.name.split(' ').slice(-1).join(' '),
            company: address.companyName,
            address1: address.address1,
            address2: address.address2 + address.address3 + address.address4 + address.address5,
            city: address.locality,
            stateOrProvince: address.administrativeArea,
            stateOrProvinceCode: address.administrativeArea,
            postalCode: address.postalCode,
            countryCode: address.countryCode,
            phone: address.phoneNumber,
            customFields: [],
        };
    }

    private _mapGooglePayAddressToShippingAddress(address: GooglePayAddress, id?: string): AddressRequestBody {
        return {
            firstName: address.name.split(' ').slice(0, -1).join(' '),
            lastName: address.name.split(' ').slice(-1).join(' '),
            company: address.companyName,
            address1: address.address1,
            address2: address.address2 + address.address3 + address.address4 + address.address5,
            city: address.locality,
            stateOrProvince: address.administrativeArea,
            stateOrProvinceCode: address.administrativeArea,
            postalCode: address.postalCode,
            countryCode: address.countryCode,
            phone: address.phoneNumber,
            customFields: [],
        };
    }

    private _postForm(postPaymentData: TokenizePayload): Promise<any> {
        const cardInformation = postPaymentData.details;

        return this._requestSender.post('/checkout.php', {
            headers: {
                Accept: 'text/html',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: toFormUrlEncoded({
                payment_type: postPaymentData.type,
                nonce: postPaymentData.nonce,
                provider: this._methodId,
                action: 'set_external_checkout',
                card_information: this._getCardInformation(cardInformation),
            }),
        });
    }
}
