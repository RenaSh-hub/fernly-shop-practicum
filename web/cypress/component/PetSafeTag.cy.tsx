import { PetSafeTag } from '../../src/components/PetSafeTag';

describe('PetSafeTag', () => {
  describe('render', () => {
    it('PST-01: shows Pet safe only when petSafe is true', { tags: '@component' }, () => {
      cy.mount(<PetSafeTag petSafe={true} />);

      cy.findByText('Pet safe', { exact: true }).should('be.visible');
      cy.findByText('Not pet safe', { exact: true }).should('not.exist');
    });

    it('PST-02: shows Not pet safe when petSafe is false', { tags: '@component' }, () => {
      cy.mount(<PetSafeTag petSafe={false} />);

      cy.findByText('Not pet safe', { exact: true }).should('be.visible');
    });
  });

  describe('accessibility', () => {
    it('PST-03: hides paw prefix from assistive tech; name is Pet safe', { tags: '@component' }, () => {
      cy.mount(<PetSafeTag petSafe={true} />);

      cy.findByText('Pet safe', { exact: true }).should('be.visible');
      cy.get('[aria-hidden="true"]').then(($hidden) => {
        expect($hidden, 'decorative prefix count').to.have.length(1);
        expect($hidden.text(), 'paw mark in hidden prefix').to.include('🐾');
      });
    });

    it('PST-04: hides warning prefix from assistive tech; name is Not pet safe', { tags: '@component' }, () => {
      cy.mount(<PetSafeTag petSafe={false} />);

      cy.findByText('Not pet safe', { exact: true }).should('be.visible');
      cy.get('[aria-hidden="true"]').then(($hidden) => {
        expect($hidden, 'decorative prefix count').to.have.length(1);
        expect($hidden.text(), 'warning mark in hidden prefix').to.include('⚠');
      });
    });

    it('PST-05: has no buttons or form fields', { tags: '@component' }, () => {
      cy.mount(<PetSafeTag petSafe={true} />);

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
