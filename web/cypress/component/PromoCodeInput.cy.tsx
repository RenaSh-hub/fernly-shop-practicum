import { PromoCodeInput } from '../../src/components/PromoCodeInput';

function codeField() {
  return cy.findByRole('textbox');
}

function applyButton() {
  return cy.findByRole('button', { name: 'Apply' });
}

function removeButton() {
  return cy.findByRole('button', { name: 'Remove' });
}

describe('PromoCodeInput', () => {
  describe('render', () => {
    it(
      'T8-01: shows Have a promo code?; Apply disabled when empty or whitespace-only',
      { tags: '@component' },
      () => {
        cy.mount(
          <PromoCodeInput
            appliedCode={null}
            onApply={cy.spy()}
            onRemove={cy.spy()}
          />,
        );

        cy.findByText('Have a promo code?').should('be.visible');
        applyButton().then(($btn) => {
          expect($btn, 'Apply when empty').to.be.disabled;
        });

        codeField().type('   ');
        applyButton().then(($btn) => {
          expect($btn, 'Apply when whitespace-only').to.be.disabled;
        });
      },
    );
  });

  describe('interaction', () => {
    it('T8-02: Apply calls onApply with LEAFY10', { tags: '@component' }, () => {
      const onApply = cy.spy().as('onApply');
      cy.mount(
        <PromoCodeInput appliedCode={null} onApply={onApply} onRemove={cy.spy()} />,
      );

      codeField().type('LEAFY10');
      applyButton().click();

      cy.get('@onApply').should('have.been.calledOnceWithExactly', 'LEAFY10');
    });

    it('T8-03: submit trims whitespace before onApply', { tags: '@component' }, () => {
      const onApply = cy.spy().as('onApply');
      cy.mount(
        <PromoCodeInput appliedCode={null} onApply={onApply} onRemove={cy.spy()} />,
      );

      codeField().type('  leafy10  ');
      applyButton().click();

      cy.get('@onApply').should('have.been.calledOnceWithExactly', 'leafy10');
    });

    it('T8-05: Remove calls onRemove', { tags: '@component' }, () => {
      const onRemove = cy.spy().as('onRemove');
      cy.mount(
        <PromoCodeInput
          appliedCode="LEAFY10"
          onApply={cy.spy()}
          onRemove={onRemove}
        />,
      );

      removeButton().click();

      cy.get('@onRemove').should('have.been.calledOnce');
    });
  });

  describe('state', () => {
    it(
      'T8-04: shows Code LEAFY10 applied and Remove; no Apply field',
      { tags: '@component' },
      () => {
        cy.mount(
          <PromoCodeInput
            appliedCode="LEAFY10"
            onApply={cy.spy()}
            onRemove={cy.spy()}
          />,
        );

        cy.findByText((_content, el) => {
          return (
            el?.tagName === 'SPAN' &&
            (el.textContent ?? '').replace(/\s+/g, ' ').trim() ===
              'Code LEAFY10 applied'
          );
        }).should('be.visible');
        removeButton().should('exist');
        cy.findByRole('button', { name: 'Apply' }).should('not.exist');
        cy.findByRole('textbox').should('not.exist');
      },
    );

    it('T8-07: Apply stays disabled while busy', { tags: '@component' }, () => {
      cy.mount(
        <PromoCodeInput
          appliedCode={null}
          onApply={cy.spy()}
          onRemove={cy.spy()}
          busy={true}
        />,
      );

      codeField().type('LEAFY10');
      applyButton().then(($btn) => {
        expect($btn, 'Apply while busy').to.be.disabled;
      });
    });

    it('T8-08: Remove is disabled while busy', { tags: '@component' }, () => {
      cy.mount(
        <PromoCodeInput
          appliedCode="FREESHIP"
          onApply={cy.spy()}
          onRemove={cy.spy()}
          busy={true}
        />,
      );

      removeButton().then(($btn) => {
        expect($btn, 'Remove while busy').to.be.disabled;
      });
    });
  });

  describe('error', () => {
    it('T8-06: shows This code has expired.', { tags: '@component' }, () => {
      cy.mount(
        <PromoCodeInput
          appliedCode={null}
          onApply={cy.spy()}
          onRemove={cy.spy()}
          error="This code has expired."
        />,
      );

      cy.findByText('This code has expired.').should('be.visible');
    });
  });

  describe('accessibility', () => {
    it(
      'T8-09: code field has accessible name Promo code',
      { tags: ['@component', '@known-bug'] },
      () => {
        cy.mount(
          <PromoCodeInput
            appliedCode={null}
            onApply={cy.spy()}
            onRemove={cy.spy()}
          />,
        );

        cy.findByRole('textbox', { name: /promo code/i }).should('exist');
      },
    );

    it(
      'T8-10: refused message is in a live region',
      { tags: ['@component', '@known-bug'] },
      () => {
        cy.mount(
          <PromoCodeInput
            appliedCode={null}
            onApply={cy.spy()}
            onRemove={cy.spy()}
            error="We don't recognize this code."
          />,
        );

        cy.findByText("We don't recognize this code.")
          .should('be.visible')
          .then(($el) => {
            const liveHost = $el[0].closest('[role="alert"], [aria-live]');
            expect(liveHost, 'refused message in live region').to.not.equal(null);
          });
      },
    );
  });
});
