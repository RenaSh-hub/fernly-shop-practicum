function visitSignedIn(path: string) {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('fernly_token', 'cypress-stub-token');
    },
  });
}

function stubSignedInCart(fixture: string) {
  cy.intercept('GET', '/api/auth/me', { fixture: 'cart/auth-me.json' }).as('authMe');
  cy.intercept('GET', '/api/cart', { fixture }).as('cart');
}

/** Promo applied copy is split across text + <strong>{code}</strong>. */
function findAppliedCode(code: string) {
  const expected = `Code ${code} applied`;
  cy.findByText((_content, element) => {
    if (!element) return false;
    const normalized = element.textContent?.replace(/\s+/g, ' ').trim();
    if (normalized !== expected) return false;
    return Array.from(element.children).every(
      (child) => child.textContent?.replace(/\s+/g, ' ').trim() !== expected,
    );
  });
}

describe('Cart page promo codes (/cart)', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('T9-01: shows promo field and Apply with no discount row', { tags: '@ui' }, () => {
    stubSignedInCart('cart/cart-positive.json');
    visitSignedIn('/cart');
    cy.wait(['@authMe', '@cart']);

    cy.findByRole('region', { name: 'Order summary' }).within(() => {
      cy.findByText(/^Discount/).should('not.exist');
    });
    cy.findByText('Have a promo code?');
    cy.findByRole('textbox');
    cy.findByRole('button', { name: 'Apply' });
  });

  it('T9-02: shows Discount (LEAFY10) and Code LEAFY10 applied after Apply', { tags: '@ui' }, () => {
    stubSignedInCart('cart/cart-positive.json');
    cy.intercept('POST', '/api/cart/promo', { fixture: 'cart/cart-promo-leafy10.json' }).as('applyPromo');
    visitSignedIn('/cart');
    cy.wait(['@authMe', '@cart']);

    cy.findByRole('textbox').type('LEAFY10');
    cy.findByRole('button', { name: 'Apply' }).click();
    cy.wait('@applyPromo');

    findAppliedCode('LEAFY10');
    cy.findByRole('region', { name: 'Order summary' }).within(() => {
      cy.findByText('Discount (LEAFY10)');
      cy.findByText('−$4.05');
      cy.findByText('$43.4');
    });
  });

  it('T9-03: Remove clears discount and returns the promo field', { tags: '@ui' }, () => {
    stubSignedInCart('cart/cart-promo-leafy10.json');
    cy.intercept('DELETE', '/api/cart/promo', { fixture: 'cart/cart-positive.json' }).as('removePromo');
    visitSignedIn('/cart');
    cy.wait(['@authMe', '@cart']);

    findAppliedCode('LEAFY10');
    cy.findByRole('button', { name: 'Remove' }).click();
    cy.wait('@removePromo');

    cy.findByRole('region', { name: 'Order summary' }).within(() => {
      cy.findByText(/^Discount/).should('not.exist');
    });
    cy.findByText('Have a promo code?');
    cy.findByRole('textbox');
    cy.findByRole('button', { name: 'Apply' });
  });

  it('T9-04: refused code shows API detail and leaves totals unchanged', { tags: '@ui' }, () => {
    stubSignedInCart('cart/cart-positive.json');
    cy.intercept('POST', '/api/cart/promo', {
      statusCode: 400,
      fixture: 'cart/cart-promo-invalid.json',
    }).as('applyPromo');
    visitSignedIn('/cart');
    cy.wait(['@authMe', '@cart']);

    cy.findByRole('textbox').type('BADCODE');
    cy.findByRole('button', { name: 'Apply' }).click();
    cy.wait('@applyPromo');

    cy.findByText("We don't recognize this code.");
    cy.findByRole('region', { name: 'Order summary' }).within(() => {
      cy.findByText(/^Discount/).should('not.exist');
      cy.findByText('$47.45');
    });
    cy.findByRole('textbox');
    cy.findByRole('button', { name: 'Apply' });
  });

  it('T9-05: replacing LEAFY10 with FREESHIP leaves only FREESHIP and Free shipping', { tags: '@ui' }, () => {
    stubSignedInCart('cart/cart-promo-leafy10.json');
    cy.intercept('DELETE', '/api/cart/promo', { fixture: 'cart/cart-positive.json' }).as('removePromo');
    cy.intercept('POST', '/api/cart/promo', { fixture: 'cart/cart-promo-freeship.json' }).as('applyPromo');
    visitSignedIn('/cart');
    cy.wait(['@authMe', '@cart']);

    findAppliedCode('LEAFY10');
    cy.findByRole('button', { name: 'Remove' }).click();
    cy.wait('@removePromo');

    cy.findByRole('textbox').type('FREESHIP');
    cy.findByRole('button', { name: 'Apply' }).click();
    cy.wait('@applyPromo');

    findAppliedCode('FREESHIP');
    cy.findByText('LEAFY10').should('not.exist');
    cy.findByRole('region', { name: 'Order summary' }).within(() => {
      cy.findByText(/^Discount/).should('not.exist');
      cy.findByText('Free');
    });
  });

  it('T9-06: lowercase leafy10 applies as LEAFY10 in the UI', { tags: '@ui' }, () => {
    stubSignedInCart('cart/cart-positive.json');
    cy.intercept('POST', '/api/cart/promo', { fixture: 'cart/cart-promo-leafy10.json' }).as('applyPromo');
    visitSignedIn('/cart');
    cy.wait(['@authMe', '@cart']);

    cy.findByRole('textbox').type('leafy10');
    cy.findByRole('button', { name: 'Apply' }).click();
    cy.wait('@applyPromo');

    findAppliedCode('LEAFY10');
    cy.findByRole('region', { name: 'Order summary' }).within(() => {
      cy.findByText('Discount (LEAFY10)');
    });
  });
});
