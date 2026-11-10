import { OrderSummary } from '../../src/components/OrderSummary';

const charged = { itemCount: 2, subtotal: 25, shipping: 6.95, total: 31.95 };
const atThreshold = { itemCount: 1, subtotal: 50, shipping: 0, total: 50 };
const withDiscount = {
  itemCount: 1,
  subtotal: 40,
  shipping: 6.95,
  discount: 4,
  promoCode: 'LEAFY10',
  total: 42.95,
};

function normalizedText(node: { text: () => string }): string {
  return node.text().replace(/\s+/g, ' ').trim();
}

function region(name: string) {
  return cy.findByRole('region', { name });
}

function hintParagraph(text: string) {
  cy.findByText((_content, element) => {
    if (!element || element.tagName !== 'P') {
      return false;
    }
    return normalizedText(Cypress.$(element)) === text;
  });
}

function expectNoFreeShippingHint() {
  region(/Order summary|Paid/).then(($section) => {
    expect(normalizedText($section), 'free-shipping hint').not.to.match(/Add .+ more for free shipping\./);
  });
}

describe('OrderSummary', () => {
  describe('render', () => {
    it('OS-01: heading Order summary and Subtotal, Shipping, Total terms', { tags: '@component' }, () => {
      cy.mount(<OrderSummary {...charged} />);

      cy.findByRole('heading', { name: 'Order summary', level: 2 });
      cy.findByText('Subtotal (2 items)');
      cy.findByText('Shipping');
      cy.findByText('Total');
    });

    it('OS-02: heading Paid (not Order summary)', { tags: '@component' }, () => {
      cy.mount(<OrderSummary {...charged} title="Paid" />);

      cy.findByRole('heading', { name: 'Paid', level: 2 });
      cy.findByRole('heading', { name: 'Order summary' }).should('not.exist');
    });

    it('OS-06: subtotal amount is $25.00', { tags: '@component' }, () => {
      cy.mount(<OrderSummary {...charged} />);

      region('Order summary').within(() => {
        cy.findByText('$25.00').then(($el) => {
          expect(normalizedText($el), 'subtotal').to.equal('$25.00');
        });
      });
    });

    it('OS-07: shipping is $6.95 (not Free)', { tags: '@component' }, () => {
      cy.mount(<OrderSummary {...charged} />);

      cy.findByText('Free').should('not.exist');
      region('Order summary').within(() => {
        cy.findByText('$6.95').then(($el) => {
          expect(normalizedText($el), 'shipping').to.equal('$6.95');
        });
      });
    });

    it('OS-08: total amount is $31.95', { tags: '@component' }, () => {
      cy.mount(<OrderSummary {...charged} />);

      region('Order summary').within(() => {
        cy.findByText('$31.95').then(($el) => {
          expect(normalizedText($el), 'total').to.equal('$31.95');
        });
      });
    });

    it('OS-11: shipping stays $6.95 when subtotal is at or above $50', { tags: '@component' }, () => {
      cy.mount(
        <OrderSummary itemCount={1} subtotal={60} shipping={6.95} total={66.95} />,
      );

      cy.findByText('Free').should('not.exist');
      region('Order summary').within(() => {
        cy.findByText('$6.95').then(($el) => {
          expect(normalizedText($el), 'shipping').to.equal('$6.95');
        });
      });
    });

    it('OS-12: hint Add $25.00 more for free shipping', { tags: '@component' }, () => {
      cy.mount(<OrderSummary {...charged} />);

      hintParagraph('Add $25.00 more for free shipping.');
    });

    it('OS-13: hint Add $50.00 more for free shipping', { tags: '@component' }, () => {
      cy.mount(<OrderSummary itemCount={1} subtotal={0} shipping={6.95} total={6.95} />);

      hintParagraph('Add $50.00 more for free shipping.');
    });

    it('OS-19: total is $99.00 (not subtotal + shipping)', { tags: '@component' }, () => {
      cy.mount(<OrderSummary itemCount={1} subtotal={25} shipping={6.95} total={99} />);

      region('Order summary').within(() => {
        cy.findByText('$99.00').then(($el) => {
          expect(normalizedText($el), 'total').to.equal('$99.00');
        });
      });
    });
  });

  describe('state', () => {
    it('OS-09: shipping shows Free (not $0.00)', { tags: '@component' }, () => {
      cy.mount(<OrderSummary {...atThreshold} />);

      cy.findByText('Free').then(($el) => {
        expect(normalizedText($el), 'free shipping label').to.equal('Free');
      });
      cy.findByText('$0.00').should('not.exist');
    });

    it('OS-10: empty cart shipping is $0.00, not Free', { tags: '@component' }, () => {
      cy.mount(<OrderSummary itemCount={0} subtotal={0} shipping={0} total={0} />);

      cy.findByText('Free').should('not.exist');
      region('Order summary').within(() => {
        cy.findByText('$0.00').then(($el) => {
          expect(normalizedText($el), 'shipping').to.equal('$0.00');
        });
      });
    });
  });

  describe('boundary', () => {
    it('OS-03: subtotal term includes 1 item (not items)', { tags: '@component' }, () => {
      cy.mount(<OrderSummary itemCount={1} subtotal={12.5} shipping={6.95} total={19.45} />);

      cy.findByText('Subtotal (1 item)');
      cy.findByText(/Subtotal \(1 items\)/).should('not.exist');
    });

    it('OS-04: subtotal term includes 2 items (not item)', { tags: '@component' }, () => {
      cy.mount(<OrderSummary {...charged} />);

      cy.findByText('Subtotal (2 items)');
      cy.findByText(/Subtotal \(2 item\)/).should('not.exist');
    });

    it('OS-05: subtotal term includes 0 items', { tags: '@component' }, () => {
      cy.mount(<OrderSummary itemCount={0} subtotal={0} shipping={0} total={0} />);

      cy.findByText('Subtotal (0 items)');
    });

    it('OS-14: hint Add $0.01 more for free shipping', { tags: '@component' }, () => {
      cy.mount(<OrderSummary itemCount={1} subtotal={49.99} shipping={6.95} total={56.94} />);

      hintParagraph('Add $0.01 more for free shipping.');
    });

    it('OS-15: no free-shipping hint at $50 subtotal', { tags: '@component' }, () => {
      cy.mount(<OrderSummary {...atThreshold} />);

      expectNoFreeShippingHint();
    });

    it('OS-16: no free-shipping hint one cent past $50', { tags: '@component' }, () => {
      cy.mount(<OrderSummary itemCount={1} subtotal={50.01} shipping={0} total={50.01} />);

      expectNoFreeShippingHint();
    });

    it('OS-17: no free-shipping hint when itemCount is 0 (empty)', { tags: '@component' }, () => {
      cy.mount(<OrderSummary itemCount={0} subtotal={0} shipping={0} total={0} />);

      region('Order summary').then(($section) => {
        expect(normalizedText($section), 'free-shipping hint').not.to.match(/Add .+ more for free shipping\./);
      });
    });

    it('OS-18: no hint when itemCount is 0 even if subtotal is under $50', { tags: '@component' }, () => {
      cy.mount(<OrderSummary itemCount={0} subtotal={40} shipping={6.95} total={46.95} />);

      region('Order summary').then(($section) => {
        expect(normalizedText($section), 'free-shipping hint').not.to.match(/Add .+ more for free shipping\./);
      });
    });

    it('OS-23: extreme amounts and itemCount 20', { tags: '@component' }, () => {
      cy.mount(
        <OrderSummary itemCount={20} subtotal={999999.99} shipping={0} total={999999.99} />,
      );

      cy.findByText('Free');
      region('Order summary').within(() => {
        cy.findAllByText(/\$999999\.99/).then(($prices) => {
          expect($prices, 'subtotal and total prices').to.have.length(2);
          $prices.each((_i, el) => {
            expect(normalizedText(Cypress.$(el)), 'formatted price').to.equal('$999999.99');
          });
        });
      });
    });
  });

  describe('accessibility', () => {
    it('OS-20: region named Order summary', { tags: '@component' }, () => {
      cy.mount(<OrderSummary {...charged} />);

      region('Order summary').should('exist');
    });

    it('OS-21: region named Paid', { tags: '@component' }, () => {
      cy.mount(<OrderSummary {...charged} title="Paid" />);

      region('Paid').should('exist');
    });

    it('OS-22: there are no buttons in the component', { tags: '@component' }, () => {
      cy.mount(<OrderSummary {...charged} />);

      cy.findAllByRole('button').should('have.length', 0);
    });
  });

  describe('promo discount', () => {
    it('T7-01: shows Discount (LEAFY10) and −$4.00', { tags: ['@component', '@known-bug'] }, () => {
      cy.mount(<OrderSummary {...withDiscount} />);

      cy.findByText('Discount (LEAFY10)');
      region('Order summary').within(() => {
        cy.findByText('−$4.00').then(($el) => {
          expect(normalizedText($el), 'discount amount').to.equal('−$4.00');
        });
      });
    });

    it('T7-02: no Discount term when discount and promoCode omitted', { tags: '@component' }, () => {
      cy.mount(<OrderSummary {...charged} />);

      cy.findByText(/Discount/).should('not.exist');
    });

    it('T7-03: no Discount term when discount is 0 even if promoCode set', { tags: '@component' }, () => {
      cy.mount(<OrderSummary {...charged} discount={0} promoCode="LEAFY10" />);

      cy.findByText(/Discount/).should('not.exist');
    });

    it('T7-04: Discount without code and −$4.00 when promoCode is null', { tags: ['@component', '@known-bug'] }, () => {
      cy.mount(
        <OrderSummary
          itemCount={1}
          subtotal={40}
          shipping={6.95}
          discount={4}
          promoCode={null}
          total={42.95}
        />,
      );

      cy.findByText('Discount');
      cy.findByText(/Discount \(/).should('not.exist');
      region('Order summary').within(() => {
        cy.findByText('−$4.00').then(($el) => {
          expect(normalizedText($el), 'discount amount').to.equal('−$4.00');
        });
      });
    });

    it('T7-05: Order summary region contains −$4.00', { tags: ['@component', '@known-bug'] }, () => {
      cy.mount(<OrderSummary {...withDiscount} />);

      region('Order summary').within(() => {
        cy.findByText('−$4.00').then(($el) => {
          expect(normalizedText($el), 'discount amount').to.equal('−$4.00');
        });
      });
    });
  });
});
