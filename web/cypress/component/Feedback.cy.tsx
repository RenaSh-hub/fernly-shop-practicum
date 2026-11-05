import { EmptyState, ErrorBanner, Toast } from '../../src/components/Feedback';

const longApiDetail =
  (
    'shippingAddress.fullName: fullName must not be empty; shippingAddress.address: address must not be empty; ' +
    'shippingAddress.city: city must not be empty; shippingAddress.postalCode: postalCode must not be empty'
  ).repeat(12);

describe('Feedback', () => {
  describe('EmptyState', () => {
    describe('render and state', () => {
      it('ES-01: heading Page not found, no body, no buttons or links', { tags: '@component' }, () => {
        cy.mount(<EmptyState title="Page not found" />);

        cy.findByRole('heading', { name: 'Page not found', level: 2 }).should('be.visible');
        cy.get('p').should('not.exist');
        cy.findAllByRole('button').should('have.length', 0);
        cy.findAllByRole('link').should('have.length', 0);
      });

      it(
        'ES-02: filter empty heading, message, no buttons or links',
        { tags: '@component' },
        () => {
          cy.mount(
            <EmptyState
              title="No plants match your filters"
              message="Try another search or clear a filter."
            />,
          );

          cy.findByRole('heading', { name: 'No plants match your filters', level: 2 }).should(
            'be.visible',
          );
          cy.findByText('Try another search or clear a filter.').should('be.visible');
          cy.findAllByRole('button').should('have.length', 0);
          cy.findAllByRole('link').should('have.length', 0);
        },
      );

      it('ES-03: plant 404 heading, Back to the shop, no body', { tags: '@component' }, () => {
        cy.mount(
          <EmptyState
            title="We couldn't find that plant"
            action={<button type="button">Back to the shop</button>}
          />,
        );

        cy.findByRole('heading', { name: "We couldn't find that plant", level: 2 }).should(
          'be.visible',
        );
        cy.findByRole('button', { name: 'Back to the shop' }).should('exist');
        cy.get('p').should('not.exist');
      });

      it('ES-04: cart empty heading, message, and Browse plants', { tags: '@component' }, () => {
        cy.mount(
          <EmptyState
            title="Your cart is empty"
            message="Plants you add will show up here."
            action={<button type="button">Browse plants</button>}
          />,
        );

        cy.findByRole('heading', { name: 'Your cart is empty', level: 2 }).should('be.visible');
        cy.findByText('Plants you add will show up here.').should('be.visible');
        cy.findByRole('button', { name: 'Browse plants' }).should('exist');
      });

      it('ES-05: checkout empty heading and message, no action', { tags: '@component' }, () => {
        cy.mount(
          <EmptyState
            title="Your cart is empty"
            message="Add a plant before you check out."
          />,
        );

        cy.findByRole('heading', { name: 'Your cart is empty', level: 2 }).should('be.visible');
        cy.findByText('Add a plant before you check out.').should('be.visible');
        cy.findAllByRole('button').should('have.length', 0);
      });

      it('ES-06: empty message string shows no message paragraph', { tags: '@component' }, () => {
        cy.mount(<EmptyState title="No orders yet" message="" />);

        cy.findByRole('heading', { name: 'No orders yet', level: 2 }).should('be.visible');
        cy.get('p').should('not.exist');
      });
    });

    describe('boundary', () => {
      it('ES-07: single-character title', { tags: '@component' }, () => {
        cy.mount(<EmptyState title="A" />);

        cy.findByRole('heading', { name: 'A', level: 2 }).should('be.visible');
      });
    });

    describe('accessibility', () => {
      it('ES-09: heading level 2 named No orders yet', { tags: '@component' }, () => {
        cy.mount(
          <EmptyState
            title="No orders yet"
            message="Your orders will show up here."
          />,
        );

        cy.findByRole('heading', { name: 'No orders yet', level: 2 }).should('exist');
      });

      it('ES-10: sprout hidden from assistive tech; heading is Page not found', { tags: '@component' }, () => {
        cy.mount(<EmptyState title="Page not found" />);

        cy.findByRole('heading', { name: 'Page not found', level: 2 }).should('exist');
        cy.get('[aria-hidden="true"]').then(($hidden) => {
          expect($hidden, 'decorative sprout count').to.have.length(1);
          expect($hidden.text(), 'sprout in hidden prefix').to.include('🌱');
        });
      });

      it('ES-11: no buttons when action omitted', { tags: '@component' }, () => {
        cy.mount(<EmptyState title="No orders yet" />);

        cy.findAllByRole('button').should('have.length', 0);
      });

      it('ES-12: button named Back to the shop', { tags: '@component' }, () => {
        cy.mount(
          <EmptyState
            title="We couldn't find that plant"
            action={<button type="button">Back to the shop</button>}
          />,
        );

        cy.findByRole('button', { name: 'Back to the shop' }).should('exist');
      });

      it('ES-13: button named Browse plants', { tags: '@component' }, () => {
        cy.mount(
          <EmptyState
            title="Your cart is empty"
            message="Plants you add will show up here."
            action={<button type="button">Browse plants</button>}
          />,
        );

        cy.findByRole('button', { name: 'Browse plants' }).should('exist');
      });

      it('ES-14: button named Back to your orders', { tags: '@component' }, () => {
        cy.mount(
          <EmptyState
            title="Order not found"
            action={<button type="button">Back to your orders</button>}
          />,
        );

        cy.findByRole('button', { name: 'Back to your orders' }).should('exist');
      });

      it('ES-15: keyboard activates the action', { tags: '@component' }, () => {
        const onAction = cy.spy().as('onAction');
        cy.mount(
          <EmptyState
            title="Order not found"
            action={
              <button type="button" onClick={onAction}>
                Back to your orders
              </button>
            }
          />,
        );

        cy.findByRole('button', { name: 'Back to your orders' }).type('{enter}');

        cy.get('@onAction').should('have.been.calledOnce');
      });
    });
  });

  describe('ErrorBanner', () => {
    describe('render', () => {
      it('EB-01: sign-in message without Try again', { tags: '@component' }, () => {
        cy.mount(<ErrorBanner message="Invalid email or password." />);

        cy.findByText('Invalid email or password.').should('be.visible');
        cy.findByRole('button', { name: 'Try again' }).should('not.exist');
      });

      it('EB-02: load error message with Try again', { tags: '@component' }, () => {
        cy.mount(
          <ErrorBanner message="The plant couldn't be loaded." onRetry={cy.spy()} />,
        );

        cy.findByText("The plant couldn't be loaded.").should('be.visible');
        cy.findByRole('button', { name: 'Try again' }).should('exist');
      });
    });

    describe('interaction', () => {
      it('EB-03: onRetry is not called on mount', { tags: '@component' }, () => {
        const onRetry = cy.spy().as('onRetry');
        cy.mount(
          <ErrorBanner message="Your orders couldn't be loaded." onRetry={onRetry} />,
        );

        cy.get('@onRetry').should('not.have.been.called');
      });

      it('EB-04: Try again calls onRetry once', { tags: '@component' }, () => {
        const onRetry = cy.spy().as('onRetry');
        cy.mount(
          <ErrorBanner message="Your orders couldn't be loaded." onRetry={onRetry} />,
        );

        cy.findByRole('button', { name: 'Try again' }).click();

        cy.get('@onRetry').should('have.been.calledOnce');
      });
    });

    describe('boundary', () => {
      it('EB-05: one-character message with Try again', { tags: '@component' }, () => {
        cy.mount(<ErrorBanner message="x" onRetry={cy.spy()} />);

        cy.findByText('x').should('be.visible');
        cy.findByRole('button', { name: 'Try again' }).should('exist');
      });

      it('EB-06: very long checkout detail message is shown', { tags: '@component' }, () => {
        cy.mount(<ErrorBanner message={longApiDetail} onRetry={cy.spy()} />);

        cy.findByRole('alert')
          .find('span')
          .then(($span) => {
            expect($span.text(), 'full error message').to.eq(longApiDetail);
          });
        cy.findByRole('button', { name: 'Try again' }).should('exist');
      });
    });

    describe('accessibility', () => {
      it('EB-08: alert named with the order load error', { tags: '@component' }, () => {
        cy.mount(
          <ErrorBanner message="The order couldn't be loaded." onRetry={cy.spy()} />,
        );

        cy.findByRole('alert', { name: "The order couldn't be loaded." }).should('exist');
      });

      it('EB-09: Try again button is named', { tags: '@component' }, () => {
        cy.mount(
          <ErrorBanner message="The order couldn't be loaded." onRetry={cy.spy()} />,
        );

        cy.findByRole('button', { name: 'Try again' }).should('exist');
      });

      it('EB-10: no buttons when onRetry omitted; alert shows message', { tags: '@component' }, () => {
        cy.mount(<ErrorBanner message="Invalid email or password." />);

        cy.findAllByRole('button').should('have.length', 0);
        cy.findByRole('alert', { name: 'Invalid email or password.' }).should('exist');
      });

      it('EB-11: keyboard activates Try again', { tags: '@component' }, () => {
        const onRetry = cy.spy().as('onRetry');
        cy.mount(
          <ErrorBanner message="The plant couldn't be loaded." onRetry={onRetry} />,
        );

        cy.findByRole('button', { name: 'Try again' }).type('{enter}');

        cy.get('@onRetry').should('have.been.calledOnce');
      });
    });
  });

  describe('Toast', () => {
    describe('render', () => {
      it('TO-01: default success toast shows message and Dismiss', { tags: '@component' }, () => {
        cy.mount(
          <Toast message="Added 1 × Monstera to your cart." onClose={cy.spy()} duration={0} />,
        );

        cy.findByText('Added 1 × Monstera to your cart.').should('be.visible');
        cy.findByRole('button', { name: 'Dismiss' }).should('exist');
      });

      it('TO-02: error tone shows message and Dismiss', { tags: '@component' }, () => {
        cy.mount(
          <Toast
            message="Only 3 left in stock."
            tone="error"
            onClose={cy.spy()}
            duration={0}
          />,
        );

        cy.findByText('Only 3 left in stock.').should('be.visible');
        cy.findByRole('button', { name: 'Dismiss' }).should('exist');
      });
    });

    describe('interaction', () => {
      it('TO-03: onClose is not called on mount when duration is 0', { tags: '@component' }, () => {
        const onClose = cy.spy().as('onClose');
        cy.mount(
          <Toast message="Added 2 × Aloe Vera to your cart." onClose={onClose} duration={0} />,
        );

        cy.get('@onClose').should('not.have.been.called');
      });

      it('TO-04: Dismiss calls onClose once', { tags: '@component' }, () => {
        const onClose = cy.spy().as('onClose');
        cy.mount(
          <Toast message="Added 2 × Aloe Vera to your cart." onClose={onClose} duration={0} />,
        );

        cy.findByRole('button', { name: 'Dismiss' }).click();

        cy.get('@onClose').should('have.been.calledOnce');
      });
    });

    describe('state and boundary', () => {
      it('TO-05: onClose not called after 3999 ms at default duration', { tags: '@component' }, () => {
        cy.clock();
        const onClose = cy.spy().as('onClose');
        cy.mount(<Toast message="Added 1 × Monstera to your cart." onClose={onClose} />);

        cy.tick(3999);

        cy.get('@onClose').should('not.have.been.called');
        cy.findByText('Added 1 × Monstera to your cart.').should('be.visible');
      });

      it('TO-06: onClose called once after 4000 ms at default duration', { tags: '@component' }, () => {
        cy.clock();
        const onClose = cy.spy().as('onClose');
        cy.mount(<Toast message="Added 1 × Monstera to your cart." onClose={onClose} />);

        cy.tick(4000);

        cy.get('@onClose').should('have.been.calledOnce');
      });

      it('TO-07: duration 0 keeps toast open after 10000 ms', { tags: '@component' }, () => {
        cy.clock();
        const onClose = cy.spy().as('onClose');
        cy.mount(<Toast message="Saved." onClose={onClose} duration={0} />);

        cy.tick(10000);

        cy.get('@onClose').should('not.have.been.called');
        cy.findByText('Saved.').should('be.visible');
      });

      it('TO-08: duration 1 calls onClose after 1 ms', { tags: '@component' }, () => {
        cy.clock();
        const onClose = cy.spy().as('onClose');
        cy.mount(<Toast message="Saved." onClose={onClose} duration={1} />);

        cy.tick(1);

        cy.get('@onClose').should('have.been.calledOnce');
      });

      it('TO-09: one-character message with Dismiss', { tags: '@component' }, () => {
        cy.mount(<Toast message="x" onClose={cy.spy()} duration={0} />);

        cy.findByText('x').should('be.visible');
        cy.findByRole('button', { name: 'Dismiss' }).should('exist');
      });

      it('TO-10: very long cart error message with Dismiss', { tags: '@component' }, () => {
        cy.mount(<Toast message={longApiDetail} onClose={cy.spy()} duration={0} />);

        cy.findByRole('status')
          .find('span')
          .then(($span) => {
            expect($span.text(), 'full toast message').to.eq(longApiDetail);
          });
        cy.findByRole('button', { name: 'Dismiss' }).should('exist');
      });
    });

    describe('accessibility', () => {
      it('TO-13: status named with the success message', { tags: '@component' }, () => {
        cy.mount(
          <Toast message="Added 1 × Monstera to your cart." onClose={cy.spy()} duration={0} />,
        );

        cy.findByRole('status', { name: 'Added 1 × Monstera to your cart.' }).should('exist');
      });

      it('TO-14: error tone remains status, not alert', { tags: '@component' }, () => {
        cy.mount(
          <Toast
            message="Only 3 left in stock."
            tone="error"
            onClose={cy.spy()}
            duration={0}
          />,
        );

        cy.findByRole('status', { name: 'Only 3 left in stock.' }).should('exist');
        cy.findAllByRole('alert').should('have.length', 0);
      });

      it('TO-15: exactly one button named Dismiss', { tags: '@component' }, () => {
        cy.mount(
          <Toast message="Added 1 × Monstera to your cart." onClose={cy.spy()} duration={0} />,
        );

        cy.findAllByRole('button').then(($buttons) => {
          expect($buttons, 'button count').to.have.length(1);
        });
        cy.findByRole('button', { name: 'Dismiss' }).should('exist');
      });

      it('TO-16: keyboard activates Dismiss', { tags: '@component' }, () => {
        const onClose = cy.spy().as('onClose');
        cy.mount(
          <Toast message="Added 1 × Monstera to your cart." onClose={onClose} duration={0} />,
        );

        cy.findByRole('button', { name: 'Dismiss' }).type('{enter}');

        cy.get('@onClose').should('have.been.calledOnce');
      });
    });
  });
});
