function visitSignedIn(path: string) {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('fernly_token', 'cypress-stub-token');
    },
  });
}

function normalizedText(node: { text: () => string }): string {
  return node.text().replace(/\s+/g, ' ').trim();
}

function stubSignedInCheckout(cartFixture: string) {
  cy.intercept('GET', '/api/auth/me', { fixture: 'cart/auth-me.json' }).as('authMe');
  cy.intercept('GET', '/api/cart', { fixture: cartFixture }).as('cart');
}

function stubSignedInOrder(orderFixture: string) {
  cy.intercept('GET', '/api/auth/me', { fixture: 'orders/auth-me.json' }).as('authMe');
  cy.intercept('GET', '/api/cart', { fixture: 'cart/cart-empty.json' }).as('cart');
  cy.intercept('GET', '/api/orders/*', { fixture: orderFixture }).as('order');
}

describe('Checkout & order promo display', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  describe('checkout', () => {
    it('T10-01: Order summary shows Discount (LEAFY10) and −$ amount; no Apply field', { tags: '@ui' }, () => {
      stubSignedInCheckout('cart/cart-promo-leafy10.json');
      visitSignedIn('/checkout');
      cy.wait(['@authMe', '@cart']);

      cy.findByRole('region', { name: 'Order summary' }).within(() => {
        cy.findByText('Discount (LEAFY10)');
        cy.findByText('−$4.05').then(($el) => {
          expect(normalizedText($el), 'discount amount').to.equal('−$4.05');
        });
      });
      cy.findByRole('button', { name: 'Apply' }).should('not.exist');
      cy.findByLabelText(/promo code/i).should('not.exist');
    });

    it('T10-03: no Discount row when cart discount is 0', { tags: '@ui' }, () => {
      stubSignedInCheckout('cart/cart-positive.json');
      visitSignedIn('/checkout');
      cy.wait(['@authMe', '@cart']);

      cy.findByRole('region', { name: 'Order summary' }).within(() => {
        cy.findByText(/Discount/).should('not.exist');
      });
      cy.findByRole('button', { name: 'Apply' }).should('not.exist');
    });
  });

  describe('order', () => {
    it('T10-02: Paid summary shows Discount (LEAFY10)', { tags: '@ui' }, () => {
      stubSignedInOrder('orders/order-promo-leafy10.json');
      visitSignedIn('/orders/ord-ui-promo-leafy10');
      cy.wait(['@authMe', '@cart', '@order']);

      cy.findByRole('region', { name: 'Paid' }).within(() => {
        cy.findByText('Discount (LEAFY10)');
        cy.findByText('−$4.05').then(($el) => {
          expect(normalizedText($el), 'discount amount').to.equal('−$4.05');
        });
      });
      cy.findByRole('button', { name: 'Apply' }).should('not.exist');
      cy.findByLabelText(/promo code/i).should('not.exist');
    });

    it('T10-04: no Discount row in Paid when order discount is 0', { tags: '@ui' }, () => {
      stubSignedInOrder('orders/order-no-promo.json');
      visitSignedIn('/orders/ord-ui-no-promo');
      cy.wait(['@authMe', '@cart', '@order']);

      cy.findByRole('region', { name: 'Paid' }).within(() => {
        cy.findByText(/Discount/).should('not.exist');
      });
      cy.findByRole('button', { name: 'Apply' }).should('not.exist');
    });
  });
});
