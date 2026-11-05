import { CareLevelBadge } from '../../src/components/CareLevelBadge';

describe('CareLevelBadge', () => {
  describe('render', () => {
    it('CLB-01: one dot and Easy care at level 1', { tags: '@component' }, () => {
      cy.mount(<CareLevelBadge level={1} />);

      cy.findByText('Easy care', { exact: true }).should('be.visible');
      cy.get('[aria-hidden="true"]').then(($hidden) => {
        expect($hidden.text(), 'dot count at level 1').to.equal('●');
      });
    });

    it('CLB-02: two dots and Moderate care at level 2', { tags: '@component' }, () => {
      cy.mount(<CareLevelBadge level={2} />);

      cy.findByText('Moderate care', { exact: true }).should('be.visible');
      cy.get('[aria-hidden="true"]').then(($hidden) => {
        expect($hidden.text(), 'dot count at level 2').to.equal('●●');
      });
    });

    it('CLB-03: three dots and Expert care at level 3', { tags: '@component' }, () => {
      cy.mount(<CareLevelBadge level={3} />);

      cy.findByText('Expert care', { exact: true }).should('be.visible');
      cy.get('[aria-hidden="true"]').then(($hidden) => {
        expect($hidden.text(), 'dot count at level 3').to.equal('●●●');
      });
    });
  });

  describe('accessibility', () => {
    it('CLB-04: hides dots from assistive tech; name is Easy care', { tags: '@component' }, () => {
      cy.mount(<CareLevelBadge level={1} />);

      cy.findByText('Easy care', { exact: true }).should('be.visible');
      cy.get('[aria-hidden="true"]').then(($hidden) => {
        expect($hidden, 'decorative dots count').to.have.length(1);
        expect($hidden.text(), 'dots in hidden span').to.equal('●');
      });
    });

    it('CLB-05: hides dots from assistive tech; name is Moderate care', { tags: '@component' }, () => {
      cy.mount(<CareLevelBadge level={2} />);

      cy.findByText('Moderate care', { exact: true }).should('be.visible');
      cy.get('[aria-hidden="true"]').then(($hidden) => {
        expect($hidden, 'decorative dots count').to.have.length(1);
        expect($hidden.text(), 'dots in hidden span').to.equal('●●');
      });
    });

    it('CLB-06: hides dots from assistive tech; name is Expert care', { tags: '@component' }, () => {
      cy.mount(<CareLevelBadge level={3} />);

      cy.findByText('Expert care', { exact: true }).should('be.visible');
      cy.get('[aria-hidden="true"]').then(($hidden) => {
        expect($hidden, 'decorative dots count').to.have.length(1);
        expect($hidden.text(), 'dots in hidden span').to.equal('●●●');
      });
    });

    it('CLB-07: has no buttons or form fields', { tags: '@component' }, () => {
      cy.mount(<CareLevelBadge level={1} />);

      cy.findAllByRole('button').should('have.length', 0);
      cy.findAllByRole('textbox').should('have.length', 0);
      cy.findAllByRole('combobox').should('have.length', 0);
      cy.findAllByRole('checkbox').should('have.length', 0);
      cy.findAllByRole('radio').should('have.length', 0);
      cy.findAllByRole('searchbox').should('have.length', 0);
      cy.findAllByRole('spinbutton').should('have.length', 0);
    });
  });
});
