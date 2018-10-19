import { createRequestSender, RequestSender } from '@bigcommerce/request-sender';

import { CustomerInitializeOptions } from '../';
import { createFormPoster, FormPoster } from '../../../node_modules/@bigcommerce/form-poster';
import { createScriptLoader } from '../../../node_modules/@bigcommerce/script-loader';
import { getCartState } from '../../cart/carts.mock';
import { createCheckoutStore, CheckoutStore } from '../../checkout';
import { getCheckoutState } from '../../checkout/checkouts.mock';
import { InvalidArgumentError, MissingDataError } from '../../common/error/errors';
import { getConfigState } from '../../config/configs.mock';
import { PaymentMethod } from '../../payment';
import { getPaymentMethodsState } from '../../payment/payment-methods.mock';
import { createGooglePayPaymentProcessor, GooglePayPaymentProcessor } from '../../payment/strategies/googlepay';
import {getGooglePaymentDataMock} from '../../payment/strategies/googlepay/googlepay.mock';
import { RemoteCheckoutActionCreator, RemoteCheckoutRequestSender } from '../../remote-checkout';
import { getCustomerState } from '../customers.mock';

import { GooglePayBraintreeCustomerStrategy } from '.';
import { getCustomerInitilaizeOptions, getPaymentMethod, Mode } from './googlepay-braintree-customer-mock';

