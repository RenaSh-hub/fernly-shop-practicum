import { QuantityStepper } from '../../src/components/QuantityStepper';

function decreaseButton() {
  return cy.findByRole('button', { name: 'Decrease quantity' });
}

function increaseButton() {
  return cy.findByRole('button', { name: 'Increase quantity' });
}

function expectDisabled(
  chain: Cypress.Chainable<JQuery<HTMLElement>>,
  label: string,
) {
  chain.then(($el) => {
    expect($el, label).to.be.disabled;
  });
}

function expectEnabled(
  chain: Cypress.Chainable<JQuery<HTMLElement>>,
  label: string,
) {
  chain.then(($el) => {
    expect($el, label).not.to.be.disabled;
  });
}

describe('QuantityStepper', () => {
  describe('render', () => {
    it('QS-01: live quantity readout shows 3', { tags: '@component' }, () => {
      cy.mount(<QuantityStepper value={3} max={10} onChange={cy.spy()} />);

      cy.findByRole('group', { name: 'Quantity' })
        .find('[aria-live="polite"]')
        .should('have.text', '3');
    });

    it('QS-02: default group is named Quantity', { tags: '@component' }, () => {
      cy.mount(<QuantityStepper value={1} max={5} onChange={cy.spy()} />);

      cy.findByRole('group', { name: 'Quantity' }).should('exist');
    });

    it('QS-03: custom label Quantity of Monstera Deliciosa', { tags: '@component' }, () => {
      cy.mount(
        <QuantityStepper
          value={2}
          max={8}
          label="Quantity of Monstera Deliciosa"
          onChange={cy.spy()}
        />,
      );

      cy.findByRole('group', { name: 'Quantity of Monstera Deliciosa' }).should('exist');
    });
  });

  describe('state', () => {
    it('QS-04: − disabled at minimum; + enabled', { tags: '@component' }, () => {
      cy.mount(<QuantityStepper value={1} max={5} onChange={cy.spy()} />);

      expectDisabled(decreaseButton(), '− at minimum');
      expectEnabled(increaseButton(), '+ below max');
    });

    it('QS-05: + disabled at stock limit', { tags: ['@component', '@known-bug'] }, () => {
      cy.mount(<QuantityStepper value={3} max={3} onChange={cy.spy()} />);

      expectDisabled(increaseButton(), '+ at stock limit');
    });

    it('QS-06: disabled prop disables both buttons', { tags: '@component' }, () => {
      cy.mount(<QuantityStepper value={2} max={5} disabled onChange={cy.spy()} />);

      expectDisabled(decreaseButton(), '− when disabled');
      expectDisabled(increaseButton(), '+ when disabled');
    });

    it('QS-07: − disabled at custom min', { tags: '@component' }, () => {
      cy.mount(<QuantityStepper value={2} min={2} max={5} onChange={cy.spy()} />);

      expectDisabled(decreaseButton(), '− at custom min');
    });

    it('QS-08: + disabled when only one unit in stock', { tags: ['@component', '@known-bug'] }, () => {
      cy.mount(<QuantityStepper value={1} max={1} onChange={cy.spy()} />);

      expectDisabled(increaseButton(), '+ at max 1');
    });

    it('QS-12: readout 20 and + disabled at API max', { tags: ['@component', '@known-bug'] }, () => {
      cy.mount(<QuantityStepper value={20} max={20} onChange={cy.spy()} />);

      cy.findByRole('group', { name: 'Quantity' })
        .find('[aria-live="polite"]')
        .should('have.text', '20');
      expectDisabled(increaseButton(), '+ at quantity 20');
    });

    it('QS-13: both buttons disabled when max is 0', { tags: '@component' }, () => {
      cy.mount(<QuantityStepper value={1} max={0} onChange={cy.spy()} />);

      expectDisabled(decreaseButton(), '− at min with zero stock');
      expectDisabled(increaseButton(), '+ with zero stock');
    });
  });

  describe('interaction', () => {
    it('QS-09: + calls onChange with 3', { tags: '@component' }, () => {
      const onChange = cy.spy().as('onChange');
      cy.mount(<QuantityStepper value={2} max={5} onChange={onChange} />);

      increaseButton().click();

      cy.get('@onChange').should('have.been.calledOnceWithExactly', 3);
    });

    it('QS-10: − calls onChange with 1', { tags: '@component' }, () => {
      const onChange = cy.spy().as('onChange');
      cy.mount(<QuantityStepper value={2} max={5} onChange={onChange} />);

      decreaseButton().click();

      cy.get('@onChange').should('have.been.calledOnceWithExactly', 1);
    });

    it('QS-11: + at max does not call onChange', { tags: ['@component', '@known-bug'] }, () => {
      const onChange = cy.spy().as('onChange');
      cy.mount(<QuantityStepper value={3} max={3} onChange={onChange} />);

      expectDisabled(increaseButton(), '+ at stock limit');
      increaseButton().click({ force: true });

      cy.get('@onChange').should('not.have.been.called');
    });
  });

  describe('accessibility', () => {
    it('QS-14: Decrease and Increase quantity button names', { tags: '@component' }, () => {
      cy.mount(<QuantityStepper value={2} max={5} onChange={cy.spy()} />);

      decreaseButton().should('exist');
      increaseButton().should('exist');
    });

    it('QS-15: polite live region shows 2', { tags: '@component' }, () => {
      cy.mount(<QuantityStepper value={2} max={5} onChange={cy.spy()} />);

      cy.findByRole('group', { name: 'Quantity' })
        .find('[aria-live="polite"]')
        .should('have.text', '2');
    });

    it('QS-16: keyboard activates + and calls onChange with 3', { tags: '@component' }, () => {
      const onChange = cy.spy().as('onChange');
      cy.mount(<QuantityStepper value={2} max={5} onChange={onChange} />);

      increaseButton().type(' ');

      cy.get('@onChange').should('have.been.calledOnceWithExactly', 3);
    });
  });
});
