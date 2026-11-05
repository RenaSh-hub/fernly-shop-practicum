import { PriceTag } from '../../src/components/PriceTag';

describe('PriceTag', () => {
  describe('two-decimal formatting (PRODUCT.md)', () => {
    it('shows $12.50 for amount 12.5 (PT-01)', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={12.5} />);
      cy.findByText('$12.50');
    });

    it('shows $22.00 for whole dollars (PT-02)', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={22} />);
      cy.findByText('$22.00');
    });

    it('shows $0.99 for sub-dollar amounts (PT-03)', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={0.99} />);
      cy.findByText('$0.99');
    });

    it('shows $0.00 for zero (PT-04)', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={0} />);
      cy.findByText('$0.00');
    });

    it('shows $6.95 for shipping fee (PT-05)', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={6.95} />);
      cy.findByText('$6.95');
    });

    it('shows $50.00 at the free-shipping threshold (PT-06)', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={50} />);
      cy.findByText('$50.00');
    });
  });

  describe('sub-cent rounding (assumed — ask)', () => {
    it('rounds 12.005 up to $12.01 (PT-07)', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={12.005} />);
      cy.findByText('$12.01');
    });

    it('rounds 12.999 up to $13.00 (PT-08)', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={12.999} />);
      cy.findByText('$13.00');
    });
  });

  describe('label (screen readers)', () => {
    it('omits a hidden label when label prop is absent (PT-09)', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={12.5} />);
      cy.findByText('$12.50');
      cy.findByText('Price:', { includeHidden: true }).should('not.exist');
    });

    it('includes hidden "Price:" before the amount (PT-10)', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={12.5} label="Price" />);
      cy.findByText('Price:', { includeHidden: true });
      cy.findByText('$12.50');
    });

    it('includes hidden "Price each:" (PT-11)', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={6.95} label="Price each" />);
      cy.findByText('Price each:', { includeHidden: true });
      cy.findByText('$6.95');
    });

    it('includes hidden "Line total:" (PT-12)', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={42} label="Line total" />);
      cy.findByText('Line total:', { includeHidden: true });
      cy.findByText('$42.00');
    });
  });

  describe('size prop', () => {
    it('renders sm without changing formatted text (PT-13)', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={12.5} size="sm" />);
      cy.findByText('$12.50');
    });

    it('renders default md size (PT-14)', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={12.5} />);
      cy.findByText('$12.50');
    });

    it('renders lg with two-decimal whole dollars (PT-15)', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={99} size="lg" />);
      cy.findByText('$99.00');
    });
  });

  describe('extreme values', () => {
    it('formats a very large amount with two decimals (PT-17)', { tags: '@component' }, () => {
      cy.mount(<PriceTag amount={999999.99} />);
      cy.findByText('$999999.99');
    });
  });
});
