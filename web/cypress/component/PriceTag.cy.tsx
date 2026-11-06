import { PriceTag } from '../../src/components/PriceTag';

function normalizedText(node: { text: () => string }): string {
  return node.text().replace(/\s+/g, ' ').trim();
}

/** The node that contains the price, not an ancestor that repeats the same text. */
function priceNode(content: string, element: Element | null): boolean {
  if (!element || !content.includes('$')) {
    return false;
  }
  return !Array.from(element.children).some((child) =>
    (child.textContent ?? '').replace(/\s+/g, ' ').trim().includes('$'),
  );
}

describe('PriceTag', () => {
  describe('two-decimal formatting', () => {
    it('PT-01: shows $12.50 for amount 12.5', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={12.5} />);
      cy.findByText(priceNode).then(($el) => {
        expect(normalizedText($el), 'visible price').to.equal('$12.50');
      });
    });

    it('PT-02: shows $22.00 for whole dollars', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={22} />);
      cy.findByText(priceNode).then(($el) => {
        expect(normalizedText($el), 'visible price').to.equal('$22.00');
      });
    });

    it('PT-03: shows $0.99 for a sub-dollar amount', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={0.99} />);
      cy.findByText(priceNode).then(($el) => {
        expect(normalizedText($el), 'visible price').to.equal('$0.99');
      });
    });

    it('PT-04: shows $0.00 for zero', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={0} />);
      cy.findByText(priceNode).then(($el) => {
        expect(normalizedText($el), 'visible price').to.equal('$0.00');
      });
    });

    it('PT-05: shows $6.95', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={6.95} />);
      cy.findByText(priceNode).then(($el) => {
        expect(normalizedText($el), 'visible price').to.equal('$6.95');
      });
    });

    it('PT-06: shows $50.00 at the free-shipping threshold', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={50} />);
      cy.findByText(priceNode).then(($el) => {
        expect(normalizedText($el), 'visible price').to.equal('$50.00');
      });
    });
  });

  describe('label', () => {
    it('PT-09: shows the price with no screen-reader prefix', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={12.5} />);
      cy.findByText(priceNode).then(($el) => {
        expect(normalizedText($el), 'price text with no screen-reader prefix').to.equal('$12.50');
      });
    });

    it('PT-10: includes hidden Price: before $12.50', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={12.5} label="Price" />);
      cy.findByText('Price:').then(($prefix) => {
        expect(normalizedText($prefix), 'hidden prefix').to.equal('Price:');
      });
      cy.findByText(priceNode).then(($el) => {
        expect(normalizedText($el), 'Price: before the amount').to.equal('Price: $12.50');
      });
    });

    it('PT-11: includes hidden Price each:', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={6.95} label="Price each" />);
      cy.findByText('Price each:').then(($prefix) => {
        expect(normalizedText($prefix), 'hidden prefix').to.equal('Price each:');
      });
    });

    it('PT-12: includes hidden Line total:', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={42} label="Line total" />);
      cy.findByText('Line total:').then(($prefix) => {
        expect(normalizedText($prefix), 'hidden prefix').to.equal('Line total:');
      });
    });
  });

  describe('size', () => {
    it('PT-13: shows $12.50 at size sm', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={12.5} size="sm" />);
      cy.findByText(priceNode).then(($el) => {
        expect(normalizedText($el), 'visible price').to.equal('$12.50');
      });
    });

    it('PT-14: shows $12.50 at the default size', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={12.5} />);
      cy.findByText(priceNode).then(($el) => {
        expect(normalizedText($el), 'visible price').to.equal('$12.50');
      });
    });

    it('PT-15: shows $99.00 at size lg', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={99} size="lg" />);
      cy.findByText(priceNode).then(($el) => {
        expect(normalizedText($el), 'visible price').to.equal('$99.00');
      });
    });
  });

  describe('extreme values', () => {
    it('PT-17: formats 999999.99 with $ and two decimals', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={999999.99} />);
      cy.findByText(priceNode).then(($el) => {
        expect(normalizedText($el), 'visible price').to.equal('$999999.99');
      });
    });
  });
});
