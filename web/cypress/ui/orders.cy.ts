const LONG_ORDER_ID =
  'ord-ui-long-id-Supercalifragilisticexpialidocious-Collector-Order-Identifier-That-Must-Wrap-In-The-Link-Text-Without-Overflow';

function visitSignedIn(path: string) {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('fernly_token', 'cypress-stub-token');
    },
  });
}

function stubSignedInOrdersList(fixture: string, alias = 'orders') {
  cy.intercept('GET', '/api/auth/me', { fixture: 'orders/auth-me.json' }).as('authMe');
  cy.intercept('GET', '/api/cart', { fixture: 'cart/cart-empty.json' }).as('cart');
  cy.intercept('GET', '/api/orders', { fixture }).as(alias);
}

describe('Orders page (/orders)', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('redirects to sign in when the customer is not signed in', { tags: '@ui' }, () => {
    cy.visit('/orders');
    cy.findByRole('heading', { name: 'Sign in' });
  });

  it('shows two orders with links and line counts when the customer has two orders', { tags: '@ui' }, () => {
    stubSignedInOrdersList('orders/orders-list-positive.json');
    visitSignedIn('/orders');
    cy.wait(['@authMe', '@cart', '@orders']);

    cy.findByRole('heading', { level: 1, name: 'Your orders' });
    cy.findAllByRole('listitem').should('have.length', 2);
    cy.findByRole('link', { name: 'Order ord-ui-alpha' });
    cy.findByRole('link', { name: 'Order ord-ui-beta' });
    cy.findByText('1 line');
    cy.findByText('2 lines');
  });

  it('shows the empty state when the customer has no orders', { tags: '@ui' }, () => {
    stubSignedInOrdersList('orders/orders-list-empty.json');
    visitSignedIn('/orders');
    cy.wait(['@authMe', '@cart', '@orders']);

    cy.findByRole('heading', { level: 2, name: 'No orders yet' });
    cy.findByText('Your orders will show up here.');
  });

  it('keeps a very long order id inside its row link', { tags: '@ui' }, () => {
    stubSignedInOrdersList('orders/orders-list-long-id.json');
    visitSignedIn('/orders');
    cy.wait(['@authMe', '@cart', '@orders']);

    cy.findByRole('link', { name: `Order ${LONG_ORDER_ID}` }).then(($a) => {
      expect($a[0].scrollWidth, 'long order id wraps inside link width').to.be.lte($a[0].clientWidth + 1);
    });
  });

  it('shows $0.00 when an order total is zero', { tags: '@ui' }, () => {
    stubSignedInOrdersList('orders/orders-list-total-zero.json');
    visitSignedIn('/orders');
    cy.wait(['@authMe', '@cart', '@orders']);

    cy.findByRole('link', { name: 'Order ord-ui-zero-total' });
    cy.findByText('$0.00');
  });

  it('shows an error alert with Try again when the orders request fails', { tags: '@ui' }, () => {
    cy.intercept('GET', '/api/auth/me', { fixture: 'orders/auth-me.json' }).as('authMe');
    cy.intercept('GET', '/api/cart', { fixture: 'cart/cart-empty.json' }).as('cart');
    cy.intercept('GET', '/api/orders', {
      statusCode: 500,
      fixture: 'orders/orders-list-server-error.json',
    }).as('orders');
    visitSignedIn('/orders');
    cy.wait(['@authMe', '@cart', '@orders']);

    cy.findByRole('alert');
    cy.findByRole('button', { name: 'Try again' });
  });
});