describe('GooglePayBraintreeCustomerStrategy', () => {
    let container: HTMLDivElement;
    let formPoster: FormPoster;
    let customerInitializeOptions: CustomerInitializeOptions;
    let paymentMethod: PaymentMethod;
    let paymentProcessor: GooglePayPaymentProcessor;
    let remoteCheckoutActionCreator: RemoteCheckoutActionCreator;
    let requestSender: RequestSender;
    let store: CheckoutStore;
    let strategy: GooglePayBraintreeCustomerStrategy;
    let walletButton: HTMLAnchorElement;

    beforeEach(() => {
        paymentMethod = getPaymentMethod();

        store = createCheckoutStore({
            checkout: getCheckoutState(),
            customer: getCustomerState(),
            config: getConfigState(),
            cart: getCartState(),
            paymentMethods: getPaymentMethodsState(),
        });

        requestSender = createRequestSender();

        remoteCheckoutActionCreator = new RemoteCheckoutActionCreator(
            new RemoteCheckoutRequestSender(requestSender)
        );

        paymentProcessor = createGooglePayPaymentProcessor(store, createScriptLoader());

        formPoster = createFormPoster();

        strategy = new GooglePayBraintreeCustomerStrategy(
            store,
            remoteCheckoutActionCreator,
            paymentProcessor,
            formPoster
        );

        jest.spyOn(store, 'dispatch')
            .mockReturnValue(Promise.resolve(store.getState()));

        jest.spyOn(paymentProcessor, 'initialize')
            .mockReturnValue(Promise.resolve());

        jest.spyOn(store.getState().paymentMethods, 'getPaymentMethod')
            .mockReturnValue(paymentMethod);

        jest.spyOn(formPoster, 'postForm')
            .mockReturnValue(Promise.resolve());

        container = document.createElement('div');
        container.setAttribute('id', 'googlePayCheckoutButton');
        walletButton = document.createElement('a');
        walletButton.setAttribute('id', 'mockButton');

        jest.spyOn(paymentProcessor, 'createButton')
            .mockReturnValue(walletButton);

        jest.spyOn(walletButton, 'addEventListener');

        jest.spyOn(walletButton, 'removeEventListener');

        container.appendChild(walletButton);
        document.body.appendChild(container);
    });

    afterEach(() => {
        document.body.removeChild(container);
    });

    it('creates an instance of GooglePayBraintreeCustomerStrategy', () => {
        expect(strategy).toBeInstanceOf(GooglePayBraintreeCustomerStrategy);
    });

    describe('#initialize()', () => {

        describe('Payment method exist', () => {

            it('adds the event listener to the wallet button', async () => {
                customerInitializeOptions = getCustomerInitilaizeOptions();

                await strategy.initialize(customerInitializeOptions);

                expect(walletButton.addEventListener).toHaveBeenCalled();
            });

            it('Validates if strategy is been initialized', async () => {
                customerInitializeOptions = getCustomerInitilaizeOptions();

                await strategy.initialize(customerInitializeOptions);

                setTimeout(() => {
                    strategy.initialize(customerInitializeOptions);
                }, 0);

                strategy.initialize(customerInitializeOptions);

                expect(paymentProcessor.initialize).toHaveBeenCalledTimes(1);
            });

            it('fails to initialize the strategy if no GooglePayBraintreeCustomerInitializeOptions is provided ', async () => {
                customerInitializeOptions = getCustomerInitilaizeOptions(Mode.Incomplete);

                try {
                    await strategy.initialize(customerInitializeOptions);
                } catch (e) {
                    expect(e).toBeInstanceOf(MissingDataError);
                }
            });

            it('fails to initialize the strategy if no methodid is supplied', async () => {
                customerInitializeOptions = getCustomerInitilaizeOptions(Mode.UndefinedMethodId);

                try {
                    await strategy.initialize(customerInitializeOptions);
                } catch (e) {
                    expect(e).toBeInstanceOf(MissingDataError);
                }
            });

            it('fails to initialize the strategy if no valid container id is supplied', async () => {
                customerInitializeOptions = getCustomerInitilaizeOptions(Mode.InvalidContainer);

                try {
                    await strategy.initialize(customerInitializeOptions);
                } catch (e) {
                    expect(e).toBeInstanceOf(InvalidArgumentError);
                }
            });
        });
    });

    describe('#deinitialize()', () => {
        let customerInitializeOptions: CustomerInitializeOptions;

        beforeEach(() => {
            customerInitializeOptions = getCustomerInitilaizeOptions();
        });

        it('succesfully deinitializes the strategy', async () => {
            await strategy.initialize(customerInitializeOptions);

            strategy.deinitialize();

            if (customerInitializeOptions.googlepaybraintree) {
                const button = document.getElementById(customerInitializeOptions.googlepaybraintree.container);

                if (button) {
                    expect(button.firstChild).toBe(null);
                }
            }

            // Prevent "After Each" failure
            container = document.createElement('div');
            document.body.appendChild(container);
        });

        it('Validates if strategy is loaded before call deinitialize', async () => {
            await strategy.deinitialize();

            if (customerInitializeOptions.googlepaybraintree) {
                const button = document.getElementById(customerInitializeOptions.googlepaybraintree.container);

                if (button) {
                    expect(button.firstChild).toBe(null);
                }
            }

            // Prevent "After Each" failure
            container = document.createElement('div');
            document.body.appendChild(container);
        });
    });

    describe('#signIn()', () => {

        it('throws error if trying to sign in programmatically', async () => {
            customerInitializeOptions = getCustomerInitilaizeOptions();

            await strategy.initialize(customerInitializeOptions);

            expect(() => strategy.signIn({ email: 'foo@bar.com', password: 'foobar' })).toThrowError();
        });
    });

    describe('#signOut()', () => {
        beforeEach(async () => {
            customerInitializeOptions = getCustomerInitilaizeOptions();

            await strategy.initialize(customerInitializeOptions);
        });

        it('throws error if trying to sign out programmatically', async () => {
            const paymentId = {
                providerId: 'googlepay',
            };

            jest.spyOn(store.getState().payment, 'getPaymentId')
                .mockReturnValue(paymentId);

            jest.spyOn(remoteCheckoutActionCreator, 'signOut')
                .mockReturnValue('data');

            const options = {
                methodId: 'googlepay',
            };

            await strategy.signOut(options);

            expect(remoteCheckoutActionCreator.signOut).toHaveBeenCalledWith('googlepay', options);
            expect(store.dispatch).toHaveBeenCalled();
        });

        it('Returns state if no payment method exist', async () => {
            const paymentId = undefined;
            jest.spyOn(store, 'getState');

            jest.spyOn(store.getState().payment, 'getPaymentId')
                .mockReturnValue(paymentId);

            const options = {
                methodId: 'googlepay',
            };

            await strategy.signOut(options);

            expect(store.getState).toHaveBeenCalledTimes(3);
        });
    });

    describe('#handleWalletButtonClick', () => {
        let googlePayOptions: CustomerInitializeOptions;

        beforeEach(() => {
            googlePayOptions = {
                methodId: 'googlepay',
                googlepaybraintree: {
                    container: 'googlePayCheckoutButton',
                    onError: () => {},
                    onPaymentSelect: () => {},
                },
            };
        });

        it('handles wallet button event', async () => {
            spyOn(paymentProcessor, 'displayWallet').and.returnValue(Promise.resolve(getGooglePaymentDataMock()));
            spyOn(paymentProcessor, 'handleSuccess').and.returnValue(Promise.resolve());
            spyOn(paymentProcessor, 'updateShippingAddress').and.returnValue(Promise.resolve());

            await strategy.initialize(googlePayOptions).then(() => {
                walletButton.click();
            });

            expect(paymentProcessor.initialize).toHaveBeenCalled();
        });
    });
});
