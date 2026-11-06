const LONG_NAME =
  'Supercalifragilisticexpialidocious Window Fern With An Exceptionally Long Common Name That Must Wrap';

function visitSignedIn(path: string) {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('fernly_token', 'cypress-stub-token');
    },
  });
}

describe('Cart page (/cart)', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('redirects to sign in when the customer is not signed in', { tags: '@ui' }, () => {
    cy.visit('/cart');
    cy.findByRole('heading', { name: 'Sign in' });
  });

  it('shows two cart lines and order summary when the cart has two lines', { tags: '@ui' }, () => {
    cy.intercept('GET', '/api/auth/me', { fixture: 'cart/auth-me.json' }).as('authMe');
    cy.intercept('GET', '/api/cart', { fixture: 'cart/cart-positive.json' }).as('cart');
    visitSignedIn('/cart');
    cy.wait(['@authMe', '@cart']);

    cy.findByRole('heading', { level: 1, name: 'Your cart' });
    cy.findAllByRole('listitem').should('have.length', 2);
    cy.findByText('Monstera Deliciosa');
    cy.findByText('Snake Plant');
    cy.findByRole('region', { name: 'Order summary' }).within(() => {
      cy.findByText('Subtotal (2 items)');
    });
    cy.findByRole('link', { name: 'Go to checkout' });
  });

  it('shows the empty state when the cart has no lines', { tags: '@ui' }, () => {
    cy.intercept('GET', '/api/auth/me', { fixture: 'cart/auth-me.json' }).as('authMe');
    cy.intercept('GET', '/api/cart', { fixture: 'cart/cart-empty.json' }).as('cart');
    visitSignedIn('/cart');
    cy.wait(['@authMe', '@cart']);

    cy.findByRole('heading', { level: 2, name: 'Your cart is empty' });
    cy.findByText('Plants you add will show up here.');
    cy.findByRole('link', { name: 'Browse plants' });
  });

  it('keeps a very long plant name inside its cart line', { tags: '@ui' }, () => {
    cy.intercept('GET', '/api/auth/me', { fixture: 'cart/auth-me.json' }).as('authMe');
    cy.intercept('GET', '/api/cart', { fixture: 'cart/cart-long-name.json' }).as('cart');
    visitSignedIn('/cart');
    cy.wait(['@authMe', '@cart']);

    cy.findByRole('listitem').within(() => {
      cy.findByText(LONG_NAME).then(($el) => {
        expect($el[0].scrollWidth, 'long name wraps inside line width').to.be.lte($el[0].clientWidth + 1);
      });
    });
  });

  it('shows $0.00 when a line unit price and line total are zero', { tags: ['@ui', '@known-bug'] }, () => {
    cy.intercept('GET', '/api/auth/me', { fixture: 'cart/auth-me.json' }).as('authMe');
    cy.intercept('GET', '/api/cart', { fixture: 'cart/cart-price-zero.json' }).as('cart');
    visitSignedIn('/cart');
    cy.wait(['@authMe', '@cart']);

    cy.findByText('Promo Cutting');
    cy.findByRole('listitem').within(() => {
      cy.findAllByText('$0.00').should('have.length', 2);
    });
  });

  it('shows an error alert with Try again when the cart request fails', { tags: '@ui' }, () => {
    cy.intercept('GET', '/api/auth/me', { fixture: 'cart/auth-me.json' }).as('authMe');
    cy.intercept('GET', '/api/cart', {
      statusCode: 500,
      fixture: 'cart/cart-server-error.json',
    }).as('cart');
    visitSignedIn('/cart');
    cy.wait(['@authMe', '@cart']);

    cy.findByRole('alert');
    cy.findByRole('button', { name: 'Try again' });
  });
});
